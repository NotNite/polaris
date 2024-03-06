<script lang="ts">
  import { currentConnection } from "$lib/connection";
  import db from "$lib/db";
  import type { RosterEntry } from "$lib/db/types";
  import presenceStore from "$lib/stores/presence";
  import { PresenceType, SubscriptionType } from "$lib/types";
  import { PresenceSchema, IQSchema } from "$lib/types/stanza";
  import { liveQuery } from "dexie";
  import { z } from "zod";

  let requestJid = "";

  $: myJid = $currentConnection?.bareJid ?? "";

  $: roster = liveQuery(async () => {
    return await db.roster
      .where("account")
      .equals(myJid)
      .and((entry) => entry.subscription === SubscriptionType.Both)
      .toArray();
  });

  $: presenceRequests = Object.keys($presenceStore)
    .map((jid) => {
      return $presenceStore[jid]._attributes?.type === PresenceType.Subscribe
        ? jid
        : null;
    })
    .filter((x): x is string => x != null);

  async function replyPresence(jid: string, accepted: boolean) {
    if (accepted) {
      $currentConnection?.sendWithId<z.infer<typeof PresenceSchema>>({
        presence: [
          {
            _attributes: {
              xmlns: "jabber:client",
              to: jid,
              type: PresenceType.Subscribed
            }
          }
        ]
      });

      $currentConnection?.sendWithId<z.infer<typeof IQSchema>>({
        iq: [
          {
            _attributes: {
              xmlns: "jabber:client",
              to: jid,
              type: "set"
            },
            query: [
              {
                item: [
                  {
                    _attributes: {
                      jid: jid,
                      name: jid
                    }
                  }
                ]
              }
            ]
          }
        ]
      });

      $currentConnection?.sendWithId<z.infer<typeof PresenceSchema>>({
        presence: [
          {
            _attributes: {
              xmlns: "jabber:client",
              to: jid,
              type: PresenceType.Subscribe
            }
          }
        ]
      });
    } else {
      $currentConnection?.sendWithId<z.infer<typeof PresenceSchema>>({
        presence: [
          {
            _attributes: {
              from: $currentConnection.jid!,
              to: jid,
              type: PresenceType.Unsubscribed
            }
          }
        ]
      });
    }

    const newPresenceStore = { ...$presenceStore };
    delete newPresenceStore[jid];
    $presenceStore = newPresenceStore;
  }

  async function askPresence() {
    const jid = requestJid;

    $currentConnection?.sendWithId<z.infer<typeof PresenceSchema>>({
      presence: [
        {
          _attributes: {
            xmlns: "jabber:client",
            to: jid,
            type: PresenceType.Subscribe
          }
        }
      ]
    });

    $currentConnection?.sendWithId<z.infer<typeof IQSchema>>({
      iq: [
        {
          _attributes: {
            xmlns: "jabber:client",
            to: jid,
            type: "set"
          },
          query: [
            {
              _attributes: {
                xmlns: "jabber:iq:roster"
              },

              item: [
                {
                  _attributes: {
                    jid: jid,
                    subscription: SubscriptionType.None
                  }
                }
              ]
            }
          ]
        }
      ]
    });

    requestJid = "";
  }
</script>

<div class="roster">
  <h2>Roster</h2>
  <ul>
    {#each $roster || [] as entry}
      <li>
        <a href={`/app/chat/${entry.jid}`}>{entry.jid}</a>
      </li>
    {/each}
  </ul>

  <h2>Presence requests</h2>
  <ul>
    {#each presenceRequests || [] as jid}
      <li>
        <a href={`/app/chat/${jid}`}>{jid}</a>
        <button on:click={() => replyPresence(jid, true)}>Accept</button>
        <button on:click={() => replyPresence(jid, false)}>Decline</button>
      </li>
    {/each}
  </ul>

  <h2>Add new contact</h2>
  <form on:submit|preventDefault={askPresence}>
    <input id="jid" type="text" bind:value={requestJid} />
    <button type="submit">Add</button>
  </form>
</div>
