/**
 * lib/server/plantSync.ts
 * -----------------------
 * SERVER-ONLY. Writes an evaluation result to the shared Supabase `plants` row so that the
 * Flutter app (which reads/subscribes to the same row) shows the plant grow or wilt. This is
 * the mechanism by which "the score updates in the app": every surface — website, Flutter
 * app — reads one plant, and this is where the website-side scorer moves it.
 *
 * It is fully guarded: if the Supabase service env vars are not set, or no userId is given,
 * it no-ops and returns null. So nothing breaks before the backend exists, and there is no
 * dependency on the teammates' Supabase work (no merge conflicts).
 *
 * TODO(backend): this assumes the `plants` table exists with columns
 *   user_id, plant_type, growth_points, stage, is_dead, updated_at
 * (see the data model in CLAUDE.md). Until those migrations land, the env vars stay unset and
 * this code simply doesn't run.
 *
 * Depends on: @supabase/supabase-js, lib/plant.ts (the +3/-1 growth logic, reused here).
 */

import { createClient } from "@supabase/supabase-js";
import { applyDelta } from "@/lib/plant";
import type { Plant, PlantType } from "@/lib/types";

export interface PlantSyncResult {
  growthPoints: number;
  stage: Plant["stage"];
  isDead: boolean;
  transition: ReturnType<typeof applyDelta>["transition"];
}

/**
 * Apply `delta` to the given user's plant in Supabase and return the new state. Returns null
 * when the backend isn't configured or the user has no plant yet.
 */
export async function applyDeltaToUserPlant(
  userId: string | undefined,
  delta: number
): Promise<PlantSyncResult | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!userId || !url || !serviceKey) {
    return null; // backend not wired yet — skip silently
  }

  // Service-role client bypasses RLS; only ever constructed here, on the server.
  const supabase = createClient(url, serviceKey);

  try {
    const { data: row, error } = await supabase
      .from("plants")
      .select("plant_type, growth_points, stage, is_dead")
      .eq("user_id", userId)
      .single();
    if (error || !row) return null;

    const current: Plant = {
      plantType: row.plant_type as PlantType,
      growthPoints: row.growth_points as number,
      stage: row.stage as Plant["stage"],
      isDead: row.is_dead as boolean,
    };

    const { plant: next, transition } = applyDelta(current, delta);

    await supabase
      .from("plants")
      .update({
        growth_points: next.growthPoints,
        stage: next.stage,
        is_dead: next.isDead,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return {
      growthPoints: next.growthPoints,
      stage: next.stage,
      isDead: next.isDead,
      transition,
    };
  } catch (err) {
    console.error("[plantSync] failed to update plant:", err);
    return null;
  }
}
