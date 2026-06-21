/**
 * analysis.ts
 * -----------
 * Productivity scoring, from the browser's point of view. Two paths:
 *
 *   1. SERVER (active): evaluate() POSTs the activity window + mood to /api/analyze, the
 *      website's own API route (running on Vercel). That route scores with Claude when a key
 *      is configured and writes the result to Supabase; otherwise it returns a mock score.
 *      Either way the browser just gets back a ScoreResult.
 *
 *   2. LOCAL FALLBACK: if that fetch fails (offline, route error), evaluate() falls back to
 *      evaluateMock() here so the demo never breaks.
 *
 * evaluateMock() is also imported by the server route (lib/server/scoring) as its own
 * no-key fallback, so the scoring rules live in exactly one place.
 *
 * Depends on: lib/types.ts.
 */

import type { ActivityEvent, MoodSession, ScoreResult } from "./types";

/** Productivity threshold: at or above this score the plant grows (+3), else it wilts (-1). */
const PRODUCTIVE_THRESHOLD = 60;

/** Continuous unproductive seconds beyond this count as a "long" (penalized) stretch. */
const LONG_BREAK_SECONDS = 600; // 10 minutes

/**
 * Public entry point used by the UI. Posts to the server route; falls back to local scoring.
 */
export async function evaluate(
  events: ActivityEvent[],
  mood: MoodSession
): Promise<ScoreResult> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events, mood }),
    });
    if (res.ok) return (await res.json()) as ScoreResult;
  } catch {
    // fall through to local scoring
  }
  return evaluateMock(events, mood);
}

// ---------------------------------------------------------------------------------------
// LOCAL heuristic mirroring the product scoring rules. Shared by the UI fallback above and
// by the server route's no-key fallback.
// ---------------------------------------------------------------------------------------

/**
 * Turn an activity window + mood into a ScoreResult locally. This is deliberately simple but
 * follows the real rules so the demo behaves believably:
 *   - Score is roughly the productive share of active time.
 *   - Short unproductive bursts do not hurt; only stretches over LONG_BREAK_SECONDS do.
 *   - "vacation" mood is lenient (unproductive time barely counts); "locked-in" is strict.
 */
export function evaluateMock(
  events: ActivityEvent[],
  mood: MoodSession
): ScoreResult {
  const productive = sumBy(events, (e) => (e.category === "productive" ? e.durationSeconds : 0));
  const unproductive = sumBy(events, (e) =>
    e.category === "unproductive" ? e.durationSeconds : 0
  );
  const total = sumBy(events, (e) => e.durationSeconds) || 1;

  // Only long unproductive events are "penalized"; short ones are treated as fine breaks.
  const longUnproductive = sumBy(events, (e) =>
    e.category === "unproductive" && e.durationSeconds > LONG_BREAK_SECONDS
      ? e.durationSeconds
      : 0
  );
  const breaksOk = longUnproductive === 0;

  // Mood-aware leniency factor applied to the penalty from long unproductive stretches.
  const leniency = moodLeniency(mood.mood); // 0 = strict, 1 = very lenient

  const rawProductiveShare = productive / total; // 0–1
  const penaltyShare = (longUnproductive / total) * (1 - leniency); // 0–1
  const score = clamp01(rawProductiveShare - penaltyShare) * 100;
  const rounded = Math.round(score);

  const classification = classify(rounded, breaksOk);
  const delta = rounded >= PRODUCTIVE_THRESHOLD ? 3 : -1;
  const messageKind = delta > 0 ? "congrats" : breaksOk ? "advice" : "reminder";

  return {
    score: rounded,
    classification,
    delta,
    breaksOk,
    rationale: buildRationale(productive, unproductive, longUnproductive, mood),
    advice: buildAdvice(rounded, breaksOk, mood),
    messageKind,
  };
}

function moodLeniency(mood: string): number {
  const m = mood.toLowerCase();
  if (m.includes("vacation")) return 0.9;
  if (m.includes("locked")) return 0.0;
  if (m.includes("finish")) return 0.2;
  return 0.4; // neutral default
}

function classify(score: number, breaksOk: boolean): ScoreResult["classification"] {
  if (score >= 85) return "deep_work";
  if (score >= 60) return "productive";
  if (score >= 40) return breaksOk ? "neutral" : "distracted";
  if (score >= 20) return "distracted";
  return "doomscrolling";
}

function buildRationale(
  productive: number,
  unproductive: number,
  longUnproductive: number,
  mood: MoodSession
): string {
  const mins = (s: number) => Math.round(s / 60);
  const breakNote =
    longUnproductive > 0
      ? `${mins(longUnproductive)}m of long unproductive stretches counted against you`
      : "short breaks were not penalized";
  return (
    `~${mins(productive)}m productive vs ~${mins(unproductive)}m unproductive; ` +
    `${breakNote}; mood "${mood.mood}".`
  );
}

function buildAdvice(score: number, breaksOk: boolean, mood: MoodSession): string {
  if (score >= 85) return "Incredible focus — your plant is thriving. Keep the streak going!";
  if (score >= 60) return "Solid, productive session. A little more and you'll hit deep work.";
  if (!breaksOk)
    return `Long distraction stretches are wilting your plant. Try a focused 25‑minute block on "${mood.goal}".`;
  return "Mostly idle right now — a short focused sprint will get your plant growing again.";
}

// --- tiny utilities ---

function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + fn(item), 0);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
