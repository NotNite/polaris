import { ConnectionState, Connector, type UnsubFn } from "./connector";
import { invoke } from "@tauri-apps/api/tauri";
import {
  listen,
  type EventCallback,
  type UnlistenFn
} from "@tauri-apps/api/event";
import xmljs from "xml-js";
import { PresenceSchema, type Stanza } from "$lib/types/stanza";
import type { z } from "zod";
import { PresenceType } from "$lib/types";

const xmlOptions = {
  compact: true,
  alwaysArray: true
};

export default class TauriConnector extends Connector {
  private _stanza: UnlistenFn | null = null;
  private _disconnected: UnlistenFn | null = null;

  async connect(jid: string, password: string): Promise<void> {
    this.state = ConnectionState.Connecting;
    await invoke("connect", { jid, password });

    this._stanza = await listen<string>("stanza", async (e) => {
      const stanza = e.payload;
      console.log("<--", stanza);
      const parsed = xmljs.xml2js(stanza, xmlOptions) as Stanza;
      await this.handle(parsed);
    });

    this._disconnected = await listen<string>("disconnected", async () => {
      this.state = ConnectionState.Disconnected;
      await this.disconnect();
    });

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const unsubConn = await listen<string>("connected", (e) => {
        this.state = ConnectionState.Connected;
        this.jid = e.payload;
        this.onConnected();

        unsubConn();
        unsubDisconn();
        resolve();
      });

      const unsubDisconn = await listen<string>("disconnected", async (e) => {
        this.state = ConnectionState.Disconnected;
        await this.disconnect();
        unsubConn();
        unsubDisconn();
        reject(e.payload);
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.state === ConnectionState.Connected) {
      await this.send<z.infer<typeof PresenceSchema>>({
        presence: [{ _attributes: { type: PresenceType.Unavailable } }]
      });
    }

    if (this.state !== ConnectionState.Disconnected) {
      await invoke("disconnect");
    }

    this.state = ConnectionState.Disconnected;
    this.jid = null;
    this.unsub();
  }

  async send<T extends Stanza>(stanza: T): Promise<void> {
    const str = xmljs.js2xml(stanza as xmljs.Element, xmlOptions);
    console.log("-->", str);
    await invoke("send", {
      stanza: str
    });
  }

  async subscribeEvent<T>(
    event: string,
    callback: (data: T) => void
  ): Promise<UnsubFn> {
    const handler: EventCallback<T> = (e) => {
      callback(e.payload);
    };
    return await listen<T>(event, handler);
  }

  private unsub() {
    if (this._stanza != null) this._stanza();
    if (this._disconnected != null) this._disconnected();
  }
}
