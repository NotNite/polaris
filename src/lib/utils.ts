export function bareJid(jid: string): string {
  return jid.split("/")[0];
}
