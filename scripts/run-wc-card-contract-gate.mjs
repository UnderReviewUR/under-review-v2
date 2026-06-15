#!/usr/bin/env node
/**
 * WC Card Contract CI gate — unit tests + offline thread/single-turn scorers.
 *
 * Usage:
 *   npm run audit:wc-card-contract
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runWcCardContractSingleTurnGate,
  runWcCardContractThreadGate,
} from "../shared/wcCardContractGate.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const UNIT_FILES = [
  "api/wcCardContractGolden.test.js",
  "shared/wcCardContractGate.test.js",
  "shared/wcCardContractFollowUpScorer.test.js",
  "shared/wcFollowUpExplain.test.js",
  "shared/wcFixtureMatchupPrebuilt.test.js",
  "shared/wcUrTakeCompactDelivery.test.js",
  "src/lib/wcTakeCardUi.test.js",
];

console.log("=== WC Card Contract unit tests ===\n");
const testRun = spawnSync(process.execPath, ["--test", ...UNIT_FILES], {
  cwd: root,
  stdio: "inherit",
});
if (testRun.status !== 0) {
  process.exit(testRun.status === null ? 1 : testRun.status);
}

console.log("\n=== Single-turn layout + voice gate ===\n");
const single = runWcCardContractSingleTurnGate();
for (const row of single.rows) {
  console.log(
    `${row.ok ? "PASS" : "FAIL"}  ${row.id.padEnd(32)} ${row.ok ? "" : row.issues.join(", ")}`,
  );
}

console.log("\n=== Thread intent + explain + routing gate ===\n");
const thread = runWcCardContractThreadGate();
for (const row of thread.rows) {
  console.log(
    `${row.ok ? "PASS" : "FAIL"}  ${row.id.padEnd(32)} ${row.section.padEnd(12)} ${row.ok ? "" : row.issues.join(", ")}`,
  );
}

const totalPass = single.pass + thread.pass;
const totalFail = single.fail + thread.fail;
console.log(`\n${totalPass}/${totalPass + totalFail} gate checks passed`);

if (totalFail > 0) {
  console.error("\nWC Card Contract gate FAILED");
  process.exitCode = 1;
} else {
  console.log("\nWC Card Contract gate PASSED");
}
