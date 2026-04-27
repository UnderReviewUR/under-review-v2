/** OpenF1 Sunday GP session — excludes Sprint (same session_type "Race", session_name "Sprint"). */
export function isSundayGrandPrixRaceSession(s) {
  const name = String(s?.session_name || "").trim().toLowerCase();
  const typ = String(s?.session_type || "").trim();
  const bannedSubstrings = ["practice", "qualifying", "qualy", "shakedown"];
  for (const b of bannedSubstrings) {
    if (name.includes(b)) return false;
  }
  if (name === "sprint") return false;
  if (name === "race") return true;
  return typ === "Race" && name !== "sprint" && name !== "";
}

/** Earliest Sunday GP start among sessions (no meeting filter). Used by api/f1 when fetching per meeting. */
export function extractGrandPrixRaceStartFromSessions(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const raceSessions = sessions.filter(isSundayGrandPrixRaceSession);
  if (!raceSessions.length) return null;
  raceSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  return raceSessions[0]?.date_start || null;
}

function sessionMatchesRaceMeeting(race, s) {
  const rk = race?.meeting_key;
  if (rk == null) return true;
  const sk = s?.meeting_key;
  if (sk == null) return false;
  return String(sk) === String(rk);
}

/** Resolves grand prix race start time for display / slate windows (shared by API + client). */
export function resolveF1RaceStart(race, sessions = []) {
  if (!race) return null;
  if (race?.race_start) return race.race_start;

  const raceSessions = Array.isArray(sessions)
    ? sessions.filter((s) => sessionMatchesRaceMeeting(race, s) && isSundayGrandPrixRaceSession(s))
    : [];

  if (raceSessions.length > 0) {
    raceSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    if (raceSessions[0]?.date_start) return raceSessions[0].date_start;
  }

  return null;
}
