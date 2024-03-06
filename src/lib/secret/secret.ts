export default abstract class SecretManager {
  abstract getSecret(jid: string): Promise<string | null>;
  abstract setSecret(jid: string, secret: string): Promise<void>;
}
