import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNbaPropRecentFormContradiction,
  applyRecentFormContradictionToEstimatedEdge,
  getNbaRecentAverageForMarket,
  nbaOverVsRecentFormContradiction,
  scanNbaOverVsRecentFormContradictions,
} from "./_nbaPropSanity.js";

const sgaRow = {
  name: "Shai Gilgeous-Alexander",
  pts: 31.2,
  ptsRecent: 24.4,
  recentGames: [
    { pts: 22, reb: 5, ast: 6, min: "34:00" },
    { pts: 26, reb: 4, ast: 5, min: "36:00" },
    { pts: 24, reb: 3, ast: 7, min: "35:00" },
    { pts: 23, reb: 6, ast: 4, min: "33:00" },
    { pts: 27, reb: 5, ast: 8, min: "37:00" },
  ],
};

test("nbaOverVsRecentFormContradiction — SGA 31.1 line vs 24.4 recent over lean", () => {
  const hit = nbaOverVsRecentFormContradiction(
    { market: "points", line: 31.1 },
    "over",
    sgaRow,
  );
  assert.ok(hit);
  assert.equal(hit.code, "over_vs_recent_form_contradiction");
  assert.equal(hit.stat, "pts");
  assert.ok(hit.gapPct > 0.1);
});

test("nbaOverVsRecentFormContradiction — no hit when recent form is close to line", () => {
  const hit = nbaOverVsRecentFormContradiction(
    { market: "points", line: 26.5 },
    "over",
    sgaRow,
  );
  assert.equal(hit, null);
});

test("getNbaRecentAverageForMarket prefers ptsRecent", () => {
  const recent = getNbaRecentAverageForMarket(sgaRow, "points");
  assert.equal(recent?.recentAvg, 24.4);
  assert.equal(recent?.unit, "points");
});

test("applyNbaPropRecentFormContradiction replaces clean over call", () => {
  const structured = {
    sport: "nba",
    callType: "prop",
    call: "Lean over 31.1 points — interior vacancy opens usage",
    confidence: "Medium",
    whyNow: "Chet out creates rim pressure.",
    edge: "SGA inherits more perimeter creation.",
    caveats: ["Verify lineups before lock."],
  };
  const out = applyNbaPropRecentFormContradiction(structured, {
    question: "Shai Gilgeous-Alexander points over 31.1 tonight?",
    nbaContext: { playerStats: [sgaRow] },
  });
  assert.equal(out.confidence, "Speculative");
  assert.equal(out.conflictingSignals, true);
  assert.match(out.call, /conflicting signals/i);
  assert.ok(out.caveats.some((c) => /conflicting signals/i.test(c)));
});

test("scanNbaOverVsRecentFormContradictions flags prose over recommendations", () => {
  const text =
    "Gilgeous-Alexander over 31.1 points — the interior vacancy creates more perimeter scoring.";
  const hits = scanNbaOverVsRecentFormContradictions(text, [sgaRow]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].code, "over_vs_recent_form_contradiction");
});

test("applyRecentFormContradictionToEstimatedEdge downgrades conflicting over edge", () => {
  const edge = {
    source: "estimated_edge",
    subject: "Shai Gilgeous-Alexander",
    playableOverAtOrBelow: 29.5,
    confidence: "Medium",
    warnings: [],
  };
  const out = applyRecentFormContradictionToEstimatedEdge(
    edge,
    "SGA over 31.1 points with Chet out",
    sgaRow,
  );
  assert.equal(out.confidence, "Speculative");
  assert.equal(out.conflictingSignals, true);
  assert.match(out.leanRead, /conflicting signals/i);
});
