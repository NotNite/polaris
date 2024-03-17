<script lang="ts">
  import { goto } from "$app/navigation";
  import { currentConnection } from "$lib/connection";
  import db from "$lib/db";
  import { SubscriptionType } from "$lib/types";
  import { liveQuery } from "dexie";
  import "../../app.css"; // Import Tailwind
  import { Home, Settings, Person, Logout } from 'svelte-google-materialdesign-icons';
  import { page } from "$app/stores";

  $: myJid = $currentConnection?.bareJid ?? "";

  $: roster = liveQuery(async () => {
    return await db.roster.where("account").equals(myJid).toArray();
  });

  $: if ($currentConnection == null) {
    goto("/login");
  }

  async function logout() {
    if ($currentConnection != null) {
      await $currentConnection.disconnect();
    }
    $currentConnection = null;
    goto("/login");
  }
</script>

<div class="app">
  <div class="sidebar">
    <div class="flex nav">
      <a href="/app" class:active="{$page.url.pathname == '/app'}"><Home /></a>
      <a href="/app/settings" class:active="{$page.url.pathname == '/app/settings'}"><Settings /></a>
      <a href="/app/roster" class:active="{$page.url.pathname == '/app/roster'}"><Person /></a>
    </div>

    <div class="p-3">
      <h3 class="text-xl font-bold">Roster</h3>
      <ul class="mb-4">
        {#each $roster || [] as entry}
          <li>
            <a href={`/app/chat/${entry.jid}`}>{entry.jid}</a>
          </li>
        {/each}
      </ul>

      <button type="button" class="flex font-bold" on:click={logout}><Logout class="mr-1" /> Logout</button>
    </div>
  </div>

  <div class="content">
    <slot />
  </div>
</div>

<style lang="scss">
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;

    .sidebar {
      min-width: 200px;
      @apply bg-neutral-200 dark:bg-[#27272B];
    }

    .nav a {
      @apply w-full p-2 flex justify-center items-center;
    }

    .content {
      flex: 1;
      overflow: auto;
    }

    .active {
      @apply bg-neutral-400 dark:bg-[#45454c];
    }
  }

  // Temporary
  a {
    @apply text-blue-700 dark:text-blue-400 underline;
  }

  input:not([type='checkbox']) {
    @apply rounded-full px-3 py-2 bg-white text-black dark:bg-neutral-700 dark:text-white w-64;
  }
</style>
