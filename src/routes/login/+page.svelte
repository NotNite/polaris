<script lang="ts">
  import { goto } from "$app/navigation";
  import { currentConnection, shouldAutoLogin } from "$lib/connection";
  import TauriConnector from "$lib/connection/tauri";
  import getSecretManager from "$lib/secret";
  import { settings } from "$lib/settings";

  let username = "";
  let password = "";
  let savePassword = false;

  $: if ($shouldAutoLogin && $currentConnection != null) {
    goto("/app");
  }

  $: if ($settings.autologin != null) {
    const jid = $settings.autologin;
    getSecretManager()
      .getSecret(jid)
      .then((secret) => {
        if (secret != null) {
          username = jid;
          password = secret;
          //login();
        }
      });
  }

  async function login() {
    if (password.trim() == "") {
      const secret = await getSecretManager().getSecret(username);
      if (secret != null) password = secret;
    }

    if ($currentConnection != null) {
      await $currentConnection.disconnect();
    }

    const newConnection = new TauriConnector();
    try {
      await newConnection.connect(username, password);
      $currentConnection = newConnection;
      console.log("Connected");

      if (savePassword) {
        getSecretManager().setSecret(username, password);
      }

      $shouldAutoLogin = false;

      goto("/app");
    } catch (e) {
      console.error("Failed to connect", e);
      return;
    }
  }
</script>

<form on:submit|preventDefault={login}>
  <input id="username" type="text" bind:value={username} />
  <label for="username">Username</label>

  <br />

  <input id="password" type="password" bind:value={password} />
  <label for="password">Password</label>

  <br />

  <input id="savePassword" type="checkbox" bind:checked={savePassword} />
  <label for="savePassword">Save password</label>

  <br />

  <button type="submit">Login</button>
</form>
