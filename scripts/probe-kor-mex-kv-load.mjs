/**
 * Diagnose prod KV load path for MEX/KOR named shots ask.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production.local") });

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

const { loadWcPlayerMarketKvBlocksWithRetry } = await import("../api/_wcPlayerUrTakeContext.js");
const { matchPlayerPropRowsFromEvent, hasMatchPlayerPropRows } = await import(
  "../shared/wcMatchPlayerProps.js"
);
const { getKvStoreHealth } = await import("../api/_durableStore.js");

const kvHealth = getKvStoreHealth();
const blocks = await loadWcPlayerMarketKvBlocksWithRetry(Date.now(), {
  question: q,
  wcIntent: "player_prop",
  conversationHistory: history,
  requiredEntities: ["MEX", "KOR"],
});

const mp = blocks.matchPlayerProps;
console.log(
  JSON.stringify(
    {
      kvHealth,
      wcEventId: blocks.wcEventId,
      loadMeta: blocks.loadMeta,
      hasMatchPlayerProps: Boolean(mp),
      hasRows: hasMatchPlayerPropRows(mp),
      shotsOu: matchPlayerPropRowsFromEvent(mp, "player_shots_ou", 999).length,
      eachHalf: matchPlayerPropRowsFromEvent(mp, "player_shots_each_half", 999).length,
      source: mp?.source || null,
      homeTeam: mp?.homeTeam || null,
      awayTeam: mp?.awayTeam || null,
    },
    null,
    2,
  ),
);

process.exit(blocks.loadMeta?.failed ? 1 : 0);
