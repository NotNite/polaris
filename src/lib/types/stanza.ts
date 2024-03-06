import { z } from "zod";
import { PresenceType, SubscriptionType } from ".";

export type Stanza = {
  [key: string]: {
    _attributes?: Record<string, string>;
  }[];
} & Record<string, object>;

// xmljs is a bad library lol
function child<T extends z.ZodRawShape>(shape: T) {
  return z.array(z.object<T>(shape));
}
export const StringLiteralSchema = child({
  _text: z.union([z.string(), z.array(z.string())])
});

export function makeStrLiteral(
  str: string,
  attributes?: Record<string, string>
): z.infer<typeof StringLiteralSchema> {
  return [{ _text: [str], ...attributes }];
}

export function parseStrLiteral(
  str: z.infer<typeof StringLiteralSchema>
): string {
  const text = str[0]._text;
  return Array.isArray(text) ? text.join("") : text;
}

const PepOmemoSchema = z.union([
  child({
    _attributes: z.object({
      node: z.enum(["urn:xmpp:omemo:2:devices"])
    }),

    item: child({
      _attributes: z.object({
        id: z.string()
      }),

      devices: child({
        _attributes: z.object({
          xmlns: z.literal("urn:xmpp:omemo:2")
        }),

        device: child({
          _attributes: z.object({
            id: z.string(),
            label: z.string().optional()
          })
        })
      }).optional()
    })
  }),

  child({
    _attributes: z.object({
      node: z.enum(["urn:xmpp:omemo:2:bundles"])
    }),

    item: child({
      _attributes: z.object({
        id: z.string()
      }),

      bundle: child({
        _attributes: z.object({
          xmlns: z.literal("urn:xmpp:omemo:2")
        }),

        spk: z.intersection(
          child({
            _attributes: z.object({
              id: z.string()
            })
          }),
          StringLiteralSchema
        ),

        spks: StringLiteralSchema,
        ik: StringLiteralSchema,

        prekeys: child({
          pk: z.intersection(
            child({
              _attributes: z.object({
                id: z.string()
              })
            }),
            StringLiteralSchema
          )
        })
      }).optional()
    })
  })
]);

export const IQSchema = z.object({
  iq: child({
    _attributes: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      type: z.enum(["get", "set", "result", "error"]),
      xmlns: z.literal("jabber:client").optional()
    }),

    query: child({
      _attributes: z
        .object({
          xmlns: z.literal("jabber:iq:roster")
        })
        .optional(),

      item: child({
        _attributes: z.object({
          jid: z.string(),
          name: z.string().optional(),
          ask: z.string().optional(),
          subscription: z.nativeEnum(SubscriptionType).optional()
        })
      }).optional()
    }).optional(),

    pubsub: child({
      _attributes: z
        .object({
          xmlns: z.literal("http://jabber.org/protocol/pubsub")
        })
        .optional(),

      publish: PepOmemoSchema.optional()
    }).optional(),

    "publish-options": child({
      x: child({
        _attributes: z.object({
          xmlns: z.string(),
          type: z.string()
        }),

        field: child({
          _attributes: z.object({
            var: z.string(),
            type: z.string().optional()
          }),

          value: StringLiteralSchema
        })
      })
    }).optional()
  })
});

export const PresenceSchema = z.object({
  presence: z.array(
    z.object({
      _attributes: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          type: z.nativeEnum(PresenceType).optional(),
          xmlns: z.string().optional()
        })
        .optional(),

      show: StringLiteralSchema.optional(),
      status: StringLiteralSchema.optional()
    })
  )
});

export const MessageSchema = z.object({
  message: z.array(
    z.object({
      _attributes: z.object({
        from: z.string(),
        to: z.string(),
        type: z.string(),
        xmlns: z.string()
      }),
      body: StringLiteralSchema
    })
  )
});
