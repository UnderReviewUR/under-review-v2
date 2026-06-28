/**
 * Knockout fixture detection + matchup guardrails (no group-stage "both advance").
 */

import {
  getKnockoutRoundLabel,
  getWorldCupPhase,
  isKnockoutPhase,
  isKnockoutRound,
  wcRoundKey,
} from "./wcPhaseUtils.js";
import { parseWcMatchGoalsOverUnder } from "./wcMatchupWinnerLine.js";

const ROUND_LABEL = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinals",
  sf: "Semifinals",
  final: "Final",
};

/**
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>> }} [opts]
 */
function resolveKnockoutScope(opts = {}) {
  const explicit = String(opts.tournamentPhase || opts.phase || "").trim();
  const allMatches = Array.isArray(opts.allMatches) ? opts.allMatches : [];
  const tournamentPhase =
    explicit || (allMatches.length ? getWorldCupPhase(allMatches) : "");
  return { tournamentPhase, allMatches };
}

/**
 * Upcoming/live fixtures during knockout often lack `round` on ESPN/BDL rows.
 * @param {Record<string, unknown> | null | undefined} match
 */
function isWcActiveKnockoutCandidateMatch(match) {
  const s = String(match?.status || "").toLowerCase();
  if (
    !s ||
    s === "ns" ||
    s === "scheduled" ||
    s === "not started" ||
    s === "tbd" ||
    s === "upcoming" ||
    s === "pre"
  ) {
    return true;
  }
  return ["live", "in_progress", "1h", "2h", "ht", "et", "pen", "break", "paused"].includes(s);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>> }} [opts]
 */
export function isWcKnockoutFixtureMatch(match, opts = {}) {
  if (!match || typeof match !== "object") return false;
  if (isKnockoutRound(match.round)) return true;

  const roundRaw = String(match.round || "").trim();
  const roundKey = wcRoundKey(match.round);
  if (roundRaw && roundKey === "group") return false;

  const { tournamentPhase } = resolveKnockoutScope(opts);
  if (!tournamentPhase || !isKnockoutPhase(tournamentPhase)) return false;

  return isWcActiveKnockoutCandidateMatch(match);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>> }} [opts]
 */
export function getWcKnockoutRoundLabelForMatch(match, opts = {}) {
  const key = wcRoundKey(match?.round);
  if (key !== "group" && key !== "unknown") {
    return ROUND_LABEL[key] || "Knockout";
  }
  const { tournamentPhase } = resolveKnockoutScope(opts);
  if (tournamentPhase && isKnockoutPhase(tournamentPhase)) {
    return getKnockoutRoundLabel(tournamentPhase) || "Knockout";
  }
  return "Knockout";
}

export const WC_KNOCKOUT_REGULATION_EDGE =
  "90-min ML is regulation only — if level, advancement goes to extra time and pens.";

export const WC_KNOCKOUT_GROUP_FRAMING_QA_SUFFIX =
  "\n\nKNOCKOUT REPAIR: Single-elimination fixture — remove group Favorite/Contender/Group-letter advancement paths. Use knockout elimination framing only; cite regulation vs ET/pens when discussing ML.";

export const WC_KNOCKOUT_MATCH_BETTING_RULES = `MATCH BETTING — KNOCKOUT MODE (mandatory when Phase is knockout OR the cited fixture is R32/R16/QF/SF/Final):
- Single elimination: exactly ONE team advances from this fixture. NEVER suggest "both teams to advance" on this match.
- Do NOT use group-stage Favorite/Contender advancement paths or "both sides qualify" framing for this fixture.
- HEADLINE / THE PLAY: winner ML, Over/Under, BTTS, Draw No Bet, or to-advance — not group paths.
- 90-minute moneylines are regulation-only; advancement may require extra time and penalties.
- Alternate markets: O/U goals, BTTS, DNB, Asian handicap — never both teams advance on the same knockout fixture.`;

/**
 * @param {{
 *   matchDetails?: Array<Record<string, unknown>>,
 *   match?: Record<string, unknown> | null,
 *   tournamentPhase?: string,
 *   phase?: string,
 *   allMatches?: Array<Record<string, unknown>>,
 * }} opts
 */
export function isWcKnockoutScoped(opts = {}) {
  const scope = resolveKnockoutScope(opts);
  if (scope.tournamentPhase && isKnockoutPhase(scope.tournamentPhase)) return true;

  const details = Array.isArray(opts.matchDetails) ? opts.matchDetails : [];
  if (details.some((d) => isWcKnockoutFixtureMatch(d, scope))) return true;
  if (opts.match && isWcKnockoutFixtureMatch(opts.match, scope)) return true;
  return false;
}

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Array<Record<string, unknown>>} [matchDetails]
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>> }} [scopeOpts]
 */
/**
 * @param {string} text
 */
export function stripWcKnockoutGroupFraming(text) {
  return String(text || "")
    .replace(/\bGroup\s+[A-L]\s+paths?\b/gi, "knockout elimination")
    .replace(/\bgroup-stage\s+math\b/gi, "elimination math")
    .replace(/\bgroup\s+paths?\b/gi, "knockout paths")
    .replace(/\b(Favorite|Contender|Longshot)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * @param {string} [edge]
 */
export function ensureWcKnockoutRegulationEdge(edge) {
  const base = String(edge || "").trim();
  if (!base) return WC_KNOCKOUT_REGULATION_EDGE;
  if (/90[-\s]?min|extra time|penalties|regulation only/i.test(base)) return base.slice(0, 200);
  return `${base} ${WC_KNOCKOUT_REGULATION_EDGE}`.slice(0, 200);
}

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Array<Record<string, unknown>>} [matchDetails]
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>>, pinnedMatch?: Record<string, unknown> }} [scopeOpts]
 */
export function detectWcKnockoutGroupFramingBleed(
  question,
  structured,
  matchDetails = [],
  scopeOpts = {},
) {
  const details = Array.isArray(matchDetails) ? matchDetails : [];
  const scope = resolveKnockoutScope(scopeOpts);
  const pinned = scopeOpts.pinnedMatch;
  const scopedMatches = pinned ? [...details, pinned] : details;
  const knockoutScoped = scopedMatches.some((d) => isWcKnockoutFixtureMatch(d, scope));
  if (!knockoutScoped) return false;
  const blob = [
    structured?.call,
    structured?.lean,
    structured?.whyNow,
    structured?.edge,
    structured?.deep,
    question,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    /\b(Favorite|Contender|Longshot)\b/.test(blob) ||
    /\bGroup\s+[A-L]\s+paths?\b/i.test(blob) ||
    /\bgroup-stage\s+math\b/i.test(blob) ||
    /\badvance\s+paths?\b/i.test(blob)
  );
}

export function detectWcKnockoutBothAdvanceBleed(
  question,
  structured,
  matchDetails = [],
  scopeOpts = {},
) {
  const details = Array.isArray(matchDetails) ? matchDetails : [];
  const scope = resolveKnockoutScope(scopeOpts);
  const pinned = scopeOpts.pinnedMatch;
  const scopedMatches = pinned ? [...details, pinned] : details;
  const knockoutScoped = scopedMatches.some((d) => isWcKnockoutFixtureMatch(d, scope));
  if (!knockoutScoped) return false;
  const blob = [
    structured?.call,
    structured?.lean,
    structured?.whyNow,
    structured?.edge,
    structured?.deep,
    question,
  ]
    .filter(Boolean)
    .join("\n");
  return /\bboth teams to advance\b/i.test(blob) || /\bboth advance\b/i.test(blob);
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Record<string, unknown> | null | undefined} match
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>> }} [scopeOpts]
 */
export function repairWcKnockoutMatchupStructured(structured, match, scopeOpts = {}) {
  if (!structured || typeof structured !== "object") return structured;
  const scope = resolveKnockoutScope(scopeOpts);
  if (!isWcKnockoutFixtureMatch(match, scope)) return structured;

  const out = { ...structured };
  const stripBothAdvance = (text) =>
    String(text || "")
      .replace(/\bpass on ml\s*[—–-]\s*lean both teams to advance[^.!?\n]*/gi, "")
      .replace(/\blean both teams to advance[^.!?\n]*/gi, "")
      .replace(/\bboth teams to advance[^.!?\n]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const blob = [structured.call, structured.lean, structured.whyNow, structured.edge, structured.deep]
    .filter(Boolean)
    .join("\n");
  if (/\bboth teams to advance\b/i.test(blob) || /\bboth advance\b/i.test(blob)) {
    out.lean = stripBothAdvance(out.lean);
    out.call = stripBothAdvance(out.call);
    out.whyNow = stripBothAdvance(out.whyNow);
    out.edge = stripBothAdvance(out.edge);

    const totals = parseWcMatchGoalsOverUnder(
      String(structured.call || structured.lean || ""),
    );
    if (totals?.side && totals.line != null && !out.call) {
      const side = totals.side === "over" ? "Over" : "Under";
      out.call = `${side} ${totals.line} goals`.slice(0, 100);
    }
    if (!out.lean && out.call) {
      out.lean = String(out.call).slice(0, 120);
    }
  }

  for (const key of ["lean", "call", "whyNow", "edge", "deep"]) {
    if (out[key]) out[key] = stripWcKnockoutGroupFraming(out[key]);
  }
  out.edge = ensureWcKnockoutRegulationEdge(out.edge);

  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {string | null | undefined} wcEventId
 * @param {string[]} [mentionedTeams]
 */
export function resolveWcPinnedMatchForDelivery(wcContext, wcEventId, mentionedTeams = []) {
  const scope = {
    tournamentPhase: wcContext?.phase,
    allMatches: wcContext?.allMatches,
  };
  const matches = [
    ...(Array.isArray(wcContext?.allMatches) ? wcContext.allMatches : []),
    ...(Array.isArray(wcContext?.matches) ? wcContext.matches : []),
    ...(Array.isArray(wcContext?.matchDetails) ? wcContext.matchDetails : []),
    ...(Array.isArray(wcContext?.fixtures) ? wcContext.fixtures : []),
  ];
  const eventId = String(wcEventId || wcContext?.wcEventId || "").trim();
  if (eventId) {
    const pinned = matches.find((m) => String(m?.id ?? m?.eventId ?? "") === eventId);
    if (pinned) return pinned;
  }
  const teams = new Set((mentionedTeams || []).map((t) => String(t).toUpperCase()).filter(Boolean));
  if (teams.size >= 2) {
    const pair = matches.find((m) => {
      const h = String(m?.homeTeam || "").toUpperCase();
      const a = String(m?.awayTeam || "").toUpperCase();
      return teams.has(h) && teams.has(a);
    });
    if (pair) return pair;
  }
  return matches.find((m) => isWcKnockoutFixtureMatch(m, scope)) || null;
}
