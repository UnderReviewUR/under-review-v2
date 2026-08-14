import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNflHomeScoreRows,
  classifyNflGamePhase,
  formatNflClock,
  formatNflGameStateLine,
  formatNflLiveClockLine,
  formatNflPregameMeta,
  nflScoreboardNeedsFastPoll,
} from "./nflGameState.js";

test("scheduled before kickoff is pregame", () => {
  const tip = Date.parse("2026-09-13T17:00:00.000Z");
  assert.equal(classifyNflGamePhase({ status: "scheduled", tipoffMs: tip }, tip - 60_000), "pregame");
  assert.match(formatNflGameStateLine({ status: "scheduled", tipoffMs: tip }, tip - 60_000), /pregame/);
});

test("inprogress is live even before we have a score", () => {
  assert.equal(classifyNflGamePhase({ status: "inprogress" }), "live");
  assert.equal(formatNflGameStateLine({ status: "inprogress" }), "LIVE");
});

test("final is final", () => {
  assert.equal(classifyNflGamePhase({ status: "final" }), "final");
  assert.equal(formatNflGameStateLine({ status: "closed" }), "final");
});

test("scheduled past kickoff stays pregame — do not invent LIVE", () => {
  const tip = Date.parse("2026-08-14T23:00:00.000Z");
  const now = tip + 15 * 60 * 1000;
  assert.equal(classifyNflGamePhase({ status: "scheduled", tipoffMs: tip }, now), "pregame");
  assert.match(formatNflGameStateLine({ status: "scheduled", tipoffMs: tip }, now), /pregame/);
});

test("formatNflClock drops 00:00 and a leading hour zero", () => {
  assert.equal(formatNflClock("00:00"), "");
  assert.equal(formatNflClock("06:42"), "6:42");
  assert.equal(formatNflClock("12:08"), "12:08");
});

test("live clock line is quarter + clock, HT, or OT", () => {
  assert.equal(formatNflLiveClockLine({ period: 2, clock: "06:42", status: "inprogress" }), "Q2 6:42");
  assert.equal(formatNflLiveClockLine({ period: 2, clock: "00:00", status: "inprogress" }), "HT");
  assert.equal(formatNflLiveClockLine({ status: "halftime", period: 2, clock: "00:00" }), "HT");
  assert.equal(formatNflLiveClockLine({ period: 5, clock: "08:12", status: "inprogress" }), "OT 8:12");
  assert.equal(formatNflLiveClockLine({ period: 1, clock: "14:59", status: "inprogress" }), "Q1 14:59");
});

test("pregame meta is kickoff + channel", () => {
  const tip = Date.parse("2026-08-14T23:00:00.000Z");
  const meta = formatNflPregameMeta({ tipoffMs: tip, network: "NBC" });
  assert.match(meta, /7:00/);
  assert.match(meta, /NBC/);
  assert.equal(formatNflPregameMeta({ network: "NFL Network" }), "NFLN");
});

test("home score rows: live first with score+quarter, upcoming with time+channel", () => {
  const tipLive = Date.parse("2026-08-14T23:00:00.000Z");
  const tipLater = Date.parse("2026-08-15T00:00:00.000Z");
  const rows = buildNflHomeScoreRows(
    [
      {
        providerGameId: 2,
        awayAbbr: "PHI",
        homeAbbr: "BAL",
        status: "scheduled",
        tipoffMs: tipLater,
        network: "NFLN",
      },
      {
        providerGameId: 1,
        awayAbbr: "DEN",
        homeAbbr: "ATL",
        status: "inprogress",
        tipoffMs: tipLive,
        awayScore: 17,
        homeScore: 14,
        period: 2,
        clock: "06:42",
      },
      {
        providerGameId: 3,
        awayAbbr: "KC",
        homeAbbr: "SEA",
        status: "complete",
        tipoffMs: tipLive - 3600_000,
        awayScore: 9,
        homeScore: 28,
      },
    ],
    { nowMs: tipLive + 30 * 60 * 1000 },
  );
  assert.equal(rows[0].phase, "live");
  assert.equal(rows[0].matchup, "DEN 17–14 ATL");
  assert.equal(rows[0].meta, "Q2 6:42");
  assert.equal(rows[1].phase, "pregame");
  assert.equal(rows[1].matchup, "PHI @ BAL");
  assert.match(rows[1].meta, /NFLN/);
  assert.equal(rows.length, 2);
});

test("home score rows fall back to recent finals when the slate is over", () => {
  const rows = buildNflHomeScoreRows([
    {
      providerGameId: 9,
      awayAbbr: "KC",
      homeAbbr: "SEA",
      status: "final",
      awayScore: 9,
      homeScore: 28,
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].matchup, "KC 9–28 SEA");
  assert.equal(rows[0].meta, "Final");
});

test("home score rows cap at six, live then upcoming", () => {
  const games = [];
  for (let i = 0; i < 8; i += 1) {
    games.push({
      providerGameId: i + 10,
      awayAbbr: `A${i}`,
      homeAbbr: `H${i}`,
      status: "scheduled",
      tipoffMs: 1_000 + i,
    });
  }
  games.push({
    providerGameId: 99,
    awayAbbr: "DEN",
    homeAbbr: "ATL",
    status: "inprogress",
    awayScore: 3,
    homeScore: 0,
    period: 1,
    clock: "12:00",
  });
  const rows = buildNflHomeScoreRows(games);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].phase, "live");
  assert.equal(rows.filter((r) => r.phase === "pregame").length, 5);
});

test("fast scoreboard poll when live or within 10 minutes of kickoff", () => {
  const now = Date.parse("2026-08-14T23:00:00.000Z");
  assert.equal(nflScoreboardNeedsFastPoll([{ status: "inprogress" }], now), true);
  assert.equal(
    nflScoreboardNeedsFastPoll([{ status: "scheduled", tipoffMs: now + 4 * 60 * 1000 }], now),
    true,
  );
  assert.equal(
    nflScoreboardNeedsFastPoll([{ status: "scheduled", tipoffMs: now + 40 * 60 * 1000 }], now),
    false,
  );
});
