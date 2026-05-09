import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPitchingEraK9FromEspnStatistics,
  extractProbableStartersFromEspnCompetition,
  matchupKeyAwayHome,
  normalizeMlbAbbr,
} from "./_mlbEspnProbables.js";

test("extractPitchingEraK9FromEspnStatistics reads ERA and K/9", () => {
  const { era, k9 } = extractPitchingEraK9FromEspnStatistics([
    { abbreviation: "ERA", displayValue: "3.21" },
    { abbreviation: "K/9", displayValue: "9.4" },
  ]);
  assert.equal(era, "3.21");
  assert.equal(k9, "9.4");
});

test("matchupKeyAwayHome builds consistent keys", () => {
  assert.equal(matchupKeyAwayHome("NYY", "BOS"), "NYY|BOS");
  assert.equal(matchupKeyAwayHome("wsx", "MIN"), "CHW|MIN");
});

test("normalizeMlbAbbr maps WSX → CHW", () => {
  assert.equal(normalizeMlbAbbr("WSX"), "CHW");
});

test("extractProbableStartersFromEspnCompetition reads competitors[].probables (site scoreboard)", () => {
  const comp = {
    competitors: [
      {
        homeAway: "away",
        probables: [{ athlete: { shortName: "A. Away", statistics: [{ abbreviation: "ERA", displayValue: "2.00" }] } }],
      },
      {
        homeAway: "home",
        probables: [{ athlete: { shortName: "H. Home", statistics: [{ abbreviation: "ERA", displayValue: "3.00" }] } }],
      },
    ],
  };
  const out = extractProbableStartersFromEspnCompetition(comp);
  assert.equal(out.away.name, "A. Away");
  assert.equal(out.away.era, "2.00");
  assert.equal(out.home.name, "H. Home");
});

test("extractProbableStartersFromEspnCompetition uses probables array", () => {
  const comp = {
    probables: [
      {
        homeAway: "away",
        athlete: {
          shortName: "J. Pitcher",
          statistics: [
            { abbreviation: "ERA", displayValue: "2.10" },
            { abbreviation: "K/9", displayValue: "10.1" },
          ],
        },
      },
      {
        homeAway: "home",
        athlete: {
          shortName: "K. Ace",
          throwsHand: { abbreviation: "L" },
          statistics: [{ abbreviation: "ERA", displayValue: "4.00" }],
        },
      },
    ],
  };
  const out = extractProbableStartersFromEspnCompetition(comp);
  assert.equal(out.away.name, "J. Pitcher");
  assert.equal(out.away.era, "2.10");
  assert.equal(out.away.k9, "10.1");
  assert.equal(out.home.name, "K. Ace");
  assert.equal(out.home.handedness, "L");
});
