/**
 * Flagship smoke — local handler + optional production.
 * Usage:
 *   node scripts/smoke-all-flagship.mjs --local
 *   node scripts/smoke-all-flagship.mjs --prod
 *   node scripts/smoke-all-flagship.mjs --local --prod
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const runLocal = process.argv.includes("--local");
const runProd = process.argv.includes("--prod");
const prodBase =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ||
  "https://under-review.app";

/** @type {Array<{ id: string, sport: string, question: string, assert: (j: Record<string, unknown>) => string | null }>} */
const CASES = [
  {
    id: "wc03",
    sport: "worldcup",
    question: "What's the best group-stage value bet right now — one pick, direct answer?",
    assert(j) {
      if (j.fallback) return `fallback:${j.fallbackReason || "unknown"}`;
      const blob = `${j.response || ""}\n${JSON.stringify(j.structured || {})}`;
      if (!/colombia|group\s+k/i.test(blob)) return "missing Colombia / Group K pick";
      if (/VERIFIED CONTEXT/i.test(blob)) return "boilerplate VERIFIED CONTEXT leaked";
      if (/lean:\s*pass/i.test(blob)) return "unexpected Lean: Pass";
      return null;
    },
  },
  {
    id: "wc05",
    sport: "worldcup",
    question: "what happens if a knockout game is tied after 90 minutes",
    assert(j) {
      if (j.fallback) return `fallback:${j.fallbackReason || "unknown"}`;
      const blob = String(j.response || "");
      if (!/extra time|penalt/i.test(blob)) return "missing extra time / penalties";
      if (/lean:\s*pass/i.test(blob)) return "rules question should not Lean: Pass";
      return null;
    },
  },
  {
    id: "nba-finals",
    sport: "nba",
    question:
      "NBA Finals Game 4 tonight (SAS @ NYK): Knicks lead the series 2-1. what is the sharpest angle — spread, total, or key prop — and what one thing flips the read?",
    assert(j) {
      if (j.fallback) return `fallback:${j.fallbackReason || "unknown"}`;
      const blob = String(j.response || "");
      if (blob.length < 40) return "response too short";
      if (/api_success_fallback|provider_non_ok/i.test(blob)) return "raw debug leaked in response";
      return null;
    },
  },
  {
    id: "nba04",
    sport: "nba",
    question: "what does spread mean in basketball betting",
    assert(j) {
      if (j.fallback) return `fallback:${j.fallbackReason || "unknown"}`;
      if (!/spread|points|favorite/i.test(String(j.response || ""))) return "missing spread explainer";
      return null;
    },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function invokeLocal(c) {
  process.env.UR_TAKE_REQUIRE_AUTH = "false";
  const handler = (await import("../api/ur-take/handler.js")).default;
  let payload = null;
  let status = 200;
  const req = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { question: c.question, sportHint: c.sport, sport: c.sport },
  };
  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      status = code;
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(body) {
      payload = body;
    },
    end() {},
  };
  const t0 = Date.now();
  await handler(req, res);
  return { status, elapsedMs: Date.now() - t0, payload };
}

async function invokeProd(c) {
  const t0 = Date.now();
  const res = await fetch(`${prodBase}/api/ur-take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: c.question, sport: c.sport }),
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { response: text.slice(0, 500) };
  }
  return { status: res.status, elapsedMs: Date.now() - t0, payload };
}

async function runSuite(label, invoke) {
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (const c of CASES) {
    let row = { suite: label, id: c.id, sport: c.sport, ok: false };
    try {
      const { status, elapsedMs, payload } = await invoke(c);
      const fail = c.assert(payload || {});
      row = {
        ...row,
        status,
        elapsedMs,
        ok: status === 200 && !fail,
        fail: fail || null,
        fallback: Boolean(payload?.fallback),
        fallbackReason: payload?.fallbackReason || null,
        head: String(payload?.response || payload?.error || "").slice(0, 160),
        callType: payload?.structured?.callType || null,
      };
    } catch (e) {
      row = { ...row, ok: false, fail: e?.message || String(e) };
    }
    rows.push(row);
    console.log(JSON.stringify(row));
    if (label === "prod") await sleep(28000);
  }
  return rows;
}

if (!runLocal && !runProd) {
  console.error("Pass --local and/or --prod");
  process.exit(1);
}

/** @type {Array<Record<string, unknown>>} */
const all = [];
if (runLocal) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.warn(JSON.stringify({ suite: "local", warn: "ANTHROPIC_API_KEY missing — local LLM cases may fallback" }));
  }
  all.push(...(await runSuite("local", invokeLocal)));
}
if (runProd) {
  all.push(...(await runSuite("prod", invokeProd)));
}

const failed = all.filter((r) => !r.ok);
console.log(
  JSON.stringify({
    summary: {
      total: all.length,
      passed: all.length - failed.length,
      failed: failed.length,
      failedIds: failed.map((r) => `${r.suite}:${r.id}`),
    },
  }),
);
process.exit(failed.length ? 1 : 0);
