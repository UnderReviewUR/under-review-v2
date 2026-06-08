/**
 * World Cup multi-slot prediction prompts (Winners / Dark horse / Breakout / Top goalscorer).
 */

import { splitWcSentences } from "./wcSentenceBoundaries.js";

/** @typedef {{ key: string, label: string, patterns: RegExp[] }} WcPredictionSlotSpec */

/** @type {WcPredictionSlotSpec[]} */
export const WC_PREDICTION_SLOT_SPECS = [
  {
    key: "winners",
    label: "Winners",
    patterns: [/\bwinners?\s*:/i, /🏆\s*winners?\s*:/i, /🏆/],
  },
  {
    key: "darkHorse",
    label: "Dark horse",
    patterns: [/\bdark\s*horse\s*:/i, /🐎\s*dark\s*horse\s*:/i, /🐎/],
  },
  {
    key: "breakout",
    label: "Breakout player",
    patterns: [/\bbreakout\s+player\s*:/i, /📈\s*breakout\s*player\s*:/i, /📈/],
  },
  {
    key: "topScorer",
    label: "Top goalscorer",
    patterns: [/\btop\s+goalscorers?\s*:/i, /🔝\s*top\s+goalscorers?\s*:/i, /🔝/],
  },
];

/**
 * @param {string} question
 */
export function isWcPredictionsRoundupQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;

  const labeledSlots = WC_PREDICTION_SLOT_SPECS.filter((spec) =>
    spec.patterns.some((p) => p.test(q)),
  );
  if (labeledSlots.length >= 2) return true;

  const hasRoundupCue = /\b(predictions?|your picks|hear your|give me your)\b/i.test(q);
  return hasRoundupCue && labeledSlots.length >= 1 && /\b(winners?|dark\s*horse|breakout|goalscorer)\b/i.test(q);
}

/**
 * Slots the user asked for (for QA completeness).
 * @param {string} question
 */
export function expectedWcPredictionSlots(question) {
  const q = String(question || "").trim();
  return WC_PREDICTION_SLOT_SPECS.filter((spec) => spec.patterns.some((p) => p.test(q)));
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
    for (const spec of WC_PREDICTION_SLOT_SPECS) {
      if (seen.has(spec.key)) continue;
      for (const pat of spec.patterns) {
        const re = new RegExp(
          `${pat.source}\\s*[:：]?\\s*([^\\n·•]+?)(?=\\s*(?:${WC_PREDICTION_SLOT_SPECS.map((s) => s.patterns[0].source).join("|")})\\s*[:：]|$)`,
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
- Answer EVERY slot the user listed. Do not answer only Top goalscorer / Golden Boot and ignore Winners, Dark horse, or Breakout player.
- Put labeled picks in deep using EXACTLY these lines (one complete sentence each, emoji optional):
  Winners: [nation] — thesis in one sentence.
  Dark horse: [nation] — thesis in one sentence with TWO of: bracket/path, playing style (transition/set pieces/low block), market odds (+XXX).
  Breakout player: [player name] — thesis in one sentence.
  Top goalscorer: [player full name] — thesis + cited odds if in VERIFIED CONTEXT.
- Top goalscorer MUST name one player (e.g. Mbappé, Haaland, Yamal). Never a vague category ("midfielder hybrid", "board not posted"). If Golden Boot odds are absent, write: "Top goalscorer: Pass until boards post — structurally [Name] tier."
- Never pick primary creators (Pedri, Rodri, Rice) for Top goalscorer — wrong role. Assist props only.
- summary sentence 1 = tournament thesis naming your Winners pick (nation + path/squad angle).
- summary sentence 2 = delta with numbers: Market +XXX · UR ~+YYY or sims % — when CURRENT OUTRIGHT ODDS are in VERIFIED CONTEXT you MUST cite Market +XXX exactly as listed (e.g. ESP +500 from context), not sims-only.
- UR sim win % is structural only (Elo + Poisson, host boost) — no winner's slump, travel, or book sync; always cite Market +XXX first, then sim as UR model — never present sim % as market implied probability or Goldman/consensus alignment.
- Card face WHY must list four picks in one line: Winners · Dark horse · Breakout · Top goalscorer (short names).
- Never state a player's age unless PLAYER BIO in VERIFIED CONTEXT lists it (Yamal is 18 as of Jun 2026 — not 17).
- WATCH FOR must name a player or nation — never orphan "him/her".
- End deep with WATCH FOR (named entity) and PLAY: Lean: [Player/Nation] [market] + thesis OR Pass at +XXX — full sentence, never "Lean: that actually holds."
- Never merge all picks into one Golden Boot essay without the four labels.`;

export const WC_PREDICTIONS_ROUNDUP_QA_SUFFIX = `

PREDICTIONS ROUNDUP QA (mandatory — prior answer skipped labeled slots):
- User asked for multiple picks (Winners / Dark horse / Breakout / Top goalscorer). You must label EVERY slot they requested.
- deep must include lines starting with "Winners:", "Dark horse:", "Breakout player:", "Top goalscorer:" (complete sentences).
- Top goalscorer line MUST include a player full name — never "board not posted" or "midfielder hybrid" without naming someone.
- Never pick Pedri, Rodri, or other primary creators for Top goalscorer — use Mbappé, Haaland, Yamal, Kane, Vinícius tier instead.
- Dark horse must cite at least TWO of path, style, and odds (+XXX) — low title % or QF % alone is insufficient.
- Do NOT route the entire answer as a Golden Boot / single-scorer take.`;
