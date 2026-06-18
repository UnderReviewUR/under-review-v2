#!/usr/bin/env node
/**
 * RUN A / RUN B — real handler path for UZB/COL → "best players prop parlays?"
 *
 *   node scripts/wc-props-v2-ab-handler.mjs
 *   node scripts/wc-props-v2-ab-handler.mjs --base https://staging.example.com
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

process.env.UR_TAKE_REQUIRE_AUTH = "false";

const useRemote = process.argv.includes("--base");
const remoteBase = (() => {
  const i = process.argv.indexOf("--base");
  return i >= 0 ? String(process.argv[i + 1] || "").replace(/\/$/, "") : "";
})();

const HISTORY = [
  {
    role: "user",
    content: "Best bet on UZB vs COL if I only know the moneyline?",
  },
  {
    role: "assistant",
    content: "Lean Over 2.5 goals.",
    structured: {
      sport: "worldcup",
      fixtureHome: "UZB",
      fixtureAway: "COL",
      wcEventId: "24",
    },
  },
];

const QUESTION = "best players prop parlays?";

/**
 * @param {object} body
 */
function extractAudit(body) {
  const s = body.structured || {};
  const rel = body.wcRelevance || {};
  const propBoardRows = Array.isArray(s.propBoardRows) ? s.propBoardRows : [];
  const parlayLegs = Array.isArray(s.parlayLegs) ? s.parlayLegs : [];
  const legIds = [...propBoardRows, ...parlayLegs]
    .map((l) => l.legId || l.id)
    .filter(Boolean);
  return {
    wcIntent: body.wcIntent || rel.wcIntent,
    loadMatchProps: rel.wcPropsLoadMatchProps ?? null,
    kvLoadAttempted: rel.wcPropsKvLoadAttempted ?? null,
    marketTypesLoaded: rel.wcPropsMarketTypesLoaded ?? null,
    wcEventId: rel.wcEventId || s.wcEventId || null,
    wcPropsRouteV2: rel.wcPropsRouteV2 ?? null,
    wcPropsApplyRoute: rel.wcPropsApplyRoute ?? null,
    pinMethod: rel.wcPropsPinMethod ?? null,
    callType: s.callType || null,
    call: s.call || null,
    lean: s.lean || null,
    propBoardRowsCount: propBoardRows.length,
    parlayLegsCount: parlayLegs.length,
    legIds: legIds.slice(0, 8),
    passBoilerplate: /Pass — no actionable line yet/i.test(String(s.lean || s.call || "")),
  };
}

/**
 * @param {string} label
 * @param {boolean} v2
 */
async function runLocalHandler(label, v2) {
  if (v2) {
    process.env.WC_PROPS_ROUTE_V2 = "1";
    process.env.WC_PROPS_ROUTE_LOG = "1";
  } else {
    delete process.env.WC_PROPS_ROUTE_V2;
    delete process.env.WC_PROPS_ROUTE_LOG;
  }

  const handlerMod = await import("../api/ur-take.js");
  const handler = handlerMod.default;

  /** @type {Record<string, unknown> | null} */
  let body = null;
  const logs = [];

  const origLog = console.info;
  console.info = (...args) => {
    const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    if (line.includes("wcPropsRouteLog") || line.includes("ur_take")) logs.push(line);
    origLog(...args);
  };

  const req = {
    method: "POST",
    headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
    body: {
      question: QUESTION,
      sportHint: "worldcup",
      structured: true,
      history: HISTORY,
    },
  };

  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    json(payload) {
      body = payload;
      return payload;
    },
  };

  const t0 = Date.now();
  await handler(req, res);
  console.info = origLog;

  return {
    label,
    flag: v2 ? "WC_PROPS_ROUTE_V2=1" : "WC_PROPS_ROUTE_V2=off",
    ms: Date.now() - t0,
    http: res.statusCode,
    audit: extractAudit(body || {}),
    handlerLogs: logs.filter((l) => l.includes("wcPropsRouteLog")),
    rawStructured: body?.structured || null,
    rawWcRelevance: body?.wcRelevance || null,
  };
}

/**
 * @param {string} label
 * @param {boolean} v2
 */
async function runRemote(label, v2) {
  const headers = {
    "content-type": "application/json",
    "x-ur-take-structured": "1",
    "x-wc-props-route-v2": v2 ? "1" : "0",
  };

  const t0 = Date.now();
  const res = await fetch(`${remoteBase}/api/ur-take`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question: QUESTION,
      sportHint: "worldcup",
      structured: true,
      history: HISTORY,
    }),
  });
  const body = await res.json();
  return {
    label,
    flag: v2 ? "WC_PROPS_ROUTE_V2=1 (header)" : "WC_PROPS_ROUTE_V2=off",
    ms: Date.now() - t0,
    http: res.status,
    audit: extractAudit(body),
    handlerLogs: [],
    rawStructured: body?.structured || null,
    rawWcRelevance: body?.wcRelevance || null,
  };
}

const run = useRemote ? runRemote : runLocalHandler;

console.log(JSON.stringify({ mode: useRemote ? "remote" : "local_handler", question: QUESTION }, null, 2));

const runA = await run("RUN_A", false);
const runB = await run("RUN_B", true);

console.log("\n========== SIDE BY SIDE ==========\n");
console.log(JSON.stringify({ RUN_A: runA, RUN_B: runB }, null, 2));

const runAOk =
  runA.audit.wcIntent === "PARLAY" &&
  runA.audit.passBoilerplate &&
  (runA.audit.marketTypesLoaded == null || runA.audit.marketTypesLoaded === 0) &&
  !runA.audit.wcPropsApplyRoute;

const runBOk =
  runB.audit.wcPropsApplyRoute === true &&
  String(runB.audit.wcEventId) === "24" &&
  runB.audit.marketTypesLoaded > 0 &&
  runB.audit.propBoardRowsCount > 0 &&
  runB.audit.legIds.length > 0 &&
  !runB.audit.passBoilerplate;

console.log("\n========== VERDICT ==========");
console.log(
  JSON.stringify(
    {
      runA_baseline_ok: runAOk,
      runB_event24_ok: runBOk,
      runA: {
        wcIntent: runA.audit.wcIntent,
        wcEventId: runA.audit.wcEventId,
        marketTypesLoaded: runA.audit.marketTypesLoaded,
        propBoardRows: runA.audit.propBoardRowsCount,
        parlayLegs: runA.audit.parlayLegsCount,
        lean: runA.audit.lean,
        passBoilerplate: runA.audit.passBoilerplate,
      },
      runB: {
        wcEventId: runB.audit.wcEventId,
        marketTypesLoaded: runB.audit.marketTypesLoaded,
        propBoardRows: runB.audit.propBoardRowsCount,
        parlayLegs: runB.audit.parlayLegsCount,
        legIds: runB.audit.legIds,
        lean: runB.audit.lean,
        passBoilerplate: runB.audit.passBoilerplate,
      },
      shadow_rollout: runAOk && runBOk,
    },
    null,
    2,
  ),
);

process.exit(runAOk && runBOk ? 0 : 1);
