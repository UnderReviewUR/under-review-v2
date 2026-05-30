/**
 * Home-surface golf event selection: upcoming must not lose to a stale finished currentEvent.
 */
import { classifyGolfEvent, EVENT_VALIDITY } from "./eventValidity.js";
import { parseEventStartMs } from "./eventStartTime.js";
import { slugOverlapsGolfLabels } from "./golfTournamentIntent.js";

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
 * @param {Record<string, unknown>} event
 * @param {number} [nowMs]
 */
export function golfEventEndMs(event, nowMs = Date.now()) {
  if (!event || typeof event !== "object") return NaN;
  if (Number.isFinite(event.endTs) && Number(event.endTs) > 0) {
    return Number(event.endTs);
  }
  const end = parseEventStartMs(event.endDate);
  if (Number.isFinite(end)) return end;
  const start = golfEventStartMs(event, nowMs);
  if (Number.isFinite(start)) return start + 4 * 24 * 60 * 60 * 1000;
  return NaN;
}

function etYmdFromMs(nowMs) {
  return new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * True when the tournament week includes today ET (Thu–Sun window) or feed marks live/active.
 * @param {Record<string, unknown>} event
 * @param {number} [nowMs]
 */
export function isGolfInPlayWindow(event, nowMs = Date.now()) {
  if (!event || typeof event !== "object") return false;
  if (classifyGolfEvent(event, nowMs) === EVENT_VALIDITY.ACTIVE) return true;

  const start = golfEventStartMs(event, nowMs);
  const end = golfEventEndMs(event, nowMs);
  if (Number.isFinite(start) && Number.isFinite(end) && nowMs >= start && nowMs <= end) {
    return true;
  }

  const todayEt = etYmdFromMs(nowMs);
  const startEt = String(event.startDate || "").trim().slice(0, 10);
  const endEt = String(event.endDate || "").trim().slice(0, 10);
  if (startEt && endEt && todayEt >= startEt && todayEt <= endEt) return true;
  if (startEt && !endEt && todayEt === startEt) return true;

  return false;
}

/**
 * Best week for board header: in-window (this week ET) beats a future upcoming event within 72h.
 * @param {Record<string, unknown>[]} rows
 * @param {number} [nowMs]
 */
export function pickBestGolfWeekPrimary(rows, nowMs = Date.now()) {
  const list = (rows || []).filter((r) => r && typeof r === "object");
  if (!list.length) return null;

  const meta = list.map((r) => ({
    r,
    v: classifyGolfEvent(r, nowMs),
    start: golfEventStartMs(r, nowMs),
    inWindow: isGolfInPlayWindow(r, nowMs),
  }));

  const inWindow = meta.filter((m) => m.inWindow && m.v !== EVENT_VALIDITY.FINISHED);
  if (inWindow.length) {
    return inWindow.sort((a, b) => a.start - b.start)[0].r;
  }

  const active = meta.filter((m) => m.v === EVENT_VALIDITY.ACTIVE);
  if (active.length) {
    return active.sort((a, b) => a.start - b.start)[0].r;
  }

  const upcoming = meta.filter(
    (m) =>
      m.v === EVENT_VALIDITY.UPCOMING &&
      isWithinGolfUpcomingWindow(m.r, nowMs, GOLF_HOME_UPCOMING_WINDOW_MS),
  );
  if (upcoming.length) {
    return upcoming.sort((a, b) => a.start - b.start)[0].r;
  }

  return null;
}

function slugKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameGolfWeek(a, b) {
  const ka = slugKey(a?.name || a?.shortName);
  const kb = slugKey(b?.name || b?.shortName);
  return ka && kb && (ka === kb || ka.includes(kb) || kb.includes(ka));
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
  const rows = [
    ...(Array.isArray(golfData?.tourSchedule) ? golfData.tourSchedule : []),
    golfData?.tournament,
    golfData?.currentEvent,
  ].filter(Boolean);
  const best = pickBestGolfWeekPrimary(rows, nowMs);
  if (best) return best;
  return golfData?.currentEvent || golfData?.tournament || null;
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
 * Align currentEvent with the best schedule row (in-window this week beats next week's preview).
 * @param {{
 *   currentEvent: Record<string, unknown> | null,
 *   tournament: Record<string, unknown> | null,
 *   tourSchedule: Record<string, unknown>[] | null | undefined,
 *   nowMs?: number,
 *   buildFromRow?: (row: Record<string, unknown>, preserve: null) => Record<string, unknown> | null,
 * }} input
 */
export function reconcileGolfBoardCurrentEvent(input) {
  const nowMs = input.nowMs ?? Date.now();
  const rows = [
    ...(Array.isArray(input.tourSchedule) ? input.tourSchedule : []),
    input.tournament,
    input.currentEvent,
  ].filter(Boolean);

  const best = pickBestGolfWeekPrimary(rows, nowMs);
  if (!best) return input.currentEvent;

  if (input.currentEvent && sameGolfWeek(input.currentEvent, best)) {
    return input.currentEvent;
  }

  const built =
    typeof input.buildFromRow === "function"
      ? input.buildFromRow(best, null)
      : scheduleRowToUpcomingCurrent(best);

  const current = input.currentEvent;
  const shouldReplace =
    !current ||
    classifyGolfEvent(current, nowMs) === EVENT_VALIDITY.FINISHED ||
    (isGolfInPlayWindow(best, nowMs) && !isGolfInPlayWindow(current, nowMs)) ||
    (() => {
      const bestStart = golfEventStartMs(best, nowMs);
      const curStart = golfEventStartMs(current, nowMs);
      return (
        Number.isFinite(bestStart) &&
        Number.isFinite(curStart) &&
        bestStart < curStart - 6 * 60 * 60 * 1000
      );
    })();

  if (!shouldReplace) return current;

  console.log(
    JSON.stringify({
      event: "golf_reconcile_current_event",
      previousEvent: current?.name || current?.shortName || null,
      selectedEvent: built?.name || built?.shortName,
      selectedId: built?.id ?? best?.id ?? null,
      reason: !current
        ? "missing"
        : classifyGolfEvent(current, nowMs) === EVENT_VALIDITY.FINISHED
          ? "finished"
          : isGolfInPlayWindow(best, nowMs)
            ? "in_window"
            : "earlier_start",
    }),
  );

  return built || current;
}

/** @deprecated alias */
export function promoteUpcomingOverFinishedCurrent(input) {
  return reconcileGolfBoardCurrentEvent(input);
}

function readGolfCourseLabel(courseBlob) {
  if (!courseBlob) return "";
  if (typeof courseBlob === "string") return String(courseBlob).trim();
  if (typeof courseBlob === "object") {
    return String(courseBlob.name || courseBlob.course || "").trim();
  }
  return "";
}

/**
 * Drop BDL course / courseStats from a different week than the primary event (e.g. Colonial stats on Byron Nelson week).
 * @param {Record<string, unknown> | null | undefined} board
 */
export function stripMisalignedGolfCourseArtifacts(board) {
  if (!board || typeof board !== "object") return board;

  const primary = resolveGolfPrimaryEvent(board);
  if (!primary) return board;

  const expectedCourse = String(primary.course || primary.courseName || "").trim();
  const blobName = readGolfCourseLabel(board.course);
  const bundleTournament = board.tournament;
  const bundleMatchesPrimary =
    !bundleTournament ||
    (primary.id != null &&
      bundleTournament.id != null &&
      String(primary.id).trim() === String(bundleTournament.id).trim()) ||
    slugOverlapsGolfLabels(bundleTournament.name, primary.name) ||
    slugOverlapsGolfLabels(bundleTournament.shortName, primary.shortName);

  const courseBlobAligned =
    !blobName ||
    !expectedCourse ||
    expectedCourse === "TBD" ||
    slugOverlapsGolfLabels(blobName, expectedCourse);

  if (bundleMatchesPrimary && courseBlobAligned) return board;

  const slimCourse = expectedCourse
    ? { name: expectedCourse.split(/\s*[-–]\s*/)[0].trim() || expectedCourse }
    : null;

  console.log(
    JSON.stringify({
      event: "golf_strip_misaligned_course_artifacts",
      primaryEvent: primary.name || primary.shortName,
      expectedCourse: expectedCourse || null,
      removedCourseBlob: blobName || null,
      bundleTournament: bundleTournament?.name || null,
      bundleMatchesPrimary,
      courseBlobAligned,
    }),
  );

  return {
    ...board,
    course: slimCourse,
    courseStats: [],
    courseHoles: [],
    recentResults: [],
  };
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
