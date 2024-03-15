<script lang="ts">
  import { goto } from "$app/navigation";
  import { currentConnection, shouldAutoLogin } from "$lib/connection";
  import TauriConnector from "$lib/connection/tauri";
  import getSecretManager from "$lib/secret";
  import { settings } from "$lib/settings";
  import { Login } from 'svelte-google-materialdesign-icons';

  let username = "";
  let password = "";
  let savePassword = false;
  let disabled = false;
  let error = "";

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
    disabled = true;

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
      disabled = false;

      goto("/app");
    } catch (e) {
      console.error("Failed to connect", e);
      error = "Failed to connect, see console for more info";
      disabled = false;
      return;
    }
  }
</script>

<div class="flex w-full h-full justify-center items-center">
  <form on:submit|preventDefault={login} class="flex w-full h-full justify-center items-center bg-neutral-200 dark:bg-neutral-800 flex-col m-8 p-8 rounded-xl text-center">
    <h2 class="text-2xl font-bold mb-2">Log in</h2>
    <p class="text-red-500 mb-4">{error}</p>
  
    <div>
      <label for="username" class="hidden">Username</label>
      <input id="username" type="text" disabled={disabled} bind:value={username} placeholder="Username" />
    </div>
  
    <br />
  
    <div>
      <label for="password" class="hidden">Password</label>
      <input id="password" type="password" disabled={disabled} bind:value={password} placeholder="Password" />
    </div>
  
    <br />
  
    <div>
      <input id="savePassword" type="checkbox" disabled={disabled} bind:checked={savePassword} />
      <label for="savePassword" class="align-middle">Save password</label>
    </div>
  
    <br />
  
    <button type="submit" class="flex justify-center">
      <Login class="mr-1 icon-disabled" /> Log in
    </button>
  </form>
</div>

<style lang="scss">
  input:not([type='checkbox']), button {
    @apply rounded-full px-3 py-2 bg-white text-black dark:bg-neutral-700 dark:text-white w-64;
  }

  input:disabled, button:disabled {
    @apply bg-neutral-300 text-neutral-400 dark:bg-neutral-500;
  }

  input:disabled::placeholder, .icon-disabled:disabled {
    @apply text-neutral-400;
  }
</style>