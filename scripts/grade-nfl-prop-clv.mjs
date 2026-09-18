/**
 * Join open archive + close snapshots + settlements → CLV report.
 *
 * Usage:
 *   node scripts/grade-nfl-prop-clv.mjs
 *
 * Reads:
 *   scripts/out/nfl-prop-history-settlements.json
 *   scripts/out/opening-props-archive/*.json
 *   scripts/out/prop-close-snapshots/*.json
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as priceMath from "../shared/nflPropPriceMath.js";
import { consensusBoardFromPropRows, nflPropClvFromLines } from "../shared/nflPropClv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out");

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function indexConsensus(rows, label) {
  /** @type {Map<string, { line: number, overOdds: number|null, underOdds: number|null }>} */
  const map = new Map();
  const board = consensusBoardFromPropRows(rows, null, priceMath);
  for (const row of board) {
    map.set(`${row.playerId}|${row.propType}`, {
      line: row.line,
      overOdds: row.overOdds,
      underOdds: row.underOdds,
      milestoneOdds: row.milestoneOdds,
      source: label,
    });
  }
  return map;
}

function main() {
  const settlementsPath = join(OUT, "nfl-prop-history-settlements.json");
  if (!existsSync(settlementsPath)) {
    throw new Error("Run grade-nfl-prop-history.mjs first");
  }
  const settlements = loadJson(settlementsPath).filter(
    (s) => s.source === "bdl_opening_props" && (s.result === "over" || s.result === "under"),
  );

  const openDir = join(OUT, "opening-props-archive");
  const closeDir = join(OUT, "prop-close-snapshots");
  /** @type {Map<number, Map<string, any>>} */
  const openByGame = new Map();
  /** @type {Map<number, Map<string, any>>} */
  const closeByGame = new Map();

  if (existsSync(openDir)) {
    for (const f of readdirSync(openDir)) {
      if (!f.endsWith(".json") || f === "manifest.json") continue;
      const doc = loadJson(join(openDir, f));
      const gid = Number(doc.gameId);
      if (!Number.isFinite(gid) || !Array.isArray(doc.rows)) continue;
      openByGame.set(gid, indexConsensus(doc.rows, "open_archive"));
    }
  }
  if (existsSync(closeDir)) {
    for (const f of readdirSync(closeDir)) {
      if (!f.endsWith(".json") || f === "manifest.json") continue;
      const doc = loadJson(join(closeDir, f));
      const gid = Number(doc.gameId);
      if (!Number.isFinite(gid)) continue;
      const live = Array.isArray(doc.liveRows) ? doc.liveRows : [];
      if (live.length) closeByGame.set(gid, indexConsensus(live, "close_snapshot"));
      // If snapshot also carried openRows and we lack archive, fill
      if (!openByGame.has(gid) && Array.isArray(doc.openRows) && doc.openRows.length) {
        openByGame.set(gid, indexConsensus(doc.openRows, "open_from_close_snap"));
      }
    }
  }

  const joined = [];
  let missingClose = 0;
  let missingOpen = 0;

  for (const s of settlements) {
    const gid = Number(s.gameId);
    const key = `${s.playerId}|${s.propType}`;
    const openMap = openByGame.get(gid);
    const closeMap = closeByGame.get(gid);
    if (!closeMap) {
      missingClose += 1;
      continue;
    }
    const openQ = openMap?.get(key);
    const closeQ = closeMap.get(key);
    if (!closeQ || closeQ.line == null) continue;
    const openLine = openQ?.line ?? Number(s.line);
    if (!Number.isFinite(openLine)) {
      missingOpen += 1;
      continue;
    }
    // Skip ATD milestones for line-move CLV (0.5 → 0.5)
    if (s.propType === "anytime_td") continue;

    const clv = nflPropClvFromLines(openLine, closeQ.line, s.result);
    joined.push({
      season: s.season,
      week: s.week,
      gameId: gid,
      playerId: s.playerId,
      player: s.player,
      propType: s.propType,
      venue: s.venue,
      openLine,
      closeLine: closeQ.line,
      result: s.result,
      ...clv,
    });
  }

  const withMove = joined.filter((j) => j.lineMove != null && j.lineMove !== 0);
  const toward = withMove.filter((j) => j.moveTowardWinner === true).length;
  const away = withMove.filter((j) => j.moveTowardWinner === false).length;
  const openClv = joined.filter((j) => j.openSideHadClv === true).length;
  const openNoClv = joined.filter((j) => j.openSideHadClv === false).length;

  const byProp = {};
  for (const j of joined) {
    if (!byProp[j.propType]) byProp[j.propType] = { n: 0, toward: 0, openClv: 0, absMove: 0 };
    const g = byProp[j.propType];
    g.n += 1;
    if (j.moveTowardWinner) g.toward += 1;
    if (j.openSideHadClv) g.openClv += 1;
    g.absMove += Math.abs(j.lineMove || 0);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    methodology:
      "CLV = open→close line move vs settle. Over CLV points = close−open. " +
      "moveTowardWinner = market moved in the settling side’s direction. " +
      "Requires close snapshots (scripts/snapshot-nfl-prop-closes.mjs) joined to settlements.",
    coverage: {
      settlementOpenLegs: settlements.length,
      openArchiveGames: openByGame.size,
      closeSnapshotGames: closeByGame.size,
      joinedClvLegs: joined.length,
      skippedNoClose: missingClose,
      note:
        closeByGame.size === 0
          ? "No close snapshots yet — run snapshot-nfl-prop-closes.mjs before kickoff going forward. Historical finals cannot recover live closes from BDL."
          : null,
    },
    summary: {
      legsWithMove: withMove.length,
      moveTowardWinnerRate: withMove.length ? toward / withMove.length : null,
      moveAgainstWinnerRate: withMove.length ? away / withMove.length : null,
      openSideHadClvRate:
        openClv + openNoClv > 0 ? openClv / (openClv + openNoClv) : null,
      meanAbsLineMove:
        joined.length
          ? joined.reduce((a, j) => a + Math.abs(j.lineMove || 0), 0) / joined.length
          : null,
    },
    byProp: Object.entries(byProp)
      .map(([propType, g]) => ({
        propType,
        n: g.n,
        moveTowardWinnerRate: g.n ? g.toward / g.n : null,
        openSideHadClvRate: g.n ? g.openClv / g.n : null,
        meanAbsLineMove: g.n ? g.absMove / g.n : null,
      }))
      .sort((a, b) => b.n - a.n),
    sample: joined.slice(0, 25),
  };

  mkdirSync(OUT, { recursive: true });
  const outPath = join(OUT, "nfl-prop-clv-grade.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, "nfl-prop-clv-legs.json"), JSON.stringify(joined, null, 2));
  console.log(JSON.stringify({ outPath, coverage: report.coverage, summary: report.summary }, null, 2));
}

main();
