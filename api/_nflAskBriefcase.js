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
import {
  buildNflPlayerTeamIndex,
  mergeNflPlayerTeamIndexesPreferLast,
  mergeNflRostersByTeamPreferLast,
  trimNflPlayerPropsForAsk,
} from "../shared/nflAskPropTrim.js";
import {
  scrubNflMatchupPropLines,
  buildNflStaticPlayerTeamIndex,
  staticRosterNamesForScope,
} from "./_nflMatchupPropHygiene.js";
import { isNflBdlPrimaryEnabled, buildNflGoatBriefcase } from "./_nflBdl.js";
import { inferNflSeasonYear } from "../shared/bdlSeasonDefaults.js";

/**
 * @param {Set<string>} scope
 * @param {string} team
 */
function scopeMatchesAbbr(scope, team) {
  const t = String(team || "").toUpperCase().trim();
  if (!t || !scope?.size) return false;
  if (scope.has(t)) return true;
  if ((t === "NE" || t === "NWE") && (scope.has("NE") || scope.has("NWE"))) return true;
  if ((t === "WSH" || t === "WAS") && (scope.has("WSH") || scope.has("WAS"))) return true;
  if ((t === "LA" || t === "LAR") && (scope.has("LA") || scope.has("LAR"))) return true;
  if ((t === "JAC" || t === "JAX") && (scope.has("JAC") || scope.has("JAX"))) return true;
  if ((t === "ARI" || t === "ARZ") && (scope.has("ARI") || scope.has("ARZ"))) return true;
  return false;
}

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
 *   scopeAbbrs?: Set<string>|string[],
 * }} [opts]
 */
export async function buildNflAskBriefcaseHealth(opts = {}) {
  const question = String(opts.question || "");
  const scopeSet =
    opts.scopeAbbrs instanceof Set
      ? opts.scopeAbbrs
      : Array.isArray(opts.scopeAbbrs) && opts.scopeAbbrs.length
        ? new Set(opts.scopeAbbrs.map((x) => String(x || "").toUpperCase()))
        : null;
  const scoped = Boolean(scopeSet?.size && scopeSet.size <= 2);

  /** @type {Record<string, unknown>|null} */
  let board = opts.board && typeof opts.board === "object" ? opts.board : null;
  if (!board && opts.includeLiveBoard !== false) {
    try {
      board = await buildNflLiveBoard({
        includeProps: true,
        maxPropGames: Math.max(1, Math.min(Number(opts.maxPropGames) || (scoped ? 1 : 4), 8)),
        ...(scopeSet?.size ? { scopeAbbrs: scopeSet } : {}),
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

  const week = board?.week != null ? Number(board.week) : null;
  const season =
    board?.season != null ? Number(board.season) : isNflBdlPrimaryEnabled() ? inferNflSeasonYear() : null;
  // AN board game ids must not be passed into BDL prop fetches.
  const seedPlayerIds = playerIdsFromPropLines(board?.propLines || []);

  let briefcase = createEmptyNflGoatBriefcase({
    week: Number.isFinite(week) ? week : null,
    season: Number.isFinite(season) ? season : null,
    asOf: board?.asOf || new Date().toISOString(),
    primarySource: isNflBdlPrimaryEnabled() ? "balldontlie_nfl" : "action_network",
  });
  briefcase.league.teamDefense = {};
  briefcase.league.defenseSource = null;

  // Prefer GOAT hydrate when flag is on; AN board still fills gaps below.
  if (isNflBdlPrimaryEnabled()) {
    try {
      briefcase = await buildNflGoatBriefcase({
        week: Number.isFinite(week) ? week : 1,
        season: Number.isFinite(season) ? season : inferNflSeasonYear(),
        scopeAbbrs: scopeSet || undefined,
        maxPropGames: scoped ? 2 : 4,
        playerIds: seedPlayerIds,
        hydrateDefense: true,
        hydrateInjuries: true,
        hydrateStats: false,
        hydrateRosters: false,
        hydrateAllRosters: false,
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

  let propsSource = isNflBdlPrimaryEnabled() ? "balldontlie_nfl" : "action_network";

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
    // GOAT primary: never fill prop pocket from Action Network — empty GOAT stays empty.
    if (
      !isNflBdlPrimaryEnabled() &&
      Array.isArray(board.propLines) &&
      board.propLines.length &&
      !briefcase.slate.playerProps?.length
    ) {
      briefcase.slate.playerProps = board.propLines;
      propsSource = "action_network";
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
  // BDL GOAT rosters are truth; ESPN/depth only fill gaps.
  const mergedRosters = mergeNflRostersByTeamPreferLast(espnRosters, depthRosters, bdlRosters);
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

  // Scrub AFTER roster merge. Static fills gaps; live BDL/roster assignments win conflicts.
  const staticTeamIndex = buildNflStaticPlayerTeamIndex();
  const rosterTeamIndex = buildNflPlayerTeamIndex(
    Object.entries(briefcase.league.rostersByTeam || {}).flatMap(([team, rows]) =>
      (Array.isArray(rows) ? rows : []).map((r) => ({
        name: r?.name || r?.player,
        team,
      })),
    ),
  );
  // static < prior goat index < merged live rosters (BDL last in mergeNflRosters…)
  const playerTeamByName = mergeNflPlayerTeamIndexesPreferLast(
    staticTeamIndex,
    briefcase.league.playerTeamByName || {},
    rosterTeamIndex,
  );
  briefcase.league.playerTeamByName = playerTeamByName;

  /** @type {string[]} */
  let rosterNames = [];
  if (scopeSet?.size) {
    // Allowlist includes BDL slate names (truth) plus ESPN/depth/static fillers.
    for (const [team, rows] of Object.entries(briefcase.league.rostersByTeam || {})) {
      if (!scopeMatchesAbbr(scopeSet, team)) continue;
      for (const r of rows || []) {
        const n = String(r?.name || r?.player || "").trim();
        if (n) rosterNames.push(n);
      }
    }
    rosterNames = [...rosterNames, ...staticRosterNamesForScope(scopeSet, playerTeamByName)];
  }

  const propCap = scoped ? 56 : 120;
  let props = briefcase.slate.playerProps || [];
  if (scoped && scopeSet?.size) {
    props = scrubNflMatchupPropLines(props, {
      scope: scopeSet,
      rosterNames,
      playerTeamByName,
    });
  }
  briefcase.slate.playerProps = trimNflPlayerPropsForAsk(props, {
    scope: scopeSet || [],
    question,
    maxRows: propCap,
    rosterNames,
    playerTeamByName,
  });
  if (board?.propLines?.length) {
    let boardProps = board.propLines;
    if (scoped && scopeSet?.size) {
      boardProps = scrubNflMatchupPropLines(boardProps, {
        scope: scopeSet,
        rosterNames,
        playerTeamByName,
      });
    }
    board.propLines = trimNflPlayerPropsForAsk(boardProps, {
      scope: scopeSet || [],
      question,
      maxRows: propCap,
      rosterNames,
      playerTeamByName,
    });
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
      propsSource,
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
