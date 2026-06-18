/**
 * Live prod probe — MEX/KOR thread → Son/Jimenez/Quinones shot overs.
 *
 * Usage:
 *   node scripts/probe-kor-mex-live.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://www.under-review.app";
const q =
  "thoughts on Son, Jimenez, and Quinones each going over 2.5 shots attempted?";

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

const body = { question: q, structured: true, sportHint: "worldcup", history };
const start = Date.now();
const res = await fetch(`${BASE}/api/ur-take`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
  body: JSON.stringify(body),
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
const badMangle = /and Quinones each going/i.test(call + lean);

console.log(
  JSON.stringify(
    {
      base: BASE,
      elapsedMs,
      status: res.status,
      sport: p.sport,
      wcIntent: p.wcIntent,
      callType: s.callType,
      call,
      lean,
      whyNow: s.whyNow,
      edge: s.edge,
      playerPropsLoadMeta: p.playerPropsLoadMeta || null,
      wcEventId: p.wcEventId,
      pricedAllThree,
      isPass,
      badMangle,
      ok: pricedAllThree && !isPass && !badMangle && elapsedMs < 15000,
    },
    null,
    2,
  ),
);

process.exit(pricedAllThree && !isPass && !badMangle ? 0 : 1);
