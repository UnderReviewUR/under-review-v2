import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFormEntryFromMatchDetail,
  filterUnplayedWcFixtures,
  isUnplayedWcFixture,
  summarizeFormInputs,
} from "./_wcSimFormInputs.js";

test("isUnplayedWcFixture — rejects FT and scored fixtures", () => {
  assert.equal(isUnplayedWcFixture({ homeTeam: "COL", awayTeam: "POR", status: "FT" }), false);
  assert.equal(
    isUnplayedWcFixture({ homeTeam: "COL", awayTeam: "POR", status: "NS", homeScore: 1, awayScore: 0 }),
    false,
  );
  assert.equal(isUnplayedWcFixture({ homeTeam: "COL", awayTeam: "POR", status: "NS" }), true);
});

test("buildFormEntryFromMatchDetail — maps home/away avgRating to abbrs", () => {
  const built = buildFormEntryFromMatchDetail(
    { id: "wc-123", homeTeam: "COL", awayTeam: "POR" },
    {
      bdlGoat: {
        teamForm: {
          home: { avgRating: 8.2 },
          away: { avgRating: 7.4 },
        },
      },
    },
  );
  assert.equal(built?.key, "COL|POR");
  assert.equal(built?.teams.COL.avgRating, 8.2);
  assert.equal(built?.teams.POR.avgRating, 7.4);
  assert.equal(built?.teams.COL.sourceEventId, "wc-123");
});

test("buildFormEntryFromMatchDetail — home/away inversion uses same key", () => {
  const built = buildFormEntryFromMatchDetail(
    { id: "wc-456", homeTeam: "POR", awayTeam: "COL" },
    {
      bdlGoat: {
        teamForm: {
          home: { avgRating: 7.1 },
          away: { avgRating: 8.0 },
        },
      },
    },
  );
  assert.equal(built?.key, "COL|POR");
  assert.equal(built?.teams.POR.avgRating, 7.1);
  assert.equal(built?.teams.COL.avgRating, 8.0);
});

test("buildFormEntryFromMatchDetail — missing detail returns null", () => {
  assert.equal(buildFormEntryFromMatchDetail({ homeTeam: "COL", awayTeam: "POR" }, null), null);
  assert.equal(
    buildFormEntryFromMatchDetail({ homeTeam: "COL", awayTeam: "POR" }, { bdlGoat: {} }),
    null,
  );
});

test("filterUnplayedWcFixtures — played fixture not included", () => {
  const rows = filterUnplayedWcFixtures([
    { homeTeam: "COL", awayTeam: "POR", status: "NS" },
    { homeTeam: "MEX", awayTeam: "RSA", status: "FT", homeScore: 2, awayScore: 0 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].homeTeam, "COL");
});

test("summarizeFormInputs — fingerprint suffix", () => {
  const summary = summarizeFormInputs({
    "COL|POR": {
      COL: { avgRating: 8.2, sourceEventId: "wc-123" },
      POR: { avgRating: 7.4, sourceEventId: "wc-123" },
    },
  });
  assert.equal(summary.formFixturesResolved, 1);
  assert.equal(summary.formTeamsAffected, 2);
  assert.equal(summary.formFingerprint, "frm:1:2:7.4-8.2");
});
