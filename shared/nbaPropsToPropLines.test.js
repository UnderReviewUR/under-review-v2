import assert from "node:assert/strict";
import test from "node:test";
import {
  propsOddsToPropLines,
  resolveNbaPlayerFullNameFromAbbr,
  seedPlayerStatsFromPropsOdds,
} from "./nbaPropsToPropLines.js";
import { NBA_UI_PLAYER_CHIPS } from "./nbaUiPlayerChips.js";
import { nbaPlayerHasPostedPropMarket } from "./nbaPostedPropLookup.js";

test("resolveNbaPlayerFullNameFromAbbr maps Finals chips", () => {
  assert.equal(resolveNbaPlayerFullNameFromAbbr("Brunson", NBA_UI_PLAYER_CHIPS), "Jalen Brunson");
  assert.equal(resolveNbaPlayerFullNameFromAbbr("J.Brunson", NBA_UI_PLAYER_CHIPS), "Jalen Brunson");
  assert.equal(resolveNbaPlayerFullNameFromAbbr("Wembanyama", NBA_UI_PLAYER_CHIPS), "Victor Wembanyama");
  assert.equal(resolveNbaPlayerFullNameFromAbbr("V.Wembanyama", NBA_UI_PLAYER_CHIPS), "Victor Wembanyama");
});

test("propsOddsToPropLines builds propLines when Odds API empty", () => {
  const propsOdds = {
    players: [
      {
        playerAbbr: "J.Brunson",
        props: {
          points: { over: { line: 28.5, odds: -110, bookId: 15 }, under: { line: 28.5, odds: -110, bookId: 15 } },
        },
      },
    ],
  };
  const lines = propsOddsToPropLines(propsOdds, {
    slateGames: [{ awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" } }],
    chips: NBA_UI_PLAYER_CHIPS,
  });
  assert.ok(lines.length >= 1);
  assert.equal(lines[0].player, "Jalen Brunson");
  assert.equal(lines[0].prop, "points");
  assert.equal(lines[0].line, 28.5);
});

test("nbaPlayerHasPostedPropMarket reads propsOdds fallback", () => {
  const board = {
    propLines: [],
    propsOdds: {
      players: [
        {
          playerAbbr: "Brunson",
          props: {
            points: { over: { line: 28.5, odds: -110, bookId: 15 } },
          },
        },
      ],
    },
  };
  assert.equal(
    nbaPlayerHasPostedPropMarket(board, "Jalen Brunson", { chips: NBA_UI_PLAYER_CHIPS }),
    true,
  );
});

test("seedPlayerStatsFromPropsOdds fills thin board", () => {
  const stats = seedPlayerStatsFromPropsOdds(
    [],
    {
      players: [{ playerAbbr: "Wembanyama", playerId: 1 }],
    },
    NBA_UI_PLAYER_CHIPS,
  );
  assert.equal(stats.length, 1);
  assert.equal(stats[0].name, "Victor Wembanyama");
  assert.equal(stats[0].team, "SAS");
});
