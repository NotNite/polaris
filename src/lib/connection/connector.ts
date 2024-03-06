import { PresenceShowType } from "$lib/types";
import {
  type Stanza,
  PresenceSchema,
  makeStrLiteral,
  IQSchema
} from "$lib/types/stanza";
import { z } from "zod";
import handle from "./handle";
import { bareJid } from "$lib/utils";
import { v4 } from "uuid";
import { setupOMEMO } from "$lib/omemo";

export type UnsubFn = () => void;

export enum ConnectionState {
  Connecting = "connecting",
  Connected = "connected",
  Disconnected = "disconnected"
}

export abstract class Connector {
  state: ConnectionState = ConnectionState.Disconnected;
  jid: string | null = null;

  get bareJid(): string | null {
    return this.jid != null ? bareJid(this.jid) : null;
  }

  abstract connect(jid: string, password: string): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract send<T extends Stanza>(stanza: T): Promise<void>;
  async sendWithId<T extends Stanza>(stanza: T): Promise<void> {
    const firstKey = Object.keys(stanza)[0];
    stanza[firstKey][0]._attributes = stanza[firstKey][0]._attributes || {};
    stanza[firstKey][0]._attributes!.id = v4();
    this.send(stanza);
  }

  protected async onConnected(): Promise<void> {
    await this.sendWithId<z.infer<typeof IQSchema>>({
      iq: [
        {
          _attributes: {
            from: this.jid!,
            type: "get",
            xmlns: "jabber:client"
          },

          query: [
            {
              _attributes: {
                xmlns: "jabber:iq:roster"
              }
            }
          ]
        }
      ]
    });

    await this.sendWithId<z.infer<typeof PresenceSchema>>({
      presence: [
        {
          _attributes: {
            xmlns: "jabber:client"
          },

          show: makeStrLiteral(PresenceShowType.Chat),
          status: makeStrLiteral("I'm using tilt controls!")
        }
      ]
    });

    await setupOMEMO(this);
  }

  protected async handle(data: Stanza) {
    try {
      await handle(this, data);
    } catch (e) {
      console.error("Error handling stanza", e);
    }
  }
}
