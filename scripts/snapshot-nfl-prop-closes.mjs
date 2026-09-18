/**
 * Snapshot live (near-kickoff) NFL player prop boards for CLV.
 * BDL live boards disappear after final — must capture before/at kickoff.
 *
 * Weekly habit (Thu–Sun of NFL slate):
 *   npm run snapshot:nfl-prop-closes
 * Optional: --season 2026 --week 3  |  --hours 48  |  --all-upcoming
 * Then grade when settled:
 *   npm run grade:nfl-prop-clv
 *
 * Writes: scripts/out/prop-close-snapshots/{season}-w{week}-g{id}.json
 * Manifest: scripts/out/prop-close-snapshots/manifest.json
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getNflBdlApiKey, nflBdlFetch, nflBdlFetchAllPages } from "../api/_nflBdl.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out", "prop-close-snapshots");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function isFinal(status) {
  const s = String(status || "").toLowerCase();
  return s.includes("final") || s === "completed";
}

async function main() {
  const key = getNflBdlApiKey();
  if (!key) throw new Error("BALLDONTLIE_API_KEY missing");

  const season = Number(arg("season", new Date().getUTCFullYear()));
  const weekArg = Number(arg("week", "0"));
  const hours = Number(arg("hours", "72"));
  const weeks =
    weekArg > 0 ? [weekArg] : Array.from({ length: 18 }, (_, i) => i + 1);
  const now = Date.now();
  const horizonMs = (Number.isFinite(hours) ? hours : 72) * 3600 * 1000;

  mkdirSync(OUT, { recursive: true });
  let snapped = 0;
  let skipped = 0;

  for (const week of weeks) {
    const games = await nflBdlFetchAllPages(
      "/games",
      { seasons: [season], weeks: [week], per_page: 100 },
      { apiKey: key, maxPages: 2, timeoutMs: 25000 },
    );
    for (const g of games.data || []) {
      if (isFinal(g.status)) {
        skipped += 1;
        continue;
      }
      const tip = Date.parse(g.date);
      if (!Number.isFinite(tip)) continue;
      // Snapshot boards for games tipping within horizon, or already started but not final
      const inWindow = tip - now <= horizonMs && tip - now >= -3 * 3600 * 1000;
      if (!inWindow && !process.argv.includes("--all-upcoming")) continue;

      const path = join(OUT, `${season}-w${week}-g${g.id}.json`);
      // Refresh allowed near kickoff — keep latest as "close"
      const res = await nflBdlFetch(
        "/odds/player_props",
        { game_id: g.id },
        { apiKey: key, timeoutMs: 25000 },
      );
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      if (!rows.length) {
        console.error(`no live props yet game ${g.id} (${g.status})`);
        continue;
      }

      // Also pull opening for the same game so we can join later without finals
      const openRes = await nflBdlFetch(
        "/odds/player_props/opening",
        { game_id: g.id },
        { apiKey: key, timeoutMs: 25000 },
      );
      const openRows = Array.isArray(openRes.data?.data) ? openRes.data.data : [];

      const payload = {
        kind: "close_snapshot",
        season,
        week,
        gameId: g.id,
        date: g.date,
        status: g.status,
        snappedAt: new Date().toISOString(),
        hoursToKick: (tip - now) / 3600000,
        liveCount: rows.length,
        openCount: openRows.length,
        liveRows: rows,
        openRows,
      };
      writeFileSync(path, JSON.stringify(payload, null, 0));
      snapped += 1;
      console.error(
        `close snapshot ${path} live=${rows.length} open=${openRows.length} tipIn=${((tip - now) / 3600000).toFixed(1)}h`,
      );
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
        hours,
        snapped,
        skippedFinals: skipped,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, snapped, skippedFinals: skipped, out: OUT }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
