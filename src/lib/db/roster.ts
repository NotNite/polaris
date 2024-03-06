import db from ".";
import type { RosterEntry } from "./types";

export async function getRoster(account: string) {
  return await db.roster.where({ account }).toArray();
}

export async function updateRoster(account: string, roster: RosterEntry[]) {
  const current = await getRoster(account);

  // Remove entries that are no longer in the roster
  const toDelete = current.filter((e) => !roster.some((r) => r.jid === e.jid));
  for (const entry of toDelete) {
    await db.roster.where({ account, jid: entry.jid }).delete();
  }

  // Upsert entries that are new or have changed
  const toUpsert = roster.filter((r) => {
    if (!current.some((e) => e.jid === r.jid)) return true;
    const existing = current.find((e) => e.jid === r.jid);
    return JSON.stringify(existing) !== JSON.stringify(r);
  });

  for (const entry of toUpsert) {
    await upsertRosterEntry(account, entry);
  }
}

export async function upsertRosterEntry(account: string, entry: RosterEntry) {
  const dbEntry = await db.roster.where({ account, jid: entry.jid }).first();
  if (dbEntry != null) {
    await db.roster.update(dbEntry, entry);
  } else {
    await db.roster.add(entry);
  }
}

export async function deleteRosterEntry(account: string, jid: string) {
  await db.roster.where({ account, jid }).delete();
}
