import db from ".";

export async function getAccounts() {
  return await db.accounts.toArray();
}

export async function ensureAccount(jid: string) {
  const account = await db.accounts.get(jid);
  if (account != null) return;
  await db.accounts.add({
    jid
  });
}
