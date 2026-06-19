/**
 * Pure projections from WcTurnArtifact — follow-up chips and next lines.
 * Chip/next paths do not regex-parse lean/call/whyNow.
 */

import { WC_CARD_TYPE } from "./wcThreadState.js";
import {
  findPriorWcMatchTotalsLean,
  isWcPropBoardArtifact,
  leadWcPropBoardRow,
  wcTeamNameForNationAbbr,
} from "./wcTurnArtifact.js";

/** @typedef {import("./wcTurnArtifact.js").WcTurnArtifact} WcTurnArtifact */

/**
 * @param {WcTurnArtifact} artifact
 * @param {WcTurnArtifact[]} priorArtifacts
 * @param {WcTurnArtifact["propBoardRows"][number] | null} lead
 */
function appendLeadPropFollowUpChips(chips, artifact, priorArtifacts, lead) {
  if (!lead?.player || !artifact.fixture) return;

  const { home, away, homeName } = artifact.fixture;
  const priorTotals = findPriorWcMatchTotalsLean(priorArtifacts);

  if (
    priorTotals?.side &&
    priorTotals.line &&
    /scorer|goal|assist/i.test(lead.market)
  ) {
    chips.unshift(
      `Parlay: ${lead.player} scorer + ${String(priorTotals.side).toLowerCase()} ${priorTotals.line}?`,
    );
  }

  const oddsN = parseInt(lead.odds, 10);
  const teamLabel = wcTeamNameForNationAbbr(home, away, lead.nationAbbr || "") || homeName;
  if (Number.isFinite(oddsN) && oddsN < 0) {
    chips.push(`Is ${lead.player} ${lead.odds} juice or still playable?`);
  } else if (propMarketIsShotsLike(lead.market)) {
    chips.push(`Best ${teamLabel} shot line besides ${lead.player}?`);
  } else if (teamLabel) {
    chips.push(`Best ${teamLabel} scorer value besides ${lead.player}?`);
  }

  if (!chips.some((c) => /parlay/i.test(c))) {
    chips.push(`4 player parlay for ${home} vs ${away}?`);
  }
}

/**
 * @param {string} market
 */
function propMarketIsShotsLike(market) {
  return /shots|sot|on target/i.test(String(market || ""));
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
 * @param {WcTurnArtifact} artifact
 * @param {WcTurnArtifact[]} [priorArtifacts]
 * @returns {string[]}
 */
export function projectWcFollowUpChips(artifact, priorArtifacts = []) {
  if (!artifact?.fixture) return [];

  const chips = [];
  const { home, away, homeName, awayName } = artifact.fixture;

  if (artifact.wcNamedPlayerPropsCard) {
    chips.push(`4 player parlay for ${home} vs ${away}?`);
    return chips.filter(Boolean).slice(0, 2);
  }

  const totals = artifact.matchTotalsLean;
  if (totals?.side && totals.line && artifact.cardType === WC_CARD_TYPE.SINGLE_LEAN) {
    const side = String(totals.side).toLowerCase();
    if (side === "under") {
      chips.push(`What's the other side if ${homeName} scores early?`);
    } else {
      chips.push(`Does ${awayName} sitting deep flip this to Under?`);
    }
  }

  if (isWcPropBoardArtifact(artifact)) {
    appendLeadPropFollowUpChips(chips, artifact, priorArtifacts, leadWcPropBoardRow(artifact));
  } else {
    const lead = leadWcPropBoardRow(artifact);
    if (lead?.player && /scorer|goal|assist|shots|sot/i.test(lead.market)) {
      appendLeadPropFollowUpChips(chips, artifact, priorArtifacts, lead);
    }
  }

  if (artifact.cardType === WC_CARD_TYPE.PARLAY_TICKET) {
    chips.push(`Best value on the ${awayName} side?`);
  }

  return chips.filter(Boolean).slice(0, 2);
}

/**
 * @param {WcTurnArtifact} artifact
 * @returns {string | null}
 */
export function projectWcNextLine(artifact) {
  if (!artifact?.fixture) return null;

  const { homeName, awayName } = artifact.fixture;
  const totals = artifact.matchTotalsLean;

  if (totals?.side && totals.line && artifact.cardType === WC_CARD_TYPE.SINGLE_LEAN) {
    const side = String(totals.side).toLowerCase();
    if (side === "under") {
      return `Next: does ${awayName} sitting deep make Under ${totals.line} the only play?`;
    }
    return `Next: what's the other side if ${homeName} scores in the first 15?`;
  }

  const lead = leadWcPropBoardRow(artifact);
  if (lead?.player && lead.odds && !artifact.wcNamedPlayerPropsCard) {
    const n = parseInt(lead.odds, 10);
    if (Number.isFinite(n) && n < 0) {
      return `Next: is ${lead.player} ${lead.odds} ${juiceQLabel(lead.odds)}?`;
    }
    const teamLabel =
      wcTeamNameForNationAbbr(
        artifact.fixture.home,
        artifact.fixture.away,
        lead.nationAbbr || "",
      ) || awayName;
    if (propMarketIsShotsLike(lead.market)) {
      return `Next: best ${teamLabel} shot line beyond ${lead.player}?`;
    }
    return `Next: best value on the ${teamLabel} side?`;
  }

  return null;
}
