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
    subtitle: "Group-stage value before kickoff",
    trustLine: "Starting XIs only when confirmed — see status on every match.",
    matchesCta: "See today's matches",
    highlights: [
      "Group-stage value before the Mexico opener",
      "Advancement angles the market underweights",
      "Group I is the toughest second-place path",
    ],
    insightLine: "Ask about group-stage value or a mispriced winner — one pick, direct answer.",
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
