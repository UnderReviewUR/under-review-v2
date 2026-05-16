import { NFL_2026_SCHEDULE } from "../src/data/nfl2026Schedule.js";
import { NFL_2026_TEAMS } from "../src/data/nfl2026Teams.js";

const lines = [];
const log = (s) => lines.push(String(s));

const teamSet = new Set(NFL_2026_TEAMS.map((t) => t.abbr));
const games = [...NFL_2026_SCHEDULE];

log("=== 1. GAME COUNT ===");
log("Total games in array: " + games.length);

const perWeek = new Map();
for (let w = 1; w <= 18; w++) perWeek.set(w, 0);
for (const g of games) {
  const w = g.week;
  perWeek.set(w, (perWeek.get(w) || 0) + 1);
}

log("Games per week (weeks 1-18):");
const badWeeks = [];
for (let w = 1; w <= 18; w++) {
  const c = perWeek.get(w) ?? 0;
  log("  Week " + w + ": " + c + (c === 16 ? "" : "  *** NOT 16 ***"));
  if (c !== 16) badWeeks.push({ week: w, count: c });
}
if (badWeeks.length === 0) {
  log("Weeks with != 16 games: (none)");
} else {
  log("Weeks with != 16 games:");
  for (const b of badWeeks) log("  Week " + b.week + ": " + b.count + " games");
}

log("");
log("=== 2. TEAM APPEARANCE CHECK ===");
const appear = new Map();
for (const t of teamSet) appear.set(t, 0);

const schedAbbrs = new Set();
for (const g of games) {
  schedAbbrs.add(g.homeTeam);
  schedAbbrs.add(g.awayTeam);
  appear.set(g.homeTeam, (appear.get(g.homeTeam) || 0) + 1);
  appear.set(g.awayTeam, (appear.get(g.awayTeam) || 0) + 1);
}

log("Schedule abbreviations not in nfl2026Teams.js:");
const notInTeams = [...schedAbbrs].filter((a) => !teamSet.has(a)).sort();
if (notInTeams.length === 0) log("  (none)");
else for (const a of notInTeams) log("  " + a);

const userExpectedGames = 16;
log("");
log(
  "Games per team (home + away). NOTE: 272 games => 544 slots / 32 teams = 17 per team (standard 17-game season)."
);
log("Checking against YOUR stated expectation of exactly " + userExpectedGames + " games per team:");
const wrongCount = [];
for (const t of [...teamSet].sort()) {
  const n = appear.get(t) ?? 0;
  if (n !== userExpectedGames) wrongCount.push({ t, n });
}
if (wrongCount.length === 0) {
  log("  All 32 teams have exactly " + userExpectedGames + " appearances.");
} else {
  log("  Teams with != " + userExpectedGames + " games (" + wrongCount.length + " teams):");
  for (const { t, n } of wrongCount.sort((a, b) => a.t.localeCompare(b.t))) {
    log("    " + t + ": " + n + " games");
  }
}

const expectedFromMath = (games.length * 2) / teamSet.size;
log("");
log("Actual uniform games-per-team (if balanced): " + expectedFromMath);
const counts = [...appear.values()];
const allSame = counts.every((c) => c === counts[0]);
log("All teams same count: " + allSame + (allSame ? " (" + counts[0] + ")" : ""));

const missingFromSchedule = [...teamSet].filter((t) => (appear.get(t) ?? 0) === 0).sort();
if (missingFromSchedule.length) {
  log("Teams in nfl2026Teams.js with ZERO schedule games:");
  for (const t of missingFromSchedule) log("  " + t);
}

log("");
log("=== 3. DUPLICATE GAME IDs ===");
const idCount = new Map();
for (const g of games) {
  idCount.set(g.id, (idCount.get(g.id) || 0) + 1);
}
const dups = [...idCount.entries()].filter(([, c]) => c > 1).sort((a, b) => a[0].localeCompare(b[0]));
if (dups.length === 0) log("(none — all ids unique)");
else for (const [id, c] of dups) log("  " + id + ": appears " + c + " times");

log("");
log("=== 4. BYE WEEK CHECK ===");
log("For each team: count weeks 1-18 with no game (expect exactly 1 bye in 18-week / 17-game season).");
const byeWrong = [];
for (const t of [...teamSet].sort()) {
  const playedWeeks = new Set();
  for (const g of games) {
    if (g.homeTeam === t || g.awayTeam === t) playedWeeks.add(g.week);
  }
  let idleWeeks = 0;
  for (let w = 1; w <= 18; w++) {
    if (!playedWeeks.has(w)) idleWeeks++;
  }
  if (idleWeeks !== 1) byeWrong.push({ t, idleWeeks, gamesPlayed: playedWeeks.size });
}
if (byeWrong.length === 0) {
  log("All teams: exactly 1 idle week in weeks 1-18 (one bye).");
} else {
  log("Teams with 0 or 2+ idle weeks:");
  for (const x of byeWrong) {
    log(
      "  " +
        x.t +
        ": idle weeks in 1-18 = " +
        x.idleWeeks +
        " (played " +
        x.gamesPlayed +
        " distinct weeks)"
    );
  }
}

log("");
log("=== 5. NETWORK DISTRIBUTION ===");
const ALLOWED = new Set([
  "CBS",
  "FOX",
  "NBC",
  "ESPN",
  "ESPN/ABC",
  "Prime Video",
  "NFL Network",
  "Netflix",
]);
const netCount = new Map();
for (const g of games) {
  const n = g.network;
  netCount.set(n, (netCount.get(n) || 0) + 1);
}
for (const [n, c] of [...netCount.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  log("  " + n + ": " + c);
}
log("Flagged (unexpected vs typical ship list: CBS, FOX, NBC, ESPN, ESPN/ABC, Prime Video, NFL Network, Netflix):");
const flagged = [...netCount.keys()].filter((n) => !ALLOWED.has(n));
if (flagged.length === 0) log("  (none)");
else {
  for (const n of flagged.sort()) {
    log("  *** " + n + " *** — " + netCount.get(n) + " games");
  }
}

log("");
log("=== 6. SAMPLE SPOT CHECK (full objects as JSON) ===");
const w1 = games.filter((g) => g.week === 1);
const w9 = games.filter((g) => g.week === 9);
const last3 = games.slice(-3);
log("-- Week 1 (" + w1.length + " games) --");
log(JSON.stringify(w1, null, 2));
log("-- Week 9 (" + w9.length + " games) --");
log(JSON.stringify(w9, null, 2));
log("-- Last 3 games in array --");
log(JSON.stringify(last3, null, 2));
for (const g of last3) {
  if (g.week !== 18) log("WARNING: game id " + g.id + " has week " + g.week + " (expected 18)");
}

console.log(lines.join("\n"));
