import type { Connector } from "$lib/connection/connector";
import db from "$lib/db";
import { IQSchema, makeStrLiteral } from "$lib/types/stanza";
import { KeyHelper } from "@privacyresearch/libsignal-protocol-typescript";
import { z } from "zod";

function bufferToBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export async function setupOMEMO(connection: Connector) {
  const data = await generateEverything(connection.bareJid!);

  await connection.sendWithId<z.infer<typeof IQSchema>>({
    iq: [
      {
        _attributes: {
          from: connection.jid!,
          type: "set"
        },

        pubsub: [
          {
            _attributes: {
              xmlns: "http://jabber.org/protocol/pubsub"
            },

            publish: [
              {
                _attributes: {
                  node: "urn:xmpp:omemo:2:devices"
                },

                item: [
                  {
                    _attributes: {
                      id: "current"
                    },

                    devices: [
                      {
                        _attributes: {
                          xmlns: "urn:xmpp:omemo:2"
                        },

                        device: [
                          {
                            _attributes: {
                              id: `${data.deviceId}`,
                              label: "Polaris"
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],

        "publish-options": [
          {
            x: [
              {
                _attributes: {
                  xmlns: "jabber:x:data",
                  type: "submit"
                },

                field: [
                  {
                    _attributes: {
                      var: "FORM_TYPE",
                      type: "hidden"
                    },

                    value: makeStrLiteral(
                      "http://jabber.org/protocol/pubsub#publish-options"
                    )
                  },

                  {
                    _attributes: {
                      var: "pubsub#acccess_model"
                    },

                    value: makeStrLiteral("open")
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  await connection.sendWithId<z.infer<typeof IQSchema>>({
    iq: [
      {
        _attributes: {
          from: connection.jid!,
          type: "set"
        },

        pubsub: [
          {
            _attributes: {
              xmlns: "http://jabber.org/protocol/pubsub"
            },

            publish: [
              {
                _attributes: {
                  node: "urn:xmpp:omemo:2:bundles"
                },

                item: [
                  {
                    _attributes: {
                      id: `${data.deviceId}`
                    },

                    bundle: [
                      {
                        _attributes: {
                          xmlns: "urn:xmpp:omemo:2"
                        },

                        spk: [
                          {
                            _attributes: {
                              id: `${data.spkId}`
                            },
                            _text: [bufferToBase64(data.spkPublicKey)]
                          }
                        ],

                        spks: makeStrLiteral(bufferToBase64(data.spkSignature)),
                        ik: makeStrLiteral(
                          bufferToBase64(data.identityPublicKey)
                        ),

                        prekeys: [
                          {
                            pk: data.preKeys.map(({ keyId, publicKey }) => ({
                              _attributes: {
                                id: `${keyId}`
                              },
                              _text: [bufferToBase64(publicKey)]
                            }))
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],

        "publish-options": [
          {
            x: [
              {
                _attributes: {
                  xmlns: "jabber:x:data",
                  type: "submit"
                },

                field: [
                  {
                    _attributes: {
                      var: "FORM_TYPE",
                      type: "hidden"
                    },

                    value: makeStrLiteral(
                      "http://jabber.org/protocol/pubsub#publish-options"
                    )
                  },

                  {
                    _attributes: {
                      var: "pubsub#max_items"
                    },

                    value: makeStrLiteral("max")
                  },

                  {
                    _attributes: {
                      var: "pubsub#acccess_model"
                    },

                    value: makeStrLiteral("open")
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  });
}

export async function generateEverything(account: string) {
  const existing = await db.omemo.get({ account });
  if (existing != null) return existing;

  console.log("Generating OMEMO keys for", account);

  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const deviceId = KeyHelper.generateRegistrationId(); // TODO: must be unique
  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 0);
  const preKeys = await Promise.all(
    new Array(100).fill(0).map((_, i) => KeyHelper.generatePreKey(i))
  );

  await db.omemo.put({
    account,
    deviceId,

    identityPublicKey: identityKeyPair.pubKey,
    identityPrivateKey: identityKeyPair.privKey,

    spkId: signedPreKey.keyId,
    spkPublicKey: signedPreKey.keyPair.pubKey,
    spkPrivateKey: signedPreKey.keyPair.privKey,
    spkSignature: signedPreKey.signature,

    preKeys: preKeys.map(({ keyId, keyPair }) => ({
      keyId,
      publicKey: keyPair.pubKey
    }))
  });

  console.log("Generated OMEMO keys for", account);
  return (await db.omemo.get({ account }))!;
}
