/**
 * supabaseClient.ts
 * -----------------
 * Supabase browser client — STUBBED for now.
 *
 * The real client is written below but commented out (// TODO(backend)) because the Supabase
 * project does not exist yet, and importing/initializing it without env vars would throw at
 * runtime. Leaving it dormant keeps the website runnable today and avoids any dependency on
 * the backend workstream (no merge conflicts).
 *
 * When the backend lands:
 *   1. A teammate fills NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
 *      .env.local (see .env.example).
 *   2. Uncomment the block below and delete the stub `getSupabase` that throws.
 *   3. lib/analysis.ts and the auth flow can then use the real client.
 *
 * Depends on: @supabase/supabase-js (installed, used only by the commented block for now).
 */

// TODO(backend): uncomment to enable the real client.
//
// import { createClient, type SupabaseClient } from "@supabase/supabase-js";
//
// let client: SupabaseClient | null = null;
//
// export function getSupabase(): SupabaseClient {
//   if (client) return client;
//
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
//   if (!url || !anonKey) {
//     throw new Error(
//       "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and " +
//         "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example)."
//     );
//   }
//
//   client = createClient(url, anonKey);
//   return client;
// }

/**
 * Temporary stub so the rest of the app can reference getSupabase() without crashing during
 * development. It intentionally throws if actually called — nothing in the demo path calls
 * it, because analysis.ts uses the local mock heuristic instead.
 */
export function getSupabase(): never {
  throw new Error(
    "Supabase is not wired up yet. See lib/supabaseClient.ts — uncomment the real client " +
      "once NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

/** Whether the backend env is configured. Used to choose live vs mock paths. */
export function isBackendConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
