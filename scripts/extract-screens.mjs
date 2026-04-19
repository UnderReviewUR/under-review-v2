import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appPath = path.join(root, "src/App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

/** 1-based line numbers inclusive start, exclusive end (slice style on 0-based: startLine-1, endLine) */
function sliceLines(start1, end1Exclusive) {
  return lines.slice(start1 - 1, end1Exclusive - 1).join("\n");
}

const extracts = {
  tennis: [2218, 2367],
  nfl: [2371, 2400],
  f1: [2445, 2512],
  nba: [2516, 2593],
  mlb: [2597, 2696],
  golf: [2701, 2793],
  ask: [3249, 3271],
};

for (const [name, [a, b]] of Object.entries(extracts)) {
  const body = sliceLines(a, b);
  fs.writeFileSync(path.join(root, `src/screens/_${name}_body.txt`), body);
}
