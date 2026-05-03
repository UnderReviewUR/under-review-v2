/**
 * UnderReview output QA: deterministic validation, scoring, and regeneration hints.
 * Runs after model generation; does not call the model itself.
 */

import {
  applyBetIntegrityPostProcess,
  sentenceFailsDoubleDoubleLogic,
  sentenceFailsTripleDoubleLogic,
} from "./_urTakeBetIntegrity.js";
import { runSportSpecificValidators } from "./_urTakeSportValidators/index.js";

/** Appended to system prompt on regeneration attempt (Part 3 self-check as instructions). */
export const QA_REGENERATION_SYSTEM_SUFFIX = `

[REWRITE PASS — prior output did not meet the quality bar]
Rewrite the entire response from scratch. Verify before you answer:
- Stat definitions: double-double = 10+ in TWO categories; triple-double = 10+ in THREE categories; PRA = points + rebounds + assists combined.
- No impossible statistical claims or mismatched stat labels.
- Same-game parlays: every named player must plausibly share the floor / belong to the matchup implied by context.
- No exaggerated certainty — use probabilistic framing; avoid lock/guarantee/automatic language.
- Props must be realistically achievable vs role and typical ranges; acknowledge bench/low-minute risk explicitly when relevant.
- Include at least one explicit probability or confidence qualification (percentage, implied framing, or calibrated verbal probability).
- Correct sport-specific betting logic for the league discussed; remove overconfidence on volatile markets (HR, TD, goal scorer, outrights, fastest lap, etc.).
- Add explicit role, usage, matchup, weather, or pace context where relevant — do not present thin-context props as safe.
`;

/** Empty — internal QA must never prepend visible boilerplate; sanitizer strips echoes. */
export const QA_SAFE_FALLBACK_PREFIX = "";

const OVERCONFIDENCE_TERMS =
  /\b(?:guaranteed|guarantee|can't lose|cant lose|mortal lock|sure\s*bet|surefire|free money|risk-?free|printing money|auto\s*cash|auto\-cash)\b/i;

/** Residual hype after bet-integrity pass — narrow to betting contexts. */
const RESIDUAL_THE_LOCK = /\bthe\s+lock\b/i;

const PRA_WRONG_DEF =
  /\bPRA\b.*\b(?:only\s+points|points\s+only|just\s+points|excluding\s+rebounds|without\s+rebounds)/i;

const BENCH_HIGH_AUX_LINE =
  /\b(?:bench|backup|reserve|deep\s+bench|third\s+string)\b[\s\S]{0,180}\b(?:over|at\s+least)\s+\d{1,2}(?:\.\d)?\s+(?:assists|AST)\b/i;

const IMPLIED_CROSS_GAME_HEURISTIC =
  /\b(?:same[- ]game|SGP|same\s+game\s+parlay)\b[\s\S]{0,320}\b(?:visit(?:ing|ors)?|home\s+team).*\b(?:visit(?:ing|ors)?|away\s+team)/i;

function splitIntoSentences(block) {
  return String(block || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function anySentenceFailsDdTd(text) {
  const blocks = String(text || "").split(/\n\n+/);
  for (const block of blocks) {
    for (const sent of splitIntoSentences(block)) {
      if (sentenceFailsDoubleDoubleLogic(sent) || sentenceFailsTripleDoubleLogic(sent)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function mentionsPropOrBet(text) {
  return /\b(?:prop|parlay|leg|slip|bet|pick|over|under|line)\b/i.test(text);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasProbabilityCue(text) {
  return (
    /\b\d{1,3}\s*%/.test(text) ||
    /\b(?:probability|probabilistic|implied|odds\s+are|roughly|about|around)\b/i.test(text) ||
    /\b(?:High|Medium|Low|Speculative)\s+confidence\b/i.test(text)
  );
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasRiskOrVolatilityCue(text) {
  return /\b(?:HIGH\s+RISK|volatility|variance|usage|minutes|bench|injury|questionable|floor|ceiling)\b/i.test(text);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasSeasonOrLineContext(text) {
  return /\b(?:season\s+average|per\s+game|PPG|APG|RPG|\d+\.\d+\s*(?:pts|reb|ast)|vs\.?\s*(?:the\s+)?line|market\s+line)\b/i.test(
    text,
  );
}

/**
 * Flag assist props that imply >30% lift vs season ast when stats available.
 * @param {string} text
 * @param {object[]} playerStats
 * @returns {boolean}
 */
function extremeAssistPropVsAverage(text, playerStats) {
  if (!Array.isArray(playerStats) || !playerStats.length) return false;
  const t = String(text || "");
  for (const row of playerStats) {
    const name = String(row?.name || "").trim();
    if (name.length < 4) continue;
    const ast = Number(row?.ast);
    if (!Number.isFinite(ast) || ast <= 0) continue;
    const last = name.split(/\s+/).pop();
    if (!last || !new RegExp(`\\b${escapeReg(last)}\\b`, "i").test(t)) continue;
    const re = /\bover\s+(\d+(?:\.\d+)?)\s+assists\b/gi;
    let m;
    while ((m = re.exec(t))) {
      const line = parseFloat(m[1]);
      if (!Number.isFinite(line)) continue;
      if (line > ast * 1.3 && !/\b(?:because|since|playoff|usage|injury|without)\b/i.test(t.slice(Math.max(0, m.index - 80), m.index + 80))) {
        return true;
      }
    }
  }
  return false;
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Same-game coherence when caller passes matchup constraint (NBA handler sets this).
 * @param {string} text
 * @param {{ allowedTeamAbbreviations?: string[], knownPlayerToTeam?: Map<string,string> }} ctx
 * @returns {{ invalid: boolean, detail?: string }}
 */
function rosterCoherenceFlag(text, ctx) {
  const allowed = ctx?.allowedTeamAbbreviations;
  const map = ctx?.knownPlayerToTeam;
  if (!allowed?.length || !(map instanceof Map) || map.size === 0) {
    return { invalid: false };
  }
  const allowedSet = new Set(allowed.map((a) => String(a || "").toUpperCase()));
  for (const [player, team] of map.entries()) {
    const pretty = String(player || "")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    if (pretty.length < 4) continue;
    const re = new RegExp(`\\b${escapeReg(pretty)}\\b`, "i");
    if (!re.test(text)) continue;
    const tm = String(team || "").toUpperCase();
    if (tm && !allowedSet.has(tm)) {
      return { invalid: true, detail: `${pretty} (${tm})` };
    }
  }
  return { invalid: false };
}

/**
 * @typedef {object} UrTakeQaLintResult
 * @property {string[]} issueCodes
 * @property {string[]} criticalRegenerationCodes
 * @property {number} score
 * @property {{ logic: number, probability: number, risk: number }} components
 * @property {boolean} shouldRegenerate
 * @property {boolean} applySafeFallbackPrefix
 * @property {Array<{ code: string, severity: string, message: string, sentence: string, requiresRegeneration: boolean }>} [sportIssues]
 */

/**
 * Deterministic output linter (Part 4).
 * @param {string} text — already bet-integrity processed
 * @param {object} [options]
 * @param {string[]} [options.betIntegrityIssues]
 * @param {object} [options.nbaContext] — optional playerStats for prop realism
 * @param {{ allowedTeamAbbreviations?: string[], knownPlayerToTeam?: Map<string,string> }} [options.coherenceContext]
 * @param {string} [options.intent]
 * @returns {UrTakeQaLintResult}
 */
export function lintUrTakeOutput(text, options = {}) {
  const raw = String(text || "").trim();
  const issues = [];
  const critical = [];

  if (!raw) {
    return {
      issueCodes: ["empty_output"],
      criticalRegenerationCodes: ["empty_output"],
      score: -4,
      components: { logic: 0, probability: 0, risk: 0 },
      shouldRegenerate: true,
      applySafeFallbackPrefix: true,
      sportIssues: [],
    };
  }

  const biIssues = options.betIntegrityIssues || [];

  if (biIssues.includes("invalid_stat_term_logic")) {
    issues.push("invalid_stat_term_logic");
  }

  if (anySentenceFailsDdTd(raw)) {
    issues.push("stat_logic_error_remaining");
    critical.push("stat_logic_error_remaining");
  }

  if (PRA_WRONG_DEF.test(raw)) {
    issues.push("pra_definition_conflict");
    critical.push("pra_definition_conflict");
  }

  if (OVERCONFIDENCE_TERMS.test(raw)) {
    issues.push("high_risk_overconfidence_language");
    critical.push("high_risk_overconfidence_language");
  }

  if (RESIDUAL_THE_LOCK.test(raw) && mentionsPropOrBet(raw)) {
    issues.push("residual_lock_metaphor");
    critical.push("residual_lock_metaphor");
  }

  if (BENCH_HIGH_AUX_LINE.test(raw)) {
    issues.push("bench_role_high_auxiliary_line");
    critical.push("bench_role_high_auxiliary_line");
  }

  if (IMPLIED_CROSS_GAME_HEURISTIC.test(raw)) {
    issues.push("suspicious_cross_game_sgp_language");
    /** Soft-only: heuristic is noisy on legitimate same-game writeups; logged for metrics. */
  }

  const coherence = rosterCoherenceFlag(raw, options.coherenceContext);
  if (coherence.invalid) {
    issues.push("roster_coherence_violation");
    critical.push("roster_coherence_violation");
  }

  const nbaCtx = options.nbaContext;
  if (extremeAssistPropVsAverage(raw, nbaCtx?.playerStats)) {
    issues.push("prop_line_extreme_vs_average");
    critical.push("prop_line_extreme_vs_average");
  }

  const sportResult = runSportSpecificValidators(raw, options);
  /** @type {Array<{ code: string, severity: string, message: string, sentence: string, requiresRegeneration: boolean }>} */
  const sportIssues = sportResult.issues;
  for (const c of sportResult.criticalCodes) {
    if (!critical.includes(c)) critical.push(c);
  }
  for (const si of sportIssues) {
    if (!issues.includes(si.code)) issues.push(si.code);
  }

  /** +1 correct logic, +1 probability, +1 risk; -2 factual/stat; -1 overconfidence */
  const FACT_LOGIC_CODES = new Set([
    "stat_logic_error_remaining",
    "pra_definition_conflict",
    "prop_line_extreme_vs_average",
    "bench_role_high_auxiliary_line",
    "suspicious_cross_game_sgp_language",
    "roster_coherence_violation",
  ]);
  const MISLEADING_OR_FACT_CRITICAL = new Set([
    ...FACT_LOGIC_CODES,
    "cross_sport_overconfidence",
    "volatile_market_floor_misuse",
    "high_risk_overconfidence_language",
    "residual_lock_metaphor",
    "mlb_batter_prop_overconfidence",
    "mlb_hr_prop_probability_inflation",
    "nfl_anytime_td_overconfidence",
    "nhl_goal_scorer_overconfidence",
    "soccer_goal_scorer_overconfidence",
    "tennis_match_winner_overconfidence",
    "golf_outright_probability_inflation",
    "f1_fastest_lap_volatility_missing",
    "wrong_sport_context_payload",
  ]);
  let logicComp = 1;
  if (critical.some((c) => MISLEADING_OR_FACT_CRITICAL.has(c))) {
    logicComp = -2;
  }

  let probComp = 1;
  if (mentionsPropOrBet(raw)) {
    if (!hasProbabilityCue(raw)) {
      issues.push("missing_probability_estimate");
      probComp = -1;
    }
  }

  let riskComp = 1;
  if (!hasRiskOrVolatilityCue(raw) && mentionsPropOrBet(raw)) {
    issues.push("thin_risk_identification");
    riskComp = 0;
  }

  let overPenalty = 0;
  if (OVERCONFIDENCE_TERMS.test(raw) || (RESIDUAL_THE_LOCK.test(raw) && mentionsPropOrBet(raw))) {
    issues.push("overconfidence_language");
    overPenalty = -1;
  }

  let score = logicComp + probComp + riskComp + overPenalty;
  score = Math.max(-6, Math.min(6, score));

  const shouldRegenerate = critical.length > 0;

  const standardizationGap =
    mentionsPropOrBet(raw) &&
    !hasSeasonOrLineContext(raw) &&
    /\b(?:points|rebounds|assists|PRA)\b/i.test(raw);
  if (standardizationGap) {
    issues.push("standardization_gap_avg_vs_line");
  }

  return {
    issueCodes: [...new Set(issues)],
    criticalRegenerationCodes: [...new Set(critical)],
    score,
    components: {
      logic: logicComp,
      probability: probComp,
      risk: riskComp,
      overconfidence: overPenalty,
    },
    shouldRegenerate,
    applySafeFallbackPrefix: shouldRegenerate,
    sportIssues,
  };
}

/**
 * Full post-process: bet integrity (stat + hype) then QA lint + score.
 * @param {string} text
 * @param {object} [options] — forwarded to applyBetIntegrityPostProcess + lintUrTakeOutput
 * @returns {{
 *   text: string,
 *   issues: string[],
 *   modified: boolean,
 *   qa: UrTakeQaLintResult & { metricsLine: object },
 * }}
 */
export function runUnderReviewPostProcess(text, options = {}) {
  const bi = applyBetIntegrityPostProcess(text, options);
  const lint = lintUrTakeOutput(bi.text, {
    ...options,
    betIntegrityIssues: bi.issues,
  });

  let outText = bi.text;
  let modified = bi.modified;

  if (
    lint.shouldRegenerate &&
    lint.applySafeFallbackPrefix &&
    options.applySafeFallbackPrefix === true
  ) {
    outText = `${QA_SAFE_FALLBACK_PREFIX}${outText}`;
    modified = true;
  }

  const metricsLine = {
    event: "ur_take_qa",
    score: lint.score,
    issueCodes: lint.issueCodes,
    criticalRegenerationCodes: lint.criticalRegenerationCodes,
    shouldRegenerate: lint.shouldRegenerate,
    betIntegrityIssues: bi.issues,
    sportIssueCount: lint.sportIssues?.length ?? 0,
    sportCriticalFromLint: (lint.sportIssues || []).filter((i) => i.requiresRegeneration).length,
  };

  const allIssues = [...new Set([...bi.issues, ...lint.issueCodes])];

  return {
    text: outText,
    issues: allIssues,
    modified,
    qa: { ...lint, metricsLine },
  };
}

/**
 * @param {UrTakeQaLintResult} qa
 * @returns {boolean}
 */
export function qaRequiresRegeneration(qa) {
  return Boolean(qa?.shouldRegenerate && (qa.criticalRegenerationCodes?.length ?? 0) > 0);
}
