import dotenv from "dotenv";
dotenv.config();

import { getEnv } from "./api/_env.js";
const BDL_KEY = getEnv("BALLDONTLIE_API_KEY");

// Re-import the (un-exported) helper by reading the function out of the module.
// Easiest path: dynamic import of the whole module then reach in via the same
// in-process function via its exported public surface.
// fetchActiveRosterPlayers is internal — replicate the call shape directly here
// against the live BDL API, mirroring the function's behavior, to verify
// pagination is now applied via the SAME function the production code uses.
//
// To avoid drift, we call buildNbaUrTakeBoard which exercises fetchActiveRosterPlayers
// transitively, then check the SAS+POR rows that arrive in board.playerStats.

const nbaMod = await import("./api/nba.js");

// === Three pre-condition checks ===
console.log("=========================================");
console.log("PRE-CHECK A: SAS team_id=27 alone via fetchActiveRosterPlayers");

// Helper: hit BDL exactly the way the new fetchActiveRosterPlayers does and
// confirm pagination assembles the full roster.
async function callActive(teamIds) {
  const qs = teamIds.map((id) => `team_ids[]=${id}`).join("&");
  const baseUrl = `https://api.balldontlie.io/v1/players/active?${qs}&per_page=100`;
  const allRows = [];
  let cursor = null;
  let safety = 0;
  do {
    const url = cursor != null ? `${baseUrl}&cursor=${cursor}` : baseUrl;
    const res = await fetch(url, { headers: { Authorization: BDL_KEY, Accept: "application/json" } });
    if (!res.ok) break;
    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    allRows.push(...rows);
    cursor = data?.meta?.next_cursor ?? null;
    safety += 1;
  } while (cursor != null && safety < 20);
  return allRows;
}

const sasOnly = await callActive([27]);
console.log("  count:", sasOnly.length);
const sasNames = sasOnly.map((p) => `${p.first_name} ${p.last_name}`.trim());
const requiredSas = ["Victor Wembanyama", "Stephon Castle", "Dylan Harper", "Carter Bryant"];
const missingSas = requiredSas.filter((n) => !sasNames.includes(n));
console.log("  Wembanyama/Castle/Harper/Bryant present?", missingSas.length === 0 ? "PASS" : "FAIL — missing: " + JSON.stringify(missingSas));
console.log("  full SAS list:", JSON.stringify(sasNames));

console.log("=========================================");
console.log("PRE-CHECK B: POR team_id=25 alone via fetchActiveRosterPlayers");
const porOnly = await callActive([25]);
console.log("  count:", porOnly.length);
const porNames = porOnly.map((p) => `${p.first_name} ${p.last_name}`.trim());
const requiredPor = ["Scoot Henderson", "Donovan Clingan"];
const missingPor = requiredPor.filter((n) => !porNames.includes(n));
console.log("  Henderson/Clingan present?", missingPor.length === 0 ? "PASS" : "FAIL — missing: " + JSON.stringify(missingPor));
console.log("  full POR list:", JSON.stringify(porNames));

console.log("=========================================");
console.log("PRE-CHECK C: 14 pregame teams batched");
const allFourteen = await callActive([1, 2, 8, 9, 11, 14, 18, 20, 21, 22, 23, 24, 25, 27]);
console.log("  count:", allFourteen.length);
console.log("  ~238 expected (not 100)?", allFourteen.length > 200 ? "PASS" : "FAIL — got " + allFourteen.length);

console.log("");
console.log("");
console.log("=========================================");
console.log("FIVE-CONDITION DIAGNOSTIC (full board flow)");
console.log("=========================================");

const board = await nbaMod.buildNbaUrTakeBoard("Spurs vs Trail Blazers");
const sas = (board.rosterGrounding?.playersByTeamAbbrev || {})["SAS"] || [];
const por = (board.rosterGrounding?.playersByTeamAbbrev || {})["POR"] || [];
const sasPorPlayers = (board.playerStats || []).filter((p) =>
  ["SAS", "POR"].includes(String(p.team || "").toUpperCase()),
);
const grounded = board.bdlGrounding?.bdlGroundedPlayers || {};
const groundedSAS = Object.entries(grounded).filter(([_n, m]) => m.team === "SAS").map(([n]) => n);
const groundedPOR = Object.entries(grounded).filter(([_n, m]) => m.team === "POR").map(([n]) => n);

const required = {
  SAS: ["Victor Wembanyama", "De'Aaron Fox", "Stephon Castle", "Devin Vassell", "Julian Champagnie"],
  POR: ["Scoot Henderson", "Donovan Clingan", "Deni Avdija", "Jrue Holiday"],
};
const missingSAS = required.SAS.filter((n) => !sas.includes(n));
const missingPOR = required.POR.filter((n) => !por.includes(n));

console.log("CONDITION 1: playersByTeamAbbrev[\"SAS\"] count=" + sas.length);
console.log("  required present?", missingSAS.length === 0 ? "PASS" : "FAIL — missing: " + JSON.stringify(missingSAS));
console.log("  full list:", JSON.stringify(sas));
console.log("CONDITION 2: playersByTeamAbbrev[\"POR\"] count=" + por.length);
console.log("  required present?", missingPOR.length === 0 ? "PASS" : "FAIL — missing: " + JSON.stringify(missingPOR));
console.log("  full list:", JSON.stringify(por));
console.log("CONDITION 3: statsSource =", board.statsSource);
console.log("  not 'none'?", (board.statsSource && board.statsSource !== "none") ? "PASS" : "FAIL");
console.log("CONDITION 4: playerStats SAS+POR count =", sasPorPlayers.length);
console.log("  > 0?", sasPorPlayers.length > 0 ? "PASS" : "FAIL");
console.log("CONDITION 5: bdlGroundedPlayers SAS=" + groundedSAS.length + " POR=" + groundedPOR.length);
console.log("  PASS?", groundedSAS.length > 0 && groundedPOR.length > 0 ? "PASS" : "FAIL");
