/**
 * background.ts — the MV3 service worker.
 * ---------------------------------------
 * Tracks how long the user actively spends on each site and buffers that as ActivityEvents.
 * It is fully event-driven so it survives the service worker being suspended/restarted:
 * the "current session" and the pending-event buffer both live in chrome.storage.local.
 *
 * Flow:
 *   - When the active tab changes, its URL changes, the window loses/gains focus, or the
 *     user goes idle/active, we CLOSE the current session (recording elapsed active seconds
 *     as an ActivityEvent) and OPEN a new one for whatever is now active.
 *   - A periodic alarm flushes buffered events to the backend.
 *
 * The upload itself is STUBBED (// TODO(backend)) until the ingest-activity Edge Function and
 * a pairing token exist; until then events are just logged so you can watch tracking work.
 *
 * Depends on: src/types.ts, src/config.ts.
 */

import type { ActivityEvent } from "./types";
import {
  STORAGE_KEYS,
  INGEST_URL,
  SAMPLE_INTERVAL_MS,
  IDLE_THRESHOLD_SECONDS,
} from "./config";

/** An open tracking session: what the user is currently on, and since when. */
interface Session {
  domain: string;
  url: string;
  title: string;
  startMs: number;
}

const FLUSH_ALARM = "growflow-flush";

// --- lifecycle -------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  // Treat the user as idle after IDLE_THRESHOLD_SECONDS of no input.
  chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);
  // Periodic flush. Alarms are more reliable than setInterval in a service worker that can
  // be suspended. (Sub-minute periods only fire reliably while unpacked/in development.)
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: SAMPLE_INTERVAL_MS / 60_000 });
  console.log("[GrowFlow] installed; tracking active-tab time.");
});

// --- events that start/stop a session --------------------------------------------------

// User switched to a different tab. Flush right away so the plant reacts promptly.
chrome.tabs.onActivated.addListener(async () => {
  await rotateSession();
  await flushPending();
});

// The active tab navigated to a new URL (title/url change).
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    if (tab.active) await rotateSession();
  }
});

// The Chrome window gained/lost focus (e.g. user alt-tabbed away).
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  // WINDOW_ID_NONE means no Chrome window is focused — close the session.
  await rotateSession(windowId === chrome.windows.WINDOW_ID_NONE);
  await flushPending();
});

// The user went idle/locked or came back.
chrome.idle.onStateChanged.addListener(async (state) => {
  await rotateSession(state !== "active");
});

// Periodic flush of buffered events.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FLUSH_ALARM) await flushPending();
});

// --- core: rotate the current session --------------------------------------------------

/**
 * Close the current session (recording an event) and, unless `pauseOnly`, open a new one for
 * whatever tab is now active. Called whenever the "what is the user doing" state changes.
 */
async function rotateSession(pauseOnly = false): Promise<void> {
  const now = Date.now();

  // 1. Close any open session and buffer it as an event.
  const current = await getSession();
  if (current) {
    const durationSeconds = Math.round((now - current.startMs) / 1000);
    if (durationSeconds >= 1) {
      await bufferEvent({
        source: "chrome",
        domain: current.domain,
        url: current.url,
        title: current.title,
        startedAt: new Date(current.startMs).toISOString(),
        durationSeconds,
        isActive: true,
      });
    }
    await setSession(null);
  }

  if (pauseOnly) return;

  // 2. Open a new session for the active tab, if it is a real web page.
  const tab = await getActiveTab();
  if (!tab?.url) return;
  const domain = domainOf(tab.url);
  if (!domain) return; // skip chrome://, extension pages, blank tabs, etc.

  await setSession({
    domain,
    url: tab.url,
    title: tab.title ?? "",
    startMs: now,
  });
}

// --- upload (stubbed) ------------------------------------------------------------------

/**
 * Flush buffered events to the website's /api/ingest endpoint. STUBBED until configured: if
 * there is no INGEST_URL or pairing token, we just log the buffer and keep it. When enabled,
 * this POSTs the events to the website and clears the buffer on success.
 */
async function flushPending(): Promise<void> {
  const events = await getPending();
  if (events.length === 0) return;

  const token = await getPairingToken();

  if (!INGEST_URL || !token) {
    console.log(`[GrowFlow] ${events.length} event(s) buffered (upload disabled).`, events);
    return;
  }

  // Upload the buffered events to the website's /api/ingest, then clear on success.
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairingToken: token, events }),
    });
    if (res.ok) {
      await setPending([]); // clear only after a successful upload
      console.log(`[GrowFlow] uploaded ${events.length} event(s).`);
    } else {
      console.warn("[GrowFlow] upload failed:", res.status);
    }
  } catch (err) {
    console.warn("[GrowFlow] upload error:", err);
  }
}

// --- storage helpers -------------------------------------------------------------------

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

/** Extract a hostname, returning null for non-web URLs we should not track. */
function domainOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname;
  } catch {
    return null;
  }
}

async function getSession(): Promise<Session | null> {
  const data = await chrome.storage.local.get("growflow_session");
  return (data.growflow_session as Session | undefined) ?? null;
}

async function setSession(session: Session | null): Promise<void> {
  await chrome.storage.local.set({ growflow_session: session });
}

async function bufferEvent(event: ActivityEvent): Promise<void> {
  const pending = await getPending();
  pending.push(event);
  await setPending(pending);
}

async function getPending(): Promise<ActivityEvent[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.pendingEvents);
  return (data[STORAGE_KEYS.pendingEvents] as ActivityEvent[] | undefined) ?? [];
}

async function setPending(events: ActivityEvent[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.pendingEvents]: events });
}

async function getPairingToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.pairingToken);
  return (data[STORAGE_KEYS.pairingToken] as string | undefined) ?? null;
}
