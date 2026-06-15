#!/usr/bin/env node
/**
 * Offline WC Card Contract audit — extended report (no LLM).
 * CI uses run-wc-card-contract-gate.mjs; this script is for local diagnostics.
 */
import {
  runWcCardContractSingleTurnGate,
  runWcCardContractThreadGate,
} from "../shared/wcCardContractGate.js";

let pass = 0;
let fail = 0;

console.log("=== Single-turn layout + voice ===\n");
const single = runWcCardContractSingleTurnGate();
for (const row of single.rows) {
  if (row.ok) pass += 1;
  else fail += 1;
  console.log(
    `${row.ok ? "PASS" : "FAIL"}  ${row.id.padEnd(32)} ${row.ok ? "" : row.issues.join(", ")}`,
  );
}

console.log(`\n=== Thread gate ===\n`);
const thread = runWcCardContractThreadGate();
for (const row of thread.rows) {
  if (row.ok) pass += 1;
  else fail += 1;
  console.log(
    `${row.ok ? "PASS" : "FAIL"}  ${row.id.padEnd(32)} ${row.section.padEnd(12)} ${row.ok ? "" : row.issues.join(", ")}`,
  );
}

console.log(`\n${pass}/${pass + fail} offline checks passed`);
process.exitCode = fail === 0 ? 0 : 1;
