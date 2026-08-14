#!/usr/bin/env node
/**
 * Ingest Mike Clay–style volume projections into the local seed and/or live API.
 *
 * Expected JSON shape:
 * {
 *   "asOf": "2026-09-10",
 *   "source": "mike_clay_espn",
 *   "sourceLabel": "Mike Clay week-1 projections",
 *   "players": {
 *     "Josh Allen": { "pos":"QB","team":"BUF","passYds":3800,"passTd":28,"rushYds":520,"rushTd":8 }
 *   }
 * }
 *
 * Usage:
 *   node scripts/ingest-nfl-clay.mjs path/to/clay.json
 *   node scripts/ingest-nfl-clay.mjs path/to/clay.json --post https://www.under-review.app
 *   node scripts/ingest-nfl-clay.mjs path/to/clay.json --write-seed
 *
 * Auth for --post: set CRON_SECRET in env (Authorization: Bearer …).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateNflClayBundle } from "../api/_nflClayProjections.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const writeSeed = args.includes("--write-seed");
const postIdx = args.indexOf("--post");
const postBase = postIdx >= 0 ? args[postIdx + 1] || "http://127.0.0.1:3001" : null;

if (!file) {
  console.error("Usage: node scripts/ingest-nfl-clay.mjs <clay.json> [--write-seed] [--post <baseUrl>]");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
const validated = validateNflClayBundle(raw);
if (!validated.ok) {
  console.error("Invalid Clay bundle:", validated.error);
  process.exit(1);
}

const bundle = {
  ...validated.bundle,
  updatedAt: new Date().toISOString(),
};

console.log(
  `Validated ${Object.keys(bundle.players).length} players · asOf ${bundle.asOf} · source ${bundle.source}`,
);

if (writeSeed) {
  const outPath = path.join(root, "api/data/nfl-clay-projections.js");
  const body = `/**
 * Auto-written by scripts/ingest-nfl-clay.mjs — do not hand-edit large player maps.
 * Last ingest: ${bundle.updatedAt}
 */
export const NFL_CLAY_INJURY_RULE = ${JSON.stringify(bundle.injuryRule)};

export const NFL_CLAY_PROJECTIONS_SEED = ${JSON.stringify(
    {
      asOf: bundle.asOf,
      source: bundle.source,
      sourceLabel: bundle.sourceLabel,
      injuryRule: bundle.injuryRule,
      players: bundle.players,
    },
    null,
    2,
  )};
`;
  fs.writeFileSync(outPath, body);
  console.log("Wrote seed:", outPath);
}

if (postBase) {
  const secret = process.env.CRON_SECRET || "";
  const url = `${String(postBase).replace(/\/$/, "")}/api/nfl-clay-refresh`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(bundle),
  });
  const text = await res.text();
  console.log(`POST ${url} → ${res.status}`);
  console.log(text.slice(0, 800));
  if (!res.ok) process.exit(1);
}

if (!writeSeed && !postBase) {
  console.log("No --write-seed / --post flag — validation only. Bundle OK.");
}
