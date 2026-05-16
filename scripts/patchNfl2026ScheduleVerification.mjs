import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "..", "src", "data", "nfl2026Schedule.js");
const txt = fs.readFileSync(p, "utf8");
const marker = "export const NFL_2026_SCHEDULE = Object.freeze(";
const i = txt.indexOf(marker);
if (i === -1) throw new Error("marker not found");
const j = txt.indexOf("[", i);
let depth = 0;
let k = j;
for (; k < txt.length; k++) {
  const c = txt[k];
  if (c === "[") depth++;
  else if (c === "]") {
    depth--;
    if (depth === 0) {
      k++;
      break;
    }
  }
}
const json = txt.slice(j, k);
const games = JSON.parse(json);

for (const g of games) {
  if (g.id === "wk1-den-kc") g.network = "ESPN/ABC";
}

const header = `/**
 * NFL 2026 regular-season schedule (static).
 *
 * WEB SEARCH / CROSS-CHECK (2026-05-15; re-run after any league change):
 * - Queries used: "NFL 2026 schedule Week 1", "NFL schedule released May 14 2026", Netflix Week 1 49ers Rams Melbourne.
 * - Secondary sources (not a live authenticated NFL.com scrape): NFL Football Operations 2026 schedule page; NFL.com
 *   "complete slate of Week 1 games" article; ESPN schedule-release coverage; Yahoo Sports Week 1 list; Newsweek /
 *   NBC Sports on Netflix carrying the Australia game.
 *
 * CONFIDENCE:
 * - Week 1 (16 games): HIGH — matchups, dates, broadcast windows, and networks matched those sources. Updated here:
 *   MNF Week 1 network label ESPN/ABC (file previously had ESPN only).
 * - Weeks 2–18: NOT re-verified in this web pass — each game preceded by // UNVERIFIED — needs manual check.
 *
 * 2026 OPENER vs "THURSDAY NIGHT" WEEK 1:
 * - First scheduled kickoff of the season: Wed 2026-09-09, NE @ SEA, 8:20 PM ET, NBC (Wednesday opener per NFL).
 * - First Thursday game: Thu 2026-09-10, SF @ LAR (Melbourne), 8:35 PM ET, Netflix in the US — not the league opener.
 * - Monday Night Football Week 1: Mon 2026-09-14, DEN @ KC, 8:15 PM ET, ESPN/ABC.
 *
 * NETFLIX WEEK 1: Yes — multiple outlets report Netflix streams the Week 1 SF–LAR Melbourne game (not an error).
 */

`;

let out = header + "export const NFL_2026_SCHEDULE = Object.freeze([\n";
for (const g of games) {
  if (g.week >= 2) {
    out += "  // UNVERIFIED — needs manual check\n";
  }
  const lines = JSON.stringify(g, null, 2).split("\n");
  for (const line of lines) {
    out += "  " + line + "\n";
  }
  out += ",\n";
}
out += "]);\n";
fs.writeFileSync(p, out, "utf8");
console.log("Wrote", p, "games", games.length);
