import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcFixtureShotsMarketIntent,
  resolveWcPropBoardMarketKeysForQuestion,
} from "./wcMatchPlayerProps.js";
import {
  classifyWcQuestionIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  detectWcPlayerPropMarketLabel,
  extractWcNamedPlayerFromQuestion,
  extractWcNamedPlayerPropLegsFromQuestion,
  extractWcPropBoardCountFromQuestion,
  inferWcNamedPlayerPropLegFromQuestion,
  isWcExtendedPlayerPropBoardQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcNamedPlayerPropQuestion,
  needsWcFixtureShotsMarketRows,
} from "./wcUrTakePlayerMarket.js";

/** @type {Array<{ q: string, intent: "sot"|"shots"|"both"|null, keys?: string[] | null, count?: number, named?: string | null, legs?: number }>} */
const BOARD_CASES = [
  { q: "best shots on target bets?", intent: "sot", keys: ["player_sot_ou", "player_shots_ou"] },
  { q: "give me the 5 shots on target bets", intent: "sot", count: 5 },
  { q: "top 3 SOT props for this match", intent: "sot", count: 3 },
  { q: "best shots and shots on target bets?", intent: "both", keys: ["player_shots_ou", "player_sot_ou"] },
  { q: "best shots bets?", intent: "shots" },
  { q: "5 best player shots props", intent: "shots", count: 5 },
  { q: "who gets the most shots on target?", intent: "sot" },
  { q: "any good shots on target angles?", intent: "sot" },
  { q: "total shots attempted props?", intent: "shots" },
];

for (const { q, intent, keys, count } of BOARD_CASES) {
  test(`shots board routing — ${q.slice(0, 48)}`, () => {
    assert.equal(classifyWcFixtureShotsMarketIntent(q), intent);
    assert.equal(needsWcFixtureShotsMarketRows(q), true);
    assert.equal(isWcFixtureScopedPlayerMarketQuestion(q), true);
    assert.equal(classifyWcQuestionIntent(q), WC_INTENT.PLAYER_PROP);
    if (keys) {
      assert.deepEqual(resolveWcPropBoardMarketKeysForQuestion(q), keys);
    }
    if (count != null) {
      assert.equal(extractWcPropBoardCountFromQuestion(q), count);
    }
  });
}

/** @type {Array<{ q: string, named: string, marketKey?: string, legs?: number }>} */
const NAMED_CASES = [
  { q: "how many shots will salah get on target today?", named: "salah", marketKey: "player_sot_ou" },
  { q: "will salah go over 1.5 shots on target?", named: "salah", legs: 1 },
  { q: "salah sot line?", named: "salah", marketKey: "player_sot_ou" },
  { q: "Mo Salah over 2.5 shots attempted?", named: "Mo Salah", legs: 1 },
];

for (const { q, named, marketKey, legs } of NAMED_CASES) {
  test(`named player prop routing — ${q.slice(0, 48)}`, () => {
    const extracted = extractWcNamedPlayerFromQuestion(q);
    assert.ok(extracted, `expected named player from: ${q}`);
    assert.match(extracted.toLowerCase(), new RegExp(named.toLowerCase().split(/\s+/)[0]));
    assert.equal(isWcNamedPlayerPropQuestion(q), true);
    if (legs != null) {
      assert.equal(extractWcNamedPlayerPropLegsFromQuestion(q).length, legs);
    }
    if (marketKey) {
      const inferred = inferWcNamedPlayerPropLegFromQuestion(q);
      assert.equal(inferred?.marketKey, marketKey);
    }
    assert.equal(classifyWcQuestionIntent(q), WC_INTENT.PLAYER_PROP);
  });
}

test("extended prop boards — cards and tackles", () => {
  assert.equal(isWcExtendedPlayerPropBoardQuestion("card props for this game"), true);
  assert.equal(isWcExtendedPlayerPropBoardQuestion("tackle props?"), true);
  assert.equal(isWcFixtureScopedPlayerMarketQuestion("tackle props for this match"), true);
  assert.deepEqual(resolveWcPropBoardMarketKeysForQuestion("yellow card props"), [
    "player_card",
    "player_red_card",
  ]);
  assert.deepEqual(resolveWcPropBoardMarketKeysForQuestion("tackle props"), ["player_tackles_ou"]);
});

test("detectWcPlayerPropMarketLabel — forecast SOT ask", () => {
  assert.equal(
    detectWcPlayerPropMarketLabel("how many shots will salah get on target today?"),
    "shots on target",
  );
});
