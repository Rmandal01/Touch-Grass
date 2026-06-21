/**
 * popup.ts
 * --------
 * Logic for the extension popup. Lets the user paste the pairing code from the GrowFlow app
 * (saved to chrome.storage.local) and shows the current connection/tracking status.
 *
 * Depends on: src/config.ts.
 */

import { STORAGE_KEYS, INGEST_URL } from "./config";
import type { ActivityEvent } from "./types";

const codeInput = document.getElementById("code") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

// Prefill the input and render status when the popup opens.
void refresh();

saveButton.addEventListener("click", async () => {
  const token = codeInput.value.trim();
  await chrome.storage.local.set({ [STORAGE_KEYS.pairingToken]: token });
  await refresh();
});

/** Read current state from storage and render a short status line. */
async function refresh(): Promise<void> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.pairingToken,
    STORAGE_KEYS.pendingEvents,
    STORAGE_KEYS.lastResult,
  ]);
  const token = (data[STORAGE_KEYS.pairingToken] as string | undefined) ?? "";
  const pending = (data[STORAGE_KEYS.pendingEvents] as ActivityEvent[] | undefined) ?? [];
  const last = data[STORAGE_KEYS.lastResult] as
    | { delta: number; classification?: string; score?: number }
    | undefined;

  codeInput.value = token;

  const connected = Boolean(token);
  const uploadReady = Boolean(token && INGEST_URL);

  // Spell out exactly why upload is off, so it's obvious what to fix.
  let uploadStatus: string;
  if (uploadReady) uploadStatus = "ready";
  else if (!INGEST_URL) uploadStatus = "off — no INGEST_URL (rebuild + reload extension)";
  else uploadStatus = "off — enter a pairing code above";

  const lastLine = last
    ? `Last: <b style="color:${last.delta > 0 ? "#3a6b32" : "#c0492f"}">${
        last.delta > 0 ? "+" : ""
      }${last.delta}</b>${last.classification ? ` (${last.classification.replace("_", " ")})` : ""}`
    : "";

  statusEl.innerHTML = [
    `Paired: <b>${connected ? "yes" : "no"}</b>`,
    `Buffered events: <b>${pending.length}</b>`,
    `Upload: <b>${uploadStatus}</b>`,
    lastLine,
  ]
    .filter(Boolean)
    .join("<br/>");
}
