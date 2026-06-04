import assert from "node:assert/strict";
import test from "node:test";
import { NBA_INTENT } from "./nbaUrTakeIntent.js";
import {
  formatNbaOutrightsForPrompt,
  nbaOutrightsInjectedForContext,
} from "./nbaOutrightsFreshness.js";

test("formatNbaOutrightsForPrompt — series winner with fresh odds", () => {
  const block = formatNbaOutrightsForPrompt({
    nbaIntent: NBA_INTENT.SERIES_WINNER,
    question: "Are the Knicks mispriced at +180 to win the series?",
    requiredEntities: ["NYK"],
    seriesKv: {
      outrights: { NYK: "+180", SAS: "-205" },
      lastUpdated: Date.now() - 60 * 60 * 1000,
      source: "espn",
      stale: false,
      freshness: {
        fetchedAt: new Date().toISOString(),
        isStale: false,
        ageMinutes: 60,
        ageText: "60 min ago",
        maxAgeMinutes: 360,
        staleWarning: null,
      },
    },
    mvpKv: null,
  });
  assert.ok(block);
  assert.match(block, /NBA FINALS SERIES ODDS/);
  assert.match(block, /NYK: \+180/);
  assert.match(block, /mispriced/i);
});

test("formatNbaOutrightsForPrompt — Finals MVP block", () => {
  const block = formatNbaOutrightsForPrompt({
    nbaIntent: NBA_INTENT.FINALS_MVP,
    question: "Finals MVP value on Wembanyama?",
    requiredEntities: ["SAS"],
    seriesKv: null,
    mvpKv: {
      candidates: [{ name: "Victor Wembanyama", odds: "+220", team: "SAS" }],
      outrights: { "Victor Wembanyama": "+220" },
      lastUpdated: Date.now() - 30 * 60 * 1000,
      source: "espn",
      stale: false,
      freshness: {
        isStale: false,
        ageMinutes: 30,
        ageText: "30 min ago",
        maxAgeMinutes: 360,
        fetchedAt: new Date().toISOString(),
        staleWarning: null,
      },
    },
  });
  assert.ok(block);
  assert.match(block, /NBA FINALS MVP ODDS/);
  assert.match(block, /Wembanyama/);
});

test("nbaOutrightsInjectedForContext", () => {
  assert.equal(
    nbaOutrightsInjectedForContext({ outrights: { NYK: "+180" } }, null),
    true,
  );
  assert.equal(nbaOutrightsInjectedForContext(null, { candidates: [{ name: "X" }] }), true);
  assert.equal(nbaOutrightsInjectedForContext(null, null), false);
});
