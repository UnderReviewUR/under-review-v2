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

test("mergeWcFollowUpChips — group slate avoids parlay chips", () => {
  const merged = mergeWcFollowUpChips(
    "GROUP_SLATE",
    {
      wcIntent: WC_INTENT.STRUCTURAL,
      structured: {
        callType: "group_slate",
        call: "Colombia in Group K — best group-stage value (to advance).",
      },
    },
    "Best group stage bet?",
  );
  assert.ok(!merged.some((c) => /parlay/i.test(c)));
  assert.ok(merged.some((c) => /Colombia|Group K|advance|mispriced|runner-up/i.test(c)));
  assert.ok(!merged.some((c) => /Who else is live/i.test(c)));
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
