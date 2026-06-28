/**
 * World Cup UR Take — resolve wcEventId + match teams for client submits.
 */

import { pickWcFeaturedMatch } from "./wcFeaturedMatch.js";

/**
 * @param {Array<{ role?: string, wcEventId?: string, wcMatchTeams?: { home?: string, away?: string } }>} msgs
 */
export function resolveWcThreadEventPin(msgs) {
  if (!Array.isArray(msgs) || !msgs.length) {
    return { eventId: null, matchTeams: null };
  }
  const userRow = [...msgs].reverse().find((m) => m?.role === "user" && m.wcEventId);
  const aiRow = [...msgs].reverse().find((m) => m?.role === "ai" && m.wcEventId);
  const eventId = userRow?.wcEventId || aiRow?.wcEventId || null;
  const matchTeams = userRow?.wcMatchTeams || null;
  return {
    eventId: eventId != null ? String(eventId).trim() : null,
    matchTeams:
      matchTeams && typeof matchTeams === "object" && (matchTeams.home || matchTeams.away)
        ? {
            home: String(matchTeams.home || "").trim(),
            away: String(matchTeams.away || "").trim(),
          }
        : null,
  };
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} matches
 * @param {string | null | undefined} eventId
 */
export function resolveWcMatchTeamsFromEventId(matches, eventId) {
  const eid = String(eventId || "").trim();
  if (!eid || !Array.isArray(matches)) return null;
  const row = matches.find((m) => String(m?.id ?? "") === eid);
  if (!row?.homeTeam || !row?.awayTeam) return null;
  return { home: String(row.homeTeam), away: String(row.awayTeam) };
}

/**
 * Featured → live → today pin for slate-level WC asks.
 * @param {Array<Record<string, unknown>> | null | undefined} matches
 * @param {Array<Record<string, unknown>> | null | undefined} liveMatches
 */
export function resolveWcFeaturedEventPin(matches, liveMatches) {
  const featured = pickWcFeaturedMatch({ matches, liveMatches });
  const match = featured?.match;
  if (!match?.id || !match?.homeTeam || !match?.awayTeam) {
    return { eventId: null, matchTeams: null };
  }
  return {
    eventId: String(match.id),
    matchTeams: { home: String(match.homeTeam), away: String(match.awayTeam) },
  };
}

/**
 * @param {{
 *   explicitEventId?: string | null,
 *   inheritThread?: boolean,
 *   threadMsgs?: Array<Record<string, unknown>>,
 *   matches?: Array<Record<string, unknown>> | null,
 *   liveMatches?: Array<Record<string, unknown>> | null,
 * }} opts
 */
export function mergeWcUrTakeEventPin(opts = {}) {
  const explicit = opts.explicitEventId != null ? String(opts.explicitEventId).trim() : "";
  if (explicit) {
    return {
      eventId: explicit,
      matchTeams:
        resolveWcMatchTeamsFromEventId(opts.matches, explicit) || opts.explicitMatchTeams || null,
    };
  }

  if (opts.inheritThread !== false) {
    const thread = resolveWcThreadEventPin(opts.threadMsgs);
    if (thread.eventId) {
      return {
        eventId: thread.eventId,
        matchTeams:
          thread.matchTeams ||
          resolveWcMatchTeamsFromEventId(opts.matches, thread.eventId),
      };
    }
  }

  return resolveWcFeaturedEventPin(opts.matches, opts.liveMatches);
}
