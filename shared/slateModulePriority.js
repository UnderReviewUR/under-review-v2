import {
  classifyF1Race,
  classifyGolfEvent,
  getDisplayableF1NextRace,
  isDisplayableValidity,
  EVENT_VALIDITY,
} from "./eventValidity.js";
import { resolveF1RaceStart } from "./f1RaceStart.js";
import { resolveGolfPrimaryEvent } from "./golfHomeEventSelection.js";
import { isWcHomePromoWindow } from "./wc2026Constants.js";

/** NFL regular season months (same heuristic as client `isNflInSeason`). */
export function isNflMonthInSeason(now = new Date()) {
  const m = now.getMonth();
  return m >= 8 || m <= 1;
}

/**
 * NFL appears in slate when in-season (month heuristic) or live draft window.
 * `bundle.nfl` may contain `{ draftPhase }` from `/api/nfl-context`.
 */
export function isNflSlateActiveFromBundle(bundle, now = new Date()) {
  if (isNflMonthInSeason(now)) return true;
  const phase = bundle?.nfl?.draftPhase ?? bundle?.nfl?.meta?.nflDraftPhase;
  return phase === "during_draft";
}

/** True during ~race weekend: live session, or from 4 days before race start through a short post-race buffer. */
export function isF1RaceWeekendWindow(f1Data, sessions = [], nowMs = Date.now()) {
  const next = getDisplayableF1NextRace(f1Data, nowMs);
  if (!next) return false;
  if (classifyF1Race(next, nowMs) === EVENT_VALIDITY.ACTIVE) return true;
  const startStr = resolveF1RaceStart(next, sessions);
  const t = Date.parse(String(startStr || ""));
  if (Number.isNaN(t)) return false;
  const delta = t - nowMs;
  return delta >= -4 * 24 * 60 * 60 * 1000 && delta <= 6 * 60 * 60 * 1000;
}

/**
 * Lower rank = earlier in Today's Slate / Live Snapshot priority.
 * Used to order the three slate rows and to compare sports.
 */
export function rankSlateSportForBundle(sport, bundle, nowMs = Date.now()) {
  const s = String(sport || "").toLowerCase();
  const nba = bundle?.nba;
  const hasNbaGames = Array.isArray(nba?.todaysGames) && nba.todaysGames.length > 0;
  const nbaPlayoffs = Boolean(nba?.seasonContext?.postseason) && hasNbaGames;
  const wcPromo = isWcHomePromoWindow(nowMs);

  if (s === "worldcup") {
    if (!wcPromo) return 900;
    const wc = bundle?.worldcup;
    if (!wc) return 900;
    const hasLive = Array.isArray(wc.live) && wc.live.length > 0;
    const hasUpcoming = Array.isArray(wc.upcoming) && wc.upcoming.length > 0;
    const hasGroups = Array.isArray(wc.groups) && wc.groups.length > 0;
    if (hasLive) return 4;
    if (hasUpcoming || hasGroups) return 5;
    return 6;
  }

  if (s === "nba") {
    if (nbaPlayoffs) return 10;
    if (hasNbaGames) return 22;
    return 900;
  }
  if (s === "nfl") {
    return isNflSlateActiveFromBundle(bundle, new Date(nowMs)) ? 20 : 900;
  }
  if (s === "mlb") {
    const games = bundle?.mlb?.games || [];
    const anyLive = games.some((g) => g?.state === "in");
    if (anyLive) return 30;
    const anySlate = games.length > 0;
    return anySlate ? 85 : 900;
  }
  if (s === "tennis") {
    return Array.isArray(bundle?.tennis) && bundle.tennis.length > 0 ? 40 : 900;
  }
  if (s === "f1") {
    const sessions = bundle?.f1?.sessions || [];
    return isF1RaceWeekendWindow(bundle?.f1, sessions, nowMs) ? (wcPromo ? 16 : 12) : 900;
  }
  if (s === "golf") {
    if (!bundle?.golf) return 900;
    const primary = resolveGolfPrimaryEvent(bundle.golf, nowMs);
    const golfLive =
      primary && classifyGolfEvent(primary, nowMs) === EVENT_VALIDITY.ACTIVE;
    if (golfLive) return wcPromo ? 15 : 11;
    return wcPromo ? 28 : 32;
  }
  return 950;
}

export function compareSlateRowsBySport(a, b, bundle, nowMs = Date.now()) {
  const ra = rankSlateSportForBundle(a?.item?.sport, bundle, nowMs);
  const rb = rankSlateSportForBundle(b?.item?.sport, bundle, nowMs);
  if (ra !== rb) return ra - rb;
  const order = { safeLean: 0, sharpAngle: 1, contrarian: 2 };
  return (order[a.key] ?? 9) - (order[b.key] ?? 9);
}
