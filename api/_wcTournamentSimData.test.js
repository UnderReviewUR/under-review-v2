import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcStandingsFingerprint,
  completedMatchesForSim,
  isWcTournamentSimCacheValid,
} from "./_wcTournamentSimData.js";

test("buildWcStandingsFingerprint changes when group points change", () => {
  const base = {
    A: [{ team: "MEX", points: 0, gd: 0, gf: 0, played: 0 }],
  };
  const updated = {
    A: [{ team: "MEX", points: 3, gd: 2, gf: 2, played: 1 }],
  };
  const fp1 = buildWcStandingsFingerprint(base, 0);
  const fp2 = buildWcStandingsFingerprint(updated, 1);
  assert.notEqual(fp1, fp2);
});

test("completedMatchesForSim drops promo placeholder ids", () => {
  const rows = completedMatchesForSim([
    { id: "wc-promo-mex-rsa", homeTeam: "MEX", awayTeam: "RSA", status: "FT" },
    { id: "760415", homeTeam: "MEX", awayTeam: "RSA", status: "FT" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "760415");
});

test("isWcTournamentSimCacheValid rejects fingerprint mismatch", () => {
  const now = Date.now();
  const cached = {
    teamStats: { FRA: { winPct: 10 } },
    simCount: 1000,
    fingerprint: "old",
    lastUpdated: now,
  };
  assert.equal(isWcTournamentSimCacheValid(cached, "new", 60_000, now), false);
  assert.equal(isWcTournamentSimCacheValid(cached, "old", 60_000, now), true);
});
