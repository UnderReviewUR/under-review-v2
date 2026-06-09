import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcAdvancementMarket,
  formatSimResultsForPrompt,
  formatWcAdvancementMarketContextLine,
  getWcAdvancementMarketContextLabel,
  getWcAdvancementMarketContextSuffix,
  isWcAdvancementMarketQuestion,
  simPctForAdvancementMarket,
  WC_ADVANCEMENT_MARKET,
} from "./wcAdvancementMarket.js";
import { simulateTournament } from "./wcTournamentSim.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { normalizeWcStructuredForDelivery } from "./wcUrTakeStructured.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { buildPriceBindingPromptBlock } from "./wcUrTakePricing.js";

test("classifyWcAdvancementMarket detects Round of 16 reach", () => {
  assert.equal(
    classifyWcAdvancementMarket("Will the USMNT reach the Round of 16?"),
    WC_ADVANCEMENT_MARKET.ROUND_OF_16,
  );
});

test("classifyWcAdvancementMarket detects group escape", () => {
  assert.equal(
    classifyWcAdvancementMarket("Can USA advance from the group?"),
    WC_ADVANCEMENT_MARKET.GROUP_ESCAPE,
  );
});

test("USA r16Pct is well below advancePct in sim output", () => {
  const sim = simulateTournament(WC_2026_TEAMS, { simCount: 5000 });
  const usa = sim.teamStats.USA;
  assert.ok(usa.r16Pct < usa.advancePct);
  assert.equal(
    simPctForAdvancementMarket(usa, WC_ADVANCEMENT_MARKET.ROUND_OF_16),
    usa.r16Pct,
  );
});

test("formatSimResultsForPrompt binds R16 stat for R16 questions", () => {
  const sim = simulateTournament(WC_2026_TEAMS, { simCount: 1000 });
  const block = formatSimResultsForPrompt(
    sim,
    ["USA"],
    "Will the USMNT reach the Round of 16?",
  );
  assert.match(block, /SIM STAT BINDING/);
  assert.match(block, /R16 reach/);
  assert.match(block, /r16Pct/);
  assert.doesNotMatch(block, /advance 52/);
});

test("normalizeWcStructuredForDelivery uses advancement callType for R16 pricing", () => {
  const out = normalizeWcStructuredForDelivery(
    { call: "Pass at -115", lean: "Pass", whyNow: "Thin edge", edge: "Watch Paraguay" },
    WC_INTENT.ENTITY_PRICING,
    "Will the USMNT reach the Round of 16?",
    ["USA"],
  );
  assert.equal(out.callType, "advancement");
});

test("buildPriceBindingPromptBlock rejects outright odds for R16 market", () => {
  const block = buildPriceBindingPromptBlock(
    "Will the USMNT reach the Round of 16?",
    ["USA"],
    WC_INTENT.ENTITY_PRICING,
  );
  assert.match(block, /NOT tournament winner/);
  assert.match(block, /r16Pct/);
});

test("getWcAdvancementMarketContextLabel returns Round of 16", () => {
  assert.equal(
    getWcAdvancementMarketContextLabel("Will the USMNT reach the Round of 16?"),
    "Round of 16",
  );
});

test("formatWcAdvancementMarketContextLine uses Futures not Tonight", () => {
  assert.equal(
    formatWcAdvancementMarketContextLine("Will the USMNT reach the Round of 16?"),
    "Round of 16 · Futures",
  );
  assert.equal(getWcAdvancementMarketContextSuffix(true), "Live");
});

test("isWcAdvancementMarketQuestion is true for R16 reach", () => {
  assert.equal(isWcAdvancementMarketQuestion("Will the USMNT reach the Round of 16?"), true);
  assert.equal(isWcAdvancementMarketQuestion("Who wins the World Cup?"), false);
});
