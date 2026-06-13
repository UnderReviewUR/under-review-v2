/**
 * FIFA WC 2026 Annex C — 495 third-place combination → R32 slot assignments.
 * @see shared/data/fifa2026AnnexCAssignments.json
 */

import annexData from "./data/fifa2026AnnexCAssignments.json" with { type: "json" };

/** @typedef {Record<"1A"|"1B"|"1D"|"1E"|"1G"|"1I"|"1K"|"1L", string>} FifaAnnexCRow */

export const FIFA2026_ANNEX_C_ASSIGNMENTS = annexData.assignments;

/**
 * @param {Iterable<string>} advancingThirdGroups — 8 group letters with a qualifying third
 */
export function buildAnnexCCombinationKey(advancingThirdGroups) {
  return [...advancingThirdGroups]
    .map((g) => String(g || "").trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

/**
 * @param {Array<{ group: string }>} bestThirdRanked — top 8 thirds in FIFA rank order
 * @returns {FifaAnnexCRow | null}
 */
export function lookupAnnexCAssignment(bestThirdRanked) {
  const rows = (bestThirdRanked || []).slice(0, 8);
  if (rows.length < 8) return null;
  const key = buildAnnexCCombinationKey(rows.map((r) => r.group));
  return FIFA2026_ANNEX_C_ASSIGNMENTS[key] ?? null;
}

/**
 * @param {string} slot e.g. "1E"
 */
export function groupLetterFromWinnerSlot(slot) {
  const m = String(slot || "").match(/^1([A-L])$/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * @param {string} thirdRef e.g. "3H"
 */
export function groupLetterFromThirdRef(thirdRef) {
  const m = String(thirdRef || "").match(/^3([A-L])$/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Map each R32 match num → third-place team via official Annex C table.
 * @param {Array<{ num: number, team1: string, team2: string }>} r32Matches
 * @param {Array<{ team: object, group: string }>} bestThirdRanked
 */
export function assignThirdPlaceToR32SlotsAnnexC(r32Matches, bestThirdRanked) {
  const mapping = lookupAnnexCAssignment(bestThirdRanked);
  /** @type {Map<number, object>} */
  const byMatchNum = new Map();
  if (!mapping) return byMatchNum;

  /** @type {Map<string, object>} */
  const thirdByGroup = new Map();
  for (const row of bestThirdRanked.slice(0, 8)) {
    thirdByGroup.set(String(row.group || "").toUpperCase(), row.team);
  }

  for (const m of r32Matches) {
    const slots = [m.team1, m.team2];
    const winnerSlot = slots.find((s) => groupLetterFromWinnerSlot(s));
    const hasThirdSlot = slots.some((s) => String(s).startsWith("3"));
    if (!winnerSlot || !hasThirdSlot) continue;

    const winnerGroup = groupLetterFromWinnerSlot(winnerSlot);
    if (!winnerGroup) continue;

    const thirdRef = mapping[`1${winnerGroup}`];
    const sourceGroup = groupLetterFromThirdRef(thirdRef);
    if (!sourceGroup) continue;

    const team = thirdByGroup.get(sourceGroup);
    if (team) byMatchNum.set(m.num, team);
  }

  return byMatchNum;
}
