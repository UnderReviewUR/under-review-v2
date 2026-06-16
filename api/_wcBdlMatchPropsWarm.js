/**
 * Proactive BDL GOAT match player-props warm — keeps KV hot so UR Take never waits on cold cache.
 */

import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";
import {
  resolveBdlMatchIdForEvent,
  scrapeAndCacheWcBdlMatchPlayerProps,
} from "./_wcBdlData.js";
import {
  isWcFinishedMatchStatus,
  isWcScheduledMatchStatus,
} from "../shared/wcFeaturedMatch.js";

/** Warm props for NS fixtures within this window (7 days). */
export const WC_MATCH_PROPS_WARM_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} [nowMs]
 * @param {{ horizonMs?: number, maxMatches?: number }} [opts]
 */
export async function warmWcBdlMatchPlayerPropsForMatches(matches, nowMs = Date.now(), opts = {}) {
  if (!isWcGoatPrimaryEnabled()) {
    return { skipped: true, reason: "goat_primary_off", warmed: 0, failed: 0, targets: 0 };
  }

  const horizonMs = Number(opts.horizonMs) || WC_MATCH_PROPS_WARM_HORIZON_MS;
  const maxMatches = Math.max(1, Math.min(48, Number(opts.maxMatches) || 24));
  const cutoff = nowMs + horizonMs;

  const targets = (Array.isArray(matches) ? matches : [])
    .filter((m) => {
      if (isWcFinishedMatchStatus(m?.status)) return false;
      if (!isWcScheduledMatchStatus(m?.status)) return false;
      const ts = Number(m?.commenceTs);
      return Number.isFinite(ts) && ts <= cutoff;
    })
    .sort((a, b) => Number(a.commenceTs) - Number(b.commenceTs))
    .slice(0, maxMatches);

  let warmed = 0;
  let failed = 0;

  for (const m of targets) {
    const eventId = String(m?.id || "").trim();
    if (!eventId) continue;

    const bdlMatchId = await resolveBdlMatchIdForEvent(eventId, {
      bdlMatchId: m?.bdlMatchId,
      homeTeam: m?.homeTeam,
      awayTeam: m?.awayTeam,
      date: m?.date,
    });
    if (bdlMatchId == null) {
      failed += 1;
      continue;
    }

    try {
      const r = await scrapeAndCacheWcBdlMatchPlayerProps(bdlMatchId, eventId, {
        homeTeam: m?.homeTeam,
        awayTeam: m?.awayTeam,
      });
      if (r?.ok) warmed += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  const summary = {
    ok: warmed > 0 || targets.length === 0,
    warmed,
    failed,
    targets: targets.length,
    source: "balldontlie",
  };

  console.log(JSON.stringify({ event: "wc_bdl_match_props_warm", ...summary }));

  return summary;
}
