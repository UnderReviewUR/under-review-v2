import assert from "node:assert/strict";
import test from "node:test";
import {
  extractWcPerTeamPlayerPropCount,
  isGenericWcPlayerPropQuestion,
  isWcPerTeamPlayerPropsQuestion,
  prefersWcFixtureScorerIntelFallback,
} from "./wcUrTakePlayerMarket.js";
import {
  buildWcFixturePlayerPropsListStructured,
  buildWcFixtureScorerIntelStructured,
  resolveWcPlayerMarketAnswer,
} from "./wcPlayerMarketResolve.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { classifyWcVerdictForUi, getVerdictNextLine } from "./wcUrTakeVerdict.js";

test("prefersWcFixtureScorerIntelFallback — generic player props on this match", () => {
  const q = "What are player props to consider for this match?";
  assert.equal(isGenericWcPlayerPropQuestion(q), true);
  assert.equal(prefersWcFixtureScorerIntelFallback(q), false);
});

test("prefersWcFixtureScorerIntelFallback — scorer from each team", () => {
  const q =
    "Who's most likely to score from each team? And who will lead each team in passes?";
  assert.equal(prefersWcFixtureScorerIntelFallback(q), true);
});

test("isWcPerTeamPlayerPropsQuestion — 3 per side ask", () => {
  const q = "provide 3 top player props from each team";
  assert.equal(isWcPerTeamPlayerPropsQuestion(q), true);
  assert.equal(extractWcPerTeamPlayerPropCount(q), 3);
});

test("buildWcFixturePlayerPropsListStructured — per-team sections", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const structured = buildWcFixturePlayerPropsListStructured(
    "provide 3 top player props from each team",
    "market_only",
    { matchPlayerProps: eventPayload, wcEventId: "760416" },
    { requiredEntities: ["FRA", "BRA"], conversationHistory: [] },
  );
  assert.ok(structured);
  assert.match(structured.call, /3 props per side/i);
  assert.match(structured.lean, /France \(FRA\)/i);
  assert.match(structured.lean, /Brazil \(BRA\)/i);
});

test("buildWcFixtureScorerIntelStructured — PK taker row omits Golden Boot price", () => {
  const structured = buildWcFixtureScorerIntelStructured(
    "Who's most likely to score from each team?",
    "market_only",
    {
      goldenBoot: {
        rows: [{ name: "Kylian Mbappé", nationAbbr: "FRA", americanOdds: "+600" }],
      },
    },
    { requiredEntities: ["FRA", "SEN"], conversationHistory: [] },
  );
  assert.ok(structured);
  assert.match(structured.lean, /PK taker/i);
  assert.doesNotMatch(structured.lean, /\+600/);
});

test("resolveWcPlayerMarketAnswer — generic props pass, not PK intel", () => {
  const resolved = resolveWcPlayerMarketAnswer(
    "What are player props to consider for this match?",
    WC_INTENT.PLAYER_PROP,
    {
      wcEventId: "760416",
      requiredEntities: ["FRA", "SEN"],
      conversationHistory: [
        {
          role: "assistant",
          structured: { fixtureHome: "FRA", fixtureAway: "SEN" },
        },
      ],
    },
    {
      goldenBoot: { rows: [{ name: "Kylian Mbappé", nationAbbr: "FRA", americanOdds: "+600" }] },
      matchPlayerProps: null,
      wcEventId: "760416",
    },
  );
  assert.equal(resolved.structured?.call?.includes("PK taker"), false);
  assert.match(resolved.structured?.whyNow || "", /MATCH PLAYER PROPS|posted match lines/i);
});

test("classifyWcVerdictForUi — posted props use PLAYER_MARKET_POSTED next line", () => {
  const verdict = classifyWcVerdictForUi({
    sport: "worldcup",
    wcIntent: "PLAYER_PROP",
    structured: {
      callType: "player_market_verified",
      lean: "1. Kylian Mbappé anytime scorer -130",
      whyNow: "Posted anytime scorer lines for France vs Senegal.",
    },
  });
  assert.equal(verdict, "PLAYER_MARKET_POSTED");
  assert.match(getVerdictNextLine(verdict), /parlay/i);
  assert.doesNotMatch(getVerdictNextLine(verdict), /lineups are pending/i);
});
