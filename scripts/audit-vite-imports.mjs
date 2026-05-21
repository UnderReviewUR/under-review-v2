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

function collectDeps(entryFiles) {
  const queue = [...entryFiles];
  const seen = new Set();
  const issues = [];

  while (queue.length) {
    const file = queue.shift();
    const norm = file.replace(/\\/g, "/");
    if (seen.has(norm)) continue;
    seen.add(norm);

    let text;
    try {
      text = fs.readFileSync(norm, "utf8");
    } catch {
      continue;
    }

    let m;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(text))) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const resolved = resolveImport(norm, spec);
      if (!resolved) {
        issues.push({ importer: norm, spec, resolved: null, status: "missing_on_disk" });
        continue;
      }
      const rnorm = resolved.replace(/\\/g, "/");
      if (!tracked.has(rnorm)) {
        issues.push({
          importer: norm,
          spec,
          resolved: rnorm,
          status: fs.existsSync(resolved) ? "untracked" : "missing_on_disk",
        });
      }
      if (/\.(jsx?|mjs|tsx?)$/.test(rnorm)) queue.push(rnorm);
    }
  }

  return { issues, seen };
}

const entries = [...tracked].filter(
  (f) => f === "src/main.jsx" || f === "src/App.jsx" || (f.startsWith("src/") && /\.(jsx?)$/.test(f)),
);
const { issues } = collectDeps(["src/main.jsx", "src/App.jsx"]);

const byTarget = new Map();
for (const row of issues) {
  const key = row.resolved || `${row.spec} <- ${row.importer}`;
  if (!byTarget.has(key)) byTarget.set(key, []);
  byTarget.get(key).push(row);
}

console.log("=== Vite bundle graph: untracked/missing relative imports ===\n");
for (const [target, rows] of [...byTarget.entries()].sort()) {
  console.log(`${target} [${rows[0].status}]`);
  for (const r of rows) console.log(`  <- ${r.importer}`);
}

const untracked = [
  ...new Set(issues.filter((i) => i.status === "untracked").map((i) => i.resolved)),
].sort();
console.log("\n=== Commit these files ===\n");
console.log(untracked.join("\n") || "(none)");
process.exit(untracked.length > 0 ? 1 : 0);
