#!/usr/bin/env node
/**
 * Full forensic trace: BRA vs HAI live angle → "best player props for Haiti?"
 * Reproduces prod-like history (Turn 1 lean text only, no structured object).
 */
import { getMatchesPayload } from "../api/world-cup.js";
import {
  ensureWcBdlMatchPlayerPropsForEvent,
  readWcMatchPlayerPropsForEvent,
} from "../api/_wcMatchPlayerProps.js";
import { loadWcPlayerMarketKvBlocksWithRetry } from "../api/_wcPlayerUrTakeContext.js";
import {
  hasMatchPlayerPropRows,
  isMatchPlayerPropsFresh,
  matchPlayerPropNationMatchesTeam,
  matchPlayerPropRowsFromEvent,
  pickFixturePropBoardFromEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import { resolveUrTakeConversationFollowUp } from "../shared/urTakeFollowUpDetection.js";
import {
  WC_TURN_LANE,
  isWcTurnPlannerEnabled,
  resolveWcTurnPlan,
} from "../shared/wcTurnPlanner.js";
import {
  shouldActivateWcPropsFastPath,
  buildWcThreadAwareNoPropsFallback,
} from "../shared/wcTurnDelivery.js";
import {
  extractWcPriorThreadLeanFromHistory,
  isWcGenericPlayerPropsThreadFollowUp,
  isWcThreadAnchoredFollowUp,
  isWcPriorPrebuiltThreadLean,
  isWcVaguePlayerPropsThreadAsk,
  priorLaneHintFromStructured,
  resolveWcTurnIntent,
} from "../shared/wcTurnIntent.js";
import { shouldRunWcPlayerPropsFastPath } from "../api/ur-take/wcPlayerPropsFastPath.js";
import { resolveWcFixturePairFromHistory } from "../shared/wcFixtureMatchupPrebuilt.js";
import {
  resolveWcPlayerPropFixtureTeams,
  resolveWcEventIdForFixtureTeams,
} from "../shared/wcPlayerPropFixture.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import {
  isGenericWcPlayerPropQuestion,
  isWcFixturePlayerPropsQuestion,
  isWcPerTeamPlayerPropsQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
} from "../shared/wcUrTakePlayerMarket.js";
import { buildWcFixturePlayerPropsListStructured } from "../shared/wcPlayerMarketResolve.js";
import { resolveWcPlayerMarketTier } from "../shared/wcPlayerMarketResolve.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import { wcMatchupTeamDisplayName } from "../shared/wcMatchupWinnerLine.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";

const TURN1_Q = "Best live angle on BRA vs HAI right now?";
const TURN2_Q = "best player props for Haiti?";
const TURN1_LEAN = "Lean Under 2.5 goals";
const TURN1_WHY =
  "Brazil is the Group C Favorite and Haiti is a Longshot – the moneyline heavily favors Brazil, so the live angle is on totals.";

const UR_TAKE_URL = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";
const RUN_HTTP = process.argv.includes("--http");
const RUN_PULL = process.argv.includes("--pull");

function marketCounts(payload) {
  if (!payload?.markets) return {};
  return Object.fromEntries(
    WC_MATCH_PLAYER_PROP_MARKET_KEYS.map((key) => [
      key,
      matchPlayerPropRowsFromEvent(payload, key, 999).length,
    ]).filter(([, n]) => n > 0),
  );
}

function haitiRows(payload) {
  if (!payload?.markets) return [];
  const out = [];
  for (const key of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    for (const row of matchPlayerPropRowsFromEvent(payload, key, 50)) {
      if (matchPlayerPropNationMatchesTeam(row.nationAbbr, "HAI")) {
        out.push({ market: key, ...row });
        if (out.length >= 15) return out;
      }
    }
  }
  return out;
}

/** Prod-like: assistant turn has lean prose only — no structured object. */
function buildProdLikeHistory(leanText = TURN1_LEAN) {
  return [
    { role: "user", content: TURN1_Q },
    {
      role: "assistant",
      content: leanText,
      wcEventId: null,
      wcMatchTeams: null,
    },
  ];
}

/** Client sends wcMatchTeams when available. */
function buildHistoryWithWcMatchTeams(leanText = TURN1_LEAN) {
  return [
    { role: "user", content: TURN1_Q },
    {
      role: "assistant",
      content: leanText,
      wcEventId: null,
      wcMatchTeams: null,
    },
  ];
}

function logSection(title) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(title);
  console.log("=".repeat(80));
}

function traceTurn2Plan(label, history, matches, eventId, opts = {}) {
  const followUpMeta = resolveUrTakeConversationFollowUp(TURN2_Q, history);
  const priorLean = extractWcPriorThreadLeanFromHistory(history);
  const historyPair = resolveWcFixturePairFromHistory(history);
  const mentionedTeams = extractMentionedWcTeams(TURN2_Q);
  const intent = resolveWcTurnIntent(
    TURN2_Q,
    history,
    followUpMeta.isFollowUp,
    priorLean,
  );
  const genericFollowUp = isWcGenericPlayerPropsThreadFollowUp(TURN2_Q, history, priorLean);
  const threadAnchored = isWcThreadAnchoredFollowUp({
    isConversationFollowUp: followUpMeta.isFollowUp,
    priorLean,
    pinnedEventId: eventId,
    pinnedHome: historyPair?.home || "BRA",
    pinnedAway: historyPair?.away || "HAI",
    history,
  });

  const plan = resolveWcTurnPlan({
    question: TURN2_Q,
    fullQuestion: TURN2_Q,
    history,
    matches,
    incomingWcEventId: eventId,
    hasKvFixture: true,
    isConversationFollowUp: followUpMeta.isFollowUp,
    routeHeader: opts.routeHeader || "0",
    plannerHeader: opts.plannerHeader || process.env.WC_TURN_PLANNER || "0",
  });

  const propsFastGuard = shouldRunWcPlayerPropsFastPath(
    plan.intent,
    TURN2_Q,
    history,
    followUpMeta.isFollowUp,
    false,
  );
  const propsFastActivate = shouldActivateWcPropsFastPath(
    isWcTurnPlannerEnabled({ plannerHeader: opts.plannerHeader || process.env.WC_TURN_PLANNER || "0" }),
    plan,
    () => propsFastGuard,
  );

  const diag = {
    label,
    followUp: followUpMeta,
    historyPair,
    priorLean: priorLean
      ? {
          callType: priorLean.callType,
          lean: priorLean.lean,
          call: priorLean.call,
          fixtureHome: priorLean.fixtureHome,
          fixtureAway: priorLean.fixtureAway,
          wcEventId: priorLean.wcEventId,
          priorLaneHint: priorLaneHintFromStructured(priorLean),
          isPriorPrebuilt: isWcPriorPrebuiltThreadLean(priorLean),
        }
      : null,
    turn2QuestionClassifiers: {
      mentionedTeams,
      legacyIntent: classifyWcQuestionIntent(TURN2_Q, history),
      resolvedIntent: intent,
      isGenericWcPlayerPropQuestion: isGenericWcPlayerPropQuestion(TURN2_Q),
      isWcFixturePlayerPropsQuestion: isWcFixturePlayerPropsQuestion(TURN2_Q),
      isWcPerTeamPlayerPropsQuestion: isWcPerTeamPlayerPropsQuestion(TURN2_Q),
      isWcFixtureScopedPlayerMarketQuestion: isWcFixtureScopedPlayerMarketQuestion(TURN2_Q),
      isWcVaguePlayerPropsThreadAsk: isWcVaguePlayerPropsThreadAsk(TURN2_Q),
    },
    step4d: {
      threadAnchoredFollowUp: threadAnchored,
      priorLeanPresent: Boolean(priorLean),
      isWcGenericPlayerPropsThreadFollowUp: genericFollowUp,
      step4dWouldFire:
        threadAnchored && Boolean(priorLean) && genericFollowUp,
    },
    resolveWcTurnPlan: {
      lane: plan.lane,
      reason: plan.reason,
      intent: plan.intent,
      shouldUseFastPath: plan.shouldUseFastPath,
      pinnedEventId: plan.pinnedEventId,
      pinnedHome: plan.pinnedHome,
      pinnedAway: plan.pinnedAway,
      pinMethod: plan.pinMethod,
      propsAskShape: plan.propsAskShape,
      propsRouteV2Apply: plan.propsRouteV2Apply,
      dataPackages: plan.dataPackages,
    },
    deliveryGuards: {
      wcTurnPlannerEnabled: isWcTurnPlannerEnabled({
        plannerHeader: opts.plannerHeader || process.env.WC_TURN_PLANNER || "0",
      }),
      shouldRunWcPlayerPropsFastPath: propsFastGuard,
      shouldActivateWcPropsFastPath: propsFastActivate,
      propsFastWouldRunDespitePlanner:
        propsFastGuard && plan.lane !== WC_TURN_LANE.LLM_THREAD,
      coldPathLane: plan.lane === WC_TURN_LANE.PROPS_FAST,
    },
    fixtureResolution: {
      resolveWcPlayerPropFixtureTeams: resolveWcPlayerPropFixtureTeams(TURN2_Q, history),
      resolveWcEventIdForFixtureTeams: resolveWcEventIdForFixtureTeams(
        matches,
        "BRA",
        "HAI",
      ),
    },
  };

  console.log(JSON.stringify(diag, null, 2));
  return { plan, priorLean, followUpMeta, diag };
}

async function traceKvAndDelivery(matches, eventId, history) {
  const match = matches.find((m) => String(m.id) === String(eventId));
  logSection(`KV + BDL state — event ${eventId} (${match?.homeTeam} vs ${match?.awayTeam})`);

  const kvBefore = await readWcMatchPlayerPropsForEvent(eventId);
  console.log("KV before pull:", JSON.stringify({
    hasRows: hasMatchPlayerPropRows(kvBefore),
    isFresh: isMatchPlayerPropsFresh(kvBefore),
    source: kvBefore?.source,
    lastUpdated: kvBefore?.lastUpdated,
    homeTeam: kvBefore?.homeTeam,
    awayTeam: kvBefore?.awayTeam,
    marketCounts: marketCounts(kvBefore),
    haitiSample: haitiRows(kvBefore).slice(0, 8),
  }, null, 2));

  let kvAfter = kvBefore;
  if (RUN_PULL && match) {
    console.log("\nForcing BDL pull (ensureWcBdlMatchPlayerPropsForEvent)...");
    kvAfter = await ensureWcBdlMatchPlayerPropsForEvent(eventId, {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      bdlMatchId: match.bdlMatchId,
      status: match.status,
      date: match.date,
    });
  }

  console.log("KV after:", JSON.stringify({
    hasRows: hasMatchPlayerPropRows(kvAfter),
    isFresh: isMatchPlayerPropsFresh(kvAfter),
    source: kvAfter?.source,
    lastUpdated: kvAfter?.lastUpdated,
    marketCounts: marketCounts(kvAfter),
    totalPropRows: WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
      (n, k) => n + matchPlayerPropRowsFromEvent(kvAfter, k, 999).length,
      0,
    ),
    haitiSample: haitiRows(kvAfter).slice(0, 8),
  }, null, 2));

  const propBoard = pickFixturePropBoardFromEvent(kvAfter, 24);
  console.log("\npickFixturePropBoardFromEvent:", JSON.stringify({
    marketKey: propBoard?.key,
    label: propBoard?.label,
    rowCount: propBoard?.rows?.length || 0,
    sampleRows: (propBoard?.rows || []).slice(0, 6),
  }, null, 2));

  const kvBlocks = await loadWcPlayerMarketKvBlocksWithRetry(Date.now(), {
    wcEventId: eventId,
    wcIntent: WC_INTENT.PLAYER_PROP,
    question: TURN2_Q,
    matches,
    conversationHistory: history,
    requiredEntities: ["BRA", "HAI"],
  }, { maxRetries: 2, backoffMs: 400 });

  console.log("\nloadWcPlayerMarketKvBlocksWithRetry:", JSON.stringify({
    wcEventId: kvBlocks.wcEventId,
    loadMeta: kvBlocks.loadMeta,
    hasRows: hasMatchPlayerPropRows(kvBlocks.matchPlayerProps),
    isFresh: isMatchPlayerPropsFresh(kvBlocks.matchPlayerProps),
    marketCounts: marketCounts(kvBlocks.matchPlayerProps),
  }, null, 2));

  const syntheticContext = {
    wcEventId: kvBlocks.wcEventId || eventId,
    conversationHistory: history,
    requiredEntities: resolveWcPlayerPropFixtureTeams(TURN2_Q, history),
  };
  const tier = resolveWcPlayerMarketTier({
    goldenBoot: kvBlocks.goldenBoot,
    players: kvBlocks.players,
    injuries: kvBlocks.injuries,
    matchPlayerProps: kvBlocks.matchPlayerProps,
    wcEventId: syntheticContext.wcEventId,
    wcContext: syntheticContext,
    wcIntent: WC_INTENT.PLAYER_PROP,
  });

  const listStructured = buildWcFixturePlayerPropsListStructured(
    TURN2_Q,
    tier,
    kvBlocks,
    syntheticContext,
  );

  console.log("\nbuildWcFixturePlayerPropsListStructured result:", listStructured
    ? {
        call: listStructured.call,
        lean: String(listStructured.lean || "").slice(0, 400),
        propBoardRows: listStructured.propBoardRows?.length,
      }
    : "NULL — would fall through to buildWcPlayerPropsNotPostedStructured");

  const priorLean = extractWcPriorThreadLeanFromHistory(history);
  const noPropsLean = buildWcThreadAwareNoPropsFallback(priorLean, {
    homeName: wcMatchupTeamDisplayName("BRA"),
    awayName: wcMatchupTeamDisplayName("HAI"),
  });
  console.log("\nbuildWcThreadAwareNoPropsFallback (cold card lean):");
  console.log(noPropsLean);

  return { kvAfter, kvBlocks, listStructured };
}

async function probeHttp(label, body) {
  const res = await fetch(UR_TAKE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ur-take-structured": "1",
      ...(body.plannerHeader ? { "x-wc-turn-planner": body.plannerHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const s = json.structured || {};
  console.log(`\n--- HTTP ${label} ---`);
  console.log(JSON.stringify({
    http: res.status,
    sport: json.sport,
    wcIntent: json.wcIntent,
    wcEventId: json.wcEventId,
    callType: s.callType,
    call: s.call,
    lean: s.lean,
    whyNow: s.whyNow,
    edge: s.edge,
    fixtureHome: s.fixtureHome,
    fixtureAway: s.fixtureAway,
    groundingPosted: s.groundingInventoryStrip?.posted,
    groundingNotPosted: s.groundingInventoryStrip?.notPosted,
    coldStart: json.coldStart,
    playerPropsLoadMeta: json.playerPropsLoadMeta,
    wcRelevance: json.wcRelevance,
  }, null, 2));
  return json;
}

async function main() {
  const payload = await getMatchesPayload({ preferGoat: true, forUrTake: true });
  const matches = payload?.matches || [];

  const braHai = matches.filter(
    (m) =>
      (String(m.homeTeam).toUpperCase() === "BRA" && String(m.awayTeam).toUpperCase() === "HAI") ||
      (String(m.homeTeam).toUpperCase() === "HAI" && String(m.awayTeam).toUpperCase() === "BRA"),
  );

  logSection("BRA vs HAI fixture(s) in matches payload");
  console.log(JSON.stringify(braHai.map((m) => ({
    id: m.id,
    bdlMatchId: m.bdlMatchId,
    home: m.homeTeam,
    away: m.awayTeam,
    status: m.status,
    date: m.date,
    odds: m.odds ? { totalLine: m.odds.totalLine, homeMl: m.odds.home?.moneyline, awayMl: m.odds.away?.moneyline } : null,
  })), null, 2));

  const match = braHai.sort((a, b) => {
    const live = (s) => /live|in.?progress|1h|2h/i.test(String(s));
    if (live(a.status) !== live(b.status)) return live(a.status) ? -1 : 1;
    return (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0);
  })[0];

  if (!match) {
    console.error("No BRA vs HAI match found in payload");
    process.exit(1);
  }
  const eventId = String(match.id);

  const historyVariants = [
    {
      label: "PROD-LIKE: lean text only, NO wcMatchTeams, NO structured",
      history: buildProdLikeHistory(),
    },
    {
      label: "WITH wcMatchTeams on assistant turn",
      history: [
        { role: "user", content: TURN1_Q },
        {
          role: "assistant",
          content: TURN1_LEAN,
          wcEventId: eventId,
          wcMatchTeams: { home: match.homeTeam, away: match.awayTeam },
        },
      ],
    },
    {
      label: "WITH structured Turn 1 card",
      history: [
        { role: "user", content: TURN1_Q },
        {
          role: "assistant",
          content: TURN1_LEAN,
          structured: {
            sport: "worldcup",
            callType: "matchup",
            fixtureHome: match.homeTeam,
            fixtureAway: match.awayTeam,
            wcEventId: eventId,
            call: TURN1_LEAN,
            lean: TURN1_LEAN,
            whyNow: TURN1_WHY,
            confidence: "Medium",
          },
          wcEventId: eventId,
          wcMatchTeams: { home: match.homeTeam, away: match.awayTeam },
        },
      ],
    },
  ];

  for (const variant of historyVariants) {
    logSection(`resolveWcTurnPlan() — ${variant.label}`);
    traceTurn2Plan(variant.label, variant.history, matches, eventId, { plannerHeader: "0" });
    logSection(`resolveWcTurnPlan() — ${variant.label} (WC_TURN_PLANNER=1)`);
    process.env.WC_TURN_PLANNER = "1";
    traceTurn2Plan(variant.label, variant.history, matches, eventId, { plannerHeader: "1" });
    process.env.WC_TURN_PLANNER = "0";
  }

  const prodHistory = buildProdLikeHistory();
  await traceKvAndDelivery(matches, eventId, prodHistory);

  if (RUN_HTTP) {
    logSection("PROD HTTP — exact screenshot conversation");
    await probeHttp("Turn 1", {
      question: TURN1_Q,
      sportHint: "worldcup",
      structured: true,
    });

    const turn1History = [
      { role: "user", content: TURN1_Q },
      { role: "assistant", content: TURN1_LEAN },
    ];

    await probeHttp("Turn 2 prod-like history (no structured)", {
      question: TURN2_Q,
      sportHint: "worldcup",
      structured: true,
      history: turn1History,
    });

    await probeHttp("Turn 2 with wcMatchTeams", {
      question: TURN2_Q,
      sportHint: "worldcup",
      structured: true,
      history: [
        { role: "user", content: TURN1_Q },
        {
          role: "assistant",
          content: TURN1_LEAN,
          wcMatchTeams: { home: match.homeTeam, away: match.awayTeam },
          wcEventId: eventId,
        },
      ],
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
