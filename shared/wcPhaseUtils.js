/**
 * World Cup 2026 tournament phase detection + prompt slimming helpers.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  getEtYmdAt,
  WC_GROUP_STAGE_END_ET,
  WC_KICKOFF_ET,
  WC_TOURNAMENT_END_ET,
} from "./wc2026Constants.js";

/** Full group stage = 12 groups × 6 matches */
export const WC_GROUP_STAGE_MATCHES = 72;

/** Knockout match counts by round (single-elimination bracket). */
export const WC_KNOCKOUT_ROUND_COUNTS = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  final: 1,
};

/** @typedef {"PRE_GROUP"|"GROUP_STAGE"|"ROUND_OF_32"|"ROUND_OF_16"|"QUARTERFINALS"|"SEMIFINALS"|"FINAL"|"POST_TOURNAMENT"} WcTournamentPhase */

/** @typedef {"active"|"eliminated"|"champion"|"not_in_knockout"|"unknown"} WcKnockoutTeamState */

const KNOCKOUT_ROUND_ORDER = { r32: 1, r16: 2, qf: 3, sf: 4, final: 5 };

const PHASE_ROUND_LABEL = {
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTERFINALS: "Quarterfinals",
  SEMIFINALS: "Semifinals",
  FINAL: "Final",
  POST_TOURNAMENT: "Post-tournament",
};

const ROUND_PHASE_NOTES = {
  ROUND_OF_32:
    "Round of 32: first knockout gate — 16 matches, no second chances. Upset variance is highest here.",
  ROUND_OF_16:
    "Round of 16: field narrowing to 8 — favor teams with reliable 90-minute control and bench depth.",
  QUARTERFINALS:
    "Quarterfinals: true title-contender tier — margins tighten; set pieces and keeper performance swing games.",
  SEMIFINALS:
    "Semifinals: two wins from the trophy — fatigue and card accumulation from prior rounds matter.",
  FINAL:
    "Final: single match for the title — treat 90-minute lines as regulation-only; ET/pens live if level.",
  POST_TOURNAMENT: "Tournament complete — cite final results only.",
};

const ROUNDS_TO_WIN_FROM = {
  ROUND_OF_32: ["R16", "QF", "SF", "Final"],
  ROUND_OF_16: ["QF", "SF", "Final"],
  QUARTERFINALS: ["SF", "Final"],
  SEMIFINALS: ["Final"],
  FINAL: [],
};

/**
 * @param {string | null | undefined} raw
 * @returns {"group"|"r32"|"r16"|"qf"|"sf"|"final"|"unknown"}
 */
export function wcRoundKey(raw) {
  const r = String(raw || "").trim().toLowerCase();
  if (!r || r.includes("group") || r.includes("first stage") || r.includes("group stage")) {
    return "group";
  }
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter") && !r.includes("3rd")) {
    return "final";
  }
  if (r.includes("semi")) return "sf";
  if (r.includes("quarter") || r === "qf") return "qf";
  if (r.includes("16") || r.includes("r16") || r.includes("round of 16")) return "r16";
  if (r.includes("32") || r.includes("r32") || r.includes("round of 32")) return "r32";
  return "unknown";
}

/**
 * @param {string | null | undefined} status
 */
export function isWcFinishedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "ft" || s === "final" || s === "finished" || s === "completed";
}

/**
 * @param {string | null | undefined} round
 */
export function isKnockoutRound(round) {
  const key = wcRoundKey(round);
  return key !== "group" && key !== "unknown";
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} matches
 * @returns {WcTournamentPhase}
 */
export function getWorldCupPhase(matches) {
  const rows = Array.isArray(matches) ? matches : [];
  const finished = rows.filter((m) => isWcFinishedStatus(m.status));
  const played = finished.length;

  if (played === 0) return "PRE_GROUP";

  const knockoutPresent = rows.some((m) => isKnockoutRound(m.round));
  if (!knockoutPresent && played < WC_GROUP_STAGE_MATCHES) return "GROUP_STAGE";

  const finishedKnockout = finished.filter((m) => isKnockoutRound(m.round));
  const fk = finishedKnockout.length;

  if (!knockoutPresent && played >= WC_GROUP_STAGE_MATCHES) return "ROUND_OF_32";

  const activeRound = maxKnockoutRoundKey(rows.filter((m) => isKnockoutRound(m.round)));
  if (fk >= 104 - WC_GROUP_STAGE_MATCHES) return "POST_TOURNAMENT";

  if (activeRound === "final" || fk >= 30) return "FINAL";
  if (activeRound === "sf" || fk >= 28) return "SEMIFINALS";
  if (activeRound === "qf" || fk >= 24) return "QUARTERFINALS";
  if (activeRound === "r16" || fk >= 16) return "ROUND_OF_16";
  return "ROUND_OF_32";
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function maxKnockoutRoundKey(rows) {
  const order = { r32: 1, r16: 2, qf: 3, sf: 4, final: 5 };
  let best = 0;
  /** @type {"r32"|"r16"|"qf"|"sf"|"final"|null} */
  let key = null;
  for (const m of rows) {
    const k = wcRoundKey(m.round);
    if (k === "group" || k === "unknown") continue;
    const rank = order[k] || 0;
    if (rank >= best) {
      best = rank;
      key = k;
    }
  }
  return key;
}

/**
 * @param {WcTournamentPhase} phase
 */
export function isKnockoutPhase(phase) {
  if (!phase) return false;
  return !["PRE_GROUP", "GROUP_STAGE", "POST_TOURNAMENT"].includes(phase);
}

/**
 * @param {WcTournamentPhase} phase
 * @returns {number}
 */
function wcPhaseRank(phase) {
  const order = {
    PRE_GROUP: 0,
    GROUP_STAGE: 1,
    ROUND_OF_32: 2,
    ROUND_OF_16: 3,
    QUARTERFINALS: 4,
    SEMIFINALS: 5,
    FINAL: 6,
    POST_TOURNAMENT: 7,
  };
  return order[phase] ?? 0;
}

/**
 * ET calendar phase when match feed is sparse or missing knockout round metadata.
 * @param {number} [nowMs]
 * @returns {WcTournamentPhase}
 */
export function getWorldCupPhaseFromEtDate(nowMs = Date.now()) {
  const ymd = getEtYmdAt(nowMs);
  if (ymd < WC_KICKOFF_ET) return "PRE_GROUP";
  if (ymd <= WC_GROUP_STAGE_END_ET) return "GROUP_STAGE";
  if (ymd <= WC_TOURNAMENT_END_ET) return "ROUND_OF_32";
  return "POST_TOURNAMENT";
}

/**
 * Resolve tournament phase from match feed when available; otherwise ET date heuristic.
 * When feed lags (e.g. <72 FT rows without round tags) but the calendar is past group
 * stage, prefer the later of feed vs ET date so knockout UI does not stick on GROUP_STAGE.
 * @param {Array<Record<string, unknown>> | null | undefined} matches
 * @param {number} [nowMs]
 * @returns {WcTournamentPhase}
 */
export function resolveWcTournamentPhase(matches, nowMs = Date.now()) {
  const rows = Array.isArray(matches) ? matches : [];
  const fromFeed = rows.length ? getWorldCupPhase(rows) : "PRE_GROUP";
  const fromDate = getWorldCupPhaseFromEtDate(nowMs);
  return wcPhaseRank(fromFeed) >= wcPhaseRank(fromDate) ? fromFeed : fromDate;
}

/**
 * @param {WcTournamentPhase} phase
 */
export function getKnockoutRoundLabel(phase) {
  return PHASE_ROUND_LABEL[phase] || String(phase || "").replace(/_/g, " ");
}

/**
 * @param {string} question
 */
export function isKnockoutAdvancementQuestion(question) {
  return /\b(advance|advances|who wins|win the match|go through|knockout|eliminated|elimination|penalties|extra time|et\b|aet\b)\b/i.test(
    String(question || ""),
  );
}

/**
 * 2026 format: 12 groups × 4, top 2 qualify + 8 best 3rd-place = 32 to knockout.
 * Max group-stage points = 9 (3 wins). Each team plays 3 matches.
 *
 * @param {Array<Record<string, unknown>>} groupStandings — sorted by points desc
 * @param {Array<Record<string, unknown>>} groupMatches — group-stage matches for this group
 * @param {string} teamAbbr
 * @returns {{ clinched: boolean, eliminated: boolean, topTwo: boolean, thirdMayAdvance: boolean, matchesPlayed: number, matchesRemaining: number }}
 */
export function getGroupClinchStatus(groupStandings, groupMatches, teamAbbr) {
  const abbr = String(teamAbbr || "").toUpperCase();
  const standings = Array.isArray(groupStandings) ? groupStandings : [];
  const matches = Array.isArray(groupMatches) ? groupMatches : [];

  const row = standings.find((r) => String(r.team || r.abbreviation || "").toUpperCase() === abbr);
  if (!row) return { clinched: false, eliminated: false, topTwo: false, thirdMayAdvance: false, matchesPlayed: 0, matchesRemaining: 3 };

  const played = Number(row.played) || 0;
  const points = Number(row.points) || 0;
  const remaining = 3 - played;
  const maxPossible = points + remaining * 3;

  const idx = standings.findIndex((r) => String(r.team || r.abbreviation || "").toUpperCase() === abbr);

  // Second-place team's points — if team can't catch 2nd, they can at best be 3rd.
  const secondPlacePoints = standings.length >= 2 ? Number(standings[1].points) || 0 : 0;
  // Third-place threshold: conservatively, 3rd with ≥4 points usually advances (8 of 12 thirds go through).
  const thirdPlaceMinEstimate = 4;

  const topTwo = idx <= 1 && played > 0;

  // Clinched: guaranteed top 2 (no team below can catch you for 2nd)
  let clinched = false;
  if (played > 0 && idx <= 1) {
    const thirdPoints = standings.length >= 3 ? Number(standings[2].points) || 0 : 0;
    const thirdRemaining = standings.length >= 3 ? 3 - (Number(standings[2].played) || 0) : 0;
    const thirdMax = thirdPoints + thirdRemaining * 3;
    if (points > thirdMax) clinched = true;
  }

  // Eliminated: can't finish top 2 and can't realistically be a best 3rd
  let eliminated = false;
  if (played > 0) {
    const cantReachSecond = maxPossible < secondPlacePoints;
    const cantBeGoodThird = maxPossible < thirdPlaceMinEstimate && remaining === 0;
    if (cantReachSecond && cantBeGoodThird) eliminated = true;
    // Hard elimination: 0 points after 2 games with negative GD
    if (played >= 2 && points === 0 && (Number(row.gd) || 0) <= -3) eliminated = true;
  }

  const thirdMayAdvance = idx === 2 && maxPossible >= thirdPlaceMinEstimate;

  return { clinched, eliminated, topTwo, thirdMayAdvance, matchesPlayed: played, matchesRemaining: remaining };
}

/**
 * Format rotation/clinch warnings for the UR Take prompt.
 * @param {Record<string, Array<Record<string, unknown>>>} groups — group standings by letter
 * @param {Array<Record<string, unknown>>} allMatches
 * @param {string[]} mentionedTeams
 * @returns {string | null}
 */
export function formatGroupClinchWarnings(groups, allMatches, mentionedTeams) {
  const teams = (mentionedTeams || []).map((t) => String(t).toUpperCase());
  if (!teams.length) return null;

  const warnings = [];

  for (const abbr of teams) {
    const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === abbr);
    if (!team?.group) continue;
    const standings = groups?.[team.group];
    if (!Array.isArray(standings) || !standings.length) continue;

    const groupMatches = (allMatches || []).filter(
      (m) => String(m.group || "").toUpperCase() === team.group,
    );

    const status = getGroupClinchStatus(standings, groupMatches, abbr);
    if (status.matchesPlayed === 0) continue;

    if (status.clinched && status.matchesRemaining > 0) {
      warnings.push(
        `  ${abbr}: Clinched knockout qualification with ${status.matchesRemaining} group match(es) remaining — ROTATION RISK: manager may rest key starters. Factor into scorer/prop recommendations.`,
      );
    } else if (status.eliminated) {
      warnings.push(
        `  ${abbr}: Eliminated from knockout contention — dead rubber. Expect heavy rotation and lower motivation.`,
      );
    } else if (status.topTwo && status.matchesRemaining === 1) {
      warnings.push(
        `  ${abbr}: Currently in top 2 with final group match remaining — if already secured, may rotate.`,
      );
    }
  }

  if (!warnings.length) return null;
  return ["GROUP STAGE STATUS (rotation/clinch — factor into player props):", ...warnings].join("\n");
}

/**
 * @param {string} question
 */
export function isTournamentWinnerQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (/\b(game\s*\d+|match\s*\d+|matchup)\b/i.test(q)) return false;
  if (
    /\b(who|which\s+team)\s+(?:will\s+)?wins?\s+(?:the\s+)?(?:world\s*cup|fifa world cup|tournament|trophy)\b/i.test(
      q,
    )
  ) {
    return true;
  }
  if (/\b(world\s*cup|tournament)\s+winner\b/i.test(q)) return true;
  if (/\bwho\s+(?:will\s+)?win\s+(?:the\s+)?(?:world\s*cup|fifa world cup|tournament|trophy)\b/i.test(q)) {
    return true;
  }
  return /\b(win (the )?(world cup|fifa world cup|tournament|trophy|it all)|lift the trophy|outright winner|still win the|path to (the )?title|can .+ win the (world cup|tournament))\b/i.test(
    q,
  );
}

/**
 * @param {Record<string, unknown>} match
 * @param {string} abbr
 */
export function teamParticipatesInMatch(match, abbr) {
  const key = String(abbr || "").toUpperCase();
  return (
    String(match?.homeTeam || "").toUpperCase() === key ||
    String(match?.awayTeam || "").toUpperCase() === key
  );
}

/**
 * @param {Record<string, unknown>} match
 * @param {string} abbr
 */
export function teamWonKnockoutMatch(match, abbr) {
  if (!isKnockoutRound(match?.round) || !isWcFinishedStatus(match?.status)) return false;
  if (!teamParticipatesInMatch(match, abbr)) return false;
  const key = String(abbr).toUpperCase();
  const home = String(match.homeTeam).toUpperCase();
  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return false;
  if (hs === as) return false;
  if (home === key) return hs > as;
  return as > hs;
}

/**
 * @param {Record<string, unknown>} match
 * @param {string} abbr
 */
export function teamLostKnockoutMatch(match, abbr) {
  if (!isKnockoutRound(match?.round) || !isWcFinishedStatus(match?.status)) return false;
  if (!teamParticipatesInMatch(match, abbr)) return false;
  const key = String(abbr).toUpperCase();
  const home = String(match.homeTeam).toUpperCase();
  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return false;
  if (hs === as) return false;
  if (home === key) return hs < as;
  return as < hs;
}

/**
 * @param {string} abbr
 * @param {Array<Record<string, unknown>>} matches
 */
export function getNextKnockoutFixtureForTeam(abbr, matches) {
  const key = String(abbr || "").toUpperCase();
  const rows = (matches || [])
    .filter(
      (m) =>
        isKnockoutRound(m.round) &&
        (String(m.status || "").toLowerCase() === "ns" ||
          String(m.status || "").toLowerCase() === "scheduled" ||
          String(m.status || "").toLowerCase() === "upcoming"),
    )
    .filter((m) => teamParticipatesInMatch(m, key))
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));
  return rows[0] || null;
}

/**
 * @param {string} abbr
 * @param {Array<Record<string, unknown>>} matches
 * @returns {{ state: WcKnockoutTeamState, eliminatedAt?: string, nextFixture?: Record<string, unknown>, lastWin?: Record<string, unknown> }}
 */
export function getTeamKnockoutStatus(abbr, matches) {
  const key = String(abbr || "").toUpperCase();
  const koMatches = (matches || []).filter(
    (m) => isKnockoutRound(m.round) && teamParticipatesInMatch(m, key),
  );

  if (!koMatches.length) {
    return { state: "not_in_knockout" };
  }

  const loss = koMatches.find((m) => teamLostKnockoutMatch(m, key));
  if (loss) {
    return { state: "eliminated", eliminatedAt: wcRoundKey(loss.round).toUpperCase() };
  }

  const nextFixture = getNextKnockoutFixtureForTeam(key, matches);
  if (nextFixture) {
    return { state: "active", nextFixture };
  }

  const wins = koMatches.filter((m) => teamWonKnockoutMatch(m, key));
  const lastWin = wins.sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0))[0];
  if (lastWin && wcRoundKey(lastWin.round) === "final") {
    return { state: "champion", lastWin };
  }
  if (lastWin) {
    return { state: "active", lastWin };
  }

  const tiedFt = koMatches.find(
    (m) =>
      isWcFinishedStatus(m.status) &&
      Number(m.homeScore) === Number(m.awayScore) &&
      teamParticipatesInMatch(m, key),
  );
  if (tiedFt) {
    return { state: "unknown", lastWin: tiedFt };
  }

  return { state: "unknown" };
}

/**
 * @param {string} abbr
 * @param {WcTournamentPhase} phase
 * @param {ReturnType<typeof getTeamKnockoutStatus>} status
 */
function formatTeamPathLine(abbr, phase, status) {
  const key = String(abbr).toUpperCase();
  if (status.state === "not_in_knockout") {
    return `  ${key}: Not on a verified knockout fixture yet — do not claim elimination or advancement without feed data.`;
  }
  if (status.state === "eliminated") {
    return `  ${key}: Eliminated at ${status.eliminatedAt || "knockout"} — cannot win the tournament.`;
  }
  if (status.state === "champion") {
    return `  ${key}: Won the Final — tournament champion per verified results.`;
  }

  const roundsLeft = ROUNDS_TO_WIN_FROM[phase] || [];
  const roundsText = roundsLeft.length ? roundsLeft.join(" → ") : "Final only";

  if (status.nextFixture) {
    const fx = status.nextFixture;
    const rk = wcRoundKey(fx.round).toUpperCase();
    const opp =
      String(fx.homeTeam).toUpperCase() === key ? fx.awayTeam : fx.homeTeam;
    return `  ${key}: Active — next ${rk} vs ${opp} (${fx.date || "TBD"}). Wins needed to lift trophy: ${roundsText || "verify bracket"}.`;
  }

  if (status.lastWin) {
    const rk = wcRoundKey(status.lastWin.round).toUpperCase();
    return `  ${key}: Advanced through ${rk} — awaiting next verified knockout opponent. Wins still needed: ${roundsText || "verify bracket"}.`;
  }

  return `  ${key}: Knockout status uncertain — use verified fixtures only; do not invent advancement.`;
}

/**
 * @param {WcTournamentPhase} phase
 * @param {Array<Record<string, unknown>>} matches
 * @param {string[]} [mentionedTeams]
 * @param {string} [question]
 * @returns {string | null}
 */
export function formatKnockoutUrTakeAppendix(phase, matches, mentionedTeams = [], question = "") {
  if (!isKnockoutPhase(phase)) return null;

  const lines = [
    "KNOCKOUT STAGE RULES (binding):",
    "  Single elimination — one loss ends the run (except where feed shows a separate third-place match).",
    "  Regulation draw → extra time → penalty shootout if still level. 90-minute moneylines do NOT settle as a draw for advancement purposes.",
    "  Away goals rule does NOT apply in 2026.",
    "  For match 1X2 bets in knockout: cite FIXTURE MATCH ODDS as regulation-time prices only unless the feed states otherwise.",
    "  For advancement or \"who wins the match\" questions: factor ET/pens — do not treat a draw price as a safe push.",
    `  Current tournament round: ${getKnockoutRoundLabel(phase)} (${phase}).`,
  ];

  const roundNote = ROUND_PHASE_NOTES[phase];
  if (roundNote) lines.push(`  Round note: ${roundNote}`);

  if (isTournamentWinnerQuestion(question) || isKnockoutAdvancementQuestion(question)) {
    lines.push(
      "  For \"can X still win?\" or advancement angles: use CITED TEAM PATH below + remaining bracket — do not rely on group-stage strength tags alone.",
    );
  }

  const teams = mentionedTeams.length
    ? mentionedTeams.map((t) => String(t).toUpperCase())
    : [];

  if (teams.length) {
    lines.push("", "CITED TEAM PATH (verified knockout feed):");
    for (const abbr of teams) {
      lines.push(formatTeamPathLine(abbr, phase, getTeamKnockoutStatus(abbr, matches)));
    }
  }

  const bracket = formatKnockoutBracketPrompt(matches, mentionedTeams);
  if (bracket) {
    lines.push("", bracket);
  } else {
    lines.push("", "KNOCKOUT BRACKET: No verified knockout fixtures loaded yet.");
  }

  return lines.join("\n");
}

/**
 * @param {WcTournamentPhase} phase
 */
export function formatKnockoutPhasePromptRules(phase) {
  if (!isKnockoutPhase(phase)) return null;
  return [
    "KNOCKOUT PHASE (mandatory):",
    "  Do not answer as if the group stage is still undecided unless VERIFIED CONTEXT shows open group matches.",
    "  Use KNOCKOUT STAGE RULES and bracket path for advancement and tournament-winner questions.",
    "  Match draw percentages from Elo are regulation-oriented — in knockout, ties go to extra time and penalties.",
    `  Active round: ${getKnockoutRoundLabel(phase)}.`,
  ].join("\n");
}

/**
 * @param {Record<string, unknown>} groups
 * @param {{ phase?: WcTournamentPhase, mentionedTeams?: string[], fixtures?: Array<Record<string, unknown>> }} opts
 */
export function selectGroupsForPrompt(groups, opts = {}) {
  const phase = opts.phase || "PRE_GROUP";
  const mentioned = new Set((opts.mentionedTeams || []).map((t) => String(t).toUpperCase()));
  const letters = new Set();

  for (const abbr of mentioned) {
    const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === abbr);
    if (team?.group) letters.add(team.group);
  }

  for (const fx of opts.fixtures || []) {
    if (fx?.group) letters.add(String(fx.group).toUpperCase());
    for (const side of [fx?.homeTeam, fx?.awayTeam]) {
      const team = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === String(side).toUpperCase());
      if (team?.group) letters.add(team.group);
    }
  }

  if (phase === "PRE_GROUP" || phase === "GROUP_STAGE") {
    if (!letters.size) return groups;
  } else if (!letters.size) {
    return {};
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const letter of letters) {
    if (groups?.[letter]) out[letter] = groups[letter];
  }
  return out;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string[]} [mentionedTeams]
 */
export function formatKnockoutBracketPrompt(matches, mentionedTeams = []) {
  const rows = (matches || []).filter((m) => isKnockoutRound(m.round));
  if (!rows.length) return null;

  const mentionSet = new Set(mentionedTeams.map((t) => String(t).toUpperCase()));
  const filtered =
    mentionSet.size > 0
      ? rows.filter(
          (m) =>
            mentionSet.has(String(m.homeTeam).toUpperCase()) ||
            mentionSet.has(String(m.awayTeam).toUpperCase()),
        )
      : rows;

  const use = filtered.length ? filtered : rows;
  const byRound = { r32: [], r16: [], qf: [], sf: [], final: [] };
  for (const m of use) {
    const rk = wcRoundKey(m.round);
    if (byRound[rk]) byRound[rk].push(m);
  }

  const lines = [
    "KNOCKOUT BRACKET (verified fixtures):",
  ];

  for (const [key, label] of [
    ["r32", "R32"],
    ["r16", "R16"],
    ["qf", "QF"],
    ["sf", "SF"],
    ["final", "FINAL"],
  ]) {
    const roundRows = byRound[key];
    if (!roundRows.length) continue;
    for (const m of roundRows.slice(0, 8)) {
      const score =
        isWcFinishedStatus(m.status) && m.homeScore != null
          ? ` ${m.homeScore}-${m.awayScore}`
          : "";
      lines.push(
        `  [${label}] ${m.homeTeam}${score} vs ${m.awayTeam} — ${m.date || ""} ${m.status || "NS"}`.trim(),
      );
    }
  }

  if (lines.length === 1) {
    for (const m of use.slice(0, 16)) {
      const rk = wcRoundKey(m.round).toUpperCase();
      const score =
        isWcFinishedStatus(m.status) && m.homeScore != null
          ? ` ${m.homeScore}-${m.awayScore}`
          : "";
      lines.push(
        `  [${rk}] ${m.homeTeam}${score} vs ${m.awayTeam} — ${m.date || ""} ${m.status || "NS"}`.trim(),
      );
    }
  }

  return lines.join("\n");
}

/**
 * @param {WcTournamentPhase} phase
 */
export function formatWorldCupPhaseRules(phase) {
  const base =
    "Only include data relevant to the current tournament phase and the specific question. Do not bloat context with irrelevant groups or matches.";

  if (!isKnockoutPhase(phase)) {
    return `${base}\nCurrent phase: ${phase} — group tables and upcoming fixtures are in scope.`;
  }

  return `${base}\nCurrent phase: ${phase} — prioritize knockout path, cited teams, and elimination rules. Full group tables omitted unless a cited team requires group context.`;
}

/**
 * @param {{ outrights?: Record<string, string> } | null | undefined} kvOutrights
 * @param {string[]} mentionedTeams
 */
export function filterOutrightsForQuestion(kvOutrights, mentionedTeams) {
  if (!kvOutrights?.outrights || !Object.keys(kvOutrights.outrights).length) return kvOutrights;
  if (!mentionedTeams.length) return kvOutrights;

  const filtered = {};
  for (const abbr of mentionedTeams) {
    const key = String(abbr).toUpperCase();
    if (kvOutrights.outrights[key]) filtered[key] = kvOutrights.outrights[key];
  }

  if (!Object.keys(filtered).length) return kvOutrights;
  return { ...kvOutrights, outrights: filtered };
}
