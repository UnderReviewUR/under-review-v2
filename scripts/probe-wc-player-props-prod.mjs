/**
 * Prod probe: WC player props, parlays, and routing edge cases.
 * Usage: node scripts/probe-wc-player-props-prod.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { prepareWcCardFaceDisplay } from "../src/lib/wcTakeCardUi.js";
import { getWcContextFollowUpChips } from "../shared/wcUrTakeFollowUps.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

const BASE = (process.argv[2] || "https://www.under-review.app").replace(/\/$/, "");
const OUT = path.resolve(
  import.meta.dirname,
  `probe-wc-player-props-${Date.now()}.json`,
);

/** @type {Array<{ id: string, category: string, question: string, expect?: Record<string, unknown> }>} */
const CASES = [
  // Fixture multi-prop (primary bug)
  { id: "fix-01", category: "fixture_props", question: "Best player props for Ecuador vs Ivory Coast?" },
  { id: "fix-02", category: "fixture_props", question: "Best player props for ECU vs CIV?" },
  { id: "fix-03", category: "fixture_props", question: "What are the best player props for Ecuador vs Ivory Coast?" },
  { id: "fix-04", category: "fixture_props", question: "Player props for Ivory Coast vs Ecuador?" },
  { id: "fix-05", category: "fixture_props", question: "Top player props on Ecuador vs CIV tonight?" },
  { id: "fix-06", category: "fixture_props", question: "Any good player props for ECU-CIV?" },

  // Slate / generic (What-as-player bug)
  { id: "slate-01", category: "slate_props", question: "What are the best player props for the remaining matches?" },
  { id: "slate-02", category: "slate_props", question: "Best player props tonight?" },
  { id: "slate-03", category: "slate_props", question: "What player props look good for tomorrow's World Cup games?" },
  { id: "slate-04", category: "slate_props", question: "Sneaky player props for the group stage?" },
  { id: "slate-06", category: "slate_props", question: "Best player props for today's remaining matches?" },

  // Parlay slate + fixture
  { id: "par-01", category: "parlay", question: "4 player parlay for CIV vs ECU" },
  { id: "par-02", category: "parlay", question: "4 player parlay for Ecuador vs Ivory Coast" },
  { id: "par-03", category: "parlay", question: "Best player parlays for remaining matches?" },
  { id: "par-04", category: "parlay", question: "Build me a 3-leg player prop parlay for ECU vs CIV" },
  { id: "par-05", category: "parlay", question: "Give me a ranked 4-player prop parlay for today's World Cup games" },

  // Conditional / combo legs
  { id: "combo-01", category: "combo", question: "Jiménez to score AND Valencia to assist for ECU vs CIV" },
  { id: "combo-02", category: "combo", question: "Both Jackson and Valencia to score vs Ecuador vs Ivory Coast" },
  { id: "combo-03", category: "combo", question: "Valencia anytime scorer + Jackson first scorer ECU vs CIV" },
  { id: "combo-04", category: "combo", question: "Player parlay: Valencia and Jackson both to score" },

  // Named single prop (control)
  { id: "named-01", category: "named_prop", question: "Enner Valencia anytime scorer ECU vs CIV" },
  { id: "named-02", category: "named_prop", question: "Will Enner Valencia score vs Ivory Coast?" },
  { id: "named-03", category: "named_prop", question: "Nicolas Jackson shots on target prop CIV vs ECU" },

  // Routing controls (must NOT be Under 1.5 / wrong path)
  { id: "ctrl-01", category: "routing", question: "Who wins CIV vs ECU?", expect: { intent: "MATCHUP" } },
  { id: "ctrl-02", category: "routing", question: "What are CIV's chances to win vs ECU?", expect: { intent: "MATCHUP" } },
  { id: "ctrl-03", category: "routing", question: "Under 1.5 goals CIV vs ECU?", expect: { intent: "MATCHUP" } },
  { id: "ctrl-04", category: "routing", question: "CIV vs ECU at 70 minutes — who wins?", expect: { intent: "MATCHUP" } },
];

const CONCURRENCY = 2;

/**
 * @param {string} question
 */
async function fetchTake(question) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/ur-take`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ur-take-structured": "1",
    },
    body: JSON.stringify({ question, sportHint: "worldcup", structured: true }),
  });
  const ms = Date.now() - t0;
  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = { _parseError: true };
  }
  return { httpStatus: res.status, ms, payload };
}

/**
 * @param {typeof CASES[0]} c
 * @param {{ httpStatus: number, ms: number, payload: Record<string, unknown> }} raw
 */
function evaluateCase(c, raw) {
  const p = raw.payload || {};
  const s = /** @type {Record<string, unknown>} */ (p.structured || {});
  const lean = String(s.lean || "").trim();
  const call = String(s.call || "").trim();
  const why = String(s.why || "").trim();
  const callType = String(s.callType || "").trim();
  const intent = String(p.wcIntent || "").trim();
  const flags = [];
  const ok = [];

  const face = prepareWcCardFaceDisplay({
    callType,
    call,
    lean,
    why,
    focusLayout: true,
    question: c.question,
  });

  const chips = getWcContextFollowUpChips(
    {
      wcIntent: intent || WC_INTENT.PLAYER_PROP,
      structured: s,
      wcEventId: p.wcEventId || null,
    },
    c.question,
  );

  const numberedCount = (lean.match(/^\s*\d+\.\s+/gm) || []).length;
  const isPass = /^pass\b/i.test(call) || /^pass\b/i.test(lean) || callType.includes("pass");

  if (raw.httpStatus !== 200) flags.push(`http_${raw.httpStatus}`);
  if (p.fallback) flags.push(`fallback:${p.fallbackReason || "yes"}`);

  if (c.category === "fixture_props") {
    if (intent !== "PLAYER_PROP") flags.push(`wrong_intent:${intent || "none"}`);
    else ok.push("intent_PLAYER_PROP");
    if (/lean his\b/i.test(lean) || /lean his\b/i.test(call) || /lean his\b/i.test(face.headline)) {
      flags.push("truncated_lean_his");
    }
    if (chips.some((chip) => /Who wins Best player props/i.test(chip))) {
      flags.push("mangled_who_wins_chip");
    } else ok.push("chips_ok");
    if (numberedCount >= 2) ok.push(`numbered_list_${numberedCount}`);
    else if (isPass) ok.push("pass_when_no_lines");
    else flags.push(`expected_numbered_list_got_${numberedCount}`);
    if (/\(\+\d+ more\)/.test(face.headline)) ok.push("headline_plus_more");
    if (face.headline.endsWith("…") && !/\(\+\d+ more\)/.test(face.headline)) {
      flags.push("headline_truncated");
    }
    if (callType === "matchup") flags.push("wrong_callType_matchup");
    if (/\bUnder\s+1\.5\b/i.test(call) || /\bUnder\s+1\.5\b/i.test(lean)) {
      flags.push("misrouted_under_1_5");
    }
  }

  if (c.category === "slate_props") {
    if (intent !== "PLAYER_PROP") flags.push(`wrong_intent:${intent || "none"}`);
    if (/No posted What are the/i.test(call) || /instead of What/i.test(chips.join(" "))) {
      flags.push("what_as_player_bug");
    } else ok.push("no_what_player_bug");
    if (isPass) ok.push("pass_or_honest");
  }

  if (c.category === "parlay") {
    if (intent !== "PLAYER_PROP") flags.push(`wrong_intent:${intent || "none"}`);
    else ok.push("intent_PLAYER_PROP");
    if (/\bUnder\s+1\.5\b/i.test(call) || /\bUnder\s+1\.5\b/i.test(lean)) {
      flags.push("misrouted_under_1_5");
    }
    if (numberedCount >= 2 || /parlay/i.test(lean) || /parlay/i.test(call)) {
      ok.push("parlay_shape");
    } else if (isPass) ok.push("pass_no_parlay_lines");
    else flags.push("weak_parlay_shape");
  }

  if (c.category === "combo") {
    if (intent !== "PLAYER_PROP") flags.push(`wrong_intent:${intent || "none"}`);
    if (/\bUnder\s+1\.5\b/i.test(call)) flags.push("misrouted_under_1_5");
    if (/both|and|\+/i.test(lean) || /both|and|\+/i.test(call) || isPass) {
      ok.push("combo_or_pass");
    } else flags.push("unclear_combo_handling");
  }

  if (c.category === "named_prop") {
    if (intent !== "PLAYER_PROP") flags.push(`wrong_intent:${intent || "none"}`);
    if (/Valencia|Jackson/i.test(call + lean)) ok.push("names_player");
    else if (isPass) ok.push("pass_named");
    else flags.push("missing_player_name");
  }

  if (c.category === "routing") {
    const want = c.expect?.intent;
    if (want && intent !== want) flags.push(`wrong_intent:${intent}_want_${want}`);
    else if (want) ok.push(`intent_${want}`);
    if (/\bUnder\s+1\.5\b/i.test(call) && /parlay/i.test(c.question)) {
      flags.push("parlay_became_under");
    }
  }

  return {
    id: c.id,
    category: c.category,
    question: c.question,
    httpStatus: raw.httpStatus,
    ms: raw.ms,
    wcIntent: intent,
    callType,
    call: call.slice(0, 120),
    lean: lean.slice(0, 280),
    headline: face.headline,
    whyFace: String(face.sections?.why || "").slice(0, 280),
    numberedCount,
    chips: chips.slice(0, 4),
    flags,
    ok,
    pass: flags.length === 0,
  };
}

async function runPool(items, worker, limit) {
  /** @type {Awaited<ReturnType<typeof worker>>[]} */
  const out = [];
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= items.length) return;
    out[idx] = await worker(items[idx]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return out;
}

console.log(`Probing ${BASE} — ${CASES.length} cases (concurrency ${CONCURRENCY})…`);
const started = Date.now();

const results = await runPool(
  CASES,
  async (c) => {
    process.stdout.write(`  ${c.id}…`);
    try {
      const raw = await fetchTake(c.question);
      const ev = evaluateCase(c, raw);
      process.stdout.write(` ${ev.pass ? "OK" : "FAIL"} (${raw.ms}ms)\n`);
      return ev;
    } catch (err) {
      process.stdout.write(` ERR\n`);
      return {
        id: c.id,
        category: c.category,
        question: c.question,
        flags: [`fetch_error:${err?.message}`],
        ok: [],
        pass: false,
      };
    }
  },
  CONCURRENCY,
);

const summary = {
  base: BASE,
  at: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
  byCategory: {},
  results,
};

for (const r of results) {
  summary.byCategory[r.category] = summary.byCategory[r.category] || { pass: 0, fail: 0 };
  if (r.pass) summary.byCategory[r.category].pass++;
  else summary.byCategory[r.category].fail++;
}

fs.writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");
console.log("\n=== SUMMARY ===");
console.log(JSON.stringify({ ...summary, results: undefined }, null, 2));
console.log("\nFailures:");
for (const r of results.filter((x) => !x.pass)) {
  console.log(`  ${r.id} [${r.category}]: ${r.flags.join(", ")}`);
  console.log(`    Q: ${r.question}`);
  if (r.headline) console.log(`    headline: ${r.headline}`);
  if (r.lean) console.log(`    lean: ${r.lean.slice(0, 140)}`);
}
console.log(`\nFull log: ${OUT}`);
