import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEspnNbaFutures } from "./_nbaEspnFutures.js";

test("normalizeEspnNbaFutures — series + Finals MVP markets", () => {
  const json = {
    items: [
      {
        displayName: "NBA Championship Winner",
        marketType: "winLeague",
        entries: [
          { team: { abbreviation: "NY" }, odds: { american: 180 } },
          { team: { abbreviation: "SA" }, odds: { american: -205 } },
        ],
      },
      {
        displayName: "NBA Finals MVP",
        entries: [
          {
            athlete: { displayName: "Victor Wembanyama" },
            team: { abbreviation: "SA" },
            odds: { american: 220 },
          },
          {
            athlete: { displayName: "Jalen Brunson" },
            team: { abbreviation: "NY" },
            odds: { american: 350 },
          },
        ],
      },
    ],
  };
  const { series, mvpCandidates } = normalizeEspnNbaFutures(json);
  assert.equal(series.NYK, "+180");
  assert.equal(series.SAS, "-205");
  assert.equal(mvpCandidates.length, 2);
  assert.equal(mvpCandidates[0].name, "Victor Wembanyama");
  assert.equal(mvpCandidates[0].odds, "+220");
});
