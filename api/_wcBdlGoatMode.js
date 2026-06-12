/**
 * Live BallDontLie GOAT mode — fetch + compare vs ESPN/KV primary stack.
 * Use ?source=goat on world-cup views or ?view=goat for a side-by-side probe.
 */

import { getEnv } from "./_env.js";
import {
  hasWcBdlApiKey,
  isWcGoatPrimaryEnabled,
  wantsEspnSource,
  wantsGoatSource,
} from "../shared/wcBdlPolicy.js";
import {
  bdlFifaFetch,
  fetchAllMatchesBdl,
  BDL_GOAT_RATE_LIMIT_MS,
  sleepMs,
} from "./_wcBdlFifa.js";
import { readWcGroupsFromKv, readWcMatchesFromKv, readWcOutrightsFromKv } from "./_wcData.js";
import { getDurableJson } from "./_durableStore.js";
import {
  WC_BDL_REFERENCE_KV_KEY,
  fetchBdlMatchBundle,
  resolveBdlPlayerLookupForPropRows,
} from "./_wcBdlData.js";
import { normalizeBdlPlayerPropsToMarkets } from "./_wcBdlNormalize.js";
import { auditBdlPlayerPropsIngest } from "../shared/wcBdlIngestAudit.js";
import { readWcBdlGoatSeedFromKv } from "./_wcBdlSeed.js";
import {
  buildBdlFuturesIndex,
  buildWcBdlFuturesPromptBlock,
  summarizeBdlFuturesSeed,
} from "../shared/wcBdlFutures.js";
import { sanitizeWcTournamentWinnerOutrights } from "../shared/wc2026OutrightOdds.js";
import { WC_GROUPS_TTL_SECONDS, WC_MATCHES_TTL_SECONDS } from "../shared/wc2026Constants.js";

/** @param {unknown} data */
export function normalizeBdlGroupStandings(data) {
  const groups = {};
  const rawGroups =
    data?.groups ||
    data?.group_standings ||
    data?.data ||
    (Array.isArray(data) ? data : null);
  if (!rawGroups) return groups;

  const mapTeams = (teams) =>
    (teams || []).map((t) => ({
      team: String(t.team || t.name || t.abbreviation || t.abbr || "").trim(),
      played: Number(t.played ?? t.mp ?? t.games_played ?? 0),
      won: Number(t.won ?? t.w ?? t.win ?? 0),
      drawn: Number(t.drawn ?? t.d ?? t.draw ?? 0),
      lost: Number(t.lost ?? t.l ?? t.loss ?? 0),
      gf: Number(t.gf ?? t.goals_for ?? t.for ?? 0),
      ga: Number(t.ga ?? t.goals_against ?? t.against ?? 0),
      gd: Number(t.gd ?? t.goal_difference ?? 0),
      points: Number(t.points ?? t.pts ?? 0),
    }));

  if (Array.isArray(rawGroups)) {
    for (const g of rawGroups) {
      const letter = String(g.group || g.name || g.letter || "")
        .trim()
        .toUpperCase()
        .replace(/^GROUP\s*/i, "");
      const teams = Array.isArray(g.standings)
        ? g.standings
        : Array.isArray(g.teams)
          ? g.teams
          : [];
      if (!letter || !teams.length) continue;
      groups[letter] = mapTeams(teams);
    }
    return groups;
  }

  if (typeof rawGroups === "object") {
    for (const [key, teams] of Object.entries(rawGroups)) {
      const letter = String(key).trim().toUpperCase().replace(/^GROUP\s*/i, "");
      if (!Array.isArray(teams)) continue;
      groups[letter] = mapTeams(teams);
    }
  }
  return groups;
}

export { hasWcBdlApiKey, isWcGoatPrimaryEnabled, wantsEspnSource, wantsGoatSource };

export async function getGoatGroupsPayload() {
  const res = await bdlFifaFetch("/group_standings", { "seasons[]": 2026 });
  if (!res.ok) {
    return { ok: false, error: res.error, status: res.status, source: "balldontlie_live" };
  }
  const groups = normalizeBdlGroupStandings(res.data);
  if (!Object.keys(groups).length) {
    return { ok: false, error: "empty_groups", source: "balldontlie_live" };
  }
  return {
    ok: true,
    groups,
    lastUpdated: Date.now(),
    source: "balldontlie_live",
    fallback: false,
    stale: false,
  };
}

export async function getGoatMatchesPayload() {
  const fetched = await fetchAllMatchesBdl();
  if (!fetched.ok || !fetched.matches?.length) {
    return {
      ok: false,
      error: fetched.error || "no_matches",
      source: "balldontlie_live",
    };
  }
  const matches = fetched.matches.map((m) => ({
    ...m,
    bdlMatchId: m.bdlMatchId ?? m.id ?? null,
    source: "balldontlie",
  }));
  return {
    ok: true,
    matches,
    lastUpdated: Date.now(),
    source: "balldontlie_live",
    fallback: false,
    stale: false,
    pages: fetched.pages,
  };
}

export async function getGoatFuturesLiveIndex() {
  const res = await bdlFifaFetch("/odds/futures", { "seasons[]": 2026 });
  if (!res.ok) {
    return { ok: false, error: res.error, status: res.status };
  }
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const index = buildBdlFuturesIndex(rows);
  return {
    ok: rows.length > 0,
    rowCount: rows.length,
    futuresIndex: index,
    byMarketType: index.byMarketType,
    lastUpdated: Date.now(),
    source: "balldontlie_live",
  };
}

/** Tournament winner map from live BDL outright futures. */
export async function getGoatOutrightsPayload() {
  const live = await getGoatFuturesLiveIndex();
  if (!live.ok) {
    return { ok: false, error: live.error, source: "balldontlie_live" };
  }
  const outrightRows = live.byMarketType?.outright || {};
  /** @type {Record<string, string>} */
  const outrights = {};
  for (const [abbr, row] of Object.entries(outrightRows)) {
    if (row?.americanDisplay) outrights[abbr] = String(row.americanDisplay);
  }
  const sanitized = sanitizeWcTournamentWinnerOutrights(outrights);
  return {
    ok: Object.keys(sanitized).length > 0,
    outrights: sanitized,
    lastUpdated: live.lastUpdated,
    source: "balldontlie_live",
    sourceTier: "balldontlie_live",
    vendorNote: "DraftKings/FanDuel via BDL futures outright market",
  };
}

/**
 * Sample first page of match odds (moneyline/spread/total).
 * @param {{ perPage?: number }} [opts]
 */
export async function sampleGoatMatchOdds(opts = {}) {
  const res = await bdlFifaFetch("/odds", {
    "seasons[]": 2026,
    per_page: opts.perPage ?? 5,
  });
  if (!res.ok) {
    return { ok: false, error: res.error, status: res.status, rows: [] };
  }
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return {
    ok: true,
    rowCount: rows.length,
    sample: rows.slice(0, 5).map((r) => ({
      matchId: r.match_id ?? r.matchId ?? r.id,
      vendor: r.vendor,
      home: r.moneyline_home_odds ?? r.home_ml,
      away: r.moneyline_away_odds ?? r.away_ml,
      draw: r.moneyline_draw_odds ?? r.draw_ml,
      spreadHome: r.spread_home_odds,
      totalOver: r.total_over_odds,
    })),
  };
}

/**
 * Side-by-side probe: live GOAT vs ESPN KV vs frozen seed.
 * @param {{ sampleTeam?: string, sampleQuestion?: string, throttle?: boolean }} [opts]
 */
export async function buildWcGoatProbeReport(opts = {}) {
  const nowMs = Date.now();
  const sampleTeam = String(opts.sampleTeam || "USA").trim().toUpperCase();
  const sampleQuestion =
    String(opts.sampleQuestion || "Will the USMNT reach the Round of 16?").trim();
  const throttle = opts.throttle !== false;
  const delayMs = throttle ? BDL_GOAT_RATE_LIMIT_MS : 0;

  const keyPresent = Boolean(getEnv("BALLDONTLIE_API_KEY")?.trim());
  let requestCount = 0;

  const [espnGroupsKv, espnMatchesKv, espnOutrightsKv, kvSeed] = await Promise.all([
    readWcGroupsFromKv(WC_GROUPS_TTL_SECONDS * 1000),
    readWcMatchesFromKv(WC_MATCHES_TTL_SECONDS * 1000),
    readWcOutrightsFromKv(),
    readWcBdlGoatSeedFromKv(nowMs),
  ]);

  /** @type {Record<string, unknown>} */
  const live = {};
  /** @type {string[]} */
  const errors = [];

  const standingsRes = await bdlFifaFetch("/group_standings", { "seasons[]": 2026 });
  requestCount += 1;
  live.standings = standingsRes.ok
    ? {
        ok: true,
        groupCount: Object.keys(normalizeBdlGroupStandings(standingsRes.data)).length,
        sampleGroupA: normalizeBdlGroupStandings(standingsRes.data).A?.slice(0, 4) || [],
      }
    : { ok: false, error: standingsRes.error, status: standingsRes.status };
  if (!standingsRes.ok) errors.push(`standings: ${standingsRes.error}`);

  if (delayMs > 0) await sleepMs(delayMs);
  const futuresLive = await getGoatFuturesLiveIndex();
  requestCount += 1;
  live.futures = futuresLive.ok
    ? {
        ok: true,
        rowCount: futuresLive.rowCount,
        marketTypes: futuresLive.futuresIndex?.marketTypes || [],
        sampleTeamPrices: sampleTeam
          ? {
              outright: futuresLive.byMarketType?.outright?.[sampleTeam] || null,
              roundOf16: futuresLive.byMarketType?.to_reach_round_of_16?.[sampleTeam] || null,
              groupAdvance: futuresLive.byMarketType?.qualify_from_group?.[sampleTeam] || null,
            }
          : null,
      }
    : { ok: false, error: futuresLive.error };
  if (!futuresLive.ok) errors.push(`futures: ${futuresLive.error}`);

  if (delayMs > 0) await sleepMs(delayMs);
  const matchesLive = await fetchAllMatchesBdl({ delayMs: 0 });
  requestCount += matchesLive.pages || 1;
  live.matches = matchesLive.ok
    ? {
        ok: true,
        count: matchesLive.matches.length,
        first: matchesLive.matches.slice(0, 3),
        last: matchesLive.matches.slice(-2),
      }
    : { ok: false, error: matchesLive.error };
  if (!matchesLive.ok) errors.push(`matches: ${matchesLive.error}`);

  if (delayMs > 0) await sleepMs(delayMs);
  const oddsSample = await sampleGoatMatchOdds({ perPage: 3 });
  requestCount += 1;
  live.matchOdds = oddsSample;

  const seedSummary = kvSeed ? summarizeBdlFuturesSeed(kvSeed) : null;
  const seedUsaR16 = kvSeed?.byMarketType?.to_reach_round_of_16?.[sampleTeam] || null;
  const liveUsaR16 = futuresLive.byMarketType?.to_reach_round_of_16?.[sampleTeam] || null;

  const seedPromptBlock = kvSeed
    ? buildWcBdlFuturesPromptBlock(kvSeed, sampleQuestion, [sampleTeam], nowMs)
    : null;
  const liveSeedPayload = futuresLive.ok
    ? {
        byMarketType: futuresLive.byMarketType,
        lastUpdated: futuresLive.lastUpdated,
        seededAt: futuresLive.lastUpdated,
        source: "balldontlie_live",
      }
    : null;
  const livePromptBlock = liveSeedPayload
    ? buildWcBdlFuturesPromptBlock(liveSeedPayload, sampleQuestion, [sampleTeam], nowMs)
    : null;

  const bdlReference = await getDurableJson(WC_BDL_REFERENCE_KV_KEY);
  /** @type {Record<string, unknown> | null} */
  let playerPropsHealth = null;
  const samplePropMatch =
    (matchesLive.matches || []).find(
      (m) => String(m.homeTeam) === "KOR" && String(m.awayTeam) === "CZE",
    ) || (matchesLive.matches || [])[0];
  if (keyPresent && samplePropMatch) {
    try {
      if (delayMs > 0) await sleepMs(delayMs);
      const bdlMatchId = Number(samplePropMatch.bdlMatchId ?? samplePropMatch.id);
      const propsRes = await bdlFifaFetch("/odds/player_props", { match_id: bdlMatchId });
      requestCount += 1;
      const rows = Array.isArray(propsRes.data?.data) ? propsRes.data.data : [];
      const lookup = await resolveBdlPlayerLookupForPropRows(rows, {
        homeTeam: samplePropMatch.homeTeam,
        awayTeam: samplePropMatch.awayTeam,
      });
      const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);
      const audit = auditBdlPlayerPropsIngest(rows, markets, lookup);
      playerPropsHealth = {
        matchup: `${samplePropMatch.homeTeam} vs ${samplePropMatch.awayTeam}`,
        bdlMatchId,
        eventId: samplePropMatch.id,
        fetchOk: propsRes.ok,
        fetchError: propsRes.error || null,
        ...audit,
        marketCounts: {
          anytime_scorer: (markets.anytime_scorer || []).length,
          player_goal_or_assist: (markets.player_goal_or_assist || []).length,
          player_shots_ou: (markets.player_shots_ou || []).length,
          player_sot_ou: (markets.player_sot_ou || []).length,
          player_assists_ou: (markets.player_assists_ou || []).length,
        },
      };
      if (!audit.healthy) {
        errors.push(`player_props_ingest:${audit.warnings.join("|") || "unhealthy"}`);
      }
    } catch (err) {
      errors.push(`player_props_health: ${err?.message || "failed"}`);
    }
  }

  /** @type {Record<string, unknown> | null} */
  let sampleGoatMatchDepth = null;
  const sampleMatch =
    (espnMatchesKv?.matches || []).find((m) => m?.bdlMatchId != null) ||
    (espnMatchesKv?.matches || [])[0];
  if (sampleMatch?.bdlMatchId && keyPresent) {
    try {
      const bundle = await fetchBdlMatchBundle(Number(sampleMatch.bdlMatchId), {
        eventId: String(sampleMatch.id),
      });
      sampleGoatMatchDepth = {
        eventId: sampleMatch.id,
        bdlMatchId: sampleMatch.bdlMatchId,
        matchup: `${sampleMatch.homeTeam} vs ${sampleMatch.awayTeam}`,
        goatCoverage: bundle.goatCoverage || null,
      };
      requestCount += 11;
    } catch (err) {
      errors.push(`sample_match_bundle: ${err?.message || "failed"}`);
    }
  }

  return {
    ok: keyPresent && (live.standings?.ok || live.futures?.ok || live.matches?.ok),
    mode: "goat_probe",
    keyPresent,
    goatPrimaryEnv: isWcGoatPrimaryEnabled(),
    requestCount,
    throttleMs: delayMs,
    hint: hasWcBdlApiKey()
      ? "GOAT-primary is ON (BALLDONTLIE_API_KEY set). Cron + UR Take use BDL first; ESPN/scrapes/API-Football fallback. Disable with WC_BDL_GOAT_PRIMARY=0. Force ESPN with ?source=espn."
      : "Set BALLDONTLIE_API_KEY to enable GOAT-primary. Add ?source=goat for one-off live reads.",
    currentStack: {
      groups: {
        source: espnGroupsKv?.source || "espn",
        groupCount: Object.keys(espnGroupsKv?.groups || {}).length,
        stale: Boolean(espnGroupsKv?.stale),
        lastUpdated: espnGroupsKv?.lastUpdated || null,
      },
      matches: {
        source: espnMatchesKv?.source || "espn",
        count: (espnMatchesKv?.matches || []).length,
        stale: Boolean(espnMatchesKv?.stale),
        lastUpdated: espnMatchesKv?.lastUpdated || null,
      },
      outrights: {
        sourceTier: espnOutrightsKv?.sourceTier || null,
        count: Object.keys(espnOutrightsKv?.outrights || {}).length,
        usa: espnOutrightsKv?.outrights?.[sampleTeam] || null,
      },
      bdlKvSeed: seedSummary
        ? {
            ...seedSummary,
            usaR16: seedUsaR16,
            ageMs: kvSeed?.ageMs ?? null,
          }
        : null,
      bdlReference: bdlReference?.counts || null,
    },
    sampleGoatMatchDepth,
    playerPropsHealth,
    liveGoat: live,
    priceDelta: {
      team: sampleTeam,
      usaR16Seed: seedUsaR16,
      usaR16Live: liveUsaR16,
      moved:
        seedUsaR16?.american != null &&
        liveUsaR16?.american != null &&
        seedUsaR16.american !== liveUsaR16.american,
    },
    goatEndpoints: {
      teams: true,
      stadiums: true,
      groupStandings: true,
      matches: true,
      odds: true,
      playerProps: true,
      futures: true,
      players: true,
      rosters: true,
      matchLineups: true,
      matchEvents: true,
      playerMatchStats: true,
      teamMatchStats: true,
      matchShots: true,
      matchMomentum: true,
      matchBestPlayers: true,
      matchAvgPositions: true,
      matchTeamForm: true,
    },
    urTakePreview: {
      question: sampleQuestion,
      promptBlockFromKvSeed: seedPromptBlock,
      promptBlockFromLiveGoat: livePromptBlock,
    },
    stillEspnOrScrape: isWcGoatPrimaryEnabled()
      ? [
          "golden_boot (tournament scorer futures — ESPN/scrape)",
          "injuries board (no BDL injuries endpoint — lineup-derived only)",
          "tournament_sim (internal Poisson+Elo)",
        ]
      : [
          "match_detail when WC_BDL_GOAT_PRIMARY off",
          "golden_boot player markets",
          "match_player_props scrapes",
          "injuries",
          "tournament_sim (internal Poisson+Elo)",
        ],
    errors,
  };
}
