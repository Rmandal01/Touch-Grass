/**
 * config.ts (extension)
 * ---------------------
 * Static configuration + the keys used for chrome.storage. No secrets live here — the
 * extension only ever holds a pairing token (issued by the app) and public endpoint URLs.
 */

/** chrome.storage.local keys. */
export const STORAGE_KEYS = {
  /** Pairing token the user pastes from the GrowFlow app; identifies which user to attribute
   *  activity to, without a full OAuth flow inside the extension. */
  pairingToken: "growflow_pairing_token",
  /** Buffered, not-yet-uploaded activity events. */
  pendingEvents: "growflow_pending_events",
};

/**
 * Full URL of the website's activity-ingest endpoint. Empty until the website is deployed.
 *
 * The extension reports activity to the website (the same Next.js app that scores with Claude
 * and updates Supabase), not to Supabase directly. Example values:
 *   http://localhost:3000/api/ingest        (local dev against `npm run dev`)
 *   https://<your-app>.vercel.app/api/ingest (deployed)
 *
 * TODO(backend): set this and add the matching host to "host_permissions" in manifest.json so
 * the service worker is allowed to fetch it. Until then, uploads are skipped (see
 * background.ts) and events are only logged.
 */
export const INGEST_URL = "http://localhost:3000/api/ingest";

/** How often (ms) the service worker samples the active tab / flushes its buffer. */
export const SAMPLE_INTERVAL_MS = 15_000;

/** Idle threshold (seconds) after which we stop counting time as "active". */
export const IDLE_THRESHOLD_SECONDS = 60;
