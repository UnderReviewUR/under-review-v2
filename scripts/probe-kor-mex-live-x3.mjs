/**
 * Three consecutive prod probes — MEX/KOR named player shots ask.
 */
const BASE = process.argv[2] || "https://www.under-review.app";
const q = "thoughts on Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
const history = [
  {
    role: "user",
    content: "Best bet on KOR vs MEX if I only know the moneyline?",
  },
  {
    role: "assistant",
    content: "Lean KOR +180",
    structured: {
      callType: "matchup",
      call: "Lean KOR +180",
      lean: "Lean KOR +180",
      fixtureHome: "MEX",
      fixtureAway: "KOR",
    },
    wcMatchTeams: { home: "MEX", away: "KOR" },
  },
];

/** @type {Array<Record<string, unknown>>} */
const runs = [];

for (let i = 0; i < 3; i += 1) {
  const start = Date.now();
  const res = await fetch(`${BASE}/api/ur-take`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
    body: JSON.stringify({ question: q, structured: true, sportHint: "worldcup", history }),
  });
  const elapsedMs = Date.now() - start;
  const p = await res.json();
  const s = p.structured || {};
  const lean = String(s.lean || "");
  const call = String(s.call || "");
  const pricedAllThree =
    /Son/i.test(lean) &&
    /Jimenez|Jiménez/i.test(lean) &&
    /Quinones|Quiñones/i.test(lean) &&
    /(?:\+|-)\d{2,}/.test(lean);
  const isPass = /^pass\b/i.test(call) || /^pass —/i.test(lean);
  runs.push({
    run: i + 1,
    elapsedMs,
    call,
    lean: lean.slice(0, 400),
    wcEventId: p.wcEventId,
    loadMeta: p.playerPropsLoadMeta,
    pricedAllThree,
    isPass,
    ok: pricedAllThree && !isPass && elapsedMs < 15000,
  });
}

console.log(JSON.stringify({ base: BASE, runs, allOk: runs.every((r) => r.ok) }, null, 2));
process.exit(runs.every((r) => r.ok) ? 0 : 1);
