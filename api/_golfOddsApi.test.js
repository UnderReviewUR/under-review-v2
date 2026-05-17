import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeGolfOddsWithEspnField,
  oddsEventMatchesCurrentTournament,
  resolveGolfOddsSportKeys,
} from "./_golfOddsApi.js";
import { buildGolfOddsFreshnessPromptBlock } from "./_golfOddsApi.js";
import { extractGolfTournamentIntentFromQuestion } from "../shared/golfTournamentIntent.js";

test("resolveGolfOddsSportKeys prefers major-specific keys", () => {
  const intent = extractGolfTournamentIntentFromQuestion("PGA Championship outright");
  const keys = resolveGolfOddsSportKeys({ name: "PGA Championship" }, intent);
  assert.equal(keys[0], "golf_pga_championship");
});

test("oddsEventMatchesCurrentTournament matches PGA Championship", () => {
  const intent = extractGolfTournamentIntentFromQuestion("PGA Championship picks");
  const match = oddsEventMatchesCurrentTournament(
    { home_team: "PGA Championship 2026", sport_title: "PGA" },
    { name: "PGA Championship", shortName: "PGA" },
    intent,
  );
  assert.equal(match, true);
});

test("mergeGolfOddsWithEspnField keeps API prices and appends field-only names", () => {
  const merged = mergeGolfOddsWithEspnField(
    {
      outrights: [{ player: "Scottie Scheffler", odds: 450, source: "pga_championship_site" }],
      source: "pga_championship_site",
      topFinish: {},
      makeCut: {},
      fetchedAt: "2026-05-15T12:00:00.000Z",
      freshness: { isStale: false },
    },
    {
      outrights: [
        { player: "Scottie Scheffler", odds: null, source: "espn_field" },
        { player: "Jake Knapp", odds: null, source: "espn_field" },
      ],
      linesUnavailable: true,
    },
  );
  assert.equal(merged.hasPostedLines, true);
  assert.equal(merged.outrights.length, 2);
  assert.equal(merged.outrights[0].odds, 450);
  assert.equal(merged.outrights[1].player, "Jake Knapp");
  assert.equal(merged.source, "pga_championship_site");
});

test("buildGolfOddsFreshnessPromptBlock warns when stale", () => {
  const block = buildGolfOddsFreshnessPromptBlock({
    fetchedAt: "2026-05-15T08:00:00.000Z",
    freshness: {
      isStale: true,
      staleWarning: "Odds data is more than 2 hours old",
    },
  });
  assert.match(block, /2 hours/i);
});
