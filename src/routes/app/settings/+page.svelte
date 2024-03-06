<script lang="ts">
  import { settings } from "$lib/settings";
  import { currentConnection } from "$lib/connection";

  let autologin = $currentConnection?.bareJid === $settings.autologin;
  function applyAutologin() {
    if (autologin) {
      $settings.autologin = $currentConnection?.bareJid ?? undefined;
    } else {
      $settings.autologin = undefined;
    }
  }
</script>

<h1>Settings</h1>
<input
  id="autologin"
  type="checkbox"
  bind:checked={autologin}
  on:change={applyAutologin}
/>
<label for="autologin"
  >Auto login to this account ({$currentConnection?.bareJid ??
    "unknown"})</label
>
