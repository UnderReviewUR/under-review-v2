import { isWcHomePromoWindow } from "../../../shared/wc2026Constants.js";
import {
  getWcMatchCommenceMs,
  isWcLiveMatchStatus,
  isWcFinishedMatchStatus,
  pickWcFeaturedMatch,
} from "../../../shared/wcFeaturedMatch.js";
import { wcMatchOnEtBroadcastSlateDay, wcTodayEtYmd } from "../../../shared/wcKickoffDisplay.js";
import { getGolfHomeValidity } from "../../lib/golfEventStatus.js";

/**
 * WC fixtures for home compact cards — live first, then today's/upcoming kickoffs.
 * @param {Array<Record<string, unknown>> | null | undefined} wcMatches
 * @param {number} [nowMs]
 * @param {{ excludeIds?: string[], limit?: number }} [opts]
 */
export function pickWcHomeCompactFixtures(wcMatches, nowMs = Date.now(), opts = {}) {
  const limit = opts.limit ?? 2;
  const exclude = new Set((opts.excludeIds || []).map((id) => String(id)));
  const all = Array.isArray(wcMatches) ? wcMatches : [];
  const todayEt = wcTodayEtYmd(nowMs);

  const live = all
    .filter((m) => isWcLiveMatchStatus(m?.status))
    .sort((a, b) => getWcMatchCommenceMs(a) - getWcMatchCommenceMs(b));

  const upcoming = all
    .filter((m) => !isWcLiveMatchStatus(m?.status) && !isWcFinishedMatchStatus(m?.status))
    .filter(
      (m) =>
        wcMatchOnEtBroadcastSlateDay(m, todayEt) ||
        getWcMatchCommenceMs(m) >= nowMs - 3 * 60 * 60 * 1000,
    )
    .sort((a, b) => getWcMatchCommenceMs(a) - getWcMatchCommenceMs(b));

  const ordered = [...live, ...upcoming];
  const seen = new Set();
  const out = [];
  for (const m of ordered) {
    const id = m?.id != null ? String(m.id) : "";
    if (!id || exclude.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Right column on home spotlight row: live golf, upcoming golf, or WC fallback.
 * @param {Record<string, unknown> | null | undefined} golfData
 * @param {boolean} golfLoading
 * @param {Array<Record<string, unknown>> | null | undefined} wcMatches
 * @param {number} [nowMs]
 */
export function resolveHomeSpotlightRightSlot(golfData, golfLoading, wcMatches, nowMs = Date.now()) {
  if (golfData && !golfLoading) {
    const golf = getGolfHomeValidity(golfData, nowMs);
    if (golf.isActive && golf.hasLeaderboard) {
      return { kind: "golf-live" };
    }
    if (golf.isUpcoming && golf.upcomingEvent) {
      return { kind: "golf-upcoming", event: golf.upcomingEvent };
    }
  }

  if (!isWcHomePromoWindow(nowMs)) {
    return { kind: "none" };
  }

  const featured = pickWcFeaturedMatch({ matches: wcMatches, nowMs });
  const excludeIds = featured?.match?.id != null ? [String(featured.match.id)] : [];
  const fixtures = pickWcHomeCompactFixtures(wcMatches, nowMs, { excludeIds, limit: 3 });
  if (fixtures.length) {
    return { kind: "wc-fallback", fixtures };
  }
  return { kind: "none" };
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} wcMatches
 * @param {number} [nowMs]
 */
export function buildHomeWcPrimaryFixtures(wcMatches, nowMs = Date.now()) {
  if (!isWcHomePromoWindow(nowMs)) return [];
  return pickWcHomeCompactFixtures(wcMatches, nowMs, { limit: 2 });
}
