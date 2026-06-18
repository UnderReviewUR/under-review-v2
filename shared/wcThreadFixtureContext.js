/**
 * Thread-scoped fixture resolution for WC props routing (Phase 1).
 * Recency stack: user nation refs beat older assistant full-pair text.
 */

import { extractWcNationRefs } from "./wcNationRefs.js";
import { resolveWcFixturePairFromQuestion } from "./wcFixtureMatchupPrebuilt.js";
import {
  resolveWcEventIdForFixtureTeams,
  resolveWcEventIdForPlayerNation,
} from "./wcPlayerPropFixture.js";
import { logWcPropsRoute } from "./wcPropsRouteLog.js";

/** @typedef {"structured"|"wcMatchTeams"|"pair_text"|"nation_ref"|"nation_pair"} WcThreadFixtureFrameSource */

/**
 * @typedef {object} WcThreadFixtureFrame
 * @property {number} turnIndex
 * @property {string} role
 * @property {WcThreadFixtureFrameSource} source
 * @property {string} [home]
 * @property {string} [away]
 * @property {string | null} [eventId]
 * @property {string[]} [nations]
 */

/**
 * @typedef {object} WcThreadFixturePin
 * @property {string} home
 * @property {string} away
 * @property {string | null} eventId
 * @property {import("./wcGroundingPacket.types.js").WcFixturePinMethod} pinMethod
 */

/**
 * @typedef {object} WcThreadFixtureResolution
 * @property {WcThreadFixturePin | null} pinned
 * @property {WcThreadFixtureFrame[]} stack
 * @property {boolean} ambiguous
 * @property {string | null} caveat
 * @property {Array<{ eventId: string, home: string, away: string }>} alternateCandidates
 */

/**
 * @param {Array<Record<string, unknown>>} history
 * @returns {WcThreadFixtureFrame[]}
 */
export function buildWcThreadFixtureStack(history = []) {
  /** @type {WcThreadFixtureFrame[]} */
  const stack = [];
  if (!Array.isArray(history)) return stack;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    const role = String(turn?.role || "");
    const text = String(
      turn?.content || turn?.text || turn?.userQuestion || turn?.question || "",
    ).trim();

    const s = turn?.structured;
    if (s?.fixtureHome && s?.fixtureAway) {
      stack.push({
        turnIndex: i,
        role,
        source: "structured",
        home: String(s.fixtureHome).toUpperCase(),
        away: String(s.fixtureAway).toUpperCase(),
        eventId:
          turn?.wcEventId != null
            ? String(turn.wcEventId)
            : s?.wcEventId != null
              ? String(s.wcEventId)
              : null,
      });
      continue;
    }

    if (turn?.wcMatchTeams?.home && turn?.wcMatchTeams?.away) {
      stack.push({
        turnIndex: i,
        role,
        source: "wcMatchTeams",
        home: String(turn.wcMatchTeams.home).toUpperCase(),
        away: String(turn.wcMatchTeams.away).toUpperCase(),
        eventId: turn?.wcEventId != null ? String(turn.wcEventId) : null,
      });
      continue;
    }

    if (text) {
      const pair = resolveWcFixturePairFromQuestion(text, {});
      if (pair?.home && pair?.away) {
        stack.push({
          turnIndex: i,
          role,
          source: "pair_text",
          home: pair.home,
          away: pair.away,
          eventId: pair.eventId,
        });
        continue;
      }
    }

    if (role === "user" && text) {
      const nations = extractWcNationRefs(text);
      if (nations.length === 1) {
        stack.push({
          turnIndex: i,
          role,
          source: "nation_ref",
          nations,
        });
      } else if (nations.length >= 2) {
        stack.push({
          turnIndex: i,
          role,
          source: "nation_pair",
          home: nations[0],
          away: nations[1],
        });
      }
    }
  }

  return stack;
}

/**
 * @param {string} nationAbbr
 * @param {Array<Record<string, unknown>>} matches
 */
function fixtureFromNation(nationAbbr, matches) {
  const eventId = resolveWcEventIdForPlayerNation(matches, nationAbbr);
  if (!eventId) return null;
  const m = (matches || []).find((row) => String(row?.id) === String(eventId));
  if (!m?.homeTeam || !m?.awayTeam) return { eventId, home: null, away: null };
  return {
    eventId,
    home: String(m.homeTeam).toUpperCase(),
    away: String(m.awayTeam).toUpperCase(),
  };
}

/**
 * @param {string} home
 * @param {string} away
 * @param {Array<Record<string, unknown>>} matches
 * @param {string | null} eventHint
 */
function fixtureFromTeams(home, away, matches, eventHint = null) {
  const h = String(home || "").toUpperCase();
  const a = String(away || "").toUpperCase();
  const eventId =
    eventHint || resolveWcEventIdForFixtureTeams(matches || [], h, a) || null;
  return { home: h, away: a, eventId };
}

/**
 * @param {WcThreadFixtureFrame[]} stack
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} [lookback]
 */
function detectAmbiguousNationRefs(stack, matches, lookback = 6) {
  /** @type {Map<string, { eventId: string, home: string, away: string }>} */
  const byNation = new Map();
  const recent = stack.slice(0, lookback).filter((f) => f.source === "nation_ref");
  for (const frame of recent) {
    const nation = frame.nations?.[0];
    if (!nation) continue;
    const fx = fixtureFromNation(nation, matches);
    if (fx?.eventId && fx.home && fx.away) {
      byNation.set(nation, { eventId: fx.eventId, home: fx.home, away: fx.away });
    }
  }
  const uniqueEvents = new Set([...byNation.values()].map((v) => v.eventId));
  if (uniqueEvents.size <= 1) {
    return { ambiguous: false, alternates: [], caveat: null };
  }
  const alts = [...byNation.values()];
  const labels = alts.map((a) => `${a.home} vs ${a.away}`);
  return {
    ambiguous: true,
    alternates: alts,
    caveat: `Thread mentioned ${labels.join(" and ")} — confirm which match you mean.`,
  };
}

/**
 * @param {object} params
 * @param {string} params.question
 * @param {Array<Record<string, unknown>>} [params.history]
 * @param {Array<Record<string, unknown>>} [params.matches]
 * @param {string | null} [params.incomingWcEventId]
 * @returns {WcThreadFixtureResolution}
 */
export function resolveWcThreadFixtureContext(params) {
  const {
    question = "",
    history = [],
    matches = [],
    incomingWcEventId = null,
  } = params;
  const stack = buildWcThreadFixtureStack(history);

  const incomingId = String(incomingWcEventId || "").trim();
  if (incomingId && matches.length) {
    const m = matches.find((row) => String(row?.id) === incomingId);
    if (m?.homeTeam && m?.awayTeam) {
      return {
        pinned: {
          home: String(m.homeTeam).toUpperCase(),
          away: String(m.awayTeam).toUpperCase(),
          eventId: incomingId,
          pinMethod: "explicit_event_id",
        },
        stack,
        ambiguous: false,
        caveat: null,
        alternateCandidates: [],
      };
    }
  }

  const q = String(question || "").trim();
  const qNations = extractWcNationRefs(q);

  if (qNations.length >= 2) {
    const fx = fixtureFromTeams(qNations[0], qNations[1], matches);
    return {
      pinned: { ...fx, pinMethod: "two_teams_in_question" },
      stack,
      ambiguous: false,
      caveat: null,
      alternateCandidates: [],
    };
  }

  if (qNations.length === 1) {
    const fx = fixtureFromNation(qNations[0], matches);
    if (fx?.home && fx.away) {
      return {
        pinned: {
          home: fx.home,
          away: fx.away,
          eventId: fx.eventId,
          pinMethod: "player_nation",
        },
        stack,
        ambiguous: false,
        caveat: null,
        alternateCandidates: [],
      };
    }
  }

  const nationRef = stack.find((f) => f.source === "nation_ref");
  if (nationRef?.nations?.length === 1) {
    const amb = detectAmbiguousNationRefs(stack, matches);
    if (amb.ambiguous) {
      logWcPropsRoute("fixture_pin_blocked_ambiguous_thread", {
        question: q,
        stackDepth: stack.length,
        alternateCandidates: amb.alternates,
        caveat: amb.caveat,
      });
      return {
        pinned: null,
        stack,
        ambiguous: true,
        caveat: amb.caveat,
        alternateCandidates: amb.alternates,
      };
    }
    const fx = fixtureFromNation(nationRef.nations[0], matches);
    if (fx?.home && fx.away) {
      logWcPropsRoute("fixture_pinned_nation_ref", {
        question: q,
        nation: nationRef.nations[0],
        eventId: fx.eventId,
        home: fx.home,
        away: fx.away,
      });
      return {
        pinned: {
          home: fx.home,
          away: fx.away,
          eventId: fx.eventId,
          pinMethod: "history_thread",
        },
        stack,
        ambiguous: false,
        caveat: null,
        alternateCandidates: [],
      };
    }
  }

  const pairFrame = stack.find(
    (f) =>
      (f.source === "structured" ||
        f.source === "wcMatchTeams" ||
        f.source === "pair_text" ||
        f.source === "nation_pair") &&
      f.home &&
      f.away,
  );

  if (pairFrame?.home && pairFrame?.away) {
    const fx = fixtureFromTeams(
      pairFrame.home,
      pairFrame.away,
      matches,
      pairFrame.eventId,
    );
    const pinMethod =
      pairFrame.source === "structured" || pairFrame.source === "wcMatchTeams"
        ? "history_thread"
        : "two_teams_in_question";
    return {
      pinned: { ...fx, pinMethod },
      stack,
      ambiguous: false,
      caveat: null,
      alternateCandidates: [],
    };
  }

  return {
    pinned: null,
    stack,
    ambiguous: false,
    caveat: null,
    alternateCandidates: [],
  };
}
