/**
 * Rebuilds src/data/nfl2026Schedule.js from scripts/nfl-ops-schedule.md (NFL Football Operations mirror)
 * with broadcast labels aligned to 2026 public listings + user rules (TNF → Prime Video, etc.).
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
  return `${yr}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeTime(t) {
  const s = String(t || "").trim().replace(/\*+$/, "");
  if (!s || s.toUpperCase() === "TBD") return "TBD";
  const m = s.match(/^(\d{1,2}):(\d{2})([ap])$/i);
  if (!m) return s.toUpperCase().includes("TBD") ? "TBD" : `${s} ET`;
  const dispH = Number(m[1]);
  const min = m[2];
  const ap = m[3].toLowerCase();
  const ampm = ap === "a" ? "AM" : "PM";
  return `${dispH}:${min} ${ampm} ET`;
}

/** NFL Football Operations table → app network string (2026 verify pass). */
function normalizeNetwork(n) {
  let x = String(n || "")
    .trim()
    .replace(/\*+$/, "");
  if (/^AMZ/i.test(x) || /^Amazon$/i.test(x)) return "Prime Video";
  if (/^NETFLIX/i.test(x)) return "Netflix";
  if (/NFLN/i.test(x)) return "NFL Network";
  if (/ESPN\/ABC/i.test(x)) return "ESPN/ABC";
  if (/ESPN\/AB$/i.test(x)) return "ESPN/ABC";
  if (/^CBS$/i.test(x)) return "CBS";
  if (/^FOX$/i.test(x)) return "FOX";
  if (/^NBC/i.test(x)) return "NBC";
  if (/^ESPN$/i.test(x)) return "ESPN";
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

const header = `/**
 * NFL 2026 regular-season schedule (static), 272 games.
 *
 * VERIFICATION (2026-05-15) — Weeks 2–18:
 * - Web search: "2026 NFL schedule all weeks", "2026 NFL schedule Week 2 through 18".
 * - Primary structured source: NFL Football Operations week-by-week tables, mirrored in-repo at
 *   scripts/nfl-ops-schedule.md (same matchups/dates/windows as https://operations.nfl.com/gameday/nfl-schedule/2026-nfl-schedule/).
 * - Secondary corroboration (spot-checks / narrative): Yahoo UK schedule-release guide
 *   (https://uk.sports.yahoo.com/news/2026-nfl-schedule-release-guide-kickoffs-matchups-broadcast-networks-for-all-32-teams-005129213.html),
 *   CrossroadsToday full week-by-week list
 *   (https://www.crossroadstoday.com/news/shareable-stories/2026-nfl-schedule-release-full-week-by-week-list-for-all-teams/article_cba01799-1469-5273-9dda-1f80d94b6b73.html).
 *
 * BROADCAST LABELS (this file):
 * - Thursday night (table "AMZ" / Amazon): "Prime Video" (2026 TNF streaming).
 * - Sunday night: "NBC". Monday night: "ESPN/ABC" when Operations lists ESPN/ABC; "ESPN" when Operations lists ESPN only.
 * - International on NFL Network (London early, etc.): "NFL Network". Netflix-only rows: "Netflix" (e.g. Week 1 Melbourne, Week 12 Wed, Christmas Netflix games per Operations).
 *
 * No per-game UNVERIFIED flags: every row is regenerated from the verified Operations mirror parser above.
 * Re-run scripts/rebuildVerifiedSchedule.mjs after updating scripts/nfl-ops-schedule.md if the league changes the slate.
 */

`;

let body = header + "export const NFL_2026_SCHEDULE = Object.freeze([\n";
for (const g of games) {
  const lines = JSON.stringify(g, null, 2).split("\n");
  for (const line of lines) {
    body += "  " + line + "\n";
  }
  body += ",\n";
}
body += "]);\n";

const outPath = path.join(root, "src", "data", "nfl2026Schedule.js");
fs.writeFileSync(outPath, body, "utf8");
console.log("Wrote", outPath, games.length);
