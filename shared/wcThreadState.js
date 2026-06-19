/**
 * World Cup UR Take — thread memory + card typing for multi-turn exchanges.
 */

import { parseWcMatchGoalsOverUnder } from "./wcMatchupWinnerLine.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

/** @typedef {"single_lean"|"prop_board"|"parlay_ticket"|"slate_board"|"live_two_lean"|"explain"|"rules"} WcCardType */

export const WC_CARD_TYPE = {
  SINGLE_LEAN: "single_lean",
  PROP_BOARD: "prop_board",
  PARLAY_TICKET: "parlay_ticket",
  SLATE_BOARD: "slate_board",
  LIVE_TWO_LEAN: "live_two_lean",
  EXPLAIN: "explain",
  RULES: "rules",
};

/**
 * @param {object | null | undefined} structured
 * @param {string} [wcIntent]
 * @returns {WcCardType | null}
 */
export function inferWcCardType(structured, wcIntent = "") {
  if (!structured || typeof structured !== "object") return null;
  const explicit = String(structured.cardType || "").trim();
  if (explicit && Object.values(WC_CARD_TYPE).includes(/** @type {WcCardType} */ (explicit))) {
    return /** @type {WcCardType} */ (explicit);
  }

  const ct = String(structured.callType || "").toLowerCase();
  const intent = String(wcIntent || "").toUpperCase();

  if (ct === "rules" || intent === WC_INTENT.RULES) return WC_CARD_TYPE.RULES;
  if (ct === "parlay" || (Array.isArray(structured.parlayLegs) && structured.parlayLegs.length >= 2)) {
    return WC_CARD_TYPE.PARLAY_TICKET;
  }
  if (ct === "tomorrow_slate" || ct === "group_slate" || ct === "advancement") {
    return WC_CARD_TYPE.SLATE_BOARD;
  }
  if (structured.liveTwoLean || ct === "live_two_lean") return WC_CARD_TYPE.LIVE_TWO_LEAN;
  if (
    Array.isArray(structured.propBoardRows) &&
    structured.propBoardRows.length >= 2
  ) {
    return WC_CARD_TYPE.PROP_BOARD;
  }
  if (/\btop player props\b/i.test(String(structured.call || ""))) {
    return WC_CARD_TYPE.PROP_BOARD;
  }
  if (
    ct.startsWith("player_market") &&
    /^\s*\d+\.\s+/m.test(String(structured.lean || "")) &&
    (structured.propBoardRows?.length >= 2 ||
      (String(structured.lean || "").match(/^\s*\d+\.\s+/gm) || []).length >= 3)
  ) {
    return WC_CARD_TYPE.PROP_BOARD;
  }
  if (structured.breakdownDefaultExpanded && intent === WC_INTENT.PLAYER_PROP) {
    return WC_CARD_TYPE.EXPLAIN;
  }
  return WC_CARD_TYPE.SINGLE_LEAN;
}

/**
 * @param {string} blob
 * @param {{ side: string, line: string }} ou
 */
function extractTotalsOddsFromBlob(blob, ou) {
  const side = String(ou.side || "").toLowerCase();
  const line = String(ou.line || "").replace(".", "\\.");
  const re = new RegExp(`${side}\\s+${line}[^\\d]{0,12}([+-]\\d{2,})`, "i");
  const m = String(blob || "").match(re);
  if (m?.[1]) return m[1];
  const posted = String(blob || "").match(
    new RegExp(`Posted\\s+${side}\\s+${line}[^\\d]{0,8}([+-]\\d{2,})`, "i"),
  );
  return posted?.[1] || null;
}

/**
 * @param {object | null | undefined} structured
 * @returns {Array<{ player: string, market: string, odds: string }>}
 */
export function parsePropBoardFromStructured(structured) {
  if (!structured || typeof structured !== "object") return [];
  if (Array.isArray(structured.propBoardRows) && structured.propBoardRows.length) {
    return structured.propBoardRows
      .map((row) => ({
        player: String(row?.label || row?.player || "").trim(),
        market: String(row?.market || "anytime_scorer").trim(),
        odds: String(row?.odds || row?.lean || "")
          .match(/([+-]\d{2,})/)?.[1] || "",
      }))
      .filter((r) => r.player);
  }

  const lean = String(structured.lean || "");
  const rows = [];
  for (const line of lean.split("\n")) {
    const m = line.match(/^\s*\d+\.\s+(.+)$/);
    if (!m) continue;
    const body = m[1].trim();
    const odds = body.match(/([+-]\d{2,})\s*$/)?.[1] || "";
    const player = body
      .replace(/\s+anytime\s+(?:goal\s*)?scorer.*$/i, "")
      .replace(/\s+over\s+\d.*$/i, "")
      .trim();
    if (player) rows.push({ player, market: "anytime_scorer", odds });
  }
  return rows;
}

/**
 * @typedef {{
 *   wcEventId?: string | null,
 *   fixtureHome?: string,
 *   fixtureAway?: string,
 *   lastTotalsLean?: { side: string, line: string, odds?: string | null } | null,
 *   lastPropBoard?: Array<{ player: string, market: string, odds: string }>,
 *   lastParlayLegs?: Array<{ play?: string, odds?: string }> | null,
 *   cardTypes?: WcCardType[],
 * }} WcThreadState
 */

/**
 * @param {object[]} [history]
 * @returns {WcThreadState}
 */
export function extractWcThreadStateFromHistory(history) {
  /** @type {WcThreadState} */
  const state = {
    wcEventId: null,
    fixtureHome: "",
    fixtureAway: "",
    lastTotalsLean: null,
    lastPropBoard: [],
    lastParlayLegs: null,
    cardTypes: [],
  };

  for (const turn of history || []) {
    if (turn?.role !== "assistant") continue;
    Object.assign(state, mergeThreadStateFromStructured(state, turn.structured, turn.wcThreadState));
  }
  return state;
}

/**
 * @param {WcThreadState} state
 * @param {object | null | undefined} structured
 * @param {WcThreadState | null | undefined} [embedded]
 * @returns {WcThreadState}
 */
export function mergeThreadStateFromStructured(state, structured, embedded) {
  /** @type {WcThreadState} */
  const out = {
    ...state,
    ...(embedded && typeof embedded === "object" ? embedded : {}),
  };

  const s = structured && typeof structured === "object" ? structured : null;
  if (!s) return out;

  if (s.wcEventId) out.wcEventId = String(s.wcEventId);
  if (s.fixtureHome) out.fixtureHome = String(s.fixtureHome).toUpperCase();
  if (s.fixtureAway) out.fixtureAway = String(s.fixtureAway).toUpperCase();

  const cardType = inferWcCardType(s);
  if (cardType) {
    const types = Array.isArray(out.cardTypes) ? [...out.cardTypes] : [];
    if (!types.includes(cardType)) types.push(cardType);
    out.cardTypes = types;
  }

  if (s.matchTotalsLean?.side && s.matchTotalsLean.line != null) {
    out.lastTotalsLean = {
      side: String(s.matchTotalsLean.side),
      line: String(s.matchTotalsLean.line),
      odds:
        s.matchTotalsLean.odds != null && String(s.matchTotalsLean.odds).trim()
          ? String(s.matchTotalsLean.odds).trim()
          : null,
    };
  } else {
    const blob = [s.lean, s.call, s.line, s.whyNow, s.edge].filter(Boolean).join("\n");
    const ou = parseWcMatchGoalsOverUnder(blob);
    if (ou?.side && ou.line != null) {
      out.lastTotalsLean = {
        side: ou.side,
        line: ou.line,
        odds: extractTotalsOddsFromBlob(blob, ou),
      };
    }
  }

  const props = parsePropBoardFromStructured(s);
  if (props.length) out.lastPropBoard = props;

  if (Array.isArray(s.parlayLegs) && s.parlayLegs.length >= 2) {
    out.lastParlayLegs = s.parlayLegs;
  }

  return out;
}

/**
 * Stamp cardType + merged thread snapshot onto a structured payload before delivery.
 * @param {object | null | undefined} structured
 * @param {object[]} [history]
 * @param {string} [wcIntent]
 */
export function finalizeWcStructuredThreadState(structured, history = [], wcIntent = "") {
  if (!structured || typeof structured !== "object") return structured;
  const prior = extractWcThreadStateFromHistory(history);
  const cardType = inferWcCardType(structured, wcIntent);
  const wcThreadState = mergeThreadStateFromStructured(prior, structured);
  const matchTotalsLean = wcThreadState.lastTotalsLean || structured.matchTotalsLean || null;
  return {
    ...structured,
    cardType: cardType || structured.cardType,
    matchTotalsLean,
    wcThreadState,
  };
}
