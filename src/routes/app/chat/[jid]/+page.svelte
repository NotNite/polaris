<script lang="ts">
  import { page } from "$app/stores";
  import db from "$lib/db";
  import { liveQuery } from "dexie";
  import { currentConnection } from "$lib/connection";
  import { z } from "zod";
  import { MessageSchema, makeStrLiteral } from "$lib/types/stanza";
  import { v4 } from "uuid";
  import { Send } from 'svelte-google-materialdesign-icons';

  let myJid: string;
  let jid: string;
  let input: string;

  $: {
    myJid = $currentConnection?.bareJid ?? "";
    jid = $page.params.jid;
  }

  $: messages = liveQuery(async () => {
    return await db.messages
      .where("[from+to]")
      .equals([myJid, jid])
      .or("[from+to]")
      .equals([jid, myJid])
      .sortBy("timestamp");
  });

  async function send() {
    if (input.trim() === "") return;
    if ($currentConnection == null || $currentConnection.jid == null) return;

    await $currentConnection.send<z.infer<typeof MessageSchema>>({
      message: [
        {
          _attributes: {
            from: $currentConnection.jid,
            to: jid,
            type: "chat",
            xmlns: "jabber:client"
          },

          body: makeStrLiteral(input)
        }
      ]
    });

    await db.messages.add({
      id: v4(),
      from: myJid,
      to: jid,
      body: input,
      timestamp: Date.now()
    });

    input = "";
  }
</script>

<div class="chat">
  <div class="bg-[#1B1B1E] p-3 px-4 font-bold">
    {jid}
  </div>
  <div class="messages">
    <!-- todo: infinite scroller -->
    {#each $messages || [] as message}
      <div>
        <b>{message.from}</b>: {message.body}
      </div>
    {/each}
  </div>
  <form class="input" on:submit|preventDefault={send}>
    <input type="text" bind:value={input} placeholder={`Message ${jid}...`} />
    <button type="submit">
      <Send class="ml-2 icon-disabled" />
    </button>
  </form>
</div>

<style lang="scss">
  .chat {
    display: flex;
    flex-direction: column;
    height: 100%;

    h2 {
      margin: 0;
    }

    .messages {
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      overflow: auto;
      word-wrap: break-word;
      @apply p-4;
    }

    .input {
      display: flex;
      gap: 0.5rem;
      @apply m-4;
    }

    .input input {
      @apply flex flex-1;
    }

    input:not([type='checkbox']) {
      @apply rounded-full px-3 py-2 bg-white text-black dark:bg-neutral-700 dark:text-white outline-none;
    }
  }
</style>
