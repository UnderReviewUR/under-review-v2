import dotenv from "dotenv";
dotenv.config();

import { getEnv } from "./api/_env.js";

const BDL_KEY = getEnv("BALLDONTLIE_API_KEY");

// Single board call. Then inspect what landed in board.playerStats for SAS.
const nbaMod = await import("./api/nba.js");
const board = await nbaMod.buildNbaUrTakeBoard("Spurs vs Trail Blazers");

const allPlayerStats = board.playerStats || [];
const sasRowsInBundle = allPlayerStats.filter((p) => String(p.team || "").toUpperCase() === "SAS");
const porRowsInBundle = allPlayerStats.filter((p) => String(p.team || "").toUpperCase() === "POR");

console.log("=========================================");
console.log("board.playerStats total rows:", allPlayerStats.length);
console.log("SAS rows in board.playerStats:", sasRowsInBundle.length);
console.log("POR rows in board.playerStats:", porRowsInBundle.length);
console.log("");
console.log("===== Every SAS row that survived to board.playerStats =====");
sasRowsInBundle.forEach((p, i) =>
  console.log(`  [${i}]`, JSON.stringify({
    name: p.name,
    team: p.team,
    pts: p.pts,
    games_played: p.games_played,
    source: p.source,
    tonightGame: p.tonightGame || null,
    playerId: p.playerId,
  })),
);
console.log("");
console.log("===== Every POR row that survived to board.playerStats =====");
porRowsInBundle.forEach((p, i) =>
  console.log(`  [${i}]`, JSON.stringify({
    name: p.name,
    team: p.team,
    pts: p.pts,
    games_played: p.games_played,
    source: p.source,
    tonightGame: p.tonightGame || null,
    playerId: p.playerId,
  })),
);
console.log("");
console.log("===== Wemby + Castle + Henderson + Clingan presence check =====");
const targets = [
  ["Victor Wembanyama", 56677822],
  ["Stephon Castle", 1028025261],
  ["Dylan Harper", 1057262518],
  ["Carter Bryant", 1057271360],
  ["Scoot Henderson", 56677747],
  ["Donovan Clingan", 1028025344],
];
for (const [name, id] of targets) {
  const inAll = allPlayerStats.find((p) => p.playerId === id);
  console.log(
    "  ",
    JSON.stringify({
      name,
      playerId: id,
      inBoardPlayerStats: !!inAll,
      ...(inAll ? { row: { name: inAll.name, team: inAll.team, pts: inAll.pts, source: inAll.source } } : {}),
    }),
  );
}

// Direct BDL look — does the active endpoint still see them right now?
async function bdlActive(teamId) {
  const url = `https://api.balldontlie.io/v1/players/active?team_ids[]=${teamId}&per_page=100`;
  const res = await fetch(url, { headers: { Authorization: BDL_KEY, Accept: "application/json" } });
  if (!res.ok) return { ok: false, status: res.status, data: [] };
  const j = await res.json();
  return { ok: true, status: res.status, data: j?.data || [] };
}
console.log("");
console.log("===== Live BDL active for SAS (team_id=27) and POR (team_id=25) right now =====");
const sasActive = await bdlActive(27);
const porActive = await bdlActive(25);
console.log("SAS active HTTP", sasActive.status, "count", sasActive.data.length);
sasActive.data.forEach((p) => console.log("  ", p.id, p.first_name, p.last_name, "team=" + p.team?.abbreviation));
console.log("POR active HTTP", porActive.status, "count", porActive.data.length);
porActive.data.forEach((p) => console.log("  ", p.id, p.first_name, p.last_name, "team=" + p.team?.abbreviation));
