/**
 * Hydrate the weekly NFL "briefcase" for UR Take Ask and grade it per question.
 */
import {
  createEmptyNflGoatBriefcase,
  auditNflGoatBriefcaseCoverage,
  auditBriefcasePropCatalogCoverage,
  evaluateBriefcaseForInteraction,
} from "../shared/nflGoatExtractionContract.js";
import { buildNflLiveBoard } from "./_nflBoard.js";
import { isNflBdlPrimaryEnabled, buildNflGoatBriefcase } from "./_nflBdl.js";

/**
 * @param {Array<Record<string, unknown>>} games
 */
function oddsRowsFromGames(games) {
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const g of games || []) {
    if (!g || typeof g !== "object") continue;
    const has =
      g.spread != null ||
      g.total != null ||
      g.moneyline != null ||
      g.spread?.favoritePoint != null ||
      g.total?.line != null;
    if (!has) continue;
    out.push({
      game_id: g.providerGameId ?? g.id ?? null,
      away: g.awayAbbr || null,
      home: g.homeAbbr || null,
      spread: g.spread || null,
      total: g.total || null,
      moneyline: g.moneyline || null,
    });
  }
  return out;
}

/**
 * @param {unknown} depth
 * @returns {Record<string, unknown>}
 */
function rostersFromDepth(depth) {
  if (!depth || typeof depth !== "object") return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [team, d] of Object.entries(depth)) {
    if (!d || typeof d !== "object") continue;
    out[team] = [
      { role: "QB1", name: d.qb1 || null },
      { role: "QB2", name: d.qb2 || null },
      { role: "QB3", name: d.qb3 || null },
    ];
  }
  return out;
}

/**
 * ESPN roster snapshot → briefcase.rostersByTeam (fills the pocket when Ourlads KV is cold).
 * @param {Array<Record<string, unknown>>} players
 */
function rostersFromEspnPlayers(players) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const out = {};
  for (const p of players || []) {
    const team = String(p?.team || "").toUpperCase().trim();
    const name = String(p?.name || "").trim();
    if (!team || !name) continue;
    if (!out[team]) out[team] = [];
    out[team].push({
      role: String(p.position || p.pos || "").trim() || null,
      name,
      status: p.rosterStatus || p.status || null,
      jersey: p.jersey || null,
    });
  }
  return out;
}

/**
 * Map static pool players → seasonStats pocket (baseline until BDL season_stats).
 * @param {Record<string, unknown>} uiPlayers
 */
function seasonStatsFromUiPlayers(uiPlayers) {
  return Object.entries(uiPlayers || {})
    .slice(0, 80)
    .map(([name, p]) => ({
      player: name,
      team: p?.team || p?.teamAbbr || null,
      position: p?.position || p?.pos || null,
      source: "static_pool",
    }));
}

/**
 * @param {Array<Record<string, unknown>>} propLines
 * @returns {Array<number|string>}
 */
function playerIdsFromPropLines(propLines) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const row of propLines || []) {
    if (row?.playerId != null && row.playerId !== "") ids.add(String(row.playerId));
  }
  return [...ids].slice(0, 40);
}

/**
 * Format suitcase health for the Ask prompt (short, mandatory read).
 * @param {ReturnType<typeof evaluateBriefcaseForInteraction>} health
 * @param {ReturnType<typeof auditBriefcasePropCatalogCoverage>} [propCatalog]
 */
export function formatNflBriefcaseHealthPromptBlock(health, propCatalog = null) {
  if (!health) return "";
  const missing =
    health.missingNeeded?.length || health.alwaysMissing?.length
      ? ` Missing pockets: ${[...(health.alwaysMissing || []), ...(health.missingNeeded || [])]
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ")}.`
      : "";
  const propNote =
    health.detected?.propTypeHints?.length && health.propMatch?.matched === 0
      ? ` No live rows for ${health.detected.propTypeHints.join("/")}.`
      : health.propMatch?.matched
        ? ` Live prop rows matched: ${health.propMatch.matched}.`
        : "";
  const catalogNote =
    propCatalog && propCatalog.totalPropRows > 0
      ? ` Extended catalog on slate: ${propCatalog.extendedPresent}/${propCatalog.extendedTotal}.`
      : "";
  const forceLine = health.forcePass
    ? " FORCE PASS: call must be PASS. Do not invent a posted number."
    : "";
  const passRule = health.forcePass
    ? " PASS is the take — the priced market itself is missing."
    : " PASS only when the priced market itself is missing. Empty player-prop or roster pockets do not kill a posted spread/total.";
  return `NFL SUITCASE HEALTH (this Ask — grade ${String(health.grade || "?").toUpperCase()})
Detected market: ${health.detected?.label || "General"} (${health.detected?.marketId || "general"}).
${health.guidance || ""}${missing}${propNote}${catalogNote}${forceLine}
Elite weekly fill: ${health.eliteReady ? "yes" : "no"} (${health.requiredPct ?? 0}% required pockets).
Operate smoothly: prefer live pockets when present.${passRule} Never refuse the question.`;
}

/**
 * Build + grade briefcase for one Ask turn.
 * @param {{
 *   question?: string,
 *   depth?: unknown,
 *   espnRosterPlayers?: Array<Record<string, unknown>>,
 *   injuries?: Array<Record<string, unknown>>,
 *   uiPlayers?: Record<string, unknown>,
 *   includeLiveBoard?: boolean,
 *   maxPropGames?: number,
 *   board?: Record<string, unknown>|null,
 * }} [opts]
 */
export async function buildNflAskBriefcaseHealth(opts = {}) {
  const question = String(opts.question || "");

  /** @type {Record<string, unknown>|null} */
  let board = opts.board && typeof opts.board === "object" ? opts.board : null;
  if (!board && opts.includeLiveBoard !== false) {
    try {
      board = await buildNflLiveBoard({
        includeProps: true,
        maxPropGames: Math.max(1, Math.min(Number(opts.maxPropGames) || 4, 8)),
      });
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nfl_ask_briefcase_board_failed",
          error: err?.message || String(err),
        }),
      );
    }
  }

  const week = board?.week ?? null;
  const season = board?.season ?? null;
  const gameIds = Array.isArray(board?.games)
    ? board.games.map((g) => g.providerGameId).filter((id) => id != null).slice(0, 16)
    : [];
  const seedPlayerIds = playerIdsFromPropLines(board?.propLines || []);

  let briefcase = createEmptyNflGoatBriefcase({
    week,
    season,
    asOf: board?.asOf || new Date().toISOString(),
    primarySource: isNflBdlPrimaryEnabled() ? "balldontlie_nfl" : "action_network",
  });
  briefcase.league.teamDefense = {};
  briefcase.league.defenseSource = null;

  // Prefer GOAT hydrate when flag is on; AN board still fills gaps below.
  if (isNflBdlPrimaryEnabled()) {
    try {
      briefcase = await buildNflGoatBriefcase({
        week,
        season,
        gameIds,
        playerIds: seedPlayerIds,
        hydrateDefense: true,
        hydrateInjuries: true,
        hydrateStats: true,
      });
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nfl_ask_briefcase_goat_failed",
          error: err?.message || String(err),
        }),
      );
    }
  }

  if (board) {
    briefcase.week = board.week ?? briefcase.week;
    briefcase.season = board.season ?? briefcase.season;
    briefcase.asOf = board.asOf || briefcase.asOf;
    // Keep GOAT as primarySource when flag on even if AN board overlays slate
    if (!isNflBdlPrimaryEnabled()) {
      briefcase.primarySource = board.source || briefcase.primarySource;
    }
    if (Array.isArray(board.games) && board.games.length) {
      // Prefer board games when GOAT slate empty; otherwise keep GOAT week games
      if (!briefcase.slate.games?.length) briefcase.slate.games = board.games;
    }
    const odds = oddsRowsFromGames(board.games);
    if (odds.length && !briefcase.slate.odds?.length) {
      briefcase.slate.odds = odds;
    }
    if (Array.isArray(board.propLines) && board.propLines.length) {
      // Prefer live AN props when GOAT props empty (Week 1+ dual path)
      if (!briefcase.slate.playerProps?.length) {
        briefcase.slate.playerProps = board.propLines;
      }
    }
  }

  if (Array.isArray(opts.injuries) && opts.injuries.length) {
    if (!briefcase.league.injuries?.length) {
      briefcase.league.injuries = opts.injuries;
    }
  }
  const depthRosters = rostersFromDepth(opts.depth);
  const espnRosters = rostersFromEspnPlayers(opts.espnRosterPlayers);
  const bdlRosters = briefcase.league.rostersByTeam || {};
  const mergedRosters = { ...espnRosters, ...bdlRosters };
  for (const [team, rows] of Object.entries(depthRosters)) {
    mergedRosters[team] = [...(mergedRosters[team] || []), ...rows];
  }
  if (Object.keys(mergedRosters).length) {
    briefcase.league.rostersByTeam = mergedRosters;
  }

  // Static seasonStats only when GOAT did not fill live season_stats
  const hasLiveSeasonStats =
    Array.isArray(briefcase.players.seasonStats) &&
    briefcase.players.seasonStats.some((r) => r?.source && String(r.source).includes("balldontlie"));
  if (!hasLiveSeasonStats) {
    const seasonStats = seasonStatsFromUiPlayers(opts.uiPlayers || {});
    if (seasonStats.length) {
      briefcase.players.seasonStats = seasonStats;
    }
  }

  const audit = auditNflGoatBriefcaseCoverage(briefcase);
  const propCatalog = auditBriefcasePropCatalogCoverage(briefcase);
  const interaction = evaluateBriefcaseForInteraction(briefcase, question);
  briefcase.coverage = {
    ...briefcase.coverage,
    ...audit,
    propCatalog,
    interaction,
    defenseTeams: Object.keys(briefcase.league.teamDefense || {}).length,
    defenseSource: briefcase.league.defenseSource || null,
  };

  console.info(
    JSON.stringify({
      event: "nfl_ask_briefcase_health",
      grade: interaction.grade,
      smooth: interaction.smooth,
      marketId: interaction.detected?.marketId || null,
      eliteReady: interaction.eliteReady,
      requiredPct: interaction.requiredPct,
      alwaysMissing: interaction.alwaysMissing,
      missingNeeded: interaction.missingNeeded,
      propMatched: interaction.propMatch?.matched ?? 0,
      propRows: briefcase.slate.playerProps?.length ?? 0,
      gameCount: briefcase.slate.games?.length ?? 0,
      defenseTeams: briefcase.coverage.defenseTeams,
      defenseSource: briefcase.coverage.defenseSource,
      bdlPrimary: isNflBdlPrimaryEnabled(),
      extendedPct: propCatalog.extendedPct,
    }),
  );

  return {
    briefcase,
    interaction,
    propCatalog,
    audit,
    promptBlock: formatNflBriefcaseHealthPromptBlock(interaction, propCatalog),
  };
}
