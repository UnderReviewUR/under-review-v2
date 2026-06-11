/**
 * World Cup multi-slot prediction prompts — legacy 4-slot + extended 6-slot roundup.
 */

import { splitWcSentences } from "./wcSentenceBoundaries.js";

/** @typedef {{ key: string, label: string, patterns: RegExp[], cue?: RegExp }} WcPredictionSlotSpec */

/** @type {WcPredictionSlotSpec[]} */
export const WC_PREDICTION_SLOT_SPECS = [
  {
    key: "champion",
    label: "Champion",
    cue: /\b(champion|winners?|win the tournament|lift the trophy|tournament winner)\b/i,
    patterns: [
      /\bchampion\s*:/i,
      /\bwinners?\s*:/i,
      /🏆\s*champion\s*:/i,
      /🏆\s*winners?\s*:/i,
      /🏆/,
    ],
  },
  {
    key: "goldenBoot",
    label: "Golden Boot",
    cue: /\b(golden\s+boot|top\s+goalscorers?|top scorer)\b/i,
    patterns: [
      /\bgolden\s+boot\s*:/i,
      /\btop\s+goalscorers?\s*:/i,
      /🔝\s*top\s+goalscorers?\s*:/i,
      /🔝/,
    ],
  },
  {
    key: "bestPlayer",
    label: "Best player",
    cue: /\b(best\s+player|golden\s+ball|player of the tournament)\b/i,
    patterns: [/\bbest\s+player\s*:/i, /\bgolden\s+ball\s*:/i, /⭐\s*best\s+player\s*:/i],
  },
  {
    key: "goldenGlove",
    label: "Best goalkeeper",
    cue: /\b(best\s+goalkeeper|golden\s+glove|glove winner)\b/i,
    patterns: [
      /\bbest\s+goalkeeper\s*:/i,
      /\bgolden\s+glove\s*:/i,
      /🧤\s*best\s+goalkeeper\s*:/i,
    ],
  },
  {
    key: "darkHorse",
    label: "Dark horse",
    cue: /\bdark\s*horse\b/i,
    patterns: [/\bdark\s*horse\s*:/i, /🐎\s*dark\s*horse\s*:/i, /🐎/],
  },
  {
    key: "flop",
    label: "Flop",
    cue: /\bflop\b/i,
    patterns: [/\bflop\s*:/i, /📉\s*flop\s*:/i],
  },
  {
    key: "breakout",
    label: "Breakout player",
    cue: /\bbreakout(?:\s+player)?\b/i,
    patterns: [/\bbreakout\s+player\s*:/i, /📈\s*breakout\s*player\s*:/i, /📈/],
  },
  /** @deprecated alias — maps to goldenBoot in QA */
  {
    key: "topScorer",
    label: "Top goalscorer",
    cue: /\btop\s+goalscorers?\b/i,
    patterns: [/\btop\s+goalscorers?\s*:/i],
  },
  /** @deprecated alias — maps to champion */
  {
    key: "winners",
    label: "Winners",
    cue: /\bwinners?\b/i,
    patterns: [/\bwinners?\s*:/i],
  },
];

const WC_PREDICTION_SLOT_BY_KEY = new Map(WC_PREDICTION_SLOT_SPECS.map((s) => [s.key, s]));

const WC_ROUNDUP_SLOT_CUE_RES = WC_PREDICTION_SLOT_SPECS.filter((s) => s.cue).map((s) => s.cue);

/**
 * @param {string} question
 */
export function wcRoundupSlotCueCount(question) {
  return WC_ROUNDUP_SLOT_CUE_RES.filter((re) => re?.test(String(question || ""))).length;
}

/**
 * Detect which labeled slots the user asked for (extended 6-slot + legacy 4-slot).
 * @param {string} question
 */
export function detectRequestedRoundupSlots(question) {
  const q = String(question || "").trim();
  /** @type {WcPredictionSlotSpec[]} */
  const out = [];

  for (const spec of WC_PREDICTION_SLOT_SPECS) {
    if (!spec.cue?.test(q)) continue;
    if (out.some((s) => s.key === spec.key)) continue;
    if (spec.key === "topScorer" && out.some((s) => s.key === "goldenBoot")) continue;
    if (spec.key === "winners" && out.some((s) => s.key === "champion")) continue;
    out.push(spec);
  }

  return out;
}

/**
 * @param {string} question
 */
export function isWcPredictionsRoundupQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;

  const requested = detectRequestedRoundupSlots(q);
  if (requested.length >= 2) return true;

  const labeledSlots = WC_PREDICTION_SLOT_SPECS.filter((spec) =>
    spec.patterns.some((p) => p.test(q)),
  );
  if (labeledSlots.length >= 2) return true;

  const hasRoundupCue = /\b(predictions?|your picks|hear your|give me your|tournament predictions|fill in these predictions)\b/i.test(
    q,
  );
  const cueCount = wcRoundupSlotCueCount(q);
  if (hasRoundupCue && cueCount >= 3) return true;
  if (hasRoundupCue && requested.length >= 2) return true;

  return hasRoundupCue && labeledSlots.length >= 1 && cueCount >= +2;
}

/**
 * Slots the user asked for (for QA completeness).
 * @param {string} question
 */
export function expectedWcPredictionSlots(question) {
  const q = String(question || "").trim();
  const requested = detectRequestedRoundupSlots(q);
  if (requested.length >= 2) {
    return requested.filter((s) => s.key !== "topScorer" && s.key !== "winners");
  }

  const labeled = WC_PREDICTION_SLOT_SPECS.filter((spec) => spec.patterns.some((p) => p.test(q)));
  if (labeled.length >= 2) {
    return labeled.filter((s) => s.key !== "topScorer" && s.key !== "winners");
  }

  if (isWcPredictionsRoundupQuestion(q) && wcRoundupSlotCueCount(q) >= 4) {
    return ["champion", "goldenBoot", "bestPlayer", "goldenGlove", "darkHorse", "flop"]
      .map((k) => WC_PREDICTION_SLOT_BY_KEY.get(k))
      .filter(Boolean);
  }

  if (isWcPredictionsRoundupQuestion(q) && wcRoundupSlotCueCount(q) >= 3) {
    return ["champion", "goldenBoot", "darkHorse", "breakout"]
      .map((k) => WC_PREDICTION_SLOT_BY_KEY.get(k))
      .filter(Boolean);
  }

  return labeled.filter((s) => s.key !== "topScorer" && s.key !== "winners");
}

/**
 * @param {string} line
 * @param {WcPredictionSlotSpec} spec
 */
function cleanSlotLine(line, spec) {
  let val = String(line || "").trim();
  for (const pat of spec.patterns) {
    val = val.replace(pat, "").trim();
  }
  val = val.replace(/^[:：\-—–]\s*/, "").trim();
  if (!val) return "";
  const sents = splitWcSentences(val);
  return (sents[0] || val).trim();
}

/**
 * Parse labeled picks from model summary + deep.
 * @param {string} text
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export function parseWcPredictionSlots(text) {
  const blob = String(text || "").replace(/\r\n/g, "\n");
  /** @type {Array<{ key: string, label: string, value: string }>} */
  const slots = [];
  const seen = new Set();

  const tryAdd = (spec, rawValue) => {
    const value = cleanSlotLine(rawValue, spec) || String(rawValue || "").trim();
    if (!value || value.length < 2 || seen.has(spec.key)) return;
    seen.add(spec.key);
    slots.push({ key: spec.key, label: spec.label, value });
  };

  for (const line of blob.split("\n").map((l) => l.trim()).filter(Boolean)) {
    for (const spec of WC_PREDICTION_SLOT_SPECS) {
      if (seen.has(spec.key)) continue;
      if (!spec.patterns.some((p) => p.test(line))) continue;
      tryAdd(spec, line);
      break;
    }
  }

  if (slots.length < 2) {
    const altPattern = WC_PREDICTION_SLOT_SPECS.map((s) => s.patterns[0]?.source)
      .filter(Boolean)
      .join("|");
    for (const spec of WC_PREDICTION_SLOT_SPECS) {
      if (seen.has(spec.key)) continue;
      for (const pat of spec.patterns) {
        const re = new RegExp(
          `${pat.source}\\s*[:：]?\\s*([^\\n·•]+?)(?=\\s*(?:${altPattern})\\s*[:：]|$)`,
          "i",
        );
        const m = blob.match(re);
        if (m?.[1]?.trim()) {
          tryAdd(spec, m[1]);
          break;
        }
      }
    }
  }

  return slots;
}

/**
 * @param {string} question
 * @param {Array<{ key: string }>} parsed
 */
export function wcPredictionsRoundupMissingSlots(question, parsed) {
  const expected = expectedWcPredictionSlots(question);
  if (!expected.length) return [];
  const have = new Set((parsed || []).map((s) => s.key));
  return expected.filter((spec) => !have.has(spec.key)).map((s) => s.key);
}

export const WC_PREDICTIONS_ROUNDUP_PROMPT = `PREDICTIONS ROUNDUP (mandatory — user asked for MULTIPLE labeled picks in one message):
- Answer EVERY slot the user listed — do not collapse into a single Golden Boot or tournament-winner essay.
- Put labeled picks in deep using these line headers (one complete sentence each, emoji optional):
  Champion: [nation] — thesis + Market +XXX from CURRENT OUTRIGHT ODDS when available.
  Golden Boot: [player full name] — thesis + cited Golden Boot / ADJUSTED GOLDEN BOOT odds from VERIFIED CONTEXT.
  Best player: [player full name] — Golden Ball / best-player thesis (no invented prices if board missing).
  Best goalkeeper: [GK full name] — cite GOLDEN GLOVE ODDS or ADJUSTED GOLDEN GLOVE ranks from VERIFIED CONTEXT; never "no verified market" when those blocks exist.
  Dark horse: [nation] — thesis with TWO of: bracket/path, playing style, market odds (+XXX).
  Flop: [player or nation] — overpriced / wrong-path fade with cited market or sim delta when available.
  Breakout player: [player name] — thesis (legacy slot when user asks for breakout).
- Golden Boot / Top goalscorer MUST name one finisher (Mbappé, Haaland, Yamal tier) — never primary creators (Pedri, Rodri, Rice).
- Best goalkeeper MUST name one starter GK (Martínez, Simón, Alisson, Maignan tier) — never a nation alone.
- summary sentence 1 = tournament thesis naming Champion pick; sentence 2 = best misprice delta with numbers.
- Card face WHY must list every slot the user requested (short names).
- WATCH FOR must name a player or nation — never orphan "him/her".
- Never merge all picks into one Golden Boot essay without the labeled headers.`;

export const WC_PREDICTIONS_ROUNDUP_QA_SUFFIX = `

PREDICTIONS ROUNDUP QA (mandatory — prior answer skipped labeled slots):
- User asked for multiple picks. Label EVERY slot they requested in deep.
- Use headers: Champion:, Golden Boot:, Best player:, Best goalkeeper:, Dark horse:, Flop: (plus Breakout player: if requested).
- Golden Boot line MUST include a player full name — never vague "board not posted" without naming someone.
- Best goalkeeper MUST name a GK — never only "Spain's keeper" or "watch for a prop".
- Do NOT route the entire answer as a single Golden Boot / winner take.`;
