/**
 * World Cup UR Take — odds citation binding (prevent session price bleed).
 */

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
