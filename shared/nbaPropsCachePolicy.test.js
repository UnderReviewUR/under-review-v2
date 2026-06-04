import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNbaPropsFreshness,
  NBA_PROPS_LIVE_STALE_MS,
  NBA_PROPS_LIVE_TTL_MS,
  nbaPropsCacheTtlMs,
} from "./nbaPropsCachePolicy.js";

test("nbaPropsCacheTtlMs — live Finals uses 12m TTL", () => {
  assert.equal(nbaPropsCacheTtlMs(Date.now(), null, { isLive: true }), NBA_PROPS_LIVE_TTL_MS);
});

test("buildNbaPropsFreshness — live game stale at 15m", () => {
  const fetchedAtMs = Date.now() - NBA_PROPS_LIVE_STALE_MS - 60 * 1000;
  const fresh = buildNbaPropsFreshness(fetchedAtMs, Date.now(), { isLive: true });
  assert.equal(fresh.isStale, true);
  assert.equal(fresh.maxAgeMinutes, 15);
  assert.match(String(fresh.staleWarning || ""), /live game/i);
});

test("buildNbaPropsFreshness — fresh live props under 15m", () => {
  const fetchedAtMs = Date.now() - 8 * 60 * 1000;
  const fresh = buildNbaPropsFreshness(fetchedAtMs, Date.now(), { isLive: true });
  assert.equal(fresh.isStale, false);
  assert.equal(fresh.maxAgeMinutes, 15);
});
