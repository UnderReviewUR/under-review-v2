#!/usr/bin/env node
/**
 * Phase 2 soak — GOAT odds + props + who-wins ML (KOR/MEX thread).
 * Loads .env.production.local when present for BDL key.
 *
 * Usage: node scripts/probe-phase2-soak.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.production.local") });

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

/** @type {string[]} */
const failures = [];

function pass(label, detail = "") {
  console.log(`OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail) {
  failures.push(`${label}: ${detail}`);
  console.error(`FAIL ${label} — ${detail}`);
}

async function soakWhoWinsMl() {
  const { buildWcFixtureMatchupPrebuiltFromInputs } = await import(
    "../api/_wcFixtureMatchupPrebuiltInputs.js"
  );
  const { resolveWcUrTakeV2Turn } = await import("../shared/wcUrTakePipeline.js");

  const turn = resolveWcUrTakeV2Turn({
    question: "Who wins MEX vs KOR?",
    history: MEX_KOR_HISTORY,
    matches: [{ id: "28", homeTeam: "MEX", awayTeam: "KOR", status: "scheduled" }],
    incomingWcEventId: "28",
    routeHeader: "1",
  });
  if (turn.lane !== "matchup_ml") {
    fail("pipeline-lane", `expected matchup_ml got ${turn.lane}`);
    return;
  }
  pass("pipeline-lane", "matchup_ml");

  const structured = await buildWcFixtureMatchupPrebuiltFromInputs({
    question: "Who wins MEX vs KOR?",
    history: MEX_KOR_HISTORY,
    wcEventId: "28",
  });
  if (!structured) {
    fail("who-wins-ml", "prebuilt null after GOAT odds resolve");
    return;
  }
  const call = String(structured?.call || "");
  const lean = String(structured?.lean || "");
  if (!/\bto win\b/i.test(call + lean)) {
    fail("who-wins-ml", `expected ML winner got call=${call.slice(0, 80)}`);
    return;
  }
  if (/Under 2\.5/i.test(call + lean)) {
    fail("who-wins-ml", "got Under 2.5 totals lean");
    return;
  }
  pass("who-wins-ml", call.slice(0, 72));
}

async function soakNamedShots() {
  if (!String(process.env.BALLDONTLIE_API_KEY || "").trim()) {
    fail("named-shots", "BALLDONTLIE_API_KEY missing — skip GOAT props soak");
    return;
  }

  const q =
    "Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
  const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
  const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
  const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");
  const { buildWcNamedPlayerPropsStructured } = await import(
    "../shared/wcPlayerMarketResolve.js"
  );

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
  }, {
    wcEventId: "28",
    fixtureHome: "MEX",
    fixtureAway: "KOR",
  });

  const call = String(structured?.call || "");
  if (!/of 3 playable/i.test(call)) {
    fail("named-shots", `expected playable count got ${call}`);
    return;
  }
  if (!/Quinones/i.test(String(structured?.lean || ""))) {
    fail("named-shots", "Quinones missing from lean");
    return;
  }
  pass("named-shots", call);
}

function soakOfflineGate() {
  const contract = spawnSync(process.execPath, ["scripts/wc-props-routing-contract.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  if (contract.status !== 0) {
    fail("routing-contract", contract.stderr || contract.stdout || "exit nonzero");
    return;
  }
  pass("routing-contract", "49/49");
}

console.log("\n=== Phase 2 soak ===\n");
soakOfflineGate();
await soakWhoWinsMl();
await soakNamedShots();

console.log(`\n=== SOAK ${failures.length ? "FAILED" : "PASSED"} (${failures.length} failures) ===\n`);
if (failures.length) {
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
