/**
 * One-off: parse Wikipedia 2026 NFL draft raw wikitext table → api/data/nfl-draft-order-2026.json
 * Run: node api/scripts/build-nfl-order-2026.mjs <path-to-wiki-raw.txt>
 */
import fs from "node:fs";

const srcPath = process.argv[2];
if (!srcPath) {
  console.error("Usage: node api/scripts/build-nfl-order-2026.mjs <wiki-raw.txt>");
  process.exit(1);
}

const raw = fs.readFileSync(srcPath, "utf8");
const picks = [];

for (const line of raw.split("\n")) {
  if (!line.startsWith("| ")) continue;
  const cells = line.split("|").map((s) => s.trim());
  if (cells.length < 4) continue;
  const rndCell = cells[1];
  const ovCell = cells[2];
  const teamCell = cells[3];
  const round = Number(String(rndCell).replace(/[^\d]/g, ""));
  let overall = Number(String(ovCell).replace(/[^\d]/g, ""));
  if (!Number.isFinite(round) || round < 1 || round > 7) continue;
  if (!Number.isFinite(overall)) continue;
  const m = teamCell.match(/\[([^\]]+)\]\(/);
  const team = m ? m[1].replace(/_/g, " ") : "";
  if (!team) continue;
  let slotNote = null;
  if (rndCell.includes("*")) slotNote = "compensatory";
  if (rndCell.includes("×")) slotNote = "jc2a";
  picks.push({ overall, round, team, slotNote });
}

picks.sort((a, b) => a.overall - b.overall);
const byRound = {};
for (const p of picks) {
  byRound[p.round] ??= [];
  byRound[p.round].push(p);
}
for (const r of Object.keys(byRound).map(Number).sort((a, b) => a - b)) {
  byRound[r].forEach((p, i) => {
    p.pickInRound = i + 1;
  });
}

const outPath = new URL("../data/nfl-draft-order-2026.json", import.meta.url);
fs.mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(picks, null, 0));
console.log("wrote", outPath.pathname || outPath.href, "picks:", picks.length);
