/**
 * Game-price asks (total, spread, moneyline) answer from the posted GOAT line.
 * They never become a player-prop watch list.
 */
import { parseNflFirstAsk } from "./nflAskParse.js";
import { matchupGameForScope } from "./nflAskPropTrim.js";

/**
 * @param {unknown} n
 * @returns {string|null}
 */
function formatAmerican(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || Math.abs(v) < 100) return null;
  return v > 0 ? `+${v}` : String(v);
}

/**
 * @param {Array<Record<string, unknown>>} games
 * @param {string[]} teams
 */
function gameForAsk(games, teams) {
  const list = Array.isArray(games) ? games : [];
  if (teams.length >= 2) {
    const hit = matchupGameForScope(list, teams);
    if (hit) return hit;
  }
  return list[0] || null;
}

/**
 * @param {Record<string, unknown>|null} game
 * @param {Record<string, unknown>|null} briefcase
 */
/**
 * @param {Record<string, unknown>|null|undefined} team
 */
function teamRates(team) {
  if (!team || typeof team !== "object") return null;
  const scored = Number(team.ptsScored);
  const allowed = Number(
    team.livePtsAllowed != null ? team.livePtsAllowed : team.overall?.ptsAllowed,
  );
  const games = Number(team.gamesPlayed);
  if (!Number.isFinite(scored) || !Number.isFinite(allowed)) return null;
  if (Number.isFinite(games) && games < 1) return null;
  return { scored, allowed, games: Number.isFinite(games) ? games : null };
}

/**
 * Each club's points = average of what they score and what the other side allows.
 * @param {{ scored: number, allowed: number }} away
 * @param {{ scored: number, allowed: number }} home
 */
function blendMatchup(away, home) {
  const awayPts = (away.scored + home.allowed) / 2;
  const homePts = (home.scored + away.allowed) / 2;
  return { awayPts, homePts, total: awayPts + homePts };
}

/**
 * @param {number} n
 */
function oneDecimal(n) {
  return Math.round(n * 10) / 10;
}

function oddsRowForGame(game, briefcase) {
  const id = game?.providerGameId != null ? String(game.providerGameId) : "";
  if (!id) return null;
  const rows = Array.isArray(briefcase?.slate?.odds) ? briefcase.slate.odds : [];
  return rows.find((row) => String(row?.game_id) === id) || null;
}

/**
 * @param {{
 *   question?: string,
 *   games?: Array<Record<string, unknown>>,
 *   briefcase?: Record<string, unknown>|null,
 * }} [opts]
 */
export function buildNflGamePriceTake(opts = {}) {
  const question = String(opts.question || "");
  const ask = parseNflFirstAsk(question);
  const marketId = ask.lane === "game_price" ? ask.marketId : "total";
  const game = gameForAsk(opts.games, ask.teams);
  const away = String(game?.awayAbbr || ask.teams[0] || "").toUpperCase();
  const home = String(game?.homeAbbr || ask.teams[1] || "").toUpperCase();
  const matchup = away && home ? `${away} @ ${home}` : "this game";
  const odds = oddsRowForGame(game, opts.briefcase || null);

  const totalLine = Number(game?.total?.line ?? odds?.total?.line);
  const spreadLabel = String(game?.spread?.displayLine || "").trim();
  const overOdds = formatAmerican(game?.total?.overOdds ?? odds?.total?.overOdds);
  const underOdds = formatAmerican(game?.total?.underOdds ?? odds?.total?.underOdds);
  const defense = opts.briefcase?.league?.teamDefense || {};
  const awayRates = teamRates(defense[away]);
  const homeRates = teamRates(defense[home]);
  const blend = awayRates && homeRates ? blendMatchup(awayRates, homeRates) : null;
  const sampleGames = [awayRates?.games, homeRates?.games].filter((n) => Number.isFinite(n));
  const thinSample = sampleGames.length > 0 && Math.min(...sampleGames) < 4;
  const blendSentence = blend
    ? `${away} scores ${oneDecimal(awayRates.scored)} and ${home} allows ${oneDecimal(homeRates.allowed)}. ${home} scores ${oneDecimal(homeRates.scored)} and ${away} allows ${oneDecimal(awayRates.allowed)}. That blend is ${oneDecimal(blend.total)}.`
    : "";

  /** @type {string} */
  let call = "PASS";
  /** @type {string} */
  let lean;
  /** @type {string} */
  let whyNow;
  /** @type {string} */
  let edge;
  /** @type {string} */
  let marketContext;
  /** @type {string} */
  let statisticalEdge = blendSentence || "No team scoring rates on this matchup yet.";

  if (marketId === "spread") {
    const favorite = String(game?.spread?.favoriteAbbr || "").toUpperCase();
    const points = Number(game?.spread?.favoritePoint);
    const marketHomeMargin =
      favorite && Number.isFinite(points)
        ? favorite === home
          ? -points
          : points
        : null;
    const gap =
      blend && marketHomeMargin != null ? blend.homePts - blend.awayPts - marketHomeMargin : null;
    if (!spreadLabel) {
      lean = `Lean: Pass. No posted spread for ${matchup}.`;
      whyNow = `GOAT has no spread on ${matchup} yet. Not inventing one.`;
      edge = `Pass until ${matchup} has a posted spread.`;
      marketContext = "Spread not posted.";
    } else if (gap != null && gap >= 2) {
      call = favorite === home ? `${home} -${points}` : `${home} +${points}`;
      lean = `Lean: ${call}.`;
      whyNow = `${blendSentence} Posted spread is ${spreadLabel}. The blend has ${home} about ${oneDecimal(Math.abs(gap))} points better than that number.`;
      edge = `A turnover margin the other way kills the cover.`;
      marketContext = `Posted spread ${spreadLabel}.`;
    } else if (gap != null && gap <= -2) {
      call = favorite === home ? `${away} +${points}` : `${away} -${points}`;
      lean = `Lean: ${call}.`;
      whyNow = `${blendSentence} Posted spread is ${spreadLabel}. The blend misses that number by about ${oneDecimal(Math.abs(gap))} points.`;
      edge = `A blowout script the other way kills the dog.`;
      marketContext = `Posted spread ${spreadLabel}.`;
    } else {
      lean = `Lean: Pass on ${spreadLabel}.`;
      whyNow = blend
        ? `${blendSentence} Posted spread is ${spreadLabel}. The blend is inside two points of that number.`
        : `Posted spread is ${spreadLabel}. No team scoring rates yet, so there is no side.`;
      edge = `Pass on ${matchup} ${spreadLabel} until the blend is two points off the number.`;
      marketContext = `Posted spread ${spreadLabel}.`;
    }
  } else if (marketId === "moneyline") {
    const homeMl = formatAmerican(game?.moneyline?.home ?? odds?.moneyline?.home);
    const awayMl = formatAmerican(game?.moneyline?.away ?? odds?.moneyline?.away);
    const bits = [
      away && awayMl ? `${away} ${awayMl}` : "",
      home && homeMl ? `${home} ${homeMl}` : "",
    ].filter(Boolean);
    const margin = blend ? blend.homePts - blend.awayPts : null;
    if (!bits.length && margin == null) {
      lean = `Lean: Pass. No posted moneyline for ${matchup}.`;
      whyNow = `GOAT has no moneyline on ${matchup} yet. Not inventing one.`;
      edge = `Pass until ${matchup} has a posted moneyline.`;
      marketContext = "Moneyline not posted.";
    } else if (margin != null && margin >= 3) {
      call = home;
      lean = `Lean: ${home}.`;
      whyNow = `${blendSentence} ${home} is the side by about ${oneDecimal(margin)} points.`;
      edge = `A one-score game kills a moneyline that needs a margin.`;
      marketContext = bits.join(", ") || "Moneyline posted.";
    } else if (margin != null && margin <= -3) {
      call = away;
      lean = `Lean: ${away}.`;
      whyNow = `${blendSentence} ${away} is the side by about ${oneDecimal(Math.abs(margin))} points.`;
      edge = `A one-score game kills a moneyline that needs a margin.`;
      marketContext = bits.join(", ") || "Moneyline posted.";
    } else {
      lean = `Lean: Pass on the ${matchup} moneyline.`;
      whyNow = blend
        ? `${blendSentence} The blend is inside a field goal, so the moneyline is a pass.`
        : `Posted moneyline is ${bits.join(", ") || "missing"}. No scoring rates yet.`;
      edge = `Pass on ${matchup} moneyline until the blend is a field goal or more.`;
      marketContext = bits.join(", ") || "Moneyline not posted.";
    }
  } else if (!Number.isFinite(totalLine)) {
    lean = `Lean: Pass. No posted total for ${matchup}.`;
    whyNow = `GOAT has no total on ${matchup} yet. Not inventing one.`;
    edge = `Pass until ${matchup} has a posted total.`;
    marketContext = "Total not posted.";
  } else if (blend && blend.total - totalLine >= 2) {
    call = `OVER ${totalLine}`;
    lean = `Lean: Over ${totalLine}.`;
    const priceBit = overOdds && underOdds ? ` Price is over ${overOdds}, under ${underOdds}.` : "";
    whyNow = `${blendSentence} Posted total is ${totalLine}.${priceBit}`;
    edge = `A grind or a pulled starter kills the over.`;
    marketContext = overOdds && underOdds ? `Over ${overOdds}, under ${underOdds}.` : `Posted total ${totalLine}.`;
  } else if (blend && totalLine - blend.total >= 2) {
    call = `UNDER ${totalLine}`;
    lean = `Lean: Under ${totalLine}.`;
    const priceBit = overOdds && underOdds ? ` Price is over ${overOdds}, under ${underOdds}.` : "";
    whyNow = `${blendSentence} Posted total is ${totalLine}.${priceBit}`;
    edge = `A shootout or a defensive bust kills the under.`;
    marketContext = overOdds && underOdds ? `Over ${overOdds}, under ${underOdds}.` : `Posted total ${totalLine}.`;
  } else {
    lean = `Lean: Pass on ${totalLine}.`;
    const priceBit = overOdds && underOdds ? ` Over ${overOdds}, under ${underOdds}.` : "";
    whyNow = blend
      ? `${blendSentence} Posted total is ${totalLine}.${priceBit} The blend is inside two points of that number.`
      : `Posted total is ${totalLine}.${priceBit} No team scoring rates yet, so there is no side.`;
    edge = `Pass on ${matchup} total ${totalLine} until the blend is two points off the number.`;
    marketContext = priceBit.trim() || `Posted total ${totalLine}.`;
  }

  const frame = [
    spreadLabel ? `spread ${spreadLabel}` : "",
    Number.isFinite(totalLine) ? `total ${totalLine}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    sport: "NFL",
    call,
    callType: marketId,
    confidence: "Speculative",
    lean,
    whyNow,
    edge,
    analysis: {
      matchupAnalysis: frame
        ? `${matchup}. Game price: ${frame}.`
        : `${matchup}. Game price not posted.`,
      injuryContext: "Confirm inactives once they post (~90 min before kick).",
      marketContext,
      lineMovement: "Stick to the posted number. A full point is a new bet.",
      statisticalEdge,
    },
    caveats: [
      thinSample
        ? "Early-season scoring rates. A couple of games can swing the blend."
        : "Game number only. Not a player prop.",
    ],
    timestamp: new Date().toISOString(),
  };
}
