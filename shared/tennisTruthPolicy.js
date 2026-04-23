/**
 * Tennis source-of-truth policy (Odds API ATP fallback vs BallDontLie).
 *
 * Policy:
 * - **bdl_fixture** (`truth_layer`): Draw / schedule identity from BallDontLie when `bdl_match_id` is present.
 *   Use for matchup truth, tournament metadata, and primary schedule times when available.
 * - **odds_market_fallback**: Row exists because The Odds API listed an H2H market when BDL returned no
 *   fixtures for the window. Odds establishes **presence and pricing-oriented timing** (`commence_time`),
 *   not official draw position. Do not treat Odds-only rows as canonical draw truth; they are **fallback
 *   presence** until BDL confirms the same matchup (see `tennisCanonicalDedupeKey` in homeEventDedup).
 *
 * Fields that may come from Odds fallback only (see api/_tennisOddsAtpFallback.js):
 * - Opponent names (home_team / away_team mapping), commence_time, implied "scheduled" status,
 *   sport key metadata (`odds_sport_key`). Tournament/round may be generic ("ATP Tour").
 *
 * UI should distinguish rows (e.g. badge or muted styling) when `truth_layer === "odds_market_fallback"` OR
 * when `raw.truth_layer` matches — never silently blend with BDL-confirmed rows.
 */

export const TENNIS_TRUTH_LAYER = Object.freeze({
  BDL_FIXTURE: "bdl_fixture",
  ODDS_MARKET_FALLBACK: "odds_market_fallback",
  OTHER: "other",
});

/** API + normalized client: read truth layer from row or nested raw. */
export function getTennisTruthLayer(rowOrMatch) {
  if (!rowOrMatch || typeof rowOrMatch !== "object") return TENNIS_TRUTH_LAYER.OTHER;
  const top = rowOrMatch.truth_layer;
  if (top) return String(top);
  const raw = rowOrMatch.raw;
  if (raw && typeof raw === "object") {
    if (raw.truth_layer) return String(raw.truth_layer);
    if (raw.raw && typeof raw.raw === "object" && raw.raw.truth_layer) {
      return String(raw.raw.truth_layer);
    }
  }
  return TENNIS_TRUTH_LAYER.OTHER;
}

export function isOddsMarketFallbackRow(rowOrMatch) {
  return getTennisTruthLayer(rowOrMatch) === TENNIS_TRUTH_LAYER.ODDS_MARKET_FALLBACK;
}
