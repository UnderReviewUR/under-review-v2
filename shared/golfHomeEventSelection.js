/**
 * Home-surface golf event selection: upcoming must not lose to a stale finished currentEvent.
 */
import { classifyGolfEvent, EVENT_VALIDITY } from "./eventValidity.js";
import { parseEventStartMs } from "./eventStartTime.js";

/** Home pipeline + merge promotion window (matches normalizeGolfTournament). */
export const GOLF_HOME_UPCOMING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Spotlight upcoming card window (getGolfHomeValidity). */
export const GOLF_CARD_UPCOMING_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Parse tournament start time — ISO fields, startTs, then displayDate ranges like "May 22–25".
 * @param {Record<string, unknown> | null | undefined} event
 * @param {number} [nowMs]
 */
export function golfEventStartMs(event, nowMs = Date.now()) {
  if (!event || typeof event !== "object") return NaN;
  if (Number.isFinite(event.startTs) && Number(event.startTs) > 0) {
    return Number(event.startTs);
  }
  const fromDate = parseEventStartMs(event.startDate || event.date);
  if (Number.isFinite(fromDate)) return fromDate;
  return parseGolfDisplayDateStartMs(event.displayDate, nowMs);
}

/**
 * @param {string | null | undefined} displayDate
 * @param {number} [nowMs]
 */
export function parseGolfDisplayDateStartMs(displayDate, nowMs = Date.now()) {
  const raw = String(displayDate || "").trim();
  if (!raw) return NaN;

  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return direct;

  const range = raw.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
  if (range) {
    const month = range[1];
    const day = range[2];
    const year = range[4] ? Number(range[4]) : etYearFromMs(nowMs);
    const ms = Date.parse(`${month} ${day}, ${year}`);
    if (Number.isFinite(ms)) return ms;
  }

  const monthDay = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
  if (monthDay) {
    const year = monthDay[3] ? Number(monthDay[3]) : etYearFromMs(nowMs);
    const ms = Date.parse(`${monthDay[1]} ${monthDay[2]}, ${year}`);
    if (Number.isFinite(ms)) return ms;
  }

  return NaN;
}

function etYearFromMs(nowMs) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
    }).format(new Date(nowMs)),
  );
}

/**
 * @param {Record<string, unknown>} event
 * @param {number} nowMs
 * @param {number} windowMs
 */
export function isWithinGolfUpcomingWindow(event, nowMs, windowMs) {
  const startMs = golfEventStartMs(event, nowMs);
  if (!Number.isFinite(startMs)) return false;
  const delta = startMs - nowMs;
  return delta >= 0 && delta <= windowMs;
}

/**
 * @param {Record<string, unknown> | null | undefined} golfData
 * @param {number} [nowMs]
 * @param {number} [windowMs]
 */
export function pickGolfUpcomingFromBoard(
  golfData,
  nowMs = Date.now(),
  windowMs = GOLF_CARD_UPCOMING_WINDOW_MS,
) {
  const seen = new Set();
  /** @type {Record<string, unknown>[]} */
  const candidates = [];

  const add = (e) => {
    if (!e || typeof e !== "object") return;
    const key = String(e.id ?? e.name ?? e.shortName ?? "").trim();
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    if (classifyGolfEvent(e, nowMs) !== EVENT_VALIDITY.UPCOMING) return;
    if (!isWithinGolfUpcomingWindow(e, nowMs, windowMs)) return;
    candidates.push(e);
  };

  add(golfData?.tournament);
  add(golfData?.currentEvent);
  for (const row of golfData?.tourSchedule || []) add(row);

  if (!candidates.length) return null;
  return candidates.sort((a, b) => golfEventStartMs(a, nowMs) - golfEventStartMs(b, nowMs))[0];
}

/**
 * Primary event for home validity — upcoming tournament wins over finished currentEvent.
 * @param {Record<string, unknown> | null | undefined} golfData
 * @param {number} [nowMs]
 */
export function resolveGolfPrimaryEvent(golfData, nowMs = Date.now()) {
  const current = golfData?.currentEvent || null;
  const tournament = golfData?.tournament || null;
  if (!current) return tournament;
  if (!tournament) return current;

  const curV = classifyGolfEvent(current, nowMs);
  const tourV = classifyGolfEvent(tournament, nowMs);
  if (curV === EVENT_VALIDITY.FINISHED && tourV === EVENT_VALIDITY.UPCOMING) {
    return tournament;
  }
  if (curV === EVENT_VALIDITY.FINISHED) {
    const upcoming = pickGolfUpcomingFromBoard(
      golfData,
      nowMs,
      GOLF_HOME_UPCOMING_WINDOW_MS,
    );
    if (upcoming) return upcoming;
  }
  return current;
}

/**
 * @param {Record<string, unknown> | null | undefined} golfData
 * @param {number} [nowMs]
 */
export function isGolfBoardFinished(golfData, nowMs = Date.now()) {
  const primary = resolveGolfPrimaryEvent(golfData, nowMs);
  if (!primary) {
    return !pickGolfUpcomingFromBoard(golfData, nowMs, GOLF_HOME_UPCOMING_WINDOW_MS);
  }
  return classifyGolfEvent(primary, nowMs) === EVENT_VALIDITY.FINISHED;
}

/**
 * After merge: replace a finished currentEvent with the nearest valid upcoming week.
 * @param {{
 *   currentEvent: Record<string, unknown> | null,
 *   tournament: Record<string, unknown> | null,
 *   tourSchedule: Record<string, unknown>[] | null | undefined,
 *   nowMs?: number,
 *   buildFromRow?: (row: Record<string, unknown>, preserve: null) => Record<string, unknown> | null,
 * }} input
 */
export function promoteUpcomingOverFinishedCurrent(input) {
  const nowMs = input.nowMs ?? Date.now();
  const current = input.currentEvent;
  if (!current || typeof current !== "object") return current;
  if (classifyGolfEvent(current, nowMs) !== EVENT_VALIDITY.FINISHED) return current;

  const upcoming = pickGolfUpcomingFromBoard(
    {
      currentEvent: current,
      tournament: input.tournament,
      tourSchedule: input.tourSchedule,
    },
    nowMs,
    GOLF_HOME_UPCOMING_WINDOW_MS,
  );
  if (!upcoming) return current;

  const built =
    typeof input.buildFromRow === "function"
      ? input.buildFromRow(upcoming, null)
      : scheduleRowToUpcomingCurrent(upcoming);

  if (!built?.id) {
    console.warn(
      JSON.stringify({
        event: "golf_promote_upcoming_missing_id",
        name: built?.name || upcoming?.name,
        tournamentId: input.tournament?.id ?? null,
      }),
    );
  }

  console.log(
    JSON.stringify({
      event: "golf_promote_upcoming_over_finished",
      finishedEvent: current?.name || current?.shortName,
      promotedEvent: built?.name || built?.shortName,
      promotedId: built?.id ?? null,
      startDate: built?.startDate ?? upcoming?.startDate,
      startTs: built?.startTs ?? upcoming?.startTs,
    }),
  );

  return built || current;
}

/**
 * @param {Record<string, unknown>} row
 */
function scheduleRowToUpcomingCurrent(row) {
  return {
    id: row.id ?? null,
    name: row.name || row.shortName || "PGA Tour Event",
    shortName: row.shortName || row.name || "PGA Tour",
    course:
      row.courseName || (typeof row.course === "string" ? row.course : null) || "TBD",
    location: row.location || "",
    round: "Upcoming",
    state: "pre",
    par: row.par ?? null,
    startDate: row.startDate || null,
    endDate: row.endDate != null && row.endDate !== "" ? row.endDate : null,
    displayDate: row.displayDate || null,
    startTs: Number.isFinite(row.startTs) ? row.startTs : null,
    endTs: Number.isFinite(row.endTs) ? row.endTs : null,
    leaderboard: [],
  };
}
