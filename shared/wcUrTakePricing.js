/**
 * World Cup UR Take — odds citation binding (prevent session price bleed).
 */

import {
  classifyWcAdvancementMarket,
  wcAdvancementMarketMeta,
  WC_ADVANCEMENT_MARKET,
} from "./wcAdvancementMarket.js";

/** @param {string} question */
export function extractAmericanOddsFromQuestion(question) {
  const matches = String(question || "").match(/\+[1-9]\d{2,4}\b/g);
  if (!matches?.length) return [];
  return [...new Set(matches)];
}

/**
 * @param {string} text
 */
export function extractAmericanOddsFromText(text) {
  const matches = String(text || "").match(/\+[1-9]\d{2,4}\b/g);
  if (!matches?.length) return [];
  return [...new Set(matches)];
}

/**
 * @param {string} question
 * @param {string[]} requiredEntities
 * @param {import("./wcUrTakeIntent.js").WcUrTakeIntent | string} wcIntent
 */
export function buildPriceBindingPromptBlock(question, requiredEntities = [], wcIntent = "") {
  if (String(wcIntent) !== "ENTITY_PRICING") return "";

  const market = classifyWcAdvancementMarket(question);
  if (market && market !== WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER) {
    const meta = wcAdvancementMarketMeta(market);
    return `PRICE BINDING (mandatory):
  User asked about "${meta.label}" — NOT tournament winner outright.
  Do NOT cite CURRENT OUTRIGHT ODDS as the price for this market.
  Compare ${meta.key} sim probability to editorial or user-cited knockout-reach prices only — label SportsLine/editorial as narrative, not verified book feed.
  Never equate group-advance sim % (advancePct) with Round of 16 reach unless the question is explicitly about escaping the group.`;
  }

  const entities = (requiredEntities || []).map((t) => String(t).toUpperCase()).filter(Boolean);
  const citedInQuestion = extractAmericanOddsFromQuestion(question);

  if (citedInQuestion.length === 1 && entities.length === 1) {
    return `PRICE BINDING (mandatory):
  User cited ${citedInQuestion[0]} for ${entities[0]} in this question only.
  Do NOT apply ${citedInQuestion[0]} (or any other team's price from prior turns) to a different team.
  If quoting ${entities[0]}, use only CURRENT OUTRIGHT ODDS for ${entities[0]} in VERIFIED CONTEXT, or omit the number.`;
  }

  if (!citedInQuestion.length) {
    return `PRICE BINDING (mandatory):
  The user did NOT cite a specific American odds price in this question.
  Do NOT invent or recycle a +XXXX price from earlier messages in the chat.
  Quote prices only from CURRENT OUTRIGHT ODDS in VERIFIED CONTEXT for the required entity, or use structural language without citing a number.`;
  }

  return `PRICE BINDING (mandatory):
  Only cite American prices that appear in this question or in VERIFIED CONTEXT for the required entity.
  Never attach a price from a prior turn about a different team.`;
}

/**
 * @param {string} text
 * @param {string} question
 * @param {string} wcIntent
 */
export function detectUncitedAmericanOdds(text, question, wcIntent) {
  if (String(wcIntent) !== "ENTITY_PRICING") return false;

  const citedInAnswer = extractAmericanOddsFromText(text);
  if (!citedInAnswer.length) return false;

  const citedInQuestion = extractAmericanOddsFromQuestion(question);
  if (!citedInQuestion.length) return true;

  return citedInAnswer.some((price) => !citedInQuestion.includes(price));
}

/**
 * @param {string} text
 * @param {string} question
 * @param {string[]} sessionPrices — +XXXX cited in prior user turns
 */
export function stripSessionBleedPrices(text, question, sessionPrices = []) {
  const citedInQuestion = extractAmericanOddsFromQuestion(question);
  if (citedInQuestion.length) return String(text || "");

  let out = String(text || "");
  const bleedPrices = (sessionPrices || []).filter(
    (p) => p && !citedInQuestion.includes(p),
  );
  for (const price of bleedPrices) {
    const esc = price.replace(/[+]/g, "\\+");
    out = out.replace(new RegExp(`\\bat\\s+${esc}(?=\\s|[,.!?]|$)`, "gi"), "");
    out = out.replace(new RegExp(`${esc}(?=\\s|[,.!?]|$)`, "g"), "");
  }
  out = out.replace(/\b(at\s+)?to win the (World Cup|tournament)\b/gi, "to win the World Cup");
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
  return out;
}

/**
 * @param {object | null | undefined} structured
 * @param {string} question
 * @param {string[]} sessionPrices
 */
export function stripWcStructuredSessionPrices(structured, question, sessionPrices = []) {
  if (!structured || typeof structured !== "object") return structured;
  const out = { ...structured };
  for (const key of ["lean", "whyNow", "call", "edge"]) {
    if (out[key]) {
      out[key] = stripSessionBleedPrices(String(out[key]), question, sessionPrices);
    }
  }
  return out;
}

/** @param {object[]} history */
export function extractSessionAmericanOdds(history) {
  if (!Array.isArray(history)) return [];
  /** @type {Set<string>} */
  const found = new Set();
  for (const turn of history) {
    const text = String(turn?.content ?? turn?.text ?? "");
    for (const p of extractAmericanOddsFromQuestion(text)) found.add(p);
  }
  return [...found];
}
