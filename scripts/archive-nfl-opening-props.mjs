/**
 * Snapshot opening player props after kickoff so we keep a first-party archive.
 * BDL live /odds/player_props clears; /opening stays for ~1 completed season.
 *
 * Usage:
 *   node --env-file=.env scripts/archive-nfl-opening-props.mjs
 *   node --env-file=.env scripts/archive-nfl-opening-props.mjs --season 2026 --week 2
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getNflBdlApiKey, nflBdlFetch, nflBdlFetchAllPages } from "../api/_nflBdl.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out", "opening-props-archive");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const key = getNflBdlApiKey();
  if (!key) throw new Error("BALLDONTLIE_API_KEY missing");
  const season = Number(arg("season", new Date().getUTCFullYear()));
  const week = Number(arg("week", "0"));
  const weeks = week > 0 ? [week] : Array.from({ length: 18 }, (_, i) => i + 1);

  mkdirSync(OUT, { recursive: true });
  let archived = 0;
  for (const w of weeks) {
    const games = await nflBdlFetchAllPages(
      "/games",
      { seasons: [season], weeks: [w], per_page: 100 },
      { apiKey: key, maxPages: 2, timeoutMs: 25000 },
    );
    for (const g of games.data || []) {
      const status = String(g.status || "").toLowerCase();
      if (!status.includes("final") && status !== "completed") continue;
      const path = join(OUT, `${season}-w${w}-g${g.id}.json`);
      if (existsSync(path) && !process.argv.includes("--force")) {
        archived += 1;
        continue;
      }
      const res = await nflBdlFetch(
        "/odds/player_props/opening",
        { game_id: g.id },
        { apiKey: key, timeoutMs: 25000 },
      );
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      if (!rows.length) continue;
      writeFileSync(
        path,
        JSON.stringify(
          {
            season,
            week: w,
            gameId: g.id,
            date: g.date,
            archivedAt: new Date().toISOString(),
            count: rows.length,
            rows,
          },
          null,
          0,
        ),
      );
      archived += 1;
      console.error(`archived ${path} (${rows.length} rows)`);
    }
  }
  const manifestPath = join(OUT, "manifest.json");
  const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        ...prev,
        lastRun: new Date().toISOString(),
        season,
        weeks,
        archivedFilesApprox: archived,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, archived, out: OUT }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
