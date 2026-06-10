import assert from "node:assert/strict";
import test from "node:test";
import {
  computeGroupMispriceRankings,
  computeGroupPathComparisons,
  formatGroupMispriceContextBlock,
  wcTeamsByGroupLetter,
} from "./wcGroupMispriceRanking.js";

test("wcTeamsByGroupLetter includes Group D four teams", () => {
  const d = wcTeamsByGroupLetter().D || [];
  assert.deepEqual([...d].sort(), ["AUS", "PAR", "TUR", "USA"]);
});

test("computeGroupMispriceRankings ranks groups when BDL + sim present", () => {
  const teamStats = {
    USA: { advancePct: 62, groupWinPct: 18, r16Pct: 15 },
    NOR: { advancePct: 54, groupWinPct: 12, r16Pct: 28 },
  };
  const bdlFutures = {
    lastUpdated: Date.now(),
    byMarketType: {
      qualify_from_group: {
        USA: { american: -110, americanDisplay: "-110", vendor: "draftkings" },
        NOR: { american: -120, americanDisplay: "-120", vendor: "draftkings" },
      },
    },
  };
  const ranked = computeGroupMispriceRankings({
    teamStats,
    bdlFutures,
    question: "Which World Cup group is most mispriced?",
    nowMs: Date.now(),
    topN: 2,
  });
  assert.ok(ranked.length >= 1);
  assert.ok(Number.isFinite(ranked[0].delta));
  assert.ok(ranked[0].confidence === "HIGH");
});

test("formatGroupMispriceContextBlock injects cross-group and Group D paths", () => {
  const teamStats = {
    USA: { advancePct: 62, groupWinPct: 18, r16Pct: 15 },
    PAR: { advancePct: 48, groupWinPct: 22, r16Pct: 12 },
    AUS: { advancePct: 35, groupWinPct: 8, r16Pct: 10 },
    TUR: { advancePct: 72, groupWinPct: 44, r16Pct: 40 },
  };
  const bdlFutures = {
    lastUpdated: Date.now(),
    byMarketType: {
      qualify_from_group: {
        USA: { american: -110 },
        PAR: { american: +150 },
      },
      win_group: {
        TUR: { american: +120 },
      },
    },
  };
  const block = formatGroupMispriceContextBlock({
    teamStats,
    bdlFutures,
    question: "Which Group D advancement path is most mispriced?",
    simLastUpdated: Date.now(),
  });
  assert.ok(block);
  assert.match(block, /GROUP_MISPRICE_RANKING/);
  assert.match(block, /Group D advancement paths/);
});

test("computeGroupPathComparisons returns path rows for Group D", () => {
  const rows = computeGroupPathComparisons({
    groupLetter: "D",
    teamStats: {
      USA: { advancePct: 62, groupWinPct: 18, r16Pct: 15 },
      PAR: { advancePct: 48, groupWinPct: 22, r16Pct: 12 },
    },
    bdlFutures: {
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: { USA: { american: -110 } },
      },
    },
  });
  assert.ok(rows.some((r) => r.teamAbbr === "USA" && r.path.includes("advance")));
});
