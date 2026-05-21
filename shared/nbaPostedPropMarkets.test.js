import assert from "node:assert/strict";
import test from "node:test";

import {
  countNbaActiveSlatePropSignals,
  nbaBoardHasPostedPropMarkets,
} from "./nbaPostedPropMarkets.js";

test("nbaBoardHasPostedPropMarkets detects Action Network propsOdds", () => {
  const board = {
    propLines: [],
    propsOdds: {
      hasPostedLines: true,
      players: [
        {
          name: "S. Gilgeous-Alexander",
          props: { points: { over: { line: 31.5 } } },
        },
      ],
    },
  };
  assert.equal(nbaBoardHasPostedPropMarkets(board), true);
  assert.ok(countNbaActiveSlatePropSignals(board) >= 1);
});
