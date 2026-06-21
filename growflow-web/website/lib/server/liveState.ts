/**
 * lib/server/liveState.ts
 * -----------------------
 * SERVER-ONLY, in-memory store of the latest real browser activity the extension has
 * uploaded. This is the bridge that lets the website score the user's actual browsing
 * without Supabase: the extension POSTs events to /api/ingest (which calls addEvents), and
 * the website GETs /api/live (getLiveEvents) and scores them through the normal pipeline.
 *
 * It is a single global buffer — fine for a single-user local demo. It lives in the Node
 * process memory, so it resets when the dev server restarts. When Supabase exists, this is
 * replaced by per-user activity_events rows.
 *
 * Depends on: lib/types.ts.
 */

import type { ActivityEvent } from "@/lib/types";

const MAX_EVENTS = 200;

interface LiveState {
  events: ActivityEvent[];
  lastUpdated: string | null;
}

// Stored on globalThis, not a plain module-level const: Next.js bundles each API route
// separately, so a module singleton would NOT be shared between /api/ingest and /api/live.
// globalThis is shared across all bundles in the same Node process (and survives HMR).
const globalForLive = globalThis as unknown as { __growflowLive?: LiveState };
const state: LiveState =
  globalForLive.__growflowLive ??
  (globalForLive.__growflowLive = { events: [], lastUpdated: null });

/** Append newly-uploaded events, keeping only the most recent MAX_EVENTS. */
export function addEvents(events: ActivityEvent[]): number {
  state.events = [...state.events, ...events].slice(-MAX_EVENTS);
  state.lastUpdated = new Date().toISOString();
  return state.events.length;
}

/** Read the current buffer (what the website will score). */
export function getLiveEvents(): { events: ActivityEvent[]; lastUpdated: string | null } {
  return { events: state.events, lastUpdated: state.lastUpdated };
}

/** Clear the buffer (e.g. after the website has consumed it). */
export function clearLiveEvents(): void {
  state.events = [];
}
