/**
 * Player-name → nation → fixture pinning for WC player-prop UR Take.
 */

import { WC_FULL_SQUADS } from "../src/data/wc2026FullSquadsSeed.js";
import {
  extractWcPlayerPropNameHint,
  isGenericWcPlayerPropQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcGoalkeeperPropsQuestion,
  isWcNamedPlayerPropQuestion,
} from "./wcUrTakePlayerMarket.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import { matchPlayerPropRowsFromEvent } from "./wcMatchPlayerProps.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { extractWcSlateDayFromQuestion } from "./wcTakeRetentionQA.js";
import {
  getWcMatchCommenceMs,
  isWcFinishedMatchStatus,
  isWcLiveMatchStatus,
  isWcScheduledMatchStatus,
  pickWcFeaturedMatch,
  sortWcTodayMatches,
} from "./wcFeaturedMatch.js";
import { getTomorrowEtDateString } from "./nbaPlayoffSlateFromActionNetwork.js";
import { wcMatchOnEtBroadcastSlateDay, wcTodayEtYmd } from "./wcKickoffDisplay.js";
import { resolveContinuationEntities } from "./wcUrTakeIntent.js";
import { resolveWcFixturePairFromHistory } from "./wcFixtureMatchupPrebuilt.js";

const WC_PLAYER_PROP_THIS_FIXTURE_RE =
  /\b(this|the)\s+(game|match|fixture|matchup)\b|\bfor\s+this\s+(game|match|fixture|matchup)\b/i;

/**
 * @param {string} text
 */
function normPlayerToken(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Score how strongly a roster row matches a bare name hint (higher = more specific).
 * @param {{ lastName?: string, nameOnShirt?: string, name?: string, playerKey?: string }} player
 * @param {string} hint normalized hint
 */
function scoreWcPlayerNationMatch(player, hint) {
  const last = normPlayerToken(player.lastName);
  const tokens = last.split(/\s+/).filter(Boolean);
  const shirt = normPlayerToken(player.nameOnShirt);
  const legalTokens = normPlayerToken(player.name).split(/\s+/).filter(Boolean);
  const key = normPlayerToken(player.playerKey).replace(/-/g, " ");

  if (last === hint) return 100;
  if (tokens[0] === hint) return 80;
  if (shirt === hint) return 70;
  if (tokens.includes(hint)) return 50;
  if (legalTokens.includes(hint)) return 40;
  if (hint.length >= 5 && (last.includes(hint) || key.includes(hint))) return 20;
  return 0;
}

/** Famous single-token asks — disambiguate before roster scan. */
const WC_BARE_NAME_NATION_HINTS = {
  musa: "NGA",
  son: "KOR",
  kane: "ENG",
  saka: "ENG",
  mbappe: "FRA",
  mbappé: "FRA",
  haaland: "NOR",
  salah: "EGY",
  messi: "ARG",
  ronaldo: "POR",
  yamal: "ESP",
  vinicius: "BRA",
  vinícius: "BRA",
};

/**
 * Resolve FIFA nation abbr from a bare player name in the question (e.g. Son → KOR).
 * @param {string} question
 */
export function resolveWcPlayerNationFromQuestion(question) {
  const hint = normPlayerToken(extractWcPlayerPropNameHint(question));
  if (!hint || hint.length < 2) return null;

  const hinted = WC_BARE_NAME_NATION_HINTS[hint];
  if (hinted) return hinted;
  /** @type {Map<string, number>} */
  const nationScores = new Map();

  for (const [abbr, team] of Object.entries(WC_FULL_SQUADS.teams || {})) {
    for (const p of team.roster || []) {
      const score = scoreWcPlayerNationMatch(p, hint);
      if (!score) continue;
      const prev = nationScores.get(abbr) || 0;
      if (score > prev) nationScores.set(abbr, score);
    }
  }

  if (!nationScores.size) return null;

  const topScore = Math.max(...nationScores.values());
  const leaders = [...nationScores.entries()].filter(([, s]) => s === topScore);
  if (leaders.length === 1) return leaders[0][0];
  return null;
}

/**
 * @param {string} question
 */
export function detectWcPlayerPropMarketKey(question) {
  const q = String(question || "").trim();
  if (isWcGoalkeeperPropsQuestion(q)) return "player_saves_ou";
  if (/\b(score|goal)\s+or\s+assist\b/i.test(q)) return "player_goal_or_assist";
  if (/\bshots?\s+on\s+target\b|\bsot\b/i.test(q)) return "player_sot_ou";
  if (/\d+\.?\d*\s*shots?\b/i.test(q) || /\bshots?\s*(?:o\/u|over|under)\b/i.test(q)) {
    return "player_shots_ou";
  }
  if (/\bassist/i.test(q)) return "player_assists_ou";
  if (/\bfirst\s+goal/i.test(q)) return "first_goalscorer";
  if (/\b(?:score|scorer|goal)/i.test(q)) return "anytime_scorer";
  return "player_shots_ou";
}

/** @type {Record<string, string>} */
export const WC_NAMED_PROP_MARKET_DISPLAY = {
  player_shots_ou: "full-match shots",
  player_shots_each_half: "shots each half",
  player_sot_ou: "full-match shots on target",
  player_sot_each_half: "SOT each half",
};

/**
 * @param {string} hint normalized player hint
 * @param {{ name?: string }} row
 */
function wcPlayerPropRowMatchesHint(hint, row) {
  const name = normPlayerToken(row.name);
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    name === hint ||
    parts.includes(hint) ||
    parts.some((p) => p.startsWith(hint)) ||
    name.includes(hint) ||
    normPlayerToken(normalizeWcPlayerName(row.name))
      .split(/\s+/)
      .some((p) => p === hint || p.endsWith(hint))
  );
}

/**
 * @param {Array<Record<string, unknown>>} nameMatches
 * @param {string | number | undefined} threshold
 */
function pickBestWcPlayerPropRowForThreshold(nameMatches, threshold) {
  if (!nameMatches.length) return null;
  const target = Number(threshold);
  if (!Number.isFinite(target)) return nameMatches[0];

  const ceil = Math.ceil(target);
  const byLine = nameMatches
    .filter((r) => r.line != null && r.side === "over")
    .sort(
      (a, b) =>
        Math.abs(Number(a.line) - ceil) - Math.abs(Number(b.line) - ceil) ||
        Number(a.line) - Number(b.line),
    );
  return byLine.length ? byLine[0] : nameMatches[0];
}

/**
 * @param {import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg} leg
 * @returns {Array<{ marketKey: string, isProxy: boolean }>}
 */
export function getWcShotPropMarketFallbackLadder(leg) {
  if (leg.marketKey === "player_sot_ou") {
    return [
      { marketKey: "player_sot_ou", isProxy: false },
      { marketKey: "player_sot_each_half", isProxy: true },
    ];
  }
  if (leg.marketKey === "player_shots_ou") {
    return [
      { marketKey: "player_shots_ou", isProxy: false },
      { marketKey: "player_shots_each_half", isProxy: true },
    ];
  }
  return [{ marketKey: leg.marketKey, isProxy: false }];
}

/**
 * @param {import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg} leg
 * @param {string} marketKey
 */
function buildWcShotPropProxyNote(leg, marketKey) {
  if (marketKey === "player_shots_each_half") {
    return `full-match ${leg.threshold} not posted`;
  }
  if (marketKey === "player_sot_each_half") {
    return `full-match ${leg.threshold} SOT not posted`;
  }
  return "nearest posted market";
}

/**
 * @param {string} question
 * @param {object | null | undefined} matchPlayerProps
 * @param {string} marketKey
 * @param {string | number | undefined} [threshold]
 */
export function findWcMatchPlayerPropRowForMarket(
  question,
  matchPlayerProps,
  marketKey,
  threshold,
) {
  if (!matchPlayerProps) return null;
  const hint = normPlayerToken(extractWcPlayerPropNameHint(question));
  if (!hint) return null;

  const rows = matchPlayerPropRowsFromEvent(matchPlayerProps, marketKey, 50);
  const nameMatches = rows.filter((r) => wcPlayerPropRowMatchesHint(hint, r));
  if (!nameMatches.length) return null;

  const lineThreshold =
    threshold ??
    String(question || "").match(/(\d+\.?\d*)\s*shots?\b/i)?.[1] ??
    String(question || "").match(/\bover\s+(\d+(?:\.\d+)?)/i)?.[1];
  const picked = pickBestWcPlayerPropRowForThreshold(nameMatches, lineThreshold);
  return picked ? { ...picked, market: marketKey } : null;
}

/**
 * Nearest posted shot/SOT market for a named leg (full-match → each-half fallback).
 * @param {import("./wcUrTakePlayerMarket.js").WcNamedPlayerPropLeg} leg
 * @param {object | null | undefined} matchPlayerProps
 * @returns {{ row: Record<string, unknown>, marketKey: string, marketLabel: string, isProxy: boolean, proxyNote?: string } | null}
 */
export function findWcNamedPlayerPropLegMatch(leg, matchPlayerProps) {
  if (!matchPlayerProps || !leg?.name) return null;

  const subQuestion = `${leg.name} over ${leg.threshold} ${leg.marketLabel}`;
  for (const step of getWcShotPropMarketFallbackLadder(leg)) {
    const row = findWcMatchPlayerPropRowForMarket(
      subQuestion,
      matchPlayerProps,
      step.marketKey,
      leg.threshold,
    );
    if (!row?.americanOdds) continue;
    return {
      row,
      marketKey: step.marketKey,
      marketLabel: WC_NAMED_PROP_MARKET_DISPLAY[step.marketKey] || leg.marketLabel,
      isProxy: step.isProxy,
      proxyNote: step.isProxy ? buildWcShotPropProxyNote(leg, step.marketKey) : undefined,
    };
  }
  return null;
}

/**
 * @param {string} question
 * @param {object | null | undefined} matchPlayerProps
 */
export function findWcMatchPlayerPropRowForQuestion(question, matchPlayerProps) {
  if (!matchPlayerProps) return null;

  const market = detectWcPlayerPropMarketKey(question);
  if (market === "player_shots_ou" || market === "player_sot_ou") {
    const threshold =
      String(question || "").match(/(\d+\.?\d*)\s*shots?\b/i)?.[1] ??
      String(question || "").match(/\bover\s+(\d+(?:\.\d+)?)/i)?.[1] ??
      "";
    const leg = {
      name: extractWcPlayerPropNameHint(question) || "",
      threshold,
      marketKey: market,
      marketLabel: market === "player_sot_ou" ? "shots on target" : "shots",
    };
    const hit = findWcNamedPlayerPropLegMatch(leg, matchPlayerProps);
    if (hit?.row) {
      return {
        ...hit.row,
        market: hit.marketKey,
        isProxy: hit.isProxy,
        proxyNote: hit.proxyNote,
      };
    }
    return null;
  }

  return findWcMatchPlayerPropRowForMarket(question, matchPlayerProps, market);
}

/**
 * Pin ESPN event id for the player's next/relevant fixture.
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} nationAbbr
 */
/**
 * @param {Array<Record<string, unknown>>} candidates
 */
function pickBestWcEventIdFromMatches(candidates) {
  const relevant = Array.isArray(candidates) ? candidates : [];
  if (!relevant.length) return null;

  const live = relevant.filter((m) => /live|in progress|1h|2h|ht/i.test(String(m.status || "")));
  if (live.length) {
    return String(
      live.sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0))[0]?.id ?? "",
    ).trim() || null;
  }

  const upcoming = relevant
    .filter((m) => /scheduled|ns|not started|timed|upcoming/i.test(String(m.status || "")))
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));
  if (upcoming.length) return String(upcoming[0]?.id ?? "").trim() || null;

  const finished = relevant
    .filter((m) => /final|ft|finished|complete/i.test(String(m.status || "")))
    .sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0));
  return finished.length ? String(finished[0]?.id ?? "").trim() || null : null;
}

export function resolveWcEventIdForPlayerNation(matches, nationAbbr) {
  const abbr = String(nationAbbr || "").toUpperCase();
  if (!abbr) return null;

  const relevant = (matches || []).filter(
    (m) =>
      String(m.homeTeam || "").toUpperCase() === abbr ||
      String(m.awayTeam || "").toUpperCase() === abbr,
  );
  return pickBestWcEventIdFromMatches(relevant);
}

/**
 * Pin fixture teams for slate/tonight player-prop asks when exactly one relevant match remains.
 * @param {string} question
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} [nowMs]
 * @returns {string[]}
 */
export function resolveWcPlayerPropSlateFixtureTeams(question, matches = [], nowMs = Date.now()) {
  const q = String(question || "").trim();
  if (!q || !/\bplayer props?\b/i.test(q)) return [];

  const mentioned = extractMentionedWcTeams(q);
  if (mentioned.length >= 2) return mentioned.map((t) => String(t).toUpperCase());

  const wantsAnotherTonight = /\banother game tonight\b/i.test(q);
  const wantsTonight =
    wantsAnotherTonight ||
    /\b(game tonight|later tonight|tonight'?s?\s+game)\b/i.test(q) ||
    (/\btonight\b/i.test(q) && /\b(player props?|another game)\b/i.test(q));
  const wantsTomorrow = /\btomorrow'?s?\b/i.test(q) && !/\btoday'?s?\b/i.test(q);
  const wantsToday = /\btoday'?s?\b/i.test(q) || wantsTonight;
  if (!wantsTonight && !wantsToday && !wantsTomorrow) return [];

  const list = Array.isArray(matches) ? matches : [];
  if (!list.length) return [];

  const active = list.filter(
    (m) =>
      (isWcLiveMatchStatus(m.status) || isWcScheduledMatchStatus(m.status)) &&
      !isWcFinishedMatchStatus(m.status),
  );
  if (!active.length) return [];

  const todayEt = wcTodayEtYmd(nowMs);
  const tomorrowEt = getTomorrowEtDateString(todayEt);

  /** @param {Record<string, unknown>} match */
  function teamsFromMatch(match) {
    const home = String(match?.homeTeam || "").trim().toUpperCase();
    const away = String(match?.awayTeam || "").trim().toUpperCase();
    return home && away ? [home, away] : [];
  }

  if (wantsTonight) {
    const tonight = sortWcTodayMatches(active, todayEt).filter(
      (m) => !isWcFinishedMatchStatus(m.status),
    );
    if (wantsAnotherTonight) {
      const upcomingTonight = tonight.filter((m) => isWcScheduledMatchStatus(m.status));
      if (upcomingTonight.length === 1) return teamsFromMatch(upcomingTonight[0]);
      if (upcomingTonight.length > 1) return teamsFromMatch(upcomingTonight[0]);
    }
    const live = active.filter((m) => isWcLiveMatchStatus(m.status));
    if (live.length === 1 && !wantsAnotherTonight) return teamsFromMatch(live[0]);
    if (tonight.length === 1) return teamsFromMatch(tonight[0]);
    const featured = pickWcFeaturedMatch({ matches: list, nowMs });
    if (
      featured?.match &&
      (featured.kind === "live" || featured.kind === "today") &&
      !isWcFinishedMatchStatus(featured.match.status)
    ) {
      return teamsFromMatch(featured.match);
    }
    return [];
  }

  const slateDay = extractWcSlateDayFromQuestion(q);
  const targetEt = slateDay === "tomorrow" ? tomorrowEt : todayEt;
  const dayMatches = active
    .filter((m) => wcMatchOnEtBroadcastSlateDay(m, targetEt))
    .sort((a, b) => getWcMatchCommenceMs(a) - getWcMatchCommenceMs(b));
  if (dayMatches.length === 1) return teamsFromMatch(dayMatches[0]);

  return [];
}

/**
 * Resolve FIFA team abbrs for a player-prop ask from question text, chat history, or WC context.
 * @param {string} question
 * @param {object[]} [history]
 * @param {{ requiredEntities?: string[], conversationHistory?: object[] }} [wcContext]
 * @returns {string[]}
 */
export function resolveWcPlayerPropFixtureTeams(
  question,
  history = [],
  wcContext = null,
  matches = [],
) {
  const contextTeams = Array.isArray(wcContext?.requiredEntities)
    ? wcContext.requiredEntities.map((t) => String(t).toUpperCase()).filter(Boolean)
    : [];
  if (contextTeams.length >= 2) return contextTeams;

  const q = String(question || "").trim();
  const fromQuestion = extractMentionedWcTeams(q);
  if (fromQuestion.length >= 2) return fromQuestion;

  if (/\bplayer props?\b/i.test(q)) {
    const mentioned = extractMentionedWcTeams(q);
    if (mentioned.length >= 2) return mentioned;
  }

  const hist = Array.isArray(history) && history.length
    ? history
    : Array.isArray(wcContext?.conversationHistory)
      ? wcContext.conversationHistory
      : [];

  if (
    WC_PLAYER_PROP_THIS_FIXTURE_RE.test(q) ||
    /\bplayer props?\b/i.test(q) ||
    isWcFixtureScopedPlayerMarketQuestion(q) ||
    isWcNamedPlayerPropQuestion(q)
  ) {
    const pair = resolveWcFixturePairFromHistory(hist);
    if (pair?.home && pair?.away) {
      return [String(pair.home).toUpperCase(), String(pair.away).toUpperCase()];
    }
    const cont = resolveContinuationEntities(hist);
    if (cont.length >= 2) return cont.map((t) => String(t).toUpperCase());
  }

  const matchList = Array.isArray(matches) ? matches : [];
  if (
    fromQuestion.length === 1 &&
    matchList.length &&
    (/\bplayer props?\b/i.test(q) || isGenericWcPlayerPropQuestion(q))
  ) {
    const slateTeams = resolveWcPlayerPropSlateFixtureTeams(q, matchList);
    if (slateTeams.length >= 2) return slateTeams;
    const nationEventId = resolveWcEventIdForPlayerNation(matchList, fromQuestion[0]);
    if (nationEventId) {
      const m = matchList.find((row) => String(row?.id) === String(nationEventId));
      if (m?.homeTeam && m?.awayTeam) {
        return [String(m.homeTeam).toUpperCase(), String(m.awayTeam).toUpperCase()];
      }
    }
  }

  return fromQuestion;
}

/**
 * Pin ESPN event id for a head-to-head fixture (both teams in question text).
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} teamA
 * @param {string} teamB
 */
export function resolveWcEventIdForFixtureTeams(matches, teamA, teamB) {
  const want = new Set(
    [teamA, teamB].map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
  );
  if (want.size < 2) return null;

  const relevant = (matches || []).filter((m) => {
    const home = String(m.homeTeam || "").trim().toUpperCase();
    const away = String(m.awayTeam || "").trim().toUpperCase();
    return want.has(home) && want.has(away);
  });
  return pickBestWcEventIdFromMatches(relevant);
}
