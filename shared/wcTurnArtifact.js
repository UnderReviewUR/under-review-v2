/**
 * WcTurnArtifact — immutable typed turn truth for WC UR Take projections.
 * Card face, follow-up chips, soak, and monitoring must read this object;
 * they must not regex-parse lean/call/whyNow when artifact fields are present.
 */

import {
  inferWcCardType,
  mergeThreadStateFromStructured,
  parsePropBoardFromStructured,
  WC_CARD_TYPE,
} from "./wcThreadState.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";

/** @typedef {import("./wcThreadState.js").WcCardType} WcCardType */

/**
 * @typedef {{
 *   side: string,
 *   line: string,
 *   odds?: string | null,
 * }} WcMatchTotalsLean
 */

/**
 * @typedef {{
 *   player: string,
 *   market: string,
 *   odds: string,
 *   nationAbbr?: string,
 *   legId?: string,
 *   line?: string | null,
 *   side?: string | null,
 * }} WcPropBoardRow
 */

/**
 * @typedef {{
 *   version: "wc-turn-artifact/v1",
 *   cardType: WcCardType | null,
 *   askShape: string | null,
 *   fixture: {
 *     eventId: string | null,
 *     home: string,
 *     away: string,
 *     homeName: string,
 *     awayName: string,
 *   } | null,
 *   propBoardRows: WcPropBoardRow[],
 *   namedLegCitation: Record<string, unknown> | null,
 *   matchTotalsLean: WcMatchTotalsLean | null,
 *   parlayLegs: Array<{ play?: string, odds?: string }> | null,
 *   wcNamedPlayerPropsCard: boolean,
 *   blockers: string[],
 * }} WcTurnArtifact
 */

/**
 * @param {unknown} raw
 * @returns {WcMatchTotalsLean | null}
 */
export function normalizeWcMatchTotalsLean(raw) {
  if (!raw || typeof raw !== "object") return null;
  const side = String(/** @type {{ side?: string }} */ (raw).side || "").trim();
  const line = String(/** @type {{ line?: string }} */ (raw).line ?? "").trim();
  if (!side || !line) return null;
  const oddsRaw = /** @type {{ odds?: string | null }} */ (raw).odds;
  return {
    side,
    line,
    odds: oddsRaw != null && String(oddsRaw).trim() ? String(oddsRaw).trim() : null,
  };
}

/**
 * @param {object} structured
 * @returns {WcPropBoardRow[]}
 */
function propBoardRowsForArtifact(structured) {
  if (Array.isArray(structured.propBoardRows) && structured.propBoardRows.length) {
    return structured.propBoardRows
      .map((row) => ({
        player: String(row?.label || row?.player || "").trim(),
        market: String(row?.market || "anytime_scorer").trim(),
        odds:
          String(row?.odds || row?.lean || "").match(/([+-]\d{2,})/)?.[1] ||
          String(row?.odds || "").trim(),
        nationAbbr: row?.nationAbbr ? String(row.nationAbbr).toUpperCase() : undefined,
      }))
      .filter((row) => row.player);
  }

  return parsePropBoardFromStructured(structured).map((row) => ({
    player: row.player,
    market: row.market,
    odds: row.odds,
    nationAbbr: row.nationAbbr,
  }));
}

/**
 * @param {object | null | undefined} structured
 * @returns {WcTurnArtifact | null}
 */
export function extractWcTurnArtifact(structured) {
  if (!structured || typeof structured !== "object") return null;

  const cardType = inferWcCardType(structured);
  const home = String(structured.fixtureHome || "").trim().toUpperCase();
  const away = String(structured.fixtureAway || "").trim().toUpperCase();

  let matchTotalsLean =
    normalizeWcMatchTotalsLean(structured.matchTotalsLean) ||
    normalizeWcMatchTotalsLean(structured.wcThreadState?.lastTotalsLean) ||
    null;

  if (!matchTotalsLean) {
    const merged = mergeThreadStateFromStructured({}, structured);
    matchTotalsLean = normalizeWcMatchTotalsLean(merged.lastTotalsLean);
  }

  const propBoardRows = propBoardRowsForArtifact(structured);

  const namedLegCitation =
    structured.namedLegCitation && typeof structured.namedLegCitation === "object"
      ? structured.namedLegCitation
      : null;

  return {
    version: "wc-turn-artifact/v1",
    cardType,
    askShape: structured.askShape
      ? String(structured.askShape)
      : structured.groundingAskShape
        ? String(structured.groundingAskShape)
        : null,
    fixture:
      home && away
        ? {
            eventId: structured.wcEventId ? String(structured.wcEventId) : null,
            home,
            away,
            homeName: wcMatchupTeamDisplayName(home),
            awayName: wcMatchupTeamDisplayName(away),
          }
        : null,
    propBoardRows,
    namedLegCitation,
    matchTotalsLean,
    parlayLegs: Array.isArray(structured.parlayLegs) ? structured.parlayLegs : null,
    wcNamedPlayerPropsCard: structured.wcNamedPlayerPropsCard === true,
    blockers: Array.isArray(structured.groundingBlockers)
      ? structured.groundingBlockers.map((b) => String(b))
      : [],
  };
}

/**
 * @param {object[]} [history]
 * @returns {WcTurnArtifact[]}
 */
export function extractWcTurnArtifactsFromHistory(history) {
  const out = [];
  for (const turn of history || []) {
    if (turn?.role !== "assistant") continue;
    const artifact = extractWcTurnArtifact(turn.structured);
    if (artifact) out.push(artifact);
  }
  return out;
}

/**
 * Most recent prior assistant turn with a totals lean.
 * @param {WcTurnArtifact[]} priorArtifacts
 * @returns {WcMatchTotalsLean | null}
 */
export function findPriorWcMatchTotalsLean(priorArtifacts) {
  for (let i = priorArtifacts.length - 1; i >= 0; i--) {
    const totals = priorArtifacts[i]?.matchTotalsLean;
    if (totals?.side && totals.line) return totals;
  }
  return null;
}

/**
 * @param {WcTurnArtifact} artifact
 * @returns {boolean}
 */
export function isWcPropBoardArtifact(artifact) {
  if (!artifact) return false;
  if (artifact.wcNamedPlayerPropsCard) return false;
  if (artifact.cardType === WC_CARD_TYPE.PROP_BOARD) return true;
  return artifact.propBoardRows.length >= 2;
}

/**
 * @param {WcTurnArtifact} artifact
 * @returns {import("./wcTurnArtifact.js").WcPropBoardRow | null}
 */
export function leadWcPropBoardRow(artifact) {
  return artifact?.propBoardRows?.[0] || null;
}

/**
 * @param {string} home
 * @param {string} away
 * @param {string} nationAbbr
 */
export function wcTeamNameForNationAbbr(home, away, nationAbbr) {
  const abbr = String(nationAbbr || "").trim().toUpperCase();
  if (!abbr) return "";
  if (abbr === home) return wcMatchupTeamDisplayName(home);
  if (abbr === away) return wcMatchupTeamDisplayName(away);
  return wcMatchupTeamDisplayName(abbr);
}
