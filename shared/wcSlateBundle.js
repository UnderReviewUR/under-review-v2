/**
 * World Cup board slice for Today's Slate + home prompts (KV-first).
 */

import { readWcGroupsFromKv, readWcMatchesFromKv, readWcOutrightsFromKv } from "../api/_wcData.js";
import { getGroupsPayload, getMatchesPayload, getOutrightsPayload } from "../api/world-cup.js";
import { isWcGoatPrimaryEnabled } from "./wcBdlPolicy.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { isWcHomePromoWindow } from "./wc2026Constants.js";
import { wcTeamsWithStrengthTags } from "./wc2026Strength.js";
import { resolveWcTournamentPhase } from "./wcPhaseUtils.js";

/**
 * @param {number} [nowMs]
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadWorldCupSlateBoard(nowMs = Date.now()) {
  if (!isWcHomePromoWindow(nowMs)) return null;

  // GOAT primary: route the home/daily-take board through the BDL-first payload
  // helpers (live BDL → cached BDL → ESPN/seed) so the free preview never shows
  // ESPN/static odds while BDL GOAT lines are available.
  const preferGoat = isWcGoatPrimaryEnabled();
  const [groupsKv, matchesKv, outrightsKv] = preferGoat
    ? await Promise.all([
        getGroupsPayload({ preferGoat: true }).catch(() => readWcGroupsFromKv()),
        getMatchesPayload({ preferGoat: true }).catch(() => readWcMatchesFromKv()),
        getOutrightsPayload({ preferGoat: true }).catch(() => readWcOutrightsFromKv()),
      ])
    : await Promise.all([
        readWcGroupsFromKv(),
        readWcMatchesFromKv(),
        readWcOutrightsFromKv(),
      ]);

  const groups = groupsKv?.groups || {};
  const matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  const outrights = outrightsKv?.outrights || {};

  const groupSummaries = [];
  for (const letter of "ABCDEFGHIJKL") {
    const rows = Array.isArray(groups[letter]) ? groups[letter] : [];
    if (!rows.length) continue;
    const leader = rows[0];
    groupSummaries.push({
      group: letter,
      leader: leader?.team || leader?.abbreviation,
      points: leader?.points ?? 0,
      played: leader?.played ?? 0,
    });
  }

  const upcoming = matches
    .filter((m) => {
      const s = String(m?.status || "").toLowerCase();
      return s === "ns" || s === "scheduled" || s === "upcoming";
    })
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0))
    .slice(0, 8)
    .map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      group: m.group,
      round: m.round || null,
      date: m.date,
      status: m.status,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      odds: m.odds || null,
    }));

  const live = matches
    .filter((m) => ["live", "ht", "1h", "2h"].includes(String(m?.status || "").toLowerCase()))
    .slice(0, 4)
    .map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      group: m.group,
      round: m.round || null,
      status: m.status,
      odds: m.odds || null,
    }));

  /** Longshot-style outright value tags for fallback copy */
  const valueOutrights = WC_2026_TEAMS.map((t) => ({
    team: t.abbreviation,
    name: t.name,
    group: t.group,
    odds: outrights[t.abbreviation] || null,
  }))
    .filter((t) => t.odds && /\+[4-9]\d{3}|\+[1-9]\d{4}/.test(String(t.odds)))
    .slice(0, 8);

  const favorites = [];
  for (const letter of "ABCDEFGHIJKL") {
    const inGroup = WC_2026_TEAMS.filter((t) => t.group === letter);
    const tagged = wcTeamsWithStrengthTags(inGroup);
    for (const t of tagged.slice(0, 2)) {
      favorites.push({
        team: t.abbreviation,
        name: t.name,
        group: letter,
        strengthTag: t.strengthTag,
        odds: outrights[t.abbreviation] || null,
      });
    }
  }

  if (!groupSummaries.length && !upcoming.length && !Object.keys(outrights).length) {
    return {
      tournament: "2026 FIFA World Cup",
      hosts: ["USA", "Mexico", "Canada"],
      kickoff: "2026-06-11",
      groups: [],
      upcoming: [],
      live: [],
      outrightsSample: {},
      valueOutrights: [
        { team: "NOR", name: "Norway", odds: "+2500" },
        { team: "PAR", name: "Paraguay", odds: "+8000" },
      ],
      favorites: favorites.slice(0, 12),
      source: "static_shell",
    };
  }

  return {
    tournament: "2026 FIFA World Cup",
    hosts: ["USA", "Mexico", "Canada"],
    kickoff: "2026-06-11",
    tournamentPhase: resolveWcTournamentPhase(matches),
    groups: groupSummaries,
    upcoming,
    live,
    outrightsSample: Object.fromEntries(
      Object.entries(outrights)
        .slice(0, 24)
        .filter(([, v]) => v),
    ),
    valueOutrights,
    favorites: favorites.slice(0, 16),
    lastUpdated: Math.max(
      Number(groupsKv?.lastUpdated) || 0,
      Number(matchesKv?.lastUpdated) || 0,
      Number(outrightsKv?.lastUpdated) || 0,
    ),
    source: groupsKv?.source || matchesKv?.source || "kv",
  };
}
