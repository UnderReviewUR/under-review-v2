/**
 * WTA “board” rows without a third-party fixtures API — built from static player DB +
 * tournamentMeta so they align with tennis-context / UR TAKE.
 */
import wta from "../data/tennis/wta.js";
import expanded from "../data/tennis/expanded.js";
import {
  TOURNAMENTS,
  getActiveTournamentKey,
  matchTournamentKeyFromActiveParam,
} from "../data/tennis/tournamentMeta.js";

function mergedWtaPlayers() {
  return { ...(expanded?.wta || {}), ...(wta || {}) };
}

/**
 * Same fixture shape as ATP BDL rows so tennis.js uses one pipeline.
 */
export function buildStaticWtaBoardRows(activeTournamentParam = "") {
  const merged = mergedWtaPlayers();
  const ranked = Object.entries(merged)
    .map(([name, row]) => ({
      name,
      eloRank: Number(row?.eloRank),
    }))
    .filter((x) => Number.isFinite(x.eloRank))
    .sort((a, b) => a.eloRank - b.eloRank)
    .slice(0, 16);

  if (ranked.length < 2) return [];

  const key = matchTournamentKeyFromActiveParam(activeTournamentParam);
  const meta = TOURNAMENTS[key] || TOURNAMENTS[getActiveTournamentKey()];
  const tournamentName = meta?.name || "WTA Tour";
  const surface = meta?.surface || "Hard";

  const today = new Date().toISOString().slice(0, 10);
  const iso = `${today}T17:00:00.000Z`;

  const rows = [];
  for (let i = 0; i + 1 < ranked.length && rows.length < 6; i += 2) {
    const p1 = ranked[i].name;
    const p2 = ranked[i + 1].name;
    rows.push({
      event_first_player: p1,
      event_second_player: p2,
      tournament_name: tournamentName,
      tournament_round: "Elo snapshot · pricing lens",
      event_date: today,
      event_time: "17:00",
      event_status: "scheduled",
      event_live: "0",
      event_final_result: "",
      event_game_result: "",
      league_name: "WTA",
      event_type_type: "WTA Singles",
      odd_1: null,
      odd_2: null,
      source: "ur_static_wta",
      ur_static_snapshot: true,
      ur_tournament_key: key,
      bdl_tournament_surface: surface,
      bdl_tournament_category: "Profile snapshot",
      bdl_scheduled_time: iso,
      commence_iso: iso,
      event_key: `ur-wta-${key}-${p1}-${p2}`.replace(/\s+/g, "_"),
    });
  }

  return rows;
}
