import { execSync } from "node:child_process";
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

function readAtRef(ref, file) {
  try {
    return execSync(`git show ${ref}:${file}`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function resolveFromContent(fromFile, spec, readFile) {
  const dir = path.dirname(fromFile);
  let base = path.posix.normalize(path.join(dir, spec).replace(/\\/g, "/"));
  for (const e of exts) {
    const cand = base + e;
    if (tracked.has(cand) || readFile(cand)) return cand;
  }
  return null;
}

function auditTree(ref, roots) {
  const queue = [...roots];
  const seen = new Set();
  const issues = [];

  const readFile = (f) => {
    if (tracked.has(f)) return readAtRef(ref, f);
    return null;
  };

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);

    const text = readAtRef(ref, file);
    if (!text) continue;

    let m;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(text))) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const resolved = resolveFromContent(file, spec, readFile);
      if (!resolved) {
        const guess = path.posix.normalize(path.join(path.dirname(file), spec).replace(/\\/g, "/"));
        issues.push({ importer: file, spec, resolved: guess, status: "broken_in_git_tree" });
        continue;
      }
      const withExt = [...exts].map((e) => resolved + e).find((c) => tracked.has(c)) || resolved;
      if (!tracked.has(withExt) && !tracked.has(resolved)) {
        issues.push({ importer: file, spec, resolved, status: "broken_in_git_tree" });
      } else if (/\.(jsx?|mjs)$/.test(withExt)) {
        queue.push(tracked.has(withExt) ? withExt : resolved);
      }
    }
  }

  return issues;
}

const headIssues = auditTree("HEAD", ["src/main.jsx", "src/App.jsx"]);
console.log("=== HEAD tree (production): broken relative imports ===\n");
for (const row of headIssues) {
  console.log(`${row.resolved} <- ${row.importer} (${row.spec})`);
}
console.log(`\nCount: ${headIssues.length}`);
process.exit(headIssues.length > 0 ? 1 : 0);
