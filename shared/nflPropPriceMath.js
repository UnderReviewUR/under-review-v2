/**
 * American-odds / vig / flat-bet EV helpers for NFL prop open settlements.
 * Used by the history grader — not a live pricing engine.
 */

/**
 * @param {number} american
 * @returns {number|null} raw implied win probability in (0,1)
 */
export function americanToImpliedProb(american) {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return null;
  if (a > 0) return 100 / (a + 100);
  return Math.abs(a) / (Math.abs(a) + 100);
}

/**
 * Decimal payout multiplier on a winning $1 stake (profit + stake).
 * @param {number} american
 * @returns {number|null}
 */
export function americanToDecimal(american) {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return null;
  if (a > 0) return 1 + a / 100;
  return 1 + 100 / Math.abs(a);
}

/**
 * Remove two-way vig → fair probabilities that sum to 1.
 * @param {number} overAmerican
 * @param {number} underAmerican
 * @returns {{ fairOver: number, fairUnder: number, overImplied: number, underImplied: number, vig: number }|null}
 */
export function removeTwoWayVig(overAmerican, underAmerican) {
  const overImplied = americanToImpliedProb(overAmerican);
  const underImplied = americanToImpliedProb(underAmerican);
  if (overImplied == null || underImplied == null) return null;
  const sum = overImplied + underImplied;
  if (!(sum > 0)) return null;
  return {
    overImplied,
    underImplied,
    fairOver: overImplied / sum,
    fairUnder: underImplied / sum,
    vig: sum - 1,
  };
}

/**
 * Flat $1 bet EV given true win probability and American odds.
 * Push / no-bet → 0 when trueProb is for decidable outcomes only.
 * @param {number} trueWinProb  empirical P(win) in [0,1]
 * @param {number} american
 * @returns {number|null} expected profit per $1 risked
 */
export function flatBetEv(trueWinProb, american) {
  const p = Number(trueWinProb);
  const dec = americanToDecimal(american);
  if (!Number.isFinite(p) || p < 0 || p > 1 || dec == null) return null;
  // Win: +(dec-1); lose: -1
  return p * (dec - 1) - (1 - p) * 1;
}

/**
 * Edge vs vig-removed fair price: empirical P(over) − fairOver.
 * Positive ⇒ Over was underpriced at open (relative to sample).
 * @param {number} empiricalOverRate
 * @param {number} fairOver
 * @returns {number|null}
 */
export function overPriceEdge(empiricalOverRate, fairOver) {
  const e = Number(empiricalOverRate);
  const f = Number(fairOver);
  if (!Number.isFinite(e) || !Number.isFinite(f)) return null;
  return e - f;
}

/**
 * @param {number} p implied win probability in (0,1)
 * @returns {number|null} American odds
 */
export function impliedProbToAmerican(p) {
  const x = Number(p);
  if (!Number.isFinite(x) || x <= 0 || x >= 1) return null;
  if (x >= 0.5) return -Math.round((x / (1 - x)) * 100);
  return Math.round(((1 - x) / x) * 100);
}

/** Valid listed American odds are ≤ -100 or ≥ +100. */
export function isValidAmericanOdds(american) {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return false;
  return Math.abs(a) >= 100;
}

/**
 * Pick consensus American odds among rows near a target line.
 * Medians odds in implied-prob space (never midpoint American across +/-).
 * @param {Array<{ line: number, overOdds: number|null, underOdds: number|null, milestoneOdds?: number|null }>} quotes
 * @param {number} targetLine
 * @returns {{ overOdds: number|null, underOdds: number|null, milestoneOdds: number|null, booksAtLine: number }}
 */
export function consensusOddsNearLine(quotes, targetLine) {
  const line = Number(targetLine);
  const list = Array.isArray(quotes) ? quotes : [];
  if (!Number.isFinite(line) || !list.length) {
    return { overOdds: null, underOdds: null, milestoneOdds: null, booksAtLine: 0 };
  }

  const scored = list
    .map((q) => ({ ...q, dist: Math.abs(Number(q.line) - line) }))
    .filter((q) => Number.isFinite(q.dist));
  if (!scored.length) {
    return { overOdds: null, underOdds: null, milestoneOdds: null, booksAtLine: 0 };
  }
  scored.sort((a, b) => a.dist - b.dist);
  const bestDist = scored[0].dist;
  const near = scored.filter((q) => q.dist <= bestDist + 1e-9 || q.dist <= 0.51);

  const median = (vals) => {
    if (!vals.length) return null;
    const a = [...vals].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  const overImplied = near
    .map((q) => (isValidAmericanOdds(q.overOdds) ? americanToImpliedProb(q.overOdds) : null))
    .filter((x) => x != null);
  const underImplied = near
    .map((q) => (isValidAmericanOdds(q.underOdds) ? americanToImpliedProb(q.underOdds) : null))
    .filter((x) => x != null);
  const mileImplied = near
    .map((q) =>
      isValidAmericanOdds(q.milestoneOdds) ? americanToImpliedProb(q.milestoneOdds) : null,
    )
    .filter((x) => x != null);

  return {
    overOdds: impliedProbToAmerican(median(overImplied)),
    underOdds: impliedProbToAmerican(median(underImplied)),
    milestoneOdds: impliedProbToAmerican(median(mileImplied)),
    booksAtLine: near.length,
  };
}
