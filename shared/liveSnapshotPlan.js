/**
 * Live Snapshot strip ordering (horizontal ticker, max tiles) — **not** the same as
 * `HOME_SURFACE_STACK_ORDER` (card stack). See `shared/HOME_CONTRACT.md`.
 */

import {
  classifyMlbGame,
  classifyNbaGame,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "./eventValidity.js";
import {
  filterAndOrderNbaMlbGames,
  filterTennisMatchesForSnapshot,
  MAX_LIVE_SNAPSHOT_TILES,
} from "./liveSnapshotFilters.js";
import {
  f1EventKey,
  mlbEventKey,
  nbaEventKey,
  nflSnapshotBoardKey,
  tennisEventKeyFromNormalized,
} from "./homeEventDedup.js";
import { isF1RaceWeekendWindow } from "./slateModulePriority.js";

/**
 * @param {object} input
 * @param {number} [input.nowMs]
 * @param {boolean} [input.isNflSlateActive]
 * @param {Array} [input.tickerNbaGames]
 * @param {Array} [input.mlbGames]
 * @param {object} [input.mlbData]
 * @param {object} [input.f1Data]
 * @param {Array} [input.tennisMatchesForTicker]
 * @param {() => string|null} [input.golfSnapshotKey]
 * @param {Array} [input.validNbaGames] pre-filtered displayable NBA
 * @param {Array} [input.validMlbGames] pre-filtered displayable MLB
 * @returns {{ items: Array<{ kind: string, key: string, nbaGame?: object, mlbGame?: object, f1Race?: object, tennisMatch?: object }>, keys: string[] }}
 */
export function planLiveSnapshot(input) {
  const nowMs = input.nowMs ?? Date.now();
  const nflOn = Boolean(input.isNflSlateActive);

  const gamesSrc = Array.isArray(input.mlbGames)
    ? input.mlbGames
    : input.mlbData?.games || [];

  const validNba =
    input.validNbaGames ||
    (input.tickerNbaGames || []).filter((g) =>
      isDisplayableValidity(classifyNbaGame(g, nowMs)),
    );
  const validMlb =
    input.validMlbGames ||
    gamesSrc.filter((g) => isDisplayableValidity(classifyMlbGame(g, nowMs)));

  const nbaOrdered = filterAndOrderNbaMlbGames(validNba, nowMs, "nba");
  const mlbOrdered = filterAndOrderNbaMlbGames(validMlb, nowMs, "mlb");
  const tennisFiltered = filterTennisMatchesForSnapshot(
    input.tennisMatchesForTicker || [],
    nowMs,
  );

  const nextF1Race = getDisplayableF1NextRace(input.f1Data, nowMs);
  const f1InWindow =
    nextF1Race &&
    isF1RaceWeekendWindow(input.f1Data, input.f1Data?.sessions || []);

  const items = [];
  const seen = new Set();

  function tryAdd(kind, key, payload = {}) {
    if (!key || seen.has(key)) return items.length >= MAX_LIVE_SNAPSHOT_TILES;
    seen.add(key);
    items.push({ kind, key, ...payload });
    return items.length >= MAX_LIVE_SNAPSHOT_TILES;
  }

  function finalize() {
    const slice = items.slice(0, MAX_LIVE_SNAPSHOT_TILES);
    return { items: slice, keys: slice.map((i) => i.key) };
  }

  for (const g of nbaOrdered) {
    if (tryAdd("nba", nbaEventKey(g), { nbaGame: g })) return finalize();
  }
  for (const g of mlbOrdered) {
    if (tryAdd("mlb", mlbEventKey(g), { mlbGame: g })) return finalize();
  }

  if (nflOn) {
    if (tryAdd("nfl", nflSnapshotBoardKey())) return finalize();
  }

  if (f1InWindow && nextF1Race) {
    const k = f1EventKey(nextF1Race);
    if (tryAdd("f1", k, { f1Race: nextF1Race })) return finalize();
  }

  for (const m of tennisFiltered) {
    const k = tennisEventKeyFromNormalized(m);
    if (tryAdd("tennis", k, { tennisMatch: m })) break;
  }

  if (items.length < MAX_LIVE_SNAPSHOT_TILES && typeof input.golfSnapshotKey === "function") {
    const gk = input.golfSnapshotKey();
    if (gk) tryAdd("golf", gk, {});
  }

  return finalize();
}

/** Event keys for dedup — same order as `TickerRail` / `planLiveSnapshot`. */
export function collectLiveSnapshotEventKeysCore(input) {
  return planLiveSnapshot(input).keys;
}
