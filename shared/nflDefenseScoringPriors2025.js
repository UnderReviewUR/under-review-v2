/**
 * 2025 full-season scoring-defense priors (points allowed).
 * Use as early-2026 context only — not a live this-season sample.
 * Source: 2025 regular-season opp points / opp PPG ranks.
 */

import { nflDefenseTierFromRank } from "./nflBdlDefenseNormalize.js";

/** @typedef {{ rank: number, ptsAllowed: number, tier?: string }} NflScoringDefensePrior */

/**
 * Rank 1 = fewest points allowed.
 * @type {Record<string, NflScoringDefensePrior>}
 */
export const NFL_2025_SCORING_DEFENSE_PRIORS = Object.freeze({
  SEA: { rank: 1, ptsAllowed: 17.2 },
  HOU: { rank: 2, ptsAllowed: 17.4 },
  DEN: { rank: 3, ptsAllowed: 18.3 },
  NE: { rank: 4, ptsAllowed: 18.8 },
  PHI: { rank: 5, ptsAllowed: 19.1 },
  KC: { rank: 6, ptsAllowed: 19.3 },
  MIN: { rank: 7, ptsAllowed: 19.6 },
  JAX: { rank: 8, ptsAllowed: 19.8 },
  LAC: { rank: 9, ptsAllowed: 20.0 },
  LAR: { rank: 10, ptsAllowed: 20.4 },
  GB: { rank: 11, ptsAllowed: 21.2 },
  BUF: { rank: 12, ptsAllowed: 21.5 },
  SF: { rank: 13, ptsAllowed: 21.8 },
  CLE: { rank: 14, ptsAllowed: 22.3 },
  CAR: { rank: 15, ptsAllowed: 22.4 },
  NO: { rank: 16, ptsAllowed: 22.5 },
  PIT: { rank: 17, ptsAllowed: 22.8 },
  BAL: { rank: 18, ptsAllowed: 23.4 },
  ATL: { rank: 19, ptsAllowed: 23.6 },
  TB: { rank: 20, ptsAllowed: 24.2 },
  IND: { rank: 21, ptsAllowed: 24.2 },
  DET: { rank: 22, ptsAllowed: 24.3 },
  CHI: { rank: 23, ptsAllowed: 24.4 },
  MIA: { rank: 24, ptsAllowed: 24.9 },
  CIN: { rank: 25, ptsAllowed: 25.1 },
  LVR: { rank: 26, ptsAllowed: 25.4 },
  DAL: { rank: 27, ptsAllowed: 25.8 },
  WAS: { rank: 28, ptsAllowed: 26.1 },
  ARI: { rank: 29, ptsAllowed: 26.2 },
  NYG: { rank: 30, ptsAllowed: 26.7 },
  TEN: { rank: 31, ptsAllowed: 26.9 },
  NYJ: { rank: 32, ptsAllowed: 28.1 },
});

export const NFL_DEFENSE_PRIOR_SEASON = 2025;
export const NFL_DEFENSE_PRIOR_BASIS = "points_allowed";

/**
 * @param {number} rank
 */
export function tierForNflScoringDefenseRank(rank) {
  return nflDefenseTierFromRank(rank);
}

/**
 * Overlay 2025 scoring priors onto a static defense map.
 * Keeps personnel/angles prose, but corrects tier/rank/pts and stamps vintage.
 * @param {Record<string, Record<string, unknown>>} defensesMap
 */
export function applyNfl2025ScoringDefensePriors(defensesMap) {
  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const [abbr, row] of Object.entries(defensesMap || {})) {
    const prior = NFL_2025_SCORING_DEFENSE_PRIORS[abbr];
    if (!prior || !row || typeof row !== "object") {
      out[abbr] = row;
      continue;
    }
    const tier = prior.tier || tierForNflScoringDefenseRank(prior.rank);
    const prevOverall =
      row.overall && typeof row.overall === "object" ? { ...row.overall } : {};
    const stamp = `2025 scoring prior (rank ${prior.rank}, ${prior.ptsAllowed} opp ppg) — early-season context only until a real 2026 sample posts.`;
    const prevNote = String(row.note || "").trim();
    out[abbr] = {
      ...row,
      tier,
      season: NFL_DEFENSE_PRIOR_SEASON,
      priorSeason: NFL_DEFENSE_PRIOR_SEASON,
      priorBasis: NFL_DEFENSE_PRIOR_BASIS,
      priorVintage: "2025_full_season",
      overall: {
        ...prevOverall,
        rank: prior.rank,
        ptsAllowed: prior.ptsAllowed,
      },
      note: prevNote && !prevNote.includes("2025 scoring prior")
        ? `${stamp} ${prevNote}`
        : prevNote || stamp,
    };
  }
  return out;
}

/**
 * True when this defense row is still a prior, not a live this-season sample.
 * @param {Record<string, unknown>|null|undefined} def
 */
export function isNflDefensePriorRow(def) {
  if (!def || typeof def !== "object") return false;
  if (def.priorVintage || def.priorSeason) return true;
  if (def.liveDeferred) return true;
  const src = String(def.source || "");
  if (src === "static_prior" || src === "balldontlie_team_season_stats") {
    const gp = Number(def.gamesPlayed ?? def.games_played ?? 0);
    if (src === "balldontlie_team_season_stats" && Number.isFinite(gp) && gp >= 4) {
      return false;
    }
  }
  // Static file rows (no live source) are priors.
  if (!src || src === "static" || src === "merged") {
    return Boolean(def.priorVintage || def.season === 2025);
  }
  return false;
}

/**
 * Short thesis/card tag — e.g. "ELITE D · '25 prior"
 * @param {Record<string, unknown>|null|undefined} def
 */
export function formatNflDefenseTierLabel(def) {
  const tier = String(def?.tier || "").trim();
  if (!tier) return "";
  if (isNflDefensePriorRow(def)) return `${tier} D · '25 prior`;
  return `${tier} D`;
}
