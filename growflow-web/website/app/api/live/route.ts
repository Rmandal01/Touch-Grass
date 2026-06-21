/**
 * app/api/live/route.ts
 * ---------------------
 * Returns the real browser activity the extension has uploaded so far (from the in-memory
 * live buffer). The website's "Use my real activity" button GETs this, then scores the
 * events through the normal pipeline (evaluate -> /api/analyze -> Claude/mock) and animates
 * the plant. Same-origin, no auth needed for the local demo.
 *
 * Depends on: lib/server/liveState.ts.
 */

import { NextResponse } from "next/server";
import { getLiveEvents, clearLiveEvents } from "@/lib/server/liveState";

export const runtime = "nodejs";

// Consume-once: return the buffered activity and clear it, so each "Use my real activity"
// click scores only what was captured SINCE the last click. That's what makes the plant
// differentiate — browse productively then click = grow; doomscroll then click = wilt.
export async function GET() {
  const { events, lastUpdated } = getLiveEvents();
  clearLiveEvents();
  return NextResponse.json({ events, count: events.length, lastUpdated });
}
