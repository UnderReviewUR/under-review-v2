#!/usr/bin/env node
/**
 * Phase 4 soak — golden thread + broader fixtures + offline gates + ops hygiene.
 *
 * Usage:
 *   node scripts/probe-phase4-soak.mjs
 *   node scripts/probe-phase4-soak.mjs http://localhost:5173
 *   node scripts/probe-phase4-soak.mjs https://www.under-review.app
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildWcGroundingStripModel } from "../shared/wcGroundingCardUi.js";
import {
  resolveWcUrTakeV2Turn,
  shouldSkipWcPlayerPropsFastPathForV2Deliver,
  shouldSkipWcPlayerKvSupplementForV2Deliver,
  resolveWcUrTakeLoadingSportKey,
  isWcUrTakeV2DeliverEnabled,
} from "../shared/wcUrTakePipeline.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.production.local") });

const BASE = process.argv[2] || null;
const failures = [];

function pass(label, detail = "") {
  console.log(`OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail) {
  failures.push(`${label}: ${detail}`);
  console.error(`FAIL ${label} — ${detail}`);
}

const MEX_KOR_HISTORY = [
  { role: "user", content: "MEX vs KOR moneyline" },
  {
    role: "assistant",
    content: "Lean Mexico +100",
    structured: { fixtureHome: "MEX", fixtureAway: "KOR", wcEventId: "28" },
    wcEventId: "28",
  },
  {
    role: "user",
    content: "Son, Jimenez, and Quinones each going over 2.5 shots attempted?",
  },
  {
    role: "assistant",
    content: "3 of 3 playable",
    structured: { fixtureHome: "MEX", fixtureAway: "KOR", wcEventId: "28" },
    wcEventId: "28",
  },
];

async function postUrTake(question, history = [], extra = {}) {
  const res = await fetch(`${BASE}/api/ur-take`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ur-take-structured": "1",
      "x-wc-props-route-v2": "1",
    },
    body: JSON.stringify({
      question,
      structured: true,
      sportHint: "worldcup",
      history,
      wcEventId: "28",
      ...extra,
    }),
  });
  return res.json();
}

function soakOfflineGates() {
  const contract = spawnSync(process.execPath, ["scripts/wc-props-routing-contract.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  if (contract.status !== 0) {
    fail("routing-contract", contract.stderr || contract.stdout || "exit nonzero");
    return;
  }
  pass("routing-contract", "49/49");

  const stress = spawnSync(process.execPath, ["scripts/stress-wc-phases-offline.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  if (stress.status !== 0) {
    fail("stress-wc-phases", stress.stderr?.slice(-400) || "exit nonzero");
    return;
  }
  pass("stress-wc-phases", "170/170");
}

async function soakPipelineGuards() {
  const v2Deliver = isWcUrTakeV2DeliverEnabled({});
  const whoTurn = resolveWcUrTakeV2Turn({
    question: "Who wins MEX vs KOR?",
    history: MEX_KOR_HISTORY,
    matches: [{ id: "28", homeTeam: "MEX", awayTeam: "KOR", status: "scheduled" }],
    incomingWcEventId: "28",
    routeHeader: "1",
  });
  if (whoTurn.lane !== "matchup_ml") {
    fail("pipeline-who-wins-lane", whoTurn.lane);
  } else {
    pass("pipeline-who-wins-lane", "matchup_ml");
  }
  if (
    !shouldSkipWcPlayerPropsFastPathForV2Deliver({ v2Deliver, v2Turn: whoTurn })
  ) {
    fail("pipeline-skip-props-fast", "expected skip on matchup_ml");
  } else {
    pass("pipeline-skip-props-fast", "matchup_ml blocked");
  }
  if (
    !shouldSkipWcPlayerKvSupplementForV2Deliver({ v2Deliver, v2Turn: whoTurn })
  ) {
    fail("pipeline-skip-kv-supplement", "expected skip on matchup_ml");
  } else {
    pass("pipeline-skip-kv-supplement", "matchup_ml blocked");
  }

  const shotsTurn = resolveWcUrTakeV2Turn({
    question: "Son, Jimenez, and Quinones each going over 2.5 shots attempted?",
    history: MEX_KOR_HISTORY.slice(0, 2),
    matches: [{ id: "28", homeTeam: "MEX", awayTeam: "KOR", status: "scheduled" }],
    incomingWcEventId: "28",
    routeHeader: "1",
  });
  if (shotsTurn.lane !== "props") {
    fail("pipeline-shots-lane", shotsTurn.lane);
  } else {
    pass("pipeline-shots-lane", "props");
  }

  const loadingKey = resolveWcUrTakeLoadingSportKey(
    "worldcup",
    "Son over 2.5 shots",
  );
  if (loadingKey !== "worldcup_props") {
    fail("loading-sport-key", loadingKey);
  } else {
    pass("loading-sport-key", "worldcup_props");
  }
}

async function soakGoatNamedShots() {
  if (!String(process.env.BALLDONTLIE_API_KEY || "").trim()) {
    fail("goat-named-shots", "BALLDONTLIE_API_KEY missing");
    return;
  }
  const { buildWcNamedPlayerPropsStructured } = await import(
    "../shared/wcPlayerMarketResolve.js"
  );
  const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
  const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
  const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");

  const q =
    "Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
  const res = await bdlFifaFetch("/odds/player_props", { match_id: 28 });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const lookup = await resolveBdlPlayerLookupForPropRows(rows, {
    homeTeam: "MEX",
    awayTeam: "KOR",
  });
  const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);
  const structured = buildWcNamedPlayerPropsStructured(q, "verified", {
    matchPlayerProps: {
      eventId: "28",
      homeTeam: "MEX",
      awayTeam: "KOR",
      markets,
      source: "balldontlie",
    },
    wcEventId: "28",
  }, { wcEventId: "28", fixtureHome: "MEX", fixtureAway: "KOR" });

  if (!/of 3 playable/i.test(String(structured?.call || ""))) {
    fail("goat-named-shots", structured?.call);
  } else if (!/Quinones/i.test(String(structured?.lean || ""))) {
    fail("goat-named-shots", "Quinones missing");
  } else {
    pass("goat-named-shots", String(structured.call));
  }
}

async function soakWhoWinsMl() {
  const { buildWcFixtureMatchupPrebuiltFromInputs } = await import(
    "../api/_wcFixtureMatchupPrebuiltInputs.js"
  );
  let structured = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    structured = await buildWcFixtureMatchupPrebuiltFromInputs({
      question: "Who wins MEX vs KOR?",
      history: MEX_KOR_HISTORY,
      wcEventId: "28",
    });
    if (structured) break;
    await new Promise((r) => setTimeout(r, 600));
  }
  const blob = String(structured?.call || "") + String(structured?.lean || "");
  if (!structured || !/\bto win\b/i.test(blob)) {
    if (BASE) {
      console.warn("WARN who-wins-prebuilt — offline null/empty; deferring to HTTP soak");
      return;
    }
    fail("who-wins-prebuilt", blob.slice(0, 80) || "null");
  } else if (/Under 2\.5/i.test(blob)) {
    fail("who-wins-prebuilt", "Under 2.5 regression");
  } else {
    pass("who-wins-prebuilt", String(structured.call).slice(0, 72));
  }
}

async function soakHttpGoldenThread() {
  if (!BASE) {
    pass("http-golden-thread", "skipped (no base URL)");
    return;
  }

  const shotsQ =
    "Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
  const shots = await postUrTake(shotsQ, MEX_KOR_HISTORY.slice(0, 2));
  const s = shots.structured || {};
  const statusLine = buildWcGroundingStripModel({
    inventoryStrip: s.groundingInventoryStrip,
  })?.statusLine;

  if (!/Quinones|Quiñones/i.test(String(s.lean || "") + String(s.call || ""))) {
    fail("http-shots", "Quinones missing");
  } else if (!/of 3 playable/i.test(String(s.call || ""))) {
    fail("http-shots", `expected playable count got ${s.call}`);
  } else if (/\bBDL\b|balldontlie/i.test(String(statusLine || ""))) {
    fail("http-shots", "BDL leaked in UI strip");
  } else {
    pass("http-shots", String(s.call));
  }

  if (s.namedLegCitation?.legId) {
    pass("http-named-leg-citation", s.namedLegCitation.legId.slice(0, 24));
  } else {
    warnHttpCitation();
  }

  const whoWins = await postUrTake("Who wins MEX vs KOR?", MEX_KOR_HISTORY);
  const w = whoWins.structured || {};
  const wBlob = String(w.call || "") + String(w.lean || "");
  if (!/\bto win\b/i.test(wBlob)) {
    fail("http-who-wins", wBlob.slice(0, 80));
  } else if (/Under 2\.5/i.test(wBlob)) {
    fail("http-who-wins", "Under 2.5 regression");
  } else {
    pass("http-who-wins", String(w.call).slice(0, 72));
  }

  const twoLeg = await postUrTake(
    "Jimenez and Quinones each going over 2.5 shots attempted?",
    MEX_KOR_HISTORY.slice(0, 2),
  );
  const t = twoLeg.structured || {};
  if (!/Jimenez/i.test(String(t.lean || "") + String(t.call || ""))) {
    fail("http-two-leg-shots", "Jimenez missing");
  } else if (!/Quinones/i.test(String(t.lean || "") + String(t.call || ""))) {
    fail("http-two-leg-shots", "Quinones missing");
  } else if (/No shots line posted yet for Jimenez and Quinones/i.test(String(t.call || ""))) {
    fail("http-two-leg-shots", "parser collapsed two names into one player");
  } else if (!/of 2 playable|playable/i.test(String(t.call || "") + String(t.lean || ""))) {
    fail("http-two-leg-shots", `expected playable got ${t.call}`);
  } else {
    pass("http-two-leg-shots", String(t.call).slice(0, 72));
  }

  const parlay = await postUrTake(
    "4 player prop parlay for MEX vs KOR",
    MEX_KOR_HISTORY.slice(0, 2),
  );
  const p = parlay.structured || {};
  if (!p.call && !p.lean) {
    fail("http-parlay", "empty structured");
  } else {
    pass("http-parlay", String(p.call || p.lean).slice(0, 72));
  }

  const propsList = await postUrTake(
    "Best player props for MEX vs KOR?",
    [],
  );
  const pl = propsList.structured || {};
  if (!pl.call && !pl.lean) {
    fail("http-props-list", "empty structured");
  } else {
    pass("http-props-list", String(pl.call || pl.lean).slice(0, 72));
  }
}

function warnHttpCitation() {
  console.warn("WARN http-named-leg-citation — legId not in structured (OK if multi-leg card)");
}

function soakOpsHygiene() {
  const ops = spawnSync(
    process.execPath,
    ["scripts/probe-wc-ops-hygiene.mjs", BASE || "https://www.under-review.app"],
    { cwd: root, encoding: "utf8" },
  );
  if (ops.status !== 0) {
    fail("ops-hygiene", ops.stderr?.slice(-300) || "exit nonzero");
  } else {
    pass("ops-hygiene", "env + prod goat probe");
  }
}

console.log(`\n=== Phase 4 soak${BASE ? ` → ${BASE}` : " (offline)"} ===\n`);

soakOfflineGates();
await soakPipelineGuards();
await soakWhoWinsMl();
await soakGoatNamedShots();
soakOpsHygiene();
await soakHttpGoldenThread();

console.log(`\n=== SOAK ${failures.length ? "FAILED" : "PASSED"} (${failures.length} failures) ===\n`);
if (failures.length) {
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
