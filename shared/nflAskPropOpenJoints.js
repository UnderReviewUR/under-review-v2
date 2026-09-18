/**
 * Empirical same-player / same-game joint lifts from open settlements
 * (top-75 skill, 2025 + 2026 YTD). liftOver > 1 ⇒ positive dependence.
 *
 * Source: scripts/out/nfl-prop-history-grade.json → correlations
 */

/** @type {Array<{ a: string, b: string, liftOver: number, liftUnder: number, n: number }>} */
export const NFL_OPEN_SAME_PLAYER_JOINTS = Object.freeze([
  { a: "receiving_yards", b: "receptions", liftOver: 1.614, liftUnder: 1.59, n: 825 },
  { a: "rushing_yards", b: "rushing_attempts", liftOver: 1.521, liftUnder: 1.507, n: 440 },
  { a: "rushing_yards", b: "rushing_receiving_yards", liftOver: 1.636, liftUnder: 1.614, n: 336 },
  { a: "receiving_yards", b: "rushing_receiving_yards", liftOver: 1.459, liftUnder: 1.593, n: 470 },
  { a: "passing_completions", b: "passing_attempts", liftOver: 1.688, liftUnder: 1.422, n: 132 },
  { a: "passing_yards", b: "passing_attempts", liftOver: 1.363, liftUnder: 1.276, n: 132 },
  { a: "receiving_yards", b: "anytime_td", liftOver: 1.2, liftUnder: 1.159, n: 831 },
  { a: "rushing_yards", b: "anytime_td", liftOver: 1.262, liftUnder: 1.194, n: 480 },
  { a: "passing_yards", b: "passing_tds", liftOver: 1.215, liftUnder: 1.25, n: 132 },
  { a: "receptions", b: "anytime_td", liftOver: 1.154, liftUnder: 1.106, n: 828 },
]);

/** Map Ask market keys → settlement prop types */
const MARKET_TO_PROP = Object.freeze({
  rec_yds: "receiving_yards",
  receptions: "receptions",
  rush_yds: "rushing_yards",
  rush_att: "rushing_attempts",
  rushing_attempts: "rushing_attempts",
  rush_rec_yds: "rushing_receiving_yards",
  pass_yds: "passing_yards",
  pass_tds: "passing_tds",
  pass_attempts: "passing_attempts",
  passing_attempts: "passing_attempts",
  pass_completions: "passing_completions",
  passing_completions: "passing_completions",
  anytime_td: "anytime_td",
});

export function nflMarketToOpenPropType(marketBase) {
  const m = String(marketBase || "")
    .toLowerCase()
    .replace(/_period$/, "");
  if (MARKET_TO_PROP[m]) return MARKET_TO_PROP[m];
  if (/anytime|td_scorer/.test(m)) return "anytime_td";
  if (/rec.*yd/.test(m)) return "receiving_yards";
  if (/reception/.test(m)) return "receptions";
  if (/rush.*att/.test(m)) return "rushing_attempts";
  if (/rush.*rec.*yd/.test(m)) return "rushing_receiving_yards";
  if (/rush.*yd/.test(m)) return "rushing_yards";
  if (/pass.*td/.test(m)) return "passing_tds";
  if (/pass.*attempt/.test(m)) return "passing_attempts";
  if (/pass.*completion/.test(m)) return "passing_completions";
  if (/pass.*yd/.test(m)) return "passing_yards";
  return null;
}

/**
 * @param {string} propA
 * @param {string} propB
 * @returns {{ liftOver: number, liftUnder: number, n: number }|null}
 */
export function nflOpenJointLift(propA, propB) {
  const a = String(propA || "");
  const b = String(propB || "");
  for (const row of NFL_OPEN_SAME_PLAYER_JOINTS) {
    if ((row.a === a && row.b === b) || (row.a === b && row.b === a)) {
      return { liftOver: row.liftOver, liftUnder: row.liftUnder, n: row.n };
    }
  }
  return null;
}

/**
 * Same-player same-side stack with liftOver ≥ threshold → conflict note.
 * @param {Array<{ row: Record<string, unknown>, side: string, market?: string }>} sided
 * @param {(row: Record<string, unknown>) => string} marketKeyFn
 * @param {{ minLift?: number }} [opts]
 * @returns {string[]}
 */
export function detectNflSamePlayerJointConflicts(sided, marketKeyFn, opts = {}) {
  const minLift = opts.minLift ?? 1.35;
  const legs = Array.isArray(sided) ? sided.filter((x) => x?.row?.player && x.side) : [];
  /** @type {string[]} */
  const notes = [];

  for (let i = 0; i < legs.length; i += 1) {
    for (let j = i + 1; j < legs.length; j += 1) {
      const a = legs[i];
      const b = legs[j];
      const nameA = String(a.row.player || "");
      const nameB = String(b.row.player || "");
      if (nameA.toLowerCase() !== nameB.toLowerCase()) continue;
      if (a.side !== b.side) continue; // opposite sides on same player can hedge; not a stack risk

      const propA = nflMarketToOpenPropType(a.market || marketKeyFn(a.row));
      const propB = nflMarketToOpenPropType(b.market || marketKeyFn(b.row));
      if (!propA || !propB || propA === propB) continue;
      const lift = nflOpenJointLift(propA, propB);
      if (!lift) continue;
      const useLift = a.side === "Over" ? lift.liftOver : lift.liftUnder;
      if (useLift < minLift) continue;
      const short = nameA.split(/\s+/).pop() || nameA;
      notes.push(
        `${short} ${a.side} ${propA.replace(/_/g, " ")} + ${propB.replace(/_/g, " ")} move together (lift ${useLift.toFixed(2)}, n=${lift.n}).`,
      );
    }
  }
  return [...new Set(notes)].slice(0, 2);
}
