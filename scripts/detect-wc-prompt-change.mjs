/**
 * Detect WC prompt / QA / golden-eval surface changes since a git ref.
 * Usage: node scripts/detect-wc-prompt-change.mjs [baseRef]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseRef = process.argv[2] || "HEAD~1";

const PROMPT_PATHS = [
  "api/_urTakeSystemPromptRegistry.js",
  "api/_wcUrTakeQA.js",
  "api/_wcUrTakeContext.js",
  "api/ur-take/handler.js",
  "shared/wcPredictionsRoundup.js",
  "shared/wcCardContractVoice.js",
  "shared/wcUrTakeCompactDelivery.js",
  "shared/wcRoundupCardQA.js",
  "shared/wcPlayLineQA.js",
  "shared/wcPlayerBio.js",
  "shared/wcGoldenEval.js",
  "shared/wcGoldenEval.fixtures.js",
];

const diff = spawnSync(
  "git",
  ["diff", "--name-only", baseRef, "HEAD", "--", ...PROMPT_PATHS],
  { cwd: root, encoding: "utf8" },
);

if (diff.status !== 0) {
  console.error(diff.stderr || "[detect-wc-prompt-change] git diff failed");
  process.exit(diff.status === null ? 1 : diff.status);
}

const changed = diff.stdout
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

if (!changed.length) {
  console.log(JSON.stringify({ changed: false, files: [], baseRef }));
  process.exit(0);
}

console.log(JSON.stringify({ changed: true, files: changed, baseRef }));
process.exit(0);
