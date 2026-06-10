/**
 * Shared sport QA helpers and cross-sport deterministic rules.
 * @typedef {{ code: string, severity: 'critical' | 'warning', message: string, sentence: string, requiresRegeneration: boolean, confidenceDriverHints?: string[] }} SportQaIssue
 */

export function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Find first substring match span for sentence attribution (best-effort). */
export function findSentenceContaining(text, re) {
  const t = String(text || "");
  const m = re.exec(t);
  if (!m) return "";
  const idx = m.index;
  const before = t.slice(0, idx);
  const lastBreak = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"));
  const start = lastBreak >= 0 ? lastBreak + 1 : 0;
  let end = t.length;
  const after = t.slice(idx);
  const nextBreak = after.search(/[.!?](?=\s|$)/);
  if (nextBreak >= 0) end = idx + nextBreak + 1;
  return t.slice(start, end).trim().slice(0, 500);
}

const CROSS_SPORT_HYPE =
  /\b(?:\bthe\s+lock\b|\block\b|\bguaranteed\b|\bguarantee\b|\bautomatic\b|\bcan't\s+miss\b|\bcant\s+miss\b|\bfree\s+money\b|\bnearly\s+automatic\b|\bsafest\s+leg\b|\bmortal\s+lock\b)/i;

const PROPISH = /\b(?:prop|parlay|leg|slip|bet|pick|over|under|lean|fade)\b/i;

/** Strong supporting context when citing high win probabilities */
const PROB_SUPPORT =
  /\b(?:model|projection|injury|pace|usage|matchup|stats|average|sample|correlation|ev|closing\s+line|closing\s+total)\b/i;

const VOLATILE_MARKETS =
  /\b(?:home\s+run|HR\b|touchdown|TD\b|anytime\s+goal|goal\s+scorer|first\s+basket|outright|winner\b|fastest\s+lap)\b/i;

/** Non-betting uses of "lock" (lineup lock, rotation lock) — not overconfidence hype. */
const NON_HYPE_LOCK_RE = /\b(?:lineup|rotation|roster|scorer|minutes|starter)\s+lock\b/i;

/**
 * @param {string} sentence
 */
export function sentenceNegatesOverconfidenceHype(sentence) {
  const s = String(sentence || "");
  return (
    /\bnot\s+(?:a\s+)?guarantee\b/i.test(s) ||
    /\bno\s+guarantee\b/i.test(s) ||
    /\bnot\s+guaranteed\b/i.test(s) ||
    /\bnot\s+(?:a\s+)?lock\b/i.test(s) ||
    /\bno\s+lock\b/i.test(s) ||
    /\bnot\s+the\s+lock\b/i.test(s) ||
    /\bisn['']?t\s+(?:a\s+)?lock\b/i.test(s) ||
    /\bnot\s+(?:an\s+)?automatic\b/i.test(s) ||
    /\bnot\s+(?:a\s+)?(?:mortal\s+)?lock\b/i.test(s)
  );
}

/**
 * @param {string} sentence
 */
export function sentenceHasOverconfidenceHype(sentence) {
  const s = String(sentence || "").trim();
  if (!s || sentenceNegatesOverconfidenceHype(s)) return false;
  if (NON_HYPE_LOCK_RE.test(s)) return false;
  return CROSS_SPORT_HYPE.test(s);
}

/**
 * Cross-sport rules (layer 1–2). Critical only for misleading certainty / floor misuse.
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
export function lintCrossSportOutput(text) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const sentence of splitSentences(raw)) {
    if (!sentence.trim()) continue;
    if (sentenceNegatesOverconfidenceHype(sentence)) {
      continue;
    }

    if (sentenceHasOverconfidenceHype(sentence) && PROPISH.test(raw)) {
      issues.push({
        code: "cross_sport_overconfidence",
        severity: "critical",
        message: "Avoid lock/guarantee/automatic/safest-leg framing in betting copy.",
        sentence,
        requiresRegeneration: true,
      });
      break;
    }
  }

  const probHigh = /\b(?:7[1-9]|8\d|9\d|100)\s*%/g;
  let pm;
  while ((pm = probHigh.exec(raw))) {
    const slice = raw.slice(Math.max(0, pm.index - 120), pm.index + 40);
    if (!PROB_SUPPORT.test(slice)) {
      issues.push({
        code: "unsupported_high_probability",
        severity: "warning",
        message: "High stated win probability without nearby supporting analytical context.",
        sentence: findSentenceContaining(raw, /\b(?:7[1-9]|8\d|9\d|100)\s*%/),
        requiresRegeneration: false,
      });
      break;
    }
  }

  for (const sentence of splitSentences(raw)) {
    if (/\bfloor\b/i.test(sentence) && VOLATILE_MARKETS.test(sentence)) {
      issues.push({
        code: "volatile_market_floor_misuse",
        severity: "critical",
        message: '"Floor" language misapplied to a high-variance market.',
        sentence,
        requiresRegeneration: true,
      });
      break;
    }
  }

  return dedupeIssues(issues);
}

/**
 * Narrow sport_context_gap: prop numeric line without any usage/matchup role cue in same paragraph block.
 * @param {string} text
 */
export function lintGenericSportContextGap(text) {
  const issues = [];
  const raw = String(text || "");
  const ctxCue =
    /\b(?:usage|snap|minute|minutes|role|matchup|lineup|pace|defense|offense|injury|rotation|target|carry)\b/i;
  const blocks = raw.split(/\n\n+/);
  for (const block of blocks) {
    const len = block.trim().length;
    if (len < 90 || len > 360) continue;
    if (!PROPISH.test(block) || !/\b(?:over|under)\s+\d/i.test(block)) continue;
    if (ctxCue.test(block)) continue;
    const head = block.trim().slice(0, 500);
    issues.push({
      code: "sport_context_gap",
      severity: "warning",
      message: "Short prop blurbs should anchor role, usage, or matchup explicitly.",
      sentence: head,
      requiresRegeneration: false,
    });
    break;
  }
  return issues;
}

function dedupeIssues(arr) {
  const seen = new Set();
  const out = [];
  for (const i of arr) {
    const k = `${i.code}|${i.sentence.slice(0, 80)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}
