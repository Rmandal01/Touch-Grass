/**
 * ScenarioPicker.tsx
 * ------------------
 * Lets the user choose which seeded activity scenario to evaluate. This is a demo affordance:
 * it stands in for "what the user actually did in the browser" until the Chrome extension is
 * feeding real activity_events. The three scenarios reliably produce grow / wilt outcomes.
 *
 * Props:
 *   - selected: the current scenario id
 *   - onSelect: callback when the user picks a scenario
 *
 * Depends on: lib/mockData.ts.
 */

import { SCENARIO_LIST, type ScenarioId } from "@/lib/mockData";

interface ScenarioPickerProps {
  selected: ScenarioId;
  onSelect: (id: ScenarioId) => void;
}

export default function ScenarioPicker({ selected, onSelect }: ScenarioPickerProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-moss-700">Activity scenario (demo data)</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SCENARIO_LIST.map((s) => {
          const active = s.id === selected;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={[
                "rounded-xl border p-3 text-left transition",
                active
                  ? "border-moss-500 bg-moss-50 ring-2 ring-moss-300"
                  : "border-moss-300/60 bg-white hover:border-moss-500",
              ].join(" ")}
            >
              <span className="block font-semibold text-moss-900">{s.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-moss-700">
                {s.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
