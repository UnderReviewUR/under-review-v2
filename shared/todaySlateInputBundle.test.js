import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeGolfBoard } from "./todaySlateInputBundle.js";
import { normalizeGolfTournament } from "./homeEventPipeline/normalize.js";

test("sanitizeGolfBoard rejects tournaments outside Home 14d upcoming window", () => {
  const start = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString();
  const golf = {
    tournament: {
      id: "t-far",
      shortName: "Far Open",
      name: "Far Open",
      startDate: start,
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      state: "pre",
    },
    currentEvent: null,
  };
  assert.equal(normalizeGolfTournament(golf, Date.now()), null);
  assert.equal(sanitizeGolfBoard(golf), null);
});
