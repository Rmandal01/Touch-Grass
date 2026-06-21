/**
 * LiveGarden.tsx
 * --------------
 * The hub. You type what you're working on and hit Start; that becomes the goal the GrowFlow
 * extension's browsing is judged against. While the task is active, points move automatically
 * as you switch tabs (good sites add, distractions subtract) and the plant grows/wilts here.
 * Finish shows how many points the session earned. The points persist in Supabase, so the
 * Flutter app sees the same plant.
 *
 * Single-user demo: the pairing token is fixed to "demo" (matches schema.sql + the extension
 * popup code).
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

interface TaskInfo {
  task: string;
  active: boolean;
  earned: number;
}

interface PlantResponse {
  connected: boolean;
  plant: Plant | null;
  task?: TaskInfo | null;
  lastScore?: { score: number; classification: string; advice: string } | null;
}

export default function LiveGarden() {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [lastScore, setLastScore] = useState<PlantResponse["lastScore"]>(null);
  const [transition, setTransition] = useState<Transition>("none");
  const [animKey, setAnimKey] = useState(0);
  const [status, setStatus] = useState<string>("Connecting…");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const prevGrowth = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/plant?token=${DEMO_TOKEN}`, { cache: "no-store" });
      const data = (await res.json()) as PlantResponse;

      if (!data.connected) return setStatus("Supabase not configured — add keys + restart.");
      if (!data.plant) return setStatus("No plant found — run schema.sql in Supabase.");

      setStatus("");
      setTask(data.task ?? null);
      setLastScore(data.lastScore ?? null);

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

  async function startTask() {
    if (busy || !input.trim()) return;
    setBusy(true);
    setSummary(null);
    try {
      await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: DEMO_TOKEN, action: "start", task: input.trim() }),
      });
      setInput("");
      await poll();
    } finally {
      setBusy(false);
    }
  }

  async function finishTask() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: DEMO_TOKEN, action: "finish" }),
      });
      const data = (await res.json()) as { earned: number; task: string | null };
      const sign = data.earned >= 0 ? "+" : "";
      setSummary(`"${data.task ?? "Task"}" finished — you earned ${sign}${data.earned} points.`);
      await poll();
    } finally {
      setBusy(false);
    }
  }

  const shown: Plant =
    plant ?? { plantType: "succulent", growthPoints: 20, stage: stageForGrowth(20), isDead: false };
  const active = task?.active;

  return (
    <section className="rounded-2xl border border-moss-500/40 bg-moss-50 p-6">
      {/* Plant + points */}
      <div className="flex flex-col items-center gap-2">
        <PlantView plant={shown} transition={transition} animationKey={animKey} />
      </div>

      {status && <p className="mt-4 text-center text-sm text-soil-500">{status}</p>}

      {!status && (
        <div className="mt-6">
          {active ? (
            // ---- Active task: show goal, live session points, finish ----
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-moss-500">Working on</p>
                <p className="text-lg font-semibold text-moss-900">{task?.task}</p>
              </div>
              <div className="rounded-xl bg-white px-6 py-3 text-center ring-1 ring-moss-300/60">
                <p className="text-xs uppercase tracking-wide text-moss-500">This session</p>
                <p
                  className={[
                    "text-3xl font-bold",
                    (task?.earned ?? 0) >= 0 ? "text-moss-700" : "text-soil-500",
                  ].join(" ")}
                >
                  {(task?.earned ?? 0) >= 0 ? "+" : ""}
                  {task?.earned ?? 0}
                </p>
              </div>
              {lastScore && (
                <p className="max-w-md text-center text-sm text-moss-700">{lastScore.advice}</p>
              )}
              <button
                type="button"
                onClick={finishTask}
                disabled={busy}
                className="rounded-xl border border-moss-500 px-5 py-2.5 font-medium text-moss-700 transition hover:bg-moss-100 disabled:opacity-60"
              >
                Finish task
              </button>
              <p className="text-center text-xs text-moss-500">
                Pair the extension (code: <b>demo</b>) and switch tabs — points move here, and the
                extension badge shows +/- live.
              </p>
            </div>
          ) : (
            // ---- No task: prompt to start ----
            <div className="mx-auto flex max-w-md flex-col gap-3">
              {summary && (
                <p className="rounded-lg bg-moss-100 px-4 py-2 text-center text-sm text-moss-800">
                  {summary}
                </p>
              )}
              <label className="text-sm font-medium text-moss-700">
                What are you working on?
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startTask()}
                placeholder="e.g. Finish the lab report"
                className="rounded-lg border border-moss-300/70 bg-white px-3 py-2 text-moss-900 outline-none focus:border-moss-500 focus:ring-2 focus:ring-moss-300"
              />
              <button
                type="button"
                onClick={startTask}
                disabled={busy || !input.trim()}
                className="rounded-xl bg-moss-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-moss-700 disabled:opacity-60"
              >
                {busy ? "Starting…" : "Start focusing"}
              </button>
              <p className="text-center text-xs text-moss-500">
                Your plant only grows or wilts while a task is running.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
