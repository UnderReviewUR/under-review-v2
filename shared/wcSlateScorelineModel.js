/**
 * Poisson scorelines for WC slate prediction asks — same Elo→λ model as tournament sim.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { applyHostAdvantage } from "../src/data/wc2026WinProbability.js";

const BASELINE_GOALS = 1.3;

/** Poisson PMF: P(X = k) given mean λ */
function poissonPmf(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function eloToExpectedGoals(eloA, eloB) {
  const diff = eloA - eloB;
  const multiplier = 10 ** (diff / 800);
  return BASELINE_GOALS * multiplier;
}

/**
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {typeof WC_2026_TEAMS} [teams]
 */
export function computeWcFixtureGoalLambdas(homeAbbr, awayAbbr, teams = WC_2026_TEAMS) {
  const home = teams.find((t) => String(t.abbreviation || "").toUpperCase() === String(homeAbbr || "").toUpperCase());
  const away = teams.find((t) => String(t.abbreviation || "").toUpperCase() === String(awayAbbr || "").toUpperCase());
  if (!home || !away) return null;
  const eloA = applyHostAdvantage(home.eloRating, home.isHost);
  const eloB = applyHostAdvantage(away.eloRating, away.isHost);
  return {
    homeLambda: eloToExpectedGoals(eloA, eloB),
    awayLambda: eloToExpectedGoals(eloB, eloA),
  };
}

/**
 * Top independent Poisson scorelines for a fixture (90-min, draws allowed).
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {{ teams?: typeof WC_2026_TEAMS, maxGoals?: number, topN?: number }} [opts]
 */
export function topWcScorelinesForFixture(homeAbbr, awayAbbr, opts = {}) {
  const maxGoals = opts.maxGoals ?? 5;
  const topN = opts.topN ?? 3;
  const lambdas = computeWcFixtureGoalLambdas(homeAbbr, awayAbbr, opts.teams);
  if (!lambdas) return null;

  const { homeLambda, awayLambda } = lambdas;
  /** @type {Array<{ homeGoals: number, awayGoals: number, prob: number }>} */
  const scores = [];
  for (let ha = 0; ha <= maxGoals; ha++) {
    for (let aw = 0; aw <= maxGoals; aw++) {
      const prob = poissonPmf(ha, homeLambda) * poissonPmf(aw, awayLambda);
      if (prob >= 0.008) scores.push({ homeGoals: ha, awayGoals: aw, prob });
    }
  }
  scores.sort((a, b) => b.prob - a.prob);
  const top = scores.slice(0, topN);
  const best = top[0];
  if (!best) return null;

  const fmt = (s) => `${s.homeGoals}-${s.awayGoals}`;
  const pct = (p) => Math.round(p * 1000) / 10;

  return {
    best: { scoreline: fmt(best), probPct: pct(best.prob) },
    top: top.map((s) => ({ scoreline: fmt(s), probPct: pct(s.prob) })),
    homeLambda: Math.round(homeLambda * 100) / 100,
    awayLambda: Math.round(awayLambda * 100) / 100,
  };
}

/**
 * @param {{ top?: Array<{ scoreline: string, probPct: number }> }} model
 */
export function formatWcAltScorelinesLine(model) {
  const top = Array.isArray(model?.top) ? model.top : [];
  if (top.length < 2) return "";
  return top
    .slice(1, 3)
    .map((s) => `${s.scoreline} (${s.probPct}%)`)
    .join(" · ");
}
