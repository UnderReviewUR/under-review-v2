import { getDurableJson, getKvStoreHealth } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { NFL_CLAY_PROJECTIONS_2026 } from "./data/nfl-clay-projections-2026.js";
import { NFL_FANTASY_MARKET_2026 } from "./data/nfl-fantasy-market-2026.js";
import { NFL_QB_STATS_2025 } from "./data/nfl-qb-stats-2025.js";
import { countNflPlayerStats2025ByPosition } from "./data/nfl-player-stats-2025.js";
import { NFL_DEFENSE_ALLOWED_2025 } from "./data/nfl-defense-allowed-2025.js";
import { NFL_2026_PLAYER_PROP_OUS } from "./_nflPropLineContext.js";
import { readNflGameDayStatusSnapshot } from "./_nflEspnGameDayStatus.js";

function ageMs(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0, Date.now() - n);
}

function hours(ms) {
  if (ms == null) return null;
  return Math.round((ms / 3600000) * 10) / 10;
}

export async function buildNflHealthSnapshot() {
  const [roster, depth, gameDay] = await Promise.all([
    getDurableJson("nfl_espn_roster").catch(() => null),
    getDurableJson("nfl_depth_chart").catch(() => null),
    readNflGameDayStatusSnapshot().catch(() => null),
  ]);
  const rosterAgeMs = ageMs(roster?.fetchedAt);
  const depthAgeMs = ageMs(depth?.fetchedAt || depth?.updatedAtMs || depth?.updatedAt);
  const gameDayAgeMs = ageMs(gameDay?.fetchedAt);
  const breaking = String(getEnv("NFL_BREAKING") || "").trim();
  const playerCount = Array.isArray(roster?.players) ? roster.players.length : 0;
  const depthTeamCount =
    depth?.depth && typeof depth.depth === "object" ? Object.keys(depth.depth).length : 0;
  const playerStatsByPos = countNflPlayerStats2025ByPosition();

  const ok = Boolean(playerCount >= 1500);
  return {
    ok,
    kv: getKvStoreHealth(),
    roster: {
      source: roster?.source || "espn_site_api",
      loaded: playerCount > 0,
      playerCount,
      coachTeams: roster?.coaches ? Object.keys(roster.coaches).length : 0,
      fetchedAt: roster?.fetchedAt || null,
      ageHours: hours(rosterAgeMs),
      changeSummary: roster?.changeSummary || { total: 0 },
    },
    depth: {
      loaded: depthTeamCount > 0,
      teamCount: depthTeamCount,
      fetchedAt: depth?.fetchedAt || depth?.updatedAtMs || depth?.updatedAt || null,
      ageHours: hours(depthAgeMs),
    },
    gameDayStatus: {
      loaded: Boolean(gameDay?.fetchedAt),
      source: gameDay?.source || "espn_scoreboard_summary",
      fetchedAt: gameDay?.fetchedAt || null,
      ageHours: hours(gameDayAgeMs),
      eventCount: gameDay?.eventCount || 0,
      injuryRowCount: gameDay?.injuryRowCount || 0,
    },
    breaking: {
      active: Boolean(breaking),
      preview: breaking ? breaking.slice(0, 160) : null,
    },
    projections: {
      clayLoaded: Object.keys(NFL_CLAY_PROJECTIONS_2026.players || {}).length > 0,
      clayPlayerCount: Object.keys(NFL_CLAY_PROJECTIONS_2026.players || {}).length,
      clayTeamCount: Object.keys(NFL_CLAY_PROJECTIONS_2026.teams || {}).length,
      clayUpdatedAt: NFL_CLAY_PROJECTIONS_2026.meta.updatedAt,
      fantasyMarketLoaded: Object.keys(NFL_FANTASY_MARKET_2026.players || {}).length > 0,
      fantasyMarketPlayerCount: Object.keys(NFL_FANTASY_MARKET_2026.players || {}).length,
      fantasyMarketUpdatedAt: NFL_FANTASY_MARKET_2026.meta.updatedAt,
      qbStats2025Loaded: Object.keys(NFL_QB_STATS_2025 || {}).length > 0,
      qbStats2025PlayerCount: Object.keys(NFL_QB_STATS_2025 || {}).length,
      qbStats2025Source: "nflverse stats_player_reg_2025.csv",
      playerStats2025ByPosition: playerStatsByPos,
      defenseAllowed2025Loaded: Object.keys(NFL_DEFENSE_ALLOWED_2025 || {}).length === 32,
      defenseAllowed2025TeamCount: Object.keys(NFL_DEFENSE_ALLOWED_2025 || {}).length,
      defenseAllowed2025Source: "nflverse stats_team_week_2025.csv",
    },
    props: {
      actionNetworkPrimary: true,
      bdlPrimaryFlag: ["1", "true", "yes"].includes(
        String(getEnv("NFL_BDL_PRIMARY") || "")
          .trim()
          .toLowerCase(),
      ),
      staticFallbackLoaded: Object.keys(NFL_2026_PLAYER_PROP_OUS || {}).length > 0,
      staticFallbackPlayerCount: Object.keys(NFL_2026_PLAYER_PROP_OUS || {}).length,
    },
  };
}
