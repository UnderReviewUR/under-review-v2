/**
 * Discover and run all app *.test.js files (replaces the manual list in package.json).
 * Excludes vendored openf1/ and node_modules.
 *
 * WC props contract runs FIRST so it is never skipped by unrelated unit failures.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Node 20-compatible recursive *.test.js discovery (node:fs globSync is Node 22+).
 * @param {string} dir
 * @param {string[]} [acc]
 */
function collectTestFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "openf1" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTestFiles(full, acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      acc.push(path.relative(root, full));
    }
  }
  return acc;
}

console.error("[test] Running WC props routing contract (Phase 1.5) — first");
const contract = spawnSync(process.execPath, ["scripts/wc-props-routing-contract.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
const contractExit = contract.status === null ? 1 : contract.status;
if (contractExit !== 0) {
  process.exit(contractExit);
}

const files = collectTestFiles(root).sort();

if (files.length === 0) {
  console.error("[test] No *.test.js files found");
  process.exit(1);
}

console.error(`[test] Running ${files.length} test files`);

const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

const unitExit = result.status === null ? 1 : result.status;
if (unitExit !== 0) {
  process.exit(unitExit);
}

console.error("[test] Running WC golden eval (offline)");
const golden = spawnSync(process.execPath, ["scripts/run-wc-golden-eval.mjs", "--offline"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(golden.status === null ? 1 : golden.status);
