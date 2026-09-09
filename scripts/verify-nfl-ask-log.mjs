/**
 * One-shot: hit prod Ask fast-path question + parse recent vercel log JSON.
 * Usage: node scripts/verify-nfl-ask-log.mjs
 */
const BASE = process.env.WARM_BASE_URL || "https://www.under-review.app";

async function main() {
  const question =
    process.env.ASK_Q ||
    "Best player props for Patriots vs Seahawks week 1? Give me Maye and JSN lines.";

  const started = Date.now();
  const res = await fetch(`${BASE}/api/ur-take`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      question,
      sport: "nfl",
      mode: "ask",
    }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  console.log(
    JSON.stringify(
      {
        status: res.status,
        ms: Date.now() - started,
        keys: json ? Object.keys(json) : null,
        lean: json?.lean || json?.take?.lean || null,
        sport: json?.sport || json?.meta?.sport || null,
        error: json?.error || null,
        bodyPreview: String(json?.body || json?.answer || text).slice(0, 240),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
