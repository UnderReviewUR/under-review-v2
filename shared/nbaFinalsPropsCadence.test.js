import assert from "node:assert/strict";
import test from "node:test";
import {
  getNbaFinalsPregamePropsScrapeDelayMs,
  isNba2026FinalsMatchupGame,
  NBA_FINALS_LIVE_GAME_WINDOW_MS,
  NBA_FINALS_LIVE_PROPS_INTERVAL_MS,
  shouldScrapeNbaFinalsLiveProps,
} from "./nbaFinalsPropsCadence.js";

const MS_MIN = 60 * 1000;

test("isNba2026FinalsMatchupGame — Knicks vs Spurs only", () => {
  assert.equal(
    isNba2026FinalsMatchupGame({ awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" } }),
    true,
  );
  assert.equal(
    isNba2026FinalsMatchupGame({ awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "BOS" } }),
    false,
  );
});

test("getNbaFinalsPregamePropsScrapeDelayMs — continues through first half after tip", () => {
  const now = Date.now();
  const tip = now - 30 * MS_MIN;
  assert.equal(getNbaFinalsPregamePropsScrapeDelayMs(tip, now), NBA_FINALS_LIVE_PROPS_INTERVAL_MS);
  const tooLate = now - NBA_FINALS_LIVE_GAME_WINDOW_MS - MS_MIN;
  assert.equal(getNbaFinalsPregamePropsScrapeDelayMs(tooLate, now), null);
});

test("getNbaFinalsPregamePropsScrapeDelayMs — does not stop at T < 5m pre-tip", () => {
  const now = Date.now();
  const tip = now + 3 * MS_MIN;
  assert.equal(getNbaFinalsPregamePropsScrapeDelayMs(tip, now), 5 * MS_MIN);
});

test("shouldScrapeNbaFinalsLiveProps — live through regulation window, not after", () => {
  const now = Date.now();
  const tip = now - 20 * MS_MIN;
  const game = {
    state: "in",
    period: 2,
    homeTeam: { abbr: "NYK", score: 50 },
    awayTeam: { abbr: "SAS", score: 48 },
  };
  assert.equal(shouldScrapeNbaFinalsLiveProps(game, tip, now), true);
  assert.equal(
    shouldScrapeNbaFinalsLiveProps({ ...game, period: 3 }, tip, now),
    true,
  );
  const tooLate = now - NBA_FINALS_LIVE_GAME_WINDOW_MS - MS_MIN;
  assert.equal(
    shouldScrapeNbaFinalsLiveProps({ ...game, period: 4 }, tooLate, now),
    false,
  );
});
