import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInjuriesBoardFromMatchDetails,
  classifyInjuryImpact,
} from "./wcInjuriesBoard.js";

test("classifyInjuryImpact — star out is high", () => {
  assert.equal(classifyInjuryImpact("Out", "Kylian Mbappé"), "high");
});

test("buildInjuriesBoardFromMatchDetails — dedupes injuries", () => {
  const board = buildInjuriesBoardFromMatchDetails([
    {
      injuries: [
        { name: "Harry Kane", teamAbbr: "ENG", status: "Doubtful", espnAthleteId: "9" },
      ],
    },
    {
      injuries: [
        { name: "Harry Kane", teamAbbr: "ENG", status: "Out", espnAthleteId: "9" },
      ],
    },
  ]);
  assert.equal(board.rows.length, 1);
  assert.equal(board.rows[0].status, "Out");
});
