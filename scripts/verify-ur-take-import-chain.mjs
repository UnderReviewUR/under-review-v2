import fs from "fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const BAD =
  /golf-odds-scrape|nba-props-scrape|_pgaChampionshipOddsGraphql|_pgaChampionshipOddsPuppeteer|_nbaPropsFetch/i;

function resolveImport(spec, fromFile) {
  if (spec.startsWith("../shared/")) return spec.replace(/^\.\.\//, "") + (spec.endsWith(".js") ? "" : ".js");
  if (spec.startsWith("../src/")) return spec.replace(/^\.\.\//, "") + (spec.endsWith(".js") ? "" : ".js");
  if (spec.startsWith("./")) {
    const base = fromFile.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    return `${base}/${spec.slice(2)}`.replace(/^api\//, "api/");
  }
  return null;
}

const visited = new Set();
const queue = ["api/ur-take.js"];
const hits = [];

while (queue.length) {
  const file = queue.shift();
  if (!file || visited.has(file)) continue;
  visited.add(file);
  let text;
  try {
    text = fs.readFileSync(`${ROOT}/${file}`.replace(/\//g, "\\"), "utf8");
  } catch {
    continue;
  }
  for (const m of text.matchAll(/from ["']([^"']+)["']/g)) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue;
    const resolved = resolveImport(spec, file);
    if (!resolved) continue;
    const norm = resolved.replace(/\\/g, "/");
    if (BAD.test(norm)) hits.push(`${file} -> ${norm}`);
    if (norm.startsWith("api/") || norm.startsWith("shared/")) queue.push(norm);
  }
}

if (hits.length) {
  console.error("BAD SCRAPE IMPORTS IN UR-TAKE CHAIN:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`ur-take chain OK (${visited.size} modules, no scrape-only imports)`);
