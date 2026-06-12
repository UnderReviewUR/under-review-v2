import assert from "node:assert/strict";
import test from "node:test";
import { pickWcFeaturedMatch, sortWcTodayMatches } from "./wcFeaturedMatch.js";

test("pickWcFeaturedMatch prefers tonight before future upcoming", () => {
  const nowMs = Date.parse("2026-06-11T18:00:00-04:00");
  const featured = pickWcFeaturedMatch({
    nowMs,
    matches: [
      {
        id: "future",
        homeTeam: "QAT",
        awayTeam: "SUI",
        status: "NS",
        date: "2026-06-13",
        time: "15:00 ET",
        commenceTs: Date.parse("2026-06-13T19:00:00Z"),
      },
      {
        id: "tonight",
        homeTeam: "USA",
        awayTeam: "PAR",
        status: "NS",
        date: "2026-06-11",
        time: "21:00 ET",
        commenceTs: Date.parse("2026-06-12T01:00:00Z"),
      },
    ],
    liveMatches: [],
  });
  assert.equal(featured?.match?.id, "tonight");
  assert.equal(featured?.kicker, "Tonight");
});

test("pickWcFeaturedMatch live beats scheduled", () => {
  const featured = pickWcFeaturedMatch({
    matches: [
      { id: "live", homeTeam: "MEX", awayTeam: "RSA", status: "live", commenceTs: 100 },
      { id: "next", homeTeam: "USA", awayTeam: "PAR", status: "NS", commenceTs: 200 },
    ],
    liveMatches: [{ id: "live", homeTeam: "MEX", awayTeam: "RSA", status: "live", commenceTs: 100 }],
  });
  assert.equal(featured?.match?.id, "live");
  assert.equal(featured?.kind, "live");
});

test("sortWcTodayMatches orders by kickoff", () => {
  const todayEt = "2026-06-11";
  const sorted = sortWcTodayMatches(
    [
      {
        id: "late",
        date: "2026-06-11",
        time: "21:00 ET",
        commenceTs: Date.parse("2026-06-12T01:00:00Z"),
      },
      {
        id: "early",
        date: "2026-06-11",
        time: "15:00 ET",
        commenceTs: Date.parse("2026-06-11T19:00:00Z"),
      },
    ],
    todayEt,
  );
  assert.deepEqual(sorted.map((m) => m.id), ["early", "late"]);
});
