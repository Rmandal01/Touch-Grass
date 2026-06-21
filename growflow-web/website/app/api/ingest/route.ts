/**
 * app/api/ingest/route.ts
 * -----------------------
 * The endpoint the Chrome extension reports browser activity to (on every tab switch + on a
 * timer). When Supabase is configured this does the full loop automatically:
 *
 *   pairingToken -> userId  (device_links)
 *   tag + insert events     (activity_events)
 *   score the batch         (Claude via scoreActivity, using the plant's current mood)
 *   apply +3 / -1           (applyDelta)
 *   write the new points    (plants row)
 *
 * So switching to YouTube deducts points and switching to a doc adds them, persisted in
 * Supabase — no button press. The website's LiveGarden polls /api/plant to show it.
 *
 * When Supabase is NOT configured, it falls back to the in-memory buffer (lib/server/
 * liveState) so the manual "Use my real browser activity" button still works.
 *
 * POST body: { pairingToken: string, events: ActivityEvent[] }
 *
 * Depends on: lib/categorize, lib/server/{supabaseAdmin,scoring}, lib/plant, lib/server/liveState.
 */

import { NextResponse } from "next/server";
import type { ActivityEvent, Plant, PlantType } from "@/lib/types";
import { tagEvents } from "@/lib/categorize";
import { getSupabaseAdmin, resolvePairingToken } from "@/lib/server/supabaseAdmin";
import { scoreActivity } from "@/lib/server/scoring";
import { applyDelta } from "@/lib/plant";
import { addEvents } from "@/lib/server/liveState";
import { getTask } from "@/lib/server/taskState";

export const runtime = "nodejs";

interface IngestBody {
  pairingToken?: string;
  events?: ActivityEvent[];
}

export async function POST(request: Request) {
  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pairingToken } = body;
  if (!pairingToken) {
    return NextResponse.json({ error: "Missing pairingToken" }, { status: 401 });
  }

  const events = tagEvents(body.events ?? []);
  const admin = getSupabaseAdmin();

  // --- Fallback path: no Supabase -> just buffer for the manual button. ---
  if (!admin) {
    const total = addEvents(events);
    return NextResponse.json({ ok: true, received: events.length, buffered: total, mode: "memory" });
  }

  // --- Full path: resolve user, store, auto-score, update the plant in Supabase. ---
  const userId = await resolvePairingToken(admin, pairingToken);
  if (!userId) {
    return NextResponse.json({ error: "Unknown pairing token" }, { status: 401 });
  }

  // Store the raw activity (best-effort).
  if (events.length > 0) {
    await admin.from("activity_events").insert(
      events.map((e) => ({
        user_id: userId,
        source: e.source,
        domain: e.domain,
        url: e.url ?? null,
        title: e.title ?? null,
        category: e.category ?? null,
        started_at: e.startedAt ?? null,
        duration_seconds: e.durationSeconds,
        is_active: e.isActive,
      }))
    );
  }

  // Load the current plant (points + mood).
  const { data: row, error } = await admin
    .from("plants")
    .select("plant_type, growth_points, stage, is_dead, current_mood, current_goal")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "No plant for user" }, { status: 404 });
  }

  // Nothing meaningful to score -> don't move the plant, just acknowledge.
  if (events.length === 0) {
    return NextResponse.json({ ok: true, received: 0, mode: "supabase" });
  }

  // Points only move while a task is active. No task -> store activity but don't score.
  const task = getTask(pairingToken);
  if (!task || !task.active) {
    return NextResponse.json({
      ok: true,
      received: events.length,
      mode: "supabase",
      ignored: true,
      reason: "no active task",
    });
  }

  // Score this batch with Claude (or the mock), judged against the active task.
  const result = await scoreActivity(events, { mood: task.mood, goal: task.task });

  const current: Plant = {
    plantType: row.plant_type as PlantType,
    growthPoints: row.growth_points as number,
    stage: row.stage as Plant["stage"],
    isDead: row.is_dead as boolean,
  };
  const { plant: next, transition } = applyDelta(current, result.delta);

  await admin
    .from("plants")
    .update({
      growth_points: next.growthPoints,
      stage: next.stage,
      is_dead: next.isDead,
      last_score: result.score,
      last_classification: result.classification,
      last_advice: result.advice,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  console.log(
    `[ingest] user=${userId} scored=${result.score} delta=${result.delta} -> growth=${next.growthPoints}`
  );

  return NextResponse.json({
    ok: true,
    received: events.length,
    mode: "supabase",
    score: result,
    plant: { ...next, transition },
  });
}
