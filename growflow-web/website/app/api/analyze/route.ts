/**
 * app/api/analyze/route.ts
 * ------------------------
 * The server endpoint that scores an activity window. This is where "the AI runs on the
 * server": it calls Claude (via lib/server/scoring) with the Anthropic key that lives only
 * in Vercel env, then writes the resulting growth to the shared Supabase `plants` row (via
 * lib/server/plantSync) so the Flutter app reflects it too.
 *
 * POST body: { events: ActivityEvent[], mood: MoodSession, userId?: string }
 * Response:  ScoreResult, plus { plant: PlantSyncResult } when a plant was updated.
 *
 * Runs on the Node.js runtime (the Anthropic SDK needs Node, not the edge runtime).
 *
 * Depends on: lib/server/scoring.ts, lib/server/plantSync.ts, lib/types.ts.
 */

import { NextResponse } from "next/server";
import { scoreActivity } from "@/lib/server/scoring";
import { applyDeltaToUserPlant } from "@/lib/server/plantSync";
import type { ActivityEvent, MoodSession } from "@/lib/types";

export const runtime = "nodejs";

interface AnalyzeBody {
  events?: ActivityEvent[];
  mood?: MoodSession;
  userId?: string;
}

export async function POST(request: Request) {
  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const events = body.events ?? [];
  const mood = body.mood ?? { mood: "neutral", goal: "" };

  // 1. Score with Claude (falls back to the mock heuristic when no key is configured).
  const score = await scoreActivity(events, mood);

  // 2. Move the user's plant in Supabase so every surface (incl. the Flutter app) updates.
  //    No-ops unless Supabase env + userId are present.
  const plant = await applyDeltaToUserPlant(body.userId, score.delta);

  return NextResponse.json({ ...score, plant });
}
