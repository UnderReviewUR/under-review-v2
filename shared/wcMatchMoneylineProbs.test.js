import assert from "node:assert/strict";
import test from "node:test";
import {
  devigWcMatchMoneylineProbs,
  eloMatchWinProbabilityBar,
  resolveMatchWinProbabilityBar,
  roundProbSharesToPct,
} from "./wcMatchMoneylineProbs.js";

test("roundProbSharesToPct sums to 100", () => {
  const out = roundProbSharesToPct([0.2546, 0.2785, 0.4669]);
  assert.equal(out.reduce((n, x) => n + x, 0), 100);
});

test("devigWcMatchMoneylineProbs — 3-way BDL moneylines", () => {
  const out = devigWcMatchMoneylineProbs({
    home: { moneyline: "+250" },
    draw: { moneyline: "+220" },
    away: { moneyline: "-110" },
    provider: "draftkings",
  });
  assert.ok(out);
  assert.equal(out.homePct + out.drawPct + out.awayPct, 100);
  assert.ok(out.awayPct > out.homePct);
  assert.equal(out.bookLabel, "DraftKings");
  assert.deepEqual(out.moneylines, { home: "+250", draw: "+220", away: "-110" });
});

test("devigWcMatchMoneylineProbs rejects incomplete 1X2", () => {
  assert.equal(
    devigWcMatchMoneylineProbs({
      home: { moneyline: "+250" },
      away: { moneyline: "-110" },
      provider: "draftkings",
    }),
    null,
  );
});

test("devigWcMatchMoneylineProbs rejects garbage overround", () => {
  assert.equal(
    devigWcMatchMoneylineProbs({
      home: { moneyline: "+10000" },
      draw: { moneyline: "+10000" },
      away: { moneyline: "+10000" },
    }),
    null,
  );
});

test("resolveMatchWinProbabilityBar prefers fresh BDL market", () => {
  const teams = [
    { abbreviation: "KOR", eloRating: 1752, isHost: false },
    { abbreviation: "CZE", eloRating: 1825, isHost: false },
  ];
  const bar = resolveMatchWinProbabilityBar({
    homeAbbr: "KOR",
    awayAbbr: "CZE",
    teams,
    oddsStale: false,
    matchOdds: {
      home: { moneyline: "+220" },
      draw: { moneyline: "+240" },
      away: { moneyline: "+110" },
      provider: "fanduel",
    },
  });
  assert.equal(bar?.source, "bdl_market");
  assert.match(bar?.sourceLabel || "", /FanDuel/);
  assert.equal(bar.teamA.winPct + bar.draw + bar.teamB.winPct, 100);
});

test("resolveMatchWinProbabilityBar falls back to Elo when stale", () => {
  const teams = [
    { abbreviation: "KOR", eloRating: 1752, isHost: false },
    { abbreviation: "CZE", eloRating: 1825, isHost: false },
  ];
  const bar = resolveMatchWinProbabilityBar({
    homeAbbr: "KOR",
    awayAbbr: "CZE",
    teams,
    oddsStale: true,
    matchOdds: {
      home: { moneyline: "+220" },
      draw: { moneyline: "+240" },
      away: { moneyline: "+110" },
      provider: "fanduel",
    },
  });
  assert.equal(bar?.source, "elo_model");
  assert.equal(bar?.teamA.winPct, 29);
  assert.equal(bar?.draw, 27);
  assert.equal(bar?.teamB.winPct, 44);
});

test("eloMatchWinProbabilityBar matches KOR vs CZE static Elo", () => {
  const teams = [
    { abbreviation: "KOR", eloRating: 1752, isHost: false },
    { abbreviation: "CZE", eloRating: 1825, isHost: false },
  ];
  const bar = eloMatchWinProbabilityBar("KOR", "CZE", teams);
  assert.deepEqual(
    [bar?.teamA.winPct, bar?.draw, bar?.teamB.winPct],
    [29, 27, 44],
  );
});
