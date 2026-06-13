/**
 * Probe production ur-take latency.
 * Usage: node scripts/probe-ur-take-prod.mjs
 */
const BASE = "https://www.under-review.app/api/ur-take";

const CASES = [
  { label: "cross-group value", question: "What's the best group-stage value bet right now — one pick, direct answer?" },
  { label: "USA vs PAR", question: "Who wins USA vs PAR?" },
  { label: "sneaky tomorrow", question: "What are sneaky good bets for World Cup matches tomorrow?" },
];

for (const c of CASES) {
  const t0 = Date.now();
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
      body: JSON.stringify({ question: c.question, sportHint: "worldcup", structured: true }),
    });
    const ms = Date.now() - t0;
    const payload = await res.json().catch(() => ({}));
    console.log(
      JSON.stringify({
        label: c.label,
        httpStatus: res.status,
        ms,
        fallback: payload?.fallback,
        lean: String(payload?.response || payload?.error || "").slice(0, 100),
      }),
    );
  } catch (err) {
    console.log(JSON.stringify({ label: c.label, ms: Date.now() - t0, error: err?.message }));
  }
}
