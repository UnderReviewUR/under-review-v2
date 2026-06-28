/**
 * Knockout fixture detection + matchup guardrails (no group-stage "both advance").
 */

import { isKnockoutRound, wcRoundKey } from "./wcPhaseUtils.js";
import { parseWcMatchGoalsOverUnder } from "./wcMatchupWinnerLine.js";

const ROUND_LABEL = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinals",
  sf: "Semifinals",
  final: "Final",
};

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
export function isWcKnockoutFixtureMatch(match) {
  if (!match || typeof match !== "object") return false;
  return isKnockoutRound(match.round);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
export function getWcKnockoutRoundLabelForMatch(match) {
  const key = wcRoundKey(match?.round);
  return ROUND_LABEL[key] || "Knockout";
}

export const WC_KNOCKOUT_MATCH_BETTING_RULES = `MATCH BETTING — KNOCKOUT MODE (mandatory when Phase is knockout OR the cited fixture is R32/R16/QF/SF/Final):
- Single elimination: exactly ONE team advances from this fixture. NEVER suggest "both teams to advance" on this match.
- Do NOT use group-stage Favorite/Contender advancement paths or "both sides qualify" framing for this fixture.
- HEADLINE / THE PLAY: winner ML, Over/Under, BTTS, Draw No Bet, or to-advance — not group paths.
- 90-minute moneylines are regulation-only; advancement may require extra time and penalties.
- Alternate markets: O/U goals, BTTS, DNB, Asian handicap — never both teams advance on the same knockout fixture.`;

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Array<Record<string, unknown>>} [matchDetails]
 */
export function detectWcKnockoutBothAdvanceBleed(question, structured, matchDetails = []) {
  const details = Array.isArray(matchDetails) ? matchDetails : [];
  const knockoutScoped = details.some((d) => isWcKnockoutFixtureMatch(d));
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
 */
export function repairWcKnockoutMatchupStructured(structured, match) {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcKnockoutFixtureMatch(match)) return structured;

  const blob = [structured.call, structured.lean, structured.whyNow, structured.edge, structured.deep]
    .filter(Boolean)
    .join("\n");
  if (!/\bboth teams to advance\b/i.test(blob) && !/\bboth advance\b/i.test(blob)) {
    return structured;
  }

  const out = { ...structured };
  const stripBothAdvance = (text) =>
    String(text || "")
      .replace(/\bpass on ml\s*[—–-]\s*lean both teams to advance[^.!?\n]*/gi, "")
      .replace(/\blean both teams to advance[^.!?\n]*/gi, "")
      .replace(/\bboth teams to advance[^.!?\n]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

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

  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {string | null | undefined} wcEventId
 * @param {string[]} [mentionedTeams]
 */
export function resolveWcPinnedMatchForDelivery(wcContext, wcEventId, mentionedTeams = []) {
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
  return matches.find((m) => isWcKnockoutFixtureMatch(m)) || null;
}
