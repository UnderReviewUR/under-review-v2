import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const tracked = new Set(
  execSync("git ls-files", { encoding: "utf8" })
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((p) => p.replace(/\\/g, "/")),
);

const importRe =
  /(?:import\s+[^'";]+from\s+|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g;
const exts = ["", ".js", ".jsx", ".mjs", ".ts", ".tsx", "/index.js", "/index.jsx"];

function resolveImport(fromFile, spec) {
  const dir = path.dirname(fromFile);
  const base = path.normalize(path.join(dir, spec)).replace(/\\/g, "/");
  for (const e of exts) {
    const cand = base + e;
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

const sources = [...tracked].filter((f) => /\.(jsx?|mjs|tsx?)$/.test(f));
const issues = [];

for (const file of sources) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(text))) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue;
    const resolved = resolveImport(file, spec);
    if (!resolved) {
      issues.push({ importer: file, spec, resolved: null, status: "missing_on_disk" });
      continue;
    }
    const norm = resolved.replace(/\\/g, "/");
    if (!tracked.has(norm)) {
      issues.push({
        importer: file,
        spec,
        resolved: norm,
        status: fs.existsSync(resolved) ? "untracked" : "missing_on_disk",
      });
    }
  }
}

const byTarget = new Map();
for (const row of issues) {
  const key = row.resolved || `${row.spec} (from ${row.importer})`;
  if (!byTarget.has(key)) byTarget.set(key, []);
  byTarget.get(key).push(row);
}

console.log("=== Broken relative imports from TRACKED files ===\n");
for (const [target, rows] of [...byTarget.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${target} [${rows[0].status}]`);
  for (const r of rows) console.log(`  <- ${r.importer}`);
}

const untrackedTargets = [
  ...new Set(issues.filter((i) => i.status === "untracked").map((i) => i.resolved)),
].sort();
console.log("\n=== Untracked files to commit ===\n");
console.log(untrackedTargets.join("\n") || "(none)");
console.log(`\nTotal issue groups: ${byTarget.size}`);

process.exit(byTarget.size > 0 ? 1 : 0);
