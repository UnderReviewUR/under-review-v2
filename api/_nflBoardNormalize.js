import { canonicalizeTeamAbbr } from "../shared/gameLineSpread.js";
import { impliedTwoWayFromAmerican, roundProb } from "../shared/nflOddsImplied.js";
import { NFL_PROPS_BOOK_IDS, nflPropsBookLabel } from "../shared/nflPropsConstants.js";

/**
 * @param {Record<string, unknown>} game
 */
function teamAbbrsFromGame(game) {
  const teams = Array.isArray(game?.teams) ? game.teams : [];
  const home = teams.find((t) => Number(t?.id) === Number(game?.home_team_id));
  const away = teams.find((t) => Number(t?.id) === Number(game?.away_team_id));
  return {
    homeAbbr: canonicalizeTeamAbbr(home?.abbr) || null,
    awayAbbr: canonicalizeTeamAbbr(away?.abbr) || null,
    homeName: home?.full_name ? String(home.full_name) : null,
    awayName: away?.full_name ? String(away.full_name) : null,
  };
}

/**
 * @param {Record<string, unknown>} game
 */
export function pickNflBookEventMarkets(game) {
  const marketsRoot = game?.markets;
  if (!marketsRoot || typeof marketsRoot !== "object") return null;
  for (const bookId of NFL_PROPS_BOOK_IDS) {
    const event = marketsRoot?.[String(bookId)]?.event;
    if (event && typeof event === "object") return { event, bookId };
  }
  for (const [bookKey, book] of Object.entries(marketsRoot)) {
    const event = book?.event;
    if (event && typeof event === "object") {
      return { event, bookId: Number(bookKey) || null };
    }
  }
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} side
 */
function rowForSide(rows, side) {
  const want = String(side).toLowerCase();
  return (rows || []).find((r) => String(r?.side || "").toLowerCase() === want) || null;
}

/**
 * @param {Array<Record<string, unknown>> | undefined} totalRows
 * @param {number | null} bookId
 */
export function normalizeNflTotalMarket(totalRows, bookId) {
  const over = rowForSide(totalRows, "over");
  const under = rowForSide(totalRows, "under");
  const line = Number(over?.value ?? under?.value);
  if (!Number.isFinite(line) || line <= 0) return null;
  const overOdds = Number(over?.odds);
  const underOdds = Number(under?.odds);
  const tw = impliedTwoWayFromAmerican(
    Number.isFinite(overOdds) ? overOdds : null,
    Number.isFinite(underOdds) ? underOdds : null,
  );
  return {
    line,
    overOdds: Number.isFinite(overOdds) ? overOdds : null,
    underOdds: Number.isFinite(underOdds) ? underOdds : null,
    overImplied: roundProb(tw?.aRaw),
    underImplied: roundProb(tw?.bRaw),
    overImpliedDevig: roundProb(tw?.aDevig),
    underImpliedDevig: roundProb(tw?.bDevig),
    bookId: bookId ?? null,
    book: nflPropsBookLabel(bookId),
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined} spreadRows
 * @param {number | null} bookId
 * @param {string | null} homeAbbr
 * @param {string | null} awayAbbr
 */
export function normalizeNflSpreadMarket(spreadRows, bookId, homeAbbr, awayAbbr) {
  const home = rowForSide(spreadRows, "home");
  const away = rowForSide(spreadRows, "away");
  if (!home && !away) return null;
  const homePoint = Number(home?.value);
  const awayPoint = Number(away?.value);
  const homeOdds = Number(home?.odds);
  const awayOdds = Number(away?.odds);
  const tw = impliedTwoWayFromAmerican(
    Number.isFinite(homeOdds) ? homeOdds : null,
    Number.isFinite(awayOdds) ? awayOdds : null,
  );
  const favoriteAbbr =
    Number.isFinite(homePoint) && homePoint < 0
      ? homeAbbr
      : Number.isFinite(awayPoint) && awayPoint < 0
        ? awayAbbr
        : homeAbbr;
  const favoritePoint =
    favoriteAbbr === homeAbbr
      ? homePoint
      : favoriteAbbr === awayAbbr
        ? awayPoint
        : homePoint;
  return {
    homeAbbr,
    awayAbbr,
    homePoint: Number.isFinite(homePoint) ? homePoint : null,
    awayPoint: Number.isFinite(awayPoint) ? awayPoint : null,
    homeOdds: Number.isFinite(homeOdds) ? homeOdds : null,
    awayOdds: Number.isFinite(awayOdds) ? awayOdds : null,
    homeImplied: roundProb(tw?.aRaw),
    awayImplied: roundProb(tw?.bRaw),
    homeImpliedDevig: roundProb(tw?.aDevig),
    awayImpliedDevig: roundProb(tw?.bDevig),
    favoriteAbbr: favoriteAbbr || null,
    displayLine:
      favoriteAbbr && Number.isFinite(favoritePoint)
        ? `${favoriteAbbr} ${favoritePoint > 0 ? `+${favoritePoint}` : favoritePoint}`
        : null,
    bookId: bookId ?? null,
    book: nflPropsBookLabel(bookId),
  };
}

/**
 * @param {Array<Record<string, unknown>> | undefined} mlRows
 * @param {number | null} bookId
 * @param {string | null} homeAbbr
 * @param {string | null} awayAbbr
 */
export function normalizeNflMoneylineMarket(mlRows, bookId, homeAbbr, awayAbbr) {
  const home = rowForSide(mlRows, "home");
  const away = rowForSide(mlRows, "away");
  if (!home && !away) return null;
  const homeOdds = Number(home?.odds);
  const awayOdds = Number(away?.odds);
  const tw = impliedTwoWayFromAmerican(
    Number.isFinite(homeOdds) ? homeOdds : null,
    Number.isFinite(awayOdds) ? awayOdds : null,
  );
  return {
    homeAbbr,
    awayAbbr,
    homeOdds: Number.isFinite(homeOdds) ? homeOdds : null,
    awayOdds: Number.isFinite(awayOdds) ? awayOdds : null,
    homeImplied: roundProb(tw?.aRaw),
    awayImplied: roundProb(tw?.bRaw),
    homeImpliedDevig: roundProb(tw?.aDevig),
    awayImpliedDevig: roundProb(tw?.bDevig),
    bookId: bookId ?? null,
    book: nflPropsBookLabel(bookId),
  };
}

/**
 * @param {Record<string, unknown>} game
 */
export function normalizeNflScoreboardGame(game) {
  const { homeAbbr, awayAbbr, homeName, awayName } = teamAbbrsFromGame(game);
  const picked = pickNflBookEventMarkets(game);
  const event = picked?.event || null;
  const bookId = picked?.bookId ?? null;
  const startTime = game?.start_time ? String(game.start_time) : null;
  const tipoffMs = startTime ? Date.parse(startTime) : null;
  const box = game?.boxscore && typeof game.boxscore === "object" ? game.boxscore : null;
  const awayScore = Number(box?.total_away_points);
  const homeScore = Number(box?.total_home_points);
  const period = Number(box?.period);
  const clock = box?.clock != null ? String(box.clock) : null;

  return {
    providerGameId: Number(game?.id) || null,
    awayAbbr,
    homeAbbr,
    awayName,
    homeName,
    startTime,
    tipoffMs: Number.isFinite(tipoffMs) ? tipoffMs : null,
    status: String(game?.status || game?.real_status || "scheduled"),
    statusDisplay: game?.status_display ? String(game.status_display) : null,
    seasonType: String(game?.type || ""),
    week: Number.isFinite(Number(game?.week)) ? Number(game.week) : null,
    season: Number.isFinite(Number(game?.season)) ? Number(game.season) : null,
    network: game?.broadcast?.network_short || game?.broadcast?.network || null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    period: Number.isFinite(period) && period > 0 ? period : null,
    clock,
    total: normalizeNflTotalMarket(event?.total, bookId),
    spread: normalizeNflSpreadMarket(event?.spread, bookId, homeAbbr, awayAbbr),
    moneyline: normalizeNflMoneylineMarket(event?.moneyline, bookId, homeAbbr, awayAbbr),
  };
}
