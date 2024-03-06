import type { PresenceSchema } from "$lib/types/stanza";
import type { z } from "zod";
import { writable, type Writable } from "svelte/store";

type PresenceData = z.infer<typeof PresenceSchema>["presence"][0];
const presenceStore: Writable<Record<string, PresenceData>> = writable({});
export default presenceStore;
