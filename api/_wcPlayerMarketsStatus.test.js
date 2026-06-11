import assert from "node:assert/strict";
import test from "node:test";
import { buildWcPlayerMarketsStatus } from "./_wcPlayerMarketsStatus.js";

test("buildWcPlayerMarketsStatus exposes alerts block", async () => {
  const status = await buildWcPlayerMarketsStatus();
  assert.equal(status.ok, true);
  assert.ok(status.alerts);
  assert.ok("goldenBootStaleHours" in status.alerts);
  assert.ok("goldenGloveStaleHours" in status.alerts);
  assert.ok("playerRegistryCoverage" in status.alerts);
  assert.ok(status.goldenGlove);
  assert.ok("activeInjuriesCount" in status.alerts);
  assert.ok(status.scrapeFlags);
});
