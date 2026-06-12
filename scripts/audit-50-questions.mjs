/**
 * Live 50-question UnderReview audit — mixed personas, WC + NBA + other sports.
 * Usage:
 *   node scripts/audit-50-questions.mjs
 *   node scripts/audit-50-questions.mjs --base http://127.0.0.1:3001
 *   node scripts/audit-50-questions.mjs --base https://under-review.app --allow-prod
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { detectWcGroupRosterMismatch } from "../shared/wcGroupComposition.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import {
  DEFAULT_LOCAL_API_BASE,
  enforceProdApiGuard,
  resolveScriptApiBase,
} from "./_prodApiGuard.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = enforceProdApiGuard(
  resolveScriptApiBase({ defaultBase: DEFAULT_LOCAL_API_BASE }),
  { scriptName: "audit-50-questions" },
);

const TEAMS_BY_GROUP = Object.fromEntries(
  "ABCDEFGHIJKL".split("").map((g) => [
    g,
    WC_2026_TEAMS.filter((t) => t.group === g).map((t) => t.name),
  ]),
);

/** @type {Array<{ id: string, sport: string, persona: string, question: string, history?: Array<{ role: string, content: string }> }>} */
const TURNS = [
  { id: "wc01", sport: "worldcup", persona: "newcomer", question: "how do i even bet on the world cup? like what's the easiest thing to understand" },
  { id: "wc02", sport: "worldcup", persona: "casual", question: "Who wins Mexico vs South Africa?" },
  { id: "wc03", sport: "worldcup", persona: "casual", question: "What's the best group-stage value bet right now — one pick, direct answer?" },
  { id: "wc04", sport: "worldcup", persona: "smart", question: "Which group is most mispriced for advancement — name #1 and runner-up with numbers." },
  { id: "wc05", sport: "worldcup", persona: "newcomer", question: "what happens if a knockout game is tied after 90 minutes" },
  { id: "wc06", sport: "worldcup", persona: "casual", question: "Golden Boot pick — who and at what price?" },
  { id: "wc07", sport: "worldcup", persona: "smart", question: "USA to advance Group D — fair at -130 or pass?" },
  { id: "wc08", sport: "worldcup", persona: "casual", question: "Brazil vs Haiti — spread or just pick Brazil?" },
  { id: "wc09", sport: "worldcup", persona: "pushback", question: "Colombia +4000 seems insane, you're wrong", history: [
    { role: "user", content: "What's the best group-stage value bet right now?" },
    { role: "assistant", content: "Colombia at +4000 is the best group-stage value — Contender in Group K with knockout upside." },
  ]},
  { id: "wc10", sport: "worldcup", persona: "smart", question: "Group K roster — list all four teams with tags", history: [] },
  { id: "wc11", sport: "worldcup", persona: "casual", question: "England vs Ghana who wins" },
  { id: "wc12", sport: "worldcup", persona: "smart", question: "Paraguay to advance — mispriced or fair?" },
  { id: "wc13", sport: "worldcup", persona: "newcomer", question: "can both teams advance from the same group?" },
  { id: "wc14", sport: "worldcup", persona: "casual", question: "France vs Senegal pick" },
  { id: "wc15", sport: "worldcup", persona: "smart", question: "Argentina vs Algeria — 1X2 lean and alternate market if ML is fair" },
  { id: "wc16", sport: "worldcup", persona: "casual", question: "dark horse to win the whole thing" },
  { id: "wc17", sport: "worldcup", persona: "smart", question: "Portugal win Group K or just advance?" },
  { id: "wc18", sport: "worldcup", persona: "pushback", question: "You said Austria is in Group K — pretty sure that's wrong", history: [
    { role: "user", content: "Best group-stage value bet?" },
    { role: "assistant", content: "Colombia +4000. Group K has Portugal, Austria, Uzbekistan, DR Congo." },
  ]},
  { id: "wc19", sport: "worldcup", persona: "casual", question: "Canada vs Qatar — both teams to score?" },
  { id: "wc20", sport: "worldcup", persona: "smart", question: "Group D advancement path — compare USA vs Paraguay vs Türkiye with sim vs market delta" },
  { id: "wc21", sport: "worldcup", persona: "casual", question: "who scores first in USA Paraguay" },
  { id: "wc22", sport: "worldcup", persona: "newcomer", question: "what's a longshot in world cup betting" },
  { id: "wc23", sport: "worldcup", persona: "smart", question: "Mbappé Golden Boot — value at +600 or pass?" },
  { id: "wc24", sport: "worldcup", persona: "casual", question: "Germany vs Curaçao total goals over or under" },
  { id: "wc25", sport: "worldcup", persona: "smart", question: "Predictions: Winners, Dark horse, Breakout player, Top goalscorer — all four slots" },
  { id: "wc26", sport: "worldcup", persona: "followup", question: "what's the other side?", history: [
    { role: "user", content: "Who wins Mexico vs South Africa?" },
    { role: "assistant", content: "Lean Mexico ML at -240 — Favorite in Group A with home edge at Azteca." },
  ]},
  { id: "wc27", sport: "worldcup", persona: "casual", question: "Is Japan a good bet to reach the quarterfinals?" },
  { id: "wc28", sport: "worldcup", persona: "smart", question: "Netherlands Group G — win group vs escape, which line has edge?" },
  { id: "wc29", sport: "worldcup", persona: "newcomer", question: "do world cup bets include extra time" },
  { id: "wc30", sport: "worldcup", persona: "casual", question: "Spain tournament winner odds — worth a sprinkle?" },

  { id: "nba01", sport: "nba", persona: "casual", question: "who wins tonight in the NBA?" },
  { id: "nba02", sport: "nba", persona: "smart", question: "Thunder vs Pacers series price — fair or mispriced?" },
  { id: "nba03", sport: "nba", persona: "casual", question: "best NBA prop bet tonight" },
  { id: "nba04", sport: "nba", persona: "newcomer", question: "what does spread mean in basketball betting" },
  { id: "nba05", sport: "nba", persona: "smart", question: "Jokic points prop — over or under tonight if he's playing" },
  { id: "nba06", sport: "nba", persona: "pushback", question: "That injury note seems outdated, are you sure?", history: [
    { role: "user", content: "Celtics spread tonight?" },
    { role: "assistant", content: "Lean Celtics -4.5 — Tatum probable, favorable rest edge." },
  ]},
  { id: "nba07", sport: "nba", persona: "casual", question: "NBA Finals MVP pick" },
  { id: "nba08", sport: "nba", persona: "smart", question: "Pace and total for highest-scoring game on the slate" },
  { id: "nba09", sport: "nba", persona: "followup", question: "go deeper on the matchups", history: [
    { role: "user", content: "who wins tonight in the NBA?" },
    { role: "assistant", content: "Slate lean: home favorites in two matchups with rest edge." },
  ]},
  { id: "nba10", sport: "nba", persona: "casual", question: "any good underdog moneylines tonight?" },

  { id: "mlb01", sport: "mlb", persona: "casual", question: "best MLB bet today" },
  { id: "mlb02", sport: "mlb", persona: "smart", question: "Yankees run line or ML tonight?" },

  { id: "ten01", sport: "tennis", persona: "casual", question: "French Open — who wins the men's final if Sinner plays Alcaraz?" },
  { id: "ten02", sport: "tennis", persona: "smart", question: "best value on the ATP slate today" },

  { id: "golf01", sport: "golf", persona: "casual", question: "who wins the US Open?" },
  { id: "golf02", sport: "golf", persona: "smart", question: "top 5 finish value play this week" },

  { id: "f101", sport: "f1", persona: "casual", question: "who wins the next F1 race?" },
  { id: "f102", sport: "f1", persona: "smart", question: "Verstappen pole position — fair price?" },

  { id: "x01", sport: "worldcup", persona: "smart", question: "Switch to NBA — who's the best play on tonight's slate?", history: [
    { role: "user", content: "Golden Boot pick?" },
    { role: "assistant", content: "Lean Mbappé +600 — France's primary scorer with favorable group path." },
  ]},
  { id: "x02", sport: "nba", persona: "newcomer", question: "sorry what's UR Take again and how many free questions do i get" },
];

const CONCURRENCY = 2;
const TURN_LIMIT = Number(process.env.AUDIT_LIMIT || "50");
const ACTIVE_TURNS = TURNS.slice(0, TURN_LIMIT);
const TIMEOUT_MS = 120000;

/**
 * @param {string} text
 */
function analyzeResponse(id, sport, question, text, structured, elapsedMs, httpStatus, error) {
  const blob = String(text || "").trim();
  /** @type {string[]} */
  const flags = [];

  if (error) flags.push(`error:${error}`);
  if (httpStatus >= 400) flags.push(`http_${httpStatus}`);
  if (!blob || blob.length < 40) flags.push("thin_response");
  if (elapsedMs > 45000) flags.push("slow");
  if (/couldn't complete|try again|upstream|503|429/i.test(blob)) flags.push("upstream_fail");

  if (sport === "worldcup") {
    const roster = detectWcGroupRosterMismatch(blob);
    if (roster?.issues?.length) {
      for (const i of roster.issues) {
        flags.push(`HALLUCINATION:roster_${i.team}_in_Group_${i.statedGroup}_actual_${i.actualGroup}`);
      }
    }
    if (/\bthree long\s*shots?\b/i.test(blob) && !/never say three/i.test(blob)) {
      flags.push("HALLUCINATION:three_longshots");
    }
    for (const [letter, names] of Object.entries(TEAMS_BY_GROUP)) {
      const re = new RegExp(`Group ${letter}[^.]{0,120}`, "gi");
      const chunks = blob.match(re) || [];
      for (const chunk of chunks) {
        const mentioned = extractMentionedWcTeams(chunk);
        const canonical = WC_2026_TEAMS.filter((t) => t.group === letter).map((t) =>
          String(t.abbreviation).toUpperCase(),
        );
        for (const abbr of mentioned) {
          if (!canonical.includes(abbr)) {
            flags.push(`HALLUCINATION:team_${abbr}_not_in_Group_${letter}`);
          }
        }
      }
    }
    if (/opta xg|fbref xg/i.test(blob)) flags.push("HALLUCINATION:opta_xg_cited");
    if (/pass at -?\d/i.test(blob) && !/(alternate|both teams|over|under|btts|advance|group)/i.test(blob)) {
      flags.push("inefficiency:pass_only_no_alt");
    }
    if (/\+\d{3,}/.test(blob) && !/(golden boot|outright|fanduel|draftkings|bdl|market|sim)/i.test(blob)) {
      flags.push("inefficiency:uncited_odds");
    }
  }

  if (/as an ai|language model|i cannot browse/i.test(blob)) flags.push("inefficiency:ai_disclaimer");
  if (blob.split(/\s+/).length > 350) flags.push("inefficiency:verbose");

  return {
    id,
    sport,
    question: question.slice(0, 120),
    elapsedMs,
    httpStatus,
    headline: blob.slice(0, 220).replace(/\s+/g, " "),
    flags: [...new Set(flags)],
    charCount: blob.length,
  };
}

/**
 * @param {typeof TURNS[0]} turn
 */
async function askTurn(turn) {
  const t0 = Date.now();
  const body = {
    question: turn.question,
    sportHint: turn.sport,
    structured: true,
  };
  if (turn.history?.length) body.history = turn.history;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(`${base}/api/ur-take`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-UR-Take-Structured": "1" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const elapsedMs = Date.now() - t0;
    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return analyzeResponse(turn.id, turn.sport, turn.question, raw, null, elapsedMs, r.status, "bad_json");
    }
    if (data.error) {
      return analyzeResponse(turn.id, turn.sport, turn.question, data.error, null, elapsedMs, r.status, data.code || "api_error");
    }
    const text = data.response || data.take || "";
    const structured = data.structured || null;
    const row = analyzeResponse(turn.id, turn.sport, turn.question, text, structured, elapsedMs, r.status, null);
    row.qaSummary = data.qaSummary || null;
    row.wcIntent = data.wcIntent || null;
    row.fullText = text.slice(0, 2000);
    return row;
  } catch (err) {
    const msg = err.cause?.message || err.cause?.code || err.message || String(err);
    return analyzeResponse(
      turn.id,
      turn.sport,
      turn.question,
      "",
      null,
      Date.now() - t0,
      0,
      err.name === "AbortError" ? "timeout" : msg,
    );
  }
}

async function runPool(items, fn, limit) {
  /** @type {Array<Awaited<ReturnType<typeof askTurn>>>} */
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const row = await fn(items[idx]);
      out[idx] = row;
      process.stderr.write(`[${idx + 1}/${items.length}] ${row.id} ${row.elapsedMs}ms ${row.flags.length ? row.flags.join(",") : "ok"}\n`);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
}

const results = await runPool(ACTIVE_TURNS, askTurn, CONCURRENCY);
const outPath = path.join(root, "scripts", "audit-50-results.json");
fs.writeFileSync(outPath, JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));

const hallucinations = results.filter((r) => r.flags.some((f) => f.startsWith("HALLUCINATION")));
const inefficiencies = results.filter((r) => r.flags.some((f) => f.startsWith("inefficiency")));
const errors = results.filter((r) => r.flags.some((f) => f.startsWith("error") || f.startsWith("http_") || f.startsWith("upstream")));
const slow = results.filter((r) => r.flags.includes("slow"));

console.log("\n=== AUDIT SUMMARY ===");
console.log(`Total: ${results.length}`);
console.log(`Hallucinations: ${hallucinations.length}`);
console.log(`Inefficiencies: ${inefficiencies.length}`);
console.log(`Errors/timeouts: ${errors.length}`);
console.log(`Slow (>45s): ${slow.length}`);
console.log(`Median ms: ${median(results.map((r) => r.elapsedMs))}`);
console.log(`Written: ${outPath}`);

if (hallucinations.length) {
  console.log("\n--- HALLUCINATIONS ---");
  for (const r of hallucinations) {
    console.log(`${r.id}: ${r.flags.filter((f) => f.startsWith("HALLUCINATION")).join("; ")}`);
    console.log(`  Q: ${r.question}`);
    console.log(`  A: ${r.headline}`);
  }
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
