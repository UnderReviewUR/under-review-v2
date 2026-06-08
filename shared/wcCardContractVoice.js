/**
 * World Cup Card Contract v1 — arguing voice (canonical shape for all WC intents).
 *
 * UI mapping:
 *   call  → HEADLINE + LINE (stat grid)
 *   whyNow → WHY
 *   edge  → WATCH FOR
 *   lean  → THE PLAY (decision: bet / pass / lean — never a summary restatement)
 */

/** @typedef {"HAS_EDGE"|"FAIR_PRICE"|"PASS"|"RULES"|"GENERAL"} WcCardVoiceVerdict} */

export const WC_CARD_CONTRACT_VOICE_PROMPT = `WC CARD CONTRACT v1 — ARGUING VOICE (mandatory for every World Cup take)

You are "the model that argues with the edge." Every take must argue where the market is wrong — or say honestly where it is NOT wrong (Pass / fair price). Never just announce what the board already thinks.

FIELD SHAPE (server maps summary/deep into the card — write so each slot is distinct):

1) HEADLINE (summary sentence 1 → call/headline)
   - Argue a thesis in ≤12 words when possible: where books/sim/path disagree with the crowd.
   - BAD: "Mbappé at +600 is the consensus Golden Boot favorite." (announcement)
   - GOOD: "Market has the name — France's path is what they underprice."
   - GOOD: "Books price Spain to win; sims price Spain for volume."

2) LINE / DELTA (summary sentence 2 → folds into call or whyNow)
   - Hold the numbers: "Market +600 · UR path ~+318" or "Sims 45% win · 83% QF = most games."
   - Never repeat sentence 1 verbatim.

3) WHY (deep sentences 1–2 → whyNow)
   - Evidence: sims, group path, role, games played. Concrete numbers when in VERIFIED CONTEXT.

4) WATCH FOR (deep last sentence OR dedicated risk line → edge)
   - What breaks the edge: lineups, bracket, injury, shorter run, stale odds.
   - Required for every non-rules betting take.

5) THE PLAY (you must make this a decision in summary or deep — server extracts lean)
   - Format: "Pass at +600 — fair favorite." OR "Lean Spain goals volume — structural, not a single prop yet."
   - BAD: repeating HEADLINE or LINE.
   - THE PLAY is bet / pass / lean with one reason — not a summary.

ANTI-PATTERNS (instant fail):
- Same sentence for headline and play decision.
- Headline that only states consensus price with no argument.
- Missing WATCH FOR on betting takes.
- "Try a team angle" energy in the take itself — answer the question asked.

VERDICT FORK (follow-ups are UI-routed — write the take to match):
- Real edge → argue misprice with cited odds/sims; confidence Medium+ only with evidence.
- Fair / no edge → say Pass or fair price clearly; still argue WHY the market is right.
- Rules → factual only; no betting lead.`;

export const WC_CARD_CONTRACT_TIER25_APPENDIX = `CARD CONTRACT — summary + deep split (mandatory):
- summary sentence 1 = arguing HEADLINE (thesis, not announcement).
- summary sentence 2 = DELTA (market vs UR, or Pass/fair-price verdict with number).
- deep = WHY (support) then WATCH FOR (what breaks it). End deep with the risk line.
- Include an explicit PLAY decision somewhere ("Pass at…", "Lean…", "No play —") distinct from sentence 1.`;

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
export function scoreWcCardContractVoice(structured, opts = {}) {
  const callType = String(structured?.callType || opts.callType || "").toLowerCase();
  const call = String(structured?.call || "").trim();
  const lean = String(structured?.lean || "").trim();
  const edge = String(structured?.edge || "").trim();
  const whyNow = String(structured?.whyNow || "").trim();
  const combined = [call, whyNow, lean].filter(Boolean).join(" ");

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
  if (call && wcCardHeadlineAnnouncesOnly(call)) {
    issues.push("wc_card_headline_announces");
  }
  if (call && !wcCardHasDeltaSignal(combined) && !/\bpass\b/i.test(lean)) {
    issues.push("wc_card_missing_delta");
  }

  return { passed: issues.length === 0, issues };
}

export const WC_CARD_VOICE_QA_SUFFIX = `

WC CARD CONTRACT v1 QA (mandatory — prior answer failed arguing voice):
- HEADLINE must argue (where market is wrong OR why Pass/fair is correct) — never only "X at +600 is the favorite."
- LINE must hold the delta: Market +XXX · UR ~+YYY OR sims % vs market framing.
- THE PLAY must be a decision (Pass / Lean / No play) — NOT a copy of the headline.
- WATCH FOR must state what breaks the edge (lineups, path, injury, bracket).
- Re-read WC CARD CONTRACT v1 rules in the system prompt before answering.`;
