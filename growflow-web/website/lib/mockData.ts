/**
 * mockData.ts
 * -----------
 * Seeded scenarios that let the website run end-to-end without a backend.
 *
 * Each scenario bundles a set of browser ActivityEvents with a default mood/goal. The demo
 * (and the stage fallback if live capture misbehaves) uses these so we can reliably show the
 * plant growing or dying. The local heuristic in lib/analysis.ts turns a scenario into a
 * ScoreResult; when the real Claude-backed Edge Function exists, it consumes the same kind
 * of ActivityEvent data.
 *
 * Depends on: lib/types.ts.
 */

import type { ActivityEvent, MoodSession } from "./types";

export type ScenarioId = "locked-in" | "doomscroll" | "vacation";

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  mood: MoodSession;
  events: ActivityEvent[];
}

/** Helper to build an event without repeating boilerplate. */
function ev(
  domain: string,
  category: ActivityEvent["category"],
  durationSeconds: number,
  title?: string
): ActivityEvent {
  return {
    source: "seed",
    domain,
    title,
    category,
    startedAt: new Date().toISOString(),
    durationSeconds,
    isActive: true,
  };
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  // Heads-down productive session: mostly docs / Canvas / GitHub with a short break.
  "locked-in": {
    id: "locked-in",
    label: "Locked in",
    description: "Deep work: docs, Canvas, GitHub, with one short break.",
    mood: { mood: "locked-in", goal: "Finish the lab report" },
    events: [
      ev("docs.google.com", "productive", 1500, "Lab report"),
      ev("canvas.bgsu.edu", "productive", 600, "Assignment 4"),
      ev("github.com", "productive", 900, "growflow"),
      ev("youtube.com", "unproductive", 120, "lo-fi beats"), // short break — should be OK
      ev("mail.google.com", "productive", 300, "Inbox"),
    ],
  },

  // Distraction spiral: long unproductive stretches on social / video.
  doomscroll: {
    id: "doomscroll",
    label: "Doomscroll",
    description: "Long stretches on social + video, almost no productive time.",
    mood: { mood: "finishing work", goal: "Study for the exam" },
    events: [
      ev("tiktok.com", "unproductive", 1800, "For You"),
      ev("instagram.com", "unproductive", 1200, "Reels"),
      ev("twitter.com", "unproductive", 900, "Timeline"),
      ev("docs.google.com", "productive", 180, "Notes"), // tiny bit of work
    ],
  },

  // Intentional downtime: unproductive sites are fine because the goal is to rest.
  vacation: {
    id: "vacation",
    label: "Vacation",
    description: "Relaxing on purpose — leniency expected, breaks are the point.",
    mood: { mood: "vacation", goal: "Rest and recharge" },
    events: [
      ev("netflix.com", "unproductive", 2400, "Show"),
      ev("youtube.com", "unproductive", 900, "Travel vlog"),
      ev("maps.google.com", "neutral", 300, "Things to do"),
    ],
  },
};

export const SCENARIO_LIST: Scenario[] = Object.values(SCENARIOS);
