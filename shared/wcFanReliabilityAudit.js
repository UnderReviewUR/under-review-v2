/**
 * Offline fan-reliability audit — routing + card content for WC match questions.
 */

import { WC_FAN_RELIABILITY_CASES } from "./wcFanReliabilityAudit.fixture.js";
import { shouldCheckWcLiveScores } from "../api/_wcData.js";
import { resolveRequiredEntities } from "./wcUrTakeEntityBinding.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  buildWcLiveMatchWinnerPrebuiltStructured,
  shouldUseWcFixtureMatchupPrebuilt,
  shouldUseWcLiveMatchWinnerPrebuilt,
} from "./wcFixtureMatchupPrebuilt.js";

/**
 * @param {import("./wcFanReliabilityAudit.fixture.js").WcFanReliabilityCase} row
 */
function scoreFanReliabilityCase(row) {
  /** @type {string[]} */
  const issues = [];
  const question = String(row.question || "");
  const wcIntent = WC_INTENT.MATCHUP;
  const gateOpts = {
    mentionedTeams: [row.home, row.away],
    wcEventId: String(row.match?.id ?? ""),
    hasKvFixture: true,
    match: row.match,
    isConversationFollowUp: Array.isArray(row.history) && row.history.length > 0,
    history: row.history,
  };

  const liveWinnerRoute = shouldUseWcLiveMatchWinnerPrebuilt(question, wcIntent, gateOpts);
  const fixturePrebuiltRoute = shouldUseWcFixtureMatchupPrebuilt(question, wcIntent, gateOpts);

  if (row.expectRouteLiveWinner === true && !liveWinnerRoute) {
    issues.push("fan_missing_live_winner_route");
  }
  if (row.expectRouteLiveWinner === false && liveWinnerRoute) {
    issues.push("fan_unexpected_live_winner_route");
  }
  if (row.expectRouteFixturePrebuilt === true && !fixturePrebuiltRoute) {
    issues.push("fan_missing_fixture_prebuilt_route");
  }
  if (row.expectRouteFixturePrebuilt === false && fixturePrebuiltRoute) {
    issues.push("fan_unexpected_fixture_prebuilt_route");
  }

  if (liveWinnerRoute) {
    const structured = buildWcLiveMatchWinnerPrebuiltStructured({
      home: row.home,
      away: row.away,
      group: row.match?.group,
      question,
      match: row.match,
      nowMs: Date.now(),
    });
    if (!structured) {
      issues.push("fan_live_winner_structured_null");
    } else {
      const blob = [structured.call, structured.lean, structured.whyNow, structured.deep]
        .filter(Boolean)
        .join("\n");
      for (const re of row.forbidPatterns || []) {
        if (re.test(blob)) issues.push(`fan_forbidden:${re.source}`);
      }
      for (const re of row.requirePatterns || []) {
        if (!re.test(blob)) issues.push(`fan_missing:${re.source}`);
      }
      if (!/\bto win\b/i.test(String(structured.call || ""))) {
        issues.push("fan_live_winner_call_missing_to_win");
      }
    }
  }

  return { id: row.id, ok: issues.length === 0, issues, notes: row.notes || "" };
}

/**
 * Kickoff window: KV still NS but match should trigger live score checks.
 */
function scoreKickoffPromotionCase() {
  const kickoff = Date.parse("2026-06-16T01:00:00.000Z");
  const nowMs = kickoff + 10 * 60 * 1000;
  const ok = shouldCheckWcLiveScores(
    {
      matches: [
        {
          id: 16,
          homeTeam: "IRN",
          awayTeam: "NZL",
          status: "NS",
          date: "2026-06-16",
          commenceTs: kickoff,
        },
      ],
    },
    nowMs,
  );
  return {
    id: "kickoff-score-check-before-live-status",
    ok,
    issues: ok ? [] : ["fan_kickoff_live_score_check_skipped"],
    notes: "Session bug: hero VS at kickoff because refresh gated on live status.",
  };
}

/**
 * Continuation entity binding must not throw (session 500).
 */
function scoreContinuationEntityBindingCase() {
  const history = [
    { role: "user", content: "Best live angle on BEL vs EGY right now?" },
    {
      role: "assistant",
      structured: {
        callType: "matchup",
        fixtureHome: "BEL",
        fixtureAway: "EGY",
        lean: "Pass on ML — Lean Under 2.5 goals",
      },
    },
  ];
  try {
    const entities = resolveRequiredEntities("What's the other side?", history, WC_INTENT.CONTINUATION);
    const ok = Array.isArray(entities) && entities.length > 0;
    return {
      id: "continuation-other-side-entities",
      ok,
      issues: ok ? [] : ["fan_continuation_entities_empty"],
      notes: "Session bug: resolveContinuationEntities ReferenceError crashed handler.",
    };
  } catch (err) {
    return {
      id: "continuation-other-side-entities",
      ok: false,
      issues: [`fan_continuation_threw:${err?.message || err}`],
      notes: "Session bug: resolveContinuationEntities ReferenceError crashed handler.",
    };
  }
}

export function runWcFanReliabilityAudit() {
  const rows = [
    ...WC_FAN_RELIABILITY_CASES.map(scoreFanReliabilityCase),
    scoreKickoffPromotionCase(),
    scoreContinuationEntityBindingCase(),
  ];
  const pass = rows.filter((r) => r.ok).length;
  const fail = rows.length - pass;
  return { rows, pass, fail };
}
