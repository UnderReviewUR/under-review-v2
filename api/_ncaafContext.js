/**
 * NCAAF Ask briefcase health — GOAT hydrate + per-question grade.
 */
import { buildNcaafGoatBriefcase, buildNcaafLiveBoard, isNcaafBdlPrimaryEnabled } from "./_ncaafBdl.js";
import { isBdlGoatTrialPaceActive } from "../shared/bdlGoatTrialPolicy.js";

function detectNcaafMarket(question) {
  const q = String(question || "").toLowerCase();
  if (/\bspread\b|\bats\b|\bcover\b/.test(q)) return { id: "spread", label: "Spread", paths: ["slate.odds", "slate.games"] };
  if (/\btotal\b|\bo\/u\b|\bover\/under\b/.test(q)) return { id: "total", label: "Total", paths: ["slate.odds", "slate.games"] };
  if (/\bmoneyline\b|\bml\b/.test(q)) return { id: "ml", label: "Moneyline", paths: ["slate.odds"] };
  if (/\bpass(?:ing)?\s+yards?\b/.test(q)) return { id: "pass_yds", label: "Pass yards", paths: ["slate.playerProps"], props: ["passing_yards"] };
  if (/\brush(?:ing)?\s+yards?\b/.test(q)) return { id: "rush_yds", label: "Rush yards", paths: ["slate.playerProps"], props: ["rushing_yards"] };
  if (/\banytime\s+td\b|\btouchdown\s+scorer\b/.test(q)) return { id: "anytime_td", label: "Anytime TD", paths: ["slate.playerProps"], props: ["anytime_td"] };
  return { id: "general", label: "College football", paths: ["slate.games", "slate.odds", "slate.playerProps"] };
}

function fieldPresence(briefcase) {
  const b = briefcase || {};
  return {
    "slate.games": Array.isArray(b.slate?.games) && b.slate.games.length > 0,
    "slate.odds": Array.isArray(b.slate?.odds) && b.slate.odds.length > 0,
    "slate.playerProps": Array.isArray(b.slate?.playerProps) && b.slate.playerProps.length > 0,
    "league.standings": Array.isArray(b.league?.standings) && b.league.standings.length > 0,
    "league.rankings": Array.isArray(b.league?.rankings) && b.league.rankings.length > 0,
    "league.rosters": b.league?.rostersByTeam && Object.keys(b.league.rostersByTeam).length > 0,
  };
}

export function formatNcaafBriefcaseHealthPromptBlock(health) {
  if (!health) return "";
  const missing = health.missingNeeded?.length
    ? ` Missing: ${health.missingNeeded.join(", ")}.`
    : "";
  return `NCAAF SUITCASE HEALTH (grade ${String(health.grade || "?").toUpperCase()})
Detected: ${health.detected?.label || "General"}.
${health.guidance || ""}${missing}
Never refuse — state gaps briefly; PASS only when the priced market itself is missing.`;
}

/**
 * @param {{ question?: string, board?: object|null, includeLiveBoard?: boolean }} [opts]
 */
export async function buildNcaafAskBriefcaseHealth(opts = {}) {
  const question = String(opts.question || "");
  let board = opts.board && typeof opts.board === "object" ? opts.board : null;
  if (!board && opts.includeLiveBoard !== false) {
    try {
      board = await buildNcaafLiveBoard({ includeProps: true, maxPropGames: 6 });
    } catch {
      board = null;
    }
  }

  let briefcase;
  const boardHasSlate =
    board &&
    ((Array.isArray(board.games) && board.games.length > 0) ||
      (Array.isArray(board.matches) && board.matches.length > 0));

  if (isNcaafBdlPrimaryEnabled() && (!boardHasSlate || !isBdlGoatTrialPaceActive())) {
    briefcase = await buildNcaafGoatBriefcase({
      week: board?.week ?? null,
      season: board?.season ?? null,
      gameIds: Array.isArray(board?.games)
        ? board.games.map((g) => g.providerGameId).filter(Boolean).slice(0, 12)
        : [],
    });
  } else {
    briefcase = {
      slate: {
        games: board?.games || [],
        odds: board?.odds || [],
        playerProps: board?.propLines || [],
      },
      league: {
        standings: board?.standings || [],
        rankings: board?.rankings || [],
      },
      coverage: {},
    };
  }

  if (board?.games?.length && !briefcase.slate?.games?.length) briefcase.slate.games = board.games;
  if (board?.propLines?.length && !briefcase.slate?.playerProps?.length) {
    briefcase.slate.playerProps = board.propLines;
  }
  if (board?.odds?.length && !briefcase.slate?.odds?.length) briefcase.slate.odds = board.odds;

  const detected = detectNcaafMarket(question);
  const presence = fieldPresence(briefcase);
  const missingNeeded = detected.paths.filter((p) => !presence[p]);
  const isGamePrice =
    (detected.props?.length ?? 0) === 0 && ["spread", "total", "ml"].includes(detected.id);
  const alwaysMissing = ["slate.games", "slate.odds", "slate.playerProps"].filter((p) => !presence[p]);
  const gradeMissing = isGamePrice
    ? alwaysMissing.filter((p) => p !== "slate.playerProps")
    : alwaysMissing;
  let grade = "green";
  if (gradeMissing.length || missingNeeded.length >= 2) grade = "red";
  else if (missingNeeded.length === 1) grade = "yellow";

  const interaction = {
    grade,
    smooth: grade !== "red",
    detected,
    missingNeeded,
    guidance:
      grade === "green"
        ? "Suitcase ready — prefer live odds/props in payload."
        : grade === "yellow"
          ? "One pocket thin — answer with a gap clause."
          : "Core slate empty — structural notes only; do not invent numbers.",
    forcePass: false,
  };

  return {
    briefcase,
    interaction,
    promptBlock: formatNcaafBriefcaseHealthPromptBlock(interaction),
  };
}

export async function buildNcaafContextForAsk(opts = {}) {
  const { briefcase, interaction, promptBlock } = await buildNcaafAskBriefcaseHealth({
    question: opts.question,
    board: opts.board,
    includeLiveBoard: opts.includeLiveBoard !== false,
  });
  const games = briefcase?.slate?.games || [];
  const props = briefcase?.slate?.playerProps || [];
  const odds = briefcase?.slate?.odds || [];
  const standings = briefcase?.league?.standings || [];
  const rankings = briefcase?.league?.rankings || [];

  const lines = [
    "NCAAF LIVE BOARD (BallDontLie GOAT when primary flag on)",
    `Games (${games.length}):`,
    ...games.slice(0, 16).map((g) => {
      const ml = g.moneyline ? ` ML ${JSON.stringify(g.moneyline)}` : "";
      const sp = g.spread ? ` spread ${JSON.stringify(g.spread)}` : "";
      const tot = g.total ? ` total ${JSON.stringify(g.total)}` : "";
      return `- ${g.awayAbbr} @ ${g.homeAbbr} (${g.status || "scheduled"})${sp}${tot}${ml}`;
    }),
    `Player props sample (${props.length} rows):`,
    ...props.slice(0, 24).map((p) => `- ${p.player} ${p.prop} ${p.line} (${p.book})`),
    `Standings top (${standings.length} teams logged):`,
    ...standings.slice(0, 12).map((s) => `- ${s.teamName || s.team}: ${s.wins}-${s.losses}`),
    rankings.length ? `Rankings (${rankings.length}):` : "",
    ...rankings.slice(0, 15).map((r) => `- #${r.rank} ${r.teamName || r.team}`),
    promptBlock,
  ].filter(Boolean);

  return {
    promptContext: lines.join("\n"),
    briefcase,
    interaction,
    games,
    propLines: props,
    odds,
  };
}
