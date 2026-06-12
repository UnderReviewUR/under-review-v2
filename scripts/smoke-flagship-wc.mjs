/**
 * Smoke test flagship WC prompts against production (spaced to avoid rate limits).
 */
const prompts = [
  ["wc03", "What's the best group-stage value bet right now — one pick, direct answer?"],
  [
    "wc04",
    "Which group is most mispriced for advancement — name #1 and runner-up with numbers.",
  ],
  ["wc05", "what happens if a knockout game is tied after 90 minutes"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = process.argv[2] || "https://under-review.app";

for (const [id, question] of prompts) {
  const t0 = Date.now();
  let status = 0;
  let headline = "";
  let err = "";
  try {
    const res = await fetch(`${base}/api/ur-take`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, sport: "worldcup" }),
    });
    status = res.status;
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      headline = String(j.response || j.take || j.error || text).slice(0, 200);
    } catch {
      headline = text.slice(0, 200);
    }
  } catch (e) {
    err = e.message;
  }
  console.log(JSON.stringify({ id, status, elapsedMs: Date.now() - t0, headline, err }));
  await sleep(26000);
}
