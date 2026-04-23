import { getGolfHomeValidity } from "./golfEventStatus.js";
import { golfSnapshotKey } from "../../shared/homeEventDedup.js";
import { collectLiveSnapshotEventKeysCore } from "../../shared/liveSnapshotPlan.js";

/** Golf tile key must match `TickerRail` (leaderboard vs upcoming). */
export function golfKeyForLiveSnapshot(golfData) {
  if (!golfData) return null;
  const validity = getGolfHomeValidity(golfData);
  if (validity.isActive && validity.hasLeaderboard) {
    return golfSnapshotKey(golfData);
  }
  return null;
}

/**
 * Event keys shown in Live Snapshot (same order / rules as `TickerRail`).
 */
export function collectLiveSnapshotKeysFromApp({
  isNflSlateActive,
  tickerNbaGames,
  mlbGames,
  mlbData,
  f1Data,
  tennisTickerMatches,
  golfData,
  validNbaGames,
  validMlbGames,
}) {
  return collectLiveSnapshotEventKeysCore({
    isNflSlateActive,
    tickerNbaGames,
    mlbGames,
    mlbData,
    f1Data,
    tennisMatchesForTicker: tennisTickerMatches,
    validNbaGames,
    validMlbGames,
    golfSnapshotKey: () => golfKeyForLiveSnapshot(golfData),
  });
}
