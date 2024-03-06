import db from "$lib/db";
import { updateRoster } from "$lib/db/roster";
import {
  IQSchema,
  MessageSchema,
  parseStrLiteral,
  PresenceSchema,
  type Stanza
} from "$lib/types/stanza";
import { bareJid } from "$lib/utils";
import { v4 } from "uuid";
import type { Connector } from "./connector";
import { PresenceType, SubscriptionType } from "$lib/types";
import presenceStore from "$lib/stores/presence";

export default async function handle(connector: Connector, data: Stanza) {
  const iq = IQSchema.safeParse(data);
  if (iq.success) {
    console.log("IQ");

    if (iq.data.iq[0].query?.[0]._attributes?.xmlns === "jabber:iq:roster") {
      const roster = iq.data.iq[0].query[0].item!.map((item) => ({
        account: connector.bareJid!,
        jid: item._attributes.jid,
        name: item._attributes.name,
        subscription: item._attributes.subscription ?? SubscriptionType.None
      }));

      await updateRoster(connector.bareJid!, roster);
    }
  }
  const presence = PresenceSchema.safeParse(data);
  if (presence.success) {
    console.log("Presence");

    const data = presence.data.presence[0];
    if (
      data._attributes?.type === PresenceType.Subscribe &&
      data._attributes?.from != null
    ) {
      const from = bareJid(data._attributes.from!);
      if (from !== connector.bareJid) {
        presenceStore.update((presences) => ({ ...presences, [from]: data }));
      }
    }
  }

  const message = MessageSchema.safeParse(data);
  if (message.success) {
    console.log("Message");

    const data = message.data.message[0];
    if (bareJid(data._attributes.to) === connector.bareJid) {
      await db.messages.add({
        id: v4(),
        from: bareJid(data._attributes.from),
        to: bareJid(data._attributes.to),
        body: parseStrLiteral(data.body),
        timestamp: Date.now()
      });
    }
  }
}
