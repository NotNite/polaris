import SecretManager from "./secret";
import { invoke } from "@tauri-apps/api";

export default class TauriSecretManager extends SecretManager {
  async getSecret(jid: string): Promise<string | null> {
    try {
      return await invoke("get_secret", { jid });
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async setSecret(jid: string, secret: string): Promise<void> {
    try {
      await invoke("set_secret", { jid, secret });
    } catch (e) {
      console.error(e);
    }
  }
}
