/**
 * World Cup UR Take — structured card normalization by intent.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
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
    out.callType = "rules";
    out.call = summary.slice(0, 240) || "Knockout rules reference";
    out.lean = summary.replace(/^lean:\s*/i, "").slice(0, 240);
    out.whyNow = summary;
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
