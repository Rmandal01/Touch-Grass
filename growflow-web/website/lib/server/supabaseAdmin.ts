/**
 * lib/server/supabaseAdmin.ts
 * ---------------------------
 * SERVER-ONLY. A lazily-created Supabase client using the service-role key, which bypasses
 * RLS. Used by the API routes to read/write the plants / device_links / activity_events
 * tables. Returns null when the env isn't configured, so callers can fall back gracefully.
 *
 * Never import this from a client component — it carries the service-role key.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (!cached) {
    cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return cached;
}

/** Resolve an extension pairing token to a user id (or null if unknown). */
export async function resolvePairingToken(
  admin: SupabaseClient,
  pairingToken: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("device_links")
    .select("user_id")
    .eq("pairing_token", pairingToken)
    .maybeSingle();
  if (error || !data) return null;
  return data.user_id as string;
}
