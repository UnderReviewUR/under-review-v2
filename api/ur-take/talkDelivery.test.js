import assert from "node:assert/strict";
import test from "node:test";
import { buildWcTalkContextSnippet } from "./talkDelivery.js";

test("buildWcTalkContextSnippet includes FIFA squad forwards and excludes Richarlison", () => {
  const snippet = buildWcTalkContextSnippet(
    { phase: "ROUND_OF_32", requiredEntities: ["BRA", "JPN"] },
    [
      {
        role: "assistant",
        structured: {
          fixtureHome: "BRA",
          fixtureAway: "JPN",
          call: "Neymar at +600 first goalscorer is the market chalk play",
          propBoardRows: [
            { label: "Neymar", odds: "+600", market: "first_goalscorer" },
            { label: "Ritsu Doan", odds: "+1500", market: "first_goalscorer" },
          ],
        },
      },
    ],
  );
  assert.match(snippet, /Fixture: BRA vs JPN/);
  assert.match(snippet, /BRA called-up forwards/i);
  assert.match(snippet, /Neymar/);
  assert.match(snippet, /Posted first goalscorer lines/i);
  assert.doesNotMatch(snippet, /Richarlison/i);
});
