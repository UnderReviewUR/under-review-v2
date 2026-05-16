/**
 * One-off generator: reads scripts/nfl-ops-schedule.md (NFL Football Operations export)
 * and writes src/data/nfl2026Schedule.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sept: 9,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const FULL_NAMES = [
  ["Arizona Cardinals", "ARI"],
  ["Atlanta Falcons", "ATL"],
  ["Baltimore Ravens", "BAL"],
  ["Buffalo Bills", "BUF"],
  ["Carolina Panthers", "CAR"],
  ["Chicago Bears", "CHI"],
  ["Cincinnati Bengals", "CIN"],
  ["Cleveland Browns", "CLE"],
  ["Dallas Cowboys", "DAL"],
  ["Denver Broncos", "DEN"],
  ["Detroit Lions", "DET"],
  ["Green Bay Packers", "GB"],
  ["Houston Texans", "HOU"],
  ["Indianapolis Colts", "IND"],
  ["Jacksonville Jaguars", "JAX"],
  ["Kansas City Chiefs", "KC"],
  ["Las Vegas Raiders", "LV"],
  ["Los Angeles Chargers", "LAC"],
  ["Los Angeles Rams", "LAR"],
  ["Miami Dolphins", "MIA"],
  ["Minnesota Vikings", "MIN"],
  ["New England Patriots", "NE"],
  ["New Orleans Saints", "NO"],
  ["New York Giants", "NYG"],
  ["New York Jets", "NYJ"],
  ["Philadelphia Eagles", "PHI"],
  ["Pittsburgh Steelers", "PIT"],
  ["San Francisco 49ers", "SF"],
  ["Seattle Seahawks", "SEA"],
  ["Tampa Bay Buccaneers", "TB"],
  ["Tennessee Titans", "TEN"],
  ["Washington Commanders", "WAS"],
];

function nameToAbbr(s) {
  const t = String(s || "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*\*+\s*$/, "")
    .trim();
  for (const [full, abbr] of FULL_NAMES) {
    if (t === full) return abbr;
  }
  throw new Error(`Unknown team name: "${s}"`);
}

function parseHeadingDate(line) {
  const m = line.match(/^([A-Za-z]+),\s+([A-Za-z]+)\.?\s+(\d+),\s+(\d{4})\s*$/);
  if (!m) return null;
  const monKey = m[2].toLowerCase().replace(/\.$/, "");
  const mo = MONTHS[monKey];
  if (!mo) return null;
  const day = Number(m[3]);
  const yr = Number(m[4]);
  const iso = `${yr}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return iso;
}

function normalizeTime(t) {
  const s = String(t || "").trim().replace(/\*+$/, "");
  if (!s || s.toUpperCase() === "TBD") return "TBD";
  const m = s.match(/^(\d{1,2}):(\d{2})([ap])$/i);
  if (!m) return s.toUpperCase().includes("TBD") ? "TBD" : `${s} ET`;
  let h = Number(m[1]);
  const min = m[2];
  const ap = m[3].toLowerCase();
  if (ap === "p" && h !== 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  const ampm = Number(m[1]) === 12 && ap === "a" ? "PM" : ap === "a" ? "AM" : "PM";
  const dispH = ap === "p" && Number(m[1]) <= 12 ? (Number(m[1]) === 12 ? 12 : Number(m[1])) : ap === "a" ? (Number(m[1]) === 12 ? 12 : Number(m[1])) : Number(m[1]);
  return `${dispH}:${min} ${ampm} ET`;
}

function normalizeNetwork(n) {
  let x = String(n || "")
    .trim()
    .replace(/\*+$/, "");
  if (/^AMZ/i.test(x)) return "Amazon";
  if (/^NETFLIX/i.test(x)) return "Netflix";
  if (/NFLN/i.test(x)) return "NFL Network";
  if (/ESPN\/ABC/i.test(x)) return "ESPN";
  if (/ESPN\/AB$/i.test(x)) return "ESPN";
  if (/^CBS$/i.test(x)) return "CBS";
  if (/^FOX$/i.test(x)) return "FOX";
  if (/^NBC/i.test(x)) return "NBC";
  if (/^ESPN/i.test(x)) return "ESPN";
  if (/Peacock/i.test(x)) return "Peacock";
  return x || "TBD";
}

function parseMd(text) {
  const lines = text.split(/\r?\n/);
  let week = 1;
  let pendingDate = null;
  const games = [];

  for (const raw of lines) {
    const line = raw.trim();
    const wm = line.match(/^WEEK\s+(\d+)/i);
    if (wm) {
      week = Number(wm[1]);
      continue;
    }
    const dIso = parseHeadingDate(line);
    if (dIso) {
      pendingDate = dIso;
      continue;
    }
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 3) continue;
    const mid = cells[0];
    const timeRaw = cells[1];
    const netRaw = cells[2];
    if (mid === "TBD") continue;

    let away;
    let home;
    if (mid.includes(" at ")) {
      const [a, h] = mid.split(" at ").map((s) => s.trim());
      away = a;
      home = h;
    } else if (mid.includes(" vs ")) {
      const [a, h] = mid.split(" vs ").map((s) => s.trim());
      away = a;
      home = h;
    } else {
      continue;
    }

    const awayAbbr = nameToAbbr(away);
    const homeAbbr = nameToAbbr(home);
    const id = `wk${week}-${awayAbbr.toLowerCase()}-${homeAbbr.toLowerCase()}`;
    const date = pendingDate || "2027-01-10";
    games.push({
      id,
      week,
      date,
      timeEt: normalizeTime(timeRaw),
      homeTeam: homeAbbr,
      awayTeam: awayAbbr,
      network: normalizeNetwork(netRaw),
    });
  }

  return games;
}

const mdPath = path.join(__dirname, "nfl-ops-schedule.md");
const text = fs.readFileSync(mdPath, "utf8");
const games = parseMd(text);

if (games.length !== 272) {
  console.error("Expected 272 games, got", games.length);
  process.exit(1);
}

const seen = new Set();
for (const g of games) {
  if (seen.has(g.id)) throw new Error(`Duplicate id ${g.id}`);
  seen.add(g.id);
}

const outPath = path.join(root, "src", "data", "nfl2026Schedule.js");
const body = `// Source: NFL.com schedule released May 14 2026 + ESPN verification
export const NFL_2026_SCHEDULE = Object.freeze(${JSON.stringify(games, null, 2)});
`;
fs.writeFileSync(outPath, body, "utf8");
console.log("Wrote", outPath, games.length, "games");
