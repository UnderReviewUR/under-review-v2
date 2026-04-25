import dotenv from "dotenv";
dotenv.config();
const mod = await import("./api/nba.js");
const board = await mod.buildNbaUrTakeBoard("Spurs vs Trail Blazers");

const sas = (board.rosterGrounding?.playersByTeamAbbrev || {})["SAS"] || [];
const por = (board.rosterGrounding?.playersByTeamAbbrev || {})["POR"] || [];
const sasPorPlayers = (board.playerStats || []).filter((p) =>
  ["SAS", "POR"].includes(String(p.team || "").toUpperCase()),
);
const sasPorSources = [...new Set(sasPorPlayers.map((p) => p.source))];
const grounded = board.bdlGrounding?.bdlGroundedPlayers || {};
const groundedSAS = Object.entries(grounded)
  .filter(([_n, m]) => m.team === "SAS")
  .map(([n]) => n);
const groundedPOR = Object.entries(grounded)
  .filter(([_n, m]) => m.team === "POR")
  .map(([n]) => n);

const required = {
  SAS: ["Victor Wembanyama", "De'Aaron Fox", "Stephon Castle", "Devin Vassell", "Julian Champagnie"],
  POR: ["Scoot Henderson", "Donovan Clingan", "Deni Avdija", "Jrue Holiday"],
};

const missingSAS = required.SAS.filter((n) => !sas.includes(n));
const missingPOR = required.POR.filter((n) => !por.includes(n));

console.log("=========================================");
console.log("CONDITION 1: playersByTeamAbbrev[\"SAS\"]");
console.log("  count:", sas.length);
console.log("  names:", JSON.stringify(sas));
console.log(
  "  required present?",
  missingSAS.length === 0 ? "PASS" : "FAIL — missing: " + JSON.stringify(missingSAS),
);
console.log("=========================================");
console.log("CONDITION 2: playersByTeamAbbrev[\"POR\"]");
console.log("  count:", por.length);
console.log("  names:", JSON.stringify(por));
console.log(
  "  required present?",
  missingPOR.length === 0 ? "PASS" : "FAIL — missing: " + JSON.stringify(missingPOR),
);
console.log("=========================================");
console.log("CONDITION 3: statsSource for SAS/POR");
console.log("  board.statsSource:", board.statsSource);
console.log("  sources observed on SAS+POR rows:", JSON.stringify(sasPorSources));
console.log(
  "  not 'none'?",
  board.statsSource && board.statsSource !== "none" ? "PASS" : "FAIL — value: " + board.statsSource,
);
console.log("=========================================");
console.log("CONDITION 4: playerStats SAS+POR count");
console.log("  count:", sasPorPlayers.length);
console.log("  > 0?", sasPorPlayers.length > 0 ? "PASS" : "FAIL");
console.log("=========================================");
console.log("CONDITION 5: bdlGroundedPlayers includes SAS and POR players");
console.log("  SAS grounded count:", groundedSAS.length);
console.log("  POR grounded count:", groundedPOR.length);
console.log(
  "  PASS?",
  groundedSAS.length > 0 && groundedPOR.length > 0 ? "PASS" : "FAIL",
);
console.log("=========================================");
console.log("SAS sample (first 5 player rows):");
sasPorPlayers
  .filter((p) => p.team === "SAS")
  .slice(0, 5)
  .forEach((p) => console.log("  ", p.team, "-", p.name, "| pts=" + p.pts, "src=" + p.source));
console.log("POR sample (first 5):");
sasPorPlayers
  .filter((p) => p.team === "POR")
  .slice(0, 5)
  .forEach((p) => console.log("  ", p.team, "-", p.name, "| pts=" + p.pts, "src=" + p.source));
