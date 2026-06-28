/**
 * Resolve match + sim inputs for WC fixture matchup prebuilt cards.
 */

import { readWcMatchesFromKv, readWcMatchDetailFromKv, refreshWcLiveScores } from "./_wcData.js";
import { readWcTournamentSimFromKv } from "./_wcTournamentSimData.js";
import { selectFixturesForQuestion } from "./_wcUrTakeContext.js";
import {
  readWcMatchPlayerPropsForEvent,
  ensureWcBdlMatchPlayerPropsForEvent,
} from "./_wcMatchPlayerProps.js";
import { bdlFifaFetch } from "./_wcBdlFifa.js";
import { pickBdlMatchOddsForMatch } from "./_wcBdlNormalize.js";
import { buildStaticPromoMatchesFallback } from "../shared/wc2026PromoFixtures.js";
import { buildLiveMatchChanceQualityFromDetail } from "../shared/wcMatchChanceQuality.js";
import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";
import {
  selectLiveFixtureForQuestion,
  isWcLiveBetsQuestion,
  isWcLiveDominanceQuestion,
  WC_LIVE_ANGLE_ASK_RE,
} from "../shared/wcLiveMatchQuestion.js";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  getWcFixtureMlSeed,
  resolveWcFixturePairFromHistory,
  resolveWcFixturePairFromQuestion,
} from "../shared/wcFixtureMatchupPrebuilt.js";

const LIVE_ODDS_MAX_AGE_MS = 90_000;
const LIVE_ODDS_FETCH_TIMEOUT_MS = 8000;

function isLiveOrScheduled(status) {
  const s = String(status || "").toLowerCase();
  return ["ns", "scheduled", "pre", "live", "ht", "1h", "2h", "in_progress"].includes(s);
}

function isWcLiveListStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isLiveQuestion(question) {
  const q = String(question || "");
  return (
    isWcLiveBetsQuestion(q) ||
    isWcLiveDominanceQuestion(q) ||
    WC_LIVE_ANGLE_ASK_RE.test(q)
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {string} home
 * @param {string} away
 */
function attachSeedOddsIfMissing(match, home, away) {
  const row = match && typeof match === "object" ? { ...match } : {};
  if (row.odds && typeof row.odds === "object") return row;
  const seed = getWcFixtureMlSeed(home, away);
  if (!seed) return row.odds ? row : null;
  return { ...row, odds: seed, oddsUpdatedAt: Date.now() };
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} home
 * @param {string} away
 */
function findKvFixture(matches, home, away) {
  const h = String(home || "").toUpperCase();
  const a = String(away || "").toUpperCase();
  return (matches || []).find(
    (m) =>
      String(m.homeTeam || "").toUpperCase() === h &&
      String(m.awayTeam || "").toUpperCase() === a &&
      isLiveOrScheduled(m.status),
  );
}

/**
 * @param {string | number | null | undefined} bdlMatchId
 * @param {number} nowMs
 */
async function fetchBdlMatchOddsForPrebuilt(bdlMatchId, nowMs) {
  if (!isWcGoatPrimaryEnabled()) return null;
  if (bdlMatchId == null) return null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await Promise.race([
        bdlFifaFetch("/odds", { "seasons[]": 2026, "match_ids[]": bdlMatchId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("live_odds_timeout")), LIVE_ODDS_FETCH_TIMEOUT_MS),
        ),
      ]);
      if (!res?.ok) continue;
      const odds = pickBdlMatchOddsForMatch(
        Array.isArray(res.data?.data) ? res.data.data : [],
        bdlMatchId,
      );
      if (odds) return odds;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} match
 * @param {number} nowMs
 */
async function refreshWcLiveMatchOddsForPrebuilt(match, nowMs) {
  if (!match || !isWcLiveListStatus(match.status)) return match;
  const oddsUpdatedAt = Number(match.oddsUpdatedAt || 0);
  if (
    match.odds &&
    typeof match.odds === "object" &&
    oddsUpdatedAt > 0 &&
    nowMs - oddsUpdatedAt < LIVE_ODDS_MAX_AGE_MS
  ) {
    return match;
  }

  const bdlMatchId = match.bdlMatchId ?? match.id;
  const odds = await fetchBdlMatchOddsForPrebuilt(bdlMatchId, nowMs);
  if (!odds) return match;
  return { ...match, odds, oddsUpdatedAt: nowMs, oddsStale: false };
}

/**
 * @param {string | number | null | undefined} eventId
 * @param {{ homeTeam?: string, awayTeam?: string }} match
 * @param {number} nowMs
 */
async function loadLivePlayerPropsForPrebuilt(eventId, match, nowMs) {
  const id = String(eventId || "").trim();
  if (!id) return null;

  let props = await readWcMatchPlayerPropsForEvent(id, nowMs).catch(() => null);
  if (props && props.markets && typeof props.markets === "object") return props;

  if (isWcGoatPrimaryEnabled()) {
    props = await ensureWcBdlMatchPlayerPropsForEvent(id, {
      homeTeam: match?.homeTeam,
      awayTeam: match?.awayTeam,
      bdlMatchId: match?.bdlMatchId,
    }).catch(() => null);
  }
  return props;
}

/**
 * @param {string} question
 * @param {Array<Record<string, unknown>>} matches
 * @param {string | null | undefined} wcEventId
 */
function resolvePairFromLiveSlate(question, matches, wcEventId) {
  const liveHit = selectLiveFixtureForQuestion(matches, question, wcEventId);
  if (!liveHit?.homeTeam || !liveHit?.awayTeam) return null;
  return {
    home: String(liveHit.homeTeam).toUpperCase(),
    away: String(liveHit.awayTeam).toUpperCase(),
    group: String(liveHit.group || "").toUpperCase(),
    eventId: liveHit.id != null ? String(liveHit.id) : wcEventId ? String(wcEventId) : null,
    liveMatch: liveHit,
  };
}

/**
 * Load refreshed WC match inventory (KV → promo fallback).
 * @param {number} [nowMs]
 */
export async function loadWcMatchInventoryForUrTake(nowMs = Date.now()) {
  let matchesKv = await readWcMatchesFromKv().catch(() => null);
  if (matchesKv?.matches?.length) {
    const liveRefresh = await refreshWcLiveScores(matchesKv, nowMs);
    matchesKv = liveRefresh.kv;
  }
  let matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  if (!matches.length) {
    matches = buildStaticPromoMatchesFallback(nowMs);
  }
  return matches;
}

/**
 * @param {{
 *   question: string,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   history?: Array<unknown>,
 *   nowMs?: number,
 * }} opts
 */
export async function resolveWcFixtureMatchupPrebuiltInputs(opts = {}) {
  const question = String(opts.question || "");
  const nowMs = Number(opts.nowMs) || Date.now();

  const [matches, simRow] = await Promise.all([
    loadWcMatchInventoryForUrTake(nowMs),
    readWcTournamentSimFromKv(undefined, nowMs).catch(() => null),
  ]);

  let pair = resolveWcFixturePairFromQuestion(question, {
    mentionedTeams: opts.mentionedTeams,
    wcEventId: opts.wcEventId,
  });
  if (!pair?.home || !pair?.away) {
    pair = resolveWcFixturePairFromHistory(opts.history);
  }

  let autoLiveMatch = null;
  if ((!pair?.home || !pair?.away) && isLiveQuestion(question)) {
    const livePair = resolvePairFromLiveSlate(question, matches, opts.wcEventId);
    if (livePair) {
      pair = livePair;
      autoLiveMatch = livePair.liveMatch || null;
    }
  }

  if (!pair?.home || !pair?.away) return null;

  const mentioned = [pair.home, pair.away];
  let pinned =
    selectFixturesForQuestion(matches, mentioned, pair.eventId || opts.wcEventId)[0] ||
    findKvFixture(matches, pair.home, pair.away) ||
    autoLiveMatch;

  if (!pinned && isLiveQuestion(question)) {
    pinned = selectLiveFixtureForQuestion(matches, question, opts.wcEventId || pair.eventId);
    if (pinned?.homeTeam && pinned?.awayTeam) {
      pair = {
        home: String(pinned.homeTeam).toUpperCase(),
        away: String(pinned.awayTeam).toUpperCase(),
        group: String(pinned.group || pair.group || "").toUpperCase(),
        eventId: pinned.id != null ? String(pinned.id) : pair.eventId,
      };
    }
  }

  let match = attachSeedOddsIfMissing(pinned, pair.home, pair.away);
  if (!match?.odds) {
    const bdlMatchId =
      match?.bdlMatchId ?? match?.id ?? pair.eventId ?? opts.wcEventId ?? null;
    const goatOdds = await fetchBdlMatchOddsForPrebuilt(bdlMatchId, nowMs);
    if (goatOdds) {
      match = {
        ...(match && typeof match === "object" ? match : {}),
        homeTeam: pair.home,
        awayTeam: pair.away,
        id: bdlMatchId != null ? String(bdlMatchId) : match?.id,
        bdlMatchId: bdlMatchId ?? match?.bdlMatchId,
        group: pair.group || match?.group,
        status: match?.status || "scheduled",
        odds: goatOdds,
        oddsUpdatedAt: nowMs,
        oddsStale: false,
      };
    }
  }
  if (!match?.odds) return null;

  if (isWcLiveListStatus(match.status)) {
    match = await refreshWcLiveMatchOddsForPrebuilt(match, nowMs);
    if (!match.odds) {
      match = attachSeedOddsIfMissing(match, pair.home, pair.away);
    }
  }

  const eventId = match?.id ?? pair.eventId ?? opts.wcEventId;
  let matchDetail = null;
  let liveChanceQuality = null;
  let playerProps = null;

  if (eventId && isWcLiveListStatus(match?.status)) {
    const [detailRow, propsRow] = await Promise.all([
      readWcMatchDetailFromKv(eventId).catch(() => null),
      loadLivePlayerPropsForPrebuilt(eventId, match, nowMs).catch(() => null),
    ]);
    matchDetail = detailRow;
    playerProps = propsRow;
    if (matchDetail) {
      liveChanceQuality = buildLiveMatchChanceQualityFromDetail(matchDetail);
    }
  }

  const teamStats = simRow?.teamStats || null;

  return {
    ...pair,
    match,
    allMatches: matches,
    teamStats,
    simLastUpdated: simRow?.lastUpdated,
    hasKvFixture: Boolean(pinned || match?.odds),
    matchDetail,
    liveChanceQuality,
    playerProps,
    eventId: eventId != null ? String(eventId) : null,
    nowMs,
  };
}

/**
 * @param {{
 *   question: string,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   history?: Array<unknown>,
 *   nowMs?: number,
 * }} opts
 */
export async function buildWcFixtureMatchupPrebuiltFromInputs(opts = {}) {
  const inputs = await resolveWcFixtureMatchupPrebuiltInputs(opts);
  if (!inputs) return null;
  return buildWcFixtureMatchupPrebuiltStructured({
    home: inputs.home,
    away: inputs.away,
    group: inputs.group,
    question: opts.question,
    match: inputs.match,
    teamStats: inputs.teamStats,
    simLastUpdated: inputs.simLastUpdated,
    nowMs: inputs.nowMs,
    history: opts.history,
    tournamentPhase: opts.tournamentPhase,
    allMatches: opts.allMatches,
  });
}
