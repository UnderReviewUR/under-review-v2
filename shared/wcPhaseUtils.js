/**
 * World Cup 2026 tournament phase detection + prompt slimming helpers.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

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
  return !["PRE_GROUP", "GROUP_STAGE", "POST_TOURNAMENT"].includes(phase);
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
 * @param {string} question
 */
export function isTournamentWinnerQuestion(question) {
  return /\b(win (the )?(world cup|tournament|trophy|it all)|lift the trophy|outright|still win|path to|can .+ win)\b/i.test(
    String(question || ""),
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
