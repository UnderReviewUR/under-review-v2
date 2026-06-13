/**
 * WC misprice drift snapshot — sim advance % vs BDL qualify_from_group (local ops, MD1+).
 *
 * Run modes:
 *   1) Direct KV (needs .env KV / Upstash creds — same as warm:wc:direct):
 *        npm run snapshot:wc-misprice
 *        npm run snapshot:wc-misprice -- --refresh   # recompute sim before read
 *   2) Prod/local HTTP (no KV; uses WARM_BASE_URL or localhost:3001):
 *        npm run snapshot:wc-misprice:prod
 *        $env:WARM_BASE_URL="https://under-review-v2.vercel.app"; npm run snapshot:wc-misprice:prod
 *
 * Output: appends one JSON line to scripts/wc-misprice-snapshots.jsonl (gitignored).
 * Second+ run diffs vs prior line (≥5pt delta move, pass↔lean flip).
 *
 * JSONL record schema (one object per line):
 *   {
 *     capturedAt: ISO8601,
 *     sim: { lastUpdated, fingerprint, source, eloMatchesApplied, strengthMatchesApplied,
 *            xgMatchesApplied, completedMatchCount },
 *     bdl: { lastUpdated, source },
 *     teamCount: number,
 *     teams: [{ teamAbbr, group, simPct, impliedPct, delta, magnitude, american, lean }],
 *     top10: same shape, top |delta| rows
 *   }
 *
 * lean: "pass" (sim < market) | "lean" (sim > market) | "neutral"
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMispriceSnapshotFromInputs,
  diffMispriceSnapshots,
} from "../shared/wcMispriceDriftSnapshot.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOut = path.join(root, "scripts", "wc-misprice-snapshots.jsonl");

const args = new Set(process.argv.slice(2));
const direct = args.has("--direct");
const refresh = args.has("--refresh");
const outArgIdx = process.argv.indexOf("--out");
const outPath = outArgIdx >= 0 ? path.resolve(process.argv[outArgIdx + 1]) : defaultOut;

/**
 * @param {string} base
 */
async function loadViaHttp(base) {
  const urlBase = String(base || "http://localhost:3001").replace(/\/$/, "");
  const headers = process.env.CRON_SECRET
    ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
    : {};

  const simUrl = `${urlBase}/api/world-cup?view=sim${refresh ? "&refresh=1" : ""}`;
  const ctxUrl = `${urlBase}/api/world-cup?view=match_read_context`;

  const [simRes, ctxRes] = await Promise.all([
    fetch(simUrl, { headers, cache: "no-store" }),
    fetch(ctxUrl, { headers, cache: "no-store" }),
  ]);

  const simBody = await simRes.json().catch(() => ({}));
  const ctxBody = await ctxRes.json().catch(() => ({}));

  if (!simRes.ok) {
    throw new Error(`sim HTTP ${simRes.status}: ${simUrl}`);
  }
  if (!ctxRes.ok) {
    throw new Error(`match_read_context HTTP ${ctxRes.status}: ${ctxUrl}`);
  }

  return {
    mode: "http",
    base: urlBase,
    simRow: simBody,
    bdlFutures: ctxBody?.bdlFutures
      ? {
          byMarketType: ctxBody.bdlFutures.byMarketType,
          lastUpdated: ctxBody.bdlFutures.lastUpdated,
          source: ctxBody.bdlFutures.source,
        }
      : null,
  };
}

async function loadViaDirect() {
  if (refresh) {
    const { scrapeAndCacheWcTournamentSim } = await import("../api/_wcTournamentSimData.js");
    await scrapeAndCacheWcTournamentSim();
  }

  const { readWcTournamentSimFromKv } = await import("../api/_wcTournamentSimData.js");
  const { resolveWcCrossGroupPrebuiltInputs } = await import("../api/_wcCrossGroupPrebuiltInputs.js");

  const [simRow, inputs] = await Promise.all([
    readWcTournamentSimFromKv(Number.MAX_SAFE_INTEGER),
    resolveWcCrossGroupPrebuiltInputs(),
  ]);

  if (!simRow?.teamStats) {
    throw new Error("tournament sim KV missing teamStats — run npm run warm:wc:direct first");
  }

  return {
    mode: "direct",
    simRow,
    bdlFutures: inputs.bdlFutures,
  };
}

/**
 * @param {string} filePath
 */
function readPriorSnapshot(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean);
  if (!lines.length) return null;
  try {
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} snapshot
 */
function printHealthChecklist(snapshot) {
  const sim = snapshot.sim || {};
  const lines = ["", "Phase 2 health checklist:"];

  lines.push(
    sim.eloMatchesApplied > 0
      ? `  [ok] eloMatchesApplied: ${sim.eloMatchesApplied}`
      : `  [!!] eloMatchesApplied: 0 — sim not ingesting FT Elo yet`,
  );
  lines.push(
    sim.xgMatchesApplied > 0
      ? `  [ok] xgMatchesApplied: ${sim.xgMatchesApplied} (BDL xG in strength map)`
      : sim.strengthMatchesApplied > 0
        ? `  [~~] xgMatchesApplied: 0 but strengthMatchesApplied: ${sim.strengthMatchesApplied} (goals proxy only)`
        : `  [!!] xgMatchesApplied: 0 — no form/xG layer yet`,
  );
  lines.push(`  sim fingerprint: ${sim.fingerprint || "—"}`);
  lines.push(`  sim lastUpdated: ${sim.lastUpdated ? new Date(sim.lastUpdated).toISOString() : "—"}`);
  lines.push(`  teams ranked: ${snapshot.teamCount}`);
  console.log(lines.join("\n"));
}

/**
 * @param {Record<string, unknown>} snapshot
 * @param {ReturnType<typeof diffMispriceSnapshots>} diff
 */
function printSummary(snapshot, diff) {
  console.log("\nTop 10 |sim − market| (advance %):");
  for (const row of snapshot.top10 || []) {
    const sign = row.delta >= 0 ? "+" : "";
    console.log(
      `  Group ${row.group} ${row.teamAbbr}: sim ${row.simPct}% · mkt ${row.impliedPct}% · ${sign}${row.delta}pt · ${row.lean}`,
    );
  }

  if (!diff.hasPrior) {
    console.log("\nNo prior snapshot — diff starts next run.");
    return;
  }

  if (diff.moved.length) {
    console.log(`\nDelta moved ≥${diff.threshold}pt since prior snapshot:`);
    for (const m of diff.moved.slice(0, 12)) {
      const sign = m.deltaMove >= 0 ? "+" : "";
      console.log(
        `  ${m.teamAbbr}: ${m.priorDelta}pt → ${m.delta}pt (${sign}${m.deltaMove}pt) · ${m.priorLean} → ${m.lean}`,
      );
    }
  } else {
    console.log("\nNo team deltas moved ≥5pt vs prior snapshot.");
  }

  if (diff.leanFlips.length) {
    console.log("\nLean side flips (pass ↔ lean):");
    for (const f of diff.leanFlips) {
      console.log(`  ${f.teamAbbr}: ${f.priorLean} → ${f.lean} (${f.priorDelta}pt → ${f.delta}pt)`);
    }
  }
}

async function main() {
  const loaded = direct
    ? await loadViaDirect()
    : await loadViaHttp(
        process.env.WARM_BASE_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
          "http://localhost:3001",
      );

  const snapshot = buildMispriceSnapshotFromInputs(loaded.simRow, loaded.bdlFutures);
  const prior = readPriorSnapshot(outPath);
  const diff = diffMispriceSnapshots(snapshot, prior);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.appendFileSync(outPath, `${JSON.stringify(snapshot)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: loaded.mode,
        outPath,
        capturedAt: snapshot.capturedAt,
        sim: snapshot.sim,
        bdl: snapshot.bdl,
        top3: (snapshot.top10 || []).slice(0, 3).map((r) => ({
          team: r.teamAbbr,
          group: r.group,
          delta: r.delta,
          lean: r.lean,
        })),
        diff: diff.hasPrior
          ? { moved: diff.moved.length, leanFlips: diff.leanFlips.length }
          : null,
      },
      null,
      2,
    ),
  );

  printHealthChecklist(snapshot);
  printSummary(snapshot, diff);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
  process.exit(1);
});
