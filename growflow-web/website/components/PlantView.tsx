/**
 * PlantView.tsx
 * -------------
 * Renders the plant and its growth meter, and plays the grow/wilt/death animation.
 *
 * Today the "art" is a per-stage emoji (see STAGE_EMOJI). When real assets arrive (Rive /
 * video / sprites), only this component swaps its inner visual — the inputs (plant + the
 * transition to animate) stay identical, so nothing else changes.
 *
 * Props:
 *   - plant: the current Plant (stage + growthPoints + isDead)
 *   - transition: which animation to play ("grow" | "wilt" | "death" | "none")
 *   - animationKey: bump this to retrigger the CSS animation on each evaluation
 *
 * Depends on: lib/types.ts, lib/plant.ts.
 */

import type { Plant, Transition } from "@/lib/types";
import { MAX_GROWTH, STAGE_EMOJI } from "@/lib/plant";

interface PlantViewProps {
  plant: Plant;
  transition: Transition;
  animationKey: number;
}

export default function PlantView({ plant, transition, animationKey }: PlantViewProps) {
  const pct = Math.round((plant.growthPoints / MAX_GROWTH) * 100);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* The "pot" — a rounded card the plant sits in. */}
      <div className="flex h-56 w-56 items-end justify-center rounded-3xl bg-moss-100 ring-1 ring-moss-300/60 shadow-inner">
        {/* `key` forces React to remount the span so the animation replays every evaluation. */}
        <span
          key={animationKey}
          className="gf-anim mb-6 select-none text-8xl"
          data-transition={transition}
          role="img"
          aria-label={plant.stage}
        >
          {STAGE_EMOJI[plant.stage]}
        </span>
      </div>

      {/* Stage label. */}
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-moss-500">Stage</p>
        <p className="text-xl font-semibold capitalize text-moss-900">{plant.stage}</p>
      </div>

      {/* Growth meter (0–100). */}
      <div className="w-full max-w-xs">
        <div className="mb-1 flex justify-between text-xs text-moss-700">
          <span>Growth</span>
          <span>{plant.growthPoints}/100</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-moss-100">
          <div
            className="h-full rounded-full bg-moss-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
