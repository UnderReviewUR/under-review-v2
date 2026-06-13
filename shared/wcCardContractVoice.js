/**
 * World Cup Card Contract Option 1 — arguing voice + complete-sentence card face.
 *
 * UI mapping:
 *   call  → HEADLINE
 *   line  → LINE (stat grid delta)
 *   whyNow → WHY
 *   edge  → WATCH FOR
 *   lean  → THE PLAY
 *   deep  → Full breakdown (tap)
 */

import {
  endsWithEllipsisTruncation,
  isWcCompleteSentence,
  wcWordCount,
} from "./wcSentenceBoundaries.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcValidPlayLine } from "./wcPlayLineQA.js";

/** @typedef {"HAS_EDGE"|"FAIR_PRICE"|"PASS"|"RULES"|"GENERAL"} WcCardVoiceVerdict} */

export const WC_CARD_CONTRACT_VOICE_PROMPT = `WC CARD CONTRACT Option 1 — ARGUING VOICE + COMPLETE SENTENCES (mandatory)

You are "the model that argues with the edge." Every take must argue where the market is wrong — or say honestly where it is NOT wrong (Pass / fair price). Never just announce what the board already thinks.

CARD FACE vs BREAKDOWN:
- summary + deep are split. Card face shows complete sentences only — never mid-sentence cuts.
- deep holds the full breakdown (extra evidence, list rows, bracket notes). User taps "Full breakdown" for depth.

FIELD SHAPE (server maps summary/deep into the card — write so each slot is distinct):

1) HEADLINE (summary sentence 1 → call)
   - Argue a thesis in ≤18 words as one complete sentence.
   - BAD: "Mbappé at +600 is the consensus Golden Boot favorite." (announcement)
   - GOOD: "Market has the name — France's path is what they underprice."

2) LINE (summary sentence 2 → line field — NOT the headline)
   - Hold the numbers in a separate complete sentence: "Market +600 · UR path ~+318." or "Sims 45% win · 83% QF = most games."
   - Cite sim vs market in plain language — no [UR model · Poisson/Elo · …] bracket on the card face unless the user asks how the model works.
   - Never repeat sentence 1 verbatim.

3) WHY (deep sentences 1–2 → whyNow)
   - Evidence: sims, group path, role, games played. Complete sentences with concrete numbers when in VERIFIED CONTEXT.

4) WATCH FOR (deep last sentence OR dedicated risk line → edge)
   - What breaks the edge: lineups, bracket, injury, shorter run, stale odds. One complete sentence.
   - Must NOT repeat WHY (whyNow) or restate the thesis — new live trigger only.

5) THE PLAY (explicit decision in summary or deep → lean)
   - Format: "Pass at +600 — fair favorite." OR "Lean Spain goals volume — structural, not a single prop yet."
   - MATCHUP / "who wins": if ML is fair, Pass on ML but name an alternate market (both teams advance, O/U, BTTS, DNB) — never Pass-only with no bet type.
   - BAD: repeating HEADLINE or LINE.
   - THE PLAY is bet / pass / lean with one reason — not a summary.

TOP 5 GOALSCORERS LIST:
- HEADLINE = one arguing/list lead sentence on the card.
- Put the numbered top-5 list in deep only. Card shows "Top 5 — tap to view" for THE PLAY slot.

ANTI-PATTERNS (instant fail):
- Same sentence for headline and play decision.
- Headline that only states consensus price with no argument.
- Missing WATCH FOR on betting takes.
- Any card-face field ending mid-sentence or with "…" truncation.
- "Try a team angle" energy — answer the question asked.

VERDICT FORK (follow-ups are UI-routed):
- Real edge → argue misprice with cited odds/sims; confidence Medium+ only with evidence.
- Fair ML on a matchup → Pass on the moneyline but recommend an alternate market (both teams advance, totals, BTTS) with reasoning; still argue WHY the ML is fair.
- Rules → factual only; no betting lead.
- Push-back → agree in first person when they're right ("Fair push — …" / "You know what, great point here — …"); restate the same play if thesis unchanged; never "user makes a good point."`;

export const WC_CARD_CONTRACT_TIER25_APPENDIX = `CARD CONTRACT Option 1 — summary + deep split (mandatory):
- CARD FACE = scannable in 5 seconds: THE PLAY verdict first, ≤1 short WHY line, ≤1 WATCH FOR line. Total card face ≤70 words.
- summary sentence 1 = THE PLAY ("Pass at…", "Lean over 3 at -135", etc.) — not a thesis paragraph.
- summary sentence 2 = one LINE / DELTA sentence only when odds or sims exist.
- whyNow = ≤2 short sentences of evidence (never the full essay).
- edge = one WATCH FOR sentence only.
- deep = full breakdown (extra evidence, script, ladder detail) — user taps "Full breakdown"; keep deep ≤220 words.
- Card face WHY or LINE must include one number (odds, implied %, or sim %) — never lean-only.
- Never put sim paragraphs, role essays, or multi-leg scripts on the card face.
- Every card-face sentence must end with . ! or ? — never trail off mid-thought.`;

/** @param {string} a @param {string} b */
function normLine(a, b) {
  return String(a || b || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {string} text
 */
export function wcCardPlayRestatesCall(lean, call) {
  const l = normLine(lean);
  const c = normLine(call);
  if (!l || !c) return false;
  const stripped = l.replace(/^lean:\s*/i, "").replace(/^pass\s*—\s*/i, "").trim();
  if (stripped === c) return true;
  if (c.length >= 24 && stripped.includes(c)) return true;
  if (stripped.length >= 24 && c.includes(stripped)) return true;
  const cWords = c.split(/\s+/).filter(Boolean);
  if (cWords.length < 4) return false;
  const overlap = cWords.filter((w) => stripped.split(/\s+/).includes(w)).length;
  return overlap / cWords.length >= 0.85;
}

const ANNOUNCE_ONLY_RE =
  /\b(is the consensus|consensus favorite|projects the most goals|is the favorite at|leads the market|top scorer favorite)\b/i;

const ARGUE_MARKERS_RE =
  /\b(mispriced|underpric|overpric|market has|books treat|sims say|sims make|path|volume|pass at|no edge|fair price|fair favorite|not mispriced|wrong|delta|structural|lean:|pass —|no play)\b/i;

/**
 * @param {string} call
 */
export function wcCardHeadlineAnnouncesOnly(call) {
  const t = String(call || "").trim();
  if (!t || t.length < 12) return false;
  if (ARGUE_MARKERS_RE.test(t)) return false;
  return ANNOUNCE_ONLY_RE.test(t) || / at \+\d{3,}\b/.test(t) && !ARGUE_MARKERS_RE.test(t);
}

/**
 * @param {string} text
 */
export function wcCardHasDeltaSignal(text) {
  const t = String(text || "");
  return (
    /\bmarket\s*[+·\-]|ur\s*[+~]|sims?\s+\d|%\s*(win|qf|rate)|·|~\s*\+/i.test(t) ||
    /\bpass at\b/i.test(t) ||
    /\bfair (price|favorite|marker)\b/i.test(t)
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {{ callType?: string, wcIntent?: string }} [opts]
 */
export function scoreWcCardSentenceCompleteness(structured, opts = {}) {
  const callType = String(structured?.callType || opts.callType || "").toLowerCase();
  if (callType === "rules") return { passed: true, issues: [] };

  const wcIntent = String(opts.wcIntent || "");
  const isList = wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST || callType === "goalscorers_list";
  const isRoundup =
    wcIntent === WC_INTENT.PREDICTIONS_ROUNDUP || callType === "predictions_roundup";
  const call = String(structured?.call || "").trim();
  const line = String(structured?.line || "").trim();
  const lean = String(structured?.lean || "").trim();
  const edge = String(structured?.edge || "").trim();
  const whyNow = String(structured?.whyNow || "").trim();

  /** @type {string[]} */
  const issues = [];

  const check = (field, val, required, listStub = false) => {
    if (!val) {
      if (required) issues.push(`wc_card_incomplete_${field}`);
      return;
    }
    if (endsWithEllipsisTruncation(val)) issues.push(`wc_card_truncated_${field}`);
    if (!isWcCompleteSentence(val, { allowListStub: listStub })) {
      issues.push(`wc_card_incomplete_${field}`);
    }
  };

  if (isRoundup) {
    check("call", call, true);
    check("edge", edge, true);
    check("lean", lean, true);
    return { passed: issues.length === 0, issues };
  }

  check("call", call, true);
  check("line", line, false);
  check("why_now", whyNow, true);
  check("edge", edge, true);
  check("lean", lean, true, isList);

  if (call && wcWordCount(call) > 18) issues.push("headline_over_18_words");

  return { passed: issues.length === 0, issues };
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {{ callType?: string, wcIntent?: string }} [opts]
 */
export function scoreWcCardContractVoice(structured, opts = {}) {
  const callType = String(structured?.callType || opts.callType || "").toLowerCase();
  const wcIntent = String(opts.wcIntent || "");
  const isRoundup =
    callType === "predictions_roundup" || wcIntent === WC_INTENT.PREDICTIONS_ROUNDUP;
  const call = String(structured?.call || "").trim();
  const line = String(structured?.line || "").trim();
  const lean = String(structured?.lean || "").trim();
  const edge = String(structured?.edge || "").trim();
  const whyNow = String(structured?.whyNow || "").trim();
  const combined = [call, line, whyNow, lean].filter(Boolean).join(" ");

  /** @type {string[]} */
  const issues = [];

  if (callType === "rules") {
    return { passed: true, issues: [] };
  }

  if (!edge || edge.length < 12) {
    issues.push("wc_card_missing_watch_for");
  }
  if (lean && call && wcCardPlayRestatesCall(lean, call)) {
    issues.push("wc_card_play_restates_call");
  }
  if (lean && !isWcValidPlayLine(lean)) {
    issues.push("wc_play_line_invalid");
  }
  if (!isRoundup && call && wcCardHeadlineAnnouncesOnly(call)) {
    issues.push("wc_card_headline_announces");
  }
  if (!isRoundup && call && !wcCardHasDeltaSignal(combined) && !/\bpass\b/i.test(lean)) {
    issues.push("wc_card_missing_delta");
  }

  const sentenceOpts = isRoundup
    ? { ...opts, callType: "predictions_roundup" }
    : opts;
  const sentences = scoreWcCardSentenceCompleteness(structured, sentenceOpts);
  issues.push(...sentences.issues);

  return { passed: issues.length === 0, issues };
}

export const WC_CARD_VOICE_QA_SUFFIX = `

WC CARD CONTRACT Option 1 QA (mandatory — prior answer failed voice or sentence shape):
- HEADLINE must argue in one complete sentence (≤18 words) — never only "X at +600 is the favorite."
- LINE must be summary sentence 2 with delta numbers — complete sentence, distinct from headline.
- THE PLAY must be a decision (Pass / Lean / No play) — NOT a copy of the headline. Must name a player, nation, or +odds — never fragments like "Lean: that actually holds."
- WATCH FOR must state what breaks the edge — one complete sentence.
- No card-face field may end mid-sentence or with "…" truncation.
- Re-read WC CARD CONTRACT Option 1 rules in the system prompt before answering.`;
