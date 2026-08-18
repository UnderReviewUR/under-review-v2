/**
 * Local-only E2E probe — full ur-take handler, prod-like env. NOT for commit.
 * Usage: node scripts/_local-e2e-wc-probe.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

process.env.UR_TAKE_REQUIRE_AUTH = "false";
process.env.UR_TALK_MODE = "1";

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error("ANTHROPIC_API_KEY missing — cannot run full E2E handler.");
  process.exit(1);
}

import handler from "../api/ur-take.js";
import { resolveUrTakeDeliveryMode, isWcSimpleMatchupTalkOpener, isUrTakeNewBettingAsk } from "../shared/urTakeDeliveryMode.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";
import { resolveWcTurnPlan } from "../shared/wcTurnPlanner.js";
import { buildWcStructuredForPlan } from "../shared/wcTurnDelivery.js";
import {
  resolveWcLineMovementMarketKind,
  parseWcLiveCheckpointMinuteBucket,
  wcCheckpointMarketLabel,
  wcCheckpointMinuteLabel,
  isWcOddsLineMovementQuestion,
  isWcLiveEntryPlanningQuestion,
  shouldForceWcLineMovementStructuredCard,
  isWcLineMovementTalkEligible,
  synthesizeWcOddsLineMovementLean,
  synthesizeWcLiveEntryPlanningLean,
  repairWcTalkLineMovementProse,
  runWcLineMovementOutputQA,
} from "../shared/wcOddsLineMovement.js";
import { loadWcMatchInventoryForUrTake } from "../api/_wcFixtureMatchupPrebuiltInputs.js";
import { formatWcCompactDisplayText } from "../shared/wcUrTakeCompactDelivery.js";

/** @type {string[]} */
const handlerEvents = [];

const origLog = console.log.bind(console);
console.log = (...args) => {
  const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  if (
    /ur_take_wc_|WC Turn Plan|ur_take_complete|ur_take_talk|turn_plan_delivery_miss|live_in_play|deliveryMode/i.test(
      line,
    )
  ) {
    handlerEvents.push(line.slice(0, 500));
  }
  origLog(...args);
};

const CASES = [
  {
    id: "A",
    label: "Original bug (FRA ML + Over, wait 0-0 ~30)",
    question:
      "France moneyline is -525 and Over 1.5 is -525. I might wait to see if it's 0-0 about 30 minutes in and then evaluate the lines",
    wcEventId: "163",
    history: [],
  },
  {
    id: "B",
    label: "Prod failure (live angle PAR vs FRA)",
    question: "Best live angle on PAR vs FRA right now?",
    wcEventId: "163",
    history: [],
  },
  {
    id: "C",
    label: "FRA -525 at 0-0 30'",
    question: "France -525, what happens if it's 0-0 at 30 minutes?",
    wcEventId: "163",
    history: [],
  },
  {
    id: "D",
    label: "Germany -669 early scoreless drift",
    question: "Germany at -669. Does that go to like -575 if it's scoreless early on?",
    wcEventId: null,
    history: [],
  },
  {
    id: "E",
    label: "Mixed ML + Over wait for 0-0 at 30",
    question: "France moneyline -525 and Over 1.5, should I wait for 0-0 at 30?",
    wcEventId: "163",
    history: [],
  },
];

/**
 * @param {object} opts
 */
async function invokeHandler(opts) {
  /** @type {Record<string, unknown> | null} */
  let body = null;
  let statusCode = 200;
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": "0",
      "x-ur-take-structured": "1",
    },
    body: {
      question: opts.question,
      sportHint: "worldcup",
      structured: true,
      history: opts.history || [],
      wcEventId: opts.wcEventId || undefined,
    },
  };
  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(payload) {
      body = payload;
    },
    end() {},
  };
  const t0 = Date.now();
  await handler(req, res);
  return { body, statusCode, elapsedMs: Date.now() - t0 };
}

/**
 * @param {object} row
 * @param {Array<Record<string, unknown>>} matches
 */
function preTrace(row, matches) {
  const q = row.question;
  const wcIntent = classifyWcQuestionIntent(q, row.history || []);
  const deliveryModeResolved = resolveUrTakeDeliveryMode({
    sportHint: "worldcup",
    wcIntent,
    question: q,
    history: row.history || [],
    isConversationFollowUp: false,
  });
  const plan = resolveWcTurnPlan({
    question: q,
    history: row.history || [],
    matches,
    incomingWcEventId: row.wcEventId,
    hasKvFixture: Boolean(row.wcEventId),
  });
  const marketKind = resolveWcLineMovementMarketKind(q);
  const minuteBucket = parseWcLiveCheckpointMinuteBucket(q);
  const lineMovement = isWcOddsLineMovementQuestion(q);
  const liveEntry = isWcLiveEntryPlanningQuestion(q);
  const forceStructured = shouldForceWcLineMovementStructuredCard(q);
  const talkEligible = isWcLineMovementTalkEligible(q);

  return {
    wcIntent,
    deliveryModeResolved,
    simpleTalkOpener: isWcSimpleMatchupTalkOpener(q),
    newBettingAsk: isUrTakeNewBettingAsk({ question: q, wcIntent, isConversationFollowUp: false }),
    plannerLane: plan.lane,
    plannerReason: plan.reason,
    plannerFastPath: plan.shouldUseFastPath,
    pinnedEventId: plan.pinnedEventId,
    pinnedHome: plan.pinnedHome,
    pinnedAway: plan.pinnedAway,
    lineMovementQuestion: lineMovement,
    liveEntryPlanning: liveEntry,
    forceLineMovementStructured: forceStructured,
    lineMovementTalkEligible: talkEligible,
    marketKind,
    marketLabel: wcCheckpointMarketLabel(marketKind),
    minuteBucket,
    minuteLabel: wcCheckpointMinuteLabel(minuteBucket),
  };
}

/**
 * @param {object} row
 * @param {object} pre
 * @param {Array<Record<string, unknown>>} matches
 */
async function prebuiltDryRun(row, pre, matches) {
  const plan = resolveWcTurnPlan({
    question: row.question,
    history: row.history || [],
    matches,
    incomingWcEventId: row.wcEventId,
    hasKvFixture: Boolean(row.wcEventId),
  });
  const built = await buildWcStructuredForPlan(plan, {
    question: row.question,
    matches,
    wcEventId: row.wcEventId,
  });
  return built;
}

function inferDeliveryPath(body, pre) {
  if (!body) return "unknown (no body)";
  const fmt = String(body.responseFormat || "");
  const mode = String(body.deliveryMode || "");
  if (mode === "talk" || fmt === "talk") return "Talk (Haiku)";
  if (body.passKind || body.structured) {
    return `Take / prebuilt (${body.passKind || pre.plannerLane || "structured"})`;
  }
  if (fmt === "structured" && body.structured) return "Take / structured (Sonnet or planner)";
  if (pre.forceLineMovementStructured && pre.plannerFastPath) return "Expected Take — verify actual";
  return `LLM full path (${fmt || "plain"})`;
}

function synthReference(row, matches) {
  const q = row.question;
  if (!isWcOddsLineMovementQuestion(q) && !isWcLiveEntryPlanningQuestion(q)) return null;
  const parFra = matches.find((m) => String(m.id) === "163") || {
    homeTeam: "PAR",
    awayTeam: "FRA",
    odds: {
      home: { moneyline: "+1800" },
      away: { moneyline: "-550" },
      draw: { moneyline: "+650" },
      totalLine: "2.5",
      totalOver: "-154",
    },
  };
  const opts = {
    home: String(parFra.homeTeam || "PAR").toUpperCase(),
    away: String(parFra.awayTeam || "FRA").toUpperCase(),
    match: parFra,
  };
  if (isWcLiveEntryPlanningQuestion(q)) {
    return synthesizeWcLiveEntryPlanningLean(q, opts);
  }
  return synthesizeWcOddsLineMovementLean(q, opts);
}

async function main() {
  origLog("=== Local E2E WC probe (UR_TALK_MODE=1, full handler) ===\n");

  let matches = [];
  try {
    matches = await loadWcMatchInventoryForUrTake(Date.now());
    origLog(`Match inventory: ${matches.length} fixtures loaded`);
    const parFra = matches.find((m) => String(m.homeTeam) === "PAR" && String(m.awayTeam) === "FRA");
    if (parFra) {
      origLog(
        `PAR vs FRA (id ${parFra.id}): status=${parFra.status} score=${parFra.homeScore}-${parFra.awayScore} FRA ML=${parFra.odds?.away?.moneyline || parFra.odds?.away}`,
      );
    } else {
      origLog("WARN: PAR vs FRA not in local match inventory");
    }
  } catch (e) {
    origLog("WARN: match inventory load failed:", e?.message);
  }

  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const row of CASES) {
    handlerEvents.length = 0;
    origLog(`\n${"=".repeat(72)}\nCASE ${row.id}: ${row.label}\n${"=".repeat(72)}`);
    origLog(`Q: ${row.question}\n`);

    const pre = preTrace(row, matches);
    const dryBuilt = await prebuiltDryRun(row, pre, matches);
    const synth = synthReference(row, matches);

    origLog("--- PRE-HANDLER ROUTING ---");
    origLog(JSON.stringify(pre, null, 2));
    origLog(
      `Prebuilt dry-run: ${dryBuilt ? `${dryBuilt.passKind} → "${String(dryBuilt.structured?.call || dryBuilt.structured?.lean || "").slice(0, 120)}"` : "NULL (would miss fast path)"}`,
    );
    if (synth) {
      const qaSynth = runWcLineMovementOutputQA(synth, row.question);
      origLog(`Deterministic synthesis (reference): ${synth.slice(0, 200)}…`);
      origLog(`Synthesis QA: ${qaSynth.passed ? "pass" : qaSynth.issueCodes.join(", ")}`);
    }

    const { body, statusCode, elapsedMs } = await invokeHandler(row);
    const responseText = String(body?.response || "").trim();
    const repaired =
      body?.deliveryMode === "talk" || body?.responseFormat === "talk"
        ? repairWcTalkLineMovementProse(responseText, row.question)
        : null;
    const qaOut = runWcLineMovementOutputQA(responseText, row.question);
    const qaRepaired = repaired ? runWcLineMovementOutputQA(repaired, row.question) : null;

    const deliveryPath = inferDeliveryPath(body, pre);
    const pass =
      row.id === "B"
        ? body?.structured && body?.responseFormat === "structured" && !/need the current score|what's the current state/i.test(responseText)
        : null;

    const result = {
      id: row.id,
      label: row.label,
      question: row.question,
      statusCode,
      elapsedMs,
      pre,
      prebuiltDryRun: dryBuilt
        ? {
            passKind: dryBuilt.passKind,
            call: dryBuilt.structured?.call,
            lean: dryBuilt.structured?.lean,
          }
        : null,
      handler: {
        deliveryMode: body?.deliveryMode || (body?.structured ? "take" : body?.responseFormat || "unknown"),
        responseFormat: body?.responseFormat,
        passKind: body?.passKind || body?.meta?.passKind,
        wcIntent: body?.wcIntent,
        liveMode: body?.liveMode,
        deliveryPath,
        qaSummary: body?.qaSummary,
        regenerationAttempts: body?.qaSummary?.regenerationAttempts,
        issueCodes: body?.qaSummary?.issueCodes,
      },
      finalReplyText: responseText,
      structuredCall: body?.structured?.call,
      structuredLean: body?.structured?.lean,
      structuredWhyNow: body?.structured?.whyNow,
      talkRepairApplied: Boolean(repaired && repaired !== responseText),
      qaOnFinalReply: qaOut,
      qaAfterTalkRepair: qaRepaired,
      handlerLogEvents: [...handlerEvents],
      caseBPass: pass,
    };
    results.push(result);

    origLog("\n--- USER-VISIBLE REPLY ---");
    origLog(responseText);
    origLog("\n--- HANDLER TRACE ---");
    origLog(JSON.stringify(result.handler, null, 2));
    if (body?.structured) {
      origLog("Structured call:", body.structured.call);
      origLog("Structured lean:", body.structured.lean);
    }
    origLog(`QA on final reply: ${qaOut.passed ? "pass" : qaOut.issueCodes.join(", ")}`);
    if (repaired && repaired !== responseText) {
      origLog(`Talk repair would change text: yes`);
      origLog(`QA after repair: ${qaRepaired?.passed ? "pass" : qaRepaired?.issueCodes.join(", ")}`);
    }
    origLog(`Elapsed: ${elapsedMs}ms`);
    if (handlerEvents.length) {
      origLog("Handler log snippets:", handlerEvents.slice(0, 5));
    }
  }

  const outPath = path.join(root, "scripts", "_local-e2e-wc-probe-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  origLog(`\nFull JSON written to ${outPath}`);
}

await main();
