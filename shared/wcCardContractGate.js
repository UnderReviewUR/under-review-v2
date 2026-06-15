/**
 * WC Card Contract — offline gate runners (CI / pre-release).
 */

import { WC_CARD_CONTRACT_GOLDEN_CASES, WC_CARD_CONTRACT_THREAD_CASES } from "./wcCardContractGolden.fixture.js";
import {
  scoreWcCardContractIntent,
  scoreWcCardContractLayout,
  scoreWcFollowUpRouting,
} from "./wcCardContractScorer.js";
import {
  scoreWcCardContractVoice,
  wcCardHeadlineAnnouncesOnly,
} from "./wcCardContractVoice.js";
import { scoreWcFollowUpExplainContract } from "./wcCardContractFollowUpScorer.js";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";

/** @type {Record<string, { summary: string, deep: string, wcIntent: string }>} */
export const WC_CARD_CONTRACT_COMPACT_EXEMPLARS = {
  ENTITY_PRICING: {
    wcIntent: WC_INTENT.ENTITY_PRICING,
    summary:
      "Brazil +450 is fair — books price Group I chaos correctly. Market +450 · UR sim ~52%.",
    deep:
      "Group I depth caps knockout upside at +450. Pass at +450 — no outright edge. Watch for Vinícius injury news before locking.",
  },
  MATCHUP: {
    wcIntent: WC_INTENT.MATCHUP,
    summary:
      "France advances — Norway's run ends early. Market FRA -140 · UR agrees at 58%.",
    deep:
      "France is group Favorite with cleaner bracket path. Lean France to advance. Watch Norway defensive low-block variance in Game 1.",
  },
  STRUCTURAL: {
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: "USA mispriced to win Group D at -180. Market -180 · UR -220 (62% sim).",
    deep:
      "Favorite path is clean if USA wins opener. Lean USA Group D at -180. Watch Paraguay low-block variance in the opener.",
  },
  GENERAL: {
    wcIntent: WC_INTENT.GENERAL,
    summary: "USMNT path opens with Group D win — sims say 62% QF, not just R16.",
    deep:
      "Group D winner draws a Contender in R16. Lean USA deep run if they top group. Watch Paraguay upset risk in Game 1.",
  },
  GOLDEN_BOOT: {
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    summary:
      "Market has Mbappé's name — France's path is what books underprice. Market +600 · UR path ~+318.",
    deep:
      "France projects six knockout games with Mbappé as primary scorer. Pass at +600 — fair favorite. Watch for shorter French knockout run.",
  },
  PLAYER_PROP: {
    wcIntent: WC_INTENT.PLAYER_PROP,
    summary:
      "Lean Jimenez over 2.5 shots — Mexico chase script fits. Market -115 · UR 54% volume.",
    deep:
      "Jimenez leads Mexico in shots when they need a result. Lean over 2.5 shots. Watch for Mexico trailing and chasing late.",
  },
  SCORE_PREDICTION: {
    wcIntent: WC_INTENT.SCORE_PREDICTION,
    summary: "USA 2-1 Paraguay is the modal scoreline — 18% of sims.",
    deep:
      "Host edge plus Paraguay low block yields tight 2-1. Lean USA 2-1 as top script. Watch for early red-card chaos.",
  },
};

/**
 * @param {typeof WC_CARD_CONTRACT_COMPACT_EXEMPLARS[string]} ex
 * @param {string} question
 */
function buildSingleTurnStructured(ex, question) {
  return buildWcCompactStructured({
    question,
    wcIntent: ex.wcIntent,
    summary: ex.summary,
    deep: ex.deep,
    playerMarketTier: ex.wcIntent === WC_INTENT.PLAYER_PROP ? "verified" : undefined,
  });
}

/**
 * Single-turn golden cases — layout + voice + intent (no live entity QA).
 */
export function runWcCardContractSingleTurnGate() {
  /** @type {Array<{ id: string, ok: boolean, issues: string[] }>} */
  const rows = [];
  let pass = 0;
  let fail = 0;

  for (const row of WC_CARD_CONTRACT_GOLDEN_CASES.filter(
    (c) => c.cardVoice === "argue" && !c.followUpExpect,
  )) {
    const ex =
      WC_CARD_CONTRACT_COMPACT_EXEMPLARS[row.expectedIntent] ||
      WC_CARD_CONTRACT_COMPACT_EXEMPLARS.GENERAL;
    const structured = buildSingleTurnStructured(ex, row.question);
    const intent = scoreWcCardContractIntent(row.question, row.expectedIntent);
    const layout = scoreWcCardContractLayout(structured);
    const voice = scoreWcCardContractVoice(structured, { wcIntent: ex.wcIntent });
    const announce = wcCardHeadlineAnnouncesOnly(structured.call);
    /** @type {string[]} */
    const issues = [];
    if (!intent.passed) issues.push("intent_mismatch");
    if (!layout.passed) issues.push(...(layout.issues || []));
    if (!voice.passed) issues.push(...(voice.issues || []));
    if (announce) issues.push("wc_card_headline_announces");
    const ok = issues.length === 0;
    if (ok) pass += 1;
    else fail += 1;
    rows.push({ id: row.id, ok, issues });
  }

  return { pass, fail, rows };
}

/**
 * Thread intent + follow-up exemplars + routing — required CI gate.
 */
export function runWcCardContractThreadGate() {
  /** @type {Array<{ id: string, section: string, ok: boolean, issues: string[] }>} */
  const rows = [];
  let pass = 0;
  let fail = 0;

  for (const row of WC_CARD_CONTRACT_THREAD_CASES) {
    const intent = scoreWcCardContractIntent(
      row.question,
      row.expectedIntent,
      row.history || [],
    );
    const okIntent = intent.passed;
    if (okIntent) pass += 1;
    else fail += 1;
    rows.push({
      id: row.id,
      section: "intent",
      ok: okIntent,
      issues: okIntent ? [] : [`expected ${row.expectedIntent} got ${intent.actual}`],
    });
  }

  for (const row of WC_CARD_CONTRACT_THREAD_CASES.filter((c) => c.followUpExpect)) {
    if (row.exemplarGood) {
      const good = scoreWcFollowUpExplainContract({
        question: row.question,
        structured: row.exemplarGood,
        history: row.history,
        expect: row.followUpExpect,
      });
      const ok = good.passed;
      if (ok) pass += 1;
      else fail += 1;
      rows.push({
        id: row.id,
        section: "exemplarGood",
        ok,
        issues: good.issues,
      });
    }
    if (row.exemplarBad) {
      const bad = scoreWcFollowUpExplainContract({
        question: row.question,
        structured: row.exemplarBad,
        history: row.history,
        expect: row.followUpExpect,
      });
      const ok = !bad.passed;
      if (ok) pass += 1;
      else fail += 1;
      rows.push({
        id: row.id,
        section: "exemplarBad",
        ok,
        issues: ok ? [] : ["expected scorer failures"],
      });
    }
  }

  for (const row of WC_CARD_CONTRACT_THREAD_CASES.filter((c) => c.routingExpect)) {
    const routing = scoreWcFollowUpRouting({
      question: row.question,
      expectedIntent: row.expectedIntent,
      history: row.history,
      wcIntent: classifyWcQuestionIntent(row.question, row.history || []),
      routingExpect: row.routingExpect,
    });
    const ok = routing.passed;
    if (ok) pass += 1;
    else fail += 1;
    rows.push({
      id: row.id,
      section: "routing",
      ok,
      issues: routing.issues,
    });
  }

  return { pass, fail, rows };
}
