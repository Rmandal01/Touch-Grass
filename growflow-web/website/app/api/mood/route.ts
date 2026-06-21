/**
 * app/api/mood/route.ts
 * ---------------------
 * POST /api/mood — set the current mood/goal for the user behind a pairing token. The server
 * uses this when auto-scoring the extension's activity (vacation = lenient, locked-in =
 * strict). The website's LiveGarden mood picker calls this.
 *
 * POST body: { token: string, mood: string, goal?: string }
 *
 * Depends on: lib/server/supabaseAdmin.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin, resolvePairingToken } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

interface MoodBody {
  token?: string;
  mood?: string;
  goal?: string;
}

export async function POST(request: Request) {
  let body: MoodBody;
  try {
    body = (await request.json()) as MoodBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, connected: false });

  const userId = body.token ? await resolvePairingToken(admin, body.token) : null;
  if (!userId) return NextResponse.json({ error: "Unknown pairing token" }, { status: 401 });

  const update: Record<string, string> = {};
  if (body.mood) update.current_mood = body.mood;
  if (body.goal !== undefined) update.current_goal = body.goal;
  if (Object.keys(update).length > 0) {
    await admin.from("plants").update(update).eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
