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
        const name = String(s?.session_name || "").toLowerCase();
        return name === "race" || name.includes("grand prix");
      })
    : [];

  if (raceSessions.length > 0) {
    raceSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    if (raceSessions[0]?.date_start) return raceSessions[0].date_start;
  }

  return race?.race_date || race?.date_end || race?.date_start || null;
}
