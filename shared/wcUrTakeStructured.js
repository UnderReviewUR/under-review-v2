/**
 * World Cup UR Take — structured card normalization by intent.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";
import { stripRulesThreadBleed } from "./wcUrTakeRules.js";

const FAIR_PRICE_RE =
  /\b(not mispriced|fairly priced|fairly valued|fair price|no edge|no mispricing|correctly priced|generous given|not a value)\b/i;

/**
 * @param {object | null | undefined} structured
 * @param {string} wcIntent
 * @param {string} question
 * @param {string[]} requiredEntities
 */
export function normalizeWcStructuredForDelivery(
  structured,
  wcIntent,
  question = "",
  requiredEntities = [],
) {
  if (!structured || typeof structured !== "object") return structured;

  const intent = String(wcIntent || "");
  const out = { ...structured, sport: structured.sport || "worldcup" };

  if (intent === WC_INTENT.RULES) {
    const rawSummary = String(out.whyNow || out.lean || out.call || "").trim();
    const summary = stripRulesThreadBleed(rawSummary, requiredEntities);
    const normalized = summary.replace(/\s+/g, " ").trim();
    const sentences = normalized.match(/[^.!?]+[.!?]+/g) || [normalized];
    const headline = String(sentences[0] || normalized).trim();
    const bodyOnly = sentences.slice(1).join(" ").trim();
    out.callType = "rules";
    out.call = headline.slice(0, 240) || "Knockout rules reference";
    out.lean = headline.slice(0, 500);
    out.whyNow = bodyOnly;
    out.edge = "Factual tournament rules — not a betting pick.";
    out.confidence = "High";
    return out;
  }

  if (intent === WC_INTENT.MATCHUP) {
    out.callType = "matchup";
    const call = String(out.call || "").trim();
    if (call === "—" || !call) {
      out.call = "Group advancement paths";
    }
    for (const abbr of requiredEntities) {
      if (!textMentionsWcTeam(`${out.lean} ${out.whyNow} ${out.call}`, abbr)) {
        /* leave for QA regenerate */
      }
    }
    if (FAIR_PRICE_RE.test(`${out.lean} ${out.whyNow}`)) {
      out.edge = out.edge || "Structural paths — no single knockout winner pick in group stage.";
    }
    return out;
  }

  if (isWcPlayerMarketIntent(intent)) {
    const tier = String(out.playerMarketTier || "");
    if (!out.callType || out.callType === "player_market_pass") {
      out.callType =
        tier === "verified"
          ? "player_market_verified"
          : tier === "market_only"
            ? "player_market_odds"
            : tier === "squad"
              ? "player_market_squad"
              : "player_market_thin";
    }
    return out;
  }

  if (intent === WC_INTENT.ENTITY_PRICING) {
    out.callType = "analysis";
    const blob = `${out.lean} ${out.whyNow} ${out.edge}`;
    if (FAIR_PRICE_RE.test(blob)) {
      out.edge = "Fair price — no actionable mispricing edge at this number.";
      out.confidence = out.confidence || "Medium";
    }
    return out;
  }

  return out;
}

/**
 * Build rules-only structured card from prose (never betting shape).
 * @param {string} responseText
 * @param {string|null|undefined} responseDeep
 * @param {string} question
 * @param {string[]} forbiddenEntities
 */
export function buildWcRulesStructuredFromProse(
  responseText,
  responseDeep = null,
  question = "",
  forbiddenEntities = [],
) {
  const bleedForbidden = forbiddenEntities || [];
  const bodyParts = [String(responseText || "").trim(), String(responseDeep || "").trim()].filter(Boolean);
  const combined = stripRulesThreadBleed(bodyParts.join("\n\n"), bleedForbidden);
  const firstLine =
    combined
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^lean:/i.test(l)) || combined;

  return normalizeWcStructuredForDelivery(
    {
      sport: "worldcup",
      call: firstLine.slice(0, 240),
      lean: firstLine.replace(/^lean:\s*/i, "").slice(0, 500),
      whyNow: combined,
      edge: "Factual tournament rules — not a betting pick.",
      confidence: "High",
    },
    WC_INTENT.RULES,
    question,
    [],
  );
}

/** Prose for rules turns — no THE PLAY / betting scaffolding. */
export function formatWcRulesResponseAsProse(structured) {
  if (!structured || typeof structured !== "object") return "";
  const lines = [];
  const whyNow = String(structured.whyNow || "").trim();
  const edge = String(structured.edge || "").trim();
  if (whyNow) lines.push(whyNow);
  if (edge && !/^factual tournament rules/i.test(edge)) lines.push(edge);
  return lines.filter(Boolean).join("\n\n");
}
