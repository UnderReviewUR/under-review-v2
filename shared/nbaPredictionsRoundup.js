/**
 * NBA multi-slot predictions (series favorites / breakout / scoring prop).
 */

import { splitWcSentences } from "./wcSentenceBoundaries.js";
import { detectWcRoundupSlotUnnamedMarketOdds } from "./wcRoundupCardQA.js";

/** @typedef {{ key: string, label: string, patterns: RegExp[] }} NbaPredictionSlotSpec */

/** @type {NbaPredictionSlotSpec[]} */
export const NBA_PREDICTION_SLOT_SPECS = [
  {
    key: "seriesFavorites",
    label: "Series favorites",
    patterns: [/\bseries favorites?\s*:/i, /\bplayoff favorites?\s*:/i, /\bfinals favorites?\s*:/i],
  },
  {
    key: "breakout",
    label: "Breakout player",
    patterns: [/\bbreakout player\s*:/i, /\bbreakout\s*:/i],
  },
  {
    key: "scoringProp",
    label: "Scoring prop",
    patterns: [
      /\bscoring prop\s*:/i,
      /\bbest scoring prop\s*:/i,
      /\bplayer prop\s*:/i,
    ],
  },
];

const NBA_ROUNDUP_SLOT_CUE_RES = [
  /\bseries favorites?\b/i,
  /\bplayoff favorites?\b/i,
  /\bfinals favorites?\b/i,
  /\bbreakout(?:\s+player)?\b/i,
  /\b(scoring prop|best scoring prop|player prop)\b/i,
];

/**
 * @param {string} question
 */
export function nbaRoundupSlotCueCount(question) {
  return NBA_ROUNDUP_SLOT_CUE_RES.filter((re) => re.test(String(question || ""))).length;
}

/**
 * @param {string} question
 */
export function isNbaPredictionsRoundupQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;

  const labeled = NBA_PREDICTION_SLOT_SPECS.filter((spec) => spec.patterns.some((p) => p.test(q)));
  if (labeled.length >= 2) return true;

  const hasCue = /\b(predictions?|your picks|hear your|give me your)\b/i.test(q);
  const cueCount = nbaRoundupSlotCueCount(q);
  if (hasCue && cueCount >= 2) return true;
  return (
    hasCue &&
    /\b(breakout|scoring prop|series favorites?|playoff favorites?)\b/i.test(q) &&
    labeled.length >= 1
  );
}

/**
 * @param {string} question
 */
export function expectedNbaPredictionSlots(question) {
  const q = String(question || "").trim();
  const labeled = NBA_PREDICTION_SLOT_SPECS.filter((spec) => spec.patterns.some((p) => p.test(q)));
  if (labeled.length >= 2) return labeled;
  if (isNbaPredictionsRoundupQuestion(q) && nbaRoundupSlotCueCount(q) >= 2) {
    return NBA_PREDICTION_SLOT_SPECS;
  }
  return labeled;
}

/**
 * @param {string} line
 * @param {NbaPredictionSlotSpec} spec
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
 * @param {string} text
 */
export function parseNbaPredictionSlots(text) {
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
    for (const spec of NBA_PREDICTION_SLOT_SPECS) {
      if (seen.has(spec.key)) continue;
      if (!spec.patterns.some((p) => p.test(line))) continue;
      tryAdd(spec, line);
      break;
    }
  }

  return slots;
}

/**
 * @param {string} question
 * @param {Array<{ key: string }>} parsed
 */
export function nbaPredictionsRoundupMissingSlots(question, parsed) {
  const expected = expectedNbaPredictionSlots(question);
  if (!expected.length) return [];
  const have = new Set((parsed || []).map((s) => s.key));
  return expected.filter((spec) => !have.has(spec.key)).map((s) => s.key);
}

/**
 * Series slot must cite series/playoff path — not championship outright bleed.
 * @param {string} value
 */
export function detectNbaSeriesChampionshipBleed(value) {
  const v = String(value || "");
  if (!v.trim()) return null;
  if (/\b(series|finals series|playoff series)\b/i.test(v)) return null;
  if (
    /\b(win the (nba )?(finals|championship)|championship winner|title odds|to win it all)\b/i.test(v)
  ) {
    return { reason: "series_slot_championship_bleed" };
  }
  return null;
}

/**
 * Scoring prop must name the prop market when citing a pick.
 * @param {string} value
 */
export function detectNbaScoringPropUnnamedMarket(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  if (/\b(over|under)\s+\d+(?:\.\d+)?\s+(?:points|pts|rebounds|assists|threes|pra)\b/i.test(v)) {
    return null;
  }
  if (/\badjusted odds?\b/i.test(v)) {
    return { reason: "scoring_prop_adjusted_odds" };
  }
  if (/\+\d{3,}/.test(v) && !/\b(prop|points|rebounds|assists|over|under)\b/i.test(v)) {
    return { reason: "scoring_prop_odds_without_market" };
  }
  return null;
}

/**
 * @param {Array<{ key: string, value?: string }>} slots
 */
export function detectNbaRoundupUnnamedMarketOdds(slots = []) {
  for (const slot of slots || []) {
    const key = String(slot?.key || "");
    const value = String(slot?.value || "");
    if (key === "breakout") {
      const hit = detectWcRoundupSlotUnnamedMarketOdds("breakout", value);
      if (hit) return hit;
    }
    if (key === "scoringProp") {
      const hit = detectNbaScoringPropUnnamedMarket(value);
      if (hit) return hit;
    }
  }
  return null;
}

export const NBA_PREDICTIONS_ROUNDUP_PROMPT = `NBA PREDICTIONS ROUNDUP (mandatory — user asked for MULTIPLE labeled picks):
- Answer EVERY slot: Series favorites, Breakout player, Scoring prop.
- Put labeled picks in deep using EXACTLY these lines (one complete sentence each):
  Series favorites: [team] — thesis with SERIES odds (+XXX) from NBA FINALS SERIES ODDS — NOT championship futures or MVP.
  Breakout player: [player name] — thesis in one sentence. If you cite +XXX, name the market (points prop, Finals MVP, etc.) — never "adjusted odds" alone.
  Scoring prop: [player] over/under [line] [stat] — cite the prop market explicitly.
- Series favorites = who wins the Knicks–Spurs (or cited) Finals SERIES — never confuse with "win the NBA championship" outright from a different market.
- summary sentence 1 = series thesis; sentence 2 = delta with series market +XXX vs structural %.
- WATCH FOR must name a player or team.
- End with PLAY: Lean: [team/player] [market] + thesis — full sentence.`;

export const NBA_PREDICTIONS_ROUNDUP_QA_SUFFIX = `

NBA PREDICTIONS ROUNDUP QA (mandatory — prior answer skipped labeled slots):
- User asked for Series favorites, Breakout player, and Scoring prop — label ALL three in deep.
- Series favorites must cite SERIES prices (+180 series), not championship/MVP markets.
- Scoring prop must name over/under and stat (e.g. Brunson over 25.5 points).
- Never write "adjusted odds" without naming the prop or award market.`;
