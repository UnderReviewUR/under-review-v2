import {
  getNflClayProjectionPlayer,
  getNflClayTeamProjection,
  NFL_CLAY_PROJECTIONS_2026,
} from "./data/nfl-clay-projections-2026.js";
import {
  getNflFantasyMarketPlayer,
  NFL_FANTASY_MARKET_2026,
} from "./data/nfl-fantasy-market-2026.js";
import {
  buildNflClayFormatTipsBlock,
  detectNflClayFormats,
} from "./data/nfl-clay-format-tips-2026.js";
import {
  getLiveFantasyRankPlayer,
  readNflFantasyRankingsSnapshot,
} from "./_nflEspnFantasyRankings.js";
import {
  formatLiveNflversePlayerStats,
  getLiveNflversePlayerStats,
  readNflverseLiveStatsSnapshot,
} from "./_nflverseLiveStats.js";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatRank(row) {
  if (!row) return "";
  const bye = row.bye != null ? ` / bye ${row.bye}` : "";
  return `${row.posRank || "rank n/a"} / overall ${row.overallRank ?? "n/a"} / $${row.salary ?? "n/a"}${bye}`;
}

function perGame(value, games) {
  const n = Number(value);
  const g = Number(games) || 17;
  if (!Number.isFinite(n)) return null;
  return Math.round((n / g) * 10) / 10;
}

function formatClayProjection(row) {
  if (!row) return "";
  const parts = [];
  if (row.posRank != null) parts.push(`${row.pos || "POS"}${row.posRank}`);
  if (row.passYds != null) parts.push(`${row.passYds} pass yds (${perGame(row.passYds, row.games)}/g)`);
  if (row.passTd != null) parts.push(`${row.passTd} pass TD`);
  if (row.rushYds != null && Number(row.rushYds) > 0) {
    parts.push(`${row.rushYds} rush yds (${perGame(row.rushYds, row.games)}/g)`);
  }
  if (row.rushTd != null && Number(row.rushTd) > 0) parts.push(`${row.rushTd} rush TD`);
  if (row.targets != null && Number(row.targets) > 0) {
    parts.push(`${row.targets} targets (${perGame(row.targets, row.games)}/g)`);
  }
  if (row.receptions != null && Number(row.receptions) > 0) parts.push(`${row.receptions} rec`);
  if (row.recYds != null && Number(row.recYds) > 0) {
    parts.push(`${row.recYds} rec yds (${perGame(row.recYds, row.games)}/g)`);
  }
  if (row.recTd != null && Number(row.recTd) > 0) parts.push(`${row.recTd} rec TD`);
  if (row.targetShare != null && Number(row.targetShare) > 0) parts.push(`${row.targetShare}% tgt share`);
  if (row.carryShare != null && Number(row.carryShare) > 0) parts.push(`${row.carryShare}% carry share`);
  if (row.pprPoints != null) parts.push(`${row.pprPoints} PPR pts`);
  return parts.join("; ");
}

function questionWantsFantasyContext(question) {
  return (
    /\b(fantasy|ppr|superflex|draft|adp|rank|salary|auction|dfs|draftkings|dk|projection|projected|targets?|receptions?|carries|usage|volume|prop|yards?|td|stats?|form)\b/i.test(
      String(question || ""),
    ) || detectNflClayFormats(question).length > 0
  );
}

function knownPlayerNamesFromQuestion(question, liveRankSnap, liveStatsSnap) {
  const q = normalize(question);
  if (!q) return [];
  const names = new Set();
  for (const name of Object.keys(NFL_FANTASY_MARKET_2026.players || {})) {
    if (q.includes(normalize(name))) names.add(name);
  }
  for (const name of Object.keys(NFL_CLAY_PROJECTIONS_2026.players || {})) {
    if (q.includes(normalize(name))) names.add(name);
  }
  for (const p of liveRankSnap?.players || []) {
    if (p?.name && q.includes(normalize(p.name))) names.add(p.name);
  }
  for (const p of liveStatsSnap?.players || []) {
    if (p?.name && q.includes(normalize(p.name))) names.add(p.name);
  }
  return [...names];
}

/**
 * Sync builder kept for unit tests with injected snapshots.
 */
export function buildNflFantasyContextBlockFromSnapshots({
  question = "",
  playerNames = [],
  scopeTeamAbbrs = [],
  liveRankings = null,
  liveStats = null,
} = {}) {
  const formatTipsBlock = buildNflClayFormatTipsBlock(question);
  const questionNames = knownPlayerNamesFromQuestion(question, liveRankings, liveStats);
  const namesToCheck = [...playerNames, ...questionNames];
  if (!questionWantsFantasyContext(question) && !namesToCheck.length) return "";

  const seen = new Set();
  const lines = [];
  const liveStatLines = [];

  for (const name of namesToCheck) {
    const k = normalize(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);

    const live = getLiveFantasyRankPlayer(name, liveRankings);
    const market = getNflFantasyMarketPlayer(name);
    const clay = getNflClayProjectionPlayer(name);
    if (!live && !market && !clay) continue;

    const rowLines = [`${name}:`];
    if (live?.ppr) {
      rowLines.push(
        `  ESPN live PPR (${liveRankings?.seasonYear || "n/a"}): ${formatRank(live.ppr)}` +
          (live.percentOwned != null ? ` / owned ${live.percentOwned}%` : "") +
          (live.injuryStatus && live.injuryStatus !== "ACTIVE"
            ? ` / status ${live.injuryStatus}`
            : ""),
      );
    } else if (market?.ppr) {
      rowLines.push(`  ESPN PPR (static seed): ${formatRank(market.ppr)}`);
    }
    if (live?.superflex) {
      rowLines.push(
        `  ESPN live Superflex (${liveRankings?.seasonYear || "n/a"}): ${formatRank(live.superflex)}`,
      );
    } else if (market?.superflex) {
      rowLines.push(`  ESPN Superflex (static seed): ${formatRank(market.superflex)}`);
    }
    if (!live && market?.espn12TeamMock) {
      rowLines.push(
        `  ESPN 12-team mock: pick ${market.espn12TeamMock.overallPick}, ${market.espn12TeamMock.posRank}`,
      );
    }
    if (market?.signal) rowLines.push(`  Market signal: ${market.signal}`);
    const clayLine = formatClayProjection(clay);
    if (clayLine) rowLines.push(`  Clay projection: ${clayLine}`);
    lines.push(rowLines.join("\n"));

    const liveStat = getLiveNflversePlayerStats(name, liveStats);
    if (liveStat) {
      liveStatLines.push(
        formatLiveNflversePlayerStats({
          ...liveStat,
          seasonYearLabel: liveStats?.usedPriorSeasonFallback
            ? `${liveStats.seasonYear} prior-season baseline`
            : `${liveStats.seasonYear} season`,
        }),
      );
    }
  }

  const teamLines = [];
  for (const team of scopeTeamAbbrs || []) {
    const row = getNflClayTeamProjection(team);
    if (!row) continue;
    teamLines.push(
      `${team}: Clay projected wins ${row.projectedWins}` +
        (row.projectedLosses != null ? `-${row.projectedLosses}` : "") +
        `, off rank ${row.offRank}, def rank ${row.defRank}, SOS rank ${row.sosRank}` +
        (row.nflRank != null ? `, overall rank ${row.nflRank}` : ""),
    );
  }

  if (!lines.length && !teamLines.length && !liveStatLines.length && !formatTipsBlock) return "";

  const liveRankAsOf = liveRankings?.fetchedAt
    ? new Date(liveRankings.fetchedAt).toISOString()
    : null;
  const liveStatsAsOf = liveStats?.fetchedAt ? new Date(liveStats.fetchedAt).toISOString() : null;

  const sources = [];
  if (liveRankAsOf) {
    sources.push(
      `ESPN Fantasy live ranks season ${liveRankings.seasonYear} as of ${liveRankAsOf}`,
    );
  } else {
    sources.push(
      `${NFL_FANTASY_MARKET_2026.meta.source} static (${NFL_FANTASY_MARKET_2026.meta.updatedAt})`,
    );
  }
  sources.push(
    `${NFL_CLAY_PROJECTIONS_2026.meta.source} (${NFL_CLAY_PROJECTIONS_2026.meta.updatedAt})`,
  );
  if (formatTipsBlock) {
    sources.push("Mike Clay Playbook Part 2 format tips (2026-08)");
  }
  if (liveStatsAsOf) {
    sources.push(
      `nflverse week aggregates season ${liveStats.seasonYear}` +
        (liveStats.usedPriorSeasonFallback ? " (prior-season fallback)" : "") +
        ` as of ${liveStatsAsOf}`,
    );
  }

  const parts = [
    "NFL FANTASY / PROJECTION / LIVE-STATS CONTEXT (not live betting odds):",
    `Sources: ${sources.join("; ")}.`,
    `Prop note: ${NFL_CLAY_PROJECTIONS_2026.meta.injuryAdjustment}`,
    "Priority: ESPN roster/injury status overrides ranks/projections; live ESPN ranks override static draft-kit seeds; nflverse last-1/last-3 windows override stale season narratives when present.",
  ];
  if (lines.length) parts.push(lines.join("\n"));
  if (liveStatLines.length) {
    parts.push(`Deep form (nflverse):\n${liveStatLines.join("\n")}`);
  }
  if (teamLines.length) parts.push(`Team projection context:\n${teamLines.join("\n")}`);
  let block = `\n\n${parts.join("\n")}`;
  if (formatTipsBlock) block += formatTipsBlock;
  return block;
}

/**
 * Async entry used by NFL context — loads live KV snapshots then builds block.
 */
export async function buildNflFantasyContextBlock(opts = {}) {
  const [liveRankings, liveStats] = await Promise.all([
    readNflFantasyRankingsSnapshot().catch(() => null),
    readNflverseLiveStatsSnapshot().catch(() => null),
  ]);
  return buildNflFantasyContextBlockFromSnapshots({
    ...opts,
    liveRankings,
    liveStats,
  });
}
