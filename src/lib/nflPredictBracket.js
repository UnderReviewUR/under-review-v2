const LS_KEY = "ur_nfl_2026_bracket";

/** @typedef {{ team: import("../data/nfl2026Teams.js").Nfl2026Team, seed: number }} BracketSlot */

/**
 * @typedef {{
 *   id: string,
 *   home: BracketSlot | null,
 *   away: BracketSlot | null,
 *   winner: string | null,
 * }} BracketGame
 */

/**
 * @typedef {{
 *   seeds: { seed: number, team: import("../data/nfl2026Teams.js").Nfl2026Team }[],
 *   wildCard: BracketGame[],
 *   divisional: BracketGame[],
 *   championship: BracketGame,
 * }} ConferenceBracket
 */

/**
 * @typedef {{
 *   seedFingerprint: string,
 *   afc: ConferenceBracket,
 *   nfc: ConferenceBracket,
 *   superBowl: BracketGame,
 * }} BracketState
 */

/** @param {import("./nflPredictPlayoffs.js").getPlayoffPicture extends (...args: any) => infer R ? R : never} playoffPicture */
export function bracketSeedFingerprint(playoffPicture) {
  const line = (side) =>
    (playoffPicture[side]?.seeds || [])
      .map((s) => `${s.seed}:${s.team?.abbr || "?"}`)
      .join(",");
  return `afc:${line("afc")}|nfc:${line("nfc")}`;
}

/** @param {ReturnType<typeof import("./nflPredictPlayoffs.js").getPlayoffPicture>["afc"]} side */
function buildConferenceBracket(side, prefix) {
  const seeds = (side.seeds || [])
    .filter((s) => s.team)
    .map((s) => ({ seed: s.seed, team: s.team }));

  const bySeed = (n) => seeds.find((s) => s.seed === n)?.team ?? null;

  const mk = (id, homeSeed, awaySeed) => ({
    id,
    home: bySeed(homeSeed) ? { team: bySeed(homeSeed), seed: homeSeed } : null,
    away: bySeed(awaySeed) ? { team: bySeed(awaySeed), seed: awaySeed } : null,
    winner: null,
  });

  return {
    seeds,
    wildCard: [
      mk(`${prefix}-wc-1`, 2, 7),
      mk(`${prefix}-wc-2`, 3, 6),
      mk(`${prefix}-wc-3`, 4, 5),
    ],
    divisional: [
      { id: `${prefix}-div-1`, home: null, away: null, winner: null },
      { id: `${prefix}-div-2`, home: null, away: null, winner: null },
    ],
    championship: { id: `${prefix}-champ`, home: null, away: null, winner: null },
  };
}

/** @param {ReturnType<typeof import("./nflPredictPlayoffs.js").getPlayoffPicture>} playoffPicture */
export function initBracket(playoffPicture) {
  const bracket = {
    seedFingerprint: bracketSeedFingerprint(playoffPicture),
    afc: buildConferenceBracket(playoffPicture.afc, "afc"),
    nfc: buildConferenceBracket(playoffPicture.nfc, "nfc"),
    superBowl: { id: "super-bowl", home: null, away: null, winner: null },
  };
  return fillAdvancementSlots(bracket);
}

/** @param {BracketState} bracket */
function cloneBracket(bracket) {
  return JSON.parse(JSON.stringify(bracket));
}

/** @param {BracketGame} game */
function winnerTeam(game) {
  if (!game?.winner) return null;
  const slot = game.home?.team?.abbr === game.winner ? game.home : game.away?.team?.abbr === game.winner ? game.away : null;
  return slot?.team ?? null;
}

/** @param {BracketGame} game @param {string} abbr */
function setGameWinner(game, abbr) {
  const ok = game.home?.team?.abbr === abbr || game.away?.team?.abbr === abbr;
  game.winner = ok ? abbr : null;
}

/** @param {BracketGame} game */
function invalidateWinnerIfAbsent(game) {
  if (!game?.winner) return;
  const ok = game.home?.team?.abbr === game.winner || game.away?.team?.abbr === game.winner;
  if (!ok) game.winner = null;
}

/**
 * Official NFL divisional reseeding after the Wild Card round.
 *
 * Rules:
 * - #1 seed hosts the lowest remaining seed (highest seed number among WC winners).
 * - The other two winners play each other; higher seed hosts.
 * - Pairings are assigned only once all three Wild Card winners are known
 *   (NFL reseeds after the full Wild Card slate, not game-by-game).
 *
 * @param {BracketSlot | null} seed1
 * @param {Array<BracketSlot | null>} wcWinnerSlots
 * @returns {{
 *   div1Home: BracketSlot | null,
 *   div1Away: BracketSlot | null,
 *   div2Home: BracketSlot | null,
 *   div2Away: BracketSlot | null,
 * }}
 */
export function reseedDivisionalRound(seed1, wcWinnerSlots) {
  const div1Home = seed1 ? { team: seed1.team, seed: seed1.seed } : null;
  const winners = (wcWinnerSlots || []).filter((s) => s?.team && Number.isFinite(s.seed));

  if (!div1Home || winners.length !== 3) {
    return { div1Home, div1Away: null, div2Home: null, div2Away: null };
  }

  // Lowest remaining seed = worst among remaining = max seed number.
  const rankedWorstFirst = winners.slice().sort((a, b) => b.seed - a.seed || a.team.abbr.localeCompare(b.team.abbr));
  const lowestRemaining = rankedWorstFirst[0];
  const others = rankedWorstFirst
    .slice(1)
    .sort((a, b) => a.seed - b.seed || a.team.abbr.localeCompare(b.team.abbr));

  return {
    div1Home,
    div1Away: { team: lowestRemaining.team, seed: lowestRemaining.seed },
    div2Home: { team: others[0].team, seed: others[0].seed },
    div2Away: { team: others[1].team, seed: others[1].seed },
  };
}

/** @param {ConferenceBracket} conf @param {import("../data/nfl2026Teams.js").Nfl2026Team} team */
function slotForTeam(conf, team) {
  const seed = conf.seeds.find((s) => s.team?.abbr === team.abbr)?.seed ?? 0;
  return { team, seed };
}

/** @param {ConferenceBracket} conf */
function fillConferenceAdvancement(conf) {
  const seed1Entry = conf.seeds.find((s) => s.seed === 1);
  const seed1 = seed1Entry?.team ? { team: seed1Entry.team, seed: 1 } : null;
  const wcWinnerSlots = conf.wildCard.map((g) => {
    const t = g.winner ? winnerTeam(g) : null;
    return t ? slotForTeam(conf, t) : null;
  });

  const reseeded = reseedDivisionalRound(seed1, wcWinnerSlots);
  const div1 = conf.divisional[0];
  const div2 = conf.divisional[1];
  div1.home = reseeded.div1Home;
  div1.away = reseeded.div1Away;
  div2.home = reseeded.div2Home;
  div2.away = reseeded.div2Away;
  // Reseed can move teams between divisional games; drop stale winners.
  invalidateWinnerIfAbsent(div1);
  invalidateWinnerIfAbsent(div2);

  const dWinners = conf.divisional.map((g) => (g.winner ? winnerTeam(g) : null));
  const champ = conf.championship;
  if (dWinners[0] && dWinners[1]) {
    const s0 = conf.seeds.find((s) => s.team.abbr === dWinners[0].abbr)?.seed ?? 99;
    const s1 = conf.seeds.find((s) => s.team.abbr === dWinners[1].abbr)?.seed ?? 99;
    const high = s0 <= s1 ? dWinners[0] : dWinners[1];
    const low = s0 <= s1 ? dWinners[1] : dWinners[0];
    champ.home = { team: high, seed: Math.min(s0, s1) };
    champ.away = { team: low, seed: Math.max(s0, s1) };
  } else if (dWinners[0]) {
    champ.home = { team: dWinners[0], seed: conf.seeds.find((s) => s.team.abbr === dWinners[0].abbr)?.seed ?? 0 };
    champ.away = null;
  } else if (dWinners[1]) {
    champ.home = { team: dWinners[1], seed: conf.seeds.find((s) => s.team.abbr === dWinners[1].abbr)?.seed ?? 0 };
    champ.away = null;
  } else {
    champ.home = null;
    champ.away = null;
  }
  invalidateWinnerIfAbsent(champ);
}

/** @param {ConferenceBracket} conf */
function championshipWinnerSlot(conf) {
  const c = conf.championship;
  if (!c.winner) return null;
  if (c.home?.team?.abbr === c.winner) return c.home;
  if (c.away?.team?.abbr === c.winner) return c.away;
  return null;
}

/** @param {BracketState} bracket */
function fillAdvancementSlots(bracket) {
  fillConferenceAdvancement(bracket.afc);
  fillConferenceAdvancement(bracket.nfc);

  const sb = bracket.superBowl;
  const afcSlot = championshipWinnerSlot(bracket.afc);
  const nfcSlot = championshipWinnerSlot(bracket.nfc);
  sb.home = afcSlot ? { team: afcSlot.team, seed: afcSlot.seed } : null;
  sb.away = nfcSlot ? { team: nfcSlot.team, seed: nfcSlot.seed } : null;
  invalidateWinnerIfAbsent(sb);

  return bracket;
}

// Any Wild Card result can reshuffle BOTH divisional games under NFL reseeding,
// so WC changes must clear both divisional winners (not just one fixed slot).
const DOWNSTREAM = {
  "afc-wc-1": ["afc-div-1", "afc-div-2", "afc-champ", "super-bowl"],
  "afc-wc-2": ["afc-div-1", "afc-div-2", "afc-champ", "super-bowl"],
  "afc-wc-3": ["afc-div-1", "afc-div-2", "afc-champ", "super-bowl"],
  "afc-div-1": ["afc-champ", "super-bowl"],
  "afc-div-2": ["afc-champ", "super-bowl"],
  "afc-champ": ["super-bowl"],
  "nfc-wc-1": ["nfc-div-1", "nfc-div-2", "nfc-champ", "super-bowl"],
  "nfc-wc-2": ["nfc-div-1", "nfc-div-2", "nfc-champ", "super-bowl"],
  "nfc-wc-3": ["nfc-div-1", "nfc-div-2", "nfc-champ", "super-bowl"],
  "nfc-div-1": ["nfc-champ", "super-bowl"],
  "nfc-div-2": ["nfc-champ", "super-bowl"],
  "nfc-champ": ["super-bowl"],
  "super-bowl": [],
};

/** @param {BracketState} bracket @param {string} gameId */
function clearDownstreamWinners(bracket, gameId) {
  const ids = DOWNSTREAM[gameId] || [];
  for (const id of ids) {
    if (id === "super-bowl") {
      bracket.superBowl.winner = null;
      continue;
    }
    if (id.endsWith("-champ")) {
      const conf = id.startsWith("afc") ? bracket.afc : bracket.nfc;
      conf.championship.winner = null;
      continue;
    }
    const conf = id.startsWith("afc") ? bracket.afc : bracket.nfc;
    const div = conf.divisional.find((g) => g.id === id);
    if (div) div.winner = null;
  }
}

/** @param {BracketState} bracket @param {string} gameId */
function findGame(bracket, gameId) {
  if (gameId === "super-bowl") return bracket.superBowl;
  const conf = gameId.startsWith("afc") ? bracket.afc : bracket.nfc;
  const wc = conf.wildCard.find((g) => g.id === gameId);
  if (wc) return wc;
  const div = conf.divisional.find((g) => g.id === gameId);
  if (div) return div;
  if (conf.championship.id === gameId) return conf.championship;
  return null;
}

/** @param {BracketState} bracket @param {string} gameId @param {string} winnerAbbr */
export function pickBracketGame(bracket, gameId, winnerAbbr) {
  const next = cloneBracket(bracket);
  const game = findGame(next, gameId);
  if (!game) return next;

  const prevWinner = game.winner;
  setGameWinner(game, winnerAbbr);
  if (prevWinner !== game.winner) {
    clearDownstreamWinners(next, gameId);
  }
  return fillAdvancementSlots(next);
}

/** @param {BracketState} bracket */
export function getBracketWinner(bracket) {
  if (!bracket?.superBowl?.winner) return null;
  return winnerTeam(bracket.superBowl);
}

/** @param {BracketState} bracket */
export function collectBracketWinners(bracket) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const conf of [bracket.afc, bracket.nfc]) {
    for (const g of [...conf.wildCard, ...conf.divisional, conf.championship]) {
      if (g.winner) out[g.id] = g.winner;
    }
  }
  if (bracket.superBowl.winner) out[bracket.superBowl.id] = bracket.superBowl.winner;
  return out;
}

/** @param {BracketState} bracket */
export function saveBracket(bracket) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      seedFingerprint: bracket.seedFingerprint,
      winners: collectBracketWinners(bracket),
    };
    window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** @returns {{ seedFingerprint: string, winners: Record<string, string> } | null} */
export function loadBracket() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.seedFingerprint || typeof data.winners !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {BracketState} base @param {{ winners: Record<string, string> }} saved */
export function mergeSavedBracket(base, saved) {
  let b = base;
  const order = [
    ...base.afc.wildCard.map((g) => g.id),
    ...base.nfc.wildCard.map((g) => g.id),
    ...base.afc.divisional.map((g) => g.id),
    ...base.nfc.divisional.map((g) => g.id),
    "afc-champ",
    "nfc-champ",
    "super-bowl",
  ];
  for (const id of order) {
    const abbr = saved.winners[id];
    if (abbr) b = pickBracketGame(b, id, abbr);
  }
  return b;
}

export function clearSavedBracket() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
