import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeBdlMatchShots,
  summarizeBdlMatchMomentum,
  summarizeBdlBestPlayers,
  buildBdlGoatMatchIntel,
  formatBdlGoatMatchIntelPromptBlock,
} from "./wcBdlMatchIntel.js";

describe("wcBdlMatchIntel", () => {
  it("summarizeBdlMatchShots aggregates xG by side", () => {
    const summary = summarizeBdlMatchShots(
      [
        { is_home: true, xg: 0.4, shot_type: "save", time_minute: 12, player_id: 1 },
        { is_home: true, xg: 0.6, shot_type: "goal", time_minute: 44, player_id: 1 },
        { is_home: false, xg: 0.2, shot_type: "miss", time_minute: 30, player_id: 2 },
      ],
      { 1: "Messi", 2: "Kane" },
    );
    assert.equal(summary?.home.xg, 1);
    assert.equal(summary?.home.goals, 1);
    assert.equal(summary?.away.count, 1);
  });

  it("summarizeBdlMatchMomentum computes lean", () => {
    const summary = summarizeBdlMatchMomentum([
      { minute: 10, value: -0.1 },
      { minute: 80, value: 0.3 },
    ]);
    assert.equal(summary?.lean, "home");
    assert.equal(summary?.latestMinute, 80);
  });

  it("buildBdlGoatMatchIntel bundles all layers", () => {
    const intel = buildBdlGoatMatchIntel(
      {
        shots: [{ is_home: true, xg: 0.5, shot_type: "save", time_minute: 5, player_id: 9 }],
        momentum: [{ minute: 60, value: 0.2 }],
        bestPlayers: [{ player_id: 9, is_home: true, is_man_of_match: true, rating: 8.2, player: { name: "Star" } }],
        avgPositions: [{ player_id: 9, is_home: true, avg_x: 0.5, avg_y: 0.5 }],
        teamForm: [{ is_home: true, avg_rating: 7.1, position: 2, value: "3" }],
        lineups: [{ player: { id: 9, name: "Star" }, is_starter: true, is_home: true }],
      },
      { homeTeam: "USA", awayTeam: "MEX" },
    );
    assert.ok(intel?.shots);
    assert.ok(intel?.momentum);
    assert.ok(intel?.bestPlayers?.manOfMatch);
    assert.ok(intel?.teamForm?.home);
  });

  it("formatBdlGoatMatchIntelPromptBlock includes xG and form", () => {
    const block = formatBdlGoatMatchIntelPromptBlock(
      {
        xgSummary: { home: 1.2, away: 0.8, homeShots: 10, awayShots: 7 },
        teamForm: { home: { avgRating: 7, position: 1, formValue: "WWDLW" }, away: { avgRating: 6.5, position: 3, formValue: "DLWWW" } },
        momentum: { latestValue: 0.15, latestMinute: 70, last15Avg: 0.1, lean: "home" },
      },
      "USA",
      "MEX",
    );
    assert.match(block || "", /Shot-map xG/);
    assert.match(block || "", /Pre-match team form/);
    assert.match(block || "", /Attack momentum/);
  });
});
