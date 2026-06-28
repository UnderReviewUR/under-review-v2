import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInjuriesBoardFromBdlRows,
  filterInjuriesBoardForPrompt,
  formatInjuriesBoardForPrompt,
  normalizeBdlPlayerInjuryRow,
} from "./wcBdlInjuries.js";

test("normalizeBdlPlayerInjuryRow maps BDL FIFA injury row", () => {
  const row = normalizeBdlPlayerInjuryRow({
    player: { id: 30636, name: "Ronald Araújo", country_code: "URY" },
    team: { abbreviation: "URU", name: "Uruguay" },
    injury_type: "Calf",
    status: "OUT",
    updated_at: "2026-06-28T21:55:21.011Z",
  });
  assert.equal(row?.name, "Ronald Araújo");
  assert.equal(row?.teamAbbr, "URU");
  assert.equal(row?.status, "OUT");
  assert.equal(row?.detail, "Calf");
});

test("buildInjuriesBoardFromBdlRows sets balldontlie source", () => {
  const board = buildInjuriesBoardFromBdlRows([
    {
      player: { name: "Ronald Araújo" },
      team: { abbreviation: "URU" },
      injury_type: "Calf",
      status: "OUT",
    },
  ]);
  assert.equal(board.source, "balldontlie");
  assert.equal(board.rows.length, 1);
});

test("filterInjuriesBoardForPrompt scopes to cited teams plus high impact", () => {
  const board = buildInjuriesBoardFromBdlRows([
    {
      player: { name: "Ronald Araújo" },
      team: { abbreviation: "URU" },
      status: "OUT",
    },
    {
      player: { name: "Random Player" },
      team: { abbreviation: "QAT" },
      status: "Questionable",
    },
  ]);
  const scoped = filterInjuriesBoardForPrompt(board, ["BRA"]);
  assert.equal(scoped?.rows?.length, 0);

  const uruScoped = filterInjuriesBoardForPrompt(board, ["URU"]);
  assert.equal(uruScoped?.rows?.length, 1);
  assert.equal(uruScoped?.rows?.[0]?.name, "Ronald Araújo");
});

test("formatInjuriesBoardForPrompt labels BallDontLie source", () => {
  const lines = formatInjuriesBoardForPrompt({
    source: "balldontlie",
    rows: [{ name: "Ronald Araújo", teamAbbr: "URU", status: "OUT", detail: "Calf", impact: "med" }],
    starsOut: [],
  });
  assert.match(lines.join("\n"), /BallDontLie GOAT/);
  assert.match(lines.join("\n"), /Calf/);
});
