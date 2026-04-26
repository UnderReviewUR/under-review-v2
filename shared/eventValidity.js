import {
  canonicalMlbStartUtcMs,
  canonicalNbaStartUtcMs,
  parseEventStartMs,
} from "./eventStartTime.js";

export const EVENT_VALIDITY = Object.freeze({
  UPCOMING: "upcoming",
  ACTIVE: "active",
  FINISHED: "finished",
  STALE: "stale",
  UNKNOWN: "unknown",
});

const FINISHED_KEYWORDS = [
  "finished",
  "final",
  "ended",
  "retired",
  "walkover",
  "walk over",
  "defaulted",
  "cancelled",
  "canceled",
  "postponed",
  "abandoned",
  "complete",
];
const NBA_TIP_FEED_LAG_GRACE_MS = 10 * 60 * 1000;

function hasEndedByEndDate(endMs, nowMs) {
  return Number.isFinite(endMs) && nowMs > endMs;
}

function hasFinishedKeyword(value) {
  const s = String(value || "").trim().toLowerCase();
  return s ? FINISHED_KEYWORDS.some((k) => s.includes(k)) : false;
}

export function isDisplayableValidity(state) {
  return state === EVENT_VALIDITY.UPCOMING || state === EVENT_VALIDITY.ACTIVE;
}

export function classifyGolfEvent(event, nowMs = Date.now()) {
  if (!event || typeof event !== "object") return EVENT_VALIDITY.UNKNOWN;
  const state = String(event.state || "").toLowerCase();
  if (state === "post" || state === "final") return EVENT_VALIDITY.FINISHED;

  const hasIdentity =
    Boolean(String(event.id || "").trim()) &&
    Boolean(String(event.name || event.shortName || "").trim());
  if (!hasIdentity) return EVENT_VALIDITY.UNKNOWN;

  const startMs = parseEventStartMs(event.startDate);
  let endMs = parseEventStartMs(event.endDate);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = startMs + 4 * 24 * 60 * 60 * 1000;
  }
  if (hasEndedByEndDate(endMs, nowMs)) return EVENT_VALIDITY.FINISHED;
  if (state === "in" || state === "live") return EVENT_VALIDITY.ACTIVE;
  if (state === "pre") {
    if (!Number.isFinite(startMs)) return EVENT_VALIDITY.UNKNOWN;
    return nowMs < startMs ? EVENT_VALIDITY.UPCOMING : EVENT_VALIDITY.FINISHED;
  }
  if (Number.isFinite(startMs) && nowMs < startMs) {
    return EVENT_VALIDITY.UPCOMING;
  }
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs <= endMs) {
    return EVENT_VALIDITY.ACTIVE;
  }
  if (Number.isFinite(startMs) && nowMs > startMs) return EVENT_VALIDITY.FINISHED;
  return EVENT_VALIDITY.UNKNOWN;
}

export function classifyTennisMatch(match, nowMs = Date.now()) {
  if (!match || typeof match !== "object") return EVENT_VALIDITY.UNKNOWN;
  const status = String(match?.raw?.event_status || match?.raw?.status || "")
    .trim()
    .toLowerCase();
  if (hasFinishedKeyword(status)) return EVENT_VALIDITY.FINISHED;

  if (String(match?.raw?.live || "0") === "1") return EVENT_VALIDITY.ACTIVE;

  const hasIdentity =
    Boolean(String(match?.raw?.home || "").trim()) &&
    Boolean(String(match?.raw?.away || "").trim());
  if (!hasIdentity) return EVENT_VALIDITY.UNKNOWN;

  const commenceTs = Number(match?.commenceTs);
  const startMs = Number.isFinite(commenceTs)
    ? commenceTs
    : parseEventStartMs(match?.raw?.event_date || match?.raw?.date);

  if (Number.isFinite(startMs)) {
    if (nowMs < startMs) return EVENT_VALIDITY.UPCOMING;
    if (nowMs <= startMs + 6 * 60 * 60 * 1000) return EVENT_VALIDITY.ACTIVE;
    return EVENT_VALIDITY.FINISHED;
  }
  return EVENT_VALIDITY.UNKNOWN;
}

function classifyGameState({ game, nowMs, durationMs, sport }) {
  if (!game || typeof game !== "object") return EVENT_VALIDITY.UNKNOWN;
  const state = String(game.state || "").toLowerCase();
  const hasIdentity =
    Boolean(String(game.id || "").trim()) ||
    (Boolean(String(game?.awayTeam?.abbr || game?.awayTeam?.name || "").trim()) &&
      Boolean(String(game?.homeTeam?.abbr || game?.homeTeam?.name || "").trim()));
  if (!hasIdentity) return EVENT_VALIDITY.UNKNOWN;
  if (state === "post" || state === "final") return EVENT_VALIDITY.FINISHED;
  if (state === "in" || state === "live") return EVENT_VALIDITY.ACTIVE;

  const startMs =
    sport === "mlb" ? canonicalMlbStartUtcMs(game) : canonicalNbaStartUtcMs(game);
  const endMs =
    parseEventStartMs(game.endDate || game.date_end) ||
    (Number.isFinite(startMs) ? startMs + durationMs : NaN);
  if (hasEndedByEndDate(endMs, nowMs)) return EVENT_VALIDITY.FINISHED;
  if (state === "pre" || state === "scheduled") {
    if (!Number.isFinite(startMs)) return EVENT_VALIDITY.UNKNOWN;
    if (sport === "nba") {
      const delta = startMs - nowMs;
      const awayScore = Number(game?.awayTeam?.score);
      const homeScore = Number(game?.homeTeam?.score);
      if (delta < 0 && delta > -NBA_TIP_FEED_LAG_GRACE_MS && awayScore === 0 && homeScore === 0) {
        return EVENT_VALIDITY.UPCOMING;
      }
    }
    return nowMs < startMs ? EVENT_VALIDITY.UPCOMING : EVENT_VALIDITY.STALE;
  }
  if (!Number.isFinite(startMs)) return EVENT_VALIDITY.UNKNOWN;
  if (nowMs < startMs) return EVENT_VALIDITY.UPCOMING;
  if (nowMs <= startMs + durationMs) return EVENT_VALIDITY.ACTIVE;
  if (nowMs > startMs + durationMs) return EVENT_VALIDITY.FINISHED;
  return EVENT_VALIDITY.UNKNOWN;
}

export function classifyNbaGame(game, nowMs = Date.now()) {
  return classifyGameState({ game, nowMs, durationMs: 4 * 60 * 60 * 1000, sport: "nba" });
}

export function classifyMlbGame(game, nowMs = Date.now()) {
  return classifyGameState({ game, nowMs, durationMs: 6 * 60 * 60 * 1000, sport: "mlb" });
}

export function classifyF1Race(race, nowMs = Date.now()) {
  if (!race || typeof race !== "object") return EVENT_VALIDITY.UNKNOWN;
  if (race.completed === true) return EVENT_VALIDITY.FINISHED;
  const state = String(race.state || race.status || "").toLowerCase();
  if (state === "post" || state === "final" || state === "finished") {
    return EVENT_VALIDITY.FINISHED;
  }
  const hasIdentity = Boolean(String(race.meeting_key || race.meeting_name || race.name || "").trim());
  if (!hasIdentity) return EVENT_VALIDITY.UNKNOWN;

  const startMs = parseEventStartMs(race.race_start || race.race_date || race.date_start);
  let endMs = parseEventStartMs(race.date_end);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = startMs + 3 * 60 * 60 * 1000;
  }
  if (hasEndedByEndDate(endMs, nowMs)) return EVENT_VALIDITY.FINISHED;
  if (state === "in" || state === "live") return EVENT_VALIDITY.ACTIVE;
  if (Number.isFinite(startMs)) {
    if (nowMs < startMs) return EVENT_VALIDITY.UPCOMING;
    if (Number.isFinite(endMs) && nowMs <= endMs) {
      return EVENT_VALIDITY.ACTIVE;
    }
    if (nowMs > startMs) return EVENT_VALIDITY.FINISHED;
  }
  if (race.is_next) return EVENT_VALIDITY.UPCOMING;
  return EVENT_VALIDITY.UNKNOWN;
}

export function getDisplayableF1NextRace(f1Data, nowMs = Date.now()) {
  const races = Array.isArray(f1Data?.schedule?.races) ? f1Data.schedule.races : [];
  const nextRace = races.find((r) => r?.is_next) || races[0] || null;
  if (!nextRace) return null;
  return isDisplayableValidity(classifyF1Race(nextRace, nowMs)) ? nextRace : null;
}
