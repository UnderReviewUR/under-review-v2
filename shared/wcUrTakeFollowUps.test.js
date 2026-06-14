import assert from "node:assert/strict";
import test from "node:test";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  getWcContextFollowUpChips,
  mergeWcFollowUpChips,
  parseWcMatchupFromQuestion,
} from "./wcUrTakeFollowUps.js";

test("getWcContextFollowUpChips — generic player props avoids What misprice chip", () => {
  const q = "What are the best player props for the remaining matches?";
  const chips = getWcContextFollowUpChips({ wcIntent: WC_INTENT.PLAYER_PROP }, q);
  assert.ok(!chips.some((c) => /mispriced instead of What/i.test(c)));
  assert.ok(chips.some((c) => /player parlay|anytime scorer|group stage/i.test(c)));
});

test("parseWcMatchupFromQuestion — player props fixture returns null", () => {
  assert.equal(parseWcMatchupFromQuestion("Best player props for Ecuador vs Ivory Coast?"), null);
});

test("parseWcMatchupFromQuestion", () => {
  const p = parseWcMatchupFromQuestion("Who wins Spain vs Brazil?");
  assert.equal(p?.home, "ESP");
  assert.equal(p?.away, "BRA");
});

test("getWcContextFollowUpChips — fixture player props avoids mangled who wins chip", () => {
  const q = "Best player props for Ecuador vs Ivory Coast?";
  const chips = getWcContextFollowUpChips({ wcIntent: WC_INTENT.PLAYER_PROP }, q);
  assert.ok(!chips.some((c) => /Who wins Best player props/i.test(c)));
  assert.ok(chips.some((c) => /CIV vs ECU|parlay/i.test(c)));
});

test("getWcContextFollowUpChips uses wcMatchTeams", () => {
  const chips = getWcContextFollowUpChips(
    { wcMatchTeams: { home: "France", away: "Germany" }, wcEventId: "1" },
    "Who wins France vs Germany?",
  );
  assert.ok(chips[0].includes("France"));
  assert.ok(chips.length >= 2);
});

test("mergeWcFollowUpChips — group slate without runner-up anchor gates runner-up chip", () => {
  const merged = mergeWcFollowUpChips(
    "GROUP_SLATE",
    {
      wcIntent: WC_INTENT.STRUCTURAL,
      structured: {
        callType: "group_slate",
        call: "Paraguay in Group D — best group-stage value (to advance).",
        groupLetter: "D",
      },
    },
    "Best group stage bet?",
  );
  assert.ok(!merged.some((c) => /parlay/i.test(c)));
  assert.ok(merged.some((c) => /Who wins Group D/i.test(c)));
  assert.ok(!merged.some((c) => /runner-up value/i.test(c)));
  assert.ok(!merged.some((c) => /Who else is live/i.test(c)));
});

test("mergeWcFollowUpChips — cross-group with runnerUpGroupLetter keeps runner-up chip", () => {
  const merged = mergeWcFollowUpChips(
    "GROUP_SLATE",
    {
      wcIntent: WC_INTENT.STRUCTURAL,
      structured: {
        callType: "group_slate",
        call: "Group D most mispriced (#1); Group K runner-up",
        groupLetter: "D",
        runnerUpGroupLetter: "K",
        runnerUpTeamAbbr: "COD",
      },
    },
    "Best group stage bet?",
  );
  assert.ok(merged.some((c) => /runner-up value/i.test(c)));
});

test("mergeWcFollowUpChips prefers context", () => {
  const merged = mergeWcFollowUpChips(
    "PLAYER_MARKET_PASS",
    { wcMatchTeams: { home: "USA", away: "Mexico" }, wcIntent: "GOLDEN_BOOT" },
    "Golden Boot value on Mbappé?",
  );
  assert.ok(merged[0].includes("USA") || merged.some((c) => /mispriced/i.test(c)));
  assert.equal(merged.length, 3);
});

test("getWcContextFollowUpChips skips who-wins after matchup who-wins question", () => {
  const chips = getWcContextFollowUpChips(
    {
      wcMatchTeams: { home: "USA", away: "PAR" },
      wcIntent: WC_INTENT.MATCHUP,
      structured: { callType: "matchup", fixtureHome: "USA", fixtureAway: "PAR" },
    },
    "Who wins USA vs PAR (Group D)?",
  );
  assert.ok(!chips.some((c) => /^Who wins USA vs PAR/i.test(c)));
  assert.ok(chips.some((c) => /besides the moneyline/i.test(c)));
});

test("getWcContextFollowUpChips offers other side after totals lean", () => {
  const chips = getWcContextFollowUpChips(
    {
      wcMatchTeams: { home: "GER", away: "CUW" },
      wcIntent: WC_INTENT.MATCHUP,
      structured: { callType: "matchup", call: "Lean Over 4.5 goals" },
    },
    "Best bet on GER vs CUW if I only know the moneyline?",
  );
  assert.ok(chips.some((c) => /other side/i.test(c)));
  assert.ok(!chips.some((c) => /^Over or under goals\?$/i.test(c)));
});

test("getWcContextFollowUpChips skips both-advance for CIV vs ECU when Germany blocks", () => {
  const chips = getWcContextFollowUpChips(
    {
      wcMatchTeams: { home: "CIV", away: "ECU" },
      wcIntent: WC_INTENT.MATCHUP,
      structured: {
        callType: "matchup",
        call: "Lean Under 2.5 goals",
        lean: "Pass on ML — Lean Under 2.5 goals — cleaner angle than the ML.",
        teamStats: {
          CIV: { advancePct: 45 },
          ECU: { advancePct: 62 },
          GER: { advancePct: 58 },
        },
      },
    },
    "Best bet on CIV vs ECU if I only know the moneyline?",
  );
  assert.ok(!chips.some((c) => /both teams to advance/i.test(c)));
});
