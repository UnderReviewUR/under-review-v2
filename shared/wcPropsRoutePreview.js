/**
 * Offline props route preview — fixture pin + shape (Phase 1.5 contract input).
 * No handler, no BDL fetch.
 */

import { detectParlayIntent } from "./detectParlayIntent.js";
import {
  isWcNamedPlayerPropQuestion,
  isGenericWcPlayerPropQuestion,
} from "./wcUrTakePlayerMarket.js";
import { isWcPlayerPropFollowUpExplain } from "./wcFollowUpExplain.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { resolveWcPlayerPropSlateFixtureTeams } from "./wcPlayerPropFixture.js";
import { resolveWcThreadFixtureContext } from "./wcThreadFixtureContext.js";
import { logWcPropsRoute } from "./wcPropsRouteLog.js";
import {
  classifyWcQuestionIntent,
  isWcPlayerMarketIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import { resolveWcPlayerPropFixtureTeams } from "./wcPlayerPropFixture.js";

/** @typedef {import("./wcGroundingPacket.types.js").WcPropAskShape} WcPropAskShape */

/**
 * @param {string} question
 * @param {boolean} hasImage
 * @param {object[]} history
 */
function deriveAskShape(question, hasImage, history) {
  const q = String(question || "").trim();
  const mentionedTeams = extractMentionedWcTeams(q).map((t) => String(t).toUpperCase());

  /** @type {WcPropAskShape} */
  let shape = "fixture_board";
  if (hasImage) shape = "image_slip";
  else if (isWcPlayerPropFollowUpExplain(q, history)) shape = "follow_up_explain";
  else if (isWcNamedPlayerPropQuestion(q)) shape = "named_legs";
  else if (
    isGenericWcPlayerPropQuestion(q) &&
    mentionedTeams.length < 2 &&
    !detectParlayIntent(q)
  ) {
    shape = "slate";
  }
  return shape;
}

/**
 * @param {object} params
 */
export function needsWcPropsRouting(params) {
  const { question = "", hasImage = false } = params;
  const q = String(question || "").trim();
  if (hasImage) return true;
  if (detectParlayIntent(q)) return true;
  if (isNamedOrGenericPropAsk(q)) return true;
  return false;
}

/**
 * @param {string} q
 */
function isNamedOrGenericPropAsk(q) {
  return (
    isWcNamedPlayerPropQuestion(q) ||
    isGenericWcPlayerPropQuestion(q) ||
    /\bplayers?\s+props?\b/i.test(q) ||
    /\bprop\s+board\b/i.test(q) ||
    /\banytime\s+scorer\b/i.test(q) ||
    /\bbest\s+props\b/i.test(q)
  );
}

/**
 * @param {object} params
 */
export function previewWcPropsRoute(params) {
  const {
    question = "",
    history = [],
    matches = [],
    hasImage = false,
    incomingWcEventId = null,
    nowMs = Date.now(),
  } = params;

  const q = String(question || "").trim();
  const needsRouting = needsWcPropsRouting({ question: q, hasImage });
  const fixture = resolveWcThreadFixtureContext({
    question: q,
    history,
    matches,
    incomingWcEventId,
  });

  let pinned = fixture.pinned;
  if (!pinned && needsRouting && !fixture.ambiguous) {
    const slateTeams = resolveWcPlayerPropSlateFixtureTeams(q, matches, nowMs);
    if (slateTeams.length >= 2) {
      const home = slateTeams[0];
      const away = slateTeams[1];
      const m = (matches || []).find(
        (row) =>
          String(row.homeTeam).toUpperCase() === home &&
          String(row.awayTeam).toUpperCase() === away,
      );
      pinned = {
        home,
        away,
        eventId: m?.id != null ? String(m.id) : null,
        pinMethod: "slate_single_match",
      };
    }
  }

  const askShape = deriveAskShape(q, hasImage, history);
  const fetchBlockedAmbiguous = Boolean(fixture.ambiguous);
  const fetchAttempted = Boolean(needsRouting && pinned?.eventId && !fetchBlockedAmbiguous);

  const result = {
    needsRouting,
    pinnedEventId: pinned?.eventId ?? null,
    pinnedHome: pinned?.home ?? null,
    pinnedAway: pinned?.away ?? null,
    pinMethod: pinned?.pinMethod ?? "unresolved",
    askShape,
    fetchAttempted,
    fetchBlockedAmbiguous,
    ambiguous: fixture.ambiguous,
    caveat: fixture.caveat,
    alternateCandidates: fixture.alternateCandidates,
  };

  logWcPropsRoute("preview_route", {
    question: q,
    needsRouting,
    fetchAttempted: result.fetchAttempted,
    fetchBlockedAmbiguous,
    pinnedEventId: result.pinnedEventId,
    pinMethod: result.pinMethod,
    ambiguous: result.ambiguous,
  });

  return result;
}

/**
 * Simulates legacy prod fetch decision (main today) vs Phase 1 preview.
 * Contract gate: legacy must stay broken until Phase 2 wires routeWcPropsTurn.
 * @param {object} params
 */
export function simulateLegacyProdFetchDecision(params) {
  const {
    question = "",
    history = [],
    matches = [],
    incomingWcEventId = null,
  } = params;
  const q = String(question || "").trim();
  const wcIntent = classifyWcQuestionIntent(q, history);
  const fixtureTeams = resolveWcPlayerPropFixtureTeams(q, history, {
    requiredEntities: [],
    conversationHistory: history,
  });
  const v2 = previewWcPropsRoute({
    question: q,
    history,
    matches,
    incomingWcEventId,
  });

  const legacyLoadMatchProps =
    fixtureTeams.length >= 2 &&
    (wcIntent === WC_INTENT.PLAYER_PROP ||
      detectParlayIntent(q) ||
      /\b(?:player props?|goal scorer|anytime scorer)\b/i.test(q));

  return {
    wcIntent,
    isWcPlayerMarketIntent: isWcPlayerMarketIntent(wcIntent),
    legacyFixtureTeams: fixtureTeams,
    legacyPlayerPropRegex: /\bplayer props?\b/i.test(q),
    legacyLoadMatchProps,
    v2FetchAttempted: v2.fetchAttempted,
    v2PinnedEventId: v2.pinnedEventId,
    prodStillBrokenOnMain: !legacyLoadMatchProps,
  };
}
