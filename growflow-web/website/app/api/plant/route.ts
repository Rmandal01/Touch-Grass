/**
 * app/api/plant/route.ts
 * ----------------------
 * GET /api/plant?token=demo — returns the current Supabase-backed plant for the user behind
 * that pairing token. The website's LiveGarden polls this to show the plant reacting to the
 * extension in near-real-time. `connected: false` means Supabase isn't configured yet.
 *
 * Depends on: lib/server/supabaseAdmin.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin, resolvePairingToken } from "@/lib/server/supabaseAdmin";
import { getTask } from "@/lib/server/taskState";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ connected: false });

  const userId = token ? await resolvePairingToken(admin, token) : null;
  if (!userId) return NextResponse.json({ connected: true, plant: null });

  const { data: row } = await admin
    .from("plants")
    .select(
      "plant_type, growth_points, stage, is_dead, current_mood, current_goal, last_score, last_classification, last_advice, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) return NextResponse.json({ connected: true, plant: null });

  // Active-task info (in-memory), incl. points earned so far this session.
  const t = getTask(token);
  const task = t
    ? { task: t.task, active: t.active, earned: (row.growth_points as number) - t.startGrowth }
    : null;

  return NextResponse.json({
    connected: true,
    task,
    plant: {
      plantType: row.plant_type,
      growthPoints: row.growth_points,
      stage: row.stage,
      isDead: row.is_dead,
    },
    mood: { mood: row.current_mood, goal: row.current_goal },
    lastScore:
      row.last_score == null
        ? null
        : {
            score: row.last_score,
            classification: row.last_classification,
            advice: row.last_advice,
          },
    updatedAt: row.updated_at,
  });
}
