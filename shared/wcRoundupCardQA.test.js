import test from "node:test";
import assert from "node:assert/strict";
import { formatWcKickoffDisplay } from "./wcKickoffDisplay.js";
import {
  detectWcRoundupCrossMarketBleed,
  detectWcRoundupScorerLeanContradiction,
  detectWcRoundupUnnamedMarketOdds,
} from "./wcRoundupCardQA.js";
import { detectWcScorerRoleMismatch } from "./wcScorerRoleQA.js";
import { parseWcPredictionSlots } from "./wcPredictionsRoundup.js";
import { runWcUrTakeQA, wcQaRequiresRegeneration } from "../api/_wcUrTakeQA.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("formatWcKickoffDisplay — ET only (no local timezone suffix)", () => {
  const text = formatWcKickoffDisplay({
    commenceTs: 1781204400000,
    date: "2026-06-11",
    time: "15:00 ET",
  });
  assert.match(text, /ET/);
  assert.doesNotMatch(text, /CDT|CST|PST|PDT|local/i);
  assert.doesNotMatch(text, /·/);
});

test("detectWcRoundupCrossMarketBleed — Mbappé PK in Argentina dark horse", () => {
  const slots = parseWcPredictionSlots(
    "Dark horse: Argentina — softer Group J path, Mbappé's PK taker status adds edge.",
  );
  assert.ok(detectWcRoundupCrossMarketBleed(slots));
});

test("detectWcRoundupUnnamedMarketOdds — Yamal +1815 adjusted odds without market", () => {
  const slots = parseWcPredictionSlots(
    "Breakout player: Lamine Yamal (Spain, age 18) — market treats him as bench depth at +1815 adjusted odds.",
  );
  assert.ok(detectWcRoundupUnnamedMarketOdds(slots));
});

test("detectWcRoundupUnnamedMarketOdds — breakout with Golden Boot label passes", () => {
  const slots = parseWcPredictionSlots(
    "Breakout player: Lamine Yamal — Golden Boot +1815 is a lottery ticket, not the base case.",
  );
  assert.equal(detectWcRoundupUnnamedMarketOdds(slots), null);
});

test("detectWcRoundupScorerLeanContradiction — Vinícius better value vs Mbappé lean", () => {
  const slots = parseWcPredictionSlots(
    "Top goalscorer: Vinícius Júnior (Brazil) at +613 adjusted offers better value.",
  );
  const hit = detectWcRoundupScorerLeanContradiction(
    "Lean: Kylian Mbappé Golden Boot +600 — structural games-played edge.",
    slots,
  );
  assert.ok(hit);
});

test("detectWcScorerRoleMismatch — Pedri in winners line does not fail top scorer slot", () => {
  const body = `Winners: Spain — Pedri-Rodri midfield controls tempo.
Top goalscorer: Kylian Mbappé (France) — +600, PK taker.`;
  const slots = parseWcPredictionSlots(body);
  const mismatch = detectWcScorerRoleMismatch(body, {
    topScorerSlotValue: slots.find((s) => s.key === "topScorer")?.value,
  });
  assert.equal(mismatch, null);
});

test("runWcUrTakeQA — Spain/Argentina roundup with Mbappé bleed fails regeneration", () => {
  const body = `Winners: Spain — Pedri-Rodri midfield controls tempo.
Dark horse: Argentina — sims project 21% win (vs +900 market), softer Group J path, Mbappé's PK taker status adds 1.5 expected goals over tournament depth.
Breakout player: Lamine Yamal (Spain, age 18) — market treats him as bench depth at +1815 adjusted odds.
Top goalscorer: Kylian Mbappé (France) — +600; Vinícius Júnior (Brazil) at +613 adjusted offers better value.`;
  const structured = {
    lean: "Lean: Kylian Mbappé Golden Boot +600 — structural games-played edge.",
    line: "Sims: ESP 44% · ARG 21%; Market: ESP +450 · ARG +900.",
    edge: "Watch for Mbappé's minutes in group stage.",
  };
  const qa = runWcUrTakeQA({
    responseText: body,
    structured,
    question: "Give me your full tournament predictions — winner, dark horse, breakout player, and Golden Boot",
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    outrightsAvailable: true,
  });
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_roundup_cross_market_bleed"));
  assert.ok(qa.issueCodes.includes("wc_roundup_scorer_lean_contradiction"));
  assert.ok(qa.issueCodes.includes("wc_invented_xg_claim"));
  assert.ok(qa.issueCodes.includes("wc_roundup_unnamed_market_odds"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});
