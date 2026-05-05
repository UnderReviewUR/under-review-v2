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
import { sanitizeOverFormalOutput } from "./_urTakeVoiceProfile.js";

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
- UnderReview voice: no "projection invalid" or cold "player unavailable" when status is still uncertain; no triple-decimal stat spam; no STATUS SHIFT / STRUCTURAL REALITY / PROP SHIFT headers in user text.
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

const HARD_BANNED_HEADER_LINE =
  /^(?:STRUCTURAL REALITY|STATUS SHIFT|PROP SHIFT|REPLACEMENT WATCHLIST|LIVE TRIGGER)\b[:\s-]*/i;

function normalizeStatLikeDecimals(text) {
  let s = String(text || "");
  s = s.replace(
    /\b(\d+)\.(\d{2,})\s*(pts|points|rebounds?|assists?|PRA|pra|ast|reb|rpg|apg|ppg|yds|yd)\b/gi,
    (_, a, b, unit) => {
      const n = parseFloat(`${a}.${b}`);
      if (!Number.isFinite(n)) return _;
      return `~${Math.round(n)} ${unit}`;
    },
  );
  s = s.replace(/\b(\d+)\.(\d{2,})\s+(PRA|pra)\b/g, (_, a, b, unit) => {
    const n = parseFloat(`${a}.${b}`);
    if (!Number.isFinite(n)) return `${a}.${b} ${unit}`;
    return `~${Math.round(n)} ${unit}`;
  });
  return s;
}

function stripBannedHeaders(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(HARD_BANNED_HEADER_LINE, "").trimEnd())
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function sanitizeRoboticPhrases(text) {
  return String(text || "")
    .replace(/\bprojection invalid\b/gi, "can't play that directly")
    .replace(
      /\bplayer unavailable\b/gi,
      "if he's out, I'd pivot to a different angle",
    )
    .replace(/\bstatistically speaking\b/gi, "from the numbers")
    .replace(/\bbased on analysis\b/gi, "from this spot");
}

function patchStatusContradiction(text) {
  let s = String(text || "");
  s = s.replace(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:is\s+)?probable\b[\s\S]{0,90}\b(?:is\s+out|ruled\s+out|definitely\s+out)\b/g,
    (_, name) => `${name} is still uncertain — if he's in, play it; if he sits, pivot.`,
  );
  s = s.replace(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:is\s+)?questionable\b[\s\S]{0,90}\b(?:is\s+out|ruled\s+out|definitely\s+out)\b/g,
    (_, name) => `${name} is still uncertain — if he's in, play it; if he sits, pivot.`,
  );
  return s;
}

function appendSlateDiversificationLine(text, options) {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  if (!options?.slateWidePropQuestion || !/\bparlay\b/i.test(raw)) return raw;
  if (/\b(same[- ]?game|SGP)\b/i.test(raw)) return raw;
  const matchups = raw.match(/\b[A-Z]{2,4}\s*[@v.\s]+\s*[A-Z]{2,4}\b/g) || [];
  const isSingleGame = new Set(matchups).size <= 1;
  if (!isSingleGame || !/\d\s*(?:leg|legs)\b/i.test(raw)) return raw;
  if (/diversify across the slate/i.test(raw)) return raw;
  return `${raw}\n\nThese are all from one game — you might want to diversify across the slate.`;
}

function countSlipLegMentions(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const indexed = lines.filter((l) => /^(\d+[\).\]-]|leg\s*\d+|#\d+)/i.test(l)).length;
  if (indexed > 0) return indexed;
  const explicit = String(text || "").match(/\bleg\s+\d+\b/gi);
  return explicit ? explicit.length : 0;
}

function enforceSlipCompleteness(text, options) {
  if (String(options?.intent || "") !== "slip_review") return String(text || "").trim();
  const expected = Number(options?.expectedSlipLegCount);
  if (!Number.isFinite(expected) || expected <= 0) return String(text || "").trim();
  const seen = countSlipLegMentions(text);
  if (seen >= expected) return String(text || "").trim();
  if (/might be missing a leg here/i.test(String(text || ""))) return String(text || "").trim();
  return `${String(text || "").trim()}\n\nmight be missing a leg here — worth a closer look`;
}

function applyDeterministicQaEnforcement(text, options = {}) {
  let s = String(text || "");
  s = normalizeStatLikeDecimals(s);
  s = stripBannedHeaders(s);
  s = sanitizeRoboticPhrases(s);
  s = patchStatusContradiction(s);
  s = appendSlateDiversificationLine(s, options);
  s = enforceSlipCompleteness(s, options);
  return s.trim();
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
 * @param {boolean} [options.liveMode]
 * @param {string} [options.question]
 * @param {boolean} [options.slateWidePropQuestion]
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

  if (/\bprojection invalid\b/i.test(raw)) {
    issues.push("robotic_projection_invalid_phrase");
    critical.push("robotic_projection_invalid_phrase");
  }

  if (/\bplayer unavailable\b/i.test(raw) && /\b(probable|questionable|doubtful|gtd|game[- ]time|uncertain|might play|if he)\b/i.test(raw)) {
    issues.push("status_language_player_unavailable_mismatch");
    critical.push("status_language_player_unavailable_mismatch");
  }

  if (/\b(probable|questionable)\b/i.test(raw) && /\b(is out|ruled out|definitely out)\b/i.test(raw)) {
    issues.push("status_contradiction_probable_vs_out");
    critical.push("status_contradiction_probable_vs_out");
  }

  if (/\b\d+\.\d{3,}\b/.test(raw) && /\b(?:pts|points|rebounds?|assists?|PRA|pra|ast|reb|yds)\b/i.test(raw)) {
    issues.push("over_precise_decimal_stats");
    critical.push("over_precise_decimal_stats");
  }

  if (/\b(?:STATUS SHIFT|STRUCTURAL REALITY|PROP SHIFT|REPLACEMENT WATCHLIST|LIVE TRIGGER)\b/i.test(raw)) {
    issues.push("report_style_header_echo");
    critical.push("report_style_header_echo");
  }

  if (options.liveMode) {
    if (!/Best look:/i.test(raw)) {
      issues.push("live_mode_missing_best_look");
    }
    if (!/Watch:/i.test(raw)) {
      issues.push("live_mode_missing_watch");
    }
    const paragraphs = raw
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const hasDenseLiveParagraph = paragraphs.some((p) => {
      const sentences = splitIntoSentences(p);
      return p.length >= 300 || sentences.length >= 5;
    });
    if (hasDenseLiveParagraph) {
      issues.push("live_mode_dense_paragraph");
    }
  }

  if (options.slateWidePropQuestion && /\bparlay\b/i.test(raw) && !/\b(same[- ]?game|SGP)\b/i.test(raw)) {
    const abbrPairMatches = raw.match(/\b[A-Z]{2,4}\s*[@v.\s]+\s*[A-Z]{2,4}\b/g) || [];
    if (abbrPairMatches.length < 2 && /\d\s*(?:leg|legs)\b/i.test(raw)) {
      issues.push("slate_wide_answer_may_be_single_game_parlay");
    }
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
    "robotic_projection_invalid_phrase",
    "status_language_player_unavailable_mismatch",
    "status_contradiction_probable_vs_out",
    "over_precise_decimal_stats",
    "report_style_header_echo",
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
  const voiceCleaned = sanitizeOverFormalOutput(text);
  const deterministicCleaned = applyDeterministicQaEnforcement(voiceCleaned, options);
  const bi = applyBetIntegrityPostProcess(deterministicCleaned, options);
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

/** Static fallback when Haiku fails or QA removes too many live follow-up suggestions. */
export const LIVE_FOLLOW_UP_FALLBACK = Object.freeze([
  "still like this line?",
  "good for second half?",
  "pair this with anything?",
]);

const FOLLOW_UP_GENERIC_PHRASES = /learn\s+more|get\s+more\s+analysis|see\s+insights/i;
const FOLLOW_UP_FORMAL_TERMS = /\b(analysis|insights|explore|recommendation|projection)\b/i;
const FOLLOW_UP_EMOJI = /\p{Extended_Pictographic}/u;

function followUpWordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Casual bettor-shaped question — rejects assistant-y openers and formal CTAs.
 * @param {string} s
 * @returns {boolean}
 */
function looksLikeBettorFollowUpQuestion(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (!/\?/.test(t)) return false;
  if (/^(would\s+you|could\s+you|can\s+you|do\s+you\s+want|tell\s+me|please)\b/i.test(t)) {
    return false;
  }
  return true;
}

/**
 * Validates and normalizes live-mode follow-up chips after Haiku generation.
 * @param {unknown} items
 * @returns {{ followUps: string[], usedFallback: boolean }}
 */
export function qaLiveFollowUps(items) {
  const fallback = [...LIVE_FOLLOW_UP_FALLBACK];
  if (!Array.isArray(items)) {
    return { followUps: fallback, usedFallback: true };
  }

  const seen = new Set();
  /** @type {string[]} */
  const valid = [];

  for (const item of items) {
    const raw = String(item ?? "").trim();
    if (!raw) continue;
    if (FOLLOW_UP_EMOJI.test(raw)) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    if (followUpWordCount(raw) > 7) continue;
    if (FOLLOW_UP_FORMAL_TERMS.test(raw)) continue;
    if (FOLLOW_UP_GENERIC_PHRASES.test(raw)) continue;
    if (!looksLikeBettorFollowUpQuestion(raw)) continue;
    seen.add(key);
    valid.push(raw);
    if (valid.length >= 3) break;
  }

  if (valid.length < 2) {
    return { followUps: fallback, usedFallback: true };
  }

  const out = [...valid];
  for (const f of LIVE_FOLLOW_UP_FALLBACK) {
    if (out.length >= 3) break;
    const fk = f.toLowerCase();
    if (!out.some((o) => o.toLowerCase() === fk)) out.push(f);
  }

  return { followUps: out.slice(0, 3), usedFallback: false };
}
