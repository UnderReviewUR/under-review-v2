/**
 * Local E2E — named legs + BDL match 28 props → buildWcNamedPlayerPropsStructured
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production.local") });

const q =
  "thoughts on Son, Jimenez, and Quinones each going over 2.5 shots attempted?";

const { bdlFifaFetch } = await import("../api/_wcBdlFifa.js");
const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
const { resolveBdlPlayerLookupForPropRows } = await import("../api/_wcBdlData.js");
const { extractWcNamedPlayerPropLegsFromQuestion } = await import("../shared/wcUrTakePlayerMarket.js");
const { buildWcNamedPlayerPropsStructured } = await import("../shared/wcPlayerMarketResolve.js");

const res = await bdlFifaFetch("/odds/player_props", { match_id: 28 });
const rows = Array.isArray(res.data?.data) ? res.data.data : [];
const lookup = await resolveBdlPlayerLookupForPropRows(rows, { homeTeam: "MEX", awayTeam: "KOR" });
const markets = normalizeBdlPlayerPropsToMarkets(rows, lookup);

const legs = extractWcNamedPlayerPropLegsFromQuestion(q);
const kv = {
  matchPlayerProps: {
    eventId: "28",
    homeTeam: "MEX",
    awayTeam: "KOR",
    markets,
  },
  wcEventId: "28",
};
const s = buildWcNamedPlayerPropsStructured(q, "verified", kv, {
  wcEventId: "28",
  fixtureHome: "MEX",
  fixtureAway: "KOR",
  allMatches: [{ id: "28", homeTeam: "MEX", awayTeam: "KOR", status: "scheduled", bdlMatchId: 28 }],
});

console.log(
  JSON.stringify(
    {
      legs: legs.map((l) => l.name),
      structured: s
        ? {
            call: s.call,
            lean: s.lean,
            whyNow: s.whyNow,
            callType: s.callType,
          }
        : null,
    },
    null,
    2,
  ),
);
