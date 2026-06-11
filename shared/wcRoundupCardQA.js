/**
 * Predictions roundup — thesis coherence, watch-for entities, dark-horse quality.
 */

import { wcCardHasDeltaSignal } from "./wcCardContractVoice.js";

const FAIR_PRICE_RE =
  /\b(fairly priced|fair price|fair co-favorite|market is pricing them fairly|no edge|not mispriced|pricing them fairly)\b/i;

const LEAN_NOT_PASS_RE = /^lean:/i;

const DARK_HORSE_PATH_RE =
  /\b(path|bracket|group|round of|qf|sf|knockout|draw side|soft side|survive|advance|knockout side)\b/i;
const DARK_HORSE_STYLE_RE =
  /\b(transition|set piece|set-piece|low.?block|counter|press|possession|direct|street|physical|aerial|width|volume)\b/i;
const DARK_HORSE_ODDS_RE =
  /\+\d{3,}|\bodds\b|\blonger odds\b|\bunderpriced\b|\bmispriced\b|\bmarket\b|\bbooks?\b/i;

const MARKET_ODDS_IN_LINE_RE = /\bmarket\s*\+\d{3,}|\+\d{3,}\s*(?:market|books?|board|line)/i;
const ANY_AMERICAN_ODDS_RE = /\+\d{3,}/;

const ORPHAN_PRONOUN_RE = /\b(him|her|them|he|she|they)\b/i;

const NATION_SLOT_PLAYER_BLEED_RE =
  /\b(pk|penalty|pen taker|penalties|golden boot|top scorer|goalscorer|expected goals?|x\s*g)\b/i;

const SCORER_PLAYER_PATTERNS = [
  { pattern: /mbapp[eé]/i, nations: ["france", "fra"], id: "mbappe" },
  { pattern: /vin[ií]cius/i, nations: ["brazil", "bra"], id: "vinicius" },
  { pattern: /\bkane\b/i, nations: ["england", "eng"], id: "kane" },
  { pattern: /\bhaaland\b/i, nations: ["norway", "nor"], id: "haaland" },
  { pattern: /\byamal\b/i, nations: ["spain", "esp"], id: "yamal" },
  { pattern: /\blautaro\b/i, nations: ["argentina", "arg"], id: "lautaro" },
];

const NATION_NAME_RE =
  /\b(spain|france|brazil|argentina|germany|england|portugal|mexico|usa|netherlands|italy|belgium|norway|colombia|uruguay|morocco|japan|ecuador|senegal|australia|canada|türkiye|turkey|paraguay|croatia|denmark|switzerland|austria|serbia|wales|scotland|qatar|saudi|korea|ghana|cameroon|nigeria|tunisia|algeria|iran|egypt|costa rica|panama|jamaica|south africa|rsa)\b/i;

const BETTER_VALUE_RE = /\bbetter value\b/i;

/** Cited American prices must name the market — not vague "adjusted odds". */
const VAGUE_ADJUSTED_ODDS_RE = /\badjusted odds?\b/i;

const NAMED_PLAYER_MARKET_RE =
  /\b(golden boot|golden glove|best goalkeeper|top goalscorer|goalscorer|boot winner|glove winner|most goals|scorer market|breakout prop|player prop|anytime goal|goals?\b|assists?\b)\b/i;

const NAMED_NATION_MARKET_RE =
  /\b(tournament winner|world cup winner|win the cup|title|outright|win group|group winner|to advance|make the (final|semis))\b/i;

const AMERICAN_ODDS_RE = /\+\d{3,}/;

/**
 * @param {string} slotKey
 * @param {string} value
 */
export function detectWcRoundupSlotUnnamedMarketOdds(slotKey, value) {
  const key = String(slotKey || "");
  const v = String(value || "").trim();
  if (!v) return null;

  if (VAGUE_ADJUSTED_ODDS_RE.test(v) && !NAMED_PLAYER_MARKET_RE.test(v) && !NAMED_NATION_MARKET_RE.test(v)) {
    return { reason: "adjusted_odds_without_market", slot: key };
  }

  if (key === "breakout" && AMERICAN_ODDS_RE.test(v) && !NAMED_PLAYER_MARKET_RE.test(v)) {
    return { reason: "breakout_odds_without_market", slot: key };
  }

  return null;
}

/**
 * Roundup slots must not cite +XXX or "adjusted odds" without naming the market type.
 * @param {Array<{ key: string, value?: string }>} [slots]
 */
export function detectWcRoundupUnnamedMarketOdds(slots = []) {
  for (const slot of slots || []) {
    const hit = detectWcRoundupSlotUnnamedMarketOdds(slot?.key, slot?.value);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {string} summary
 * @param {string} lean
 * @param {string} [deep]
 */
export function detectWcRoundupFairPriceContradiction(summary, lean, deep = "") {
  const sum = String(summary || "");
  const play = String(lean || "");
  const blob = `${sum}\n${deep}`;
  if (!FAIR_PRICE_RE.test(sum) && !FAIR_PRICE_RE.test(blob.slice(0, 400))) return null;
  if (LEAN_NOT_PASS_RE.test(play) && !/^pass\b/i.test(play)) {
    return { reason: "fair_price_summary_with_lean_play" };
  }
  if (/\bLean:\s*[^P][^.]*\b(Spain|France|Brazil|England|Argentina|Germany|Portugal)\b/i.test(deep) && FAIR_PRICE_RE.test(sum)) {
    return { reason: "fair_price_summary_with_winner_lean_in_deep" };
  }
  return null;
}

/**
 * @param {string} slotValue
 */
export function scoreWcDarkHorseThesisAngles(slotValue) {
  const v = String(slotValue || "");
  return {
    path: DARK_HORSE_PATH_RE.test(v),
    style: DARK_HORSE_STYLE_RE.test(v),
    odds: DARK_HORSE_ODDS_RE.test(v),
  };
}

/**
 * Dark horse quality bar — need two of path / style / odds, not just low title %.
 * @param {string} slotValue
 */
export function detectWcDarkHorseWeakThesis(slotValue) {
  const v = String(slotValue || "");
  const angles = scoreWcDarkHorseThesisAngles(v);
  const angleCount = [angles.path, angles.style, angles.odds].filter(Boolean).length;
  if (angleCount >= 2) return null;

  const winPct = v.match(/(\d+\.?\d*)%\s*(?:win|title|sims)/i);
  const pct = winPct ? parseFloat(winPct[1]) : null;

  if (pct != null && pct < 8 && angleCount < 2) {
    return { reason: "dark_horse_insufficient_angles", pct, angles, angleCount };
  }

  if (/\b(qf|quarter)/i.test(v) && angleCount < 2) {
    return { reason: "dark_horse_qf_only_no_case", angles, angleCount };
  }

  if (angleCount === 0) {
    return { reason: "dark_horse_no_angles", angles, angleCount };
  }

  return null;
}

/**
 * Roundup LINE must cite market +XXX when outrights are in VERIFIED CONTEXT — not sims-only.
 * @param {string} line
 * @param {boolean} [outrightsAvailable]
 */
export function detectWcRoundupLineMissingMarketOdds(line, outrightsAvailable = false) {
  if (!outrightsAvailable) return null;
  const l = String(line || "").trim();
  if (!l) return null;
  if (MARKET_ODDS_IN_LINE_RE.test(l) || ANY_AMERICAN_ODDS_RE.test(l)) return null;
  if (/\bsims?\s+\d|%\s*(win|qf|title)/i.test(l)) {
    return { reason: "delta_sims_only_no_market_odds" };
  }
  return null;
}

/**
 * @param {string} edge
 * @param {Array<{ key: string, value: string, label?: string }>} [slots]
 */
export function detectWcWatchForOrphanPronoun(edge, slots = []) {
  const e = String(edge || "").trim();
  if (!e || !ORPHAN_PRONOUN_RE.test(e)) return null;

  /** @type {string[]} */
  const names = [];
  for (const slot of slots) {
    const player = extractWcRoundupSlotPlayer(slot.value);
    const nation = extractWcRoundupSlotNation(slot.value);
    if (player) names.push(player);
    if (nation) names.push(nation);
  }

  const lower = e.toLowerCase();
  for (const name of names) {
    const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    if (parts.some((p) => lower.includes(p))) return null;
  }

  return { reason: "watch_for_orphan_pronoun", suggestedNames: names };
}

/**
 * @param {string} line
 */
export function isWcRoundupLineMissingDelta(line) {
  const l = String(line || "").trim();
  if (!l) return true;
  return !wcCardHasDeltaSignal(l);
}

/**
 * Nation-slot thesis cites another country's player/scorer market (e.g. Mbappé PK in Argentina dark horse).
 * @param {Array<{ key: string, value?: string }>} [slots]
 */
export function detectWcRoundupCrossMarketBleed(slots = []) {
  for (const slot of slots) {
    const key = String(slot?.key || "");
    if (key !== "darkHorse" && key !== "winners" && key !== "champion") continue;
    const value = String(slot?.value || "");
    if (!value || !NATION_SLOT_PLAYER_BLEED_RE.test(value)) continue;

    const nationMatch = value.match(NATION_NAME_RE);
    const nation = nationMatch?.[1]?.toLowerCase() || "";
    if (!nation) continue;

    for (const { pattern, nations } of SCORER_PLAYER_PATTERNS) {
      if (!pattern.test(value)) continue;
      const playerOnNation = nations.some((n) => nation.includes(n) || n.includes(nation.slice(0, 3)));
      if (!playerOnNation) {
        return { reason: "nation_slot_scorer_market_bleed", slot: key, nation };
      }
    }
  }
  return null;
}

/**
 * Top goalscorer slot names a better-value alternate than THE PLAY lean.
 * @param {string} lean
 * @param {Array<{ key: string, value?: string }>} [slots]
 */
export function detectWcRoundupScorerLeanContradiction(lean, slots = []) {
  const play = String(lean || "").trim();
  if (!/^lean:/i.test(play)) return null;
  const topScorer =
    (slots || []).find((s) => s.key === "goldenBoot") ||
    (slots || []).find((s) => s.key === "topScorer");
  const slotValue = String(topScorer?.value || "");
  if (!slotValue || !BETTER_VALUE_RE.test(slotValue)) return null;

  const leanPlayer = SCORER_PLAYER_PATTERNS.find(({ pattern }) => pattern.test(play));
  if (!leanPlayer) return null;

  for (const { pattern, id } of SCORER_PLAYER_PATTERNS) {
    if (id === leanPlayer.id) continue;
    if (pattern.test(slotValue) && BETTER_VALUE_RE.test(slotValue)) {
      return { reason: "top_scorer_better_value_conflicts_with_lean" };
    }
  }
  return null;
}

/**
 * Extract short nation from roundup slot value.
 * @param {string} slotValue
 */
export function extractWcRoundupSlotNation(slotValue) {
  const m = String(slotValue || "").match(
    /^(?:Champion|Winners|Dark horse|Flop):\s*([A-Za-zÀ-ÿ]+)/i,
  );
  return m?.[1]?.trim() || "";
}

/**
 * @param {string} slotValue
 */
export function extractWcRoundupSlotPlayer(slotValue) {
  const v = String(slotValue || "");
  const m =
    v.match(
      /(?:Golden Boot|Top goalscorer|Best player|Best goalkeeper|Golden Glove|Breakout player|Flop):\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ.'-]+)?)/i,
    ) || v.match(/^([A-Z][\wÀ-ÿ]+(?:\s+[A-Z][\wÀ-ÿ]+)?)/);
  return m?.[1]?.trim().replace(/\s+/g, " ") || "";
}
