import { isNavSportVisible } from "../../../shared/siteSportVisibility.js";
import {
  buildLaligaEngageNudges,
  buildNflEngageNudges,
} from "../../../shared/homeEngageNudges.js";
import { nflFavoritePoint, nflGameMatchup } from "../../../shared/nflSlateTakes.js";

function laligaMatchup(m) {
  const away = m?.awayAbbr || m?.awayName || "Away";
  const home = m?.homeAbbr || m?.homeName || "Home";
  return `${away} @ ${home}`;
}

function formatAmericanOdds(n) {
  if (!Number.isFinite(Number(n))) return "";
  const v = Number(n);
  return v > 0 ? `+${v}` : String(v);
}

function formatNflSpreadLine(game) {
  const s = game?.spread;
  if (!s) return null;
  const pt = nflFavoritePoint(game);
  if (!Number.isFinite(pt)) return null;
  const fav =
    s.favoriteAbbr ||
    (Number(s.homePoint) < 0 ? game?.homeAbbr : null) ||
    (Number(s.awayPoint) < 0 ? game?.awayAbbr : null);
  if (!fav) return null;
  const signed = pt > 0 ? `+${pt}` : String(pt);
  return `${fav} ${signed}`;
}

function formatNflBoardLine(game) {
  const parts = [];
  const spread = formatNflSpreadLine(game);
  const total = game?.total?.point;
  if (spread) parts.push(spread);
  if (Number.isFinite(Number(total))) parts.push(`O/U ${total}`);
  return parts.length ? parts.join(" · ") : null;
}

function formatLaligaBoardLine(match) {
  const ml = match?.moneyline;
  if (!ml) return null;
  const parts = [];
  if (ml.home != null && match?.homeAbbr) {
    parts.push(`${match.homeAbbr} ${formatAmericanOdds(ml.home)}`);
  }
  if (ml.draw != null) parts.push(`Draw ${formatAmericanOdds(ml.draw)}`);
  if (ml.away != null && match?.awayAbbr) {
    parts.push(`${match.awayAbbr} ${formatAmericanOdds(ml.away)}`);
  }
  return parts.length ? parts.join(" / ") : null;
}

function pickNflFeatured(games) {
  const list = Array.isArray(games) ? games : [];
  return (
    list.find((g) => g?.spread?.homePoint != null || g?.spread?.awayPoint != null) ||
    list.find((g) => g?.total?.point != null) ||
    list[0] ||
    null
  );
}

function pickLaligaFeatured(matches) {
  const list = Array.isArray(matches) ? matches : [];
  return list.find((m) => m?.moneyline?.home != null || m?.moneyline?.away != null) || list[0] || null;
}

function propsForGame(propLines, game) {
  if (!game) return propLines || [];
  const matchup = nflGameMatchup(game);
  const pool = Array.isArray(propLines) ? propLines : [];
  const keyed = pool.filter((p) => {
    const g = String(p?.game || "");
    return g && (g === matchup || g.includes(game.awayAbbr) || g.includes(game.homeAbbr));
  });
  return keyed.length ? keyed : pool;
}

function propsForMatch(propLines, match) {
  if (!match) return propLines || [];
  const matchup = laligaMatchup(match);
  const eventId = match?.providerMatchId != null ? String(match.providerMatchId) : null;
  const pool = Array.isArray(propLines) ? propLines : [];
  const keyed = pool.filter((p) => {
    if (eventId && p?.eventId != null && String(p.eventId) === eventId) return true;
    const g = String(p?.game || "");
    return g && (g === matchup || g.includes(match.awayAbbr) || g.includes(match.homeAbbr));
  });
  return keyed.length ? keyed : pool;
}

/**
 * @param {{
 *   nflGames?: Array<Record<string, unknown>>,
 *   laligaMatches?: Array<Record<string, unknown>>,
 *   nflPropLines?: Array<Record<string, unknown>>,
 *   laligaPropLines?: Array<Record<string, unknown>>,
 *   nflUrTakeGated?: boolean,
 *   laligaUrTakeGated?: boolean,
 * }} input
 */
export function buildHomeEngageLanes(input = {}) {
  const lanes = [];
  const nflGames = input.nflGames || [];
  const laligaMatches = input.laligaMatches || [];
  const nflPropLines = input.nflPropLines || [];
  const laligaPropLines = input.laligaPropLines || [];

  if (isNavSportVisible("nfl") && !input.nflUrTakeGated && nflGames.length > 0) {
    const featured = pickNflFeatured(nflGames);
    const boardLine = featured ? formatNflBoardLine(featured) : null;
    const gameCount = nflGames.length;
    const prompts = buildNflEngageNudges(featured, propsForGame(nflPropLines, featured), 0);
    lanes.push({
      id: "nfl",
      sport: "nfl",
      leagueLabel: "NFL",
      meta: gameCount === 1 ? "1 game posted" : `${gameCount} games posted`,
      featuredMatchup: featured ? nflGameMatchup(featured) : null,
      boardLine,
      prompts,
    });
  }

  if (isNavSportVisible("laliga") && !input.laligaUrTakeGated && laligaMatches.length > 0) {
    const featured = pickLaligaFeatured(laligaMatches);
    const boardLine = featured ? formatLaligaBoardLine(featured) : null;
    const fixtureCount = laligaMatches.length;
    const prompts = buildLaligaEngageNudges(
      featured,
      propsForMatch(laligaPropLines, featured),
      10,
    );
    lanes.push({
      id: "laliga",
      sport: "laliga",
      leagueLabel: "La Liga",
      meta: fixtureCount === 1 ? "1 match posted" : `${fixtureCount} matches posted`,
      featuredMatchup: featured ? laligaMatchup(featured) : null,
      boardLine,
      prompts,
    });
  }

  return lanes;
}
