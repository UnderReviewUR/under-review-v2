#!/usr/bin/env node
const url = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";

const history = [
  {
    role: "user",
    content: "Best bet on SWE vs TUN if I only know the moneyline?",
  },
  {
    role: "assistant",
    content: "Lean Under 2.5 goals",
    structured: {
      fixtureHome: "SWE",
      fixtureAway: "TUN",
      wcEventId: "760424",
      call: "Pass on ML — Lean Under 2.5 goals",
      lean: "Lean Under 2.5 goals",
      whyNow: "Tight Group F opener — Tunisia sits deep and Sweden rarely blows teams out in Game 1.",
    },
  },
];

const body = {
  question: "Who's most likely to score from each team? And who will lead each team in passes?",
  sportHint: "worldcup",
  structured: true,
  history,
};

const res = await fetch(url, {
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
      wcIntent: p.wcIntent,
      wcEventId: p.wcEventId ?? s.wcEventId ?? null,
      callType: p.callType ?? s.callType ?? null,
      call: s.call ?? null,
      lean: String(s.lean || "").slice(0, 300),
      underRepeat: /under 2\.5/i.test(String(s.lean || s.call || "")),
      numberedLegs: (String(s.lean || "").match(/^\s*\d+\./gm) || []).length,
    },
    null,
    2,
  ),
);
