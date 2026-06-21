/**
 * app/api/ingest/route.ts
 * -----------------------
 * The endpoint the Chrome extension reports browser activity to. The extension batches
 * ActivityEvents and POSTs them here with its pairing token; this route tags each event with
 * a productivity category and stores it in the in-memory live buffer (lib/server/liveState).
 * The website then pulls that buffer from /api/live and scores it through the normal Claude
 * pipeline — which is how real browsing (e.g. time in Google Docs) ends up moving the plant.
 *
 * Single-user local demo: there's one global buffer and the token is only checked for
 * presence (not resolved to a user). TODO(backend): with Supabase, resolve pairingToken ->
 * userId via device_links and insert into activity_events per user instead.
 *
 * POST body: { pairingToken: string, events: ActivityEvent[] }
 *
 * Depends on: lib/types.ts, lib/categorize.ts, lib/server/liveState.ts.
 */

import { NextResponse } from "next/server";
import type { ActivityEvent } from "@/lib/types";
import { tagEvents } from "@/lib/categorize";
import { addEvents } from "@/lib/server/liveState";

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

  const { pairingToken, events = [] } = body;
  if (!pairingToken) {
    return NextResponse.json({ error: "Missing pairingToken" }, { status: 401 });
  }

  // Tag each event with productive/unproductive/neutral, then store in the live buffer.
  const total = addEvents(tagEvents(events));

  console.log(`[ingest] received ${events.length} event(s); buffer now ${total}`);
  return NextResponse.json({ ok: true, received: events.length, buffered: total });
}
