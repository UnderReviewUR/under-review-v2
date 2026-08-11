import {
  getNflClayProjectionPlayer,
  getNflClayTeamProjection,
  NFL_CLAY_PROJECTIONS_2026,
} from "./data/nfl-clay-projections-2026.js";
import {
  getNflFantasyMarketPlayer,
  NFL_FANTASY_MARKET_2026,
} from "./data/nfl-fantasy-market-2026.js";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatRank(row) {
  if (!row) return "";
  return `${row.posRank || "rank n/a"} / overall ${row.overallRank ?? "n/a"} / $${row.salary ?? "n/a"} / bye ${row.bye ?? "n/a"}`;
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
  if (row.passYds != null) parts.push(`${row.passYds} pass yds (${perGame(row.passYds, row.games)}/g)`);
  if (row.rushYds != null) parts.push(`${row.rushYds} rush yds (${perGame(row.rushYds, row.games)}/g)`);
  if (row.targets != null) parts.push(`${row.targets} targets (${perGame(row.targets, row.games)}/g)`);
  if (row.receptions != null) parts.push(`${row.receptions} rec`);
  if (row.recYds != null) parts.push(`${row.recYds} rec yds (${perGame(row.recYds, row.games)}/g)`);
  if (row.pprPoints != null) parts.push(`${row.pprPoints} PPR pts`);
  return parts.join("; ");
}

function questionWantsFantasyContext(question) {
  return /\b(fantasy|ppr|superflex|draft|adp|rank|salary|auction|dfs|draftkings|dk|projection|projected|targets?|receptions?|carries|usage|volume|prop|yards?|td)\b/i.test(
    String(question || ""),
  );
}

function knownPlayerNamesFromQuestion(question) {
  const q = normalize(question);
  if (!q) return [];
  const names = new Set();
  for (const name of Object.keys(NFL_FANTASY_MARKET_2026.players || {})) {
    if (q.includes(normalize(name))) names.add(name);
  }
  for (const name of Object.keys(NFL_CLAY_PROJECTIONS_2026.players || {})) {
    if (q.includes(normalize(name))) names.add(name);
  }
  return [...names];
}

export function buildNflFantasyContextBlock({
  question = "",
  playerNames = [],
  scopeTeamAbbrs = [],
} = {}) {
  const questionNames = knownPlayerNamesFromQuestion(question);
  const namesToCheck = [...playerNames, ...questionNames];
  if (!questionWantsFantasyContext(question) && !namesToCheck.length) return "";
  const seen = new Set();
  const lines = [];
  for (const name of namesToCheck) {
    const k = normalize(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const market = getNflFantasyMarketPlayer(name);
    const clay = getNflClayProjectionPlayer(name);
    if (!market && !clay) continue;
    const rowLines = [`${name}:`];
    if (market?.ppr) rowLines.push(`  ESPN PPR: ${formatRank(market.ppr)}`);
    if (market?.superflex) rowLines.push(`  ESPN Superflex: ${formatRank(market.superflex)}`);
    if (market?.espn12TeamMock) {
      rowLines.push(
        `  ESPN 12-team mock: pick ${market.espn12TeamMock.overallPick}, ${market.espn12TeamMock.posRank}`,
      );
    }
    if (market?.signal) rowLines.push(`  Market signal: ${market.signal}`);
    const clayLine = formatClayProjection(clay);
    if (clayLine) rowLines.push(`  Clay projection: ${clayLine}`);
    lines.push(rowLines.join("\n"));
  }

  const teamLines = [];
  for (const team of scopeTeamAbbrs || []) {
    const row = getNflClayTeamProjection(team);
    if (!row) continue;
    teamLines.push(
      `${team}: Clay projected wins ${row.projectedWins}, off rank ${row.offRank}, def rank ${row.defRank}, SOS rank ${row.sosRank}`,
    );
  }

  if (!lines.length && !teamLines.length) return "";
  const parts = [
    "NFL FANTASY / CLAY PROJECTION CONTEXT (not live odds; use for role, usage, and market-sentiment checks):",
    `Sources: ${NFL_FANTASY_MARKET_2026.meta.source} (${NFL_FANTASY_MARKET_2026.meta.updatedAt}); ${NFL_CLAY_PROJECTIONS_2026.meta.source} (${NFL_CLAY_PROJECTIONS_2026.meta.updatedAt}).`,
    `Prop note: ${NFL_CLAY_PROJECTIONS_2026.meta.injuryAdjustment}`,
  ];
  if (lines.length) parts.push(lines.join("\n"));
  if (teamLines.length) parts.push(`Team projection context:\n${teamLines.join("\n")}`);
  return `\n\n${parts.join("\n")}`;
}
