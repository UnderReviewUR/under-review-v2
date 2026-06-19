import assert from "node:assert/strict";
import test from "node:test";
import { buildWcTakeAwareFollowUpChips } from "./wcTakeAwareFollowUps.js";

test("prop board chip uses lead player nation not blind away team", () => {
  const chips = buildWcTakeAwareFollowUpChips(
    {
      structured: {
        cardType: "prop_board",
        fixtureHome: "AUS",
        fixtureAway: "USA",
        call: "Australia vs United States — top player props",
        lean: [
          "1. Jackson Irvine over 0.5 shots -177",
          "2. Christian Pulisic over 0.5 shots -2500",
        ].join("\n"),
        propBoardRows: [
          {
            label: "Jackson Irvine",
            market: "player_shots_ou",
            odds: "-177",
            nationAbbr: "AUS",
          },
          {
            label: "Christian Pulisic",
            market: "player_shots_ou",
            odds: "-2500",
            nationAbbr: "USA",
          },
        ],
      },
    },
    "best player props for usa vs australia?",
    [],
  );
  assert.ok(chips.some((c) => /juice or still playable/i.test(c)));
  assert.ok(chips.some((c) => /Jackson Irvine/i.test(c)));
  assert.doesNotMatch(chips.join(" "), /United States scorer value besides Jackson Irvine/i);
  assert.doesNotMatch(chips.join(" "), /Best United States shot line besides Jackson Irvine/i);
});

test("prop board chip names Australia for AUS lead on shots board", () => {
  const chips = buildWcTakeAwareFollowUpChips(
    {
      structured: {
        cardType: "prop_board",
        fixtureHome: "AUS",
        fixtureAway: "USA",
        call: "Australia vs United States — top player props",
        lean: "1. Miloš Degenek over 1 shots +150",
        propBoardRows: [
          {
            label: "Miloš Degenek",
            market: "player_shots_ou",
            odds: "+150",
            nationAbbr: "AUS",
          },
        ],
      },
    },
    "",
    [],
  );
  assert.ok(chips.some((c) => /Australia shot line besides Miloš Degenek/i.test(c)));
});
