import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeGolfBoard } from "./todaySlateInputBundle.js";
import { normalizeGolfTournament } from "./homeEventPipeline/normalize.js";

test("sanitizeGolfBoard rejects tournaments outside Home 48h upcoming window", () => {
  const start = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const golf = {
    tournament: {
      id: "t-far",
      shortName: "Far Open",
      name: "Far Open",
      startDate: start,
      endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      state: "pre",
    },
    currentEvent: null,
  };
  assert.equal(normalizeGolfTournament(golf, Date.now()), null);
  assert.equal(sanitizeGolfBoard(golf), null);
});
