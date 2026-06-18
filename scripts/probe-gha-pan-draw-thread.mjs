/**
 * Probe GHA vs PAN live thread → draw-% follow-up (routing + response shape).
 * Usage: node scripts/probe-gha-pan-draw-thread.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://www.under-review.app";

async function postUrTake(body) {
  const res = await fetch(`${BASE}/api/ur-take`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
    body: JSON.stringify({ structured: true, sportHint: "worldcup", ...body }),
  });
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, payload };
}

function summarizeTurn(label, { status, payload }) {
  const s = payload.structured || {};
  const text = String(payload.response || "").trim();
  const structuralBoilerplate =
    /structural longshot|Contender in a competitive group|first World Cup appearance/i.test(text) ||
    /structural longshot/i.test(String(s.lean || s.call || ""));
  const liveProbabilityCue =
    /\b\d{1,2}(?:\.\d+)?%\b/i.test(text) ||
    /\b\d{1,2}(?:\.\d+)?%\b/i.test(String(s.call || "")) ||
    /\b\d{1,2}(?:\.\d+)?%\b/i.test(String(s.whyNow || "")) ||
    /\bimplied\b/i.test(text) ||
    /0\s*[-–]\s*0/i.test(text) ||
    /\blive\b/i.test(text);
  return {
    label,
    httpStatus: status,
    requestId: payload.requestId || null,
    wcIntent: payload.wcIntent || null,
    liveMode: payload.liveMode ?? null,
    passKind: payload.passKind || payload.mode || null,
    callType: s.callType || null,
    lean: String(s.lean || "").slice(0, 160),
    call: String(s.call || "").slice(0, 120),
    whyNow: String(s.whyNow || "").slice(0, 160),
    fixture: s.fixtureHome && s.fixtureAway ? `${s.fixtureHome}–${s.fixtureAway}` : null,
    responseHead: text.slice(0, 280),
    gate1: {
      wcIntentMatchup: payload.wcIntent === "MATCHUP",
      notStructuralBoilerplate: !structuralBoilerplate,
    },
    gate2: {
      liveProbabilityCue,
      structuralBoilerplate,
    },
  };
}

console.log(`Probing ${BASE} …\n`);

const turn1 = await postUrTake({ question: "Best live angle on GHA vs PAN right now?" });
const t1 = summarizeTurn("turn1_live_angle", turn1);
console.log(JSON.stringify(t1, null, 2));

const hist = [
  { role: "user", content: "Best live angle on GHA vs PAN right now?" },
  {
    role: "assistant",
    content: turn1.payload?.response || t1.lean || "Lean Under 2.5 goals",
    structured: turn1.payload?.structured || {
      callType: "matchup",
      fixtureHome: "GHA",
      fixtureAway: "PAN",
      lean: "Lean Under 2.5 goals",
      whyNow: "0-0 live",
      liveMode: true,
    },
  },
];

const turn2 = await postUrTake({
  question: "% chance it ends in a draw?",
  history: hist,
});
const t2 = summarizeTurn("turn2_draw_percent", turn2);
console.log("\n" + JSON.stringify(t2, null, 2));

const routingOk = t2.gate1.wcIntentMatchup && t2.httpStatus === 200;
const answerOk = t2.gate2.liveProbabilityCue && !t2.gate2.structuralBoilerplate;

console.log("\n--- verdict ---");
console.log(
  JSON.stringify(
    {
      routingOk,
      answerOk,
      overall: routingOk && answerOk,
      note: routingOk && !answerOk ? "Gate 2 suspect — check VERIFIED CONTEXT / matchDetails" : null,
    },
    null,
    2,
  ),
);
