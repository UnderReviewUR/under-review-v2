import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScrapeLastRunKvKey,
  etLocalTimeToUtcMs,
  getGolfRoundStartMsEt,
  getNextScrapeDelayMs,
  shouldRunScrapeForGame,
} from "./scrapeCadencePolicy.js";

const H = 60 * 60 * 1000;
const M = 60 * 1000;

test("getNextScrapeDelayMs ramp bands", () => {
  const now = Date.parse("2026-05-21T12:00:00.000Z");
  assert.equal(getNextScrapeDelayMs(now + 7 * H, now), 3 * H);
  assert.equal(getNextScrapeDelayMs(now + 4 * H, now), 60 * M);
  assert.equal(getNextScrapeDelayMs(now + 90 * M, now), 30 * M);
  assert.equal(getNextScrapeDelayMs(now + 45 * M, now), 15 * M);
  assert.equal(getNextScrapeDelayMs(now + 20 * M, now), 10 * M);
  assert.equal(getNextScrapeDelayMs(now + 3 * M, now), null);
  assert.equal(getNextScrapeDelayMs(now - 1, now), null);
});

test("shouldRunScrapeForGame respects interval and first run", () => {
  const start = Date.parse("2026-05-21T18:00:00.000Z");
  const now = start - 4 * H;
  assert.equal(shouldRunScrapeForGame(start, null, now), true);
  assert.equal(shouldRunScrapeForGame(start, now - 30 * M, now), false);
  assert.equal(shouldRunScrapeForGame(start, now - 61 * M, now), true);
});

test("buildScrapeLastRunKvKey", () => {
  assert.equal(buildScrapeLastRunKvKey("nba_props", "291185"), "scrape_last_run_nba_props_291185");
});

test("getGolfRoundStartMsEt — 8am ET", () => {
  const ms = getGolfRoundStartMsEt("2026-05-20");
  assert.ok(Number.isFinite(ms));
  const hour = parseInt(
    new Date(ms).toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }),
    10,
  );
  assert.equal(hour, 8);
});

test("etLocalTimeToUtcMs round-trip", () => {
  const ms = etLocalTimeToUtcMs("2026-05-20", 8, 0);
  const ymd = new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  assert.equal(ymd, "2026-05-20");
});
