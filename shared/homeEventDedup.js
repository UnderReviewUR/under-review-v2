/**
 * Canonical event keys for cross-module dedup (Live Snapshot → sport cards → Today's Slate).
 * Format: `sport:stableId`
 */
export function nbaEventKey(g) {
  if (!g || typeof g !== "object") return null;
  const id = g.id ?? g.game_id ?? g.event_id ?? g.gameId;
  if (id != null && String(id).trim()) return `nba:${String(id).trim()}`;
  const away = String(g?.awayTeam?.abbr || g?.awayTeam?.name || "").trim();
  const home = String(g?.homeTeam?.abbr || g?.homeTeam?.name || "").trim();
  const d = String(g?.startTimeUtc || g?.date || g?.commence_time || "").slice(0, 10);
  if (away && home) return `nba:${away}|${home}|${d || "nodate"}`;
  return null;
}

export function mlbEventKey(g) {
  if (!g || typeof g !== "object") return null;
  const id = g.id ?? g.game_id ?? g.event_id ?? g.gamePk;
  if (id != null && String(id).trim()) return `mlb:${String(id).trim()}`;
  const away = String(g?.awayTeam?.abbr || g?.awayTeam?.name || "").trim();
  const home = String(g?.homeTeam?.abbr || g?.homeTeam?.name || "").trim();
  const d = String(g?.date || g?.startTimeUtc || "").slice(0, 10);
  if (away && home) return `mlb:${away}|${home}|${d || "nodate"}`;
  return null;
}

/** Normalized tennis match from client (`normalizeTennisMatch` output). */
export function tennisEventKeyFromNormalized(m) {
  if (!m || typeof m !== "object") return null;
  const raw = m.raw || {};
  const id = raw.bdl_match_id ?? raw.odds_event_id ?? raw.id ?? m.id;
  if (id != null && String(id).trim()) return `tennis:${String(id).trim()}`;
  const h = String(raw.home || "").trim();
  const a = String(raw.away || "").trim();
  const d = String(raw.event_date || "").trim();
  if (h && a) return `tennis:${h}|${a}|${d || "nodate"}`;
  return null;
}

/** Board row from /api/tennis (pre-normalize). */
export function tennisEventKeyFromBoardRow(row) {
  if (!row || typeof row !== "object") return null;
  const id = row.bdl_match_id ?? row.odds_event_id ?? row.id;
  if (id != null && String(id).trim()) return `tennis:${String(id).trim()}`;
  const p1 = String(row.home_team || row.event_first_player || "").trim();
  const p2 = String(row.away_team || row.event_second_player || "").trim();
  const d = String(row.event_date || "").trim();
  if (p1 && p2) return `tennis:${p1}|${p2}|${d || "nodate"}`;
  return null;
}

export function f1EventKey(race) {
  if (!race || typeof race !== "object") return null;
  const mk = race.meeting_key ?? race.meeting_id ?? race.meeting_key_numeric;
  if (mk != null && String(mk).trim()) return `f1:${String(mk).trim()}`;
  const name = String(race.meeting_name || race.name || "").trim();
  return name ? `f1:${name}` : null;
}

export function golfSnapshotKey(golfData) {
  if (!golfData || typeof golfData !== "object") return null;
  const ev = golfData.currentEvent || golfData.tournament || null;
  if (ev) {
    const id = ev.id ?? ev.tournament_id ?? ev.event_id;
    if (id != null && String(id).trim()) return `golf:${String(id).trim()}`;
    const n = String(ev.shortName || ev.name || "").trim();
    if (n) return `golf:${n}`;
  }
  const up = golfData?.tournament || null;
  if (up?.id) return `golf:${String(up.id)}`;
  return null;
}

export function nflSnapshotBoardKey() {
  return "nfl:weekly-props-board";
}

/** Parse "AWAY @ HOME" / "AWAY vs HOME" style labels for bundle matching (server + tests). */
export function parseAwayHomeFromLabel(label) {
  const s = String(label || "").trim();
  if (!s) return { away: "", home: "" };
  const vs = s.split(/\s+vs\s+/i);
  if (vs.length === 2) {
    return { away: vs[0].trim(), home: vs[1].trim() };
  }
  const at = s.split(/\s+@\s+|\s+at\s+/i);
  if (at.length === 2) {
    return { away: at[0].trim(), home: at[1].trim() };
  }
  return { away: "", home: "" };
}
