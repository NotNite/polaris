import { writable } from "svelte/store";
import type { Connector } from "./connector";

export const currentConnection = writable<Connector | null>(null);
export const shouldAutoLogin = writable(true);
