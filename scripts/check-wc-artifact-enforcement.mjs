#!/usr/bin/env node
/**
 * WC turn-artifact enforcement gate — blocks regression on projection-only follow-ups.
 *
 * Usage:
 *   node scripts/check-wc-artifact-enforcement.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runWcTurnArtifactSloGate } from "../shared/wcTurnArtifactSlo.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const followUpsPath = path.join(root, "shared", "wcTakeAwareFollowUps.js");

const source = readFileSync(followUpsPath, "utf8");
const bannedImports = [
  "parseWcMatchGoalsOverUnder",
  "extractLeadAnytimeScorer",
  "parsePropBoardFromStructured",
  "wcMatchupTeamDisplayName",
];

const failures = [];
for (const sym of bannedImports) {
  if (new RegExp(`\\b${sym}\\b`).test(source)) {
    failures.push(`wcTakeAwareFollowUps.js must not import/use ${sym}`);
  }
}

if (/\bmatch\s*\(/.test(source) || /\.match\s*\(/.test(source)) {
  failures.push("wcTakeAwareFollowUps.js must not use String.match (NL parsing)");
}

const slo = runWcTurnArtifactSloGate();
if (slo.failed > 0) {
  for (const f of slo.failures) {
    failures.push(`SLO ${f.id}: ${f.reasons.join("; ")}`);
  }
}

const golden = spawnSync(
  process.execPath,
  ["--test", "shared/wcTurnArtifact.golden.test.js"],
  { cwd: root, encoding: "utf8" },
);
if (golden.status !== 0) {
  failures.push("wcTurnArtifact.golden.test.js failed");
}

if (failures.length) {
  console.error("[gate:wc-artifact] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `[gate:wc-artifact] OK — follow-ups projection-only; SLO ${slo.passed}/${slo.passed + slo.failed} green`,
);
