/**
 * World Cup UR Take — structured card normalization by intent.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  isWcPlayerMarketIntent,
  repairWcPlayerPropPassCard,
  finalizeWcPlayerPropStructured,
} from "./wcUrTakePlayerMarket.js";
import { textMentionsWcTeam } from "./wcUrTakeEntityBinding.js";
import { stripRulesThreadBleed } from "./wcUrTakeRules.js";
import {
  classifyWcAdvancementMarket,
  WC_ADVANCEMENT_MARKET,
} from "./wcAdvancementMarket.js";
import { ensureWcCardFaceNumericWhy } from "./wcTakeRetentionQA.js";
import { repairWcGroupSlateStructuredLine } from "./wcGroupComposition.js";
import {
  deriveWcMatchProbabilityLean,
  isWcMatchProbabilityLeanDrift,
  isWcMatchProbabilityQuestion,
  wcMatchProbabilityAnswerFieldsHaveSignal,
} from "./wcMatchProbabilityQuestion.js";
import { repairWcTotalsHoldPriorLeanFollowUp } from "./wcTotalsLeanHold.js";

const FAIR_PRICE_RE =
  /\b(not mispriced|fairly priced|fairly valued|fair price|no edge|no mispricing|correctly priced|generous given|not a value)\b/i;

/**
 * Align THE PLAY with probability answers when Claude filled call/line/whyNow only.
 * @param {object} out
 * @param {string} question
 */
export function repairWcMatchProbabilityLean(out, question = "") {
  if (!out || typeof out !== "object") return out;
  const q = String(question || "").trim();
  if (!q || !isWcMatchProbabilityQuestion(q)) return out;

  const lean = String(out.lean || "").trim();
  if (!isWcMatchProbabilityLeanDrift(lean, q)) return out;

  const fields = {
    call: out.call,
    line: out.line,
    whyNow: out.whyNow,
    question: q,
  };
  if (!wcMatchProbabilityAnswerFieldsHaveSignal(fields)) return out;

  const repaired = deriveWcMatchProbabilityLean(fields);
  if (repaired) out.lean = repaired;
  return out;
}

function finishWcStructuredForDelivery(out, intent, question) {
  const keepExpanded = Boolean(out.breakdownDefaultExpanded);
  const repaired = repairWcGroupSlateStructuredLine(out);
  const finalized =
    repaired?.wcNamedPlayerPropsCard === true
      ? repaired
      : ensureWcCardFaceNumericWhy(repaired, question, { wcIntent: intent });
  if (keepExpanded) finalized.breakdownDefaultExpanded = true;
  return finalized;
}

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
  history = [],
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
    return finishWcStructuredForDelivery(out, intent, question);
  }

  if (intent === WC_INTENT.MATCHUP) {
    out.callType = "matchup";
    const call = String(out.call || "").trim();
    if ((call === "—" || !call) && out.lean) {
      out.call = "";
    }
    for (const abbr of requiredEntities) {
      if (!textMentionsWcTeam(`${out.lean} ${out.whyNow} ${out.call}`, abbr)) {
        /* leave for QA regenerate */
      }
    }
    if (FAIR_PRICE_RE.test(`${out.lean} ${out.whyNow}`)) {
      out.edge = out.edge || "Structural paths — no single knockout winner pick in group stage.";
    }
    repairWcMatchProbabilityLean(out, question);
    return finishWcStructuredForDelivery(
      repairWcTotalsHoldPriorLeanFollowUp(out, question, history),
      intent,
      question,
    );
  }

  if (intent === WC_INTENT.PARLAY || String(out.callType || "").toLowerCase() === "parlay") {
    out.callType = "parlay";
    return finishWcStructuredForDelivery(out, intent, question);
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
    if (intent === WC_INTENT.PLAYER_PROP) {
      return finishWcStructuredForDelivery(finalizeWcPlayerPropStructured(out, question), intent, question);
    }
    return finishWcStructuredForDelivery(out, intent, question);
  }

  if (intent === WC_INTENT.ENTITY_PRICING) {
    if (String(out.callType || "").toLowerCase() === "group_slate") {
      delete out.playerMarketTier;
      return finishWcStructuredForDelivery(out, intent, question);
    }
    if (String(out.callType || "").toLowerCase() === "tomorrow_slate") {
      delete out.playerMarketTier;
      return finishWcStructuredForDelivery(out, intent, question);
    }
    const market = classifyWcAdvancementMarket(question);
    if (market && market !== WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER) {
      out.callType = "advancement";
    } else {
      out.callType = "analysis";
    }
    const blob = `${out.lean} ${out.whyNow} ${out.edge}`;
    if (FAIR_PRICE_RE.test(blob)) {
      out.edge = "Fair price — no actionable mispricing edge at this number.";
      out.confidence = out.confidence || "Medium";
    }
    if (out.callType === "advancement" && !String(out.line || "").trim()) {
      const simPct = blob.match(/\br16Pct[^.\n]*?(\d+\.?\d*)%/i)?.[1] ||
        blob.match(/(\d+\.?\d*)%\s+of tournament sims/i)?.[1];
      const odds = blob.match(/\b(-1[0-9]{2}|\+[1-9]\d{2,4})\b/)?.[0];
      const marketPct = blob.match(/(?:market|implies)[^.]*?~?(\d+\.?\d*)%/i)?.[1];
      if (odds && simPct) {
        const verdict = /\bpass\b/i.test(blob) ? "Pass" : "Lean";
        out.line = `${verdict} at ${odds} — sim ${simPct}%${marketPct ? ` vs market ~${marketPct}%` : ""}.`;
      }
    }
    return finishWcStructuredForDelivery(out, intent, question);
  }

  if (intent === WC_INTENT.STRUCTURAL) {
    if (String(out.callType || "").toLowerCase() === "group_slate") {
      delete out.playerMarketTier;
      return finishWcStructuredForDelivery(out, intent, question);
    }
    if (String(out.callType || "").toLowerCase() === "tomorrow_slate") {
      delete out.playerMarketTier;
      return finishWcStructuredForDelivery(out, intent, question);
    }
    const market = classifyWcAdvancementMarket(question);
    if (market === WC_ADVANCEMENT_MARKET.GROUP_WINNER) {
      out.callType = "advancement";
    } else {
      out.callType = "analysis";
    }
    delete out.playerMarketTier;
    return finishWcStructuredForDelivery(out, intent, question);
  }

  if (intent === WC_INTENT.PREDICTIONS_ROUNDUP) {
    out.callType = "predictions_roundup";
    delete out.playerMarketTier;
    return finishWcStructuredForDelivery(out, intent, question);
  }

  return finishWcStructuredForDelivery(out, intent, question);
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
