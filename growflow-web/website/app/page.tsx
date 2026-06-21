/**
 * page.tsx
 * --------
 * The GrowFlow garden demo screen — the single page for this slice.
 *
 * It holds the local state (current plant, chosen scenario, mood, last score, the animation
 * to play) and orchestrates the flow:
 *
 *   pick scenario + mood  ->  "Evaluate now"  ->  evaluate() returns a ScoreResult
 *      ->  applyDelta() grows/wilts the plant  ->  PlantView animates the transition
 *      ->  ScoreCard + AdvicePanel show the result (AdvicePanel can speak it)
 *
 * Everything here runs on mock data via lib/analysis.ts; when the backend is configured,
 * evaluate() transparently switches to the live Claude-backed Edge Function.
 *
 * Depends on: lib/* and components/*.
 */

"use client";

import { useState } from "react";
import PlantView from "@/components/PlantView";
import ScenarioPicker from "@/components/ScenarioPicker";
import MoodInput from "@/components/MoodInput";
import ScoreCard from "@/components/ScoreCard";
import AdvicePanel from "@/components/AdvicePanel";
import LiveGarden from "@/components/LiveGarden";
import { applyDelta, plantSeed } from "@/lib/plant";
import { evaluate } from "@/lib/analysis";
import { SCENARIOS, type ScenarioId } from "@/lib/mockData";
import type { ActivityEvent, MoodSession, Plant, ScoreResult, Transition } from "@/lib/types";

export default function Home() {
  // The plant starts as a freshly planted succulent seed (growth 20).
  const [plant, setPlant] = useState<Plant>(() => plantSeed("succulent"));
  const [scenarioId, setScenarioId] = useState<ScenarioId>("locked-in");
  const [mood, setMood] = useState<MoodSession>(SCENARIOS["locked-in"].mood);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [transition, setTransition] = useState<Transition>("none");
  const [animationKey, setAnimationKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [realStatus, setRealStatus] = useState<string | null>(null);

  // When the user switches scenario, prefill its suggested mood (they can still edit it).
  function handleScenario(id: ScenarioId) {
    setScenarioId(id);
    setMood(SCENARIOS[id].mood);
  }

  // Run one evaluation: score the scenario, then grow/wilt the plant and replay the animation.
  async function handleEvaluate() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await evaluate(SCENARIOS[scenarioId].events, mood);
      const { plant: next, transition: t } = applyDelta(plant, result.delta);
      setScore(result);
      setPlant(next);
      setTransition(t);
      setAnimationKey((k) => k + 1); // retrigger the CSS animation
    } finally {
      setBusy(false);
    }
  }

  // Score the REAL browser activity the Chrome extension uploaded (via /api/live), instead
  // of a seeded scenario. Same scoring pipeline, just real events.
  async function handleRealActivity() {
    if (busy) return;
    setBusy(true);
    setRealStatus(null);
    try {
      const res = await fetch("/api/live");
      const data = (await res.json()) as { events: ActivityEvent[]; count: number };
      if (!data.events?.length) {
        setRealStatus(
          "No browser activity yet. Load the extension, enter a pairing code, browse a bit, then try again."
        );
        return;
      }
      const result = await evaluate(data.events, mood);
      const { plant: next, transition: t } = applyDelta(plant, result.delta);
      setScore(result);
      setPlant(next);
      setTransition(t);
      setAnimationKey((k) => k + 1);
      setRealStatus(`Scored ${data.count} real event(s) from your browser.`);
    } catch {
      setRealStatus("Couldn't reach the activity feed. Is the extension uploading?");
    } finally {
      setBusy(false);
    }
  }

  // Start over with a fresh seed.
  function handleReplant() {
    setPlant(plantSeed(plant.plantType));
    setScore(null);
    setTransition("none");
    setAnimationKey((k) => k + 1);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-4xl font-bold text-moss-900">
          Grow<span className="text-moss-500">Flow</span> 🌱
        </h1>
        <p className="mt-2 text-moss-700">
          Productive time grows your plant. Doomscrolling makes it wilt.
        </p>
      </header>

      {/* Live, Supabase-backed garden driven by the Chrome extension. */}
      <LiveGarden />

      {/* Below: the manual scenario demo (local, doesn't touch Supabase). */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: the plant */}
        <section className="flex flex-col items-center justify-center rounded-2xl border border-moss-300/50 bg-white p-8">
          <PlantView plant={plant} transition={transition} animationKey={animationKey} />
          {plant.isDead && (
            <p className="mt-4 text-center text-sm text-soil-500">
              Your plant died. Replant and try a more focused session.
            </p>
          )}
        </section>

        {/* Right: controls + results */}
        <section className="flex flex-col gap-5">
          <ScenarioPicker selected={scenarioId} onSelect={handleScenario} />
          <MoodInput value={mood} onChange={setMood} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={busy}
              className="flex-1 rounded-xl bg-moss-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-moss-700 disabled:opacity-60"
            >
              {busy ? "Evaluating…" : "Evaluate now"}
            </button>
            <button
              type="button"
              onClick={handleReplant}
              className="rounded-xl border border-moss-300 px-4 py-3 font-medium text-moss-700 transition hover:bg-moss-50"
            >
              Replant
            </button>
          </div>

          {/* Real activity: score what the Chrome extension actually captured. */}
          <button
            type="button"
            onClick={handleRealActivity}
            disabled={busy}
            className="rounded-xl border border-moss-500 px-4 py-2.5 text-sm font-medium text-moss-700 transition hover:bg-moss-50 disabled:opacity-60"
          >
            🌐 Use my real browser activity
          </button>
          {realStatus && <p className="-mt-2 text-xs text-moss-500">{realStatus}</p>}

          <ScoreCard score={score} />
          <AdvicePanel score={score} />
        </section>
      </div>

      <footer className="mt-auto pt-6 text-center text-xs text-moss-500">
        Pick a scenario to demo, or use your real browser activity from the GrowFlow
        extension. Scoring runs server-side (Claude when a key is set, mock otherwise).
      </footer>
    </main>
  );
}
