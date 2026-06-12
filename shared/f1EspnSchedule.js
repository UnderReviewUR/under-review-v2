/** 2026 F1 calendar — canonical race names used for OpenF1 + ESPN schedule alignment. */
export const F1_2026_VALID_RACES = new Set([
  "Australian Grand Prix",
  "Chinese Grand Prix",
  "Japanese Grand Prix",
  "Miami Grand Prix",
  "Canadian Grand Prix",
  "Monaco Grand Prix",
  "Spanish Grand Prix",
  "Austrian Grand Prix",
  "British Grand Prix",
  "Belgian Grand Prix",
  "Hungarian Grand Prix",
  "Dutch Grand Prix",
  "Italian Grand Prix",
  "Spanish Grand Prix (Madrid)",
  "Azerbaijan Grand Prix",
  "Singapore Grand Prix",
  "United States Grand Prix",
  "Mexico City Grand Prix",
  "Sao Paulo Grand Prix",
  "Las Vegas Grand Prix",
  "Qatar Grand Prix",
  "Abu Dhabi Grand Prix",
]);

/**
 * Map ESPN sponsor-prefixed labels to canonical 2026 race names.
 * @param {string} label
 * @param {Set<string>} [validRaces]
 */
export function canonicalMeetingNameFromEspnLabel(label, validRaces = F1_2026_VALID_RACES) {
  const s = String(label || "").trim();
  if (!s) return null;
  if (validRaces.has(s)) return s;

  if (/barcelona|catalunya/i.test(s) && validRaces.has("Spanish Grand Prix")) {
    return "Spanish Grand Prix";
  }
  if (/tag heuer spanish/i.test(s) && validRaces.has("Spanish Grand Prix (Madrid)")) {
    return "Spanish Grand Prix (Madrid)";
  }
  if (/são paulo|sao paulo/i.test(s) && validRaces.has("Sao Paulo Grand Prix")) {
    return "Sao Paulo Grand Prix";
  }

  for (const canonical of validRaces) {
    const core = canonical.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (core && s.includes(core)) return canonical;
  }

  return null;
}

/** @param {{ event?: { $ref?: string } }} entry */
export function espnEventIdFromCalendarEntry(entry) {
  const ref = String(entry?.event?.$ref || "");
  const match = ref.match(/events\/(\d+)/);
  return match ? Number(match[1]) : null;
}

/** @param {Record<string, unknown> | null | undefined} event */
export function extractRaceStartFromEspnEvent(event) {
  if (!event || typeof event !== "object") return null;
  const competitions = Array.isArray(event.competitions) ? event.competitions : [];
  const race = competitions.find((c) => String(c?.type?.abbreviation || "").toLowerCase() === "race");
  return race?.startDate ? String(race.startDate) : null;
}

/**
 * Build OpenF1-compatible schedule rows when meetings API is unavailable.
 * @param {{
 *   calendar?: Array<Record<string, unknown>>,
 *   currentEvent?: Record<string, unknown> | null,
 *   validRaces?: Set<string>,
 *   now?: Date,
 * }} input
 */
export function buildScheduleFromEspnCalendar(input = {}) {
  const calendar = Array.isArray(input.calendar) ? input.calendar : [];
  const validRaces = input.validRaces || F1_2026_VALID_RACES;
  const now = input.now instanceof Date && !Number.isNaN(input.now.getTime()) ? input.now : new Date();
  const currentEvent = input.currentEvent && typeof input.currentEvent === "object" ? input.currentEvent : null;
  const currentEventId = currentEvent?.id != null ? String(currentEvent.id) : null;
  const currentRaceStart = extractRaceStartFromEspnEvent(currentEvent);

  const empty = {
    races: [],
    upcoming: [],
    past: [],
    current: [],
    next_meeting_key: null,
    usingFallback: true,
    scheduleSource: "espn",
  };

  if (!calendar.length) return empty;

  /** @type {Array<Record<string, unknown>>} */
  const normalized = [];

  for (const entry of calendar) {
    const meeting_name = canonicalMeetingNameFromEspnLabel(String(entry?.label || ""), validRaces);
    if (!meeting_name) continue;

    const eventId = espnEventIdFromCalendarEntry(entry);
    const startRaw = entry?.startDate ? String(entry.startDate) : null;
    const endRaw = entry?.endDate ? String(entry.endDate) : null;
    if (!startRaw || !endRaw) continue;

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const isCurrentWeekend =
      currentEventId != null && eventId != null && String(eventId) === currentEventId;

    normalized.push({
      meeting_key: eventId,
      meeting_name,
      location: isCurrentWeekend
        ? String(currentEvent?.circuit?.address?.city || currentEvent?.circuit?.fullName || "TBD").trim() ||
          "TBD"
        : "TBD",
      circuit_short_name: isCurrentWeekend
        ? currentEvent?.circuit?.shortName || null
        : null,
      circuitFullName: isCurrentWeekend ? currentEvent?.circuit?.fullName || null : null,
      circuitCity: isCurrentWeekend ? currentEvent?.circuit?.address?.city || null : null,
      country_name: isCurrentWeekend ? currentEvent?.circuit?.address?.country || null : null,
      date_start: startRaw,
      date_end: endRaw,
      race_date: isCurrentWeekend && currentRaceStart ? currentRaceStart : endRaw,
      race_start: isCurrentWeekend ? currentRaceStart : null,
      espnRaceStart: isCurrentWeekend ? currentRaceStart : null,
      completed: end < now,
      winner: null,
    });
  }

  normalized.sort(
    (a, b) =>
      new Date(String(a.race_date || a.date_start)).getTime() -
      new Date(String(b.race_date || b.date_start)).getTime(),
  );

  if (!normalized.length) return empty;

  const current = normalized.filter((m) => {
    const start = new Date(String(m.date_start));
    const end = new Date(String(m.date_end));
    return start <= now && now <= end;
  });

  const upcoming = normalized.filter(
    (m) => !m.completed && new Date(String(m.race_date || m.date_start)) > now,
  );
  const past = normalized.filter(
    (m) => m.completed || new Date(String(m.date_end)) < now,
  );

  const nextRace = current[0] || upcoming[0] || null;
  const races = normalized.map((m) => ({
    ...m,
    is_next: !!(nextRace && m.meeting_name === nextRace.meeting_name),
  }));

  return {
    races,
    upcoming,
    past,
    current,
    next_meeting_key: nextRace ? nextRace.meeting_key : null,
    usingFallback: false,
    scheduleSource: "espn",
  };
}

/**
 * Enrich an OpenF1-built schedule with ESPN circuit + race start for the current weekend.
 * @param {Record<string, unknown> | null | undefined} schedule
 * @param {Record<string, unknown> | null | undefined} currentEvent
 */
export function patchScheduleWithEspnCurrentEvent(schedule, currentEvent) {
  if (!schedule || typeof schedule !== "object" || !currentEvent) return schedule;

  const circuitName = currentEvent?.circuit?.fullName || null;
  const city = currentEvent?.circuit?.address?.city || null;
  const raceStart = extractRaceStartFromEspnEvent(currentEvent);
  if (!circuitName && !raceStart) return schedule;

  const patchRace = (race) => {
    if (!race?.is_next) return race;
    return {
      ...race,
      circuitFullName: circuitName || race.circuitFullName || null,
      circuitCity: city || race.circuitCity || null,
      espnRaceStart: raceStart || race.espnRaceStart || null,
      race_start: race.race_start || raceStart || null,
      race_date: raceStart || race.race_date || race.date_end || race.date_start,
    };
  };

  return {
    ...schedule,
    races: Array.isArray(schedule.races) ? schedule.races.map(patchRace) : schedule.races,
    upcoming: Array.isArray(schedule.upcoming) ? schedule.upcoming.map(patchRace) : schedule.upcoming,
    current: Array.isArray(schedule.current) ? schedule.current.map(patchRace) : schedule.current,
  };
}
