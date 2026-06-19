/**
 * Home ingestion pipeline (partial centralization): normalizes feeds that power Home tab + Live Snapshot.
 * NBA/MLB rows use a 48h ET lookahead (`getHomeSlateHorizonMs` in classify).
 * Today's Slate board filtering is aligned via `shared/todaySlateInputBundle.js` (same classify gates; golf uses `normalizeGolfTournament`).
 */

import { collectLiveSnapshotEventKeysCore } from "../liveSnapshotPlan.js";
import {
  getNormalizedF1FromBundle,
  normalizeGolfTournament,
  normalizeMlbGame,
  normalizeNbaGame,
  normalizeNflPropsBoard,
  normalizeTennisMatch,
} from "./normalize.js";
import { emptyPipelineResult } from "./schema.js";
import { mergeTennisNormalizedByPairDate } from "./tennisMerge.js";

function dedupeByEventId(events) {
  const best = new Map();
  for (const e of events) {
    if (!e?.event_id) continue;
    const prev = best.get(e.event_id);
    if (!prev || e.priority_score > prev.priority_score) {
      best.set(e.event_id, e);
    }
  }
  return [...best.values()].sort((a, b) => b.priority_score - a.priority_score);
}

function orderedRawFromNormalized(normalizedList, getRaw) {
  const seen = new Set();
  const out = [];
  for (const ev of normalizedList) {
    const raw = getRaw(ev);
    if (!raw || seen.has(ev.event_id)) continue;
    seen.add(ev.event_id);
    out.push(raw);
  }
  return out;
}

/**
 * @param {object} input
 * @param {number} [input.nowMs]
 * @param {object[]} [input.nbaGames]
 * @param {object} [input.nbaSeasonContext]
 * @param {object[]} [input.mlbGames]
 * @param {object[]} [input.tennisMatches] normalized tennis match objects from client
 * @param {object} [input.f1Data]
 * @param {object} [input.golfData]
 * @param {Array} [input.wcMatches]
 * @param {boolean} [input.isNflSlateActive]
 * @param {() => string|null} [input.golfSnapshotKeyFn] Live Snapshot golf key (client validity)
 * @param {object} [input.mlbData] passthrough for snapshot planner
 */
export function buildHomeEventPipeline(input) {
  const nowMs = input.nowMs ?? Date.now();
  const base = emptyPipelineResult();

  const ctx = { postseason: Boolean(input.nbaSeasonContext?.postseason) };

  const nbaNorm = (input.nbaGames || [])
    .map((g) => normalizeNbaGame(g, ctx, nowMs))
    .filter(Boolean)
    .sort((a, b) => b.priority_score - a.priority_score);
  const mlbNorm = (input.mlbGames || [])
    .map((g) => normalizeMlbGame(g, nowMs))
    .filter(Boolean)
    .sort((a, b) => b.priority_score - a.priority_score);
  let tennisNorm = (input.tennisMatches || [])
    .map((m) => normalizeTennisMatch(m, nowMs))
    .filter(Boolean);
  tennisNorm = mergeTennisNormalizedByPairDate(tennisNorm).sort(
    (a, b) => b.priority_score - a.priority_score,
  );

  const f1Ev = getNormalizedF1FromBundle(input.f1Data, nowMs);
  const golfEv = normalizeGolfTournament(input.golfData, nowMs);
  const nflEv = normalizeNflPropsBoard(Boolean(input.isNflSlateActive));

  const allEvents = [...nbaNorm, ...mlbNorm, ...tennisNorm];
  if (f1Ev) allEvents.push(f1Ev);
  if (golfEv) allEvents.push(golfEv);
  if (nflEv) allEvents.push(nflEv);

  base.events = dedupeByEventId(allEvents);

  base.nbaGamesForHome = orderedRawFromNormalized(nbaNorm, (ev) => ev.raw);
  base.mlbGamesForHome = orderedRawFromNormalized(mlbNorm, (ev) => ev.raw);
  base.tennisMatchesForHome = orderedRawFromNormalized(tennisNorm, (ev) => ev.raw);
  base.golfVisibleOnHome = Boolean(golfEv);

  const mlbGamesSrc = Array.isArray(input.mlbGames)
    ? input.mlbGames
    : input.mlbData?.games || [];

  base.liveSnapshotKeys = collectLiveSnapshotEventKeysCore({
    isNflSlateActive: Boolean(input.isNflSlateActive),
    tickerNbaGames: base.nbaGamesForHome,
    mlbGames: mlbGamesSrc,
    mlbData: input.mlbData,
    f1Data: input.f1Data,
    tennisMatchesForTicker: base.tennisMatchesForHome,
    wcMatches: input.wcMatches || [],
    validNbaGames: base.nbaGamesForHome,
    validMlbGames: base.mlbGamesForHome,
    golfSnapshotKey: typeof input.golfSnapshotKeyFn === "function" ? input.golfSnapshotKeyFn : () => null,
    golfData: input.golfData,
  });

  base.meta = {
    hasAtpFromOdds: base.tennisMatchesForHome.some((m) => {
      const tl = String(m?.raw?.truth_layer || "");
      const src = String(m?.raw?.source || "");
      return tl === "odds_market_fallback" || src.includes("odds");
    }),
    nbaPlayoffContext: Boolean(ctx.postseason),
  };

  return base;
}
