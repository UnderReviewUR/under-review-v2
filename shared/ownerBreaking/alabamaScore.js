/**
 * Score Alabama football RSS items for owner-only Web Push.
 * Keep roster / injury / coaching / game-day — drop recruiting fluff.
 */

import { hashAlertId, isFreshPubDate, phraseMatch } from "../transferAlerts/scoreAlert.js";

/** @typedef {import("../transferAlerts/parseRss.js").RawFeedItem} RawFeedItem */

export const ALABAMA_MAX_AGE_MS = 36 * 60 * 60 * 1000;

const ALABAMA_MUST = [
  "alabama",
  "crimson tide",
  "roll tide",
  "nick saban",
  "kalen deboer",
  "deboer",
  "tuscaloosa",
];

/** High-signal lanes — stay current without social. */
const SIGNAL_KEYWORDS = [
  "injury",
  "injured",
  "out for",
  "questionable",
  "doubtful",
  "ruled out",
  "sidelined",
  "surgery",
  "acl",
  "concussion",
  "roster",
  "depth chart",
  "starter",
  "starting",
  "suspended",
  "transfer portal",
  "enters portal",
  "enters the portal",
  "coaching",
  "coach",
  "coordinator",
  "fired",
  "hired",
  "dismissed",
  "game day",
  "gameday",
  "kickoff",
  "inactive",
  "available",
  "cleared",
  "returns",
  "practice",
  "limited",
];

/** Recruiting / aggregate noise — drop unless paired with coaching hire language. */
const NOISE_KEYWORDS = [
  "commits to",
  "commitment",
  "decommit",
  "decommits",
  "offers",
  "offer list",
  "recruiting",
  "247sports",
  "rivals.com",
  "on3",
  "crystal ball",
  "four-star",
  "five-star",
  "3-star",
  "4-star",
  "5-star",
  "class of 20",
  "signing day rankings",
  "nil deal ranking",
];

/**
 * @param {string} hay
 * @param {string[]} needles
 */
function hits(hay, needles) {
  return needles.filter((n) => phraseMatch(hay, n) || hay.includes(n.toLowerCase()));
}

/**
 * @param {RawFeedItem} item
 * @param {{ nowMs?: number }} [opts]
 * @returns {{
 *   id: string,
 *   title: string,
 *   link: string,
 *   pubDate: string | null,
 *   source: string | null,
 *   score: number,
 *   reasons: string[],
 *   priority: 3 | 4,
 * } | null}
 */
export function scoreAlabamaItem(item, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  if (!isFreshPubDate(item.pubDate, nowMs)) return null;
  // isFreshPubDate uses 48h; tighten for Alabama.
  if (item.pubDate) {
    const t = Date.parse(item.pubDate);
    if (Number.isFinite(t) && nowMs - t > ALABAMA_MAX_AGE_MS) return null;
  }

  const hay = `${item.title || ""} ${item.source || ""} ${item.description || ""}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const alabamaHits = hits(hay, ALABAMA_MUST);
  if (!alabamaHits.length) return null;

  const signalHits = hits(hay, SIGNAL_KEYWORDS);
  const noiseHits = hits(hay, NOISE_KEYWORDS);
  const coachingHire =
    /\b(hired|fired|dismissed|named|coordinator)\b/i.test(item.title || "") &&
    /\bcoach/i.test(hay);

  if (noiseHits.length && !signalHits.length && !coachingHire) return null;
  if (!signalHits.length && !coachingHire) return null;

  let score = 3 + Math.min(3, signalHits.length * 0.8);
  if (coachingHire) score += 2;
  if (/\binjury|out for|ruled out|surgery|acl\b/i.test(hay)) score += 1.5;
  if (/\btransfer portal|enters portal\b/i.test(hay)) score += 1.2;
  if (noiseHits.length) score -= 1.5;

  if (score < 4.5) return null;

  /** @type {3 | 4} */
  const priority = score >= 6.5 ? 4 : 3;
  const reasons = [
    `alabama:${alabamaHits.slice(0, 2).join(",")}`,
    signalHits.length ? `signal:${signalHits.slice(0, 3).join(",")}` : null,
    coachingHire ? "coaching" : null,
  ].filter(Boolean);

  return {
    id: hashAlertId(item.guid || item.link || item.title),
    title: String(item.title || "").trim(),
    link: String(item.link || "").trim(),
    pubDate: item.pubDate,
    source: item.source,
    score: Math.round(score * 10) / 10,
    reasons,
    priority,
  };
}

/**
 * @param {RawFeedItem[]} items
 * @param {{ limit?: number, nowMs?: number }} [opts]
 */
export function rankAlabamaAlerts(items, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 3);
  /** @type {Map<string, ReturnType<typeof scoreAlabamaItem>>} */
  const byId = new Map();
  for (const item of items) {
    const scored = scoreAlabamaItem(item, { nowMs: opts.nowMs });
    if (!scored) continue;
    const prev = byId.get(scored.id);
    if (!prev || scored.score > prev.score) byId.set(scored.id, scored);
  }
  return [...byId.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
