import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appPath = path.join(root, "src", "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

// CSS body: lines after `const baseCss = \`` through last rule before closing backtick (file lines 39–477).
const cssInner = lines.slice(38, 477).join("\n");
const stylesDir = path.join(root, "src", "styles");
fs.mkdirSync(stylesDir, { recursive: true });
const cssFile = `/** Global layout + shell styles; injected with theme CSS in App. */
export const baseCss = \`
${cssInner}
\`;
`;
fs.writeFileSync(path.join(stylesDir, "appBaseCss.js"), cssFile, "utf8");

// Golf / NFL embedded objects (through closing `};` before App).
let dataBlock = lines.slice(479, 886).join("\n");
dataBlock =
  "// Embedded golf / NFL reference data for the UI.\n" +
  dataBlock
    .replace("const PGA_PLAYERS", "export const PGA_PLAYERS")
    .replace("const PGA_COURSES", "export const PGA_COURSES")
    .replace("const NFL_PLAYERS", "export const NFL_PLAYERS");
fs.writeFileSync(
  path.join(root, "src", "features", "app", "embedGolfNflData.js"),
  dataBlock + "\n",
  "utf8"
);
console.log("OK: appBaseCss.js, embedGolfNflData.js");
