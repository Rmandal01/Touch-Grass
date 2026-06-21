/**
 * types.ts (extension)
 * --------------------
 * Local types for the extension. Kept self-contained (the extension is an independent build,
 * so it does not import from the website). ActivityEvent matches the shape the website and
 * the future ingest-activity Edge Function expect, so the upload payload will line up.
 */

/** A browser-activity event captured from the active tab. */
export interface ActivityEvent {
  source: "chrome";
  domain: string;
  url: string;
  title: string;
  startedAt: string; // ISO timestamp
  durationSeconds: number;
  isActive: boolean;
}
