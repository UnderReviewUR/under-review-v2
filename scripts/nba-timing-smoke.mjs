/**
 * Starts dev-api-server with stdio inherited so JSON logs print here (no pipe buffering).
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const child = spawn(process.execPath, ["dev-api-server.mjs"], {
  cwd: root,
  env: { ...process.env },
  stdio: "inherit",
  detached: false,
});

await new Promise((r) => setTimeout(r, 2500));

const base = "http://localhost:3001";

async function time(label, fn) {
  const t0 = Date.now();
  await fn();
  console.log(`\n>>> ${label}_client_ms=${Date.now() - t0}\n`);
}

await time("cold_board", () =>
  fetch(`${base}/api/nba?view=board`).then((r) => r.text()),
);
await time("cached_board", () =>
  fetch(`${base}/api/nba?view=board`).then((r) => r.text()),
);

await time("ur_take_playoff", () =>
  fetch(`${base}/api/ur-take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Best playoff prop angle tonight?",
      sportHint: "nba",
    }),
  }).then((r) => r.text()),
);

await time("ur_take_lal_okc", () =>
  fetch(`${base}/api/ur-take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Best prop angle for LAL vs OKC tonight?",
      sportHint: "nba",
    }),
  }).then((r) => r.text()),
);

child.kill("SIGTERM");
await new Promise((r) => setTimeout(r, 400));
