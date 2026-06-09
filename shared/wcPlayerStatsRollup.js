/**
 * Roll tournament goals/assists from wc_match_detail rows into player registry.
 */

import { normalizeEspnAbbr } from "../api/_wcEspn.js";
import {
  createEmptyPlayerRegistry,
  playerRegistryKey,
  seedRegistryFromStaticList,
  upsertRegistryPlayer,
} from "./wcPlayerRegistry.js";

/**
 * Sum match-level goals/assists into tournament totals (one row per player).
 * @param {Array<Record<string, unknown>>} matchDetails
 */
export function aggregateTournamentStatsFromDetails(matchDetails) {
  /** @type {Map<string, import("./wc2026PlayerConstants.js").WcRegistryPlayer>} */
  const byKey = new Map();

  for (const detail of matchDetails || []) {
    if (!detail || typeof detail !== "object") continue;
    const eventId = detail.eventId != null ? String(detail.eventId) : null;
    const lineupConfirmed = detail.lineupConfirmed === true;
    const sides = [
      [normalizeEspnAbbr(detail.homeTeam), detail.players?.home],
      [normalizeEspnAbbr(detail.awayTeam), detail.players?.away],
    ];

    for (const [teamAbbr, rows] of sides) {
      if (!teamAbbr || !Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row?.name) continue;
        const key = playerRegistryKey(row.name, teamAbbr);
        const prev = byKey.get(key);
        const goals = (Number(prev?.goalsTournament) || 0) + (Number(row.goals) || 0);
        const assists = (Number(prev?.assistsTournament) || 0) + (Number(row.assists) || 0);
        const yellowCards =
          (Number(prev?.yellowCardsTournament) || 0) + (Number(row.yellowCards) || 0);
        const redCards = (Number(prev?.redCardsTournament) || 0) + (Number(row.redCards) || 0);
        byKey.set(key, {
          espnAthleteId: row.espnAthleteId != null ? String(row.espnAthleteId) : prev?.espnAthleteId || null,
          name: String(row.name).trim(),
          position: row.position ? String(row.position) : prev?.position || null,
          nationAbbr: teamAbbr,
          isStarterLikely: Boolean(prev?.isStarterLikely || (lineupConfirmed && row.starter)),
          goalsTournament: goals,
          assistsTournament: assists,
          yellowCardsTournament: yellowCards,
          redCardsTournament: redCards,
          injuryStatus: prev?.injuryStatus ?? null,
          lastSeenEventId: eventId || prev?.lastSeenEventId || null,
        });
      }
    }

    const lineups = detail.lineups;
    if (lineups && lineupConfirmed) {
      for (const [ha, teamAbbr] of [
        ["home", normalizeEspnAbbr(detail.homeTeam)],
        ["away", normalizeEspnAbbr(detail.awayTeam)],
      ]) {
        const side = lineups[ha];
        if (!teamAbbr || !side) continue;
        for (const lp of side.starters || []) {
          if (!lp?.name) continue;
          const key = playerRegistryKey(lp.name, teamAbbr);
          const prev = byKey.get(key);
          byKey.set(key, {
            espnAthleteId: lp.espnAthleteId != null ? String(lp.espnAthleteId) : prev?.espnAthleteId || null,
            name: String(lp.name).trim(),
            position: lp.position ? String(lp.position) : prev?.position || null,
            nationAbbr: teamAbbr,
            isStarterLikely: true,
            goalsTournament: Number(prev?.goalsTournament) || 0,
            assistsTournament: Number(prev?.assistsTournament) || 0,
            yellowCardsTournament: Number(prev?.yellowCardsTournament) || 0,
            redCardsTournament: Number(prev?.redCardsTournament) || 0,
            injuryStatus: prev?.injuryStatus ?? null,
            lastSeenEventId: eventId || prev?.lastSeenEventId || null,
          });
        }
      }
    }
  }

  return byKey;
}

/**
 * @param {Array<Record<string, unknown>>} matchDetails
 * @param {number} [nowMs]
 */
export function buildRegistryFromMatchDetails(matchDetails, nowMs = Date.now()) {
  let registry = createEmptyPlayerRegistry(nowMs);
  seedRegistryFromStaticList(registry);

  const totals = aggregateTournamentStatsFromDetails(matchDetails);
  for (const row of totals.values()) {
    upsertRegistryPlayer(registry, row.nationAbbr, row);
  }

  registry.lastUpdated = nowMs;
  registry.source = matchDetails?.length ? "espn_match_details+seed" : "static";
  return registry;
}
