import { splitSentences } from "./_shared.js";

const OUTRIGHT = /\b(?:outright|winner|to\s+win\s+the\s+tournament|lift\s+the\s+trophy)\b/i;
const OUT_HYPE = /\b(?:safe|floor|likely|high[-\s]?confidence|lock|automatic|guaranteed)\b/i;

/** Skip inflation flag when hype words appear only in negated framing (e.g. "not safe"). */
function outrightHypeNegated(sentence) {
  return (
    /\bnot\s+safe\b/i.test(sentence) ||
    /\b(?:isn't|ain't|never)\s+safe\b/i.test(sentence) ||
    /\bnot\s+(?:a\s+)?(?:lock|guarantee)\b/i.test(sentence) ||
    /\bno\s+(?:real\s+)?safe\b/i.test(sentence) ||
    /\bhardly\s+(?:a\s+)?(?:safe|lock)\b/i.test(sentence)
  );
}

const PLACE = /\b(?:top\s*5|top\s*10|top\s*20|placement|finish)\b/i;
const FORM_CTX =
  /\b(?:form|recent|strokes\s+gained|SG|course|fit|history|stats|OWGR|driving|putting)\b/i;

const MATCHUP = /\b(?:matchup|head[-\s]?to[-\s]?head|vs\.|versus)\b/i;

/**
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
/** @param {object} [_options] — forwarded from `runSportSpecificValidators` (e.g. `sportEvidenceLayer`) */
export function lintGolfOutput(text, _options = {}) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const s of splitSentences(raw)) {
    if (OUTRIGHT.test(s) && OUT_HYPE.test(s) && !outrightHypeNegated(s)) {
      issues.push({
        code: "golf_outright_probability_inflation",
        severity: "critical",
        message: "Outright markets are thin/longshot-heavy; avoid safe/floor/high-confidence framing.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  if (PLACE.test(raw) && /\b(?:bet|play|lean|over|under)\b/i.test(raw) && !FORM_CTX.test(raw)) {
    issues.push({
      code: "golf_placement_context_gap",
      severity: "warning",
      message: "Placement markets need form or course-fit (or stats) anchoring.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  if (MATCHUP.test(raw) && !FORM_CTX.test(raw)) {
    issues.push({
      code: "golf_matchup_context_gap",
      severity: "warning",
      message: "Matchup bets benefit from recent form or course-fit reasoning.",
      sentence: findFirstSentence(raw, MATCHUP),
      requiresRegeneration: false,
    });
  }

  return issues;
}

function findFirstSentence(text, re) {
  for (const s of splitSentences(text)) {
    if (re.test(s)) return s;
  }
  return text.slice(0, 400);
}
