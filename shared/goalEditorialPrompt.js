/**
 * Goal.com editorial KV → UR Take prompt blocks (corroboration only).
 */

import { GOAL_EDITORIAL_GOVERNANCE, GOAL_EDITORIAL_MAX_AGE_MS } from "./goalBettingConstants.js";
import { isTournamentWinnerQuestion } from "./wcPhaseUtils.js";
import { isWcPlayerMarketIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { shouldInjectWcUsmntMediaContext } from "./wcUsmntMediaContext.js";

const AWARD_RE =
  /\b(golden ball|golden boot|golden glove|young player|most assists|best player|player of the tournament)\b/i;

/**
 * @param {object | null | undefined} kv
 * @param {number} [nowMs]
 */
export function isGoalEditorialFresh(kv, nowMs = Date.now()) {
  const at = Number(kv?.lastUpdated);
  if (!Number.isFinite(at) || at <= 0) return false;
  return nowMs - at <= GOAL_EDITORIAL_MAX_AGE_MS;
}

/**
 * @param {string} marketId
 * @param {object | null | undefined} kv
 */
function marketBlockFromKv(marketId, kv) {
  const page = kv?.markets?.[marketId];
  if (!page?.rows?.length) return null;
  const pub = page.publishedAt ? `published ${page.publishedAt}` : "publish date unknown";
  const lines = page.rows.slice(0, 12).map((r) => {
    const extra = r.team ? ` (${r.team})` : "";
    return `  ${r.label}${extra}: ${r.odds}`;
  });
  return [`${page.label || marketId} (${pub}):`, ...lines];
}

/**
 * @param {string} question
 * @param {string} [wcIntent]
 * @param {string[]} [mentionedTeams]
 * @param {object | null | undefined} kv
 */
export function selectGoalEditorialMarkets(question, wcIntent, mentionedTeams = [], kv) {
  if (!kv?.markets || !isGoalEditorialFresh(kv)) return [];

  const q = String(question || "");
  const teams = (mentionedTeams || []).map((t) => String(t).toUpperCase());
  /** @type {string[]} */
  const ids = [];

  if (isTournamentWinnerQuestion(q) || wcIntent === WC_INTENT.ENTITY_PRICING) {
    if (kv.markets.wc_winner?.rows?.length) ids.push("wc_winner");
  }

  if (AWARD_RE.test(q) || isWcPlayerMarketIntent(wcIntent)) {
    if (/\bgolden boot\b/i.test(q) || wcIntent === WC_INTENT.GOLDEN_BOOT || wcIntent === WC_INTENT.TOP_SCORER) {
      if (kv.markets.golden_boot?.rows?.length) ids.push("golden_boot");
    }
    if (/\bgolden ball\b/i.test(q) || /\bbest player\b/i.test(q)) {
      if (kv.markets.golden_ball?.rows?.length) ids.push("golden_ball");
    }
  }

  if (shouldInjectWcUsmntMediaContext(q, teams)) {
    if (teams.includes("USA") || /\b(usmnt|team usa|united states)\b/i.test(q)) {
      if (kv.markets.host_usa?.rows?.length) ids.push("host_usa");
    }
    if (teams.includes("MEX") || /\bmexico\b/i.test(q)) {
      if (kv.markets.host_mex?.rows?.length) ids.push("host_mex");
    }
    if (teams.includes("CAN") || /\bcanada\b/i.test(q)) {
      if (kv.markets.host_can?.rows?.length) ids.push("host_can");
    }
  }

  return [...new Set(ids)];
}

/**
 * @param {string} question
 * @param {string} [wcIntent]
 * @param {string[]} [mentionedTeams]
 * @param {object | null | undefined} kv
 * @returns {string | null}
 */
export function buildGoalWcEditorialPromptBlock(question, wcIntent, mentionedTeams = [], kv) {
  const marketIds = selectGoalEditorialMarkets(question, wcIntent, mentionedTeams, kv);
  if (!marketIds.length) return null;

  const sections = [];
  for (const id of marketIds) {
    const block = marketBlockFromKv(id, kv);
    if (block) sections.push(block.join("\n"));
  }
  if (!sections.length) return null;

  return [
    GOAL_EDITORIAL_GOVERNANCE,
    ...sections,
  ].join("\n");
}

/**
 * @param {object | null | undefined} kv
 * @returns {string | null}
 */
export function buildGoalNbaFinalsEditorialPromptBlock(kv) {
  if (!kv?.markets?.nba_finals_series?.rows?.length || !isGoalEditorialFresh(kv)) {
    return null;
  }
  const page = kv.markets.nba_finals_series;
  const pub = page.publishedAt ? `published ${page.publishedAt}` : "publish date unknown";
  const lines = page.rows.map((r) => `  ${r.label}: ${r.odds}`);
  return [
    GOAL_EDITORIAL_GOVERNANCE,
    `NBA FINALS SERIES — Goal.com editorial (${pub}):`,
    ...lines,
    "Use for narrative/history corroboration only — prefer NBA FINALS SERIES ODDS block for binding prices.",
  ].join("\n");
}
