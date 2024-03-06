import SecretManager from "./secret";
import TauriSecretManager from "./tauri";

let secretManager: SecretManager | null = null;
export default function getSecretManager() {
  // TODO: web stuff
  if (secretManager == null) {
    secretManager = new TauriSecretManager();
  }

  return secretManager;
}
