import test from "node:test";
import assert from "node:assert/strict";
import {
  isWcBdlSource,
  shouldPreferBdlRefreshOverKv,
  getBdlRequestDelayMs,
  BDL_FREE_TIER_REQUEST_DELAY_MS,
  BDL_GOAT_TIER_REQUEST_DELAY_MS,
  wcGoatMatchPlayerPropsNeedsLiveRefresh,
  WC_GOAT_MATCH_PROPS_LIVE_MAX_AGE_MS,
} from "./wcBdlPolicy.js";

test("isWcBdlSource recognizes BDL variants", () => {
  assert.equal(isWcBdlSource("balldontlie"), true);
  assert.equal(isWcBdlSource("balldontlie_live"), true);
  assert.equal(isWcBdlSource("balldontlie_players_rosters"), true);
  assert.equal(isWcBdlSource("espn"), false);
});

test("shouldPreferBdlRefreshOverKv returns false when GOAT off", () => {
  const prev = process.env.WC_BDL_GOAT_PRIMARY;
  process.env.WC_BDL_GOAT_PRIMARY = "0";
  process.env.BALLDONTLIE_API_KEY = "";
  assert.equal(shouldPreferBdlRefreshOverKv({ source: "espn" }), false);
  if (prev === undefined) delete process.env.WC_BDL_GOAT_PRIMARY;
  else process.env.WC_BDL_GOAT_PRIMARY = prev;
});

test("getBdlRequestDelayMs defaults to GOAT tier pacing", () => {
  const keys = ["WC_BDL_REQUEST_DELAY_MS", "WC_BDL_FREE_TIER"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  assert.equal(getBdlRequestDelayMs(), BDL_GOAT_TIER_REQUEST_DELAY_MS);
  process.env.WC_BDL_FREE_TIER = "1";
  assert.equal(getBdlRequestDelayMs(), BDL_FREE_TIER_REQUEST_DELAY_MS);
  delete process.env.WC_BDL_FREE_TIER;
  process.env.WC_BDL_REQUEST_DELAY_MS = "250";
  assert.equal(getBdlRequestDelayMs(), 250);
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("wcGoatMatchPlayerPropsNeedsLiveRefresh — empty, stale, and live fixtures", () => {
  const nowMs = 1_700_000_000_000;
  assert.equal(wcGoatMatchPlayerPropsNeedsLiveRefresh(null, { nowMs }), true);
  assert.equal(
    wcGoatMatchPlayerPropsNeedsLiveRefresh(
      { source: "balldontlie", lastUpdated: nowMs - WC_GOAT_MATCH_PROPS_LIVE_MAX_AGE_MS - 1 },
      { nowMs },
    ),
    true,
  );
  assert.equal(
    wcGoatMatchPlayerPropsNeedsLiveRefresh(
      { source: "balldontlie", lastUpdated: nowMs - 60_000 },
      { nowMs, matchStatus: "live" },
    ),
    true,
  );
  assert.equal(
    wcGoatMatchPlayerPropsNeedsLiveRefresh(
      { source: "balldontlie", lastUpdated: nowMs - 60_000 },
      { nowMs, matchStatus: "NS" },
    ),
    false,
  );
});
