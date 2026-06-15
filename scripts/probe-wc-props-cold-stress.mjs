#!/usr/bin/env node
/**
 * Cold-stress probe: implicit SWE/TUN player-props follow-up (new thread each run).
 *
 * Usage:
 *   node scripts/probe-wc-props-cold-stress.mjs
 *   node scripts/probe-wc-props-cold-stress.mjs --runs 10 --wait-ms 150000
 *   UR_TAKE_URL=http://localhost:3000/api/ur-take node scripts/probe-wc-props-cold-stress.mjs
 */

const args = process.argv.slice(2);
function readFlag(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v != null ? v : fallback;
}

const runs = Math.max(1, Number(readFlag("--runs", "10")) || 10);
const waitMs = Math.max(0, Number(readFlag("--wait-ms", "150000")) || 150000);
const url = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";

const history = [
  { role: "user", content: "Best bet on SWE vs TUN tonight?" },
  {
    role: "assistant",
    content: "Lean Under 2.5 goals on SWE vs TUN",
    structured: {
      fixtureHome: "SWE",
      fixtureAway: "TUN",
      wcEventId: "760424",
      call: "Pass on ML — Lean Under 2.5 goals",
      lean: "Lean Under 2.5 goals",
    },
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function summarizePayload(p) {
  const s = p.structured || {};
  const lean = String(s.lean || "");
  const numberedLegs = (lean.match(/^\s*\d+\./gm) || []).length;
  return {
    http: p._http,
    wcEventId: p.wcEventId ?? s.wcEventId ?? null,
    callType: p.callType ?? s.callType ?? null,
    coldStart: p.coldStart ?? null,
    attempts: p.playerPropsLoadMeta?.attempts ?? null,
    loadMs: p.playerPropsLoadMeta?.loadMs ?? null,
    numberedLegs,
    pass: /\bpass\b/i.test(String(s.call || lean)),
    underRepeat: /under 2\.5/i.test(lean) && numberedLegs === 0,
    leanPreview: lean.slice(0, 220),
  };
}

/** @type {ReturnType<typeof summarizePayload>[]} */
const results = [];

for (let i = 0; i < runs; i += 1) {
  if (i > 0 && waitMs > 0) {
    console.log(`[probe] waiting ${Math.round(waitMs / 1000)}s before run ${i + 1}/${runs}…`);
    await sleep(waitMs);
  }

  const body = {
    question: "Best player props?",
    sportHint: "worldcup",
    structured: true,
    history,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json();
  payload._http = res.status;
  const summary = summarizePayload(payload);
  results.push(summary);
  console.log(`[probe] run ${i + 1}/${runs}`, JSON.stringify(summary));
}

const ok = results.filter(
  (r) => r.http === 200 && r.numberedLegs >= 5 && !r.pass && !r.underRepeat,
);
const parlayOk = results.filter((r) => r.http === 200 && r.numberedLegs >= 4);

console.log(
  JSON.stringify(
    {
      url,
      runs,
      waitMs,
      success5Leg: ok.length,
      successRate: `${ok.length}/${runs}`,
      failures: results.filter((r) => !ok.includes(r)),
    },
    null,
    2,
  ),
);

process.exit(ok.length === runs ? 0 : 1);
