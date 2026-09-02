/**
 * Home engage chips — specific board-backed nudges (props + team bets).
 * Display text should read like a tip; prompt opens UR Take for bet / fade / pass.
 */

import { nflFavoritePoint, nflGameMatchup } from "./nflSlateTakes.js";

/** @typedef {{ id: string, kind: string, text: string, prompt: string, sportHint: string }} HomeEngageNudge */

const NFL_PROP_PRIORITY = [
  /pass(ing)?_touchdown|pass_tds?/,
  /anytime_td|anytime_touchdown/,
  /pass(ing)?_yard|pass_yds/,
  /rush(ing)?_yard|rush_yds/,
  /rec(eiv)?(ing)?_yard|rec_yds/,
  /receptions?/,
];

const LALIGA_PROP_PRIORITY = [/anytime.*goal|goal.*scorer|goals/, /shots?_on_target|sot/, /assists?/];

const PROP_LABEL = {
  passing_touchdowns: "passing TDs",
  passing_tds: "passing TDs",
  pass_tds: "passing TDs",
  pass_td: "passing TDs",
  passing_yards: "passing yards",
  pass_yds: "passing yards",
  passing_yard: "passing yards",
  rushing_yards: "rushing yards",
  rush_yds: "rushing yards",
  receiving_yards: "receiving yards",
  rec_yds: "receiving yards",
  receptions: "receptions",
  anytime_td: "anytime TD",
  anytime_touchdown: "anytime TD",
  goals: "goals",
  anytime_goal: "anytime goal",
  anytime_goal_scorer: "anytime goal",
  shots_on_target: "shots on target",
};

function normalizePropRaw(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function propLabel(propRaw, propDisplay) {
  const key = normalizePropRaw(propRaw);
  if (PROP_LABEL[key]) return PROP_LABEL[key];
  const display = String(propDisplay || "").trim();
  if (display) return display.toLowerCase();
  return key.replace(/_/g, " ") || "prop";
}

function lastName(player) {
  const parts = String(player || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "Player";
  return parts[parts.length - 1];
}

function formatLine(line) {
  const n = Number(line);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function formatSignedSpread(n) {
  if (!Number.isFinite(Number(n))) return "";
  const v = Number(n);
  return v > 0 ? `+${v}` : String(v);
}

function dayOffset(seed = 0) {
  const d = new Date();
  return (
    Number(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`,
    ) + seed
  );
}

function propPriorityScore(propRaw, patterns) {
  const r = normalizePropRaw(propRaw);
  for (let i = 0; i < patterns.length; i += 1) {
    if (patterns[i].test(r)) return patterns.length - i;
  }
  return 0;
}

function pickPropLean(row, seed = 0) {
  const over = row?.overImpliedDevig != null ? Number(row.overImpliedDevig) : null;
  const under = row?.underImpliedDevig != null ? Number(row.underImpliedDevig) : null;
  if (over != null && under != null) {
    if (over >= under + 0.03) return "over";
    if (under >= over + 0.03) return "under";
  }
  return dayOffset(seed) % 2 === 0 ? "over" : "under";
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ seed?: number, sport?: string }} [opts]
 */
export function formatPropNudge(row, opts = {}) {
  const player = lastName(row?.player);
  const line = formatLine(row?.line);
  const label = propLabel(row?.propRaw, row?.prop);
  if (!player || !line || !label) return null;

  const lean = pickPropLean(row, opts.seed ?? 0);
  const game = row?.game ? ` (${row.game})` : "";

  let text;
  let prompt;
  if (lean === "under") {
    text = `Fade ${player} over ${line} ${label}?`;
    prompt = `I'm looking at ${player} ${line} ${label}${game}. Should I fade the over, take the under, or pass? One lean with the why.`;
  } else {
    text = `${player} over ${line} ${label}?`;
    prompt = `Should I bet ${player} over ${line} ${label}${game}? Bet it, fade it, or pass — one direct lean.`;
  }

  return {
    kind: lean === "under" ? "FADE" : "PROP",
    text,
    prompt,
  };
}

/**
 * @param {Array<Record<string, unknown>>} propLines
 * @param {{ patterns?: RegExp[], seed?: number, limit?: number }} [opts]
 */
export function pickBestPropRows(propLines, opts = {}) {
  const patterns = opts.patterns || NFL_PROP_PRIORITY;
  const limit = opts.limit ?? 1;
  const seen = new Set();
  const ranked = (Array.isArray(propLines) ? propLines : [])
    .filter((row) => row?.player && Number.isFinite(Number(row?.line)))
    .map((row, idx) => ({
      row,
      score: propPriorityScore(row.propRaw || row.prop, patterns) * 10 - idx * 0.01,
    }))
    .filter(({ row, score }) => {
      if (score <= 0) return false;
      const key = `${String(row.player).toLowerCase()}|${normalizePropRaw(row.propRaw || row.prop)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit).map(({ row }) => row);
}

/**
 * @param {Record<string, unknown>} game
 * @param {number} [seed]
 */
export function formatNflTeamNudge(game, seed = 0) {
  if (!game) return null;
  const matchup = nflGameMatchup(game);
  const pt = nflFavoritePoint(game);
  const total = Number(game?.total?.point ?? game?.total?.line);
  const fav = String(game?.spread?.favoriteAbbr || "").trim();
  const offset = dayOffset(seed);

  if (Number.isFinite(pt) && fav && offset % 3 !== 2) {
    const signed = formatSignedSpread(pt);
    const templates =
      offset % 2 === 0
        ? [`Lay ${fav} ${signed}?`, `${fav} ${signed} — worth it?`]
        : [`Fade ${fav} ${signed}?`, `Pass on ${fav} ${signed}?`];
    const text = templates[offset % templates.length];
    return {
      kind: text.startsWith("Fade") || text.startsWith("Pass") ? "FADE" : "TEAM",
      text,
      prompt: `On ${matchup}, the spread is ${fav} ${signed}. Should I bet it, fade it, or pass? One lean.`,
    };
  }

  if (Number.isFinite(total)) {
    const overFirst = offset % 2 === 0;
    const text = overFirst ? `Over ${total} in ${matchup}?` : `Under ${total} — trap total?`;
    return {
      kind: overFirst ? "TEAM" : "FADE",
      text,
      prompt: `On ${matchup}, the total is ${total}. Over, under, or pass? Give me the lean.`,
    };
  }

  return {
    kind: "TEAM",
    text: `Side in ${matchup}?`,
    prompt: `What's the sharpest side or total lean on ${matchup}? Bet, fade, or pass.`,
  };
}

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

/**
 * @param {Record<string, unknown>} match
 * @param {number} [seed]
 */
export function formatLaligaTeamNudge(match, seed = 0) {
  if (!match) return null;
  const matchup = laligaMatchup(match);
  const ml = match?.moneyline;
  const offset = dayOffset(seed);

  if (ml && (ml.home != null || ml.away != null)) {
    const home = match?.homeAbbr || "HOME";
    const away = match?.awayAbbr || "AWAY";
    const homePrice = formatAmericanOdds(ml.home);
    const awayPrice = formatAmericanOdds(ml.away);
    if (offset % 3 === 0 && homePrice) {
      return {
        kind: "TEAM",
        text: `${home} to win at ${homePrice}?`,
        prompt: `On ${matchup}, ${home} is ${homePrice} on the board. Bet it, fade it, or pass?`,
      };
    }
    if (awayPrice) {
      return {
        kind: offset % 2 === 0 ? "TEAM" : "FADE",
        text: offset % 2 === 0 ? `${away} at ${awayPrice}?` : `Fade ${home} at ${homePrice}?`,
        prompt: `On ${matchup}, moneyline is ${home} ${homePrice || "—"} / ${away} ${awayPrice || "—"}. What's the lean?`,
      };
    }
  }

  return {
    kind: "TEAM",
    text: `Who wins ${matchup}?`,
    prompt: `On ${matchup}, who's the right side on the moneyline or total? Bet, fade, or pass.`,
  };
}

/**
 * @param {Record<string, unknown>} game
 * @param {Array<Record<string, unknown>>} propLines
 * @param {number} [seed]
 * @returns {HomeEngageNudge[]}
 */
export function buildNflEngageNudges(game, propLines, seed = 0) {
  const nudges = [];
  const team = formatNflTeamNudge(game, seed);
  if (team) {
    nudges.push({
      id: "nfl-team",
      sportHint: "nfl",
      ...team,
    });
  }

  const props = pickBestPropRows(propLines, { seed, limit: 2 });
  props.forEach((row, i) => {
    const prop = formatPropNudge(row, { seed: seed + i + 1 });
    if (!prop) return;
    nudges.push({
      id: `nfl-prop-${i}`,
      sportHint: "nfl",
      ...prop,
    });
  });

  if (nudges.length < 2 && team) {
    nudges.push({
      id: "nfl-prop-fallback",
      kind: "PROP",
      sportHint: "nfl",
      text: "Best player prop on the slate?",
      prompt:
        "Which NFL player prop on today's verified board is the clearest misprice? Bet it, fade it, or pass.",
    });
  }

  return nudges.slice(0, 2);
}

/**
 * @param {Record<string, unknown>} match
 * @param {Array<Record<string, unknown>>} propLines
 * @param {number} [seed]
 * @returns {HomeEngageNudge[]}
 */
export function buildLaligaEngageNudges(match, propLines, seed = 10) {
  const nudges = [];
  const team = formatLaligaTeamNudge(match, seed);
  if (team) {
    nudges.push({
      id: "laliga-team",
      sportHint: "laliga",
      ...team,
    });
  }

  const props = pickBestPropRows(propLines, {
    patterns: LALIGA_PROP_PRIORITY,
    seed,
    limit: 2,
  });
  props.forEach((row, i) => {
    const prop = formatPropNudge(row, { seed: seed + i + 1, sport: "laliga" });
    if (!prop) return;
    nudges.push({
      id: `laliga-prop-${i}`,
      sportHint: "laliga",
      ...prop,
    });
  });

  if (nudges.length < 2) {
    nudges.push({
      id: "laliga-prop-fallback",
      kind: "PROP",
      sportHint: "laliga",
      text: "Best goalscorer prop tonight?",
      prompt:
        "Which La Liga goalscorer prop on tonight's board is the clearest bet or fade? One lean.",
    });
  }

  return nudges.slice(0, 2);
}
