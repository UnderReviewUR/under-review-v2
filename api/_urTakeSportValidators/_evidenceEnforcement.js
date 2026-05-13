/**
 * Post-generation enforcement aligned with VERIFIED_SNAPSHOT / BASELINE / CLAIM_FLAGS
 * from `buildSportEvidenceLayer` — complements prompt injection; does not replace sport-specific validators.
 * @typedef {import("./_shared.js").SportQaIssue} SportQaIssue
 */

import { findSentenceContaining } from "./_shared.js";

/**
 * @param {object|null|undefined} layer
 * @returns {boolean}
 */
export function sportEvidenceLayerIsThin(layer) {
  if (!layer || typeof layer !== "object") return false;
  const v = Array.isArray(layer.verifiedSnapshot) ? layer.verifiedSnapshot.length : 0;
  const b = Array.isArray(layer.baselineFacts) ? layer.baselineFacts.length : 0;
  const lim = Array.isArray(layer.dataLimitations) ? layer.dataLimitations : [];
  if (v + b < 2) return true;
  if (lim.some((s) => String(s).includes("Thin deterministic snapshot"))) return true;
  return false;
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
function outputClaimsHighConfidenceTier(raw) {
  const t = String(raw || "");
  return (
    /\bHigh\s+confidence\b/i.test(t) ||
    /\bCONFIDENCE\s*:\s*\*?\*?High\b/i.test(t) ||
    /\*\*CONFIDENCE\*\*\s*:\s*High\b/i.test(t) ||
    /["']confidence["']\s*:\s*["']High["']/i.test(t) ||
    /\bconfidence\s+tier\s*:\s*High\b/i.test(t)
  );
}

/**
 * @typedef {import("../_urTakeSportEvidence.js").UnsupportedClaimFlags} UnsupportedClaimFlags
 */

/** When lineMovementEvidence is false — any hit is critical + regenerate. */
const LINE_MOVEMENT_UNSUPPORTED_RES = [
  /\bsharp\s+money\b/i,
  /\bsharp\s+action(?:\s+expects?)?\b/i,
  /\bsteam(?:ed|ing|s)?\b/i,
  /\bline\s+steam(?:ed|ing|s)?\b/i,
  /\breverse\s+line\s+movement\b/i,
  /\bRLM\b/i,
  /\bsyndicate\b/i,
  /\bmarket\s+(?:move|moved|moves|leaning|support)\b/i,
  /\bbooks\s+adjusting\b/i,
  /\bearly\s+action\b/i,
  /\bpressure\s+on\s+the\s+number\b/i,
  /\bnumber\s+is\s+getting\s+away\b/i,
  /\bthe\s+number\s+is\s+getting\s+away\b/i,
  /\bconsensus\s+is\b/i,
];

function normalizeEvidenceSport(sport) {
  const x = String(sport || "")
    .trim()
    .toLowerCase();
  if (x === "tennis_wta_profile") return "tennis";
  return x || "generic";
}

/**
 * @param {string} raw
 * @param {UnsupportedClaimFlags} flags
 * @returns {SportQaIssue[]}
 */
function lintUnsupportedLineMovementClaims(raw, flags) {
  const issues = [];
  if (flags.lineMovementEvidence !== false) return issues;
  for (const re of LINE_MOVEMENT_UNSUPPORTED_RES) {
    if (re.test(raw)) {
      issues.push({
        code: "unsupported_line_movement_claim",
        severity: "critical",
        message: "Market-movement / sharp-side narrative without line-movement evidence feed.",
        sentence: findSentenceContaining(raw, re) || raw.slice(0, 400),
        requiresRegeneration: true,
      });
      break;
    }
  }
  return issues;
}

/**
 * Highly specific matchup claims when matchupStatsEvidence is false.
 * @param {string} text
 * @param {UnsupportedClaimFlags} flags
 * @param {string} sportNorm
 * @returns {SportQaIssue[]}
 */
export function lintUnsupportedMatchupSpecificity(text, flags, sportNorm) {
  const issues = [];
  if (!flags || flags.matchupStatsEvidence !== false) return issues;
  const raw = String(text || "").trim();
  if (!raw) return issues;
  const sn = sportNorm;

  const criticalRules = [
    {
      sports: ["nba"],
      re: /\bdefense(?:'s|es)?\s+struggles\s+with\s+(?:isolation|pick[-\s]?and[-\s]?roll|perimeter(?:\s+scorers?)?)\b/i,
      msg: "Defensive matchup specificity without verified matchup JSON.",
    },
    {
      sports: ["mlb"],
      re: /\b(?:pitcher\s+is\s+)?vulnerable\s+to\s+(?:left|right)(?:[-\s]hand(?:ed)?|\s+bat)\b/i,
      msg: "Platoon / handedness vulnerability claim without split payload.",
    },
    {
      sports: ["mlb"],
      re: /\b(?:left|right)(?:[-\s]hand(?:ed)?)?\s+bats?\s+(?:feast|crush|tag)\s+on\b/i,
      msg: "Handedness exploit claim without verified split data.",
    },
    {
      sports: ["nfl"],
      re: /\b(?:coverage\s+scheme|target\s+funnel|red[-\s]?zone\s+usage)\b/i,
      msg: "Scheme / usage funnel claim without usage/defensive JSON anchors.",
    },
  ];

  for (const rule of criticalRules) {
    if (!rule.sports.includes(sn)) continue;
    if (rule.re.test(raw)) {
      issues.push({
        code: "unsupported_matchup_specificity",
        severity: "critical",
        message: rule.msg,
        sentence: findSentenceContaining(raw, rule.re) || raw.slice(0, 450),
        requiresRegeneration: true,
      });
      return issues;
    }
  }

  return issues;
}

const HEDGE_RE =
  /\b(typically|historically|tends\s+to|has\s+struggled\s+with|vulnerable\s+to|favors|profiles\s+well)\b/i;
const MATCHUP_TAIL_RE =
  /\b(isolation|pick[-\s]?and[-\s]?roll|perimeter|left[-\s]?handed|right[-\s]?handed|\bLHB\b|\bRHB\b|course\s+fit|surface\s+edge|surface\s+dominance|tire\s+degradation|long[\s-]?run\s+pace|coverage\s+scheme|target\s+funnel|red[-\s]?zone\s+usage|matchup\s+split)\b/i;

/**
 * Hedge framing + matchup tail within a short window — warning + confidence cap (no regen).
 * @param {string} text
 * @param {UnsupportedClaimFlags} flags
 * @returns {SportQaIssue[]}
 */
export function lintSoftHedgeUnsupportedMatchup(text, flags) {
  if (!flags || flags.matchupStatsEvidence !== false) return [];
  const raw = String(text || "").trim();
  if (!raw || !HEDGE_RE.test(raw) || !MATCHUP_TAIL_RE.test(raw)) return [];
  for (let i = 0; i < raw.length; i += 12) {
    const w = raw.slice(i, Math.min(raw.length, i + 260));
    if (HEDGE_RE.test(w) && MATCHUP_TAIL_RE.test(w)) {
      return [
        {
          code: "unsupported_matchup_specificity_soft",
          severity: "warning",
          message: "Hedge language near matchup-specific claim without verified matchupStatsEvidence.",
          sentence: w.trim().slice(0, 500),
          requiresRegeneration: false,
          confidenceDriverHints: [
            "Limited matchup evidence — role-based read, not verified matchup split.",
            "No verified movement data in UnderReview payload for this take.",
          ],
        },
      ];
    }
  }
  return [];
}

/**
 * Deterministic claim caps from evidence flags.
 * @param {string} text
 * @param {UnsupportedClaimFlags} flags
 * @returns {SportQaIssue[]}
 */
export function lintSportEvidenceClaimViolations(text, flags) {
  const issues = [];
  const raw = String(text || "").trim();
  if (!raw || !flags || typeof flags !== "object") return issues;

  issues.push(...lintUnsupportedLineMovementClaims(raw, flags));

  if (
    flags.weatherEvidence === false &&
    /\b(\d{1,3}\s*mph\s*wind|sustained\s+winds?|gust(ing)?\s+to\s+\d|precipitation\s+chance|weather\s+delay|crosswind\s+at)\b/i.test(
      raw,
    )
  ) {
    issues.push({
      code: "unsupported_weather_claim",
      severity: "critical",
      message: "Specific weather claim without verified weather payload.",
      sentence: findSentenceContaining(
        raw,
        /\b(\d{1,3}\s*mph\s*wind|sustained\s+winds?|gust(ing)?\s+to\s+\d|precipitation\s+chance|weather\s+delay|crosswind\s+at)\b/i,
      ),
      requiresRegeneration: true,
    });
  }

  if (
    flags.injuryEvidence === false &&
    /\b(ruled\s+out\s+for\s+tonight|confirmed\s+out|DNP\s*[-–]\s*rest|will\s+not\s+play\s+tonight|definitely\s+inactive\s+tonight)\b/i.test(
      raw,
    )
  ) {
    issues.push({
      code: "unsupported_injury_certainty",
      severity: "critical",
      message: "Definitive injury / inactive claim without injury evidence in payload.",
      sentence: findSentenceContaining(
        raw,
        /\b(ruled\s+out\s+for\s+tonight|confirmed\s+out|DNP\s*[-–]\s*rest|will\s+not\s+play\s+tonight|definitely\s+inactive\s+tonight)\b/i,
      ),
      requiresRegeneration: true,
    });
  }

  if (
    flags.matchupStatsEvidence === false &&
    /\b(defensive\s+scheme|coverage\s+skeleton|game\s*plan\s+is|coordinator\s+wants|cover\s+[01234]\b.*\b(shell|robber))\b/i.test(
      raw,
    )
  ) {
    issues.push({
      code: "unsupported_scheme_claim",
      severity: "critical",
      message: "Scheme / matchup-stat specificity without grounded matchup evidence.",
      sentence: findSentenceContaining(
        raw,
        /\b(defensive\s+scheme|coverage\s+skeleton|game\s*plan\s+is|coordinator\s+wants|cover\s+[01234]\b.*\b(shell|robber))\b/i,
      ),
      requiresRegeneration: true,
    });
  }

  if (
    flags.courseEvidence === false &&
    /\b(course\s+history|horse\s+for\s+this\s+course|traditionally\s+owns\s+this\s+track|course\s+fit\s+(?:favors|leans|points\s+to)[\s\S]{0,120}\b(approach|putting|driving|off\s*the\s*tee|around\s*the\s*green)\b)/i.test(
      raw,
    )
  ) {
    issues.push({
      code: "unsupported_course_fit_claim",
      severity: "critical",
      message: "Course-fit / course-history claim without course evidence object.",
      sentence: findSentenceContaining(
        raw,
        /\b(course\s+history|horse\s+for\s+this\s+course|traditionally\s+owns\s+this\s+track|course\s+fit\s+(?:favors|leans|points\s+to)[\s\S]{0,120}\b(approach|putting|driving|off\s*the\s*tee|around\s*the\s*green)\b)/i,
      ),
      requiresRegeneration: true,
    });
  }

  if (
    flags.surfaceEvidence === false &&
    /\b(clay\s+court\s+dominance|grass\s+specialist|hard\s+court\s+king|surface\s+edge|surface\s+dominance)\b/i.test(
      raw,
    )
  ) {
    issues.push({
      code: "unsupported_surface_dominance_claim",
      severity: "critical",
      message: "Surface dominance framing without surface evidence flag.",
      sentence: findSentenceContaining(
        raw,
        /\b(clay\s+court\s+dominance|grass\s+specialist|hard\s+court\s+king|surface\s+edge|surface\s+dominance)\b/i,
      ),
      requiresRegeneration: true,
    });
  }

  if (
    flags.sessionDataEvidence === false &&
    /\b(long[\s-]?run\s+pace|tire\s+degradation|sector\s+\d\s+time|undercut\s+window\s+in\s+(FP|Q)|(?:long[\s-]?run\s+pace|tire\s+degradation)\s+(?:advantage|edge))\b/i.test(
      raw,
    )
  ) {
    issues.push({
      code: "unsupported_f1_session_claim",
      severity: "critical",
      message: "Session / pace / tire specifics without session data evidence.",
      sentence: findSentenceContaining(
        raw,
        /\b(long[\s-]?run\s+pace|tire\s+degradation|sector\s+\d\s+time|undercut\s+window\s+in\s+(FP|Q)|(?:long[\s-]?run\s+pace|tire\s+degradation)\s+(?:advantage|edge))\b/i,
      ),
      requiresRegeneration: true,
    });
  }

  return issues;
}

/**
 * @param {string} text
 * @param {import("../_urTakeSportEvidence.js").SportEvidenceLayer|null|undefined} layer
 * @returns {SportQaIssue[]}
 */
export function lintSportEvidenceThinConfidenceCap(text, layer) {
  const raw = String(text || "").trim();
  if (!raw || !sportEvidenceLayerIsThin(layer)) return [];
  if (!outputClaimsHighConfidenceTier(raw)) return [];
  return [
    {
      code: "evidence_thin_high_confidence_cap",
      severity: "critical",
      message:
        "VERIFIED_SNAPSHOT / BASELINE are thin for this route — user-facing confidence must not read as High.",
      sentence: findSentenceContaining(raw, /\bHigh\s+confidence\b|\bCONFIDENCE\s*:\s*High\b/i) || raw.slice(0, 400),
      requiresRegeneration: true,
    },
  ];
}

/**
 * @param {string} text
 * @param {object} [options]
 * @param {import("../_urTakeSportEvidence.js").SportEvidenceLayer|null|undefined} [options.sportEvidenceLayer]
 * @param {UnsupportedClaimFlags|null|undefined} [options.unsupportedClaimFlags]
 * @param {string} [options.sport]
 * @returns {SportQaIssue[]}
 */
export function lintSportEvidenceEnforcement(text, options = {}) {
  const layer = options.sportEvidenceLayer;
  const flags = layer?.unsupportedClaimFlags ?? options.unsupportedClaimFlags;
  const sportNorm = normalizeEvidenceSport(options.sport);
  /** @type {SportQaIssue[]} */
  const out = [];
  if (flags && typeof flags === "object") {
    out.push(...lintSportEvidenceClaimViolations(text, flags));
    const critSpec = lintUnsupportedMatchupSpecificity(text, flags, sportNorm);
    out.push(...critSpec);
    if (!critSpec.some((i) => i.code === "unsupported_matchup_specificity")) {
      out.push(...lintSoftHedgeUnsupportedMatchup(text, flags));
    }
  }
  if (layer && typeof layer === "object") {
    out.push(...lintSportEvidenceThinConfidenceCap(text, layer));
  }
  return out;
}
