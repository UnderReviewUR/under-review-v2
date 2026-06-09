/**
 * World Cup advancement / knockout-reach market detection + sim/price binding.
 */

import { isTournamentWinnerQuestion } from "./wcPhaseUtils.js";

export const WC_ADVANCEMENT_MARKET = {
  TOURNAMENT_WINNER: "tournament_winner",
  GROUP_ESCAPE: "group_escape",
  ROUND_OF_32: "r32",
  ROUND_OF_16: "r16",
  QUARTERFINALS: "qf",
  SEMIFINALS: "sf",
  FINAL: "final",
};

const R16_RE = /\b(round of 16|round-of-16|last 16|\br16\b)\b/i;
const R32_RE = /\b(round of 32|round-of-32|last 32|\br32\b)\b/i;
const QF_RE = /\b(quarter\s*finals?|quarterfinal|\bqf\b)\b/i;
const SF_RE = /\b(semi\s*finals?|semifinal|\bsf\b)\b/i;
const FINAL_RE =
  /\b(reach(?:es)?\s+(?:the\s+)?final|make(?:s)?\s+(?:the\s+)?final|get(?:s)?\s+to\s+(?:the\s+)?final)\b/i;

const GROUP_ESCAPE_RE =
  /\b(advance from (?:the )?group|qualify(?: for)?(?: the)? knockout|get (?:out|through) of (?:the )?group|escape (?:the )?group|advance from group stage|make it out of (?:the )?group|to advance from group|advance out of (?:the )?group|get out of the group)\b/i;

const GENERIC_ADVANCE_RE =
  /\b(reach(?:es)?|make(?:s)? it to|get(?:s)? to)\s+(?:the\s+)?(?:knockout|knockouts|knockout stage)\b/i;

/** @typedef {typeof WC_ADVANCEMENT_MARKET[keyof typeof WC_ADVANCEMENT_MARKET] | null} WcAdvancementMarketKind */

/**
 * @param {string} question
 * @returns {WcAdvancementMarketKind}
 */
export function classifyWcAdvancementMarket(question) {
  const q = String(question || "").trim();
  if (!q) return null;

  if (isTournamentWinnerQuestion(q)) {
    return WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER;
  }

  if (R16_RE.test(q) || /\breach(?:es)?\s+(?:the\s+)?round of 16\b/i.test(q)) {
    return WC_ADVANCEMENT_MARKET.ROUND_OF_16;
  }
  if (R32_RE.test(q)) {
    return WC_ADVANCEMENT_MARKET.ROUND_OF_32;
  }
  if (QF_RE.test(q)) {
    return WC_ADVANCEMENT_MARKET.QUARTERFINALS;
  }
  if (SF_RE.test(q)) {
    return WC_ADVANCEMENT_MARKET.SEMIFINALS;
  }
  if (FINAL_RE.test(q)) {
    return WC_ADVANCEMENT_MARKET.FINAL;
  }
  if (GROUP_ESCAPE_RE.test(q) || GENERIC_ADVANCE_RE.test(q)) {
    return WC_ADVANCEMENT_MARKET.GROUP_ESCAPE;
  }

  if (/\b(reach|make|get to)\b/i.test(q) && /\b(round|knockout)\b/i.test(q)) {
    return WC_ADVANCEMENT_MARKET.GROUP_ESCAPE;
  }

  return null;
}

/**
 * @param {WcAdvancementMarketKind} market
 */
export function isWcKnockoutReachMarket(market) {
  return (
    market === WC_ADVANCEMENT_MARKET.ROUND_OF_16 ||
    market === WC_ADVANCEMENT_MARKET.QUARTERFINALS ||
    market === WC_ADVANCEMENT_MARKET.SEMIFINALS ||
    market === WC_ADVANCEMENT_MARKET.FINAL
  );
}

/**
 * @param {string} question
 */
export function isWcAdvancementMarketQuestion(question) {
  const market = classifyWcAdvancementMarket(question);
  return Boolean(market && market !== WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER);
}

/**
 * @param {WcAdvancementMarketKind} market
 * @returns {{ key: string, label: string, shortLabel: string }}
 */
export function wcAdvancementMarketMeta(market) {
  switch (market) {
    case WC_ADVANCEMENT_MARKET.GROUP_ESCAPE:
      return { key: "advancePct", label: "advance from group", shortLabel: "Group advancement" };
    case WC_ADVANCEMENT_MARKET.ROUND_OF_32:
      return { key: "r32Pct", label: "reach Round of 32", shortLabel: "Round of 32" };
    case WC_ADVANCEMENT_MARKET.ROUND_OF_16:
      return { key: "r16Pct", label: "reach Round of 16", shortLabel: "Round of 16" };
    case WC_ADVANCEMENT_MARKET.QUARTERFINALS:
      return { key: "qfPct", label: "reach quarterfinals", shortLabel: "Quarterfinals" };
    case WC_ADVANCEMENT_MARKET.SEMIFINALS:
      return { key: "sfPct", label: "reach semifinals", shortLabel: "Semifinals" };
    case WC_ADVANCEMENT_MARKET.FINAL:
      return { key: "finalPct", label: "reach the final", shortLabel: "Final" };
    default:
      return { key: "winPct", label: "win the tournament", shortLabel: "Outright" };
  }
}

/**
 * @param {string} question
 */
export function getWcAdvancementMarketContextLabel(question) {
  const market = classifyWcAdvancementMarket(question);
  if (!market || market === WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER) return null;
  return wcAdvancementMarketMeta(market).shortLabel;
}

/**
 * Context bar suffix for knockout-reach / group-advance futures (not "Tonight").
 * @param {boolean} [isLive]
 */
export function getWcAdvancementMarketContextSuffix(isLive = false) {
  return isLive ? "Live" : "Futures";
}

/**
 * @param {string} question
 * @param {boolean} [isLive]
 */
export function formatWcAdvancementMarketContextLine(question, isLive = false) {
  const label = getWcAdvancementMarketContextLabel(question);
  if (!label) return null;
  return `${label} · ${getWcAdvancementMarketContextSuffix(isLive)}`;
}

/**
 * @param {Record<string, unknown> | undefined} teamStats
 * @param {WcAdvancementMarketKind} market
 */
export function simPctForAdvancementMarket(teamStats, market) {
  if (!teamStats || !market) return null;
  const { key } = wcAdvancementMarketMeta(market);
  const val = Number(teamStats[key]);
  return Number.isFinite(val) ? val : null;
}

/**
 * @param {ReturnType<import("./wcTournamentSim.js").simulateTournament>} simResults
 * @param {string[]} mentionedTeams
 * @param {string} [question]
 */
export function formatSimResultsForPrompt(simResults, mentionedTeams = [], question = "") {
  const market = classifyWcAdvancementMarket(question);
  const mentioned = new Set((mentionedTeams || []).map((t) => t.toUpperCase()));
  const liveNote = simResults.liveResultsApplied
    ? ` · ${simResults.completedMatchCount} FT result(s) locked in`
    : "";
  const lines = [
    `TOURNAMENT SIMULATION (${simResults.simCount.toLocaleString()} Monte Carlo sims — Poisson goal model + Elo${liveNote}):`,
  ];

  if (market && market !== WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER) {
    const meta = wcAdvancementMarketMeta(market);
    lines.push(
      `  SIM STAT BINDING: User asked about "${meta.label}" — cite ${meta.key} only for that claim.`,
      "  Do NOT substitute advancePct (escape group / Round of 32) for Round of 16, QF, SF, or Final reach %.",
    );
  }

  const shown = new Set();

  if (mentioned.size) {
    lines.push("  Cited teams:");
    for (const abbr of mentioned) {
      const s = simResults.teamStats[abbr];
      if (!s) continue;
      shown.add(abbr);
      if (market === WC_ADVANCEMENT_MARKET.ROUND_OF_16) {
        lines.push(
          `    ${s.abbreviation} (${s.name}): R16 reach ${s.r16Pct}% · advance from group ${s.advancePct}% · Win ${s.winPct}%`,
        );
      } else if (market === WC_ADVANCEMENT_MARKET.GROUP_ESCAPE) {
        lines.push(
          `    ${s.abbreviation} (${s.name}): advance from group ${s.advancePct}% · R16 ${s.r16Pct}% · Win ${s.winPct}%`,
        );
      } else if (market === WC_ADVANCEMENT_MARKET.QUARTERFINALS) {
        lines.push(
          `    ${s.abbreviation} (${s.name}): QF reach ${s.qfPct}% · R16 ${s.r16Pct}% · advance ${s.advancePct}% · Win ${s.winPct}%`,
        );
      } else if (market === WC_ADVANCEMENT_MARKET.SEMIFINALS) {
        lines.push(
          `    ${s.abbreviation} (${s.name}): SF reach ${s.sfPct}% · QF ${s.qfPct}% · R16 ${s.r16Pct}% · Win ${s.winPct}%`,
        );
      } else if (market === WC_ADVANCEMENT_MARKET.FINAL) {
        lines.push(
          `    ${s.abbreviation} (${s.name}): Final reach ${s.finalPct}% · SF ${s.sfPct}% · Win ${s.winPct}%`,
        );
      } else {
        lines.push(
          `    ${s.abbreviation} (${s.name}): advance ${s.advancePct}% · QF ${s.qfPct}% · SF ${s.sfPct}% · Final ${s.finalPct}% · Win ${s.winPct}%`,
        );
      }
    }
  }

  lines.push("  Top contenders:");
  for (const s of simResults.topContenders) {
    if (shown.has(s.abbreviation)) continue;
    shown.add(s.abbreviation);
    lines.push(
      `    ${s.abbreviation}: Win ${s.winPct}% · Final ${s.finalPct}% · SF ${s.sfPct}% · QF ${s.qfPct}%`,
    );
    if (shown.size >= 15) break;
  }

  return lines.join("\n");
}

/**
 * @param {string} question
 * @param {string[]} [entities]
 */
export function buildWcAdvancementMarketPromptBlock(question, entities = []) {
  const market = classifyWcAdvancementMarket(question);
  if (!market || market === WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER) return null;

  const meta = wcAdvancementMarketMeta(market);
  const team = (entities || []).map((t) => String(t).toUpperCase()).filter(Boolean)[0] || "cited team";
  const lines = [
    "ADVANCEMENT MARKET BINDING (mandatory for this question):",
    `  Question market: ${meta.label} — NOT tournament winner outright.`,
    "  CURRENT OUTRIGHT ODDS in VERIFIED CONTEXT are TOURNAMENT WINNER prices only — never cite them as Round of 16 / group-advance / knockout-reach prices.",
    `  For sim claims about "${meta.label}", use ${meta.key} from TOURNAMENT SIMULATION — not advancePct unless the user asked about escaping the group.`,
    `  When BDL FUTURES SEED is in VERIFIED CONTEXT, cite those prices for this market type — not CURRENT OUTRIGHT ODDS.`,
    `  Editorial references in US / HOST-NATION MEDIA CONTEXT (e.g. SportsLine USA Reach Round of 16 -115) are narrative corroboration only — label as editorial when BDL seed is absent.`,
    `  Fair-price reads must compare the user's market (${meta.label}) to ${meta.key} sim probability — do not compare group-advance sims to tournament-winner odds.`,
  ];

  if (market === WC_ADVANCEMENT_MARKET.ROUND_OF_16 && (team === "USA" || /\b(usmnt|united states)\b/i.test(question))) {
    lines.push(
      "  USA Round of 16: sim r16Pct is typically well below advancePct — escaping Group D does not imply reaching R16.",
    );
  }

  return lines.join("\n");
}
