import { z } from "zod";
import { PresenceType, SubscriptionType } from ".";

export type Stanza = {
  [key: string]: {
    _attributes?: Record<string, string>;
  }[];
} & Record<string, object>;

// xmljs is a bad library lol
export const StringLiteralSchema = z.array(
  z.object({ _text: z.union([z.string(), z.array(z.string())]) })
);

export function makeStrLiteral(
  str: string
): z.infer<typeof StringLiteralSchema> {
  return [{ _text: [str] }];
}

export function parseStrLiteral(
  str: z.infer<typeof StringLiteralSchema>
): string {
  const text = str[0]._text;
  return Array.isArray(text) ? text.join("") : text;
}

export const IQSchema = z.object({
  iq: z.array(
    z.object({
      _attributes: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        type: z.enum(["get", "set", "result", "error"]),
        xmlns: z.literal("jabber:client").optional()
      }),

      query: z.array(
        z.object({
          _attributes: z
            .object({
              xmlns: z.literal("jabber:iq:roster")
            })
            .optional(),

          item: z
            .array(
              z.object({
                _attributes: z.object({
                  jid: z.string(),
                  name: z.string().optional(),
                  ask: z.string().optional(),
                  subscription: z.nativeEnum(SubscriptionType).optional()
                })
              })
            )
            .optional()
        })
      )
    })
  )
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
