/**
 * Product surface visibility — hide broken or off-season sports from nav/home
 * without removing API routes or deep-link screens.
 */

/** @typedef {"home"|"worldcup"|"nba"|"nfl"|"cfb"|"laliga"|"f1"|"golf"|"tennis"|"mlb"|"ask"|"pro"} NavSportSlug */
/** @typedef {"nba"|"mlb"|"nfl"|"laliga"|"f1"|"tennis"|"golf"|"worldcup"} HomeTickerSportSlug */
/** @typedef {"nba"|"mlb"|"tennis"|"f1"|"golf"|"nflDraft"} HomeCardSportSlug */
/** @typedef {"mlb"|"tennis"|"nfl"} HomePromptSportSlug */
/** @typedef {"nba"|"worldcup"|"mlb"|"tennis"} DailyTakeSportSlug */

export const SITE_SPORT_VISIBILITY = Object.freeze({
  nav: Object.freeze({
    home: true,
    // WC 2026 tournament window closed — keep routes, hide product surface.
    worldcup: false,
    nba: false,
    nfl: true,
    cfb: false,
    laliga: true,
    golf: false,
    f1: false,
    tennis: false,
    mlb: false,
    ask: false,
    pro: false,
  }),
  homeTicker: Object.freeze({
    nba: false,
    worldcup: false,
    mlb: false,
    nfl: true,
    laliga: true,
    f1: false,
    tennis: false,
    golf: false,
  }),
  homeCards: Object.freeze({
    mlb: false,
    tennis: false,
    f1: false,
    golf: false,
    nflDraft: true,
  }),
  homePrompts: Object.freeze({
    mlb: false,
    tennis: false,
  }),
  todaySlate: Object.freeze({
    nba: false,
    mlb: false,
    tennis: false,
  }),
  dailyTake: Object.freeze({
    nba: false,
    worldcup: false,
    mlb: false,
    tennis: false,
  }),
});

/**
 * @param {NavSportSlug | string} slug
 */
export function isNavSportVisible(slug) {
  const key = String(slug || "").toLowerCase();
  if (!key) return false;
  return SITE_SPORT_VISIBILITY.nav[key] !== false;
}

/**
 * Sports that may own a Home / Ask UR Take when no explicit sport tab is open.
 * @param {string} slug
 */
export function isUrAskSportActive(slug) {
  const key = String(slug || "").toLowerCase();
  if (key === "nfl" || key === "laliga") return isNavSportVisible(key);
  return false;
}

/**
 * Remap World Cup detections off the live product surface.
 * Other sports keep their text identity (deep-link / explicit asks); only WC is killed.
 * Club-soccer prop language → La Liga when live.
 * @param {string | null | undefined} sport
 * @param {string} [question]
 */
export function coerceUrAskSportToLiveSurface(sport, question = "") {
  const s = String(sport || "").toLowerCase().trim();
  if (!s || s === "generic") return s || null;
  if (s !== "worldcup") return s;
  if (isNavSportVisible("worldcup")) return "worldcup";
  const q = String(question || "").toLowerCase();
  const clubSoccerProp =
    /\b(anytime\s+(?:goal\s*)?scorer|first\s+goal|shots?(?:\s+on\s+target)?|sot\b|btts|both teams to score|goalscorer|la liga|laliga)\b/i.test(
      q,
    );
  if (clubSoccerProp && isNavSportVisible("laliga")) return "laliga";
  return "generic";
}

/**
 * @param {HomeTickerSportSlug | string} slug
 */
export function isHomeTickerSportVisible(slug) {
  const key = String(slug || "").toLowerCase();
  if (!key) return false;
  return SITE_SPORT_VISIBILITY.homeTicker[key] !== false;
}

/**
 * @param {HomeCardSportSlug | string} slug
 */
export function isHomeCardSportVisible(slug) {
  const key = String(slug || "").toLowerCase();
  if (!key) return false;
  return SITE_SPORT_VISIBILITY.homeCards[key] !== false;
}

/**
 * @param {HomePromptSportSlug | string} slug
 */
export function isHomePromptSportVisible(slug) {
  const key = String(slug || "").toLowerCase();
  if (!key) return false;
  return SITE_SPORT_VISIBILITY.homePrompts[key] !== false;
}

/**
 * @param {string} slug
 */
export function isTodaySlateSportVisible(slug) {
  const key = String(slug || "").toLowerCase();
  if (!key) return true;
  if (SITE_SPORT_VISIBILITY.todaySlate[key] === false) return false;
  return true;
}

/**
 * @param {DailyTakeSportSlug | string} slug
 */
export function isDailyTakeSportVisible(slug) {
  const key = String(slug || "").toLowerCase();
  if (!key) return false;
  return SITE_SPORT_VISIBILITY.dailyTake[key] !== false;
}

/**
 * NFL UR Take chat. On whenever NFL is a visible sport (preseason + regular).
 * Hidden only if NFL nav is off.
 * @param {{ nflSeasonMode?: boolean }} [_opts]
 */
export function isNflUrTakeGated(_opts = {}) {
  return !isNavSportVisible("nfl");
}

export function isCfbUrTakeGated(_opts = {}) {
  return !isNavSportVisible("cfb");
}

export function isLaligaUrTakeGated(_opts = {}) {
  return !isNavSportVisible("laliga");
}

export function isWorldCupUrTakeGated(_opts = {}) {
  return !isNavSportVisible("worldcup");
}
