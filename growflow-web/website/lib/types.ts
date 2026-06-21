/**
 * types.ts
 * --------
 * Shared TypeScript types for the GrowFlow website.
 *
 * These mirror the Supabase / Postgres schema described in the project plan and CLAUDE.md.
 * Keeping them here (and typed) means that when the real backend lands, the data we read
 * from Supabase already matches the shapes the UI expects — wiring it up becomes a matter
 * of replacing the mock source, not rewriting components.
 *
 * Depends on: nothing.
 */

/** The classification Claude returns for an evaluation window. */
export type Classification =
  | "deep_work"
  | "productive"
  | "neutral"
  | "distracted"
  | "doomscrolling";

/** Whether an evaluation result should grow, wilt, or kill the plant. */
export type Transition = "grow" | "wilt" | "death" | "none";

/** The kind of spoken message that accompanies a score. */
export type MessageKind = "congrats" | "advice" | "reminder";

/** Visible growth stages, derived from a plant's growth_points (see lib/plant.ts). */
export type PlantStage =
  | "dead"
  | "wilting"
  | "sprout"
  | "seedling"
  | "young"
  | "mature"
  | "flowering";

/** At least two plant looks for the demo (assets provided by the team later). */
export type PlantType = "succulent" | "sunflower";

/**
 * A single browser-activity event. The Chrome extension produces these and (later) uploads
 * them to Supabase. For the demo we synthesize them in mockData.ts.
 */
export interface ActivityEvent {
  source: "chrome" | "manual" | "seed";
  domain: string;
  url?: string;
  title?: string;
  /** Optional category; Claude can also infer it. */
  category?: "productive" | "neutral" | "unproductive";
  startedAt: string; // ISO timestamp
  durationSeconds: number;
  isActive: boolean;
}

/** The user's current mood / goal / task that Claude factors into scoring. */
export interface MoodSession {
  mood: string; // e.g. "locked-in", "vacation", "finishing work"
  goal: string; // free text, e.g. "finish the lab report"
}

/** The plant's persisted state. */
export interface Plant {
  plantType: PlantType;
  /** 0–100. Each evaluation moves this by the delta (+3 grow / -1 wilt). */
  growthPoints: number;
  stage: PlantStage;
  isDead: boolean;
}

/**
 * The result of one evaluation. In production this is what analyze-productivity returns;
 * for the demo, lib/analysis.ts produces it from mock data.
 */
export interface ScoreResult {
  score: number; // 0–100
  classification: Classification;
  delta: number; // clamped to {-1, +3}
  breaksOk: boolean;
  rationale: string;
  advice: string;
  messageKind: MessageKind;
}
