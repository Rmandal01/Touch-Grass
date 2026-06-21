/**
 * MoodInput.tsx
 * -------------
 * Captures the user's current mood/goal/task. This is a real input Claude factors into
 * scoring (e.g. "vacation" makes the scorer lenient; "locked-in" makes it strict). For the
 * demo it feeds the local heuristic in lib/analysis.ts.
 *
 * Props:
 *   - value: the current MoodSession
 *   - onChange: callback with the updated MoodSession
 *
 * Depends on: lib/types.ts.
 */

import type { MoodSession } from "@/lib/types";

interface MoodInputProps {
  value: MoodSession;
  onChange: (next: MoodSession) => void;
}

/** Quick-pick moods; the user can also type a custom one. */
const MOOD_PRESETS = ["locked-in", "finishing work", "vacation"];

export default function MoodInput({ value, onChange }: MoodInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-moss-700">Mood / mode</label>
        <div className="flex flex-wrap gap-2">
          {MOOD_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, mood: m })}
              className={[
                "rounded-full px-3 py-1 text-sm transition",
                value.mood === m
                  ? "bg-moss-500 text-white"
                  : "bg-moss-100 text-moss-700 hover:bg-moss-300/50",
              ].join(" ")}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-moss-700">
          Today&apos;s goal / task
        </label>
        <input
          type="text"
          value={value.goal}
          onChange={(e) => onChange({ ...value, goal: e.target.value })}
          placeholder="e.g. Finish the lab report"
          className="w-full rounded-lg border border-moss-300/70 bg-white px-3 py-2 text-moss-900 outline-none focus:border-moss-500 focus:ring-2 focus:ring-moss-300"
        />
      </div>
    </div>
  );
}
