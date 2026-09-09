/**
 * NFL Ask fast context — scoped matchup/prop lane (~2–4s hydrate target).
 */
import { getDurableJson } from "./_durableStore.js";
import { defenses } from "./nfl-defense.js";
import { getNflBoardCached, nflPropsPayloadToPropLines } from "./_nflBoard.js";
import { getNflPropsForBoard } from "./_nflProps.js";
import { buildNflMatchupCard } from "./_nflMatchupCard.js";
import {
  fetchNflBdlPlayerPropsForGame,
  fetchNflBdlWeekGames,
  fetchNflBdlWeekOdds,
  fetchNflBdlSlateRosters,
  isNflBdlPrimaryEnabled,
} from "./_nflBdl.js";
import { resolveNflScopeTeamAbbrevSet } from "./_nflContext.js";
import { pickNflGamesForScope, trimNflPlayerPropsForAsk, normalizePlayerKey } from "../shared/nflAskPropTrim.js";
import {
  buildNflStaticPlayerTeamIndex,
  scrubNflMatchupPropLines,
  staticRosterNamesForScope,
} from "./_nflMatchupPropHygiene.js";
import { isNflScopedPropFastPath } from "../shared/nflAskFastPath.js";
import { detectNflAskMarket, evaluateBriefcaseForInteraction } from "../shared/nflGoatExtractionContract.js";
import {
  buildNflAskDisciplinePromptBlock,
  buildNflSeasonTypeWarning,
} from "../shared/nflAskDiscipline.js";
import { inferNflSeasonYear } from "../shared/bdlSeasonDefaults.js";

const FAST_PROMPT_BUDGET = 6500;

function scopeMatchesTeam(scope, teamFromRow) {
  const t = String(teamFromRow || "").toUpperCase().trim();
  if (!t) return false;
  for (const s of scope) {
    const a = String(s || "").toUpperCase();
    if (t === a) return true;
    if ((a === "WSH" || a === "WAS") && (t === "WSH" || t === "WAS")) return true;
    if ((a === "ARI" || a === "ARZ") && (t === "ARI" || t === "ARZ")) return true;
    if ((a === "NE" || a === "NWE") && (t === "NE" || t === "NWE")) return true;
    if ((a === "LA" || a === "LAR") && (t === "LA" || t === "LAR")) return true;
    if ((a === "JAC" || a === "JAX") && (t === "JAC" || t === "JAX")) return true;
  }
  return false;
}

function filterDefensesForScope(scope) {
  const out = {};
  for (const [abbr, row] of Object.entries(defenses || {})) {
    if (scopeMatchesTeam(scope, abbr)) out[abbr] = row;
  }
  return out;
}

function formatDefenseFast(defMap) {
  const lines = Object.entries(defMap).map(([abbr, d]) => {
    const prior = d?.priorVintage || d?.priorSeason ? " · '25 prior" : "";
    return `${abbr} (${d.tier}${prior}): ${d.overall?.ptsAllowed ?? "?"} pts/g | pass ${d.pass?.rank ?? "?"} | rush ${d.rush?.rank ?? "?"}`;
  });
  return lines.length ? `DEFENSE (static prior):\n${lines.join("\n")}` : "";
}

function formatFastGameLine(game) {
  if (!game) return "";
  const bits = [`${game.awayAbbr || "?"} @ ${game.homeAbbr || "?"}`];
  if (game.week != null) bits.push(`week ${game.week}`);
  if (game.status) bits.push(String(game.status));
  const spread =
    game.spread?.displayLine ||
    (game.spread?.favoriteAbbr && game.spread?.favoritePoint != null
      ? `${game.spread.favoriteAbbr} -${game.spread.favoritePoint}`
      : null);
  const total = game.total?.line ?? game.totalLine ?? null;
  const mlHome = game.moneyline?.home ?? game.mlHome ?? null;
  const mlAway = game.moneyline?.away ?? game.mlAway ?? null;
  if (spread) bits.push(`spread ${spread}`);
  if (total != null && total !== "") bits.push(`total ${total}`);
  if (mlHome != null || mlAway != null) {
    bits.push(`ml ${game.awayAbbr || "AWAY"} ${mlAway ?? "—"} / ${game.homeAbbr || "HOME"} ${mlHome ?? "—"}`);
  }
  return bits.join(" | ");
}

function gamePricesToOddsStub(game) {
  if (!game) return [];
  const spread = game.spread?.displayLine || null;
  const total = game.total?.line ?? null;
  if (spread == null && total == null) return [];
  return [
    {
      game_id: game.providerGameId ?? game.id ?? null,
      awayAbbr: game.awayAbbr,
      homeAbbr: game.homeAbbr,
      spread,
      total,
      source: "fast_board_game",
    },
  ];
}

function formatPostedPropsForAsk(props, max = 18) {
  return (props || [])
    .slice(0, max)
    .map(
      (p) =>
        `- ${p.player} ${p.prop} ${p.line} O${p.overOdds ?? "—"}/U${p.underOdds ?? "—"} (${p.book || "?"})`,
    )
    .join("\n");
}

/**
 * @param {{ question?: string, matchupContext?: object|null }} options
 */
export async function buildNflFastAskContext(options = {}) {
  const question = String(options.question || "");
  if (!isNflScopedPropFastPath(question)) return null;

  const t0 = Date.now();
  let scope = resolveNflScopeTeamAbbrevSet(question, options.matchupContext || null);
  if (scope.size > 2) scope = new Set();
  if (!scope.size) return null;

  const [board, depthData, rosterData] = await Promise.all([
    getNflBoardCached({}),
    getDurableJson("nfl_depth_chart"),
    getDurableJson("nfl_espn_roster"),
  ]);

  const scopedGames = pickNflGamesForScope(board.games || [], scope);
  const anGame = scopedGames[0] || null;
  let game = anGame;
  /** @type {Array<Record<string, unknown>>} */
  let propLines = [];
  /** @type {Array<Record<string, unknown>>} */
  let gamesForCard = scopedGames;
  let propsSource = "none";
  /** @type {string[]} */
  const rosterNames = [];
  /** @type {Record<string, Array<{ name: string }>>} */
  const rostersByTeam = {};
  /** @type {Record<string, string>} */
  const bdlTeamIndex = {};

  // GOAT primary: resolve BDL game ids by abbr (never feed Action Network ids to /odds/player_props).
  if (isNflBdlPrimaryEnabled()) {
    try {
      const season = board.season != null ? Number(board.season) : inferNflSeasonYear();
      const week = board.week != null ? Number(board.week) : 1;
      const bdlWeek = await fetchNflBdlWeekGames({ season, week });
      const bdlScoped = pickNflGamesForScope(bdlWeek.games || [], scope);
      const bdlGame = bdlScoped[0];
      if (bdlGame?.providerGameId) {
        game = {
          ...bdlGame,
          // Keep AN tipoff / network / total when BDL row is thin.
          tipoffMs: bdlGame.tipoffMs ?? anGame?.tipoffMs ?? null,
          total: bdlGame.total || anGame?.total || null,
          spread: bdlGame.spread || anGame?.spread || null,
          moneyline: bdlGame.moneyline || anGame?.moneyline || null,
          network: bdlGame.network || anGame?.network || null,
        };
        gamesForCard = [game];
        propLines = await fetchNflBdlPlayerPropsForGame(bdlGame.providerGameId, {
          gameLabel: `${bdlGame.awayAbbr} @ ${bdlGame.homeAbbr}`,
        });
        if (propLines.length) propsSource = "balldontlie_nfl";

        // BDL slate rosters are often polluted (e.g. A.J. Brown as NE WR1).
        // Only use them as a low-priority team index — never as the exclusive allowlist.
        try {
          const rosterRes = await fetchNflBdlSlateRosters([bdlGame], { season });
          for (const [team, rows] of Object.entries(rosterRes.rostersByTeam || {})) {
            if (!scopeMatchesTeam(scope, team)) continue;
            for (const r of rows || []) {
              const name = String(r?.name || r?.player || "").trim();
              if (!name) continue;
              const key = normalizePlayerKey(name);
              const ab = String(team || "").toUpperCase();
              if (key && ab && !bdlTeamIndex[key]) bdlTeamIndex[key] = ab;
            }
          }
        } catch {
          /* ESPN/static still scrub below */
        }

        // Overlay BDL week odds onto the game line when AN board is thin / mismatched ids.
        const oddsRes = await fetchNflBdlWeekOdds({ season, week });
        const oddsRow = (oddsRes.rows || []).find(
          (r) => String(r.game_id) === String(bdlGame.providerGameId),
        );
        if (oddsRow && game && typeof game === "object") {
          game = {
            ...game,
            spread:
              game.spread ||
              (oddsRow.spread?.home != null
                ? {
                    favoriteAbbr: Number(oddsRow.spread.home) < 0 ? bdlGame.homeAbbr : bdlGame.awayAbbr,
                    favoritePoint: Math.abs(Number(oddsRow.spread.home)),
                    displayLine:
                      Number(oddsRow.spread.home) < 0
                        ? `${bdlGame.homeAbbr} ${oddsRow.spread.home}`
                        : `${bdlGame.awayAbbr} ${oddsRow.spread.away}`,
                  }
                : game.spread),
            total:
              game.total ||
              (oddsRow.total?.line != null ? { line: Number(oddsRow.total.line) } : game.total),
            moneyline:
              game.moneyline ||
              (oddsRow.moneyline
                ? { home: oddsRow.moneyline.home, away: oddsRow.moneyline.away }
                : game.moneyline),
          };
          gamesForCard = [game];
        }
      }
    } catch {
      /* fall through to AN cache */
    }
  }

  // AN props only when GOAT primary is off. With NFL_BDL_PRIMARY, empty GOAT stays empty.
  if (!isNflBdlPrimaryEnabled() && !propLines.length && anGame?.providerGameId) {
    try {
      const anProps = await getNflPropsForBoard(anGame.providerGameId, {
        tipoffMs: anGame.tipoffMs,
        cacheOnly: false,
      });
      if (anProps) {
        propLines = nflPropsPayloadToPropLines(anProps, anGame);
        if (propLines.length) propsSource = "action_network";
      }
    } catch {
      /* leave empty — scout/pass downstream */
    }
  }

  if (!game?.providerGameId && !anGame?.providerGameId && !propLines.length) return null;

  for (const p of rosterData?.players || []) {
    if (!scopeMatchesTeam(scope, p.team)) continue;
    const name = String(p.name || "").trim();
    if (!name) continue;
    rosterNames.push(name);
    const ab = String(p.team || "").toUpperCase();
    if (!rostersByTeam[ab]) rostersByTeam[ab] = [];
    if (!rostersByTeam[ab].some((r) => String(r.name).toLowerCase() === name.toLowerCase())) {
      rostersByTeam[ab].push({ name, role: p.position || null });
    }
  }
  const staticTeamIndex = buildNflStaticPlayerTeamIndex();
  const espnTeamIndex = {};
  for (const p of rosterData?.players || []) {
    if (!scopeMatchesTeam(scope, p.team)) continue;
    const key = normalizePlayerKey(p.name);
    const ab = String(p.team || "").toUpperCase();
    if (key && ab) espnTeamIndex[key] = ab;
  }
  // Trust order: static curated > ESPN > BDL (BDL rosters mis-tag free agents onto the slate).
  const playerTeamByName = { ...bdlTeamIndex, ...espnTeamIndex, ...staticTeamIndex };
  const staticNames = staticRosterNamesForScope(scope, playerTeamByName);
  for (const name of staticNames) {
    rosterNames.push(name);
    // Mirror into rostersByTeam so the Ask guard can allowlist without ESPN KV.
    const team = playerTeamByName[name] || staticTeamIndex[name];
    if (team) {
      if (!rostersByTeam[team]) rostersByTeam[team] = [];
      if (!rostersByTeam[team].some((r) => String(r.name).toLowerCase() === name)) {
        rostersByTeam[team].push({ name, role: null });
      }
    }
  }

  propLines = scrubNflMatchupPropLines(propLines, {
    scope,
    rosterNames,
    playerTeamByName,
  });
  propLines = trimNflPlayerPropsForAsk(propLines, {
    scope,
    question,
    maxRows: 24,
    rosterNames,
    playerTeamByName,
  });

  const injuryRows = [];
  for (const p of rosterData?.players || []) {
    if (!scopeMatchesTeam(scope, p.team)) continue;
    if (!p?.injuryStatus || p.injuryStatus === "Active") continue;
    injuryRows.push({
      player: p.name,
      team: p.team,
      position: p.position,
      status: p.injuryStatus,
    });
  }

  const depthSlice = {};
  const depthAll = depthData?.depth || {};
  for (const [team, d] of Object.entries(depthAll)) {
    if (scopeMatchesTeam(scope, team)) depthSlice[team] = d;
  }

  const matchupCard = buildNflMatchupCard({
    question,
    scopeTeams: scope,
    homeAbbr: String(game.homeAbbr || "").toUpperCase() || null,
    games: gamesForCard,
    propLines,
    injuries: injuryRows,
    depth: depthSlice,
    injuryMeta: { fetchedAt: rosterData?.fetchedAt ?? null, asOf: board.asOf || null },
    defenseByTeam: filterDefensesForScope(scope),
    recentStats: [],
  });

  const market = detectNflAskMarket(question);
  const oddsStub = gamePricesToOddsStub(game);
  const hasGamePrice = oddsStub.length > 0;
  const hasLiveForMarket =
    (Array.isArray(market.propTypeHints) && market.propTypeHints.length > 0
      ? propLines.length > 0
      : hasGamePrice) || propLines.length > 0;
  const lines = [
    `NFL FAST BOARD (${[...scope].sort().join(" vs ")}) — live GOAT/board prices when present`,
    formatFastGameLine(game),
    hasGamePrice
      ? `POSTED GAME PRICES:\n- ${oddsStub
          .map((o) =>
            [o.spread ? `spread ${o.spread}` : null, o.total != null ? `total ${o.total}` : null]
              .filter(Boolean)
              .join(" · "),
          )
          .join("\n- ")}`
      : "POSTED GAME PRICES: none on cached board — do not invent a spread/total.",
    propLines.length
      ? `POSTED PROPS (matchup · ${propsSource}):\n${formatPostedPropsForAsk(propLines)}`
      : market.propTypeHints?.length
        ? "POSTED PROPS: none cached — PASS the prop if no live row; do not invent."
        : "POSTED PROPS: none loaded (not required for spread/total/opinion).",
    formatDefenseFast(filterDefensesForScope(scope)),
    injuryRows.length
      ? `INJURIES:\n${injuryRows.map((i) => `- ${i.player} (${i.team}): ${i.status}`).join("\n")}`
      : "",
    Object.keys(depthSlice).length
      ? `DEPTH:\n${Object.entries(depthSlice)
          .map(([t, d]) => `${t}: QB1 ${d.qb1 || "n/a"}`)
          .join("\n")}`
      : "",
    matchupCard.cardBlock || matchupCard.promptBlock || "",
    buildNflSeasonTypeWarning(gamesForCard),
    buildNflAskDisciplinePromptBlock({
      question,
      marketId: matchupCard.marketId || market.marketId,
      phase: matchupCard.phase,
      hasLiveLine: hasLiveForMarket,
      injuryFlag: injuryRows.length > 0,
      ambiguousPlayer: matchupCard.ambiguous ? (matchupCard.candidates || []).join(" / ") : null,
    }),
  ].filter(Boolean);

  let promptContext = lines.join("\n\n");
  if (promptContext.length > FAST_PROMPT_BUDGET) {
    promptContext = `${promptContext.slice(0, FAST_PROMPT_BUDGET)}\n\n[trimmed for fast lane]`;
  }

  const stubBriefcase = {
    slate: { games: gamesForCard, odds: oddsStub, playerProps: propLines },
    league: { injuries: injuryRows, rostersByTeam, playerTeamByName },
  };
  const interaction = evaluateBriefcaseForInteraction(stubBriefcase, question);
  const buildMs = Date.now() - t0;

  console.info(
    JSON.stringify({
      event: "nfl_context_fast_path",
      buildMs,
      propRows: propLines.length,
      propsSource,
      promptChars: promptContext.length,
      scope: [...scope],
      gameId: game.providerGameId,
      bdlPrimary: isNflBdlPrimaryEnabled(),
    }),
  );

  return {
    uiPlayers: {},
    promptContext,
    briefcase: {
      grade: interaction.grade,
      smooth: interaction.smooth,
      marketId: interaction.detected?.marketId || market.marketId,
      detected: interaction.detected,
      propMatch: interaction.propMatch,
      forcePass: Boolean(interaction.forcePass),
      eliteReady: interaction.eliteReady,
      requiredPct: interaction.requiredPct,
      propCatalog: null,
      promptBlock: "",
    },
    propLines,
    draft: { phase: "in_season" },
    meta: {
      totalPlayers: 0,
      wrteCount: 0,
      rbCount: 0,
      qbCount: 0,
      generatedAt: new Date().toISOString(),
      nflDraftPhase: "in_season",
      nflPromptContextChars: promptContext.length,
      nflPromptScopeMode: `fast:${[...scope].sort().join("+")}`,
      briefcaseGrade: interaction.grade,
      briefcaseSmooth: interaction.smooth,
      briefcaseMarketId: interaction.detected?.marketId || null,
      matchupPlayer: matchupCard.player?.name || null,
      matchupOpponent: matchupCard.opponent || null,
      matchupThesis: matchupCard.thesis || null,
      skipLiveBoard: false,
      fastPath: true,
      propsSource,
      buildMs,
    },
    games: gamesForCard,
    inactives: { postedCount: 0, asOf: null, source: "fast_skip", games: [] },
    matchup: {
      thesis: matchupCard.thesis || "",
      player: matchupCard.player || null,
      opponent: matchupCard.opponent || null,
      homeAbbr: matchupCard.homeAbbr || null,
      defenseTier: matchupCard.defenseTier || null,
      liveLine: matchupCard.liveLine
        ? {
            prop: matchupCard.liveLine.prop || matchupCard.liveLine.propRaw || null,
            line: matchupCard.liveLine.line ?? null,
            book: matchupCard.liveLine.book || null,
          }
        : null,
      injuryFlag: Boolean(matchupCard.injuryLine),
      promptBlock: matchupCard.promptBlock || "",
      namedIdentities: matchupCard.namedIdentities || [],
    },
    dataFreshness: {
      isCurrentSeason: true,
      warning: "Fast lane — cached props + matchup card; full briefcase skipped for latency.",
      briefcase: {
        grade: interaction.grade,
        smooth: interaction.smooth,
        marketId: interaction.detected?.marketId || null,
        eliteReady: interaction.eliteReady,
        guidance: interaction.guidance,
      },
      skipLiveBoard: false,
      inactivesPosted: false,
      defenseSource: "static_2025",
      defenseTeamCount: Object.keys(filterDefensesForScope(scope)).length,
    },
  };
}
