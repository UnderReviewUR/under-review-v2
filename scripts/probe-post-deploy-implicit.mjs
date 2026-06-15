#!/usr/bin/env node
const body = {
  question: "best player props for this game?",
  sportHint: "worldcup",
  structured: true,
  history: [
    { role: "user", content: "Best bet on SWE vs TUN tonight?" },
    {
      role: "assistant",
      content: "Lean Under 2.5 goals on SWE vs TUN",
      structured: {
        fixtureHome: "SWE",
        fixtureAway: "TUN",
        wcEventId: "760424",
      },
    },
  ],
};

const res = await fetch("https://www.under-review.app/api/ur-take", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const p = await res.json();
const s = p.structured || {};
console.log(
  JSON.stringify(
    {
      http: res.status,
      wcEventId: p.wcEventId ?? s.wcEventId ?? null,
      callType: s.callType ?? null,
      call: s.call ?? null,
      leanPreview: String(s.lean || "").slice(0, 200),
      pass: /pass/i.test(String(s.call || s.lean || "")),
    },
    null,
    2,
  ),
);
