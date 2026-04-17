import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appPath = path.join(root, "src", "App.jsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const head = lines.slice(0, 37);
const tail = lines.slice(886);

const inject = [
  ...head,
  'import { baseCss } from "./styles/appBaseCss.js";',
  'import { PGA_PLAYERS, PGA_COURSES, NFL_PLAYERS } from "./features/app/embedGolfNflData.js";',
  "",
  ...tail,
];

fs.writeFileSync(appPath, inject.join("\n"), "utf8");
console.log("OK: App.jsx rewired");
