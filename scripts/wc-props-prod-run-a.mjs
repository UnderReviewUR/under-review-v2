#!/usr/bin/env node
/** Prod RUN A — current main without v2 flag */
const BASE = process.argv[2] || "https://www.under-review.app";
const HISTORY = [
  { role: "user", content: "Best bet on UZB vs COL if I only know the moneyline?" },
  { role: "assistant", content: "Lean Over 2.5 goals.", structured: { fixtureHome: "UZB", fixtureAway: "COL", wcEventId: "24" } },
];
const body = {
  question: "best players prop parlays?",
  sportHint: "worldcup",
  structured: true,
  history: HISTORY,
};
const t0 = Date.now();
const res = await fetch(`${BASE}/api/ur-take`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
  body: JSON.stringify(body),
});
const p = await res.json();
const s = p.structured || {};
console.log(JSON.stringify({
  base: BASE,
  ms: Date.now() - t0,
  http: res.status,
  wcIntent: p.wcIntent,
  wcRelevance: p.wcRelevance || null,
  callType: s.callType,
  call: s.call,
  lean: s.lean,
  wcEventId: s.wcEventId || p.wcEventId,
  parlayLegs: s.parlayLegs?.length ?? 0,
  propBoardRows: s.propBoardRows?.length ?? 0,
  structured: s,
}, null, 2));
