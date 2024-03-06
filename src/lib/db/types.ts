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
