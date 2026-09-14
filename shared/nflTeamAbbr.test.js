import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalizeNflTeamAbbr } from "./nflTeamAbbr.js";
import { normalizeNflBdlGames } from "../api/_nflBdl.js";

test("Saints NOP canonicalizes to NO (not Pelicans)", () => {
  assert.equal(canonicalizeNflTeamAbbr("NOP"), "NO");
  assert.equal(canonicalizeNflTeamAbbr("nola"), "NO");
  assert.equal(canonicalizeNflTeamAbbr("NO"), "NO");
  assert.equal(canonicalizeNflTeamAbbr("NWE"), "NE");
  assert.equal(canonicalizeNflTeamAbbr("JAC"), "JAX");
});

test("normalizeNflBdlGames remaps Saints NOP → NO", () => {
  const [game] = normalizeNflBdlGames([
    {
      id: 1,
      home_team: { abbreviation: "DET", full_name: "Detroit Lions" },
      visitor_team: { abbreviation: "NOP", full_name: "New Orleans Saints" },
      date: "2026-09-13T17:00:00Z",
      week: 2,
      season: 2026,
      status: "scheduled",
    },
  ]);
  assert.equal(game.awayAbbr, "NO");
  assert.equal(game.homeAbbr, "DET");
  assert.match(String(game.awayName), /Saints/i);
});
