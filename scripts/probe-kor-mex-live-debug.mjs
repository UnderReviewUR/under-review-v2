/**
 * Prod probe with full response fields for routing debug.
 */
const BASE = "https://www.under-review.app";
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

const res = await fetch(`${BASE}/api/ur-take`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-ur-take-structured": "1" },
  body: JSON.stringify({ question: q, structured: true, sportHint: "worldcup", history }),
});
const p = await res.json();
console.log(
  JSON.stringify(
    {
      call: p.structured?.call,
      lean: p.structured?.lean,
      callType: p.structured?.callType,
      wcIntent: p.wcIntent,
      wcEventId: p.wcEventId,
      playerMarketTier: p.playerMarketTier,
      loadMeta: p.playerPropsLoadMeta,
      wcRelevance: p.wcRelevance,
      wcGroundingPacketVersion: p.wcGroundingPacketVersion,
      propRowsInStructured: p.structured?.propBoardRows?.length,
      wcNamedPlayerPropsCard: Boolean(p.structured?.wcNamedPlayerPropsCard),
    },
    null,
    2,
  ),
);
