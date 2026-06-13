/**
 * World Cup take retention QA — sim attribution, dedup, comparative proof.
 */

import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { splitWcSentences } from "./wcSentenceBoundaries.js";

/** @param {string} a @param {string} b @returns {number} 0–1 overlap score */
export function wcSentenceSimilarity(a, b) {
  const na = String(a || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const nb = String(b || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const aWords = na.split(/\s+/).filter(Boolean);
  const bWords = nb.split(/\s+/).filter(Boolean);
  if (!aWords.length || !bWords.length) return 0;
  const overlap = aWords.filter((w) => bWords.includes(w)).length;
  return overlap / Math.max(aWords.length, bWords.length);
}

/**
 * @param {number | null | undefined} lastUpdatedMs
 * @param {number} [nowMs]
 */
const WC_MODEL_ATTRIBUTION_BRACKET_RE =
  /^\[(UR model\s*·\s*10k Poisson\/Elo\s*·\s*[^\]]+)\]\s*/i;

/**
 * Split leading "[UR model · 10k Poisson/Elo · …]" from card WHY prose.
 * @param {string} text
 * @returns {{ body: string, attribution: string | null }}
 */
export function extractWcModelAttributionPrefix(text) {
  const t = String(text || "").trim();
  const m = t.match(WC_MODEL_ATTRIBUTION_BRACKET_RE);
  if (!m) return { body: t, attribution: null };
  return {
    attribution: String(m[1] || "").trim(),
    body: t.slice(m[0].length).trim(),
  };
}

/** @param {string} text */
export function stripWcModelAttributionPrefix(text) {
  return extractWcModelAttributionPrefix(text).body;
}

export function buildWcSimAttributionLabel(lastUpdatedMs, nowMs = Date.now()) {
  const d = Number(lastUpdatedMs);
  const dateStr =
    Number.isFinite(d) && d > 0
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : new Date(nowMs).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
  return `[UR model · 10k Poisson/Elo · ${dateStr}]`;
}

/**
 * @param {string} body
 * @param {Record<string, unknown> | null | undefined} [structured]
 */
export function responseCitesWcSimPercentages(body, structured) {
  const blob = [
    body,
    structured?.line,
    structured?.whyNow,
    structured?.deep,
  ]
    .filter(Boolean)
    .join("\n");
  const hasPct = /\d+\.?\d*\s*%/.test(blob);
  const hasSimCue =
    /\b(sims?|simulation|monte carlo|poisson|elo|advancepct|groupwinpct|r16pct)\b/i.test(
      blob,
    ) ||
    /\b\d+\.?\d*\s*%\s*(?:advance|group win|r16|qf|sf|final|win|reach)\b/i.test(blob);
  return hasPct && hasSimCue;
}

/**
 * @param {string} body
 * @param {Record<string, unknown> | null | undefined} [structured]
 */
export function detectMissingWcSimAttribution(body, structured) {
  if (!responseCitesWcSimPercentages(body, structured)) return false;
  if (structured?.modelAttribution && String(structured.modelAttribution).trim()) return false;
  const blob = [
    body,
    structured?.line,
    structured?.whyNow,
    structured?.call,
    structured?.modelAttribution,
  ]
    .filter(Boolean)
    .join("\n");
  if (/\[UR model\s*·\s*10k/i.test(blob)) return false;
  if (/\bUR sims?\b/i.test(blob)) return false;
  if (/\bUR\b[^.\n]{0,48}\bsims?\b/i.test(blob)) return false;
  return true;
}

const WC_THIN_ROSTER_WHY_RE = /^group\s+[a-l]\s+is\s+four\s+teams:/i;

/**
 * WHY is roster trivia without sim delta or honest data-gap language.
 * @param {string} whyNow
 */
export function isWcThinRosterOnlyWhy(whyNow) {
  const w = String(whyNow || "").trim();
  if (!w) return false;
  if (/\d+\.?\d*\s*%/.test(w) && /\b(vs market|sim|delta|mispric|overpric|underpric)\b/i.test(w)) {
    return false;
  }
  if (
    /\b(cannot quantify|not in context|can't prove|no live|missing.*odds|needs fresh lines)\b/i.test(
      w,
    )
  ) {
    return false;
  }
  return WC_THIN_ROSTER_WHY_RE.test(w) || (/Group\s+[A-L]\s+is\s+four\s+teams/i.test(w) && !/\d+\.?\d*\s*%/.test(w));
}

/** @param {string} question */
export function isWcRunnerUpValueFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (/\bwhich\s+group\b/i.test(q) && /\brunner[- ]?up\b/i.test(q)) return true;
  return (
    /\b(runner[- ]?up|second\s+(?:most\s+)?mispric|#2)\b/i.test(q) &&
    /\b(group|value)\b/i.test(q)
  );
}

const WC_RUNNER_UP_GROUP_PATTERNS = [
  /Runner-up\s+gap:\s*Group\s+([A-L])\b/i,
  /;\s*Group\s+([A-L])\s+runner[- ]?up\b/i,
  /\brunner[- ]?up\s+Group\s+([A-L])\b/i,
  /\bGroup\s+([A-L])\s+runner[- ]?up\b/i,
  /\bRunner-up\s+Group\s+([A-L])\b/i,
  /#\s*2\s+Group\s+([A-L])\b/i,
  /\bsecond[\s-]+Group\s+([A-L])\b/i,
  /\bwhich\s+group\b[\s\S]{0,32}\bGroup\s+([A-L])\b/i,
];

/**
 * @param {string} blob
 * @returns {string | null}
 */
export function parseWcRunnerUpGroupLetter(blob) {
  const text = String(blob || "").trim();
  if (!text) return null;
  for (const re of WC_RUNNER_UP_GROUP_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) return String(m[1]).toUpperCase();
  }
  return null;
}

/**
 * @param {string} blob
 * @returns {string | null}
 */
export function parseWcRunnerUpTeamAbbr(blob) {
  const text = String(blob || "");
  const m =
    text.match(/Runner-up\s+Group\s+[A-L]\s*[:—-]\s*([A-Z]{3})\b/i) ||
    text.match(/Runner-up\s+Group\s+[A-L][^(]*\(\s*([A-Z]{3})\s*[,)]/i) ||
    text.match(/Runner-up\s+gap:\s*Group\s+[A-L]\s*[-—]\s*([A-Z]{3})\b/i) ||
    text.match(/Group\s+[A-L]\s*[-—]\s*([A-Z]{3})\s+is\s+\d+\.?\d*\s*%\s+market/i);
  return m?.[1] ? String(m[1]).toUpperCase() : null;
}

/**
 * @param {object | null | undefined} structured
 * @returns {{ group: string | null, teamAbbr: string | null }}
 */
export function extractWcRunnerUpFromStructured(structured) {
  if (!structured || typeof structured !== "object") {
    return { group: null, teamAbbr: null };
  }
  const group =
    structured.runnerUpGroupLetter != null && String(structured.runnerUpGroupLetter).trim()
      ? String(structured.runnerUpGroupLetter).trim().toUpperCase()
      : parseWcRunnerUpGroupLetter(
          [structured.call, structured.lean, structured.whyNow, structured.line]
            .filter(Boolean)
            .join(" "),
        );
  const teamAbbr =
    structured.runnerUpTeamAbbr != null && String(structured.runnerUpTeamAbbr).trim()
      ? String(structured.runnerUpTeamAbbr).trim().toUpperCase()
      : parseWcRunnerUpTeamAbbr(
          [structured.whyNow, structured.call, structured.line].filter(Boolean).join(" "),
        );
  return { group, teamAbbr };
}

/**
 * @param {object[]} history
 * @returns {{ group: string | null, teamAbbr: string | null }}
 */
export function extractWcRunnerUpFromHistory(history) {
  if (!Array.isArray(history)) return { group: null, teamAbbr: null };
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    const role = String(turn?.role || "").toLowerCase();
    if (role !== "assistant" && role !== "ai") continue;

    const fromStructured = extractWcRunnerUpFromStructured(turn.structured);
    if (fromStructured.group) return fromStructured;

    const text = String(turn?.content || turn?.text || "");
    const group = parseWcRunnerUpGroupLetter(text);
    if (group) {
      return { group, teamAbbr: parseWcRunnerUpTeamAbbr(text) };
    }
  }
  return { group: null, teamAbbr: null };
}

/** @param {object[]} history @returns {string | null} */
export function extractWcRunnerUpGroupFromHistory(history) {
  return extractWcRunnerUpFromHistory(history).group;
}

/**
 * Parent take established a runner-up anchor (structured field or call/why prose).
 * @param {object | null | undefined} message
 */
export function parentTakeHasWcRunnerUpAnchor(message) {
  if (!message) return false;
  if (extractWcRunnerUpFromStructured(message.structured).group) return true;
  const blob = [message.content, message.text].filter(Boolean).join(" ");
  return Boolean(parseWcRunnerUpGroupLetter(blob));
}

/**
 * @param {string} question
 * @param {object[]} history
 * @returns {string}
 */
export function buildWcPushBackBindingBlock(question, history) {
  if (!isWcRunnerUpValueFollowUp(question)) return "";
  const { group, teamAbbr } = extractWcRunnerUpFromHistory(history);
  if (!group) return "";
  const teamClause = teamAbbr ? ` (best misprice: ${teamAbbr})` : "";
  return `PUSH-BACK BINDING (mandatory): Prior take named Group ${group} as runner-up value${teamClause}. Answer ONLY Group ${group}${teamAbbr ? ` / ${teamAbbr}` : ""} — explain in plain English why the advance line is wrong (sim% vs market%), not a roster list. Do NOT re-issue the #1 group pick or a new flagship slate card for a different group.`;
}

/**
 * Console warning only — no regeneration loop.
 * @param {{ whyNow?: string, question?: string, isFollowUp?: boolean }} opts
 */
export function warnWcThinFollowUpWhy(opts = {}) {
  if (!opts.isFollowUp) return;
  const whyNow = String(opts.whyNow || "").trim();
  if (!isWcThinRosterOnlyWhy(whyNow)) return;
  console.warn(
    JSON.stringify({
      event: "wc_thin_why",
      question: String(opts.question || "").slice(0, 160),
      whyPreview: whyNow.slice(0, 240),
    }),
  );
}

/**
 * @param {string} watchFor
 * @param {string} whyNow
 * @param {string} [deep]
 */
export function isWcWatchForDupedAgainstWhy(watchFor, whyNow, deep = "") {
  const wf = String(watchFor || "").trim();
  const why = String(whyNow || "").trim();
  if (!wf || !why) return false;
  if (wcSentenceSimilarity(wf, why) >= 0.8) return true;

  for (const sent of splitWcSentences(why)) {
    if (wcSentenceSimilarity(wf, sent) >= 0.85) return true;
  }

  const deepSents = splitWcSentences(deep);
  const lastDeep = deepSents[deepSents.length - 1] || "";
  if (lastDeep && wcSentenceSimilarity(wf, lastDeep) >= 0.85) return true;

  return false;
}

/**
 * @param {string} question
 */
export function isWcCrossGroupMispriceQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (isWcGroupPathMispriceQuestion(q)) return false;
  if (isWcTomorrowOrSlateBetQuestion(q)) return true;
  return (
    /\b(most mispriced|mispriced).*(?:group|groups)\b/i.test(q) ||
    /\bwhich (?:world cup )?group\b/i.test(q) ||
    /\b(best|top|single)\b[\s\S]{0,48}\bgroup[\s-]*stage\b/i.test(q) ||
    /\bgroup[\s-]*stage\s+value\b/i.test(q)
  );
}

/**
 * Broad slate picks ("sneaky bets tomorrow") — route to fast cross-group prebuilt, not full LLM.
 * @param {string} question
 */
export function isWcTomorrowOrSlateBetQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (/\b(golden boot|golden glove|player prop|anytime scorer)\b/i.test(q)) return false;
  return (
    /\b(sneaky|good bets?|best bets?|value bets?)\b[\s\S]{0,56}\b(tomorrow|matches tomorrow|world cup matches|today'?s?(?: matches| slate| games)?)\b/i.test(
      q,
    ) ||
    /\b(tomorrow|today'?s?)\b[\s\S]{0,56}\b(good bets?|best bets?|world cup bets?|matches to bet)\b/i.test(
      q,
    )
  );
}

/**
 * @param {string} question
 */
export function isWcGroupPathMispriceQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return /\bgroup\s+[a-l]\b/i.test(q) && /\b(advancement path|path.*mispriced|mispriced.*path)\b/i.test(q);
}

/**
 * @param {string} question
 * @param {string} body
 * @param {Record<string, unknown> | null | undefined} [structured]
 */
export function detectMissingComparativeProof(question, body, structured) {
  const q = String(question || "").trim();
  if (!isWcCrossGroupMispriceQuestion(q) && !isWcGroupPathMispriceQuestion(q)) {
    return false;
  }

  const blob = [
    body,
    structured?.line,
    structured?.whyNow,
    structured?.call,
  ]
    .filter(Boolean)
    .join("\n");

  if (isWcCrossGroupMispriceQuestion(q)) {
    const letters = [
      ...new Set(
        [...blob.matchAll(/\bgroup\s+([a-l])\b/gi)].map((m) => m[1].toUpperCase()),
      ),
    ];
    const hasCompare =
      /(vs\.?|compared to|over group|rank|second|next-best|delta|wider|tighter|runner-up)/i.test(
        blob,
      );
    return letters.length < 2 || !hasCompare;
  }

  if (isWcGroupPathMispriceQuestion(q)) {
    const hasCompare =
      /(vs\.?|compared|second|win group|escape|advance|path|delta|market)/i.test(blob);
    const hasTeam =
      /\b(USA|PAR|AUS|TUR|Paraguay|Australia|Türkiye|Turkey|United States)\b/i.test(blob);
    return !hasCompare || !hasTeam;
  }

  return false;
}

export const WC_SIM_ATTRIBUTION_PROMPT = `SIM ATTRIBUTION (mandatory when citing sim %):
- Every take citing UR simulation percentages MUST include this exact prefix once on the card face (LINE or WHY): [UR model · 10k Poisson/Elo · {date}]
- Example LINE: "[UR model · 10k Poisson/Elo · Jun 10] Market -130 · sim 15% advance vs market ~57%."
- Failure to label sim outputs fails QA and triggers regeneration.`;

/** Card-face WHY must cite a number — odds, implied %, or sim. */
export const WC_CARD_FACE_NUMERIC_RE =
  /(?:\bat\s+|[·\-–—]\s*)[+-]\d{2,}\b|\b\d+\.?\d*\s*%|\bsim(?:s)?\s+\d|\b\d+\.?\d*\s*(?:advance|win|qf|sf|reach|group)\b|\bmarket[^.\n]{0,48}\d+\.?\d*\s*%|\bvs market[^.\n]{0,24}\d+\.?\d*\s*%/i;

/**
 * @param {string} text
 */
export function wcCardFaceBlobHasNumericWhy(text) {
  return WC_CARD_FACE_NUMERIC_RE.test(String(text || ""));
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function isWcNonBettingCardCallType(structured) {
  const ct = String(structured?.callType || "").toLowerCase();
  return ct === "rules" || ct === "predictions_roundup" || ct === "goalscorers_list";
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function wcCardFaceNumericWhyFields(structured) {
  const whyNow = String(structured?.whyNow || "").trim();
  const line = String(structured?.line || "").trim();
  return { whyNow, line, faceBlob: [whyNow, line].filter(Boolean).join(" ") };
}

/**
 * @param {string} american
 * @returns {number | null}
 */
function wcAmericanImpliedPct(american) {
  const n = parseInt(String(american || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return null;
  if (n > 0) return Math.round((100 / (n + 100)) * 1000) / 10;
  return Math.round((Math.abs(n) / (Math.abs(n) + 100)) * 1000) / 10;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [question]
 * @param {{ wcIntent?: string }} [opts]
 */
export function detectMissingWcCardFaceNumericWhy(structured, question = "", opts = {}) {
  if (!structured || typeof structured !== "object") return false;
  if (isWcNonBettingCardCallType(structured)) return false;

  const wcIntent = String(opts.wcIntent || "").toLowerCase();
  if (wcIntent === "rules") return false;

  const q = String(question || "").trim();
  if (
    /\b(how do|what is a|what are the|rules|explain|extra time|penalty shootout)\b/i.test(q) &&
    !/\b(bet|odds|lean|pass|value|mispric|play)\b/i.test(q)
  ) {
    return false;
  }

  const { faceBlob } = wcCardFaceNumericWhyFields(structured);
  return !wcCardFaceBlobHasNumericWhy(faceBlob);
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [question]
 */
export function synthesizeWcCardFaceNumericWhy(structured, question = "") {
  void question;
  const line = String(structured?.line || "").trim();
  if (line && wcCardFaceBlobHasNumericWhy(line)) return line;

  const blob = [
    structured?.line,
    structured?.lean,
    structured?.call,
    structured?.deep,
    structured?.whyNow,
  ]
    .filter(Boolean)
    .join("\n");

  const leg = blob.match(/over\s+(\d+(?:\.\d+)?)\s+(?:at\s+|[·\-–—]\s*)([+-]\d+)/i);
  if (leg) {
    const implied = wcAmericanImpliedPct(leg[2]);
    const pct = implied != null ? ` (~${implied}% implied)` : "";
    return `Over ${leg[1]} at ${leg[2]}${pct} — nearest posted line to your ask.`;
  }

  const odds = blob.match(/\b(-1[0-9]{2}|\+[1-9]\d{2,4})\b/)?.[0];
  const simPct =
    blob.match(/(?:sim(?:s)?|UR)[^.\n]{0,40}(\d+\.?\d*)\s*%/i)?.[1] ||
    blob.match(/(\d+\.?\d*)\s*%\s+(?:advance|win|qf|reach|group)/i)?.[1];
  const marketPct = blob.match(/(?:market|implies)[^.\n]{0,32}~?(\d+\.?\d*)\s*%/i)?.[1];

  if (odds && simPct) {
    return `Listed ${odds} · sims ${simPct}%${marketPct ? ` vs market ~${marketPct}%` : ""}.`;
  }
  if (odds) {
    return `Listed at ${odds} — price check vs script in breakdown.`;
  }
  if (simPct) {
    return `Sims: ${simPct}% path — see breakdown for market compare.`;
  }

  const leanOdds = String(structured?.lean || "").match(/\b([+-]\d{2,})\b/)?.[1];
  if (leanOdds) {
    return `Market ${leanOdds} — one-line price vs path in breakdown.`;
  }

  return "";
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [question]
 * @param {{ wcIntent?: string }} [opts]
 */
export function ensureWcCardFaceNumericWhy(structured, question = "", opts = {}) {
  if (!structured || typeof structured !== "object") return structured;
  if (!detectMissingWcCardFaceNumericWhy(structured, question, opts)) return structured;

  const synthesized = synthesizeWcCardFaceNumericWhy(structured, question);
  if (!synthesized) return structured;

  const out = { ...structured };
  const whyNow = String(out.whyNow || "").trim();
  if (!whyNow || !wcCardFaceBlobHasNumericWhy(whyNow)) {
    out.whyNow = synthesized;
  }
  return out;
}

export const WC_COMPARATIVE_PROOF_PROMPT = `COMPARATIVE PROOF (mandatory for ranking / misprice claims):
- "Most mispriced group" → cite GROUP_MISPRICE_RANKING from VERIFIED CONTEXT: name #1 and #2 groups with delta.
- "Group X advancement path" → compare at least two paths or teams in that group (win group vs escape vs R16) with numbers.
- Never claim a superlative without naming the runner-up or alternate path.`;

export const WC_DEDUP_PROMPT = `BREAKDOWN DEDUP (mandatory):
- WHY (whyNow) and WATCH FOR (edge) must be distinct sentences — never copy WHY into WATCH FOR.
- FULL BREAKDOWN (deep) must add roster paths, bracket context, or market lines not repeated in WHY.
- WATCH FOR must be a live trigger (lineup, injury, fixture result) — not a restatement of the thesis.`;

export const WC_NEEDS_ATTRIBUTION_QA_SUFFIX = `

WC SIM ATTRIBUTION QA (mandatory — prior answer omitted model label):
- When citing sim percentages, include [UR model · 10k Poisson/Elo · date] on the card face (LINE or WHY).
- Do not cite bare percentages without the attribution prefix.`;

export const WC_NEEDS_DEDUP_QA_SUFFIX = `

WC DEDUP QA (mandatory — prior answer repeated WHY in WATCH FOR):
- WATCH FOR must be a new sentence — not the last sentence of deep and not a copy of WHY.
- Add a concrete trigger: lineup lock, injury, fixture result, or bracket shift.`;

export const WC_NEEDS_COMPARATIVE_QA_SUFFIX = `

WC COMPARATIVE PROOF QA (mandatory — prior answer claimed misprice without comparison):
- Ranking claims require a second group or alternate path with numbers from GROUP_MISPRICE_RANKING or VERIFIED CONTEXT.
- Name the runner-up explicitly (e.g. "Group I is second — Group D delta is wider").`;

export const WC_NEEDS_NUMERIC_WHY_QA_SUFFIX = `

WC CARD FACE NUMERIC WHY QA (mandatory — prior answer lacked a why clause with a number):
- Card face WHY (whyNow) or LINE must include one number: American odds (+600 / -135), implied %, or sim %.
- BAD: roster trivia or thesis with no price/sim anchor.
- GOOD: "Over 3 at -135 (~57% implied) — nearest posted line to your ask." OR "Market -130 · sim 15% vs market ~57%."
- Never ship lean-only card face — one numeric why line is mandatory on every betting take.`;
