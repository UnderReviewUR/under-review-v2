import assert from "node:assert/strict";
import test from "node:test";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  getWcContextFollowUpChips,
  mergeWcFollowUpChips,
  parseWcMatchupFromQuestion,
} from "./wcUrTakeFollowUps.js";

test("parseWcMatchupFromQuestion", () => {
  const p = parseWcMatchupFromQuestion("Who wins Spain vs Brazil?");
  assert.equal(p?.home, "Spain");
  assert.equal(p?.away, "Brazil");
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
