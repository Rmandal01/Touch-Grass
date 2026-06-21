/**
 * plant.ts
 * --------
 * The plant growth model — the one piece of "game logic" that is fully real today (it does
 * not depend on the backend). Given a current plant and an evaluation delta, it computes the
 * new growth points, the visible stage, and which animation transition to play.
 *
 * Scoring rules (from the product spec):
 *   - A productive evaluation grows the plant by +3.
 *   - An unproductive evaluation decays it by -1.
 *   - growth_points is clamped to [0, 100].
 *   - The plant dies at 0; planting / onboarding resets it to START_GROWTH.
 *
 * Depends on: lib/types.ts.
 */

import type { Plant, PlantStage, PlantType, Transition } from "./types";

/** Growth a freshly planted seed starts at. */
export const START_GROWTH = 20;
export const MIN_GROWTH = 0;
export const MAX_GROWTH = 100;

/**
 * Map a growth-points value (0–100) to a visible stage. Buckets come straight from the plan:
 *   0 dead | 1–15 wilting | 16–30 sprout | 31–50 seedling | 51–70 young |
 *   71–90 mature | 91–100 flowering.
 */
export function stageForGrowth(growthPoints: number): PlantStage {
  const g = clampGrowth(growthPoints);
  if (g <= 0) return "dead";
  if (g <= 15) return "wilting";
  if (g <= 30) return "sprout";
  if (g <= 50) return "seedling";
  if (g <= 70) return "young";
  if (g <= 90) return "mature";
  return "flowering";
}

/** Keep growth within the valid range. */
export function clampGrowth(growthPoints: number): number {
  return Math.max(MIN_GROWTH, Math.min(MAX_GROWTH, Math.round(growthPoints)));
}

/**
 * Apply an evaluation delta to a plant and return the updated plant plus the transition the
 * UI should animate. This is a pure function — no side effects — so it is trivial to test
 * and reason about.
 */
export function applyDelta(
  plant: Plant,
  delta: number
): { plant: Plant; transition: Transition } {
  // A dead plant stays dead until it is explicitly replanted (see plantSeed).
  if (plant.isDead) {
    return { plant, transition: "none" };
  }

  const newGrowth = clampGrowth(plant.growthPoints + delta);
  const newStage = stageForGrowth(newGrowth);
  const isDead = newGrowth <= MIN_GROWTH;

  // Decide which animation to play.
  let transition: Transition;
  if (isDead) {
    transition = "death";
  } else if (delta > 0) {
    transition = "grow";
  } else if (delta < 0) {
    transition = "wilt";
  } else {
    transition = "none";
  }

  return {
    plant: {
      ...plant,
      growthPoints: newGrowth,
      stage: newStage,
      isDead,
    },
    transition,
  };
}

/** Create a fresh, newly planted seed of the given look. */
export function plantSeed(plantType: PlantType): Plant {
  return {
    plantType,
    growthPoints: START_GROWTH,
    stage: stageForGrowth(START_GROWTH),
    isDead: false,
  };
}

/**
 * A small emoji-based stand-in for the real plant art. The team will supply Rive / video /
 * sprite assets later; until then this gives each stage a recognizable visual so we can
 * demo the grow/wilt/death flow. Swapping in real assets means changing only this map (and
 * the PlantView component), never the growth logic above.
 */
export const STAGE_EMOJI: Record<PlantStage, string> = {
  dead: "🥀",
  wilting: "🍂",
  sprout: "🌱",
  seedling: "🌿",
  young: "☘️",
  mature: "🪴",
  flowering: "🌻",
};
