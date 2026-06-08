import assert from "node:assert/strict";
import test from "node:test";
import { runWcGoldenEvalOffline } from "./wcGoldenEval.js";
import { wcGoldenEvalOfflineCases } from "./wcGoldenEval.fixtures.js";
import { wcFullSquadBioPlayerCount, wcPlayerAgeYears } from "./wcPlayerBio.js";
import { playerRegistryKey } from "./wcPlayerRegistry.js";
import { buildWcOutrightsSeedMap } from "./wcOutrightsSeed.js";
import { WC_GOLDEN_ESP_OUTRIGHT } from "./wcGoldenOutrightsRefs.js";
import { getGoldenEvalFixtureById } from "./wcGoldenEval.fixtures.js";
import {
  detectWcDarkHorseWeakThesis,
  detectWcRoundupLineMissingMarketOdds,
  scoreWcDarkHorseThesisAngles,
} from "./wcRoundupCardQA.js";

test("wcFullSquadBioPlayerCount — FIFA registry scale", () => {
  assert.ok(wcFullSquadBioPlayerCount() >= 1200);
});

test("wcPlayerAgeYears — Yamal 18 at Jun 2026 kickoff", () => {
  const age = wcPlayerAgeYears("2007-07-13");
  assert.equal(age, 18);
});

test("scoreWcDarkHorseThesisAngles — Colombia QF-only fails bar", () => {
  const weak = "Colombia — 2.45% sims but 43.32% QF rate means they survive the bracket.";
  const angles = scoreWcDarkHorseThesisAngles(weak);
  assert.equal(angles.path, true);
  assert.equal(angles.odds, false);
  assert.ok(detectWcDarkHorseWeakThesis(weak));
});

test("scoreWcDarkHorseThesisAngles — Norway path + odds passes", () => {
  const strong =
    "Norway — +2500 market still treats them as a novelty; Haaland's transition volume wins Group I.";
  const angles = scoreWcDarkHorseThesisAngles(strong);
  assert.ok(angles.path);
  assert.ok(angles.style);
  assert.ok(angles.odds);
  assert.equal(detectWcDarkHorseWeakThesis(strong), null);
});

test("detectWcRoundupLineMissingMarketOdds — sims-only when outrights live", () => {
  assert.ok(
    detectWcRoundupLineMissingMarketOdds("Sims 44% win · 84% QF locks volume.", true),
  );
  assert.equal(
    detectWcRoundupLineMissingMarketOdds("Market +450 · UR ~+318 vs sims 44% win.", true),
    null,
  );
});

test("buildWcOutrightsSeedMap — Spain market line cold start", () => {
  const map = buildWcOutrightsSeedMap();
  assert.equal(map.ESP, WC_GOLDEN_ESP_OUTRIGHT);
  assert.match(map.ESP, /^\+\d+$/);
});

test("golden fixtures — entity-spain question matches seed outright", () => {
  const row = getGoldenEvalFixtureById("entity-spain-market-delta");
  assert.ok(row?.question.includes(WC_GOLDEN_ESP_OUTRIGHT));
  assert.equal(row?.expectMarketOutright, WC_GOLDEN_ESP_OUTRIGHT);
});

test("runWcGoldenEvalOffline — fixture suite", () => {
  const cases = wcGoldenEvalOfflineCases();
  assert.ok(cases.length >= 3);
  for (const row of cases) {
    const result = runWcGoldenEvalOffline(row);
    const label = row.expectFail ? "negative" : "positive";
    assert.equal(
      result.passed,
      true,
      `${row.id} (${label}) failed: ${(result.issueCodes || []).join(", ")}`,
    );
  }
});
