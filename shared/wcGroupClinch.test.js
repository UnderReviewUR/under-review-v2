import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getGroupClinchStatus, formatGroupClinchWarnings } from "./wcPhaseUtils.js";

describe("getGroupClinchStatus", () => {
  test("team with 6 points after 2 games clinches if 3rd has 0 points after 2 games", () => {
    const standings = [
      { team: "FRA", played: 2, won: 2, drawn: 0, lost: 0, gd: 5, points: 6 },
      { team: "ENG", played: 2, won: 1, drawn: 1, lost: 0, gd: 2, points: 4 },
      { team: "USA", played: 2, won: 0, drawn: 1, lost: 1, gd: -2, points: 1 },
      { team: "IRN", played: 2, won: 0, drawn: 0, lost: 2, gd: -5, points: 0 },
    ];
    const status = getGroupClinchStatus(standings, [], "FRA");
    assert.equal(status.clinched, true);
    assert.equal(status.matchesRemaining, 1);
  });

  test("team not yet clinched when 3rd place can still catch up", () => {
    const standings = [
      { team: "BRA", played: 1, won: 1, drawn: 0, lost: 0, gd: 2, points: 3 },
      { team: "GER", played: 1, won: 0, drawn: 1, lost: 0, gd: 0, points: 1 },
      { team: "JPN", played: 1, won: 0, drawn: 1, lost: 0, gd: 0, points: 1 },
      { team: "CRC", played: 1, won: 0, drawn: 0, lost: 1, gd: -2, points: 0 },
    ];
    const status = getGroupClinchStatus(standings, [], "BRA");
    assert.equal(status.clinched, false);
    assert.equal(status.topTwo, true);
  });

  test("eliminated: 0 points after 2 games with bad GD", () => {
    const standings = [
      { team: "ESP", played: 2, won: 2, drawn: 0, lost: 0, gd: 6, points: 6 },
      { team: "NED", played: 2, won: 1, drawn: 0, lost: 1, gd: 1, points: 3 },
      { team: "POL", played: 2, won: 1, drawn: 0, lost: 1, gd: -1, points: 3 },
      { team: "QAT", played: 2, won: 0, drawn: 0, lost: 2, gd: -6, points: 0 },
    ];
    const status = getGroupClinchStatus(standings, [], "QAT");
    assert.equal(status.eliminated, true);
  });

  test("returns default for team not in standings", () => {
    const status = getGroupClinchStatus([], [], "XYZ");
    assert.equal(status.clinched, false);
    assert.equal(status.eliminated, false);
    assert.equal(status.matchesPlayed, 0);
  });

  test("no clinch or elimination before any games played", () => {
    const standings = [
      { team: "ARG", played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 },
    ];
    const status = getGroupClinchStatus(standings, [], "ARG");
    assert.equal(status.clinched, false);
    assert.equal(status.eliminated, false);
    assert.equal(status.matchesPlayed, 0);
  });
});

describe("formatGroupClinchWarnings", () => {
  test("returns rotation warning for clinched team", () => {
    const groups = {
      E: [
        { team: "GER", played: 2, won: 2, drawn: 0, lost: 0, gd: 5, points: 6 },
        { team: "JPN", played: 2, won: 1, drawn: 0, lost: 1, gd: 0, points: 3 },
        { team: "CUW", played: 2, won: 0, drawn: 1, lost: 1, gd: -2, points: 1 },
        { team: "COD", played: 2, won: 0, drawn: 1, lost: 1, gd: -3, points: 1 },
      ],
    };
    const result = formatGroupClinchWarnings(groups, [], ["GER"]);
    assert.ok(result);
    assert.ok(result.includes("ROTATION RISK"));
    assert.ok(result.includes("GER"));
  });

  test("returns null when no mentioned teams", () => {
    assert.equal(formatGroupClinchWarnings({}, [], []), null);
  });

  test("returns null when team has not played yet", () => {
    const groups = {
      A: [
        { team: "MEX", played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 },
        { team: "RSA", played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 },
        { team: "KOR", played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 },
        { team: "CZE", played: 0, won: 0, drawn: 0, lost: 0, gd: 0, points: 0 },
      ],
    };
    const result = formatGroupClinchWarnings(groups, [], ["MEX"]);
    assert.equal(result, null);
  });
});
