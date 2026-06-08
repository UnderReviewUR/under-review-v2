/**
 * Post-deploy WC KV warm — standings, outrights, golden boot, injuries.
 *
 * Production:
 *   $env:CRON_SECRET="..."; $env:WARM_BASE_URL="https://under-review.app"; npm run warm:wc
 *
 * Local API (dev:api on :3001):
 *   npm run warm:wc
 */
import "dotenv/config";

const direct = process.argv.includes("--direct");

async function warmViaHttp() {
  const base = (
    process.env.WARM_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  const secret = process.env.CRON_SECRET;
  const headers = secret ? { Authorization: `Bearer ${secret}` } : {};

  const url = `${base}/api/world-cup?view=warmup&kind=all`;
  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${url}`);
    err.body = body;
    throw err;
  }

  return { mode: "http", url, ...body };
}

async function warmDirect() {
  const { runWcWarmupBundle } = await import("../api/_wcWarmupBundle.js");
  const payload = await runWcWarmupBundle("all");
  return { mode: "direct", ...payload };
}

try {
  const result = direct ? await warmDirect() : await warmViaHttp();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err?.message, body: err?.body }, null, 2));
  process.exit(1);
}
