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
const FLUSH_DEBOUNCE_MS = 2500; // batch a burst of fast tab switches into one upload

// Serialize session rotations so rapid tab switches can't race (which would lose or
// double-count visited tabs). Every rotate runs strictly after the previous one finishes.
let opQueue: Promise<void> = Promise.resolve();
function serialize(fn: () => Promise<void>): Promise<void> {
  opQueue = opQueue.then(fn, fn);
  return opQueue;
}

// Debounced flush: fires once switching settles, so a fast burst becomes one scored window.
// setTimeout in a service worker is fine while events keep it alive; the alarm is the backstop.
let flushTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flushPending();
  }, FLUSH_DEBOUNCE_MS);
}

// Guard against two flushes overlapping (debounce timer vs. periodic alarm).
let flushing = false;

// Distraction sites — for an INSTANT popup the moment you land on one (no server round-trip).
const DISTRACTION_SITES = [
  "youtube.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "netflix.com",
  "twitch.tv",
  "pinterest.com",
];
function isDistraction(domain: string): boolean {
  const d = domain.toLowerCase();
  return DISTRACTION_SITES.some((s) => d.includes(s));
}
// Remember the last distraction site we alerted on, so we alert once per arrival (not on a loop).
let lastDistractDomain: string | null = null;

function notifyDistraction(domain: string): void {
  chrome.notifications.create("growflow-distract", {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon128.png"),
    title: "GrowFlow:  −1 point",
    message: `${domain} is a distraction — back to your task!`,
    priority: 2,
  });
}

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

// User switched to a different tab. Rotate (serialized) and schedule a batched flush.
chrome.tabs.onActivated.addListener(() => {
  void serialize(() => rotateSession());
  scheduleFlush();
});

// The active tab navigated to a new URL (title/url change).
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if ((changeInfo.url || changeInfo.status === "complete") && tab.active) {
    void serialize(() => rotateSession());
    scheduleFlush();
  }
});

// The Chrome window gained/lost focus (e.g. user alt-tabbed away).
chrome.windows.onFocusChanged.addListener((windowId) => {
  // WINDOW_ID_NONE means no Chrome window is focused — close the session.
  void serialize(() => rotateSession(windowId === chrome.windows.WINDOW_ID_NONE));
  scheduleFlush();
});

// The user went idle/locked or came back.
chrome.idle.onStateChanged.addListener((state) => {
  void serialize(() => rotateSession(state !== "active"));
  scheduleFlush();
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

  // 1. Close any open session and buffer it. Record EVERY visited tab (min 1s) so that fast
  //    switching is captured accurately instead of dropping sub-second visits.
  const current = await getSession();
  if (current) {
    const durationSeconds = Math.max(1, Math.round((now - current.startMs) / 1000));
    await bufferEvent({
      source: "chrome",
      domain: current.domain,
      url: current.url,
      title: current.title,
      startedAt: new Date(current.startMs).toISOString(),
      durationSeconds,
      isActive: true,
    });
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

  // Instant heads-up the moment you switch TO a distraction site (deduped per arrival).
  if (isDistraction(domain)) {
    if (lastDistractDomain !== domain) {
      lastDistractDomain = domain;
      notifyDistraction(domain);
    }
  } else {
    lastDistractDomain = null; // left the distraction site -> re-alert if you come back
  }
}

// --- upload (stubbed) ------------------------------------------------------------------

/**
 * Flush buffered events to the website's /api/ingest endpoint. STUBBED until configured: if
 * there is no INGEST_URL or pairing token, we just log the buffer and keep it. When enabled,
 * this POSTs the events to the website and clears the buffer on success.
 */
async function flushPending(): Promise<void> {
  if (flushing) return; // never let two uploads overlap

  const events = await getPending();
  if (events.length === 0) return;

  const token = await getPairingToken();

  if (!INGEST_URL || !token) {
    console.log(`[GrowFlow] ${events.length} event(s) buffered (upload disabled).`, events);
    return;
  }

  flushing = true;
  // Upload the buffered events to the website's /api/ingest, then clear on success.
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairingToken: token, events }),
    });
    if (res.ok) {
      // Drop only the events we just uploaded; keep anything buffered during the request.
      const after = await getPending();
      await setPending(after.slice(events.length));
      // The server returns the score for this batch — show the +/- on the toolbar icon.
      const data = (await res.json().catch(() => null)) as
        | { score?: { delta: number; classification?: string; score?: number } }
        | null;
      // Only surface a result that actually changed the plant (skip neutral / delta 0).
      if (data?.score && data.score.delta !== 0) {
        await showDeltaBadge(data.score.delta, data.score.classification, data.score.score);
      }
      console.log(`[GrowFlow] uploaded ${events.length} event(s).`);
    } else {
      console.warn("[GrowFlow] upload failed:", res.status);
    }
  } catch (err) {
    console.warn("[GrowFlow] upload error:", err);
  } finally {
    flushing = false;
  }
}

/**
 * Show the latest point change on the toolbar icon so you see it the moment you switch tabs:
 * a green "+3" when the last activity was productive, a red "-1" when it wasn't. Also stores
 * the result so the popup can show what happened.
 */
async function showDeltaBadge(
  delta: number,
  classification?: string,
  score?: number
): Promise<void> {
  const sign = delta > 0 ? "+" : "";

  // Toolbar badge reflects the actual server-computed points (the distraction popup is fired
  // instantly on arrival in rotateSession, so we don't pop a second one here).
  await chrome.action.setBadgeText({ text: `${sign}${delta}` });
  await chrome.action.setBadgeBackgroundColor({ color: delta > 0 ? "#5fa052" : "#c0492f" });

  await chrome.storage.local.set({
    [STORAGE_KEYS.lastResult]: { delta, classification, score, at: Date.now() },
  });
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
