/**
 * Resolve WC sim team-strength multipliers from match detail / advanced-stats KV (no live BDL calls).
 */

import { getDurableJson } from "./_durableStore.js";
import { readWcMatchDetailFromKv } from "./_wcData.js";
import { WC_MATCH_ADVANCED_STATS_KV_KEY } from "../shared/wc2026PlayerConstants.js";
import {
  buildTeamStrengthMap,
  buildSimStrengthFingerprintSuffix,
} from "../shared/wcSimTeamStrength.js";
import { completedWcMatchesFromList } from "../shared/wcTournamentSim.js";

/**
 * @param {Record<string, unknown>} adv
 * @param {Record<string, unknown>} match
 */
function detailFromAdvancedStats(adv, match) {
  const homeXg = adv?.team?.home?.xg;
  const awayXg = adv?.team?.away?.xg;
  if (!Number.isFinite(Number(homeXg)) || !Number.isFinite(Number(awayXg))) return null;
  return {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: "FT",
    bdlGoat: {
      xgSummary: {
        home: Number(homeXg),
        away: Number(awayXg),
        homeShots: adv?.team?.home?.shots ?? null,
        awayShots: adv?.team?.away?.shots ?? null,
      },
    },
  };
}

/**
 * @param {Array<Record<string, unknown>>} [completedMatches]
 * @param {{ rollingWindow?: number, concurrency?: number }} [opts]
 */
export async function resolveWcSimStrengthFromKv(completedMatches = [], opts = {}) {
  const completed = completedWcMatchesFromList(completedMatches);
  if (!completed.length) {
    return {
      teamStrength: {},
      strengthMatchesApplied: 0,
      xgMatchesApplied: 0,
      teamsWithStrength: 0,
      strengthFingerprint: buildSimStrengthFingerprintSuffix({}),
    };
  }

  const advancedKv = await getDurableJson(WC_MATCH_ADVANCED_STATS_KV_KEY).catch(() => null);
  const advancedByEvent =
    advancedKv?.byEventId && typeof advancedKv.byEventId === "object" ? advancedKv.byEventId : {};

  /** @type {Record<string, Record<string, unknown>>} */
  const detailByEventId = {};
  const concurrency = Math.max(1, Math.min(Number(opts.concurrency) || 8, 16));

  for (let i = 0; i < completed.length; i += concurrency) {
    const batch = completed.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (m) => {
        const eventId = String(m?.id || "");
        if (!eventId) return;
        const detail = await readWcMatchDetailFromKv(eventId).catch(() => null);
        if (detail) {
          detailByEventId[eventId] = detail;
          return;
        }
        const adv = advancedByEvent[eventId];
        const synthetic = adv ? detailFromAdvancedStats(adv, m) : null;
        if (synthetic) detailByEventId[eventId] = synthetic;
      }),
    );
  }

  const built = buildTeamStrengthMap(completed, detailByEventId, opts);
  return {
    ...built,
    strengthFingerprint: buildSimStrengthFingerprintSuffix(built),
  };
}
