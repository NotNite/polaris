import type { SubscriptionType } from "../types";

export interface Account {
  jid: string;
  vcard?: string;
}

export interface RosterEntry {
  account: string;
  jid: string;
  name?: string;
  subscription: SubscriptionType;
  vcard?: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  timestamp: number; // Unix seconds
  body: string; // XML
}

export interface OMEMO {
  account: string;
  deviceId: number;

  identityPublicKey: ArrayBuffer;
  identityPrivateKey: ArrayBuffer;

  spkId: number;
  spkPublicKey: ArrayBuffer;
  spkPrivateKey: ArrayBuffer;
  spkSignature: ArrayBuffer;

  preKeys: {
    keyId: number;
    publicKey: ArrayBuffer;
  }[];
}
