/**
 * Score + gate raw feed items for Ornstein-class transfer bounce alerts.
 */

import { cleanWireText } from "./formatSpoiler.js";
import {
  BARCA_KEYWORDS,
  BUNDESLIGA_KEYWORDS,
  LA_LIGA_KEYWORDS,
  LEGIT_OUTLET_KEYWORDS,
  LIGUE_1_KEYWORDS,
  PREMIER_LEAGUE_KEYWORDS,
  SERIE_A_KEYWORDS,
  SOFT_TRANSFER_KEYWORDS,
  TOP_CLUB_KEYWORDS,
  TRANSFER_KEYWORDS,
  TRUSTED_REPORTERS,
  UCL_KEYWORDS,
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
   *   laLiga: boolean,
   *   europe: boolean,
   *   reporters: string[],
 *   tier: number | null,
 *   reasons: string[],
 *   priority: 3 | 4 | 5,
 *   native?: boolean,
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
 * Drop Romano reply-guy / YouTube promo posts that aren't wires.
 * @param {string} title
 * @returns {boolean}
 */
export function isNativeNoise(title) {
  const t = String(title || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]+/gu, " ")
    .replace(/^[↩️🖼\s]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length < 18) return true;
  if (/^@\w/.test(t)) return true;
  if (/^RT\s+@/i.test(t)) return true;
  if (/youtube video uploaded/i.test(t)) return true;
  if (/new youtube video/i.test(t)) return true;
  return false;
}

/**
 * @param {RawFeedItem} item
 * @param {{ nowMs?: number }} [opts]
 * @returns {ScoredAlert | null}
 */
export function scoreTransferItem(item, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  if (!isFreshPubDate(item.pubDate, nowMs)) return null;
  if (item.native && isNativeNoise(item.title)) return null;

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
    const feedHit = item.reporterId === r.id;
    if (!nameHit && !feedHit) continue;
    if (reporters.includes(r.id)) continue;

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

  const laLigaHits = matchesAny(titleHay, LA_LIGA_KEYWORDS);
  const laLiga = barca || laLigaHits.length > 0;
  if (!barca && laLigaHits.length) {
    score += 3.2 + Math.min(1, laLigaHits.length * 0.2);
    reasons.push(`laliga:${laLigaHits.slice(0, 2).join(",")}`);
  }

  const pl = matchesAny(titleHay, PREMIER_LEAGUE_KEYWORDS).length > 0;
  const serieA = matchesAny(titleHay, SERIE_A_KEYWORDS).length > 0;
  const bundes = matchesAny(titleHay, BUNDESLIGA_KEYWORDS).length > 0;
  const ligue1 = matchesAny(titleHay, LIGUE_1_KEYWORDS).length > 0;
  const ucl = matchesAny(titleHay, UCL_KEYWORDS).length > 0;
  const europe = serieA || bundes || ligue1 || ucl;
  if (!barca && !laLiga && europe) {
    score += 1.4 + (ucl ? 0.3 : 0);
    reasons.push(`europe:${[serieA && "seriea", bundes && "bundes", ligue1 && "ligue1", ucl && "ucl"].filter(Boolean).join(",")}`);
  }

  const clubHits = matchesAny(titleHay, TOP_CLUB_KEYWORDS);
  if (clubHits.length) {
    score += 1.2 + Math.min(1.2, clubHits.length * 0.2);
    reasons.push(`club:${clubHits.slice(0, 2).join(",")}`);
  }

  if (item.native) {
    score += 0.8;
    reasons.push("native");
  }

  score *= Number(item.feedWeight) > 0 ? Number(item.feedWeight) : 1;

  const hasReporter = reporters.length > 0;
  const legitOutlet = matchesAny(titleHay, LEGIT_OUTLET_KEYWORDS).length > 0
    || ["bbc_football", "guardian_football", "sky_transfer"].includes(item.feedId);

  // Soft-only transfer language requires a trusted byline.
  if (!hasStrongTransfer && !(hasSoftTransfer && hasReporter)) return null;
  if (!hasReporter && !legitOutlet) return null;
  if (!hasReporter && !barca && !laLiga && clubHits.length === 0) return null;
  // Mix of rumor + close: other-league gossip without a byline needs a real transfer verb.
  if (!hasReporter && !barca && !laLiga && !pl && europe && !hasStrongTransfer) return null;

  const minScore = hasReporter ? 4.5 : barca ? 7.5 : laLiga ? 6.5 : europe ? 7.0 : 8.5;
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
    laLiga,
    europe,
    reporters,
    tier: bestTier,
    reasons,
    priority,
    native: Boolean(item.native),
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
 * Collapse the same wire (X + Telegram + Google rewrite) into one banner.
 * @param {ScoredAlert} alert
 * @returns {string}
 */
export function storyFingerprint(alert) {
  const who = alert.reporters?.[0] || "wire";
  const blob = cleanWireText(`${alert.title || ""} ${alert.description || ""}`);
  const skipLast = new Set([
    "breaking",
    "exclusive",
    "confirmed",
    "official",
    "granted",
    "permission",
    "offered",
    "holding",
    "agreement",
    "personal",
    "subject",
    "england",
    "spanish",
    "spaniard",
    "argentine",
    "argentina",
    "frankfurt",
    "herewego",
    "google",
    "news",
    "athletic",
    "chelsea",
    "arsenal",
    "liverpool",
    "tottenham",
    "newcastle",
    "barcelona",
    "madrid",
    "united",
    "city",
    "villa",
    "wolves",
    "everton",
    "brighton",
    "palace",
    "bayern",
    "juventus",
    "napoli",
    "sevilla",
    "villarreal",
    "betis",
    "valencia",
    "girona",
    "sociedad",
  ]);
  for (const r of TRUSTED_REPORTERS) {
    for (const n of r.names) {
      const last = n.split(/\s+/).pop();
      if (last) skipLast.add(last.toLowerCase());
    }
  }
  const caps = blob.match(/\b[A-Z][a-zà-ÿ]{3,}(?:\s+[A-Z][a-zà-ÿ]{3,})?\b/g) || [];
  const player = caps
    .map((s) => s.toLowerCase())
    .find((name) => {
      const last = name.split(/\s+/).pop() || "";
      return last.length >= 5 && !skipLast.has(last);
    });
  const last = player ? player.split(/\s+/).pop() : "";
  if (!last) return `${who}|id:${alert.id}`;
  return `${who}|${last}`;
}

/**
 * Player key for "one banner unless the story actually changed".
 * @param {ScoredAlert} alert
 */
export function playerStoryKey(alert) {
  const fp = storyFingerprint(alert);
  const last = String(fp).split("|").pop() || "";
  if (!last || last.startsWith("id:")) return `id:${alert.id}`;
  return `p:${last}`;
}

/**
 * Club/fee/done signature so medical-on-the-same-loan does not re-ping.
 * @param {ScoredAlert} alert
 */
export function materialSignature(alert) {
  const blob = cleanWireText(`${alert.title || ""} ${alert.description || ""}`).toLowerCase();
  const feeNums = [...blob.matchAll(/[£€$]([\d.]+)m/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  const fees = feeNums.length ? String(Math.max(...feeNums)) : "";
  const done = /\bhere we go\b|\bsigned\b|\bofficial\b/.test(blob);
  const clubs = matchesAny(norm(blob), TOP_CLUB_KEYWORDS).sort().join(",");
  return `${done ? "done" : "open"}|${fees}|${clubs}`;
}

/**
 * @param {ScoredAlert} alert
 * @param {string | undefined} prevSig
 */
export function isMaterialPlayerUpdate(alert, prevSig) {
  if (!prevSig) return true;
  const next = materialSignature(alert);
  if (next === prevSig) return false;
  const [pDone, pFee, pClubs] = String(prevSig).split("|");
  const [nDone, nFee, nClubs] = next.split("|");
  if (nDone === "done" && pDone !== "done") return true;
  if (nFee && nFee !== pFee) return true;
  if (nClubs && pClubs && nClubs !== pClubs) return true;
  return false;
}

/**
 * @param {ScoredAlert} alert
 * @param {Record<string, unknown>} seen
 */
export function shouldSkipAsRepeat(alert, seen) {
  if (seen[alert.id]) return true;
  const key = playerStoryKey(alert);
  const row = seen[key];
  if (!row || typeof row !== "object") return false;
  return !isMaterialPlayerUpdate(alert, row.sig);
}

/**
 * @param {Record<string, unknown>} seen
 * @param {ScoredAlert} alert
 * @param {number} now
 */
export function markAlertSeen(seen, alert, now) {
  seen[alert.id] = now;
  const key = playerStoryKey(alert);
  if (key.startsWith("p:")) {
    seen[key] = { t: now, sig: materialSignature(alert) };
  }
}

/**
 * @param {string} title
 * @returns {boolean}
 */
export function isBarcaMatchPreview(title) {
  return /\bvs\.?\b|\bprediction\b|\bline-?ups?\b|\blive score\b|\bpre-match\b/i.test(
    String(title || ""),
  );
}

/**
 * @param {RawFeedItem[]} items
 * @param {{ limit?: number, nowMs?: number, barcaReserve?: number }} [opts]
 * @returns {ScoredAlert[]}
 */
export function rankTransferAlerts(items, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 8);
  const barcaReserve = Math.min(limit, Math.max(0, Number(opts.barcaReserve ?? 2)));
  /** @type {Map<string, ScoredAlert>} */
  const byId = new Map();

  for (const item of items) {
    const scored = scoreTransferItem(item, { nowMs: opts.nowMs });
    if (!scored) continue;
    const prev = byId.get(scored.id);
    if (!prev || scored.score > prev.score) byId.set(scored.id, scored);
  }

  /** @type {Map<string, ScoredAlert>} */
  const byStory = new Map();
  for (const scored of byId.values()) {
    const key = storyFingerprint(scored);
    const prev = byStory.get(key);
    if (!prev || scored.score > prev.score) byStory.set(key, scored);
  }

  const sorted = [...byStory.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (Boolean(b.native) !== Boolean(a.native)) return a.native ? -1 : 1;
    if (a.barca !== b.barca) return a.barca ? -1 : 1;
    return (a.tier || 9) - (b.tier || 9);
  });

  const isHeldSpain = (a) =>
    (a.barca || a.laLiga) && !isBarcaMatchPreview(a.title);
  const spain = sorted.filter(isHeldSpain);
  const rest = sorted.filter((a) => !isHeldSpain(a));
  const reserved = spain.slice(0, barcaReserve);
  return [...reserved, ...rest].slice(0, limit);
}
