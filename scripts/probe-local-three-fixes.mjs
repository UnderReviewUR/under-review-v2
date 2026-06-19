/**
 * Local smoke — three UX fixes (parser, who-wins ML, no BDL label).
 * Usage: node scripts/probe-local-three-fixes.mjs [baseUrl]
 * Default base: http://localhost:5173 (Vite + API proxy)
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWcGroundingStripModel } from "../shared/wcGroundingCardUi.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.production.local") });

const BASE = process.argv[2] || "http://localhost:5173";

const korMexHistory = [
  {
    role: "user",
    content: "MEX vs KOR moneyline",
  },
  {
    role: "assistant",
    content: "Lean Mexico +100",
    structured: {
      callType: "matchup",
      call: "Lean Mexico +100",
      lean: "Lean Mexico +100",
      fixtureHome: "MEX",
      fixtureAway: "KOR",
      wcEventId: "28",
    },
    wcEventId: "28",
    wcMatchTeams: { home: "MEX", away: "KOR" },
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

async function post(question, history = []) {
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
    }),
  });
  const p = await res.json();
  return p;
}

console.log(`\nLocal fixes probe → ${BASE}\n`);

const shotsQ =
  "Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
const shots = await post(shotsQ, korMexHistory.slice(0, 2));
const s = shots.structured || {};
const shotsFreshness = s.groundingInventoryStrip?.freshnessLabel || null;
const shotsStatusLine = buildWcGroundingStripModel({
  inventoryStrip: s.groundingInventoryStrip,
})?.statusLine;
console.log("1) Named shots (exact screenshot wording)");
console.log({
  call: s.call,
  leanPreview: String(s.lean || "").slice(0, 200),
  hasQuinones: /Quinones|Quiñones/i.test(String(s.lean || "") + String(s.call || "")),
  countPlayable: /(\d+) of (\d+) playable/.exec(String(s.call || ""))?.[0] || s.call,
  freshnessLabel: shotsFreshness,
  statusLine: shotsStatusLine,
  bdlLeaked: /\bBDL\b|balldontlie/i.test(String(shotsStatusLine || "")),
});

const whoWins = await post("Who wins MEX vs KOR?", korMexHistory);
const w = whoWins.structured || {};
console.log("\n2) Who wins follow-up");
console.log({
  call: w.call,
  lean: w.lean,
  answersWinner: /\bto win\b/i.test(String(w.call || "") + String(w.lean || "")),
  wronglyUnder25: /Under 2\.5/i.test(String(w.call || "")),
});

console.log("\nOpen in browser: " + BASE + "/worldcup");
console.log("Thread: MEX vs KOR moneyline → shots question → Who wins MEX vs KOR?\n");

const errors = [];
if (!/Quinones|Quiñones/i.test(String(s.lean || "") + String(s.call || ""))) {
  errors.push("shots: Quinones missing");
}
if (!/of 3 playable/i.test(String(s.call || ""))) {
  errors.push(`shots: expected N of 3 playable got ${s.call}`);
}
if (/\bBDL\b|balldontlie/i.test(String(shotsStatusLine || ""))) {
  errors.push("shots: BDL leaked in UI status strip");
}
if (!/\bto win\b/i.test(String(w.call || "") + String(w.lean || ""))) {
  errors.push(`who-wins: expected ML winner got ${w.call || w.lean}`);
}
if (/Under 2\.5/i.test(String(w.call || ""))) {
  errors.push("who-wins: wrongly Under 2.5");
}
if (errors.length) {
  console.error("\nASSERTION FAILURES:");
  for (const e of errors) console.error("  •", e);
  process.exit(1);
}
console.log("\nAll local assertions passed.");
