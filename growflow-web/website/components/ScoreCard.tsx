/**
 * ScoreCard.tsx
 * -------------
 * Shows the result of the most recent evaluation: the 0–100 score, classification, the
 * growth delta applied, and whether breaks were OK. Purely presentational.
 *
 * Props:
 *   - score: the latest ScoreResult, or null if nothing has been evaluated yet
 *
 * Depends on: lib/types.ts.
 */

import type { ScoreResult } from "@/lib/types";

interface ScoreCardProps {
  score: ScoreResult | null;
}

/** Color the score ring by band so it reads at a glance. */
function scoreColor(score: number): string {
  if (score >= 60) return "text-moss-700";
  if (score >= 40) return "text-bloom-500";
  return "text-soil-500";
}

export default function ScoreCard({ score }: ScoreCardProps) {
  if (!score) {
    return (
      <div className="rounded-xl border border-dashed border-moss-300 p-4 text-center text-sm text-moss-500">
        Press &ldquo;Evaluate now&rdquo; to score your activity.
      </div>
    );
  }

  const deltaLabel = score.delta > 0 ? `+${score.delta}` : `${score.delta}`;

  return (
    <div className="rounded-xl border border-moss-300/60 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-moss-500">Productivity score</p>
          <p className={`text-4xl font-bold ${scoreColor(score.score)}`}>{score.score}</p>
        </div>
        <div className="text-right">
          <span className="inline-block rounded-full bg-moss-100 px-3 py-1 text-sm font-medium capitalize text-moss-700">
            {score.classification.replace("_", " ")}
          </span>
          <p className="mt-2 text-sm text-moss-700">
            Plant{" "}
            <span className={score.delta > 0 ? "text-moss-700" : "text-soil-500"}>
              {deltaLabel}
            </span>{" "}
            growth
          </p>
        </div>
      </div>

      <p className="mt-3 border-t border-moss-100 pt-3 text-sm text-moss-700">
        {score.rationale}
      </p>
      <p className="mt-1 text-xs text-moss-500">
        Breaks: {score.breaksOk ? "fine — no long distraction stretches" : "long distraction stretches penalized"}
      </p>
    </div>
  );
}
