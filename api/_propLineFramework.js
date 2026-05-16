/**
 * Generic prop-vs-market gap analyzer.
 * Used by NFL, NBA, MLB, tennis, golf, F1.
 */

/**
 * @param {number} value
 * @param {Record<string, number>} thresholds
 * @returns {string}
 */
function detectTierFromThresholds(value, thresholds) {
  if (!thresholds || typeof thresholds !== "object") return "Unknown";
  const entries = Object.entries(thresholds).sort((a, b) => b[1] - a[1]);
  for (const [label, min] of entries) {
    if (value >= min) return label;
  }
  return entries.length ? entries[entries.length - 1][0] : "Unknown";
}

/**
 * Map tier label to approximate market rank using threshold ordering.
 * @param {string} tier
 * @param {Record<string, Record<string, number>>} positionThresholds
 */
function getImpliedRankFromTier(tier, positionThresholds) {
  const flat = [];
  for (const posBlock of Object.values(positionThresholds || {})) {
    for (const [label, min] of Object.entries(posBlock)) {
      flat.push({ label, min });
    }
  }
  flat.sort((a, b) => b.min - a.min);
  const idx = flat.findIndex((row) => row.label === tier);
  if (idx < 0) return 12;
  return Math.max(1, idx + 1);
}

/**
 * @param {{
 *   playerName: string,
 *   vegasLine: number,
 *   marketRank: number,
 *   leagueAverage: number,
 *   positionThresholds: Record<string, Record<string, number>>,
 *   sport: string,
 * }} params
 */
export function analyzePropGap({
  playerName,
  vegasLine,
  marketRank,
  leagueAverage,
  positionThresholds,
  sport,
}) {
  const pctAboveAvg =
    leagueAverage > 0 ? (vegasLine - leagueAverage) / leagueAverage : 0;

  const flatThresholds = {};
  for (const block of Object.values(positionThresholds || {})) {
    Object.assign(flatThresholds, block);
  }
  const tier = detectTierFromThresholds(vegasLine, flatThresholds);
  const impliedRank = getImpliedRankFromTier(tier, positionThresholds);
  const gapSpots = marketRank - impliedRank;

  let gapSignal;
  if (gapSpots >= 8) gapSignal = "STRONG BUY";
  else if (gapSpots >= 4) gapSignal = "BUY";
  else if (gapSpots >= -2) gapSignal = "FAIR VALUE";
  else if (gapSpots >= -6) gapSignal = "FADE";
  else gapSignal = "STRONG FADE";

  return {
    impliedTier: tier,
    gapSignal,
    gapSpots,
    pctAboveAvg,
    recommendation:
      `${playerName} — Vegas implies ${tier} (${sport} rank ~${impliedRank}) ` +
      `but market has them at ${marketRank}. Signal: ${gapSignal}.`,
  };
}
