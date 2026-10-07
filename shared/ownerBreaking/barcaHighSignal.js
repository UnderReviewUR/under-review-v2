/**
 * High-signal gate for Barcelona / Barça transfer bounce.
 * Prefer credible bylines + first-team relevance; drop aggregate rumor mill.
 * Kept separate from scoreAlert.js to avoid circular imports.
 */

import { TRANSFER_KEYWORDS, TRUSTED_REPORTERS } from "../transferAlerts/reporters.js";

/** Soft gossip without a real wire — usually aggregate pings. */
const WEAK_RUMOR = [
  "linked with",
  "linked to",
  "could sign",
  "could join",
  "interested in",
  "monitoring",
  "keeping tabs",
  "admire",
  "admiring",
  "want to sign",
  "eyeing",
  "set sights",
];

/** Topic-label transfer blurbs with no player + club substance. */
const VAGUE_TRANSFER_TOPIC =
  /\btransfer\s+(?:buzz|news|round-?ups?|rumou?rs?|latest|updates?|gossip)\b|\b(?:latest|top)\s+transfer\s+(?:news|rumou?rs?|updates?)\b|\blinked with\s+(?:a |an )?(?:premier league |la liga |serie a )?(?:midfielder|winger|striker|forward|defender|goalkeeper)\b/i;

const TRANSFER_NAME_STOP = new Set([
  "barcelona",
  "barça",
  "real",
  "madrid",
  "manchester",
  "united",
  "city",
  "arsenal",
  "liverpool",
  "chelsea",
  "tottenham",
  "newcastle",
  "premier",
  "league",
  "la",
  "liga",
  "serie",
  "bundesliga",
  "google",
  "news",
  "athletic",
  "sky",
  "sports",
  "transfer",
  "window",
]);

/**
 * @param {string} title
 */
export function isVagueTransferTopic(title) {
  const t = String(title || "").trim();
  if (!t) return true;
  if (!VAGUE_TRANSFER_TOPIC.test(t)) return false;
  // Salvage only when a person-like First Last remains (not club/league labels).
  const hits = t.match(/\b[A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+){1,2}\b/g) || [];
  const person = hits.some((hit) => {
    const parts = hit.split(/\s+/);
    return parts.some((p) => !TRANSFER_NAME_STOP.has(p.toLowerCase()));
  });
  return !person;
}

/** Not first-team senior squad relevance. */
const NON_FIRST_TEAM = [
  "barcelona b",
  "barca b",
  "barça b",
  "barça atletic",
  "barcelona atletic",
  "barca atletic",
  "juvenil",
  "la masia",
  "femeni",
  "femení",
  "women's",
  "womens",
  "under-19",
  "under 19",
  "u19",
  "u18",
  "academy",
];

/**
 * @param {string} title
 */
export function isBarcaNonFirstTeam(title) {
  const t = String(title || "").toLowerCase();
  return NON_FIRST_TEAM.some((n) => t.includes(n));
}

/**
 * @param {string} title
 */
export function isBarcaWeakRumorOnly(title) {
  const t = String(title || "").toLowerCase();
  const weak = WEAK_RUMOR.some((n) => t.includes(n));
  if (!weak) return false;
  const strong = TRANSFER_KEYWORDS.some((k) => t.includes(String(k).toLowerCase()));
  return !strong;
}

/**
 * @param {{
 *   barca?: boolean,
 *   title?: string,
 *   reporters?: string[],
 *   tier?: number | null,
 *   score?: number,
 *   reasons?: string[],
 *   feedId?: string,
 * }} alert
 * @returns {{ ok: boolean, reason?: string }}
 */
export function passesBarcaHighSignalGate(alert) {
  if (!alert?.barca) return { ok: true };

  const title = String(alert.title || "");
  if (isBarcaNonFirstTeam(title)) {
    return { ok: false, reason: "non_first_team" };
  }

  const reporters = Array.isArray(alert.reporters) ? alert.reporters : [];
  const tier = alert.tier == null ? null : Number(alert.tier);
  const hasTrustedByline = reporters.some((id) => {
    const r = TRUSTED_REPORTERS.find((x) => x.id === id);
    return r && r.tier <= 2;
  });
  const hasAnyByline = reporters.length > 0;
  const reasons = Array.isArray(alert.reasons) ? alert.reasons.join(" ") : "";
  const hasStrongTransfer = /\btransfer:/.test(reasons);

  // Match / preview noise already handled upstream; keep a belt-and-suspenders drop.
  if (/\bvs\.?\b|\bprediction\b|\bline-?ups?\b|\blive score\b|\bpre-match\b/i.test(title)) {
    return { ok: false, reason: "match_preview" };
  }

  // "Barcelona transfer buzz" / "linked with midfielder" — no who/clubs.
  if (isVagueTransferTopic(title) && !hasTrustedByline) {
    return { ok: false, reason: "vague_transfer_topic" };
  }

  if (isBarcaWeakRumorOnly(title) && !hasTrustedByline) {
    return { ok: false, reason: "weak_rumor" };
  }

  // Tier-1/2 byline (Ornstein, Romano, Benge, Marsden, …) always OK.
  if (hasTrustedByline) return { ok: true };

  // Tier-3 Spanish beat only with strong transfer language + decent score.
  if (hasAnyByline && hasStrongTransfer && Number(alert.score) >= 8) {
    return { ok: true };
  }

  // Legit outlet + strong transfer + high score (BBC/Athletic rewrite of a real wire).
  if (
    hasStrongTransfer &&
    Number(alert.score) >= 9.5 &&
    (tier == null || tier <= 3)
  ) {
    return { ok: true };
  }

  return { ok: false, reason: "low_signal_barca" };
}
