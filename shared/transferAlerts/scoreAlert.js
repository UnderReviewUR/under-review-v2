/**
 * Score + gate raw feed items for Ornstein-class transfer bounce alerts.
 */

import {
  BARCA_KEYWORDS,
  LEGIT_OUTLET_KEYWORDS,
  SOFT_TRANSFER_KEYWORDS,
  TOP_CLUB_KEYWORDS,
  TRANSFER_KEYWORDS,
  TRUSTED_REPORTERS,
} from "./reporters.js";

/**
 * @typedef {import("./parseRss.js").RawFeedItem} RawFeedItem
 * @typedef {{
 *   id: string,
 *   title: string,
 *   link: string,
 *   pubDate: string | null,
 *   source: string | null,
 *   description: string,
 *   feedId: string,
 *   feedLabel: string,
 *   score: number,
 *   barca: boolean,
 *   reporters: string[],
 *   tier: number | null,
 *   reasons: string[],
 *   priority: 3 | 4 | 5,
 * }} ScoredAlert
 */

/** Drop archive / evergreen noise from Google News (ms). */
export const MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * @param {string} text
 * @returns {string}
 */
function norm(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} hay
 * @param {string} needle
 * @returns {boolean}
 */
export function phraseMatch(hay, needle) {
  const n = norm(needle);
  if (!n) return false;
  if (n.includes(" ")) return hay.includes(n);
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(n)}(?:[^a-z0-9]|$)`, "i");
  return re.test(hay);
}

/**
 * @param {string} hay
 * @param {string[]} needles
 * @returns {string[]}
 */
function matchesAny(hay, needles) {
  const hits = [];
  for (const n of needles) {
    if (phraseMatch(hay, n)) hits.push(n);
  }
  return hits;
}

/**
 * Prefer title+source for keyword evidence; descriptions carry related-story noise.
 * @param {RawFeedItem} item
 */
function titleBlob(item) {
  return norm([item.title, item.source].join(" \n "));
}

/**
 * @param {string | null} pubDate
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isFreshPubDate(pubDate, nowMs = Date.now()) {
  if (!pubDate) return true; // keep undated BBC/Sky items; Google usually has dates
  const t = Date.parse(pubDate);
  if (!Number.isFinite(t)) return true;
  return nowMs - t <= MAX_AGE_MS;
}

/**
 * @param {RawFeedItem} item
 * @param {{ nowMs?: number }} [opts]
 * @returns {ScoredAlert | null}
 */
export function scoreTransferItem(item, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  if (!isFreshPubDate(item.pubDate, nowMs)) return null;

  const titleHay = titleBlob(item);
  const fullHay = norm(
    [item.title, item.source, item.description, item.feedLabel].join(" \n "),
  );
  const reasons = [];
  let score = 0;

  const strongHits = matchesAny(titleHay, TRANSFER_KEYWORDS);
  const softHits = matchesAny(titleHay, SOFT_TRANSFER_KEYWORDS);
  // Fallback: strong transfer words in description only when title is thin.
  const strongInFull =
    strongHits.length === 0 ? matchesAny(fullHay, TRANSFER_KEYWORDS) : [];
  const transferHits = strongHits.length
    ? strongHits
    : strongInFull.length
      ? strongInFull
      : softHits;

  const hasStrongTransfer = strongHits.length > 0 || strongInFull.length > 0;
  const hasSoftTransfer = softHits.length > 0;

  if (hasStrongTransfer) {
    score += 2.8 + Math.min(2, transferHits.length * 0.35);
    reasons.push(`transfer:${transferHits.slice(0, 3).join(",")}`);
  } else if (hasSoftTransfer) {
    score += 1.2;
    reasons.push(`soft:${softHits.slice(0, 2).join(",")}`);
  } else if (item.barcaHeavyFeed) {
    score += 0.3;
  }

  /** @type {string[]} */
  const reporters = [];
  let bestTier = null;
  let barcaReporter = false;

  for (const r of TRUSTED_REPORTERS) {
    // Bylines in title/source only — description often lists related reporters.
    const nameHit = r.names.some((n) => phraseMatch(titleHay, n));
    if (!nameHit) continue;

    reporters.push(r.id);
    const tierBoost = r.tier === 1 ? 5.5 : r.tier === 2 ? 3.5 : 2.2;
    score += tierBoost;
    reasons.push(`reporter:${r.id}`);
    if (bestTier == null || r.tier < bestTier) bestTier = r.tier;
    if (r.barca) barcaReporter = true;
  }

  const barcaHits = matchesAny(titleHay, BARCA_KEYWORDS);
  const barca = barcaHits.length > 0;
  if (barcaHits.length) {
    score += 3.5 + Math.min(1.5, barcaHits.length * 0.25);
    reasons.push(`barca:${barcaHits.slice(0, 2).join(",")}`);
    if (barcaReporter) score += 0.6;
  } else if (item.barcaHeavyFeed) {
    score += 0.4;
  }

  const clubHits = matchesAny(titleHay, TOP_CLUB_KEYWORDS);
  if (clubHits.length) {
    score += 1.2 + Math.min(1.2, clubHits.length * 0.2);
    reasons.push(`club:${clubHits.slice(0, 2).join(",")}`);
  }

  score *= Number(item.feedWeight) > 0 ? Number(item.feedWeight) : 1;

  const hasReporter = reporters.length > 0;
  const legitOutlet = matchesAny(titleHay, LEGIT_OUTLET_KEYWORDS).length > 0
    || ["bbc_football", "guardian_football", "sky_transfer"].includes(item.feedId);

  // Soft-only transfer language requires a trusted byline.
  if (!hasStrongTransfer && !(hasSoftTransfer && hasReporter)) return null;
  if (!hasReporter && !legitOutlet) return null;
  if (!hasReporter && !barca && clubHits.length === 0) return null;

  const minScore = hasReporter ? 4.5 : barca ? 7.5 : 8.5;
  if (score < minScore) return null;

  /** @type {3 | 4 | 5} */
  let priority = 3;
  if (barca && (bestTier === 1 || bestTier === 2)) priority = 5;
  else if (bestTier === 1 || (barca && hasStrongTransfer)) priority = 4;
  else if (hasReporter) priority = 4;

  const id = hashAlertId(item.guid || item.link || item.title);

  return {
    id,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: item.source,
    description: item.description,
    feedId: item.feedId,
    feedLabel: item.feedLabel,
    score: Math.round(score * 10) / 10,
    barca,
    reporters,
    tier: bestTier,
    reasons,
    priority,
  };
}

/**
 * @param {string} seed
 * @returns {string}
 */
export function hashAlertId(seed) {
  const s = String(seed || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ta_${(h >>> 0).toString(16)}`;
}

/**
 * @param {RawFeedItem[]} items
 * @param {{ limit?: number, nowMs?: number }} [opts]
 * @returns {ScoredAlert[]}
 */
export function rankTransferAlerts(items, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 8);
  /** @type {Map<string, ScoredAlert>} */
  const byId = new Map();

  for (const item of items) {
    const scored = scoreTransferItem(item, { nowMs: opts.nowMs });
    if (!scored) continue;
    const prev = byId.get(scored.id);
    if (!prev || scored.score > prev.score) byId.set(scored.id, scored);
  }

  return [...byId.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.barca !== b.barca) return a.barca ? -1 : 1;
      return (a.tier || 9) - (b.tier || 9);
    })
    .slice(0, limit);
}
