import assert from "node:assert/strict";
import test from "node:test";
import { probeOddsApiCredits } from "./_wcOutrightsFallback.js";

test("probeOddsApiCredits returns remaining=0 gracefully without key", async () => {
  const prev = process.env.ODDS_API_KEY;
  delete process.env.ODDS_API_KEY;
  const r = await probeOddsApiCredits();
  if (prev) process.env.ODDS_API_KEY = prev;
  assert.equal(r.ok, false);
  assert.equal(r.remaining, 0);
});
