import assert from "node:assert/strict";
import test from "node:test";
import {
  extractEspnMatchOdds,
  normalizeEspnAbbr,
  normalizeEspnMatchStatus,
  normalizeEspnScoreboardEvent,
  normalizeEspnStandings,
} from "./_wcEspn.js";

test("normalizeEspnAbbr maps overrides", () => {
  assert.equal(normalizeEspnAbbr("kors"), "KOR");
  assert.equal(normalizeEspnAbbr("CZE"), "CZE");
  assert.equal(normalizeEspnAbbr("HTI"), "HAI");
});

test("normalizeEspnStandings produces group rows", () => {
  const groups = normalizeEspnStandings({
    children: [
      {
        name: "Group A",
        standings: {
          entries: [
            {
              team: { abbreviation: "MEX" },
              stats: [
                { name: "gamesPlayed", value: 1 },
                { name: "wins", value: 1 },
                { name: "ties", value: 0 },
                { name: "losses", value: 0 },
                { name: "pointsFor", value: 2 },
                { name: "pointsAgainst", value: 0 },
                { name: "pointDifferential", value: 2 },
                { name: "points", value: 3 },
              ],
            },
          ],
        },
      },
    ],
  });
  assert.equal(groups.A[0].team, "MEX");
  assert.equal(groups.A[0].points, 3);
  assert.equal(groups.A[0].played, 1);
});

test("normalizeEspnMatchStatus maps ESPN states", () => {
  assert.equal(normalizeEspnMatchStatus({ state: "pre" }), "NS");
  assert.equal(normalizeEspnMatchStatus({ state: "in", detail: "Halftime" }), "HT");
  assert.equal(normalizeEspnMatchStatus({ state: "post", completed: true }), "FT");
});

test("extractEspnMatchOdds reads embedded moneylines", () => {
  const odds = extractEspnMatchOdds({
    provider: { name: "DraftKings" },
    moneyline: {
      home: { close: { odds: "-215" } },
      away: { close: { odds: "+650" } },
      draw: { close: { odds: "+340" } },
    },
  });
  assert.equal(odds.home.moneyline, "-215");
  assert.equal(odds.away.moneyline, "+650");
  assert.equal(odds.draw.moneyline, "+340");
});

test("normalizeEspnScoreboardEvent maps competitors", () => {
  const row = normalizeEspnScoreboardEvent({
    id: "760415",
    date: "2026-06-11T19:00Z",
    status: { type: { state: "pre", completed: false } },
    season: { type: { name: "Group Stage" } },
    competitions: [
      {
        id: "760415",
        date: "2026-06-11T19:00Z",
        venue: { fullName: "Estadio Banorte", address: { city: "Mexico City" } },
        competitors: [
          { homeAway: "home", team: { abbreviation: "MEX" }, score: "0" },
          { homeAway: "away", team: { abbreviation: "RSA" }, score: "0" },
        ],
        odds: [
          {
            provider: { name: "DraftKings" },
            moneyline: {
              home: { close: { odds: "-215" } },
              away: { close: { odds: "+650" } },
              draw: { close: { odds: "+340" } },
            },
          },
        ],
      },
    ],
  });
  assert.equal(row.homeTeam, "MEX");
  assert.equal(row.awayTeam, "RSA");
  assert.equal(row.group, "A");
  assert.equal(row.status, "NS");
  assert.equal(row.odds.home.moneyline, "-215");
});
