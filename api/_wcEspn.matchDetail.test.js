import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { normalizeEspnMatchSummary } from "./_wcEspnMatchDetail.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "__fixtures__");

function loadFixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));
}

test("normalizeEspnMatchSummary — sparse WC friendly (lineups, empty player stats)", () => {
  const json = loadFixture("espn-wc-friendly-summary-401861775.json");
  const detail = normalizeEspnMatchSummary(json, {
    eventId: "401861775",
    homeTeam: "MEX",
    awayTeam: "AUS",
  });

  assert.equal(detail.homeTeam, "MEX");
  assert.ok(detail.awayTeam === "AUS" || detail.awayTeam.length >= 3);
  assert.equal(detail.status, "FT");
  assert.equal(detail.lineups.home.starters.length, 11);
  assert.equal(detail.lineupConfirmed, true);
  assert.equal(detail.players.home[0].goals, 0);
  const starterMins = detail.players.home.filter((p) => p.starter).map((p) => p.minutesPlayed);
  assert.ok(starterMins.some((m) => m === 90 || m === 45 || m == null));
  assert.equal(detail.teamStats.home.shots, null);
  assert.ok(detail.goals.length >= 1);
  assert.equal(detail.injuries.length, 0);
  assert.equal(detail.finalized, true);
});

test("normalizeEspnMatchSummary — rich EPL case (full team and player stats)", () => {
  const json = loadFixture("espn-eng1-summary-740966.json");
  const detail = normalizeEspnMatchSummary(json, { eventId: "740966" });

  assert.ok(detail.homeTeam);
  assert.ok(detail.awayTeam);
  assert.equal(detail.status, "FT");
  const withGoals = detail.players.home.concat(detail.players.away).find((p) => p.goals > 0);
  assert.ok(withGoals, "expected at least one scorer with goals > 0");
  assert.ok(
    detail.teamStats.home.shots != null || detail.teamStats.away.shots != null,
    "expected team shots",
  );
  const withShots = detail.players.home.concat(detail.players.away).find((p) => p.shots > 0);
  assert.ok(withShots, "expected player shots on outfielders");
});

test("normalizeEspnMatchSummary extracts structured injuries only", () => {
  const json = loadFixture("espn-wc-friendly-summary-401861775.json");
  json.rosters[0].roster[0].injury = {
    status: "Out",
    detail: "Hamstring",
    athlete: json.rosters[0].roster[0].athlete,
  };
  const detail = normalizeEspnMatchSummary(json, { eventId: "401861775", homeTeam: "MEX", awayTeam: "AUS" });
  assert.equal(detail.injuries.length, 1);
  assert.equal(detail.injuries[0].status, "Out");
  assert.match(detail.injuries[0].sourcePath, /injury/);
});

test("normalizeEspnMatchSummary lineupConfirmed false when partial XI", () => {
  const json = {
    header: {
      competitions: [
        {
          id: "1",
          date: "2026-06-11T19:00Z",
          status: { type: { state: "pre", completed: false } },
          competitors: [
            { homeAway: "home", team: { abbreviation: "MEX" }, score: "0" },
            { homeAway: "away", team: { abbreviation: "RSA" }, score: "0" },
          ],
        },
      ],
    },
    rosters: [
      {
        homeAway: "home",
        team: { abbreviation: "MEX" },
        formation: "4-4-2",
        roster: [{ starter: true, jersey: "1", athlete: { id: "1", displayName: "GK" } }],
      },
      {
        homeAway: "away",
        team: { abbreviation: "RSA" },
        roster: [],
      },
    ],
    boxscore: { teams: [] },
    keyEvents: [],
  };
  const detail = normalizeEspnMatchSummary(json, { eventId: "1", homeTeam: "MEX", awayTeam: "RSA" });
  assert.equal(detail.lineupConfirmed, false);
  assert.equal(detail.lineups.home.starters.length, 1);
});

test("normalizeEspnMatchSummary does not throw on minimal empty payload", () => {
  const detail = normalizeEspnMatchSummary({}, { eventId: "empty" });
  assert.equal(detail.injuries.length, 0);
  assert.equal(detail.goals.length, 0);
  assert.equal(detail.lineupConfirmed, false);
});
