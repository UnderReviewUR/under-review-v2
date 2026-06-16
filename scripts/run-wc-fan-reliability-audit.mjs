#!/usr/bin/env node
/**
 * Fan-style WC reliability audit (offline).
 *
 * Usage:
 *   npm run audit:wc-fan-reliability
 */
import { runWcFanReliabilityAudit } from "../shared/wcFanReliabilityAudit.js";

const { rows, pass, fail } = runWcFanReliabilityAudit();

console.log("=== WC Fan Reliability Audit ===\n");
for (const row of rows) {
  console.log(
    `${row.ok ? "PASS" : "FAIL"}  ${row.id.padEnd(42)} ${row.ok ? "" : row.issues.join(", ")}`,
  );
  if (row.notes && !row.ok) console.log(`       ${row.notes}`);
}

console.log(`\n${pass}/${pass + fail} fan reliability checks passed`);
if (fail > 0) {
  console.error("\nWC Fan Reliability audit FAILED");
  process.exitCode = 1;
} else {
  console.log("\nWC Fan Reliability audit PASSED");
}
