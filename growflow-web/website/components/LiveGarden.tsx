/**
 * LiveGarden.tsx
 * --------------
 * Shows the REAL, Supabase-backed plant that the Chrome extension drives. It polls
 * /api/plant every few seconds; when the points change (because the extension reported a tab
 * switch and the server auto-scored it), it animates the plant grow/wilt and shows the latest
 * score + advice. A small mood picker pushes to /api/mood so the server's auto-scoring
 * respects vacation/locked-in/etc.
 *
 * Single-user demo: the pairing token is fixed to "demo" (matches the seed in schema.sql and
 * the code you enter in the extension popup).
 *
 * Depends on: components/PlantView, lib/types, lib/plant.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PlantView from "@/components/PlantView";
import { stageForGrowth } from "@/lib/plant";
import type { Plant, Transition } from "@/lib/types";

const DEMO_TOKEN = "demo";
const POLL_MS = 4000;
const MOODS = ["locked-in", "finishing work", "vacation"];

interface PlantResponse {
  connected: boolean;
  plant: Plant | null;
  mood?: { mood: string; goal: string };
  lastScore?: { score: number; classification: string; advice: string } | null;
}

export default function LiveGarden() {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [mood, setMoodState] = useState<string>("locked-in");
  const [lastScore, setLastScore] = useState<PlantResponse["lastScore"]>(null);
  const [transition, setTransition] = useState<Transition>("none");
  const [animKey, setAnimKey] = useState(0);
  const [status, setStatus] = useState<string>("Connecting…");
  const prevGrowth = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/plant?token=${DEMO_TOKEN}`, { cache: "no-store" });
      const data = (await res.json()) as PlantResponse;

      if (!data.connected) {
        setStatus("Supabase not configured — add keys to .env.local and restart.");
        return;
      }
      if (!data.plant) {
        setStatus("No plant found — did you run schema.sql in Supabase?");
        return;
      }

      setStatus("");
      if (data.mood?.mood) setMoodState(data.mood.mood);
      setLastScore(data.lastScore ?? null);

      // Detect a change in points and animate the right transition.
      const g = data.plant.growthPoints;
      const prev = prevGrowth.current;
      if (prev !== null && g !== prev) {
        setTransition(data.plant.isDead ? "death" : g > prev ? "grow" : "wilt");
        setAnimKey((k) => k + 1);
      }
      prevGrowth.current = g;
      setPlant(data.plant);
    } catch {
      setStatus("Couldn't reach the server.");
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  async function setMood(next: string) {
    setMoodState(next);
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: DEMO_TOKEN, mood: next }),
    });
  }

  // Fall back to a seed-looking plant while loading so the layout doesn't jump.
  const shown: Plant =
    plant ?? { plantType: "succulent", growthPoints: 20, stage: stageForGrowth(20), isDead: false };

  return (
    <section className="rounded-2xl border border-moss-500/40 bg-moss-50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-moss-900">Your live garden</h2>
          <p className="text-xs text-moss-700">
            Driven by your browser via the GrowFlow extension. Points update automatically.
          </p>
        </div>
        <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-medium text-moss-700">
          live
        </span>
      </div>

      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
        <div className="flex justify-center">
          <PlantView plant={shown} transition={transition} animationKey={animKey} />
        </div>

        <div className="flex flex-col gap-3">
          {status ? (
            <p className="text-sm text-soil-500">{status}</p>
          ) : (
            <>
              <div>
                <p className="mb-1 text-xs font-medium text-moss-700">Mood (affects scoring)</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(m)}
                      className={[
                        "rounded-full px-3 py-1 text-sm transition",
                        mood === m
                          ? "bg-moss-500 text-white"
                          : "bg-moss-100 text-moss-700 hover:bg-moss-300/50",
                      ].join(" ")}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {lastScore ? (
                <div className="rounded-xl border border-moss-300/60 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-moss-500">Last score</p>
                  <p className="text-2xl font-bold text-moss-700">{lastScore.score}</p>
                  <p className="text-sm capitalize text-moss-700">
                    {lastScore.classification?.replace("_", " ")}
                  </p>
                  <p className="mt-1 text-sm text-moss-900">{lastScore.advice}</p>
                </div>
              ) : (
                <p className="text-sm text-moss-500">
                  Browse with the extension paired (code: <b>demo</b>), then switch tabs — your
                  plant reacts here automatically.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
