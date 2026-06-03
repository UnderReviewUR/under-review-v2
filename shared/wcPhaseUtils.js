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
  return !["PRE_GROUP", "GROUP_STAGE"].includes(phase);
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
  const lines = [
    "KNOCKOUT BRACKET (verified fixtures):",
    "  Extra time + penalties if level after 90 — away goals rule does NOT apply (2026).",
  ];

  for (const m of use.slice(0, 16)) {
    const rk = wcRoundKey(m.round);
    const label = rk.toUpperCase();
    const score =
      isWcFinishedStatus(m.status) && m.homeScore != null
        ? ` ${m.homeScore}-${m.awayScore}`
        : "";
    lines.push(
      `  [${label}] ${m.homeTeam}${score} vs ${m.awayTeam} — ${m.date || ""} ${m.status || "NS"}`.trim(),
    );
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
