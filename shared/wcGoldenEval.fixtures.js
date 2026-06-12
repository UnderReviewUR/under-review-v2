/**
 * World Cup golden eval fixtures — offline model payloads + optional Anthropic intercept.
 */

import { WC_CARD_CONTRACT_GOLDEN_CASES } from "./wcCardContractGolden.fixture.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  WC_GOLDEN_ESP_OUTRIGHT,
  WC_GOLDEN_NOR_OUTRIGHT,
} from "./wcGoldenOutrightsRefs.js";

const ESP_MARKET = WC_GOLDEN_ESP_OUTRIGHT || "+500";
const NOR_MARKET = WC_GOLDEN_NOR_OUTRIGHT || "+3000";

const ROUNDUP_Q =
  "The World Cup starts this week! Let's hear your predictions: 🏆 Winners: 🐎 Dark horse: 📈 Breakout player: 🔝 Top goalscorer:";

/**
 * @param {string} summary
 * @param {string} [deep]
 */
function anthropicSummaryDeepPayload(summary, deep = "") {
  return {
    id: "msg_golden_eval",
    type: "message",
    role: "assistant",
    model: "golden-eval-fixture",
    stop_reason: "end_turn",
    content: [
      {
        type: "text",
        text: JSON.stringify({ summary, deep }),
      },
    ],
  };
}

/** @typedef {{
 *   id: string,
 *   question: string,
 *   expectedIntent: string,
 *   requiresHistory?: boolean,
 *   history?: Array<{ role: string, content: string }>,
 *   modelFixture?: { summary: string, deep?: string },
 *   anthropicPayload?: object,
 *   expectIssueCodes?: string[],
 *   forbidIssueCodes?: string[],
 *   expectRepairedPlay?: boolean,
 *   expectFail?: boolean,
 *   outrightsAvailable?: boolean,
 *   expectMarketOutright?: string,
 *   notes?: string,
 * }} WcGoldenEvalCase */

/** @type {WcGoldenEvalCase[]} */
const WC_GOLDEN_EVAL_EXTRA = [
  {
    id: "roundup-complete",
    question: ROUNDUP_Q,
    expectedIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    outrightsAvailable: true,
    modelFixture: {
      summary:
        `Spain's path dominates — Yamal's minutes edge is what the board still misprices. Market ${ESP_MARKET} · UR ~+318 vs sims 44% win · 84% QF.`,
      deep: `Winners: Spain — sims make them the path favorite at 44% with the softest bracket.
Dark horse: Norway — ${NOR_MARKET} market still treats them as a novelty; Haaland's transition volume wins Group I and a soft R16 draw.
Breakout player: Lamine Yamal — primary creator on the favorite with 7+ expected matches.
Top goalscorer: Lamine Yamal +900 — volume edge over Mbappé when you weight minutes and path.
Watch for Spain lineup confirmation before locking the scorer leg.
Lean: Yamal +900 over the field — structural games-played edge.`,
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      `Spain's path dominates — Yamal's minutes edge is what the board still misprices. Market ${ESP_MARKET} · UR ~+318 vs sims 44% win · 84% QF.`,
      `Winners: Spain — sims make them the path favorite at 44% with the softest bracket.
Dark horse: Norway — ${NOR_MARKET} market still treats them as a novelty; Haaland's transition volume wins Group I and a soft R16 draw.
Breakout player: Lamine Yamal — primary creator on the favorite with 7+ expected matches.
Top goalscorer: Lamine Yamal +900 — volume edge over Mbappé when you weight minutes and path.
Watch for Spain lineup confirmation before locking the scorer leg.
Lean: Yamal +900 over the field — structural games-played edge.`,
    ),
    expectMarketOutright: ESP_MARKET,
    forbidIssueCodes: [
      "wc_predictions_roundup_incomplete",
      "wc_play_line_invalid",
      "wc_roundup_dark_horse_weak",
      "wc_roundup_delta_missing_market_odds",
    ],
  },
  {
    id: "roundup-prod-bad",
    question: ROUNDUP_Q,
    expectedIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    outrightsAvailable: true,
    expectRepairedPlay: true,
    expectFail: true,
    expectIssueCodes: [
      "wc_player_age_mismatch",
      "wc_roundup_dark_horse_weak",
      "wc_roundup_fair_price_contradiction",
    ],
    modelFixture: {
      summary:
        "Spain's path dominance and France's creator depth make them the only two teams that clear 40% win probability — but the market is pricing them fairly.\nThe real edge sits in the dark horse tier, where Colombia and Norway offer structural value at longer odds.",
      deep: `Winners: Spain — 44.33% win rate in sims with 7.1 expected games.
Dark horse: Colombia — 2.45% sims but 43.32% QF rate means they survive the bracket.
Breakout player: Lamine Yamal (Spain) — 17 years old, 7.1 expected games.
Top goalscorer: Kylian Mbappé (France) — adjusted odds +318 vs raw +600, 6 expected games.
Watch for injury or tactical shift to a back-three that benches him.
PLAY: Lean: that actually holds.`,
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      "Spain's path dominance and France's creator depth make them the only two teams that clear 40% win probability — but the market is pricing them fairly.\nThe real edge sits in the dark horse tier, where Colombia and Norway offer structural value at longer odds.",
      `Winners: Spain — 44.33% win rate in sims with 7.1 expected games.
Dark horse: Colombia — 2.45% sims but 43.32% QF rate means they survive the bracket.
Breakout player: Lamine Yamal (Spain) — 17 years old, 7.1 expected games.
Top goalscorer: Kylian Mbappé (France) — adjusted odds +318 vs raw +600, 6 expected games.
Watch for injury or tactical shift to a back-three that benches him.
PLAY: Lean: that actually holds.`,
    ),
  },
  {
    id: "entity-spain-market-delta",
    question: `Is Spain ${ESP_MARKET} fair to win it all?`,
    expectedIntent: WC_INTENT.ENTITY_PRICING,
    outrightsAvailable: true,
    modelFixture: {
      summary: `Spain's bracket path is priced like a co-favorite — books are not giving away value at ${ESP_MARKET}. Market ${ESP_MARKET} · UR sims ~38% title vs implied 18%.`,
      deep: `Sims make Spain 44% to lift the trophy with the softest knockout side in the draw.
Watch for Pedri fitness — without him the path tightens in the QF.
Pass at ${ESP_MARKET} — fair favorite, no misprice.`,
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      `Spain's bracket path is priced like a co-favorite — books are not giving away value at ${ESP_MARKET}. Market ${ESP_MARKET} · UR sims ~38% title vs implied 18%.`,
      `Sims make Spain 44% to lift the trophy with the softest knockout side in the draw.
Watch for Pedri fitness — without him the path tightens in the QF.
Pass at ${ESP_MARKET} — fair favorite, no misprice.`,
    ),
    expectMarketOutright: ESP_MARKET,
    forbidIssueCodes: ["wc_roundup_delta_missing_market_odds", "wc_card_missing_delta"],
  },
  {
    id: "group-winner-outright-bleed",
    question: "What's the best group-stage value bet right now?",
    expectedIntent: WC_INTENT.STRUCTURAL,
    modelFixture: {
      summary:
        "Ecuador at +8000 is the group-stage value play — they win Group E over Germany on Poisson strength.",
      deep: "Ecuador sits as Group E Favorite but the board treats them like a longshot at +8000. Sims show 47% groupWinPct to finish first.",
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      "Ecuador at +8000 is the group-stage value play — they win Group E over Germany on Poisson strength.",
      "Ecuador sits as Group E Favorite but the board treats them like a longshot at +8000. Sims show 47% groupWinPct to finish first.",
    ),
    expectFail: true,
    expectIssueCodes: ["wc_group_winner_outright_bleed"],
    notes: "Group-winner thesis must not cite tournament outright (+8000).",
  },
  {
    id: "player-prop-jimenez-shots-home",
    question: "Jimenez 2+ shots?",
    expectedIntent: WC_INTENT.PLAYER_PROP,
    expectFail: true,
    expectIssueCodes: ["wc_player_missing_names"],
    notes: "Routing lock — Jimenez not in player KV yet; QA should flag until seed expands.",
    modelFixture: {
      summary:
        "Jimenez volume is priced for a neutral script — the board is not paying for a Mexico lead. Market +140 · implies ~42% · UR read ~48% on 2+ shots.",
      deep: `Mexico's opener skews cautious — Jimenez needs early touches, not a chase script.
This wins if Mexico presses the first 25 minutes; dies if they sit in a low block.
Watch for confirmed XI — rotation caps his shot volume.
Lean: Jimenez 2+ shots +140 — path fits opener aggression.`,
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      "Jimenez volume is priced for a neutral script — the board is not paying for a Mexico lead. Market +140 · implies ~42% · UR read ~48% on 2+ shots.",
      `Mexico's opener skews cautious — Jimenez needs early touches, not a chase script.
This wins if Mexico presses the first 25 minutes; dies if they sit in a low block.
Watch for confirmed XI — rotation caps his shot volume.
Lean: Jimenez 2+ shots +140 — path fits opener aggression.`,
    ),
    forbidIssueCodes: ["intent_mismatch", "wc_play_line_invalid"],
  },
  {
    id: "player-prop-jimenez-sgp-combo",
    question: "Jimenez 2+ shots and Mexico team to score first goal — correlated or cleaner leg?",
    expectedIntent: WC_INTENT.PLAYER_PROP,
    modelFixture: {
      summary:
        "These legs share one script — Mexico must attack first for both to cash. Correlation is high, not independent.",
      deep: `Player shot volume and first-goal need the same early Mexico lead script.
This wins if Mexico scores first with sustained pressure; dies if they trail and park the bus.
Cleaner leg: Mexico team O1.5 or ML if you want one hinge instead of stacking props.
Pass on the full SGP at long odds — same-stat fragility.`,
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      "These legs share one script — Mexico must attack first for both to cash. Correlation is high, not independent.",
      `Player shot volume and first-goal need the same early Mexico lead script.
This wins if Mexico scores first with sustained pressure; dies if they trail and park the bus.
Cleaner leg: Mexico team O1.5 or ML if you want one hinge instead of stacking props.
Pass on the full SGP at long odds — same-stat fragility.`,
    ),
    forbidIssueCodes: ["intent_mismatch"],
  },
  {
    id: "rules-knockout-extra-time",
    question: "What are the knockout rules for extra time?",
    expectedIntent: WC_INTENT.RULES,
    modelFixture: {
      summary:
        "Knockout ties go to 30 minutes of extra time in two 15-minute periods, then penalties if still level.",
      deep: "90-minute moneylines settle regulation only; advancement markets include ET and pens when tied.",
    },
    anthropicPayload: anthropicSummaryDeepPayload(
      "Knockout ties go to 30 minutes of extra time in two 15-minute periods, then penalties if still level.",
      "90-minute moneylines settle regulation only; advancement markets include ET and pens when tied.",
    ),
    forbidIssueCodes: ["intent_mismatch", "wc_play_line_invalid"],
  },
];

/** @type {WcGoldenEvalCase[]} */
export const WC_GOLDEN_EVAL_CASES = [
  ...WC_CARD_CONTRACT_GOLDEN_CASES.map((row) => ({
    id: row.id,
    question: row.question,
    expectedIntent: row.expectedIntent,
    requiresHistory: row.requiresHistory,
    notes: row.notes,
  })),
  ...WC_GOLDEN_EVAL_EXTRA,
];

const byId = new Map(WC_GOLDEN_EVAL_CASES.map((row) => [row.id, row]));

/**
 * @param {string} id
 */
export function getGoldenEvalFixtureById(id) {
  return byId.get(String(id || "")) || null;
}

/**
 * Cases with offline model fixtures (handler + offline pipelines).
 */
export function wcGoldenEvalOfflineCases() {
  return WC_GOLDEN_EVAL_CASES.filter((row) => row.modelFixture?.summary);
}

/**
 * Cases with Anthropic intercept payloads (full handler path without live LLM).
 */
export function wcGoldenEvalHandlerCases() {
  return WC_GOLDEN_EVAL_CASES.filter((row) => row.anthropicPayload);
}
