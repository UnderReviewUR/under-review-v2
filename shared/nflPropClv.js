/**
 * Closing-line value helpers for NFL prop open → close → settle.
 *
 * For yardage O/U:
 *   Over CLV (points)  = closeLine − openLine   (higher close favors open Over)
 *   Under CLV (points) = openLine − closeLine
 *
 * Move toward winner: line moved in the direction of the settling side.
 */

/**
 * @param {number} openLine
 * @param {number} closeLine
 * @param {"over"|"under"|"push"|string} result
 * @returns {{
 *   lineMove: number,
 *   overClvPoints: number,
 *   underClvPoints: number,
 *   moveTowardWinner: boolean|null,
 *   openSideHadClv: boolean|null,
 * }}
 */
export function nflPropClvFromLines(openLine, closeLine, result) {
  const open = Number(openLine);
  const close = Number(closeLine);
  if (!Number.isFinite(open) || !Number.isFinite(close)) {
    return {
      lineMove: null,
      overClvPoints: null,
      underClvPoints: null,
      moveTowardWinner: null,
      openSideHadClv: null,
    };
  }
  const lineMove = close - open;
  const overClvPoints = lineMove;
  const underClvPoints = -lineMove;
  const r = String(result || "").toLowerCase();
  if (r === "push") {
    return {
      lineMove,
      overClvPoints,
      underClvPoints,
      moveTowardWinner: null,
      openSideHadClv: null,
    };
  }
  // Did the market move toward the eventual winner?
  let moveTowardWinner = null;
  if (r === "over") moveTowardWinner = lineMove > 0;
  else if (r === "under") moveTowardWinner = lineMove < 0;
  else moveTowardWinner = null;

  // If you bet the eventual winner at the open, did you get a better number than close?
  let openSideHadClv = null;
  if (r === "over") openSideHadClv = overClvPoints > 0;
  else if (r === "under") openSideHadClv = underClvPoints > 0;

  return {
    lineMove,
    overClvPoints,
    underClvPoints,
    moveTowardWinner,
    openSideHadClv,
  };
}

/**
 * Collapse raw BDL prop rows (open or live) to consensus line + odds per player/prop.
 * @param {Array<Record<string, unknown>>} rows
 * @param {Set<number>|null} [playerIdSet]
 * @param {import('./nflPropPriceMath.js')} priceMath
 */
export function consensusBoardFromPropRows(rows, playerIdSet, priceMath) {
  const {
    consensusOddsNearLine,
    isValidAmericanOdds,
  } = priceMath;
  /** @type {Map<string, Array<{ line: number, overOdds: number|null, underOdds: number|null, milestoneOdds: number|null }>>} */
  const buckets = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const pid = Number(row.player_id);
    const prop = String(row.prop_type || "");
    if (playerIdSet && !playerIdSet.has(pid)) continue;
    const mType = row.market?.type;
    if (mType === "milestone" && prop !== "anytime_td") continue;
    if (prop !== "anytime_td" && mType && mType !== "over_under") continue;
    const line = Number(row.line_value);
    if (!Number.isFinite(line)) continue;
    const k = `${pid}|${prop}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({
      line,
      overOdds:
        mType === "over_under" && isValidAmericanOdds(row.market?.over_odds)
          ? Number(row.market.over_odds)
          : null,
      underOdds:
        mType === "over_under" && isValidAmericanOdds(row.market?.under_odds)
          ? Number(row.market.under_odds)
          : null,
      milestoneOdds:
        mType === "milestone" && isValidAmericanOdds(row.market?.odds)
          ? Number(row.market.odds)
          : null,
    });
  }

  const median = (vals) => {
    const a = vals.filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const [k, quotes] of buckets) {
    const [pid, prop] = k.split("|");
    const line = median(quotes.map((q) => q.line));
    if (line == null) continue;
    const odds = consensusOddsNearLine(quotes, line);
    out.push({
      playerId: Number(pid),
      propType: prop,
      line,
      books: quotes.length,
      overOdds: odds.overOdds,
      underOdds: odds.underOdds,
      milestoneOdds: odds.milestoneOdds,
    });
  }
  return out;
}
