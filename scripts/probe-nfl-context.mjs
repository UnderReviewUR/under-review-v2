import { buildCanonicalNflContext } from "../api/_nflContext.js";
import { buildNflHealthSnapshot } from "../api/_nflHealth.js";
import { buildNflLiveBoard } from "../api/_nflBoard.js";

const questions = [
  "Cowboys Dak Prescott over 1 passing touchdown today",
  "Cowboys at Giants Dak Prescott over 1 passing touchdown weather",
  "Ravens Zay Flowers receiving yards over today",
  "Should I trust Brock Bowers PPR projection this week?",
];

const health = await buildNflHealthSnapshot();
console.log(
  JSON.stringify({
    kind: "health",
    rosterLoaded: health.roster.loaded,
    qbStats: health.projections.qbStats2025PlayerCount,
    skillStats: health.projections.playerStats2025ByPosition,
    defenseTeams: health.projections.defenseAllowed2025TeamCount,
    gameDayStatusLoaded: health.gameDayStatus.loaded,
    fantasyRankingsLoaded: health.fantasyRankings.loaded,
    fantasyRankingsStale: health.fantasyRankings.stale,
    liveStatsLoaded: health.liveStats.loaded,
    liveStatsSeason: health.liveStats.seasonYear,
    liveStatsFallback: health.liveStats.usedPriorSeasonFallback,
    liveStatsStale: health.liveStats.stale,
  }),
);

for (const question of questions) {
  const ctx = await buildCanonicalNflContext({ question });
  console.log(
    JSON.stringify({
      kind: "context",
      question,
      scope: ctx.meta.nflPromptScopeMode,
      chars: ctx.meta.nflPromptContextChars,
      hasQbStats: ctx.promptContext.includes("2025 QB stats (nflverse)"),
      hasSkillStats:
        ctx.promptContext.includes("2025 RB stats (nflverse)") ||
        ctx.promptContext.includes("2025 WR stats (nflverse)") ||
        ctx.promptContext.includes("2025 TE stats (nflverse)"),
      hasWeatherSnapshot: ctx.promptContext.includes("NFL WEATHER SNAPSHOT ("),
      hasGameDayStatus: ctx.promptContext.includes("NFL GAME-DAY STATUS"),
      hasFantasyContext: ctx.promptContext.includes("NFL FANTASY / PROJECTION") || ctx.promptContext.includes("NFL FANTASY / CLAY"),
      hasLiveRanks: ctx.promptContext.includes("ESPN live PPR"),
      hasDeepForm: ctx.promptContext.includes("Deep form (nflverse)"),
    }),
  );
}

const board = await buildNflLiveBoard({ includeProps: true, maxPropGames: 1 });
console.log(
  JSON.stringify({
    kind: "board",
    ok: board.ok,
    propLineCount: board.propLineCount,
    propsSource: board.props?.source || null,
    hasFallback: Boolean(board.propsFallback),
  }),
);
