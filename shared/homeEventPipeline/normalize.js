/**
 * Feed → NormalizedHomeEvent. Validity uses shared/eventValidity only.
 */

import {
  canonicalMlbStartUtcMs,
  canonicalNbaStartUtcMs,
  parseEventStartMs,
} from "../eventStartTime.js";
import {
  classifyF1Race,
  classifyGolfEvent,
  classifyMlbGame,
  classifyNbaGame,
  classifyTennisMatch,
  EVENT_VALIDITY,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../eventValidity.js";
import {
  GOLF_HOME_UPCOMING_WINDOW_MS,
  golfEventStartMs,
  resolveGolfPrimaryEvent,
} from "../golfHomeEventSelection.js";
import { isF1RaceWeekendWindow } from "../slateModulePriority.js";
import {
  f1EventKey,
  golfSnapshotKey,
  mlbEventKey,
  nbaEventKey,
  tennisEventKeyFromNormalized,
} from "../homeEventDedup.js";
import {
  f1PriorityScore,
  golfPriorityScore,
  mlbPriorityScore,
  nbaPriorityScore,
  nflBoardPriorityScore,
  tennisPriorityScore,
} from "./priority.js";
import { PIPELINE_STATE } from "./schema.js";

function formatLocalShort(ms) {
  if (!Number.isFinite(ms)) return "TBD";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Re-export name used by `homeEventPipeline` index — same as `canonicalNbaStartUtcMs`. */
export const canonicalNbaStartUtc = canonicalNbaStartUtcMs;

function matchupNbaMlb(game) {
  const away = String(game?.awayTeam?.abbr || game?.awayTeam?.name || "").trim() || "Away";
  const home = String(game?.homeTeam?.abbr || game?.homeTeam?.name || "").trim() || "Home";
  return `${away} @ ${home}`;
}

function endMsForTeamGame(game, durationMs, sport) {
  const startMs =
    sport === "mlb" ? canonicalMlbStartUtcMs(game) : canonicalNbaStartUtcMs(game);
  const explicit = parseEventStartMs(game.endDate || game.date_end);
  if (Number.isFinite(explicit)) return explicit;
  if (Number.isFinite(startMs)) return startMs + durationMs;
  return NaN;
}

/**
 * @returns {import('./schema.js').NormalizedHomeEvent|null}
 */
export function normalizeNbaGame(game, ctx, nowMs = Date.now()) {
  if (!game) return null;
  const v = classifyNbaGame(game, nowMs);
  if (!isDisplayableValidity(v)) return null;
  const startMs = canonicalNbaStartUtcMs(game);
  const endMs = endMsForTeamGame(game, 4 * 60 * 60 * 1000, "nba");
  if (Number.isFinite(endMs) && endMs <= nowMs) return null;

  const isPlayoff = Boolean(ctx?.postseason);
  const stateStr = String(game.state || "").toLowerCase();
  const isLive = stateStr === "in" || stateStr === "live";
  const pipelineState =
    v === EVENT_VALIDITY.ACTIVE ? PIPELINE_STATE.ACTIVE : PIPELINE_STATE.UPCOMING;

  const id = nbaEventKey(game);
  if (!id) return null;

  return {
    sport: "nba",
    league: isPlayoff ? "NBA Playoffs" : "NBA",
    event_id: id,
    start_time_utc: Number.isFinite(startMs) ? startMs : null,
    end_time_utc: Number.isFinite(endMs) ? endMs : null,
    display_time_local: formatLocalShort(startMs),
    state: pipelineState,
    is_live: isLive,
    priority_score: nbaPriorityScore({
      isPlayoff,
      isLive,
      startMs,
    }),
    data_source: String(game.startTimeSource || "unknown"),
    matchup_label: matchupNbaMlb(game),
    is_nba_playoff: isPlayoff,
    raw: game,
  };
}

export function normalizeMlbGame(game, nowMs = Date.now()) {
  if (!game) return null;
  const v = classifyMlbGame(game, nowMs);
  if (!isDisplayableValidity(v)) return null;
  const startMs = canonicalMlbStartUtcMs(game);
  const endMs = endMsForTeamGame(game, 6 * 60 * 60 * 1000, "mlb");
  if (Number.isFinite(endMs) && endMs <= nowMs) return null;

  const stateStr = String(game.state || "").toLowerCase();
  const isLive = stateStr === "in" || stateStr === "live";
  const pipelineState =
    v === EVENT_VALIDITY.ACTIVE ? PIPELINE_STATE.ACTIVE : PIPELINE_STATE.UPCOMING;
  const id = mlbEventKey(game);
  if (!id) return null;

  return {
    sport: "mlb",
    league: "MLB",
    event_id: id,
    start_time_utc: Number.isFinite(startMs) ? startMs : null,
    end_time_utc: Number.isFinite(endMs) ? endMs : null,
    display_time_local: formatLocalShort(startMs),
    state: pipelineState,
    is_live: isLive,
    priority_score: mlbPriorityScore({ isLive, startMs }),
    data_source: "mlb_feed",
    matchup_label: matchupNbaMlb(game),
    raw: game,
  };
}

export function normalizeTennisMatch(match, nowMs = Date.now()) {
  if (!match) return null;
  const v = classifyTennisMatch(match, nowMs);
  if (!isDisplayableValidity(v)) return null;

  const commenceTs = Number(match.commenceTs);
  const startMs = Number.isFinite(commenceTs) ? commenceTs : NaN;
  const endMs = Number.isFinite(startMs) ? startMs + 6 * 60 * 60 * 1000 : NaN;
  if (Number.isFinite(endMs) && endMs <= nowMs) return null;

  const isLive = String(match?.raw?.live || "0") === "1";
  const pipelineState =
    v === EVENT_VALIDITY.ACTIVE ? PIPELINE_STATE.ACTIVE : PIPELINE_STATE.UPCOMING;
  const id = tennisEventKeyFromNormalized(match);
  if (!id) return null;

  const src = String(match?.raw?.source || "atp_board");
  const home = String(match?.raw?.home || "").trim();
  const away = String(match?.raw?.away || "").trim();

  return {
    sport: "tennis",
    league: String(match.league || "ATP"),
    event_id: id,
    start_time_utc: Number.isFinite(startMs) ? startMs : null,
    end_time_utc: Number.isFinite(endMs) ? endMs : null,
    display_time_local: formatLocalShort(startMs),
    state: pipelineState,
    is_live: isLive,
    priority_score: tennisPriorityScore({ isLive, startMs }),
    data_source: src.includes("odds") ? "odds_atp" : src,
    matchup_label: `${away} vs ${home}`,
    raw: match,
  };
}

export function normalizeF1Race(race, f1Data, nowMs = Date.now()) {
  if (!race) return null;
  const v = classifyF1Race(race, nowMs);
  if (!isDisplayableValidity(v)) return null;
  if (!isF1RaceWeekendWindow(f1Data, f1Data?.sessions || [])) return null;

  const startMs = parseEventStartMs(race.race_start || race.race_date || race.date_start);
  let endMs = parseEventStartMs(race.date_end);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = startMs + 3 * 60 * 60 * 1000;
  }
  if (Number.isFinite(endMs) && endMs <= nowMs) return null;

  const id = f1EventKey(race);
  if (!id) return null;

  return {
    sport: "f1",
    league: "F1",
    event_id: id,
    start_time_utc: Number.isFinite(startMs) ? startMs : null,
    end_time_utc: Number.isFinite(endMs) ? endMs : null,
    display_time_local: formatLocalShort(startMs),
    state: v === EVENT_VALIDITY.ACTIVE ? PIPELINE_STATE.ACTIVE : PIPELINE_STATE.UPCOMING,
    is_live: String(race.state || "").toLowerCase() === "in",
    priority_score: f1PriorityScore(startMs),
    data_source: "f1_schedule",
    matchup_label: String(race.meeting_name || race.name || "Grand Prix"),
    raw: race,
  };
}

/** Golf tournament as one home event; null if finished or outside home validity window. */
export function normalizeGolfTournament(golfData, nowMs = Date.now()) {
  if (!golfData || typeof golfData !== "object") return null;
  const ev = resolveGolfPrimaryEvent(golfData, nowMs);
  if (!ev) return null;

  const v = classifyGolfEvent(ev, nowMs);
  if (v === EVENT_VALIDITY.FINISHED || v === EVENT_VALIDITY.UNKNOWN) return null;

  const id = golfSnapshotKey(golfData);
  if (!id) return null;

  const startMs = golfEventStartMs(ev, nowMs);
  let endMs = Number.isFinite(ev?.endTs) ? ev.endTs : parseEventStartMs(ev.endDate);
  if (!Number.isFinite(endMs) && Number.isFinite(startMs)) {
    endMs = startMs + 4 * 24 * 60 * 60 * 1000;
  }
  if (Number.isFinite(endMs) && endMs <= nowMs) return null;

  if (v === EVENT_VALIDITY.UPCOMING && Number.isFinite(startMs)) {
    const delta = startMs - nowMs;
    if (delta < 0 || delta > GOLF_HOME_UPCOMING_WINDOW_MS) return null;
  }

  const isLive = v === EVENT_VALIDITY.ACTIVE;

  return {
    sport: "golf",
    league: "GOLF",
    event_id: id,
    start_time_utc: Number.isFinite(startMs) ? startMs : null,
    end_time_utc: Number.isFinite(endMs) ? endMs : null,
    display_time_local: formatLocalShort(startMs),
    state: isLive ? PIPELINE_STATE.ACTIVE : PIPELINE_STATE.UPCOMING,
    is_live: isLive,
    priority_score: golfPriorityScore(),
    data_source: String(golfData?.sourceMeta?.board || "golf_feed"),
    matchup_label: String(ev.shortName || ev.name || "Golf"),
    raw: golfData,
  };
}

export function normalizeNflPropsBoard(isNflSlateActive) {
  if (!isNflSlateActive) return null;
  return {
    sport: "nfl",
    league: "NFL",
    event_id: "nfl:weekly-props-board",
    start_time_utc: null,
    end_time_utc: null,
    display_time_local: "Live board",
    state: PIPELINE_STATE.ACTIVE,
    is_live: true,
    priority_score: nflBoardPriorityScore(),
    data_source: "nfl_props_board",
    matchup_label: "NFL Weekly Props",
    raw: null,
  };
}

export function getNormalizedF1FromBundle(f1Data, nowMs) {
  const next = getDisplayableF1NextRace(f1Data, nowMs);
  if (!next) return null;
  return normalizeF1Race(next, f1Data, nowMs);
}
