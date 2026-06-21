/**
 * categorize.ts
 * -------------
 * A tiny domain -> category classifier. Real events from the Chrome extension arrive without
 * a category (it only knows the domain), so we tag them here before scoring. This makes the
 * local mock scorer work on real browsing, and gives Claude a head start (it can still
 * re-judge). Keep the lists short and obvious — Claude handles the long tail.
 *
 * Depends on: lib/types.ts.
 */

import type { ActivityEvent } from "./types";

const PRODUCTIVE = [
  "docs.google.com",
  "sheets.google.com",
  "slides.google.com",
  "drive.google.com",
  "mail.google.com",
  "office.com",
  "officeapps.live.com",
  "canvas",
  "instructure.com",
  "github.com",
  "gitlab.com",
  "stackoverflow.com",
  "notion.so",
  "overleaf.com",
];

const UNPRODUCTIVE = [
  "youtube.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "netflix.com",
  "twitch.tv",
  "pinterest.com",
];

/** Classify a single hostname. Substring match so subdomains (e.g. bgsu.instructure.com) hit. */
export function categorizeDomain(domain: string): NonNullable<ActivityEvent["category"]> {
  const d = domain.toLowerCase();
  if (PRODUCTIVE.some((p) => d.includes(p))) return "productive";
  if (UNPRODUCTIVE.some((u) => d.includes(u))) return "unproductive";
  return "neutral";
}

/** Return a copy of the events with a category filled in where missing. */
export function tagEvents(events: ActivityEvent[]): ActivityEvent[] {
  return events.map((e) => ({
    ...e,
    category: e.category ?? categorizeDomain(e.domain),
  }));
}
