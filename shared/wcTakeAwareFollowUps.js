/**
 * Fixture-anchored UR Take follow-ups — cite the take, contrarian / build / stress-test.
 */

import {
  parseWcMatchGoalsOverUnder,
  wcMatchupTeamDisplayName,
} from "./wcMatchupWinnerLine.js";
import { parsePropBoardFromStructured } from "./wcThreadState.js";

/**
 * @param {object[]} history
 */
function findPriorMatchTotalsFromHistory(history) {
  const rows = Array.isArray(history) ? [...history].reverse() : [];
  for (const turn of rows) {
    if (turn?.role !== "assistant") continue;
    const blob = [
      turn?.structured?.lean,
      turn?.structured?.call,
      turn?.content,
      turn?.text,
    ]
      .filter(Boolean)
      .join(" ");
    const ou = parseWcMatchGoalsOverUnder(blob);
    if (ou?.side && ou?.line != null) return ou;
  }
  return null;
}

/**
 * @param {string} blob
 */
function extractLeadAnytimeScorer(blob) {
  const m = String(blob || "").match(
    /([A-Za-zÀ-ÿ][\wÀ-ÿ'. -]{2,32})\s+anytime scorer\s+([+-]\d{2,})/i,
  );
  if (!m) return null;
  return { name: m[1].trim(), odds: m[2].trim() };
}

/**
 * @param {string} odds
 */
function juiceQLabel(odds) {
  const n = parseInt(odds, 10);
  if (Number.isFinite(n) && n <= -200) return "too much juice or still playable";
  return "juice or still playable";
}

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @returns {string | null}
 */
export function buildWcTakeAwareNextLine(message, userQuestion = "") {
  const structured =
    message?.structured && typeof message.structured === "object" ? message.structured : null;
  if (!structured) return null;

  const lean = String(structured.lean || "");
  const call = String(structured.call || "");
  const whyNow = String(structured.whyNow || "");
  const blob = `${lean}\n${call}\n${whyNow}`;
  const home = String(structured.fixtureHome || "").toUpperCase();
  const away = String(structured.fixtureAway || "").toUpperCase();
  const homeName = home ? wcMatchupTeamDisplayName(home) : "";
  const awayName = away ? wcMatchupTeamDisplayName(away) : "";

  const ou = parseWcMatchGoalsOverUnder(blob);
  if (ou?.side && ou.line != null && home && away) {
    const side = String(ou.side).toLowerCase();
    if (side === "under") {
      return `Next: does ${awayName} sitting deep make Under ${ou.line} the only play?`;
    }
    return `Next: what's the other side if ${homeName} scores in the first 15?`;
  }

  const scorer = extractLeadAnytimeScorer(`${call}\n${lean}`);
  if (scorer && home && away) {
    return `Next: is ${scorer.name} ${scorer.odds} ${juiceQLabel(scorer.odds)}?`;
  }

  if (/Posted anytime scorer lines/i.test(whyNow) && awayName) {
    return `Next: best value on the ${awayName} side?`;
  }

  if (/\b(\d+)\s+props per side\b/i.test(call) && awayName) {
    return `Next: who's the best ${awayName} scorer value beyond the top line?`;
  }

  void userQuestion;
  return null;
}

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @param {object[]} [history]
 * @returns {string[]}
 */
export function buildWcTakeAwareFollowUpChips(message, userQuestion = "", history = []) {
  const structured =
    message?.structured && typeof message.structured === "object" ? message.structured : null;
  if (!structured) return [];

  const chips = [];
  const lean = String(structured.lean || "");
  const call = String(structured.call || "");
  const blob = `${lean}\n${call}\n${structured.whyNow || ""}`;
  const home = String(structured.fixtureHome || "").toUpperCase();
  const away = String(structured.fixtureAway || "").toUpperCase();
  const homeName = home ? wcMatchupTeamDisplayName(home) : "";
  const awayName = away ? wcMatchupTeamDisplayName(away) : "";

  const ou = parseWcMatchGoalsOverUnder(blob);
  if (ou?.side && ou.line != null && home && away) {
    const side = String(ou.side).toLowerCase();
    if (side === "under") {
      chips.push(`What's the other side if ${homeName} scores early?`);
    } else {
      chips.push(`Does ${awayName} sitting deep flip this to Under?`);
    }
  }

  const scorer = extractLeadAnytimeScorer(`${call}\n${lean}`);
  const priorOu = findPriorMatchTotalsFromHistory(history);
  if (scorer && priorOu?.side && priorOu.line != null) {
    const priorSide = String(priorOu.side).toLowerCase();
    chips.push(`Parlay: ${scorer.name} scorer + ${priorSide} ${priorOu.line}?`);
  } else if (scorer && home && away) {
    const n = parseInt(scorer.odds, 10);
    if (Number.isFinite(n) && n < 0) {
      chips.push(`Is ${scorer.name} ${scorer.odds} juice or still playable?`);
    } else {
      chips.push(`Best ${awayName} scorer value besides ${scorer.name}?`);
    }
  }

  if (/Posted anytime scorer/i.test(structured.whyNow || "") && home && away) {
    chips.push(`4 player parlay for ${home} vs ${away}?`);
    if (!chips.some((c) => /parlay/i.test(c))) {
      const lead = parsePropBoardFromStructured(structured)[0]?.player || scorer?.name;
      const priorOu = findPriorMatchTotalsFromHistory(history);
      if (lead && priorOu?.side && priorOu.line != null) {
        chips.unshift(
          `Parlay: ${lead} scorer + ${String(priorOu.side).toLowerCase()} ${priorOu.line}?`,
        );
      }
    }
    if (!chips.some((c) => new RegExp(awayName, "i").test(c))) {
      chips.push(`Best value on the ${awayName} side?`);
    }
  }

  if (
    (structured.cardType === "prop_board" || /\btop player props\b/i.test(call)) &&
    home &&
    away
  ) {
    const priorOu = findPriorMatchTotalsFromHistory(history);
    const leadProp = parsePropBoardFromStructured(structured)[0];
    if (priorOu?.side && priorOu.line != null && leadProp?.player) {
      chips.unshift(
        `Parlay: ${leadProp.player} scorer + ${String(priorOu.side).toLowerCase()} ${priorOu.line}?`,
      );
    } else if (leadProp?.player) {
      chips.push(`Is ${leadProp.player} ${leadProp.odds || "listed"} juice or still playable?`);
    }
  }

  void userQuestion;
  return chips.filter(Boolean).slice(0, 2);
}

/**
 * @param {string | null | undefined} baseNext
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function resolveWcTakeAwareNextLine(baseNext, message, userQuestion = "") {
  return buildWcTakeAwareNextLine(message, userQuestion) || baseNext || null;
}

/**
 * @param {string[]} baseChips
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @param {object[]} [history]
 */
export function prependWcTakeAwareFollowUpChips(baseChips, message, userQuestion = "", history = []) {
  const aware = buildWcTakeAwareFollowUpChips(message, userQuestion, history);
  if (!aware.length) return baseChips;
  const out = [];
  const seen = new Set();
  for (const chip of [...aware, ...(baseChips || [])]) {
    const s = String(chip || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= 3) break;
  }
  return out;
}
