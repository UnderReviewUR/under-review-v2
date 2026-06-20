#!/usr/bin/env node
const BASE = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";

async function probe(label, body, headers = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ur-take-structured": "1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  const s = j.structured || {};
  const blob = JSON.stringify(j);
  const exactCold =
    /Player prop lines aren't posted yet|aren't available yet/i.test(blob);
  console.log(`\n=== ${label} exactCold=${exactCold} ===`);
  console.log(
    JSON.stringify(
      {
        http: res.status,
        wcIntent: j.wcIntent,
        callType: s.callType,
        call: s.call,
        lean: s.lean,
        whyNow: s.whyNow,
        edge: s.edge,
        fixtureHome: s.fixtureHome,
        fixtureAway: s.fixtureAway,
        notPosted: s.groundingInventoryStrip?.notPosted,
        posted: s.groundingInventoryStrip?.posted,
        coldStart: j.coldStart,
        playerPropsLoadMeta: j.playerPropsLoadMeta,
        wcRelevance: j.wcRelevance,
      },
      null,
      2,
    ),
  );
}

const historyLean = [
  { role: "user", content: "Best live angle on BRA vs HAI right now?" },
  {
    role: "assistant",
    content:
      "Lean Under 2.5 goals\nBrazil is the Group C Favorite and Haiti is a Longshot – the moneyline heavily favors Brazil, so the live angle is on totals.",
  },
];

await probe("prod-like history", {
  question: "best player props for Haiti?",
  sportHint: "worldcup",
  structured: true,
  history: historyLean,
});

await probe(
  "prod-like + wcEventId 31",
  {
    question: "best player props for Haiti?",
    sportHint: "worldcup",
    structured: true,
    wcEventId: "31",
    history: historyLean,
  },
);

await probe(
  "BRA vs HAI explicit props",
  {
    question: "best player props for BRA vs HAI?",
    sportHint: "worldcup",
    structured: true,
    history: historyLean,
  },
);

await probe(
  "planner off header",
  {
    question: "best player props for Haiti?",
    sportHint: "worldcup",
    structured: true,
    history: historyLean,
  },
  { "x-wc-turn-planner": "0" },
);

await probe("wcEventId only no history", {
  question: "best player props for Haiti?",
  sportHint: "worldcup",
  structured: true,
  wcEventId: "31",
});

await probe(
  "broken prior lean prose",
  {
    question: "best player props for Haiti?",
    sportHint: "worldcup",
    structured: true,
    history: [
      { role: "user", content: "Best live angle on BRA vs HAI right now?" },
      {
        role: "assistant",
        content:
          "Brazil is the Group C Favorite and Haiti is a Longshot – the moneyline heavily favors Brazil.",
      },
    ],
  },
);
