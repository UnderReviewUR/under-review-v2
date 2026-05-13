/**
 * Timing smoke @ working tree: captures `nba_board_complete` + `ur_take_complete` JSON logs.
 * Loads `.env` (needs BALLDONTLIE_API_KEY, ANTHROPIC_API_KEY for full UR Take; set UR_TAKE_REQUIRE_AUTH=false locally).
 *
 * Usage: node scripts/nba-smoke-capture.mjs
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let gitShort = "";
try {
  gitShort = execSync("git rev-parse --short HEAD", {
    encoding: "utf8",
    cwd: new URL("..", import.meta.url),
  }).trim();
} catch {
  gitShort = "";
}

let captureStep = null;
const captured = [];
const origLog = console.log;
console.log = (first, ...rest) => {
  if (typeof first === "string" && first.startsWith("{")) {
    try {
      const j = JSON.parse(first);
      if (j.event === "nba_board_complete" || j.event === "ur_take_complete") {
        captured.push({ step: captureStep, ...j });
      }
    } catch {
      /* ignore */
    }
  }
  origLog(first, ...rest);
};

const { default: nbaHandler } = await import("../api/nba.js");
const { default: urTakeHandler } = await import("../api/ur-take.js");

function mockRes() {
  return {
    setHeader() {},
    status() {
      return this;
    },
    json() {
      return this;
    },
  };
}

captureStep = "1_cold_board";
await nbaHandler(
  { method: "GET", query: { view: "board" }, headers: {} },
  mockRes(),
);

captureStep = "2_cached_board";
await nbaHandler(
  { method: "GET", query: { view: "board" }, headers: {} },
  mockRes(),
);

for (const [step, question] of [
  ["3_ur_take_playoff", "Best playoff prop angle tonight?"],
  ["4_ur_take_lal_okc", "Best prop angle for LAL vs OKC tonight?"],
]) {
  captureStep = step;
  await urTakeHandler(
    {
      method: "POST",
      headers: {},
      body: { question },
    },
    mockRes(),
  );
}

console.log = origLog;
const outPath = join(__dirname, "nba-smoke-captured.json");
const payload = `${JSON.stringify({ gitShort, captured }, null, 2)}\n`;
writeFileSync(outPath, payload, "utf8");
process.stderr.write(`[nba-smoke-capture] wrote ${outPath}\n`);
