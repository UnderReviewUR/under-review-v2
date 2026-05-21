import test from "node:test";
import assert from "node:assert/strict";
import {
  formatConsensusMarket,
  mergeNbaPropsIntoPlayerStats,
  resolveStatRowForUiChip,
} from "./nbaPropsBoardDisplay.js";

test("formatConsensusMarket extracts line and book", () => {
  const row = formatConsensusMarket({
    over: { line: 29.5, odds: -110, bookId: 15 },
    under: { line: 29.5, odds: -110, bookId: 15 },
  });
  assert.equal(row?.line, 29.5);
  assert.equal(row?.book, "DraftKings");
});

test("mergeNbaPropsIntoPlayerStats attaches consensus to SGA", () => {
  const propsOdds = {
    fetchedAt: new Date().toISOString(),
    freshness: { isStale: false, ageMinutes: 5 },
    source: "action_network",
    players: [
      {
        playerAbbr: "SGA",
        props: {
          points: {
            over: { line: 29.5, odds: -108, bookId: 15 },
            under: { line: 29.5, odds: -112, bookId: 15 },
          },
        },
      },
    ],
  };
  const stats = mergeNbaPropsIntoPlayerStats(
    [{ name: "Shai Gilgeous-Alexander", team: "OKC", pts: 31 }],
    propsOdds,
    {
      chips: [{ chip: "SGA", fullName: "Shai Gilgeous-Alexander", teamAbbr: "OKC" }],
    },
  );
  assert.ok(stats[0].consensusProps?.markets?.points);
  assert.equal(stats[0].consensusProps.markets.points.line, 29.5);
  assert.match(String(stats[0].consensusProps.freshnessLabel), /DraftKings/);
});

test("resolveStatRowForUiChip finds player by full name", () => {
  const hit = resolveStatRowForUiChip(
    { chip: "SGA", fullName: "Shai Gilgeous-Alexander", teamAbbr: "OKC" },
    [{ name: "Shai Gilgeous-Alexander", team: "OKC" }],
  );
  assert.equal(hit?.name, "Shai Gilgeous-Alexander");
});
