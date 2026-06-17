#!/usr/bin/env node
/**
 * One-shot offline WC ship check — no API / LLM credits.
 * Writes wc-offline-verification.txt in repo root for easy reading in the editor.
 *
 * Usage: npm run verify:wc-offline
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const reportPath = join(root, "wc-offline-verification.txt");

/** @type {string[]} */
const lines = [
  `WC offline verification — ${new Date().toISOString()}`,
  "",
];

function runStep(label, command, args) {
  lines.push(`── ${label} ──`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
  const out = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (out) lines.push(out);
  lines.push(result.status === 0 ? "RESULT: PASS" : `RESULT: FAIL (exit ${result.status})`);
  lines.push("");
  return result.status === 0;
}

const stressOk = runStep(
  "stress:wc-phases",
  process.execPath,
  ["scripts/stress-wc-phases-offline.mjs"],
);
const auditOk = runStep(
  "audit:wc-card-contract",
  process.execPath,
  ["scripts/run-wc-card-contract-gate.mjs"],
);

const allOk = stressOk && auditOk;
lines.push(allOk ? "OVERALL: PASS — safe to push branch for CI / review" : "OVERALL: FAIL — do not merge");
lines.push("");
lines.push("Note: offline checks cover deterministic prebuilt paths only, not live LLM copy.");

writeFileSync(reportPath, lines.join("\n"), "utf8");
console.log(lines.join("\n"));
console.log(`\nReport saved: ${reportPath}`);
process.exitCode = allOk ? 0 : 1;
