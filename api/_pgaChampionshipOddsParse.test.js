import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGolferNameMapFromStaticAssets,
  oddsCellToAmerican,
  parsePgaChampionshipEventOddsRows,
} from "./_pgaChampionshipOddsParse.js";
import { pickTopPgaChampionshipOutrightLeaders } from "../shared/pgaChampionshipOddsLeaders.js";

test("oddsCellToAmerican reads numericValue", () => {
  assert.equal(oddsCellToAmerican({ numericValue: 450 }), 450);
  assert.equal(oddsCellToAmerican({ value: "+1200" }), 1200);
});

test("parsePgaChampionshipEventOddsRows maps win and top markets", () => {
  const nameMap = buildGolferNameMapFromStaticAssets([
    { id: "12345-golfer", firstName: "Scottie", lastName: "Scheffler" },
    { id: "67890-golfer", firstName: "Rory", lastName: "McIlroy" },
  ]);
  const parsed = parsePgaChampionshipEventOddsRows(nameMap, [
    {
      golferId: "12345",
      tournamentWinner: { numericValue: 450 },
      top5: { numericValue: -110 },
      top10: { numericValue: -250 },
      top20: { numericValue: -400 },
    },
    {
      golferId: "67890",
      tournamentWinner: { numericValue: 900 },
      top5: { numericValue: 200 },
      top10: { numericValue: -120 },
      top20: { numericValue: -200 },
    },
  ]);

  assert.equal(parsed.hasPostedLines, true);
  assert.equal(parsed.source, "pga_championship_site");
  assert.equal(parsed.outrights[0].player, "Scottie Scheffler");
  assert.equal(parsed.outrights[0].odds, 450);
  assert.equal(parsed.topFinish.top_5[0].odds, -110);
  assert.equal(parsed.topFinish.top_10[0].player, "Scottie Scheffler");
});

test("pickTopPgaChampionshipOutrightLeaders returns lowest American lines", () => {
  const top = pickTopPgaChampionshipOutrightLeaders(
    [
      { player: "Rory McIlroy", odds: 900 },
      { player: "Scottie Scheffler", odds: 450 },
      { player: "Jon Rahm", odds: 1200 },
    ],
    2,
  );
  assert.deepEqual(top.map((r) => r.player), ["Scottie Scheffler", "Rory McIlroy"]);
  assert.equal(top[0].display, "+450");
});
