<script lang="ts">
  import { goto } from "$app/navigation";
  import { currentConnection } from "$lib/connection";
  import db from "$lib/db";
  import { SubscriptionType } from "$lib/types";
  import { liveQuery } from "dexie";
  import "../../app.css"; // Import Tailwind

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
    <div>
      <a href="/app">Home</a>
      <a href="/app/settings">Settings</a>
      <a href="/app/roster">Roster</a>
      <button type="button" on:click={logout}>Logout</button>
    </div>

    <h3>Roster</h3>
    <ul>
      {#each $roster || [] as entry}
        <li>
          <a href={`/app/chat/${entry.jid}`}>{entry.jid}</a>
        </li>
      {/each}
    </ul>
  </div>

  <div class="content">
    <slot />
  </div>
</div>

<style lang="scss">
  .app {
    display: flex;
    height: calc(100vh - 1rem);
    overflow: hidden;

    .sidebar {
      min-width: 200px;
      margin-right: 1rem;
    }

    .content {
      flex: 1;
      overflow: auto;
    }
  }

  // Temporary
  a {
    @apply text-blue-700 dark:text-blue-400 underline;
  }
</style>
