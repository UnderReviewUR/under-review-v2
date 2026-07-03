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
  // Prefer the explicit phase threaded from context (already date-aware via
  // resolveWcTournamentPhase). Fall back to the feed only when no phase is provided — do not
  // couple this low-level helper to the wall clock, which would flip isolated callers.
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
- Never cite group-stage advancePct or "both teams advance in tournament sims" on a knockout fixture — use winPct / regulation ML only.
- WHY (whyNow) must open with matchup insight: tactical edge, mispriced line, or player hook — never open with format reminders (single elimination, ET/pens settlement rules).
- ET/pens note belongs in WATCH FOR (edge) only — not sentence one of WHY.
- HEADLINE / THE PLAY: winner ML, Over/Under, BTTS, Draw No Bet, regulation Draw (1X2), or to-advance — not group paths.
- 90-minute Draw (1X2 draw leg) is a valid posted market in knockout — it wins if level after 90; advancement then goes to ET/pens separately.
- Never dismiss draw as unbettable because "one team must advance" — that's advancement settlement, not the draw market.
- You may Pass or fade draw on tactical/price grounds only — not because knockout forbids betting a regulation tie.
- 90-minute moneylines are regulation-only; advancement may require extra time and penalties.
- Alternate markets: O/U goals, BTTS, DNB, Asian handicap, regulation Draw — never both teams advance on the same knockout fixture.`;

export const WC_KNOCKOUT_DRAW_DISMISSAL_QA_SUFFIX = `

WC KNOCKOUT DRAW MARKET QA (mandatory — prior answer wrongly dismissed the regulation Draw):
- 90-minute Draw (1X2 draw leg) is bettable in knockout — it wins on 0-0, 1-1, etc. after 90 minutes; ET/pens decide advancement separately.
- NEVER say "avoid the draw" because "one team has to advance" — that confuses the draw market with to-advance settlement.
- You may Pass/fade draw on price or script (cagey favorite, late chaos) — cite that reason, not knockout format.
- BAD: "Avoid the draw at +195 — trap in a knockout where one team has to advance."
- GOOD: "Draw +195 is live if you expect a tight 90 — cashes on level, then ET/pens sort advancement." OR fade draw only with a tactical reason (e.g. Egypt chases a lead).`;

export const WC_KNOCKOUT_INSIGHT_FIRST_QA_SUFFIX = `

WC KNOCKOUT INSIGHT-FIRST QA (mandatory — prior answer wasted the opening on format boilerplate):
- WHY (whyNow) sentence one must be matchup insight: who wins and why, or which mispriced line/prop — not tournament format.
- Remove opening sentences about single elimination, "exactly one team advances", advancePct/tournament-sim both-advance stats, or 90-minute ML settlement rules.
- BAD WHY open: "Both teams advance from the Round of 32 in tournament sims… but this is single elimination."
- GOOD WHY open: "Egypt -110 · UR win bar ~58% — Salah's creation load breaks Australia's low block before ET."`;

const KNOCKOUT_FORMAT_BOILERPLATE_SENTENCE_RE =
  /^(?:both teams?\s+advance|both advance|tournament sims?|single elimination|exactly one team|only one team (?:wins|advances|moves)|90[-\s]?minute moneyline|90[-\s]?minute ml|regulation[-\s]?only|extra time and penalt|moves to the quarter)/i;

/**
 * @param {string} sentence
 */
export function isWcKnockoutFormatBoilerplateSentence(sentence) {
  const s = String(sentence || "").trim();
  if (!s) return false;
  if (KNOCKOUT_FORMAT_BOILERPLATE_SENTENCE_RE.test(s)) return true;
  if (/\bboth teams?\s+advance\b/i.test(s) && /\b(?:tournament sims?|round of \d+)/i.test(s)) {
    return true;
  }
  if (/\bsingle elimination\b/i.test(s) && /\b(?:exactly one|only one)\b/i.test(s)) return true;
  if (
    /\b90[-\s]?minute\b/i.test(s) &&
    /\b(?:only settlement|regulation only|matters for advancement|settlement that matters)\b/i.test(s)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} text
 */
export function stripWcKnockoutFormatBoilerplateLead(text) {
  const parts = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  while (parts.length && isWcKnockoutFormatBoilerplateSentence(parts[0])) {
    parts.shift();
  }
  return parts.join(" ").trim();
}

/**
 * @param {string} text
 */
function stripKnockoutSimsAdvanceBleed(text) {
  return String(text || "")
    .replace(/[^.!?]*\bboth teams?\s+advance[^.!?]*\btournament sims?[^.!?]*[.!?]\s*/gi, "")
    .replace(/[^.!?]*\btournament sims?[^.!?]*\bboth teams?\s+advance[^.!?]*[.!?]\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const KNOCKOUT_DRAW_DISMISSAL_RE =
  /\b(?:avoid|skip|pass on|stay away from|don't bet|do not bet|can't bet|cannot bet)\b[^.!?]{0,56}\b(?:the\s+)?draw\b/i;

const KNOCKOUT_DRAW_TRAP_RE =
  /\b(?:juicy|obvious)\b[^.!?]{0,40}\btrap\b/i;

/**
 * @param {string} sentence
 */
export function isWcKnockoutDrawDismissalSentence(sentence) {
  const s = String(sentence || "").trim();
  if (!s || !/\bdraw\b/i.test(s)) return false;
  if (KNOCKOUT_DRAW_DISMISSAL_RE.test(s)) return true;
  if (KNOCKOUT_DRAW_TRAP_RE.test(s) && /\bdraw\b/i.test(s)) return true;
  if (
    /\b(?:draw|tie)\b[^.!?]{0,100}\b(?:one team (?:has to|must) advance|must advance|has to advance)\b/i.test(
      s,
    )
  ) {
    return true;
  }
  if (/\b(?:no draw|can't draw|cannot draw|draw isn't|draw is not)\b[^.!?]{0,40}\b(?:bet|market|option)\b/i.test(s)) {
    return true;
  }
  return false;
}

/**
 * @param {string} text
 */
export function stripKnockoutDrawDismissal(text) {
  const parts = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const kept = parts.filter((s) => !isWcKnockoutDrawDismissalSentence(s));
  return kept.join(" ").trim();
}

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Array<Record<string, unknown>>} [matchDetails]
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>>, pinnedMatch?: Record<string, unknown> }} [scopeOpts]
 */
export function detectWcKnockoutDrawDismissal(
  question,
  structured,
  matchDetails = [],
  scopeOpts = {},
) {
  if (!knockoutScopedForBleed(matchDetails, scopeOpts)) return false;
  const blob = [structured?.lean, structured?.call, structured?.whyNow, structured?.edge, structured?.deep]
    .filter(Boolean)
    .join("\n");
  return blob.split(/(?<=[.!?])\s+/).some((sent) => isWcKnockoutDrawDismissalSentence(sent));
}

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

function knockoutScopedForBleed(matchDetails, scopeOpts = {}) {
  const details = Array.isArray(matchDetails) ? matchDetails : [];
  const scope = resolveKnockoutScope(scopeOpts);
  const pinned = scopeOpts.pinnedMatch;
  const scopedMatches = pinned ? [...details, pinned] : details;
  return scopedMatches.some((d) => isWcKnockoutFixtureMatch(d, scope));
}

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Array<Record<string, unknown>>} [matchDetails]
 * @param {{ tournamentPhase?: string, phase?: string, allMatches?: Array<Record<string, unknown>>, pinnedMatch?: Record<string, unknown> }} [scopeOpts]
 */
export function detectWcKnockoutFormatBoilerplateLead(
  question,
  structured,
  matchDetails = [],
  scopeOpts = {},
) {
  if (!knockoutScopedForBleed(matchDetails, scopeOpts)) return false;
  const whyNow = String(structured?.whyNow || "").trim();
  if (!whyNow) return false;
  const sents = whyNow.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!sents.length) return false;
  if (isWcKnockoutFormatBoilerplateSentence(sents[0])) return true;
  if (sents.length >= 2 && isWcKnockoutFormatBoilerplateSentence(sents[1])) {
    return /\b(?:90[-\s]?minute|single elimination|regulation|extra time|tournament sims?)\b/i.test(
      sents[1],
    );
  }
  return false;
}

export function detectWcKnockoutBothAdvanceBleed(
  question,
  structured,
  matchDetails = [],
  scopeOpts = {},
) {
  if (!knockoutScopedForBleed(matchDetails, scopeOpts)) return false;
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
    /\bboth teams to advance\b/i.test(blob) ||
    /\bboth teams advance\b/i.test(blob) ||
    /\bboth advance\b/i.test(blob) ||
    (/\btournament sims?\b/i.test(blob) && /\bboth\b[^.\n]{0,48}\badvance\b/i.test(blob))
  );
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
    stripWcKnockoutFormatBoilerplateLead(
      stripKnockoutSimsAdvanceBleed(
        String(text || "")
          .replace(/\bpass on ml\s*[—–-]\s*lean both teams to advance[^.!?\n]*/gi, "")
          .replace(/\blean both teams to advance[^.!?\n]*/gi, "")
          .replace(/\bboth teams to advance[^.!?\n]*/gi, "")
          .replace(/\bboth teams advance[^.!?\n]*/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
      ),
    );

  const blob = [structured.call, structured.lean, structured.whyNow, structured.edge, structured.deep]
    .filter(Boolean)
    .join("\n");
  const hasBothAdvanceBleed =
    /\bboth teams to advance\b/i.test(blob) ||
    /\bboth teams advance\b/i.test(blob) ||
    /\bboth advance\b/i.test(blob) ||
    (/\btournament sims?\b/i.test(blob) && /\bboth\b[^.\n]{0,48}\badvance\b/i.test(blob));
  if (hasBothAdvanceBleed) {
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
    if (out[key]) out[key] = stripKnockoutDrawDismissal(out[key]);
  }
  if (out.whyNow) {
    out.whyNow = stripWcKnockoutFormatBoilerplateLead(stripKnockoutSimsAdvanceBleed(out.whyNow));
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
