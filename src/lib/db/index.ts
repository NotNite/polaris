import Dexie, { type Table } from "dexie";
import type { Account, Message, OMEMO, RosterEntry } from "./types";

export class PolarisDexie extends Dexie {
  accounts!: Table<Account>;
  roster!: Table<RosterEntry>;
  messages!: Table<Message>;
  omemo!: Table<OMEMO>;

  constructor() {
    super("polaris");
    this.version(1).stores({
      accounts: "jid",
      roster: "[account+jid]",
      messages: "id, [from+to], timestamp"
    });
    this.version(2).stores({
      accounts: "jid",
      roster: "[account+jid]",
      messages: "id, [from+to], timestamp",
      omemo: "account"
    });
  }
}

export const db = new PolarisDexie();
export default db;
