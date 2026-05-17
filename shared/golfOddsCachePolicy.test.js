import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGolfOddsFreshness,
  golfOddsCacheTtlMs,
  GOLF_ODDS_ROUND_REFRESH_MS,
  GOLF_ODDS_STALE_MS,
  isGolfTournamentEtDay,
  needsGolfOddsOpeningRefresh,
  shouldRefreshGolfOddsCache,
} from "./golfOddsCachePolicy.js";

test("golfOddsCacheTtlMs uses 60m during live round hours", () => {
  const ev = { state: "in", startDate: "2026-05-15", endDate: "2026-05-18" };
  const noonEt = Date.parse("2026-05-15T16:00:00.000Z");
  assert.equal(golfOddsCacheTtlMs(noonEt, ev), GOLF_ODDS_ROUND_REFRESH_MS);
});

test("buildGolfOddsFreshness flags stale after 2 hours", () => {
  const now = Date.parse("2026-05-15T18:00:00.000Z");
  const fetched = now - GOLF_ODDS_STALE_MS - 60_000;
  const fresh = buildGolfOddsFreshness(fetched, now);
  assert.equal(fresh.isStale, true);
  assert.match(String(fresh.staleWarning), /2 hours/i);
});

test("needsGolfOddsOpeningRefresh after 8am on tournament day", () => {
  const ev = { startDate: "2026-05-15", endDate: "2026-05-18" };
  const eightAmEt = Date.parse("2026-05-15T12:00:00.000Z");
  assert.equal(isGolfTournamentEtDay(ev, "2026-05-15"), true);
  assert.equal(
    needsGolfOddsOpeningRefresh({ fetchedAtMs: eightAmEt - 3_600_000 }, eightAmEt, ev),
    true,
  );
});

test("shouldRefreshGolfOddsCache when cache age exceeds ttl", () => {
  const ev = { state: "in", startDate: "2026-05-15", endDate: "2026-05-18" };
  const now = Date.parse("2026-05-15T16:00:00.000Z");
  assert.equal(
    shouldRefreshGolfOddsCache({ fetchedAtMs: now - GOLF_ODDS_ROUND_REFRESH_MS - 1 }, now, ev),
    true,
  );
});
