import test from "node:test";
import assert from "node:assert/strict";
import {
  alignMergedGamesToVerifiedSlate,
  filterPropLinesToVerifiedSlate,
  mergeNbaTodaysGames,
} from "./nbaUiSurface.js";

test("alignMergedGamesToVerifiedSlate preserves order and drops unverified games", () => {
  const merged = mergeNbaTodaysGames(
    [
      { id: "1", state: "pre", awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "HOU" }, startTimeUtc: "2026-04-24T23:00:00Z" },
      { id: "2", state: "pre", awayTeam: { abbr: "NYK" }, homeTeam: { abbr: "ATL" }, startTimeUtc: "2026-04-24T22:00:00Z" },
    ],
    [],
  );
  const verified = [{ id: "2", state: "pre", awayTeam: { abbr: "NYK" }, homeTeam: { abbr: "ATL" } }];
  const aligned = alignMergedGamesToVerifiedSlate(merged, verified);
  assert.equal(aligned.length, 1);
  assert.equal(String(aligned[0]?.awayTeam?.abbr), "NYK");
});

test("filterPropLinesToVerifiedSlate keeps only listed matchups", () => {
  const games = [{ awayTeam: { abbr: "NYK" }, homeTeam: { abbr: "ATL" } }];
  const lines = [
    { player: "A", awayAbbr: "NYK", homeAbbr: "ATL", game: "NYK @ ATL" },
    { player: "B", awayAbbr: "LAL", homeAbbr: "HOU", game: "LAL @ HOU" },
  ];
  const out = filterPropLinesToVerifiedSlate(lines, games);
  assert.equal(out.length, 1);
  assert.equal(out[0].player, "A");
});
