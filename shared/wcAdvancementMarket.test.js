import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcAdvancementMarket,
  formatSimResultsForPrompt,
  formatWcAdvancementMarketContextLine,
  getWcAdvancementMarketContextLabel,
  getWcAdvancementMarketContextSuffix,
  isWcAdvancementMarketQuestion,
  detectGroupWinnerOutrightBleed,
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

test("classifyWcAdvancementMarket detects group winner", () => {
  assert.equal(
    classifyWcAdvancementMarket("Who wins Group E?"),
    WC_ADVANCEMENT_MARKET.GROUP_WINNER,
  );
  assert.equal(
    classifyWcAdvancementMarket("What's the best group-stage value bet right now?"),
    WC_ADVANCEMENT_MARKET.GROUP_WINNER,
  );
  assert.equal(
    classifyWcAdvancementMarket("Can USA advance from the group?"),
    WC_ADVANCEMENT_MARKET.GROUP_ESCAPE,
  );
});

test("groupWinPct tracks first place in group", () => {
  const sim = simulateTournament(WC_2026_TEAMS, { simCount: 8000 });
  const ecu = sim.teamStats.ECU;
  const ger = sim.teamStats.GER;
  assert.ok(Number.isFinite(ecu.groupWinPct));
  assert.ok(ecu.groupWinPct > 35 && ecu.groupWinPct < 60);
  assert.ok(ger.groupWinPct > 30 && ger.groupWinPct < 55);
  assert.equal(
    simPctForAdvancementMarket(ecu, WC_ADVANCEMENT_MARKET.GROUP_WINNER),
    ecu.groupWinPct,
  );
});

test("formatSimResultsForPrompt binds groupWinPct for group winner questions", () => {
  const sim = simulateTournament(WC_2026_TEAMS, { simCount: 1000 });
  const block = formatSimResultsForPrompt(sim, ["ECU"], "Who wins Group E?");
  assert.match(block, /groupWinPct|group winner/i);
});

test("classifyWcAdvancementMarket — Group D advancement path is group escape", () => {
  const q = "Which Group D advancement path is most mispriced?";
  assert.equal(classifyWcAdvancementMarket(q), WC_ADVANCEMENT_MARKET.GROUP_ESCAPE);
  assert.equal(isWcAdvancementMarketQuestion(q), true);
});

test("buildPriceBindingPromptBlock rejects outright odds for group winner STRUCTURAL", () => {
  const block = buildPriceBindingPromptBlock(
    "What's the best group-stage value bet right now?",
    [],
    WC_INTENT.STRUCTURAL,
  );
  assert.match(block, /groupWinPct/);
  assert.match(block, /NOT tournament winner/);
});

test("detectGroupWinnerOutrightBleed rejects Ecuador +8000 group winner take", () => {
  const sim = simulateTournament(WC_2026_TEAMS, { simCount: 3000 });
  const badTake =
    "Ecuador at +8000 is the group-stage value play — they win Group E over Germany. UR sims ~+4200 implied.";
  const hit = detectGroupWinnerOutrightBleed(
    badTake,
    "What's the best group-stage value bet right now?",
    sim.teamStats,
    ["ECU"],
  );
  assert.ok(hit);
  assert.equal(hit.reason, "group_winner_tournament_outright_bleed");
});

test("detectGroupWinnerOutrightBleed allows +400 group winner price", () => {
  const sim = simulateTournament(WC_2026_TEAMS, { simCount: 3000 });
  const okTake = "Lean Ivory Coast +400 to win Group E — thin edge over the field.";
  const hit = detectGroupWinnerOutrightBleed(
    okTake,
    "Who wins Group E?",
    sim.teamStats,
    ["CIV"],
  );
  assert.equal(hit, null);
});
