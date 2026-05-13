/** Shared rules for dynamic home prompts — hide “live / pre-match” nudges once the underlying event is done. */
import {
  classifyF1Race,
  classifyTennisMatch,
  EVENT_VALIDITY,
  isDisplayableValidity,
} from "../../shared/eventValidity.js";

export function isTennisMatchFinished(m) {
  return classifyTennisMatch(m) === EVENT_VALIDITY.FINISHED;
}

/** F1 “next” race row, or null once that GP is complete (no race-day prompt). */
export function getF1NextRaceForHomePrompts(f1Data) {
  const nextRace = f1Data?.schedule?.races?.find((r) => r?.is_next);
  if (!nextRace) return null;
  if (!isDisplayableValidity(classifyF1Race(nextRace))) return null;
  return nextRace;
}

const ET_CAL = "en-CA";
const ET_TZ = "America/New_York";

function ymdEt(ms) {
  return new Intl.DateTimeFormat(ET_CAL, {
    timeZone: ET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Calendar-day delta (raceYmd − nowYmd); positive = now is before race day. */
function calendarDaysBeforeRace(raceStartMs, nowMs) {
  const a = ymdEt(raceStartMs);
  const b = ymdEt(nowMs);
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const tRace = Date.UTC(ya, ma - 1, da);
  const tNow = Date.UTC(yb, mb - 1, db);
  return Math.round((tRace - tNow) / 86400000);
}

/**
 * Fri–Sun (ET) of the race week — `now` is on the same Fri/Sat/Sun window ending on race Sunday (calendar ET).
 */
export function isF1GpRaceWeekendEt(f1Data, nowMs = Date.now()) {
  const nextRace = getF1NextRaceForHomePrompts(f1Data);
  if (!nextRace) return false;
  const raceStartMs = Date.parse(
    String(nextRace.race_start || nextRace.race_date || nextRace.date_start || ""),
  );
  if (!Number.isFinite(raceStartMs)) return false;
  const delta = calendarDaysBeforeRace(raceStartMs, nowMs);
  return delta >= 0 && delta <= 2;
}

const TENNIS_SHOWCASE_RE =
  /masters|1000|miami|indian wells|monte.?carlo|madrid|rome|cincinnati|montreal|toronto|shanghai|paris|australian open|roland|wimbledon|french open|us open|grand slam|sunshine double/i;

/** Majors / Masters / 1000 context — tennis home prompts only in these windows (plus live slates). */
export function isTennisShowcaseWindow(context, activeTournamentMatches = []) {
  const n = String(context?.currentTournament?.name || "").trim();
  if (n && TENNIS_SHOWCASE_RE.test(n)) return true;
  for (const m of activeTournamentMatches || []) {
    const raw = String(m?.raw?.event_name || m?.raw?.tournament || "").trim();
    if (raw && TENNIS_SHOWCASE_RE.test(raw)) return true;
  }
  return false;
}
