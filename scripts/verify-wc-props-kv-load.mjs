#!/usr/bin/env node
/**
 * Pre-deploy gate: prove loadWcPlayerMarketKvBlocks resolves wcEventId for
 * generic follow-ups the same way explicit fixture asks do.
 *
 * Uses stub schedule (SWE vs TUN = 760424) so this runs without prod KV.
 */
import { loadWcPlayerMarketKvBlocks } from "../api/_wcPlayerUrTakeContext.js";
import { resolveWcPlayerPropFixtureTeams } from "../shared/wcPlayerPropFixture.js";
import { resolveWcFixturePairFromHistory } from "../shared/wcFixtureMatchupPrebuilt.js";
import { resolveWcEventIdForFixtureTeams } from "../shared/wcPlayerPropFixture.js";
import { isGenericWcPlayerPropQuestion, isWcFixturePlayerPropsQuestion } from "../shared/wcUrTakePlayerMarket.js";
import { detectParlayIntent } from "../shared/detectParlayIntent.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

/** Minimal schedule slice — prod SWE vs TUN event id. */
const STUB_MATCHES = [
  {
    id: "760424",
    homeTeam: "SWE",
    awayTeam: "TUN",
    status: "scheduled",
    commenceTs: Date.now() + 3_600_000,
  },
];

const prodHistory = [
  {
    role: "user",
    content: "Best bet on SWE vs TUN if I only know the moneyline?",
  },
  {
    role: "assistant",
    content: "Lean Under 2.5 goals on SWE vs TUN",
    structured: {
      call: "Lean Under 2.5 goals",
      fixtureHome: "SWE",
      fixtureAway: "TUN",
    },
  },
];

/** Mirrors pre-fix loadWcPlayerMarketKvBlocks event pinning (vs/parlay only). */
function oldLogicEventId(question, history, matches) {
  let wcEventId = null;
  if (
    (isWcFixturePlayerPropsQuestion(question) || detectParlayIntent(question)) &&
    Array.isArray(matches)
  ) {
    const teams = resolveWcPlayerPropFixtureTeams(question, history, {
      requiredEntities: [],
      conversationHistory: history,
    });
    if (teams.length >= 2) {
      wcEventId = resolveWcEventIdForFixtureTeams(matches, teams[0], teams[1]);
    }
  }
  return wcEventId;
}

function summarize(label, result, extra = {}) {
  console.log(`\n=== ${label} ===`);
  console.log(
    JSON.stringify(
      {
        wcEventId: result.wcEventId ?? null,
        matchPlayerPropsLoaded: Boolean(result.matchPlayerProps),
        ...extra,
      },
      null,
      2,
    ),
  );
  return result.wcEventId;
}

const implicitQ = "best player props for this game?";
const explicitQ = "best player props for the sweden vs tunisia match tonight?";

console.log("Resolver sanity:");
console.log(`  teams from history: ${resolveWcPlayerPropFixtureTeams(implicitQ, prodHistory).join(", ")}`);
console.log(
  `  pair from history: ${JSON.stringify(resolveWcFixturePairFromHistory(prodHistory))}`,
);
console.log(`  isGenericWcPlayerPropQuestion: ${isGenericWcPlayerPropQuestion(implicitQ)}`);
console.log(`  isWcFixturePlayerPropsQuestion (implicit): ${isWcFixturePlayerPropsQuestion(implicitQ)}`);
console.log(`  isWcFixturePlayerPropsQuestion (explicit): ${isWcFixturePlayerPropsQuestion(explicitQ)}`);

const oldImplicit = oldLogicEventId(implicitQ, prodHistory, STUB_MATCHES);
const oldExplicit = oldLogicEventId(explicitQ, prodHistory, STUB_MATCHES);
console.log("\n=== OLD logic (pre-fix) ===");
console.log(`Explicit: ${oldExplicit ? `FOUND (${oldExplicit})` : "NULL"}`);
console.log(`Implicit: ${oldImplicit ? `FOUND (${oldImplicit})` : "NULL ← this is why prod failed"}`);

const baseOpts = {
  wcIntent: WC_INTENT.PLAYER_PROP,
  matches: STUB_MATCHES,
  requiredEntities: ["SWE", "TUN"],
};

const explicitId = await summarize(
  "Test 1 — explicit fixture",
  await loadWcPlayerMarketKvBlocks(Date.now(), {
    ...baseOpts,
    question: explicitQ,
  }),
);

const implicitId = await summarize(
  "Test 2 — generic follow-up + prod-shaped history",
  await loadWcPlayerMarketKvBlocks(Date.now(), {
    ...baseOpts,
    question: implicitQ,
    conversationHistory: prodHistory,
  }),
);

console.log("\n=== VERDICT ===");
console.log(explicitId ? `Explicit: FOUND (${explicitId})` : "Explicit: NULL");
if (implicitId) {
  console.log(`Implicit (with fix): FOUND: ${implicitId}`);
  if (explicitId && implicitId === explicitId) {
    console.log("Same event as explicit — fix is real. Safe to deploy.");
  }
} else {
  console.log("Implicit (with fix): NULL — FIX FAILED");
  process.exit(1);
}
