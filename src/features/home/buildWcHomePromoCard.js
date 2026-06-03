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
      "Norway & Paraguay longshot paths",
      "Group winner / advancement misprices",
      "Host-path scheduling edges",
    ],
    text: "Best group stage value bet right now?",
    prompt:
      "Before the 2026 FIFA World Cup kicks off, what is the best group-stage value bet on the board — group winner, advancement, or a specific fixture — and which mispriced longshot (e.g. Norway, Paraguay) has the cleanest path?",
    sportHint: "worldcup",
  };
}

/**
 * Keep World Cup in the capped home prompt list during promo (Try chip + Start here).
 * @param {Array<Record<string, unknown>>} list
 * @param {number} [nowMs]
 */
export function ensureWorldCupInHomeQuestions(list, nowMs = Date.now()) {
  if (!isWcHomePromoWindow(nowMs) || !Array.isArray(list) || list.length === 0) {
    return list;
  }
  const wcIdx = list.findIndex((p) => String(p?.sportHint || "").toLowerCase() === "worldcup");
  if (wcIdx < 0) return list;
  if (wcIdx === 0) return list;
  const wc = list[wcIdx];
  const rest = list.filter((_, i) => i !== wcIdx);
  return [wc, ...rest];
}
