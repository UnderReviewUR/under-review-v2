import test from "node:test";
import assert from "node:assert/strict";
import { runWcGroundingQA } from "./wcUrTakeGroundingQA.js";

test("runWcGroundingQA flags invented xG", () => {
  const qa = runWcGroundingQA("France are ahead on xG 1.4 to 0.8 right now.", []);
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_invented_xg_claim"));
});

test("runWcGroundingQA flags possession without match intel", () => {
  const qa = runWcGroundingQA("Spain are controlling 62% possession in this half.", []);
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_invented_possession_claim"));
});

test("runWcGroundingQA passes when possession matches intel", () => {
  const qa = runWcGroundingQA("Spain have 58% possession so far.", [
    {
      teamStats: {
        home: { possessionPct: 58, shots: 6 },
        away: { possessionPct: 42, shots: 3 },
      },
    },
  ]);
  assert.equal(qa.passed, true);
});
