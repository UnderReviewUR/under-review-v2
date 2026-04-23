/** Resolves grand prix race start time for display / slate windows (shared by API + client). */
export function resolveF1RaceStart(race, sessions = []) {
  if (!race) return null;
  if (race?.race_start) return race.race_start;

  const raceSessions = Array.isArray(sessions)
    ? sessions.filter((s) => {
        const sameMeeting =
          race?.meeting_key == null ||
          s?.meeting_key == null ||
          String(s.meeting_key) === String(race.meeting_key);
        if (!sameMeeting) return false;
        const name = String(s?.session_name || "").trim().toLowerCase();
        if (name !== "race") return false;
        const banned = ["sprint", "practice", "qualifying", "qualy", "shakedown"];
        for (const b of banned) {
          if (name.includes(b)) return false;
        }
        return true;
      })
    : [];

  if (raceSessions.length > 0) {
    raceSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    if (raceSessions[0]?.date_start) return raceSessions[0].date_start;
  }

  return null;
}
