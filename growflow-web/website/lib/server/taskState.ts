/**
 * lib/server/taskState.ts
 * -----------------------
 * SERVER-ONLY, in-memory record of the user's ACTIVE TASK ("what I'm working on right now").
 * The website starts a task (with a free-text prompt); the extension's activity is then scored
 * relative to that task, and points only move while a task is active. Finishing the task
 * stops scoring and lets us report how many points the session earned.
 *
 * Kept in memory (on globalThis so it's shared across API route bundles) — single-user demo;
 * resets if the dev server restarts. The plant's points themselves live in Supabase.
 *
 * Keyed by pairing token so it lines up with how the extension and website identify the user.
 */

export interface TaskState {
  task: string; // free-text goal, e.g. "finish the lab report"
  mood: string; // leniency hint for scoring; defaults to "locked-in"
  active: boolean;
  startGrowth: number; // plant growth when the task started (to compute session earnings)
  startedAt: string;
}

const store =
  (globalThis as unknown as { __growflowTasks?: Map<string, TaskState> }).__growflowTasks ??
  ((globalThis as unknown as { __growflowTasks?: Map<string, TaskState> }).__growflowTasks =
    new Map<string, TaskState>());

export function startTask(
  token: string,
  task: string,
  mood: string,
  startGrowth: number
): TaskState {
  const state: TaskState = {
    task: task.trim() || "Focus session",
    mood: mood || "locked-in",
    active: true,
    startGrowth,
    startedAt: new Date().toISOString(),
  };
  store.set(token, state);
  return state;
}

export function finishTask(token: string): TaskState | null {
  const state = store.get(token);
  if (!state) return null;
  state.active = false;
  store.set(token, state);
  return state;
}

export function getTask(token: string): TaskState | null {
  return store.get(token) ?? null;
}
