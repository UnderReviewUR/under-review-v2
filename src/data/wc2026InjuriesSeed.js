/**
 * Pre-tournament / early-window injury context when ESPN match details are sparse.
 */

/** @type {Array<{ name: string, teamAbbr: string, status: string, note?: string, impact?: string }>} */
export const WC_INJURIES_SEED_ROWS = [
  {
    name: "Kevin De Bruyne",
    teamAbbr: "BEL",
    status: "doubtful",
    note: "Muscle issue — monitor Belgium midfield availability",
    impact: "high",
  },
  {
    name: "Robert Lewandowski",
    teamAbbr: "POL",
    status: "questionable",
    note: "Fitness concern ahead of group stage",
    impact: "high",
  },
  {
    name: "Neymar",
    teamAbbr: "BRA",
    status: "doubtful",
    note: "Calf strain during pre-tournament friendlies",
    impact: "high",
  },
];

/**
 * @param {number} [nowMs]
 */
export function buildWcInjuriesSeedBoard(nowMs = Date.now()) {
  return {
    lastUpdated: nowMs,
    source: "seed",
    rows: WC_INJURIES_SEED_ROWS.map((r) => ({ ...r })),
    starsOut: WC_INJURIES_SEED_ROWS.filter((r) => r.impact === "high").map((r) => r.name),
    seeded: true,
  };
}
