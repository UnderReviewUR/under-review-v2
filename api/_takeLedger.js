import crypto from "crypto";
import { getDurableJson, listKeysWithPrefix, setDurableJson } from "./_durableStore.js";

const TAKE_TTL_SECONDS = 60 * 60 * 24 * 120; // 120 days
const MAX_TAKES_PER_USER = 400;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  return clean.includes("@") ? clean : "";
}

function userKey(email) {
  return `takes:${normalizeEmail(email)}`;
}

function makeTakeId() {
  return `take_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function parseOddsFromPlayLine(playLine) {
  const m = String(playLine || "").match(/([+-]\d{3,4})\b/);
  if (!m) return null;
  const odds = Number(m[1]);
  return Number.isFinite(odds) ? odds : null;
}

function parseTeamMoneyline(playLine) {
  const line = String(playLine || "").trim();
  if (!line) return null;

  const regexes = [
    /([A-Za-z .&'-]{2,}?)\s+(moneyline|ml|to win)\b/i,
    /\b([A-Z]{2,4})\s+(moneyline|ml)\b/i,
  ];

  for (const re of regexes) {
    const m = line.match(re);
    if (m?.[1]) {
      const teamRaw = String(m[1]).trim();
      const team = teamRaw.replace(/\s{2,}/g, " ");
      return {
        marketType: "team_moneyline",
        team,
        oddsAmerican: parseOddsFromPlayLine(line),
      };
    }
  }

  return null;
}

function extractSectionValue(text, sectionName) {
  const raw = String(text || "");
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\n([^\\n]+)`, "i");
  const m = raw.match(re);
  return m?.[1] ? String(m[1]).trim() : "";
}

/** Migrate stored takes from older schema (`ungraded` → `tracked`). */
export function migrateTakeStatuses(take) {
  if (!take) return take;
  if (take.status === "ungraded") return { ...take, status: "tracked" };
  return take;
}

export function extractTakeFromResponse({ responseText, sport, intent, question }) {
  let playLine = extractSectionValue(responseText, "THE PLAY");
  if (!playLine) {
    playLine = extractSectionValue(responseText, "OPENING LINE");
  }
  if (!playLine) {
    const lines = String(responseText || "")
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const skip = /^(MATCH READ|PROP PROJECTIONS|LIVE CALL|THE MATH)\b/i;
    const first = lines.find((l) => l.length > 0 && !skip.test(l));
    if (first && first.length < 240) playLine = first;
  }
  const confidenceLine =
    extractSectionValue(responseText, "CONFIDENCE") || "Unspecified";
  const timingLine = extractSectionValue(responseText, "TIMING");

  let parsed = parseTeamMoneyline(playLine);
  const sportLower = String(sport || "").toLowerCase();
  if (parsed && sportLower === "tennis") {
    parsed = {
      marketType: "tennis_match_winner",
      player: parsed.team,
      oddsAmerican: parsed.oddsAmerican,
    };
  }

  return {
    id: makeTakeId(),
    sport: String(sport || "generic").toLowerCase(),
    intent: String(intent || "general"),
    question: String(question || "").slice(0, 400),
    response: String(responseText || "").slice(0, 8000),
    playLine: playLine || "",
    confidence: confidenceLine,
    timing: timingLine || "",
    parsedBet: parsed,
    status: parsed ? "pending" : "tracked",
    result: null,
    gradingNote: parsed ? "" : "Tracked — auto-grading is not available for this market yet.",
    createdAt: new Date().toISOString(),
    settledAt: null,
  };
}

async function getUserTakeBundle(email) {
  const key = userKey(email);
  if (!key) return { takes: [] };
  const bundle = await getDurableJson(key);
  if (!bundle || !Array.isArray(bundle.takes)) return { takes: [] };
  return bundle;
}

async function saveUserTakeBundle(email, bundle) {
  const key = userKey(email);
  if (!key) return;
  await setDurableJson(
    key,
    {
      takes: Array.isArray(bundle?.takes) ? bundle.takes : [],
      updatedAt: new Date().toISOString(),
    },
    { ttlSeconds: TAKE_TTL_SECONDS }
  );
}

function clipTakes(takes) {
  return [...takes]
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
    .slice(0, MAX_TAKES_PER_USER);
}

export async function appendTakeForUser(email, take) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !take) return null;

  const bundle = await getUserTakeBundle(cleanEmail);
  const takes = Array.isArray(bundle.takes) ? bundle.takes : [];
  takes.unshift(take);
  await saveUserTakeBundle(cleanEmail, { takes: clipTakes(takes) });
  return take;
}

function etDateOffsets(days) {
  const out = [];
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  for (let i = -days; i <= days; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${y}${m}${dd}`);
  }
  return out;
}

async function safeFetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeEspnFinalGames(data, sport) {
  const events = Array.isArray(data?.events) ? data.events : [];
  return events
    .map((ev) => {
      const comp = ev?.competitions?.[0];
      const status = String(ev?.status?.type?.state || "").toLowerCase();
      if (status !== "post") return null;
      const home = comp?.competitors?.find((c) => c?.homeAway === "home");
      const away = comp?.competitors?.find((c) => c?.homeAway === "away");
      const homeScore = Number(home?.score);
      const awayScore = Number(away?.score);
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;

      return {
        sport,
        homeName: home?.team?.displayName || home?.team?.name || "",
        awayName: away?.team?.displayName || away?.team?.name || "",
        homeAbbr: home?.team?.abbreviation || "",
        awayAbbr: away?.team?.abbreviation || "",
        homeScore,
        awayScore,
        completedAt: ev?.date || new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

async function fetchRecentFinalGames() {
  const dates = etDateOffsets(2);
  const all = [];

  for (const d of dates) {
    const [nba, mlb] = await Promise.all([
      safeFetchJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d}`),
      safeFetchJson(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${d}`),
    ]);
    all.push(...normalizeEspnFinalGames(nba, "nba"));
    all.push(...normalizeEspnFinalGames(mlb, "mlb"));
  }

  return all;
}

/** Tennis score settlement — external fixtures feed removed; ledger relies on NBA/MLB ESPN for auto-settle. */
async function fetchRecentTennisResults() {
  return [];
}

function pickMatchesTeam(teamPick, game) {
  const pick = normalizeText(teamPick);
  if (!pick) return false;

  const tokens = [
    game.homeName,
    game.awayName,
    game.homeAbbr,
    game.awayAbbr,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return tokens.some((t) => pick === t || pick.includes(t) || t.includes(pick));
}

function settleMoneylineTake(take, game) {
  const pick = normalizeText(take?.parsedBet?.team);
  const home = normalizeText(game.homeName);
  const away = normalizeText(game.awayName);
  const homeAbbr = normalizeText(game.homeAbbr);
  const awayAbbr = normalizeText(game.awayAbbr);
  const winner = game.homeScore > game.awayScore ? "home" : game.awayScore > game.homeScore ? "away" : "push";

  if (winner === "push") {
    return { result: "push", note: `${game.awayAbbr} ${game.awayScore} - ${game.homeAbbr} ${game.homeScore}` };
  }

  const pickedHome = pick && (pick.includes(home) || pick === homeAbbr || homeAbbr.includes(pick));
  const pickedAway = pick && (pick.includes(away) || pick === awayAbbr || awayAbbr.includes(pick));

  const win = (winner === "home" && pickedHome) || (winner === "away" && pickedAway);
  return {
    result: win ? "win" : "loss",
    note: `${game.awayAbbr} ${game.awayScore} - ${game.homeAbbr} ${game.homeScore}`,
  };
}

function tennisNameMatchesPick(pick, name) {
  const a = normalizeText(pick);
  const b = normalizeText(name);
  if (!a || !b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

function isTennisWinnerPendingTake(take) {
  if (String(take?.sport || "").toLowerCase() !== "tennis") return false;
  if (take?.status !== "pending") return false;
  const pb = take?.parsedBet;
  const name = pb?.player || pb?.team;
  if (!name) return false;
  if (pb?.marketType === "tennis_match_winner") return true;
  if (pb?.marketType === "team_moneyline") return true;
  return false;
}

function settleTennisAgainstMatch(take, match) {
  const pickRaw = take?.parsedBet?.player || take?.parsedBet?.team || "";
  const w = match.winner;
  const l = match.loser;

  const tookWinner = tennisNameMatchesPick(pickRaw, w);
  const tookLoser = tennisNameMatchesPick(pickRaw, l);

  if (tookWinner && tookLoser) return null;
  if (!tookWinner && !tookLoser) return null;

  const note = [w, "def", l, match.score || ""].filter(Boolean).join(" ").trim();

  if (tookWinner) return { result: "win", note };
  return { result: "loss", note };
}

function findSettlementForTennisTake(take, matches) {
  for (const m of matches) {
    const settled = settleTennisAgainstMatch(take, m);
    if (settled) return settled;
  }
  return null;
}

export async function gradeAndGetTakesForUser(email) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return [];

  const bundle = await getUserTakeBundle(cleanEmail);
  const takesRaw = Array.isArray(bundle.takes) ? bundle.takes : [];
  const takes = takesRaw.map(migrateTakeStatuses);

  const needsMigratePersistence = takesRaw.some((t) => migrateTakeStatuses(t).status !== t.status);

  const needsNbaMlb = takes.some(
    (t) =>
      t?.status === "pending" &&
      t?.parsedBet?.marketType === "team_moneyline" &&
      (t.sport === "nba" || t.sport === "mlb")
  );
  const needsTennis = takes.some(isTennisWinnerPendingTake);

  if (!needsNbaMlb && !needsTennis) {
    if (needsMigratePersistence) {
      await saveUserTakeBundle(cleanEmail, { takes: clipTakes(takes) });
    }
    return takes;
  }

  const games = needsNbaMlb ? await fetchRecentFinalGames() : [];
  const tennisMatches = needsTennis ? await fetchRecentTennisResults() : [];

  const updated = takes.map((take) => {
    if (take?.status !== "pending") return take;

    if (
      take?.parsedBet?.marketType === "team_moneyline" &&
      (take.sport === "nba" || take.sport === "mlb")
    ) {
      if (!games.length) return take;
      const game = games.find((g) => g.sport === take.sport && pickMatchesTeam(take?.parsedBet?.team, g));
      if (!game) return take;

      const settled = settleMoneylineTake(take, game);
      return {
        ...take,
        status: "settled",
        result: settled.result,
        gradingNote: settled.note,
        settledAt: new Date().toISOString(),
      };
    }

    if (isTennisWinnerPendingTake(take)) {
      if (!tennisMatches.length) return take;
      const settled = findSettlementForTennisTake(take, tennisMatches);
      if (!settled) return take;
      return {
        ...take,
        status: "settled",
        result: settled.result,
        gradingNote: settled.note,
        settledAt: new Date().toISOString(),
      };
    }

    return take;
  });

  await saveUserTakeBundle(cleanEmail, { takes: clipTakes(updated) });
  return updated;
}

function unitsFromOdds(result, oddsAmerican) {
  if (result === "push") return 0;
  if (result === "loss") return -1;
  if (result !== "win") return 0;
  const odds = Number(oddsAmerican);
  if (!Number.isFinite(odds)) return 1;
  if (odds > 0) return odds / 100;
  return 100 / Math.abs(odds);
}

function computeBucketSummary(takes) {
  const settled = takes.filter((t) => t.status === "settled");
  const wins = settled.filter((t) => t.result === "win").length;
  const losses = settled.filter((t) => t.result === "loss").length;
  const pushes = settled.filter((t) => t.result === "push").length;
  const units = settled.reduce(
    (sum, t) => sum + unitsFromOdds(t.result, t?.parsedBet?.oddsAmerican),
    0
  );
  const stake = settled.length;
  const trackedCount = takes.filter(
    (t) => t.status === "tracked" || t.status === "ungraded"
  ).length;
  return {
    total: takes.length,
    settled: settled.length,
    pending: takes.filter((t) => t.status === "pending").length,
    tracked: trackedCount,
    wins,
    losses,
    pushes,
    winRate: settled.length ? Number((wins / settled.length).toFixed(3)) : 0,
    roiUnits: Number(units.toFixed(2)),
    roiPct: stake ? Number(((units / stake) * 100).toFixed(1)) : 0,
  };
}

function tierFromConfidenceLine(line) {
  const s = String(line || "").trim().toLowerCase();
  if (s.startsWith("high")) return "High";
  if (s.startsWith("medium")) return "Medium";
  if (s.startsWith("speculative")) return "Speculative";
  return null;
}

/**
 * Platform-wide aggregates from all `takes:*` ledger bundles (no user-identifying payload).
 * Returns null when the sample is too small to surface publicly.
 */
export async function aggregatePublicLedgerStats() {
  const keys = await listKeysWithPrefix("takes:");
  const allTakes = [];
  for (const key of keys) {
    const bundle = await getDurableJson(key);
    const raw = Array.isArray(bundle?.takes) ? bundle.takes : [];
    for (const t of raw) {
      if (t) allTakes.push(migrateTakeStatuses(t));
    }
  }
  if (allTakes.length < 20) return null;

  const highSettled = allTakes.filter(
    (t) => t.status === "settled" && tierFromConfidenceLine(t.confidence) === "High",
  );
  const hw = highSettled.filter((t) => t.result === "win").length;
  const highConfidenceWinRate = highSettled.length ? hw / highSettled.length : 0;

  return {
    totalTakes: allTakes.length,
    highConfidenceWinRate,
  };
}

export function buildPerformanceSnapshot(takes) {
  const rows = Array.isArray(takes) ? takes.map(migrateTakeStatuses) : [];
  const sortedRows = rows
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  const summary = computeBucketSummary(rows);

  const bySport = {};
  const byConfidence = {};

  for (const t of rows) {
    const sport = String(t.sport || "unknown").toLowerCase();
    const conf = String(t.confidence || "Unspecified");
    if (!bySport[sport]) bySport[sport] = [];
    if (!byConfidence[conf]) byConfidence[conf] = [];
    bySport[sport].push(t);
    byConfidence[conf].push(t);
  }

  return {
    summary,
    bySport: Object.fromEntries(
      Object.entries(bySport).map(([k, v]) => [k, computeBucketSummary(v)])
    ),
    byConfidence: Object.fromEntries(
      Object.entries(byConfidence).map(([k, v]) => [k, computeBucketSummary(v)])
    ),
    recent: sortedRows.slice(0, 40),
    ledgerRows: sortedRows,
    generatedAt: new Date().toISOString(),
  };
}
