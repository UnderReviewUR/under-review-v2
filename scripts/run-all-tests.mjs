/**
 * Discover and run all app *.test.js files (replaces the manual list in package.json).
 * Excludes vendored openf1/ and node_modules.
 */
import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = globSync("**/*.test.js", {
  cwd: root,
  exclude: (p) => p.includes("node_modules") || p.startsWith("openf1"),
}).sort();

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
