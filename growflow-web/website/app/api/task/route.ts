/**
 * app/api/task/route.ts
 * ---------------------
 * Start / finish the active task. The website calls this when you type what you're working on
 * and hit Start (and again on Finish). The task becomes the scoring context the extension's
 * activity is judged against (see /api/ingest), and points only move while a task is active.
 *
 * POST { token, action: "start", task, mood? }  -> begins a task
 * POST { token, action: "finish" }              -> ends it, returns points earned this session
 *
 * Depends on: lib/server/{supabaseAdmin, taskState}.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin, resolvePairingToken } from "@/lib/server/supabaseAdmin";
import { startTask, finishTask, getTask } from "@/lib/server/taskState";

export const runtime = "nodejs";

interface TaskBody {
  token?: string;
  action?: "start" | "finish";
  task?: string;
  mood?: string;
}

/** Read the user's current plant growth (the running point total). */
async function currentGrowth(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<number> {
  const { data } = await admin!
    .from("plants")
    .select("growth_points")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.growth_points as number | undefined) ?? 0;
}

export async function POST(request: Request) {
  let body: TaskBody;
  try {
    body = (await request.json()) as TaskBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = body.token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const userId = await resolvePairingToken(admin, token);
  if (!userId) return NextResponse.json({ error: "Unknown token" }, { status: 401 });

  const growth = await currentGrowth(admin, userId);

  if (body.action === "start") {
    const state = startTask(token, body.task ?? "", body.mood ?? "locked-in", growth);
    return NextResponse.json({ ok: true, task: state });
  }

  if (body.action === "finish") {
    const prev = getTask(token);
    finishTask(token);
    const earned = prev ? growth - prev.startGrowth : 0;
    return NextResponse.json({ ok: true, earned, finalGrowth: growth, task: prev?.task ?? null });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
