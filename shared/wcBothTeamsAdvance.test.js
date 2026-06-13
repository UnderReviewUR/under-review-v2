import assert from "node:assert/strict";
import test from "node:test";
import {
  assessWcBothTeamsAdvanceFixture,
  buildWcBothTeamsAdvanceCaveat,
  wcFixtureTeamsExcludingGroupFavorite,
} from "./wcBothTeamsAdvance.js";

test("USA vs PAR excludes Group D favorite Türkiye", () => {
  const exclusion = wcFixtureTeamsExcludingGroupFavorite("D", "USA", "PAR");
  assert.equal(exclusion?.favoriteAbbr, "TUR");
  assert.match(exclusion?.favoriteName || "", /Türkiye|Turkey/i);
});

test("assessWcBothTeamsAdvanceFixture gates USA-PAR without favorite sim", () => {
  const result = assessWcBothTeamsAdvanceFixture({
    home: "USA",
    away: "PAR",
    group: "D",
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.requiresFavoriteOut, true);
  assert.equal(result.favoriteAbbr, "TUR");
});

test("assessWcBothTeamsAdvanceFixture allows when Türkiye sim advance is low", () => {
  const result = assessWcBothTeamsAdvanceFixture({
    home: "USA",
    away: "PAR",
    group: "D",
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 42 },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.requiresFavoriteOut, true);
});

test("assessWcBothTeamsAdvanceFixture blocks when Türkiye sim advance is high", () => {
  const result = assessWcBothTeamsAdvanceFixture({
    home: "USA",
    away: "PAR",
    group: "D",
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 62 },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "favorite_likely_advances");
});

test("buildWcBothTeamsAdvanceCaveat names the group favorite", () => {
  const assessment = assessWcBothTeamsAdvanceFixture({
    home: "USA",
    away: "PAR",
    group: "D",
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 42 },
    },
  });
  const caveat = buildWcBothTeamsAdvanceCaveat(
    assessment,
    "United States",
    "Paraguay",
    "D",
  );
  assert.match(caveat, /Türkiye|Turkey/i);
  assert.match(caveat, /miss/i);
});
