/**
 * Join game context onto open prop settlements and stratify hit rates.
 * Context: opening spread/total, favorite/dog, final margin / script bucket.
 *
 * Usage: node --env-file=.env scripts/enrich-nfl-prop-context.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getNflBdlApiKey,
  fetchNflBdlOpeningOdds,
  nflBdlFetchAllPages,
} from "../api/_nflBdl.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function scriptBucket(margin) {
  const m = Number(margin);
  if (!Number.isFinite(m)) return null;
  if (m >= 14) return "blowout_win";
  if (m >= 3) return "close_win";
  if (m > -3) return "toss_up";
  if (m > -14) return "close_loss";
  return "blowout_loss";
}

function totalBucket(total) {
  const t = Number(total);
  if (!Number.isFinite(t)) return null;
  if (t < 42) return "low";
  if (t < 47) return "mid_low";
  if (t < 52) return "mid_high";
  return "high";
}

function spreadBucket(playerSpread) {
  const s = Number(playerSpread);
  if (!Number.isFinite(s)) return null;
  if (s <= -7) return "big_fav";
  if (s < 0) return "small_fav";
  if (s < 7) return "small_dog";
  return "big_dog";
}

async function loadGamesIndex(season, weeks, key) {
  /** @type {Map<number, any>} */
  const map = new Map();
  for (const week of weeks) {
    const res = await nflBdlFetchAllPages(
      "/games",
      { seasons: [season], weeks: [week], per_page: 100 },
      { apiKey: key, maxPages: 2, timeoutMs: 25000 },
    );
    for (const g of res.data || []) {
      map.set(Number(g.id), {
        id: Number(g.id),
        week: Number(g.week ?? week),
        date: g.date,
        homeAbbr: String(g.home_team?.abbreviation || "").toUpperCase(),
        awayAbbr: String(
          g.visitor_team?.abbreviation || g.away_team?.abbreviation || "",
        ).toUpperCase(),
        homeId: Number(g.home_team?.id),
        awayId: Number(g.visitor_team?.id ?? g.away_team?.id),
        homeScore: num(g.home_team_score),
        awayScore: num(g.visitor_team_score ?? g.away_team_score),
      });
    }
    await sleep(60);
  }
  return map;
}

async function loadOpeningOddsByGame(season, weeks, key) {
  /** @type {Map<number, any>} */
  const map = new Map();
  for (const week of weeks) {
    const res = await fetchNflBdlOpeningOdds({ season, week, apiKey: key });
    for (const row of res.rows || []) {
      const gid = Number(row.game_id ?? row.gameId ?? row.eventId);
      if (!Number.isFinite(gid)) continue;
      // Prefer draftkings / first
      if (map.has(gid) && row.vendor !== "draftkings" && map.get(gid).vendor === "draftkings") {
        continue;
      }
      const spreadHome = num(row.spread?.home);
      const totalLine = num(row.total?.line);
      map.set(gid, {
        vendor: row.vendor || row.book,
        spreadHome,
        spreadAway: num(row.spread?.away),
        totalLine,
        mlHome: num(row.moneyline?.home),
        mlAway: num(row.moneyline?.away),
      });
    }
    await sleep(80);
  }
  return map;
}

function bump(map, key, result) {
  if (!map[key]) map[key] = { over: 0, under: 0, n: 0 };
  map[key].n += 1;
  if (result === "over") map[key].over += 1;
  if (result === "under") map[key].under += 1;
}

function rateTable(map) {
  return Object.entries(map)
    .map(([key, row]) => {
      const d = row.over + row.under;
      return {
        key,
        n: row.n,
        underHitRate: d ? row.under / d : null,
        overHitRate: d ? row.over / d : null,
      };
    })
    .filter((r) => r.n >= 30)
    .sort((a, b) => b.n - a.n);
}

async function main() {
  const key = getNflBdlApiKey();
  if (!key) throw new Error("BALLDONTLIE_API_KEY missing");
  const settlementsPath = join(OUT, "nfl-prop-history-settlements.json");
  if (!existsSync(settlementsPath)) throw new Error("missing settlements — run grade first");

  const settlements = JSON.parse(readFileSync(settlementsPath, "utf8")).filter(
    (s) => s.source === "bdl_opening_props",
  );

  console.error("Loading games + opening odds for 2025 / 2026…");
  const games2025 = await loadGamesIndex(
    2025,
    Array.from({ length: 18 }, (_, i) => i + 1),
    key,
  );
  const odds2025 = await loadOpeningOddsByGame(
    2025,
    Array.from({ length: 18 }, (_, i) => i + 1),
    key,
  );
  const games2026 = await loadGamesIndex(2026, [1, 2, 3], key);
  const odds2026 = await loadOpeningOddsByGame(2026, [1, 2, 3], key);

  const games = new Map([...games2025, ...games2026]);
  const odds = new Map([...odds2025, ...odds2026]);

  const enriched = [];
  const bySpread = {};
  const byTotal = {};
  const byScript = {};
  const bySpreadProp = {};
  const byScriptProp = {};

  for (const s of settlements) {
    const g = games.get(Number(s.gameId));
    const o = odds.get(Number(s.gameId));
    if (!g) continue;

    const venue = s.venue;
    let playerSpread = null;
    let teamScore = null;
    let oppScore = null;
    if (venue === "home") {
      playerSpread = o?.spreadHome ?? null;
      teamScore = g.homeScore;
      oppScore = g.awayScore;
    } else if (venue === "away") {
      playerSpread =
        o?.spreadAway != null
          ? o.spreadAway
          : o?.spreadHome != null
            ? -o.spreadHome
            : null;
      teamScore = g.awayScore;
      oppScore = g.homeScore;
    }

    const margin =
      teamScore != null && oppScore != null ? teamScore - oppScore : null;
    const totalLine = o?.totalLine ?? null;
    const impliedTeamTotal =
      totalLine != null && playerSpread != null
        ? totalLine / 2 - playerSpread / 2
        : null;

    const row = {
      ...s,
      spreadHome: o?.spreadHome ?? null,
      playerSpread,
      totalLine,
      impliedTeamTotal,
      margin,
      scriptBucket: scriptBucket(margin),
      totalBucket: totalBucket(totalLine),
      spreadBucket: spreadBucket(playerSpread),
      isFavorite: playerSpread != null ? playerSpread < 0 : null,
    };
    enriched.push(row);

    if (s.result !== "over" && s.result !== "under") continue;
    if (row.spreadBucket) {
      bump(bySpread, row.spreadBucket, s.result);
      bump(bySpreadProp, `${row.spreadBucket}|${s.propType}`, s.result);
    }
    if (row.totalBucket) bump(byTotal, row.totalBucket, s.result);
    if (row.scriptBucket) {
      bump(byScript, row.scriptBucket, s.result);
      bump(byScriptProp, `${row.scriptBucket}|${s.propType}`, s.result);
    }
  }

  const contextStrata = {
    methodology:
      "Joined BDL opening game odds (spread/total) + final scores. " +
      "playerSpread = home spread if home else −home. " +
      "scriptBucket from final margin (team − opponent). Rest/weather not in BDL — deferred.",
    coverage: {
      settlements: settlements.length,
      enriched: enriched.length,
      gamesWithOdds: odds.size,
      gamesIndexed: games.size,
    },
    bySpreadBucket: rateTable(bySpread),
    byTotalBucket: rateTable(byTotal),
    byScriptBucket: rateTable(byScript),
    bySpreadProp: rateTable(bySpreadProp).slice(0, 40),
    byScriptProp: rateTable(byScriptProp)
      .filter((r) => r.n >= 40)
      .slice(0, 40),
  };

  const reportPath = join(OUT, "nfl-prop-history-grade.json");
  const report = existsSync(reportPath)
    ? JSON.parse(readFileSync(reportPath, "utf8"))
    : {};
  report.contextStrata = contextStrata;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, "nfl-prop-context-settlements.json"), JSON.stringify(enriched, null, 2));

  console.log(JSON.stringify(contextStrata, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
