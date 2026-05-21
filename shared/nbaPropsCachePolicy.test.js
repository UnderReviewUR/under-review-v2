import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNbaPropsFreshness,
  nbaPropsCacheTtlMs,
  shouldRefreshNbaPropsCache,
} from "./nbaPropsCachePolicy.js";

describe("nbaPropsCachePolicy", () => {
  it("uses 10 min TTL within 2 hours of tipoff", () => {
    const tipoff = Date.now() + 60 * 60 * 1000;
    assert.equal(nbaPropsCacheTtlMs(Date.now(), tipoff), 10 * 60 * 1000);
  });

  it("uses 30 min TTL outside tipoff window", () => {
    const tipoff = Date.now() + 5 * 60 * 60 * 1000;
    assert.equal(nbaPropsCacheTtlMs(Date.now(), tipoff), 30 * 60 * 1000);
  });

  it("marks stale after 1 hour for UR Take", () => {
    const fetchedAtMs = Date.now() - 61 * 60 * 1000;
    const fresh = buildNbaPropsFreshness(fetchedAtMs);
    assert.equal(fresh.isStale, true);
    assert.match(String(fresh.staleWarning || ""), /1 hour/i);
  });

  it("shouldRefresh when cache age exceeds TTL", () => {
    const now = Date.now();
    const tipoff = now + 30 * 60 * 1000;
    const cached = { fetchedAtMs: now - 11 * 60 * 1000, tipoffMs: tipoff };
    assert.equal(shouldRefreshNbaPropsCache(cached, now), true);
  });
});
