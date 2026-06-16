import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMatchDetailMeta,
  buildStaticGroupsFallback,
  mergeWcLiveScorePatches,
  shouldCheckWcLiveScores,
} from "./_wcData.js";

test("buildStaticGroupsFallback returns 12 groups with corrected teams", () => {
  const groups = buildStaticGroupsFallback();
  assert.equal(Object.keys(groups).length, 12);
  assert.deepEqual(
    groups.A.map((r) => r.team).sort(),
    ["CZE", "KOR", "MEX", "RSA"].sort(),
  );
  assert.deepEqual(
    groups.B.map((r) => r.team).sort(),
    ["BIH", "CAN", "QAT", "SUI"].sort(),
  );
  assert.deepEqual(
    groups.F.map((r) => r.team).sort(),
    ["JPN", "NED", "SWE", "TUN"].sort(),
  );
});

test("buildMatchDetailMeta unavailable when no KV row", () => {
  assert.deepEqual(buildMatchDetailMeta(null), {
    lineupConfirmed: false,
    xiStatus: "unavailable",
    lastUpdated: null,
    dataConfidence: "pre_match_estimate",
  });
});

test("buildMatchDetailMeta pending when detail exists but XI not confirmed", () => {
  const meta = buildMatchDetailMeta({
    lineupConfirmed: false,
    lastUpdated: 1710000000000,
    injuries: [{ player: "A" }],
  });
  assert.equal(meta.xiStatus, "pending");
  assert.equal(meta.lineupConfirmed, false);
  assert.equal(meta.lastUpdated, 1710000000000);
  assert.equal(meta.dataConfidence, "limited_intel");
});

test("buildMatchDetailMeta confirmed when lineupConfirmed true", () => {
  const meta = buildMatchDetailMeta({
    lineupConfirmed: true,
    lastUpdated: 1710000001000,
  });
  assert.equal(meta.xiStatus, "confirmed");
  assert.equal(meta.lineupConfirmed, true);
  assert.equal(meta.dataConfidence, "confirmed");
});

test("mergeWcLiveScorePatches updates live scores by event id", () => {
  const { matches, changed } = mergeWcLiveScorePatches(
    [{ id: "760425", homeTeam: "NED", awayTeam: "JPN", homeScore: 2, awayScore: 1, status: "live" }],
    [{ id: "760425", homeScore: 2, awayScore: 2, status: "live" }],
  );
  assert.equal(changed, true);
  assert.equal(matches[0].awayScore, 2);
});

test("mergeWcLiveScorePatches matches BDL id when ESPN event id differs", () => {
  const { matches, changed } = mergeWcLiveScorePatches(
    [
      {
        id: "13",
        bdlMatchId: 13,
        homeTeam: "ESP",
        awayTeam: "CPV",
        date: "2026-06-15",
        homeScore: 0,
        awayScore: 0,
        status: "live",
      },
    ],
    [
      {
        bdlMatchId: 13,
        homeTeam: "ESP",
        awayTeam: "CPV",
        date: "2026-06-15",
        homeScore: 1,
        awayScore: 0,
        status: "live",
      },
    ],
  );
  assert.equal(changed, true);
  assert.equal(matches[0].homeScore, 1);
});

test("shouldCheckWcLiveScores runs before KV marks a fixture live at kickoff", () => {
  const kickoff = Date.parse("2026-06-16T01:00:00.000Z"); // 9pm ET Jun 15
  const nowMs = kickoff + 10 * 60 * 1000;
  const kv = {
    matches: [
      {
        id: 16,
        homeTeam: "IRN",
        awayTeam: "NZL",
        status: "NS",
        date: "2026-06-16",
        time: "01:00",
        commenceTs: kickoff,
      },
    ],
  };
  assert.equal(shouldCheckWcLiveScores(kv, nowMs), true);
});

test("shouldCheckWcLiveScores skips far-future scheduled fixtures", () => {
  const nowMs = Date.parse("2026-06-15T18:00:00-04:00");
  const kv = {
    matches: [
      {
        id: 38,
        homeTeam: "BEL",
        awayTeam: "IRN",
        status: "NS",
        date: "2026-06-21",
        time: "19:00",
        commenceTs: Date.parse("2026-06-21T23:00:00Z"),
      },
    ],
  };
  assert.equal(shouldCheckWcLiveScores(kv, nowMs), false);
});

test("mergeWcLiveScorePatches promotes NS to live by team pair when dates differ", () => {
  const { matches, changed } = mergeWcLiveScorePatches(
    [
      {
        id: 16,
        homeTeam: "IRN",
        awayTeam: "NZL",
        date: "2026-06-16",
        homeScore: null,
        awayScore: null,
        status: "NS",
      },
    ],
    [
      {
        homeTeam: "IRN",
        awayTeam: "NZL",
        date: "2026-06-15",
        homeScore: 0,
        awayScore: 0,
        status: "live",
      },
    ],
  );
  assert.equal(changed, true);
  assert.equal(matches[0].status, "live");
  assert.equal(matches[0].homeScore, 0);
  assert.equal(matches[0].awayScore, 0);
});
