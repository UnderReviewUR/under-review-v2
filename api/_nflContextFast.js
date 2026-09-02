/**
 * NFL Ask fast context — scoped matchup/prop lane (~2–4s hydrate target).
 */
import { getDurableJson } from "./_durableStore.js";
import { defenses } from "./nfl-defense.js";
import { getNflBoardCached, nflPropsPayloadToPropLines } from "./_nflBoard.js";
import { getNflPropsForBoard } from "./_nflProps.js";
import { buildNflMatchupCard } from "./_nflMatchupCard.js";
import { fetchNflBdlPlayerPropsForGame, isNflBdlPrimaryEnabled } from "./_nflBdl.js";
import { resolveNflScopeTeamAbbrevSet } from "./_nflContext.js";
import { pickNflGamesForScope, trimNflPlayerPropsForAsk } from "../shared/nflAskPropTrim.js";
import { isNflScopedPropFastPath } from "../shared/nflAskFastPath.js";
import { detectNflAskMarket, evaluateBriefcaseForInteraction } from "../shared/nflGoatExtractionContract.js";
import {
  buildNflAskDisciplinePromptBlock,
  buildNflSeasonTypeWarning,
} from "../shared/nflAskDiscipline.js";

const FAST_PROMPT_BUDGET = 6500;

function scopeMatchesTeam(scope, teamFromRow) {
  const t = String(teamFromRow || "").toUpperCase().trim();
  if (!t) return false;
  for (const s of scope) {
    const a = String(s || "").toUpperCase();
    if (t === a) return true;
    if ((a === "WSH" || a === "WAS") && (t === "WSH" || t === "WAS")) return true;
    if ((a === "ARI" || a === "ARZ") && (t === "ARI" || t === "ARZ")) return true;
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
  const lines = Object.entries(defMap).map(
    ([abbr, d]) =>
      `${abbr} (${d.tier}): ${d.overall?.ptsAllowed ?? "?"} pts/g | pass ${d.pass?.rank ?? "?"} | rush ${d.rush?.rank ?? "?"}`,
  );
  return lines.length ? `DEFENSE (static prior):\n${lines.join("\n")}` : "";
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
  const game = scopedGames[0];
  if (!game?.providerGameId) return null;

  let propLines = [];
  const cachedProps = await getNflPropsForBoard(game.providerGameId, {
    tipoffMs: game.tipoffMs,
    cacheOnly: true,
  });
  if (cachedProps) {
    propLines = nflPropsPayloadToPropLines(cachedProps, game);
  } else if (isNflBdlPrimaryEnabled()) {
    try {
      propLines = await fetchNflBdlPlayerPropsForGame(game.providerGameId, {
        gameLabel: `${game.awayAbbr} @ ${game.homeAbbr}`,
      });
    } catch {
      propLines = [];
    }
  }

  propLines = trimNflPlayerPropsForAsk(propLines, { scope, question, maxRows: 24 });

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
    games: scopedGames,
    propLines,
    injuries: injuryRows,
    depth: depthSlice,
    injuryMeta: { fetchedAt: rosterData?.fetchedAt ?? null, asOf: board.asOf || null },
    defenseByTeam: filterDefensesForScope(scope),
    recentStats: [],
  });

  const market = detectNflAskMarket(question);
  const lines = [
    `NFL FAST BOARD (${[...scope].sort().join(" vs ")})`,
    `${game.awayAbbr} @ ${game.homeAbbr} | week ${game.week ?? "?"} | ${game.status || "scheduled"}`,
    propLines.length
      ? `POSTED PROPS (matchup):\n${formatPostedPropsForAsk(propLines)}`
      : "POSTED PROPS: none cached — lean from matchup card only.",
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
    buildNflSeasonTypeWarning({ phase: matchupCard.phase }),
    buildNflAskDisciplinePromptBlock({
      question,
      marketId: matchupCard.marketId || market.marketId,
      phase: matchupCard.phase,
      hasLiveLine: propLines.length > 0,
      injuryFlag: injuryRows.length > 0,
      ambiguousPlayer: matchupCard.ambiguous ? (matchupCard.candidates || []).join(" / ") : null,
    }),
  ].filter(Boolean);

  let promptContext = lines.join("\n\n");
  if (promptContext.length > FAST_PROMPT_BUDGET) {
    promptContext = `${promptContext.slice(0, FAST_PROMPT_BUDGET)}\n\n[trimmed for fast lane]`;
  }

  const stubBriefcase = {
    slate: { games: scopedGames, odds: [], playerProps: propLines },
    league: { injuries: injuryRows, rostersByTeam: {} },
  };
  const interaction = evaluateBriefcaseForInteraction(stubBriefcase, question);
  const buildMs = Date.now() - t0;

  console.info(
    JSON.stringify({
      event: "nfl_context_fast_path",
      buildMs,
      propRows: propLines.length,
      promptChars: promptContext.length,
      scope: [...scope],
      gameId: game.providerGameId,
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
      buildMs,
    },
    games: scopedGames,
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
