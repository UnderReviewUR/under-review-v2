/**
 * La Liga Ask briefcase health — GOAT hydrate + per-question grade.
 */
import { buildLaligaGoatBriefcase, buildLaligaLiveBoard, isLaligaBdlPrimaryEnabled } from "./_laligaBdl.js";
import { isBdlGoatTrialPaceActive } from "../shared/bdlGoatTrialPolicy.js";

function detectLaligaMarket(question) {
  const q = String(question || "").toLowerCase();
  if (/\b1x2\b|\bmoneyline\b|\bml\b|\bto win\b|\bdraw\b/.test(q)) {
    return { id: "1x2", label: "Match result (1X2)", paths: ["slate.odds", "slate.matches"] };
  }
  if (/\bbtts\b|both teams to score/.test(q)) {
    return { id: "btts", label: "BTTS", paths: ["slate.odds", "slate.playerProps"] };
  }
  if (/\banytime\s+scorer\b|\bgoalscorer\b|\bto score\b/.test(q)) {
    return { id: "scorer", label: "Goalscorer", paths: ["slate.playerProps"], props: ["anytime_scorer"] };
  }
  if (/\bshots?\b|\bsoT\b/.test(q)) {
    return { id: "shots", label: "Shots", paths: ["slate.playerProps", "analytics.playerMatchStats"] };
  }
  if (/\breal madrid\b|\bbarcelona\b|\batletico\b|\bsevilla\b|\blaliga\b/.test(q)) {
    return { id: "club", label: "La Liga club", paths: ["slate.matches", "league.standings"] };
  }
  return { id: "general", label: "La Liga", paths: ["slate.matches", "slate.odds", "slate.playerProps"] };
}

function fieldPresence(briefcase) {
  const b = briefcase || {};
  return {
    "slate.matches": Array.isArray(b.slate?.matches) && b.slate.matches.length > 0,
    "slate.odds": Array.isArray(b.slate?.odds) && b.slate.odds.length > 0,
    "slate.playerProps": Array.isArray(b.slate?.playerProps) && b.slate.playerProps.length > 0,
    "league.standings": Array.isArray(b.league?.standings) && b.league.standings.length > 0,
    "league.injuries": Array.isArray(b.league?.injuries) && b.league.injuries.length > 0,
    "league.rosters": b.league?.rostersByTeam && Object.keys(b.league.rostersByTeam).length > 0,
  };
}

export function formatLaligaBriefcaseHealthPromptBlock(health) {
  if (!health) return "";
  const missing = health.missingNeeded?.length
    ? ` Missing: ${health.missingNeeded.join(", ")}.`
    : "";
  return `LA LIGA SUITCASE HEALTH (grade ${String(health.grade || "?").toUpperCase()})
Detected: ${health.detected?.label || "General"}.
${health.guidance || ""}${missing}
La Liga game odds are 1X2 (home/draw/away) — no spread/total on board. Never refuse; PASS only when the priced market is absent.`;
}

/**
 * @param {{ question?: string, board?: object|null, includeLiveBoard?: boolean }} [opts]
 */
export async function buildLaligaAskBriefcaseHealth(opts = {}) {
  const question = String(opts.question || "");
  let board = opts.board && typeof opts.board === "object" ? opts.board : null;
  if (!board && opts.includeLiveBoard !== false) {
    try {
      board = await buildLaligaLiveBoard({ includeProps: true, maxPropMatches: 6 });
    } catch {
      board = null;
    }
  }

  let briefcase;
  const boardHasSlate =
    board && Array.isArray(board.matches) && board.matches.length > 0;

  if (isLaligaBdlPrimaryEnabled() && (!boardHasSlate || !isBdlGoatTrialPaceActive())) {
    briefcase = await buildLaligaGoatBriefcase({
      season: board?.season ?? null,
      matchIds: Array.isArray(board?.matches)
        ? board.matches.map((m) => m.providerMatchId).filter(Boolean).slice(0, 12)
        : [],
    });
  } else {
    briefcase = {
      slate: {
        matches: board?.matches || [],
        odds: board?.odds || [],
        playerProps: board?.propLines || [],
      },
      league: { standings: board?.standings || [] },
      coverage: {},
    };
  }

  if (board?.matches?.length && !briefcase.slate?.matches?.length) briefcase.slate.matches = board.matches;
  if (board?.propLines?.length && !briefcase.slate?.playerProps?.length) {
    briefcase.slate.playerProps = board.propLines;
  }
  if (board?.odds?.length && !briefcase.slate?.odds?.length) briefcase.slate.odds = board.odds;
  if (board?.standings?.length && !briefcase.league?.standings?.length) {
    briefcase.league.standings = board.standings;
  }

  const detected = detectLaligaMarket(question);
  const presence = fieldPresence(briefcase);
  const missingNeeded = detected.paths.filter((p) => !presence[p]);
  const alwaysMissing = ["slate.matches", "slate.odds"].filter((p) => !presence[p]);
  let grade = "green";
  if (alwaysMissing.length || missingNeeded.length >= 2) grade = "red";
  else if (missingNeeded.length === 1) grade = "yellow";

  const interaction = {
    grade,
    smooth: grade !== "red",
    detected,
    missingNeeded,
    guidance:
      grade === "green"
        ? "Suitcase ready — cite live 1X2 and props from payload."
        : grade === "yellow"
          ? "One pocket thin — answer with uncertainty tag."
          : "Core slate empty — structural notes only.",
    forcePass: false,
  };

  return {
    briefcase,
    interaction,
    promptBlock: formatLaligaBriefcaseHealthPromptBlock(interaction),
  };
}

export async function buildLaligaContextForAsk(opts = {}) {
  const { briefcase, interaction, promptBlock } = await buildLaligaAskBriefcaseHealth({
    question: opts.question,
    board: opts.board,
    includeLiveBoard: opts.includeLiveBoard !== false,
  });
  const matches = briefcase?.slate?.matches || [];
  const props = briefcase?.slate?.playerProps || [];
  const odds = briefcase?.slate?.odds || [];
  const standings = briefcase?.league?.standings || [];
  const injuries = briefcase?.league?.injuries || [];

  const lines = [
    "LA LIGA LIVE BOARD (BallDontLie GOAT — 1X2 moneyline, player props, standings)",
    `Matches (${matches.length}):`,
    ...matches.slice(0, 16).map((m) => {
      const ml = m.moneyline ? ` 1X2 ${JSON.stringify(m.moneyline)}` : "";
      const score =
        m.homeScore != null && m.awayScore != null ? ` ${m.awayScore}-${m.homeScore}` : "";
      return `- ${m.awayAbbr} @ ${m.homeAbbr}${score} (${m.status || "scheduled"})${ml}`;
    }),
    `Player props (${props.length}):`,
    ...props.slice(0, 24).map((p) => `- ${p.player} ${p.prop} ${p.line} (${p.book})`),
    `Standings (${standings.length}):`,
    ...standings.slice(0, 12).map((s) => `- ${s.position}. ${s.teamName || s.team} (${s.points} pts)`),
    injuries.length ? `Injuries (${injuries.length} logged)` : "",
    ...injuries.slice(0, 12).map((i) => `- ${i.player} (${i.team}): ${i.status}`),
    promptBlock,
  ].filter(Boolean);

  return {
    promptContext: lines.join("\n"),
    briefcase,
    interaction,
    matches,
    propLines: props,
    odds,
    standings,
  };
}
