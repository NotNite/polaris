import Dexie, { type Table } from "dexie";
import type { Account, Message, RosterEntry } from "./types";

export class PolarisDexie extends Dexie {
  accounts!: Table<Account>;
  roster!: Table<RosterEntry>;
  messages!: Table<Message>;

  constructor() {
    super("polaris");
    this.version(1).stores({
      accounts: "jid",
      roster: "[account+jid]",
      messages: "id, [from+to], timestamp"
    });
  }
}

export const db = new PolarisDexie();
export default db;
