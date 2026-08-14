/**
 * Board-backed NFL slate card: three jobs, no logos.
 * First line is the take. THE PLAY stays on Ask, not this card.
 * Extra rows stay behind Pro. No vendor names. Numbers from the posted board.
 */

import { classifyNflGamePhase, formatNflGameStateLine } from "./nflGameState.js";

export const NFL_SLATE_TAKES_PRO_CTA = "Go Pro for more data-backed takes";
export const NFL_SLATE_TAKES_PRO_HINT =
  "Two more board-backed takes sit behind Pro. Unpack, shop the number, and see what we are passing.";
export const NFL_SLATE_TAKES_TITLE = "On this board";
export const NFL_SLATE_TAKES_SUB = "Three reads. Not three tickets.";

const KEY_SPREADS = new Set([2.5, 3, 3.5, 6, 6.5, 7, 7.5]);
const KEY_TOTALS = new Set([41, 41.5, 43, 43.5, 44, 44.5, 47, 47.5, 48, 48.5, 51, 51.5]);
const PLAY_SPREAD_MIN = 2.5;
const PLAY_SPREAD_MAX = 7.5;
const PASS_LAY_MIN = 9.5;

/**
 * @param {number | null | undefined} n
 */
function absNum(n) {
  return Number.isFinite(Number(n)) ? Math.abs(Number(n)) : null;
}

/**
 * @param {number | null | undefined} n
 */
function formatSigned(n) {
  if (!Number.isFinite(Number(n))) return "";
  const v = Number(n);
  return v > 0 ? `+${v}` : String(v);
}

/**
 * @param {number | null | undefined} p
 */
function formatPct(p) {
  if (p == null || !Number.isFinite(Number(p))) return null;
  return `${Math.round(Number(p) * 100)}%`;
}

/**
 * @param {Record<string, unknown>} game
 */
export function nflGameMatchup(game) {
  const away = String(game?.awayAbbr || "").trim() || "Away";
  const home = String(game?.homeAbbr || "").trim() || "Home";
  return `${away} @ ${home}`;
}

/**
 * @param {Record<string, unknown>} game
 */
export function nflFavoritePoint(game) {
  const s = game?.spread;
  if (!s) return null;
  if (s.favoriteAbbr && s.favoriteAbbr === game.homeAbbr) return Number(s.homePoint);
  if (s.favoriteAbbr && s.favoriteAbbr === game.awayAbbr) return Number(s.awayPoint);
  const home = Number(s.homePoint);
  const away = Number(s.awayPoint);
  if (Number.isFinite(home) && home < 0) return home;
  if (Number.isFinite(away) && away < 0) return away;
  return Number.isFinite(home) ? home : Number.isFinite(away) ? away : null;
}

/**
 * @param {Record<string, unknown>} game
 */
function favoriteImplied(game) {
  const s = game?.spread;
  if (!s) return null;
  if (s.favoriteAbbr === game?.homeAbbr) return s.homeImpliedDevig ?? s.homeImplied ?? null;
  if (s.favoriteAbbr === game?.awayAbbr) return s.awayImpliedDevig ?? s.awayImplied ?? null;
  const pt = nflFavoritePoint(game);
  if (Number.isFinite(pt) && pt < 0) {
    return game?.spread?.homePoint < 0
      ? s.homeImpliedDevig ?? s.homeImplied
      : s.awayImpliedDevig ?? s.awayImplied;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} game
 */
function juiceGap(game) {
  const s = game?.spread;
  const a = s?.homeImpliedDevig ?? s?.homeImplied;
  const b = s?.awayImpliedDevig ?? s?.awayImplied;
  if (a == null || b == null || !Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) return 0;
  return Math.abs(Number(a) - Number(b));
}

/**
 * @param {Record<string, unknown>} game
 */
function totalJuiceGap(game) {
  const t = game?.total;
  const a = t?.overImpliedDevig ?? t?.overImplied;
  const b = t?.underImpliedDevig ?? t?.underImplied;
  if (a == null || b == null || !Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) return 0;
  return Math.abs(Number(a) - Number(b));
}

/**
 * @param {Record<string, unknown>} game
 */
function isScheduledish(game) {
  const status = String(game?.status || "").toLowerCase();
  if (!status) return true;
  if (status === "final" || status === "closed" || status === "complete" || status === "completed") {
    return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} game
 */
function gameKey(game) {
  return String(game?.providerGameId || nflGameMatchup(game));
}

function laneState(game) {
  return {
    phase: classifyNflGamePhase(game),
    gameState: formatNflGameStateLine(game),
  };
}

/**
 * @param {Array<Record<string, unknown>>} games
 * @param {number} [nowMs]
 */
export function isNflPreseasonBoard(games, nowMs = Date.now()) {
  if ((games || []).some((g) => /pre/i.test(String(g?.seasonType || "")))) return true;
  const m = new Date(nowMs).getMonth();
  return m === 6 || m === 7;
}

/**
 * @param {Record<string, unknown>} game
 */
function playScore(game) {
  const pt = absNum(nflFavoritePoint(game));
  if (pt == null) return -1;
  let score = juiceGap(game) * 25;
  if (pt >= PLAY_SPREAD_MIN && pt <= PLAY_SPREAD_MAX) score += 12;
  else if (pt >= 1 && pt < PLAY_SPREAD_MIN) score += 4;
  else if (pt >= PASS_LAY_MIN) score -= 20;
  else score += 2;
  return score;
}

/**
 * @param {Record<string, unknown>} game
 */
function passScore(game) {
  const pt = absNum(nflFavoritePoint(game));
  let score = 0;
  if (pt != null && pt >= PASS_LAY_MIN) score += 16 + (pt - PASS_LAY_MIN);
  if (pt != null && pt <= 1.5 && juiceGap(game) < 0.06) score += 12;
  const tot = Number(game?.total?.line);
  if (Number.isFinite(tot) && totalJuiceGap(game) < 0.04) score += 6;
  return score;
}

/**
 * @param {Record<string, unknown>} game
 */
function watchScore(game) {
  const pt = absNum(nflFavoritePoint(game));
  let score = 0;
  if (pt != null && KEY_SPREADS.has(pt)) score += 14;
  const tot = Number(game?.total?.line);
  if (Number.isFinite(tot) && KEY_TOTALS.has(tot)) score += 10;
  if (pt === 3 || pt === 7) score += 4;
  return score;
}

/**
 * @param {Record<string, unknown>} game
 * @param {boolean} preseason
 */
function buildPlayLane(game, preseason) {
  const matchup = nflGameMatchup(game);
  if (preseason) {
    return {
      kind: "play",
      label: "",
      matchup,
      lean: "Don't bet these sides until inactives",
      why: "Preseason. Starters sit or go one series. Do not treat the posted favorite as a Week 1 ticket.",
      question: `Preseason ${matchup} — is there a real side or is it pass until inactives?`,
      gameKey: gameKey(game),
      ...laneState(game),
    };
  }
  const fav = String(game?.spread?.favoriteAbbr || game?.homeAbbr || "").trim() || "FAV";
  const pt = nflFavoritePoint(game);
  const lean = Number.isFinite(pt) ? `${fav} ${formatSigned(pt)}` : matchup;
  const pct = formatPct(favoriteImplied(game));
  const why = pct
    ? `Posted ${game?.spread?.displayLine || lean}. Market has ${fav} at ${pct} implied.`
    : `Posted. Cleanest number on the board. That's the one I'd take.`;
  return {
    kind: "play",
    label: "",
    matchup,
    lean,
    why,
    question: `Give me the sharpest lean on ${matchup}. Posted ${game?.spread?.displayLine || lean}. One play.`,
    gameKey: gameKey(game),
    ...laneState(game),
  };
}

/**
 * @param {Record<string, unknown>} game
 * @param {boolean} preseason
 */
function buildPassLane(game, preseason) {
  const matchup = nflGameMatchup(game);
  const pt = absNum(nflFavoritePoint(game));
  const fav = String(game?.spread?.favoriteAbbr || "").trim();
  let lean;
  let why;
  if (pt != null && pt >= PASS_LAY_MIN && fav) {
    lean = `Don't lay ${fav} ${formatSigned(nflFavoritePoint(game))}`;
    why = preseason
      ? `Double-digit favorite in August. Not a ticket.`
      : `Laying ${pt} is a trap number here. Walk.`;
  } else if (pt != null && pt <= 1.5) {
    lean = `Don't force a side`;
    why = `${matchup} is a pick-em. Do not invent a lean just to have one.`;
  } else {
    const tot = game?.total?.line;
    lean = Number.isFinite(Number(tot)) ? `Don't bet the ${tot} total` : `Don't bet this game`;
    why = `Juice is even. No edge worth a ticket.`;
  }
  return {
    kind: "pass",
    label: "",
    matchup,
    lean,
    why,
    question: `Should I pass ${matchup}? Tell me if this is a no-bet.`,
    gameKey: gameKey(game),
    ...laneState(game),
  };
}

/**
 * @param {Record<string, unknown>} game
 */
function buildWatchLane(game) {
  const matchup = nflGameMatchup(game);
  const pt = absNum(nflFavoritePoint(game));
  const tot = Number(game?.total?.line);
  let lean;
  let why;
  if (pt != null && KEY_SPREADS.has(pt)) {
    const fav = String(game?.spread?.favoriteAbbr || "").trim() || "FAV";
    lean = `${fav} ${formatSigned(nflFavoritePoint(game))}`;
    why =
      pt === 3 || pt === 7
        ? `Sitting on a key. Get it off ${pt} before you take a side.`
        : `Sits on a key number. Shop it before you bet it.`;
  } else if (Number.isFinite(tot) && KEY_TOTALS.has(tot)) {
    lean = `${tot} total`;
    why = `${tot} is a number worth shopping. Do not hit a bad juice just to be on it.`;
  } else {
    lean = game?.spread?.displayLine ? String(game.spread.displayLine) : matchup;
    why = `Number is live. Come back if it moves off this number.`;
  }
  return {
    kind: "watch",
    label: "",
    matchup,
    lean,
    why,
    question: `Is the ${game?.spread?.displayLine || tot || matchup} number still worth shopping in ${matchup}?`,
    gameKey: gameKey(game),
    ...laneState(game),
  };
}

/**
 * @param {Record<string, unknown>} game
 */
function buildTotalExtra(game) {
  const matchup = nflGameMatchup(game);
  const tot = Number(game?.total?.line);
  if (!Number.isFinite(tot)) return null;
  const over = game?.total?.overImpliedDevig ?? game?.total?.overImplied;
  const under = game?.total?.underImpliedDevig ?? game?.total?.underImplied;
  let lean = `Total ${tot}`;
  let why = `Posted ${tot}. Shop both sides before you pick a total.`;
  if (over != null && under != null && Number.isFinite(Number(over)) && Number.isFinite(Number(under))) {
    if (Number(under) >= Number(over) + 0.03) {
      lean = `Under ${tot}`;
      why = `Board juice leans under ${tot} (${formatPct(under)} implied).`;
    } else if (Number(over) >= Number(under) + 0.03) {
      lean = `Over ${tot}`;
      why = `Board juice leans over ${tot} (${formatPct(over)} implied).`;
    }
  }
  return {
    kind: "extra-total",
    label: "",
    matchup,
    lean,
    why,
    question: `Best total lean in ${matchup}? Posted ${tot}.`,
    gameKey: gameKey(game),
  };
}

/**
 * @param {Record<string, unknown>} game
 */
function buildAlsoPlayExtra(game) {
  const play = buildPlayLane(game, false);
  return {
    ...play,
    kind: "extra-play",
    label: "",
    question: play.question,
  };
}

/**
 * @param {Array<Record<string, unknown>>} games
 * @param {{ usedKeys?: Set<string>, preferUnused?: boolean }} [opts]
 */
function pickBest(games, scoreFn, opts = {}) {
  const used = opts.usedKeys || new Set();
  const preferUnused = opts.preferUnused !== false;
  let best = null;
  let bestScore = -Infinity;
  for (const game of games) {
    const score = scoreFn(game);
    if (!(score > 0)) continue;
    const unusedBoost = preferUnused && !used.has(gameKey(game)) ? 3 : 0;
    const ranked = score + unusedBoost;
    if (ranked > bestScore) {
      best = game;
      bestScore = ranked;
    }
  }
  return best;
}

/**
 * Build the free 3-lane card plus Pro extras from live NFL board games.
 * @param {Array<Record<string, unknown>> | null | undefined} games
 * @param {{ nowMs?: number, asOf?: string | null }} [opts]
 */
export function buildNflSlateTakes(games, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  const pool = (Array.isArray(games) ? games : []).filter(
    (g) => g && isScheduledish(g) && (g.spread || g.total || g.moneyline),
  );
  if (pool.length === 0) return null;

  const preseason = isNflPreseasonBoard(pool, nowMs);
  const used = new Set();

  const playGame = pickBest(pool, playScore, { usedKeys: used, preferUnused: false }) || pool[0];
  used.add(gameKey(playGame));
  const passGame = pickBest(pool, passScore, { usedKeys: used }) || playGame;
  used.add(gameKey(passGame));
  const watchGame = pickBest(pool, watchScore, { usedKeys: used }) || playGame;
  used.add(gameKey(watchGame));

  const lanes = [
    buildPlayLane(playGame, preseason),
    buildPassLane(passGame, preseason),
    buildWatchLane(watchGame),
  ];

  const extra = [];
  const remaining = pool.filter((g) => !used.has(gameKey(g)));
  const extraPool = remaining.length ? remaining : pool;

  const totalGame =
    extraPool.find((g) => g?.total?.line != null) || pool.find((g) => g?.total?.line != null);
  const totalLane = totalGame ? buildTotalExtra(totalGame) : null;
  if (totalLane) extra.push(totalLane);

  const alsoGame = extraPool.find(
    (g) => g?.spread && gameKey(g) !== gameKey(playGame) && gameKey(g) !== (totalLane?.gameKey || ""),
  );
  if (alsoGame && !preseason) extra.push(buildAlsoPlayExtra(alsoGame));

  return {
    ok: true,
    preseason,
    kicker: preseason ? "NFL · Preseason slate" : "Tonight",
    title: NFL_SLATE_TAKES_TITLE,
    subtitle: NFL_SLATE_TAKES_SUB,
    asOf: opts.asOf || null,
    lanes,
    extra: extra.slice(0, 2),
  };
}
