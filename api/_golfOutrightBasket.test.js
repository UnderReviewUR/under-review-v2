import test from "node:test";
import assert from "node:assert/strict";

import {
  americanOddsProfitPerUnit,
  buildGolfOutrightBasketSystemRule,
  buildGolfOutrightBasketUserPromptAppendix,
  classifyGolfBetStructure,
  computeOutrightBasketScenarios,
  detectOutrightBasketIntent,
  lintGolfOutrightParlayMisread,
} from "./_golfOutrightBasket.js";
import { composeRegisteredUrTakeSystemPrompt } from "./_urTakeSystemPromptRegistry.js";
import { lintGolfOutput } from "./_urTakeSportValidators/golf.js";

/** Hard deploy gate — exact strings (case as users type). */
const DEPLOY_GATE_A = "i could technically place $1 on 3 players and still come out ahead";
const DEPLOY_GATE_B =
  "could I put a buck on Rahm, Rory and Scottie and profit if one wins?";

const REGRESSION_QUESTION =
  "I could technically place $1 on 3 players and still come out ahead";

test("DEPLOY GATE — exact input A classifies as outright basket", () => {
  assert.equal(detectOutrightBasketIntent(DEPLOY_GATE_A), true);
  const c = classifyGolfBetStructure(DEPLOY_GATE_A, "golf");
  assert.equal(c.marketType, "outright");
  assert.equal(c.structure, "basket");
  assert.notEqual(c.structure, "parlay");
});

test("DEPLOY GATE — exact input B classifies as outright basket (natural language)", () => {
  assert.equal(detectOutrightBasketIntent(DEPLOY_GATE_B), true);
  const c = classifyGolfBetStructure(DEPLOY_GATE_B, "golf");
  assert.equal(c.marketType, "outright");
  assert.equal(c.structure, "basket");
  assert.notEqual(c.structure, "parlay");
});

test("detectOutrightBasketIntent — regression user quote", () => {
  assert.equal(detectOutrightBasketIntent(REGRESSION_QUESTION), true);
});

test("detectOutrightBasketIntent — false for explicit parlay-only without multi-stake", () => {
  assert.equal(detectOutrightBasketIntent("4 leg parlay lakers thunder"), false);
});

test("classifyGolfBetStructure — regression is outright basket not parlay", () => {
  const c = classifyGolfBetStructure(REGRESSION_QUESTION, "golf");
  assert.equal(c.marketType, "outright");
  assert.equal(c.structure, "basket");
});

test("computeOutrightBasketScenarios — Smalley / Rahm / Rory example", () => {
  const { totalStake, scenarios } = computeOutrightBasketScenarios([426, 488, 614], 1);
  assert.equal(totalStake, 3);
  assert.ok(Math.abs(scenarios[0].netProfit - 2.26) < 0.01);
  assert.ok(Math.abs(scenarios[1].netProfit - 2.88) < 0.01);
  assert.ok(Math.abs(scenarios[2].netProfit - 4.14) < 0.01);
});

test("americanOddsProfitPerUnit", () => {
  assert.ok(Math.abs(americanOddsProfitPerUnit(426) - 4.26) < 0.001);
  assert.ok(Math.abs(americanOddsProfitPerUnit(-110) - 0.909) < 0.01);
});

test("composeRegisteredUrTakeSystemPrompt injects golf outright basket rule", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "golf",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "none",
    mlbDecisionMode: null,
    question: REGRESSION_QUESTION,
  });
  assert.match(p, /GOLF OUTRIGHT BASKET RULE/);
  assert.match(p, /mutually exclusive/i);
  assert.match(p, /Never multiply American odds/i);
  assert.match(p, /GOLF OUTRIGHT WINNER — MUTUALLY EXCLUSIVE/);
});

test("buildGolfOutrightBasketUserPromptAppendix — not a parlay + math", () => {
  const block = buildGolfOutrightBasketUserPromptAppendix(REGRESSION_QUESTION, [
    { player: "Alex Smalley", odds: 426 },
    { player: "Jon Rahm", odds: 488 },
    { player: "Rory McIlroy", odds: 614 },
  ]);
  assert.match(block, /not a parlay/i);
  assert.match(block, /Total risk if \$1 each: \$3\.00/);
  assert.match(block, /net \+\$2\.26 if Alex Smalley wins/);
  assert.doesNotMatch(block, /multiply odds together/i);
});

test("buildGolfOutrightBasketSystemRule forbids parlay product words", () => {
  const rule = buildGolfOutrightBasketSystemRule();
  assert.match(rule, /basket|coverage|multiple singles/i);
  assert.match(rule, /Never multiply American odds/i);
});

test("lintGolfOutrightParlayMisread — flags multiplied outright odds", () => {
  const bad =
    "Multiply +426 × +488 × +567 for roughly 204:1 on this PGA outright winner slate.";
  const issues = lintGolfOutrightParlayMisread(bad);
  assert.ok(issues.some((i) => i.code === "golf_outright_parlay_odds_multiply"));
  assert.equal(issues[0].requiresRegeneration, true);
});

test("lintGolfOutrightParlayMisread — hard-fail two-leg parlay on same outright field", () => {
  const bad = "Back the Rahm + McIlroy two-leg parlay — that's the play on this field.";
  const issues = lintGolfOutrightParlayMisread(bad);
  assert.ok(issues.some((i) => i.code === "golf_outright_two_leg_parlay_impossible"));
  assert.equal(
    issues.find((i) => i.code === "golf_outright_two_leg_parlay_impossible")?.requiresRegeneration,
    true,
  );
});

test("lintGolfOutput — two-leg outright field parlay triggers critical", () => {
  const bad = "Run the Rahm + Rory two-leg parlay for the tournament winner market.";
  const issues = lintGolfOutput(bad);
  assert.ok(issues.some((i) => i.code === "golf_outright_two_leg_parlay_impossible"));
});

test("lintGolfOutput includes outright parlay misread", () => {
  const bad = "Multiply +426 × +488 × +567 for roughly 204:1 on this PGA outright basket idea.";
  const issues = lintGolfOutput(bad);
  assert.ok(issues.some((i) => i.code === "golf_outright_parlay_odds_multiply"));
});

test("lintGolfOutrightParlayMisread — clean basket copy passes", () => {
  const good =
    "This is a basket of three separate outright singles — $3 total risk. If Smalley wins at +426 you net about +$2.26 after the other $2 in dead stakes. If none wins, all three lose.";
  const issues = lintGolfOutrightParlayMisread(good);
  assert.equal(issues.length, 0);
});
