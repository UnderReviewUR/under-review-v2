/**
 * Consensus board metadata (Apr 2026 ingest).
 *
 * FETCH REPORT:
 * - PFF /draft: landing page OK; numbered big board behind PFF+ (paywall) — no ordinals fetched.
 * - ESPN Schefter intel: narrative only (~0 ranking rows); situational notes for Love/Bailey/Reese/Simpson.
 * - CBS Round 1 “What I would do” (Ryan Wilson): 32 picks with CBS PROSPECT RNK — primary structured signal.
 * - CBS seven-round team mocks: supplementary team fits (duplicate picks across mocks per CBS disclaimer).
 */

export const CONSENSUS_BOARD_NOTE =
  "Consensus layers: CBS Round 1 mock + CBS team mocks + ESPN Schefter intel. PFF board ordinals not imported (subscriber wall).";

export const CBS_WILSON_ROUND1_2026 = [
  { overallPick: 1, name: "Fernando Mendoza", cbsProspectRank: 1 },
  { overallPick: 2, name: "David Bailey", cbsProspectRank: 20 },
  { overallPick: 3, name: "Arvell Reese", cbsProspectRank: 3 },
  { overallPick: 4, name: "Sonny Styles", cbsProspectRank: 9 },
  { overallPick: 5, name: "Francis Mauigoa", cbsProspectRank: 16 },
  { overallPick: 6, name: "Caleb Lomu", cbsProspectRank: 13 },
  { overallPick: 7, name: "Jeremiyah Love", cbsProspectRank: 7 },
  { overallPick: 8, name: "Mansoor Delane", cbsProspectRank: 14 },
  { overallPick: 9, name: "Caleb Downs", cbsProspectRank: 8 },
  { overallPick: 10, name: "Carnell Tate", cbsProspectRank: 18 },
  { overallPick: 11, name: "Jordyn Tyson", cbsProspectRank: 23 },
  { overallPick: 12, name: "Rueben Bain Jr.", cbsProspectRank: 2 },
  { overallPick: 13, name: "Makai Lemon", cbsProspectRank: 17 },
  { overallPick: 14, name: "Olaivavega Ioane", cbsProspectRank: 15 },
  { overallPick: 15, name: "Akheem Mesidor", cbsProspectRank: 30 },
  { overallPick: 16, name: "Omar Cooper Jr.", cbsProspectRank: 21 },
  { overallPick: 17, name: "Kadyn Proctor", cbsProspectRank: 4 },
  { overallPick: 18, name: "Peter Woods", cbsProspectRank: 19 },
  { overallPick: 19, name: "Kenyon Sadiq", cbsProspectRank: 24 },
  { overallPick: 20, name: "Treydan Stukes", cbsProspectRank: 35 },
  { overallPick: 21, name: "Monroe Freeling", cbsProspectRank: 25 },
  { overallPick: 22, name: "Chase Bisontis", cbsProspectRank: 39 },
  { overallPick: 23, name: "Spencer Fano", cbsProspectRank: 5 },
  { overallPick: 24, name: "KC Concepcion", cbsProspectRank: 12 },
  { overallPick: 25, name: "Caleb Banks", cbsProspectRank: 92 },
  { overallPick: 26, name: "Jacob Rodriguez", cbsProspectRank: 55 },
  { overallPick: 27, name: "Malachi Lawrence", cbsProspectRank: 52 },
  { overallPick: 28, name: "Kayden McDonald", cbsProspectRank: 32 },
  { overallPick: 29, name: "R Mason Thomas", cbsProspectRank: 37 },
  { overallPick: 30, name: "D'Angelo Ponds", cbsProspectRank: 26 },
  { overallPick: 31, name: "Dillon Thieneman", cbsProspectRank: 47 },
  { overallPick: 32, name: "Emmanuel McNeil-Warren", cbsProspectRank: 22 },
];

/** Bands where single-mock slots conflict with broader analyst consensus. */
export const PROJECTED_RANGE_MANUAL = {
  "Arvell Reese": "1-8",
  "David Bailey": "15-38",
  "Jeremiyah Love": "3-10",
  "Ty Simpson": "33-68",
  "Fernando Mendoza": "1-4",
};

function bandFromMockPick(overallPick) {
  const spread = overallPick <= 8 ? 3 : overallPick <= 16 ? 4 : 6;
  const lo = Math.max(1, overallPick - spread);
  const hi = Math.min(110, overallPick + spread + 4);
  return `${lo}-${hi}`;
}

function manualOrBand(name, overallPick) {
  if (PROJECTED_RANGE_MANUAL[name]) return PROJECTED_RANGE_MANUAL[name];
  return bandFromMockPick(overallPick);
}

export function rankToRangeBand(rank) {
  if (rank <= 32) return `${Math.max(1, rank - 6)}-${Math.min(40, rank + 8)}`;
  if (rank <= 64) return `${Math.max(33, rank - 8)}-${Math.min(72, rank + 8)}`;
  if (rank <= 96) return `${Math.max(65, rank - 10)}-${Math.min(105, rank + 10)}`;
  return "103-140";
}

/**
 * @param {Array<{ name: string, position: string, school: string, nflGrade: number, sources?: string[] }>} rows
 */
export function applyConsensusMetadata(rows) {
  const enriched = rows.map((row) => {
    const cbs = CBS_WILSON_ROUND1_2026.find((e) => e.name === row.name);
    if (!cbs) return { ...row, sources: row.sources || ["nflTracker"] };

    const projectedRange = manualOrBand(row.name, cbs.overallPick);
    return {
      ...row,
      consensusRank: cbs.cbsProspectRank,
      projectedRange,
      sourceRanges: {
        cbsWilsonMockPick: String(cbs.overallPick),
        cbsProspectRank: String(cbs.cbsProspectRank),
      },
      sources: Array.from(new Set([...(row.sources || ["nflTracker"]), "cbsWilsonR1"])),
      draftNote:
        row.name === "David Bailey"
          ? "CBS opinion mock slotted Bailey very early; Under Review band uses mid–R1 / early R2 cluster for simulations."
          : undefined,
    };
  });

  const usedRanks = new Set(
    enriched.filter((r) => r.consensusRank != null).map((r) => /** @type {number} */ (r.consensusRank)),
  );

  let nextRank = 33;
  const byGrade = [...enriched].sort((a, b) => b.nflGrade - a.nflGrade);

  for (const r of byGrade) {
    if (r.consensusRank != null) continue;
    while (usedRanks.has(nextRank)) nextRank += 1;
    r.consensusRank = nextRank;
    usedRanks.add(nextRank);
    nextRank += 1;
    if (PROJECTED_RANGE_MANUAL[r.name]) {
      r.projectedRange = PROJECTED_RANGE_MANUAL[r.name];
    } else if (!r.projectedRange) {
      r.projectedRange = rankToRangeBand(r.consensusRank);
      r.sourceRanges = { ...(r.sourceRanges || {}), derivedFrom: "gradeTier+fallbackOrder" };
    }
  }

  return enriched.sort((a, b) => a.consensusRank - b.consensusRank);
}
