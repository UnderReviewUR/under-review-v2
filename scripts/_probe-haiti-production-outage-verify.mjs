#!/usr/bin/env node
/**
 * Strict production-outage verification for Haiti tonight player props.
 * Reproduces screenshot failure (kv_props_fetch_failed, wcEventId null, cold slate pass)
 * and traces handler delivery with before/after fix gates.
 */
import { getMatchesPayload } from "../api/world-cup.js";
import { buildWorldCupUrTakeContext } from "../api/_wcUrTakeContext.js";
import { loadWcPlayerMarketKvBlocksWithRetry } from "../api/_wcPlayerUrTakeContext.js";
import {
  hasMatchPlayerPropRows,
  isMatchPlayerPropsFresh,
  kvHasFreshMatchPlayerProps,
  matchPlayerPropRowsFromEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import { resolveWcTurnPlan } from "../shared/wcTurnPlanner.js";
import { resolveWcTurnIntent } from "../shared/wcTurnIntent.js";
import { resolveUrTakeConversationFollowUp } from "../shared/urTakeFollowUpDetection.js";
import {
  resolveWcPlayerPropFixtureTeams,
  resolveWcEventIdForPlayerNation,
} from "../shared/wcPlayerPropFixture.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import {
  isGenericWcPlayerPropQuestion,
  isWcFixturePlayerPropsQuestion,
  buildWcPlayerPropPassHeadline,
  resolveWcPlayerMarketResponse,
} from "../shared/wcUrTakePlayerMarket.js";
import { resolveWcPlayerMarketAnswer } from "../shared/wcPlayerMarketResolve.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import {
  isWcPropsShapeRoutedAsk,
  shouldSkipWcPlayerPropsFastPathForShape,
} from "../shared/wcGroundingShapeRoute.js";

const Q = "best player props for haiti tonight?";
const HISTORY_PROD = [
  { role: "user", content: "Best live angle on BRA vs HAI right now?" },
  { role: "assistant", content: "Lean Under 2.5 goals" },
];
const UR_TAKE_URL = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";
const SLATE_PASS_RE = /\bPlayer props for today's slate\b/i;

function section(title) {
  console.log(`\n${"=".repeat(88)}\n${title}\n${"=".repeat(88)}`);
}

function traceResolveWcPlayerMarketAnswer(question, wcIntent, wcContext, kvBlocks) {
  const questionStr = String(question || "").trim();
  const history = Array.isArray(wcContext?.conversationHistory) ? wcContext.conversationHistory : [];
  const fixtureMatches = Array.isArray(wcContext?.allMatches) ? wcContext.allMatches : [];
  const fixtureTeams = resolveWcPlayerPropFixtureTeams(questionStr, history, wcContext, fixtureMatches);
  const questionTeams = extractMentionedWcTeams(questionStr);
  const isFixturePlayerPropAsk =
    isGenericWcPlayerPropQuestion(questionStr) ||
    isWcFixturePlayerPropsQuestion(questionStr);
  const singleNationPropsAsk =
    questionTeams.length === 1 &&
    (isGenericWcPlayerPropQuestion(questionStr) || /\btonight\b/i.test(questionStr));
  const fixtureTeamsNoMatches = resolveWcPlayerPropFixtureTeams(
    questionStr,
    history,
    wcContext,
    [],
  );
  const genericSlateProps =
    wcIntent === WC_INTENT.PLAYER_PROP &&
    isFixturePlayerPropAsk &&
    !isWcFixturePlayerPropsQuestion(questionStr) &&
    !singleNationPropsAsk &&
    fixtureTeams.length < 2;
  const genericSlateProps_PRE_FIX =
    wcIntent === WC_INTENT.PLAYER_PROP &&
    isFixturePlayerPropAsk &&
    !isWcFixturePlayerPropsQuestion(questionStr) &&
    fixtureTeamsNoMatches.length < 2;
  const freshMatchProps = kvHasFreshMatchPlayerProps(kvBlocks?.matchPlayerProps, {
    eventId: String(kvBlocks?.wcEventId || wcContext?.wcEventId || "").trim(),
    question: questionStr,
    teams: fixtureTeams.length >= 2 ? fixtureTeams : questionTeams,
  });
  const answer = resolveWcPlayerMarketAnswer(question, wcIntent, wcContext, kvBlocks);
  const emitter =
    answer.structured?.call && SLATE_PASS_RE.test(answer.structured.call)
      ? "resolveWcPlayerMarketAnswer → buildWcPlayerPropPassHeadline (via forcePass genericSlateProps) → repairWcPlayerPropPassCard"
      : answer.structured?.call
        ? "resolveWcPlayerMarketAnswer → fixture/fixtureIntel pass OR verified board"
        : "resolveWcPlayerMarketAnswer → no structured (routes to Claude)";

  return {
    wcContextIsNull: wcContext == null,
    wcContextAllMatchesLen: fixtureMatches.length,
    wcEventId: kvBlocks?.wcEventId ?? wcContext?.wcEventId ?? null,
    fixtureTeams,
    questionTeams,
    singleNationPropsAsk,
    genericSlateProps,
    genericSlateProps_PRE_FIX,
    hasMatchPlayerPropRows: hasMatchPlayerPropRows(kvBlocks?.matchPlayerProps),
    isMatchPlayerPropsFresh: isMatchPlayerPropsFresh(kvBlocks?.matchPlayerProps),
    freshMatchProps,
    forcePass: answer.forcePass,
    structuredCall: answer.structured?.call ?? null,
    structuredWhyNow: answer.structured?.whyNow ?? null,
    coldSlatePass: SLATE_PASS_RE.test(String(answer.structured?.call || "")),
    messageEmitter: emitter,
    buildWcPlayerPropPassHeadline: buildWcPlayerPropPassHeadline(questionStr),
  };
}

function simulateHandlerPassGate_PRE_FIX({ question, wcIntent, wcContext, wcGroundingPacket, kvBlocks }) {
  const trace = traceResolveWcPlayerMarketAnswer(question, wcIntent, wcContext, kvBlocks);
  const shapeRoutedToClaude =
    wcGroundingPacket &&
    shouldSkipWcPlayerPropsFastPathForShape(wcGroundingPacket.ask?.shape);
  const preFixForcePass = trace.genericSlateProps_PRE_FIX && !trace.freshMatchProps;
  const preFixCall = preFixForcePass ? trace.buildWcPlayerPropPassHeadline : null;
  const wouldDeliverColdPass =
    !shapeRoutedToClaude && preFixForcePass && SLATE_PASS_RE.test(String(preFixCall || ""));
  return {
    shapeRoutedToClaude: Boolean(shapeRoutedToClaude),
    genericSlateProps_PRE_FIX: trace.genericSlateProps_PRE_FIX,
    preFixForcePass,
    wouldDeliverColdPass,
    resolvedCall: preFixCall,
    messageEmitter:
      "buildWcPlayerPropPassHeadline → repairWcPlayerPropPassCard → handler ur_take_wc_player_market_pass",
    callStack:
      "handler.js resolveWcPlayerMarketResponse → wcPlayerMarketPassUsed → QA loop break (no Anthropic)",
  };
}

function simulateHandlerPassGate({ question, wcIntent, wcContext, wcGroundingPacket, history }) {
  const routingQuestion = question;
  const wcPlayerResolved = resolveWcPlayerMarketResponse(question, wcIntent, wcContext);
  const coldGenericSlatePass =
    wcPlayerResolved.forcePass &&
    SLATE_PASS_RE.test(String(wcPlayerResolved.structured?.call || ""));
  const propsShapeRoutedAsk = isWcPropsShapeRoutedAsk({
    sportHint: "worldcup",
    wcIntent,
    routingQuestion,
    hasImage: false,
    history,
  });
  const shapeFromPacket =
    wcGroundingPacket &&
    shouldSkipWcPlayerPropsFastPathForShape(wcGroundingPacket.ask?.shape);
  const shapeRoutedToClaude =
    shapeFromPacket || (propsShapeRoutedAsk && coldGenericSlatePass);
  const wouldDeliverColdPass =
    !shapeRoutedToClaude &&
    Boolean(wcPlayerResolved.structured) &&
    SLATE_PASS_RE.test(String(wcPlayerResolved.structured?.call || ""));
  const wouldShortCircuitAnthropic =
    !shapeRoutedToClaude && (wcPlayerResolved.forcePass || wcPlayerResolved.structured);

  return {
    propsShapeRoutedAsk,
    wcGroundingPacketPresent: Boolean(wcGroundingPacket),
    groundingShape: wcGroundingPacket?.ask?.shape ?? null,
    shapeFromPacket,
    coldGenericSlatePass,
    shapeRoutedToClaude,
    wouldDeliverColdPass,
    wouldShortCircuitAnthropic,
    wcPlayerMarketPassUsed: wouldShortCircuitAnthropic && Boolean(wcPlayerResolved.structured),
    resolvedCall: wcPlayerResolved.structured?.call ?? null,
    eventLog: wouldDeliverColdPass ? "ur_take_wc_player_market_pass" : null,
  };
}

async function traceKvLoad(label, opts, retryOpts) {
  const kv = await loadWcPlayerMarketKvBlocksWithRetry(Date.now(), opts, retryOpts);
  const rowCount = WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
    (n, key) => n + matchPlayerPropRowsFromEvent(kv.matchPlayerProps, key, 999).length,
    0,
  );
  return {
    label,
    wcEventId: kv.wcEventId ?? null,
    loadMeta: kv.loadMeta ?? null,
    hasMatchPlayerPropRows: hasMatchPlayerPropRows(kv.matchPlayerProps),
    isMatchPlayerPropsFresh: isMatchPlayerPropsFresh(kv.matchPlayerProps),
    rowCount,
    failed: Boolean(kv.loadMeta?.failed),
    error: kv.loadMeta?.failed ? kv.loadMeta?.error || "no_usable_rows" : null,
  };
}

async function traceTurnPlan(question, history, matches) {
  const followUp = resolveUrTakeConversationFollowUp(question, history);
  const intent = resolveWcTurnIntent(question, history, followUp.isFollowUp, null);
  const plan = resolveWcTurnPlan({
    question,
    fullQuestion: question,
    history,
    matches,
    incomingWcEventId: null,
    hasKvFixture: false,
    isConversationFollowUp: followUp.isFollowUp,
  });
  return { intent, followUp: followUp.isFollowUp, resolveWcTurnPlan: plan };
}

async function probeProd(label, body) {
  const res = await fetch(UR_TAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ur-take-structured": "1" },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  const s = j.structured || {};
  const cold = SLATE_PASS_RE.test(String(s.call || ""));
  return {
    label,
    http: res.status,
    requestId: j.requestId,
    wcIntent: j.wcIntent,
    callType: s.callType,
    call: s.call,
    whyNow: s.whyNow,
    wcEventId: j.wcEventId ?? s.wcEventId,
    coldSlatePass: cold,
    playerPropsLoadMeta: j.playerPropsLoadMeta ?? j.wcRelevance?.playerPropsLoadMeta,
    wcPropsKvLoadAttempted: j.wcRelevance?.wcPropsKvLoadAttempted,
  };
}

async function ensureWcPlayerPropsUrTakeContext(wcContext, opts = {}) {
  if (wcContext && Array.isArray(wcContext.allMatches) && wcContext.allMatches.length) {
    return wcContext;
  }
  let matches = [];
  try {
    const payload = await getMatchesPayload({ preferGoat: true, forUrTake: true });
    matches = payload?.matches || [];
  } catch {
    matches = [];
  }
  if (wcContext && typeof wcContext === "object") {
    if (matches.length) wcContext.allMatches = matches;
    return wcContext;
  }
  return {
    source: "worldcup_player_props_recover",
    allMatches: matches,
    requiredEntities: opts.requiredEntities || [],
    conversationHistory: opts.conversationHistory || [],
    wcEventId: opts.wcEventId || null,
  };
}

async function main() {
  const payload = await getMatchesPayload({ preferGoat: true, forUrTake: true });
  const matches = payload?.matches || [];
  const nationEventId = resolveWcEventIdForPlayerNation(matches, "HAI");

  section(`QUERY: "${Q}"`);
  console.log(JSON.stringify({ matchCount: matches.length, nationEventId }, null, 2));

  section("A. resolveWcTurnPlan — exact prod history shape");
  console.log(JSON.stringify(await traceTurnPlan(Q, HISTORY_PROD, matches), null, 2));
  console.log(JSON.stringify(await traceTurnPlan(Q, [], matches), null, 2));

  section("B. REPRODUCE SCREENSHOT FAILURE — wcContext null + KV failed (monitoring alert shape)");
  const failedKv = {
    players: null,
    goldenBoot: null,
    injuries: null,
    matchPlayerProps: null,
    wcEventId: null,
    loadMeta: { failed: true, error: "no_usable_rows", attempts: 4, loadMs: 6500 },
  };
  const failureTrace = traceResolveWcPlayerMarketAnswer(Q, WC_INTENT.PLAYER_PROP, null, failedKv);
  console.log(JSON.stringify(failureTrace, null, 2));
  console.log("\nHandler pass gate PRE-FIX (null context, no grounding, no coldSlate gate):");
  console.log(
    JSON.stringify(
      simulateHandlerPassGate_PRE_FIX({
        question: Q,
        wcIntent: WC_INTENT.PLAYER_PROP,
        wcContext: null,
        wcGroundingPacket: null,
        kvBlocks: failedKv,
      }),
      null,
      2,
    ),
  );
  const failureHandler = simulateHandlerPassGate({
    question: Q,
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcContext: null,
    wcGroundingPacket: null,
    history: HISTORY_PROD,
  });
  console.log("\nHandler pass gate (PRE-FIX behavior — null context, no grounding):");
  console.log(JSON.stringify(failureHandler, null, 2));

  section("C. REPRODUCE — empty allMatches + KV null (context timeout partial)");
  const emptyMatchesCtx = { requiredEntities: ["HAI"], conversationHistory: HISTORY_PROD, allMatches: [] };
  console.log(
    JSON.stringify(
      traceResolveWcPlayerMarketAnswer(Q, WC_INTENT.PLAYER_PROP, emptyMatchesCtx, failedKv),
      null,
      2,
    ),
  );

  section("D. loadWcPlayerMarketKvBlocksWithRetry — production failure simulation");
  console.log(
    JSON.stringify(
      await traceKvLoad("forced_fail_no_event_no_matches", {
        wcEventId: null,
        wcIntent: WC_INTENT.PLAYER_PROP,
        question: Q,
        matches: [],
        conversationHistory: HISTORY_PROD,
        requiredEntities: ["HAI"],
      }, { maxRetries: 0, timeoutMs: 1 }),
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      await traceKvLoad("nation_pin_with_matches", {
        wcEventId: nationEventId,
        wcIntent: WC_INTENT.PLAYER_PROP,
        question: Q,
        matches,
        conversationHistory: [],
        requiredEntities: ["HAI"],
      }, { maxRetries: 2, backoffMs: 400, timeoutMs: 14000 }),
      null,
      2,
    ),
  );

  section("E. POST-FIX — ensureWcPlayerPropsUrTakeContext recovers from null");
  const recovered = await ensureWcPlayerPropsUrTakeContext(null, {
    requiredEntities: ["HAI"],
    conversationHistory: HISTORY_PROD,
  });
  console.log(
    JSON.stringify(
      {
        wcContextIsNull: recovered == null,
        allMatchesLen: recovered?.allMatches?.length ?? 0,
        fixtureTeams: resolveWcPlayerPropFixtureTeams(Q, HISTORY_PROD, recovered, recovered.allMatches),
      },
      null,
      2,
    ),
  );
  const postFixTrace = traceResolveWcPlayerMarketAnswer(
    Q,
    WC_INTENT.PLAYER_PROP,
    recovered,
    failedKv,
  );
  console.log("\nresolveWcPlayerMarketAnswer after recovery + failed KV:");
  console.log(JSON.stringify(postFixTrace, null, 2));
  const postFixHandler = simulateHandlerPassGate({
    question: Q,
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcContext: recovered,
    wcGroundingPacket: null,
    history: HISTORY_PROD,
  });
  console.log("\nHandler pass gate (POST-FIX):");
  console.log(JSON.stringify(postFixHandler, null, 2));

  section("F. Context build — 8s race (no inline KV in context)");
  const ctxStart = Date.now();
  let ctx = null;
  let ctxError = null;
  try {
    ctx = await buildWorldCupUrTakeContext(Q, {
      wcIntent: WC_INTENT.PLAYER_PROP,
      requiredEntities: ["HAI"],
      conversationHistory: HISTORY_PROD,
    });
  } catch (err) {
    ctxError = err?.message || String(err);
  }
  console.log(
    JSON.stringify(
      {
        buildMs: Date.now() - ctxStart,
        ctxIsNull: ctx == null,
        ctxError,
        allMatchesLen: ctx?.allMatches?.length ?? 0,
        wcEventId: ctx?.wcEventId ?? null,
        playerMarketKvPresent: Boolean(ctx?.playerMarketKv),
        inlineKvDeferred: !ctx?.playerMarketKv?.matchPlayerProps,
      },
      null,
      2,
    ),
  );

  section("G. PRODUCTION HTTP — 5 cold-start probes (exact query + prod history)");
  const prodResults = [];
  for (let i = 0; i < 5; i += 1) {
    prodResults.push(
      await probeProd(`prod_${i + 1}_no_history`, {
        question: Q,
        sportHint: "worldcup",
        structured: true,
      }),
    );
    await new Promise((r) => setTimeout(r, 800));
  }
  prodResults.push(
    await probeProd("prod_history_BRA_HAI", {
      question: Q,
      sportHint: "worldcup",
      structured: true,
      history: HISTORY_PROD,
    }),
  );
  console.log(JSON.stringify(prodResults, null, 2));

  const anyCold = prodResults.some((r) => r.coldSlatePass);
  const postFixOk = !postFixTrace.coldSlatePass && !postFixHandler.wouldDeliverColdPass;

  section("VERDICT");
  console.log(
    JSON.stringify(
      {
        preFixNullContextDeliversColdSlate: failureHandler.wouldDeliverColdPass,
        preFixMessageEmitter: failureTrace.messageEmitter,
        postFixLocalBlocksColdSlate: postFixOk,
        prodAnyColdSlateIn5Probes: anyCold,
        prodColdProbeLabels: prodResults.filter((r) => r.coldSlatePass).map((r) => r.label),
        fixDeployedToProd: !anyCold && postFixOk,
      },
      null,
      2,
    ),
  );

  if (failureHandler.wouldDeliverColdPass && !postFixOk) {
    process.exit(1);
  }
  if (anyCold) {
    console.error("\nPRODUCTION STILL RETURNING COLD SLATE — fix not deployed or insufficient");
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
