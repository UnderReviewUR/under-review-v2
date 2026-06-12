import { isWcHomePromoWindow } from "../../../shared/wc2026Constants.js";

/**
 * Cyan home feature card during WC promo — visible even when sport prompts are crowded out.
 * @param {number} [nowMs]
 */
export function buildWcHomePromoCard(nowMs = Date.now()) {
  if (!isWcHomePromoWindow(nowMs)) return null;

  return {
    id: "wc-home-promo",
    sportBadge: "WORLD CUP",
    accentColor: "#00F5E9",
    title: "2026 FIFA World Cup",
    tagline: "104 matches · June 11 – July 19",
    trustLine: "Markets may be adjusted after Starting XIs are announced.",
    featureLine: "Live odds, line movement, and sharp splits on every match.",
    matchesCta: "See today's matches",
    highlights: [
      "104 matches from June 11 – July 19",
      "Live in-game odds on every match",
      "Public, sharp, and line movement data",
    ],
    text: "Best group stage value bet?",
    prompt: "What's the best group-stage value bet right now — one pick, direct answer?",
    sportHint: "worldcup",
  };
}

/**
 * Order Try + START HERE during WC promo: WC value → NBA Finals (when active) → WC group angle → rest.
 * @param {Array<Record<string, unknown>>} list
 * @param {number} [nowMs]
 */
export function orderHomeQuestionsForWcPromo(list, nowMs = Date.now()) {
  if (!isWcHomePromoWindow(nowMs) || !Array.isArray(list) || list.length === 0) {
    return list;
  }
  const wcPrimary =
    list.find((p) => p.id === "q-wc-promo") ||
    list.find((p) => String(p?.sportHint || "").toLowerCase() === "worldcup");
  const wcSecondary = list.find((p) => p.id === "q-wc-group-misprice");
  const nbaFinals = list.find((p) => p.id === "q-nba-finals");
  const used = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const ordered = [];
  for (const item of [wcPrimary, nbaFinals, wcSecondary]) {
    if (item?.id && !used.has(item.id)) {
      ordered.push(item);
      used.add(item.id);
    }
  }
  for (const item of list) {
    if (item?.id && !used.has(item.id)) {
      ordered.push(item);
      used.add(item.id);
    }
  }
  return ordered;
}

/** @deprecated use orderHomeQuestionsForWcPromo */
export function ensureWorldCupInHomeQuestions(list, nowMs = Date.now()) {
  return orderHomeQuestionsForWcPromo(list, nowMs);
}

/**
 * START HERE chip when poll detects confirmed Starting XIs.
 * @param {{ eventId?: string, homeTeam?: string, awayTeam?: string } | null | undefined} notice
 */
export function buildWcXiConfirmedHomeStarter(notice) {
  if (!notice?.eventId) return null;
  const away = String(notice.awayTeam || "").trim() || "Away";
  const home = String(notice.homeTeam || "").trim() || "Home";
  const matchup = `${away} vs ${home}`;
  return {
    id: "q-wc-xi-confirmed",
    color: "#00F5E9",
    sportHint: "worldcup",
    sortRank: 0,
    text: `Best prop now that XIs are out (${matchup})?`,
    prompt: `Starting XIs are confirmed for ${matchup}. What's the best player prop or alternate market now that lineups are locked — not the moneyline unless that's the only edge?`,
  };
}
