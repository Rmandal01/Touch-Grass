/**
 * lib/server/scoring.ts
 * ---------------------
 * SERVER-ONLY. Scores an activity window with Claude. This is the real "AI runs on the
 * server" piece — it executes inside the Next.js API route (app/api/analyze) on Vercel, so
 * the ANTHROPIC_API_KEY never reaches the browser or the Chrome extension.
 *
 * Claude is called with a single forced tool (report_productivity_score); we read the tool
 * input, clamp the delta to the allowed band, and return a ScoreResult. If ANTHROPIC_API_KEY
 * is not set (local dev / demo), or if the call errors, we fall back to the local mock
 * heuristic in lib/analysis so the flow always works.
 *
 * Do not import this from a client component — it pulls in the Anthropic SDK and reads
 * server secrets.
 *
 * Depends on: @anthropic-ai/sdk, lib/types.ts, lib/analysis.ts (mock fallback).
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ActivityEvent,
  Classification,
  MessageKind,
  MoodSession,
  ScoreResult,
} from "@/lib/types";
import { evaluateMock } from "@/lib/analysis";

// Default to the latest, most capable model; overridable via env for cost/speed tuning.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

/** Public entry point used by the API route. */
export async function scoreActivity(
  events: ActivityEvent[],
  mood: MoodSession
): Promise<ScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured — score locally so the demo still produces real grow/wilt behavior.
    return evaluateMock(events, mood);
  }

  try {
    return await scoreWithClaude(events, mood, apiKey);
  } catch (err) {
    // Never hard-fail the request; fall back to the heuristic and log for debugging.
    console.error("[analyze] Claude scoring failed, using mock:", err);
    return evaluateMock(events, mood);
  }
}

async function scoreWithClaude(
  events: ActivityEvent[],
  mood: MoodSession,
  apiKey: string
): Promise<ScoreResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // Force the structured tool so we always get a parseable score in one shot. (No thinking
    // here — this is a fast, single-shot judgment, and forcing a tool keeps latency low.)
    tool_choice: { type: "tool", name: "report_productivity_score" },
    tools: [
      {
        name: "report_productivity_score",
        description:
          "Report the productivity score for this activity window, following the GrowFlow " +
          "rules: short breaks are fine and must NOT be penalized; only long continuous " +
          "unproductive stretches hurt. Mood adjusts leniency (vacation = lenient, " +
          "locked-in = strict, finishing work = strict but fair).",
        input_schema: {
          type: "object",
          properties: {
            score: {
              type: "integer",
              description: "Overall productivity from 0 (pure doomscrolling) to 100 (deep work).",
            },
            classification: {
              type: "string",
              enum: ["deep_work", "productive", "neutral", "distracted", "doomscrolling"],
            },
            delta: {
              type: "integer",
              description: "Plant change: +3 if the window was productive enough, otherwise -1.",
            },
            breaks_ok: {
              type: "boolean",
              description: "True if breaks were reasonable (no long unproductive stretches).",
            },
            advice: {
              type: "string",
              description: "One short, encouraging sentence of advice/congrats/reminder.",
            },
            message_kind: {
              type: "string",
              enum: ["congrats", "advice", "reminder"],
            },
          },
          required: ["score", "classification", "delta", "breaks_ok", "advice", "message_kind"],
        },
      },
    ],
    messages: [{ role: "user", content: buildPrompt(events, mood) }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    // Model didn't call the tool (shouldn't happen with forced tool_choice) — fall back.
    return evaluateMock(events, mood);
  }

  const input = toolUse.input as Record<string, unknown>;
  const score = clampScore(input.score);
  // Trust the threshold, not the model's arithmetic: clamp delta to exactly +3 or -1.
  const delta = score >= 60 ? 3 : -1;

  return {
    score,
    classification: (input.classification as Classification) ?? "neutral",
    delta,
    breaksOk: Boolean(input.breaks_ok),
    rationale: `Claude scored this window ${score}/100 (mood: "${mood.mood}").`,
    advice: String(input.advice ?? "Keep going!"),
    messageKind: (input.message_kind as MessageKind) ?? (delta > 0 ? "congrats" : "advice"),
  };
}

/** Build a compact, Claude-readable summary of the evaluation window. */
function buildPrompt(events: ActivityEvent[], mood: MoodSession): string {
  const now = new Date();
  const byDomain = new Map<string, number>();
  for (const e of events) {
    byDomain.set(e.domain, (byDomain.get(e.domain) ?? 0) + e.durationSeconds);
  }
  const lines = [...byDomain.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([domain, secs]) => `- ${domain}: ${Math.round(secs / 60)} min`)
    .join("\n");

  return [
    "Score this person's recent browser activity for productivity.",
    "",
    `Time: ${now.toLocaleString()} (consider time of day and day of week).`,
    `Mood / goal: "${mood.mood}" — goal: "${mood.goal}".`,
    "",
    "Active time per site:",
    lines || "(no activity)",
    "",
    "Rules: do not penalize short breaks; only penalize long continuous unproductive",
    "stretches. Productive sites include docs editors, Canvas, email, GitHub, and work use",
    "of ChatGPT. Unproductive sites include social and video doomscroll sites. Then call",
    "report_productivity_score.",
  ].join("\n");
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
