import { getDurableJson, getKvStoreHealth } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { NFL_CLAY_PROJECTIONS_2026 } from "./data/nfl-clay-projections-2026.js";
import { NFL_FANTASY_MARKET_2026 } from "./data/nfl-fantasy-market-2026.js";
import { NFL_QB_STATS_2025 } from "./data/nfl-qb-stats-2025.js";
import { countNflPlayerStats2025ByPosition } from "./data/nfl-player-stats-2025.js";
import { NFL_DEFENSE_ALLOWED_2025 } from "./data/nfl-defense-allowed-2025.js";
import { NFL_2026_PLAYER_PROP_OUS } from "./_nflPropLineContext.js";
import { readNflGameDayStatusSnapshot } from "./_nflEspnGameDayStatus.js";
import { readNflFantasyRankingsSnapshot } from "./_nflEspnFantasyRankings.js";
import { readNflverseLiveStatsSnapshot } from "./_nflverseLiveStats.js";
import { isNflMonthInSeason } from "../shared/slateModulePriority.js";

function ageMs(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0, Date.now() - n);
}

function hours(ms) {
  if (ms == null) return null;
  return Math.round((ms / 3600000) * 10) / 10;
}

/** Rankings stale if older than 72h (midweek injury/trade moves). */
const RANKINGS_STALE_MS = 72 * 60 * 60 * 1000;
/** Live week stats stale if older than 8 days in-season. */
const LIVE_STATS_STALE_MS = 8 * 24 * 60 * 60 * 1000;

export async function buildNflHealthSnapshot() {
  const [roster, depth, gameDay, fantasyRanks, liveStats] = await Promise.all([
    getDurableJson("nfl_espn_roster").catch(() => null),
    getDurableJson("nfl_depth_chart").catch(() => null),
    readNflGameDayStatusSnapshot().catch(() => null),
    readNflFantasyRankingsSnapshot().catch(() => null),
    readNflverseLiveStatsSnapshot().catch(() => null),
  ]);
  const rosterAgeMs = ageMs(roster?.fetchedAt);
  const depthAgeMs = ageMs(depth?.fetchedAt || depth?.updatedAtMs || depth?.updatedAt);
  const gameDayAgeMs = ageMs(gameDay?.fetchedAt);
  const ranksAgeMs = ageMs(fantasyRanks?.fetchedAt);
  const liveStatsAgeMs = ageMs(liveStats?.fetchedAt);
  const breaking = String(getEnv("NFL_BREAKING") || "").trim();
  const playerCount = Array.isArray(roster?.players) ? roster.players.length : 0;
  const depthTeamCount =
    depth?.depth && typeof depth.depth === "object" ? Object.keys(depth.depth).length : 0;
  const playerStatsByPos = countNflPlayerStats2025ByPosition();
  const inSeason = isNflMonthInSeason(new Date());

  const rankingsStale =
    Boolean(fantasyRanks?.fetchedAt) && ranksAgeMs != null && ranksAgeMs > RANKINGS_STALE_MS;
  const liveStatsStale =
    inSeason &&
    Boolean(liveStats?.fetchedAt) &&
    liveStatsAgeMs != null &&
    liveStatsAgeMs > LIVE_STATS_STALE_MS;

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
    fantasyRankings: {
      loaded: Boolean(fantasyRanks?.fetchedAt),
      source: fantasyRanks?.source || "espn_fantasy_leaguedefaults",
      seasonYear: fantasyRanks?.seasonYear || null,
      playerCount: fantasyRanks?.playerCount || 0,
      fetchedAt: fantasyRanks?.fetchedAt || null,
      ageHours: hours(ranksAgeMs),
      stale: rankingsStale,
      slaHours: 72,
    },
    liveStats: {
      loaded: Boolean(liveStats?.fetchedAt),
      source: liveStats?.source || "nflverse_stats_player_week",
      seasonYear: liveStats?.seasonYear || null,
      preferredSeasonYear: liveStats?.preferredSeasonYear || null,
      usedPriorSeasonFallback: Boolean(liveStats?.usedPriorSeasonFallback),
      playerCount: liveStats?.playerCount || 0,
      maxWeek: liveStats?.maxWeek || null,
      fetchedAt: liveStats?.fetchedAt || null,
      ageHours: hours(liveStatsAgeMs),
      stale: liveStatsStale,
      slaHoursInSeason: 192,
      inSeason,
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
