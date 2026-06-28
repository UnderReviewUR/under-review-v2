/**
 * Minimal wcContext objects for WC prebuilt fast-path lanes.
 * Carries real tournament phase + pinned fixture instead of empty stubs.
 */

import {
  getWorldCupPhaseFromEtDate,
  resolveWcTournamentPhase,
} from "./wcPhaseUtils.js";

/**
 * @param {Array<Record<string, unknown>> | null | undefined} matches
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number} [nowMs]
 */
export function resolveWcPrebuiltStubPhase(matches, match, nowMs = Date.now()) {
  const rows = Array.isArray(matches) && matches.length
    ? matches
    : match && typeof match === "object"
      ? [match]
      : [];
  if (rows.length) return resolveWcTournamentPhase(rows, nowMs);
  return getWorldCupPhaseFromEtDate(nowMs);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 */
export function normalizeWcUrTakeStubMatch(match) {
  if (!match || typeof match !== "object") return null;
  const home = match.homeTeam || match.home;
  const away = match.awayTeam || match.away;
  if (!home || !away) return null;
  return match;
}

/**
 * @param {string} source
 * @param {{
 *   match?: Record<string, unknown> | null,
 *   matchDetail?: Record<string, unknown> | null,
 *   matches?: Array<Record<string, unknown>> | null,
 *   tournamentSimResults?: Record<string, unknown> | null,
 *   groupMispriceTopGroups?: string[] | null,
 *   wcEventId?: string | null,
 *   nowMs?: number,
 * }} [opts]
 */
export function buildWcPrebuiltUrTakeStubContext(source, opts = {}) {
  const nowMs = Number(opts.nowMs) || Date.now();
  const pinned =
    normalizeWcUrTakeStubMatch(opts.matchDetail) ||
    normalizeWcUrTakeStubMatch(opts.match);
  const inventory = Array.isArray(opts.matches) && opts.matches.length
    ? opts.matches
    : pinned
      ? [pinned]
      : [];
  const phase = resolveWcPrebuiltStubPhase(inventory, pinned, nowMs);
  const fixtures = pinned ? [pinned] : [];
  const matchDetails = pinned ? [pinned] : [];

  return {
    source,
    promptBlock: "",
    phase,
    wcEventId: String(opts.wcEventId || pinned?.id || "").trim() || null,
    tournamentSimResults: opts.tournamentSimResults ?? null,
    matchDetails,
    fixtures,
    allMatches: inventory.length ? inventory : undefined,
    groups: {},
    ...(Array.isArray(opts.groupMispriceTopGroups) && opts.groupMispriceTopGroups.length
      ? { groupMispriceTopGroups: opts.groupMispriceTopGroups }
      : {}),
  };
}
