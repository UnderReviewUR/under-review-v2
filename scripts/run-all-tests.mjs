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

process.exit(result.status === null ? 1 : result.status);
