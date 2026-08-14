#!/usr/bin/env node
/**
 * NFL preseason / off-board stress harness.
 *
 * Usage:
 *   npm run test:nfl-stress           # unit suite + fixture Ask matrix (no network)
 *   npm run test:nfl-stress -- --live # also smoke Action Network board when reachable
 *
 * Safe for Aug / preseason: fixtures simulate a Week 1 slate so suitcase +
 * matchup + discipline can be graded without BDL GOAT or regular-season games.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  createEmptyNflGoatBriefcase,
  evaluateBriefcaseForInteraction,
  detectNflAskMarket,
} from "../shared/nflGoatExtractionContract.js";
import {
  detectNflAskPhase,
  buildNflAskDisciplinePromptBlock,
} from "../shared/nflAskDiscipline.js";
import { shouldSkipNflLiveBoardForAsk } from "../shared/nflAskBoardPolicy.js";
import { buildNflMatchupCard } from "../api/_nflMatchupCard.js";

const UNIT_FILES = [
  "shared/nflGoatExtractionContract.test.js",
  "shared/nflAskDiscipline.test.js",
  "api/_nflMatchupCard.test.js",
  "api/_nflAskBoardPolicy.test.js",
  "api/_nflAskBriefcase.test.js",
  "api/_nflClayProjections.test.js",
  "api/nflBoard.test.js",
  "api/nfl-draft-season.test.js",
  "src/lib/nflPredictRules.test.js",
];

/** Fixture Week-1 style slate — not live; for offline stress only. */
function buildFixtureBoard() {
  return {
    source: "fixture_week1",
    asOf: new Date().toISOString(),
    week: 1,
    season: 2026,
    seasonType: "regular",
    games: [
      {
        providerGameId: 9001,
        awayAbbr: "BUF",
        homeAbbr: "PHI",
        status: "scheduled",
        seasonType: "regular",
        spread: {
          favoriteAbbr: "PHI",
          displayLine: "PHI -3.5",
          homePoint: -3.5,
          awayPoint: 3.5,
        },
        total: { line: 46.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -175, awayOdds: 150 },
      },
      {
        providerGameId: 9002,
        awayAbbr: "KC",
        homeAbbr: "LAC",
        status: "scheduled",
        seasonType: "regular",
        spread: {
          favoriteAbbr: "KC",
          displayLine: "KC -2.5",
          homePoint: 2.5,
          awayPoint: -2.5,
        },
        total: { line: 48.5, overOdds: -105, underOdds: -115 },
        moneyline: { homeOdds: 120, awayOdds: -140 },
      },
    ],
    propLines: [
      {
        game: "BUF @ PHI",
        player: "James Cook",
        prop: "rush yards",
        propRaw: "rush_yds",
        line: 72.5,
        overOdds: -115,
        underOdds: -105,
        book: "DraftKings",
        eventId: "9001",
      },
      {
        game: "BUF @ PHI",
        player: "James Cook",
        prop: "rush yards",
        propRaw: "rush_yds",
        line: 78.5,
        overOdds: -110,
        underOdds: -110,
        book: "FanDuel",
        eventId: "9001",
      },
      {
        game: "KC @ LAC",
        player: "Patrick Mahomes",
        prop: "pass yards",
        propRaw: "pass_yds",
        line: 268.5,
        overOdds: -110,
        underOdds: -110,
        book: "DraftKings",
        eventId: "9002",
      },
      {
        game: "KC @ LAC",
        player: "Travis Kelce",
        prop: "rec yards",
        propRaw: "rec_yds",
        line: 62.5,
        overOdds: -112,
        underOdds: -108,
        book: "FanDuel",
        eventId: "9002",
      },
      {
        game: "BUF @ PHI",
        player: "Josh Allen",
        prop: "pass yards",
        propRaw: "pass_yds",
        line: 245.5,
        overOdds: -110,
        underOdds: -110,
        book: "BetMGM",
        eventId: "9001",
      },
    ],
  };
}

function hydrateBriefcaseFromFixture(board) {
  const b = createEmptyNflGoatBriefcase({
    week: board.week,
    season: board.season,
    asOf: board.asOf,
    primarySource: "fixture",
  });
  b.slate.games = board.games;
  b.slate.odds = board.games.map((g) => ({
    game_id: g.providerGameId,
    away: g.awayAbbr,
    home: g.homeAbbr,
    spread: g.spread,
    total: g.total,
    moneyline: g.moneyline,
  }));
  b.slate.playerProps = board.propLines;
  b.league.injuries = [{ player: "Sample Out", team: "PHI", status: "Out" }];
  b.league.rostersByTeam = {
    BUF: [{ role: "QB1", name: "Josh Allen" }],
    PHI: [{ role: "QB1", name: "Jalen Hurts" }],
    KC: [{ role: "QB1", name: "Patrick Mahomes" }],
  };
  b.players.recentStats = [{ player: "James Cook", note: "fixture" }];
  b.players.seasonStats = [{ player: "James Cook", note: "fixture" }];
  return b;
}

/** @type {Array<{ id: string, question: string, expect?: Record<string, unknown> }>} */
const ASK_MATRIX = [
  {
    id: "core_spread",
    question: "spread on KC?",
    expect: { phase: "game_core", marketId: "spread" },
  },
  {
    id: "prop_cook_phi",
    question: "James Cook rush yards vs PHI",
    expect: { phase: "weekly_props", marketId: "rush_yds", player: "James Cook", gradeNot: "red" },
  },
  {
    id: "alt_cook",
    question: "Cook alt rushing yards 95.5",
    expect: { phase: "weekly_props", altMismatch: true, player: "James Cook" },
  },
  {
    id: "sgp_mahomes_kelce",
    question: "SGP Mahomes pass yards and Kelce receiving yards",
    expect: { phase: "weekly_props", marketId: "sgp", multiLeg: true },
  },
  {
    id: "ambiguous_williams",
    question: "Williams over 70 receiving",
    expect: { ambiguous: true },
  },
  {
    id: "exotic_race",
    question: "race to 10 points BUF vs KC",
    expect: { phase: "exotic" },
  },
  {
    id: "futures_wins",
    question: "Chiefs season win total over?",
    expect: { phase: "futures", skipBoard: true },
  },
  {
    id: "draft_sim",
    question: "simulate the cowboys draft",
    expect: { phase: "draft", skipBoard: true },
  },
  {
    id: "allen_pass",
    question: "Josh Allen over 250.5 passing yards",
    expect: { marketId: "pass_yds", player: "Josh Allen" },
  },
];

function pad(s, n) {
  const t = String(s ?? "");
  return t.length >= n ? t.slice(0, n - 1) + "…" : t.padEnd(n);
}

function runUnitSuite() {
  console.log("\n══ NFL unit suite ══\n");
  const r = spawnSync(process.execPath, ["--test", ...UNIT_FILES], {
    stdio: "inherit",
    shell: false,
  });
  return r.status === 0;
}

function runAskMatrix(board) {
  console.log("\n══ NFL fixture Ask matrix ══\n");
  const briefcase = hydrateBriefcaseFromFixture(board);
  const depth = {
    BUF: { qb1: "Josh Allen", qb2: "Kyle Allen", qb3: "n/a" },
    PHI: { qb1: "Jalen Hurts", qb2: "n/a", qb3: "n/a" },
    KC: { qb1: "Patrick Mahomes", qb2: "n/a", qb3: "n/a" },
  };

  console.log(
    `${pad("id", 22)} ${pad("phase", 14)} ${pad("market", 12)} ${pad("grade", 6)} ${pad("player", 16)} notes`,
  );
  console.log("-".repeat(100));

  /** @type {string[]} */
  const failures = [];

  for (const row of ASK_MATRIX) {
    const q = row.question;
    const phase = detectNflAskPhase(q);
    const market = detectNflAskMarket(q);
    const skipBoard = shouldSkipNflLiveBoardForAsk(q);
    const health = evaluateBriefcaseForInteraction(briefcase, q);
    const scopeTeams = /Chiefs|Mahomes|Kelce|\bKC\b/i.test(q)
      ? ["KC", "LAC"]
      : /Cook|Allen|Eagles|Bills|\bPHI\b|\bBUF\b/i.test(q)
        ? ["BUF", "PHI"]
        : [];
    const card = buildNflMatchupCard({
      question: q,
      scopeTeams,
      games: board.games,
      propLines: board.propLines,
      injuries: briefcase.league.injuries,
      depth,
    });

    const discipline = buildNflAskDisciplinePromptBlock({
      question: q,
      marketId: market.marketId,
      phase,
      hasLiveLine: Boolean(card.liveLine?.line != null || board.propLines.length),
      injuryFlag: Boolean(card.injuryLine),
      isAlt: /\balt/i.test(q),
      ambiguousPlayer: card.ambiguous ? (card.candidates || []).join(" / ") : null,
    });

    const notes = [];
    if (card.ambiguous) notes.push(`ambig:${(card.candidates || []).slice(0, 2).join("|")}`);
    if (String(card.cardBlock || "").includes("ALT ASK: user number")) notes.push("alt≠main");
    if (String(card.cardBlock || "").includes("Multi-leg")) notes.push("multi-leg");
    if (String(card.cardBlock || "").includes("Book range")) notes.push("bookΔ");
    if (skipBoard) notes.push("skip-board");
    if (!discipline.includes("NEXT:")) notes.push("MISSING_NEXT");
    if (!discipline.includes("NFL ASK DISCIPLINE")) notes.push("MISSING_DISC");

    console.log(
      `${pad(row.id, 22)} ${pad(phase, 14)} ${pad(market.marketId, 12)} ${pad(health.grade, 6)} ${pad(card.player?.name || "—", 16)} ${notes.join(", ") || "—"}`,
    );
    if (card.thesis) {
      console.log(`  thesis: ${card.thesis}`);
    }

    const exp = row.expect || {};
    if (exp.phase && phase !== exp.phase) {
      failures.push(`${row.id}: phase ${phase} ≠ ${exp.phase}`);
    }
    if (exp.marketId && market.marketId !== exp.marketId) {
      failures.push(`${row.id}: market ${market.marketId} ≠ ${exp.marketId}`);
    }
    if (exp.player && card.player?.name !== exp.player) {
      failures.push(`${row.id}: player ${card.player?.name || "null"} ≠ ${exp.player}`);
    }
    if (exp.gradeNot && health.grade === exp.gradeNot) {
      failures.push(`${row.id}: grade is ${health.grade} (wanted not ${exp.gradeNot})`);
    }
    if (exp.skipBoard && !skipBoard) {
      failures.push(`${row.id}: expected skipBoard`);
    }
    if (exp.ambiguous && !card.ambiguous) {
      failures.push(`${row.id}: expected ambiguous player`);
    }
    if (exp.altMismatch && !String(card.cardBlock || "").includes("ALT ASK: user number")) {
      failures.push(`${row.id}: expected alt≠main clause`);
    }
    if (exp.multiLeg && !String(card.cardBlock || "").includes("Multi-leg")) {
      failures.push(`${row.id}: expected multi-leg players`);
    }
    if (!discipline.includes("NEXT:")) {
      failures.push(`${row.id}: discipline missing NEXT`);
    }
  }

  console.log("");
  if (failures.length) {
    console.error("Ask matrix failures:");
    for (const f of failures) console.error(`  ✗ ${f}`);
    return false;
  }
  console.log(`Ask matrix: ${ASK_MATRIX.length}/${ASK_MATRIX.length} checks passed`);
  return true;
}

async function runLiveSmoke() {
  console.log("\n══ NFL live AN smoke (optional) ══\n");
  try {
    const { buildNflLiveBoard } = await import("../api/_nflBoard.js");
    const board = await buildNflLiveBoard({ includeProps: true, maxPropGames: 2 });
    console.log(
      JSON.stringify(
        {
          ok: board.ok,
          source: board.source,
          gameCount: board.gameCount,
          propLineCount: board.propLineCount,
          seasonType: board.seasonType,
          week: board.week,
          sampleGames: (board.games || []).slice(0, 3).map((g) => ({
            away: g.awayAbbr,
            home: g.homeAbbr,
            total: g.total?.line ?? null,
            spread: g.spread?.displayLine ?? null,
          })),
        },
        null,
        2,
      ),
    );
    if (!board.gameCount) {
      console.warn("Live board returned 0 games — not a failure in August; fixture matrix still covers Ask.");
    }
    return true;
  } catch (err) {
    console.warn("Live board smoke failed (non-fatal):", err?.message || err);
    return true;
  }
}

async function main() {
  const live = process.argv.includes("--live");
  console.log("NFL stress — offline fixture + unit suite" + (live ? " + live AN" : ""));
  console.log(`asOf ${new Date().toISOString()} · GOAT not required`);

  const unitsOk = runUnitSuite();
  const board = buildFixtureBoard();
  const matrixOk = runAskMatrix(board);
  let liveOk = true;
  if (live) liveOk = await runLiveSmoke();

  console.log("\n══ summary ══");
  console.log(`units:  ${unitsOk ? "PASS" : "FAIL"}`);
  console.log(`matrix: ${matrixOk ? "PASS" : "FAIL"}`);
  if (live) console.log(`live:   ${liveOk ? "PASS/soft" : "FAIL"}`);

  if (!unitsOk || !matrixOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
