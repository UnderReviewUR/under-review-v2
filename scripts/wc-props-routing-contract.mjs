#!/usr/bin/env node
/**
 * Phase 1.5 — offline WC props routing contract.
 * Tests stack preview AND legacy-vs-v2 fetch gap (prod bug still on main until Phase 2).
 *
 * Usage:
 *   node scripts/wc-props-routing-contract.mjs
 *   node scripts/wc-props-routing-contract.mjs --staging  (future: POST to staging)
 */
import {
  previewWcPropsRoute,
  simulateLegacyProdFetchDecision,
} from "../shared/wcPropsRoutePreview.js";
import { resolveWcUrTakeV2Turn } from "../shared/wcUrTakePipeline.js";

const STUB_MATCHES = [
  { id: "22", homeTeam: "GHA", awayTeam: "PAN", status: "scheduled", commenceTs: Date.now() + 86400000 },
  { id: "24", homeTeam: "UZB", awayTeam: "COL", status: "scheduled", commenceTs: Date.now() + 172800000 },
  { id: "30", homeTeam: "MAR", awayTeam: "BRA", status: "scheduled", commenceTs: Date.now() + 259200000 },
  { id: "760424", homeTeam: "SWE", awayTeam: "TUN", status: "scheduled", commenceTs: Date.now() + 3600000 },
  { id: "991122", homeTeam: "MEX", awayTeam: "KOR", status: "scheduled", commenceTs: Date.now() + 7200000 },
];

const SWE_TUN_HISTORY = [
  { role: "user", content: "Best bet on SWE vs TUN if I only know the moneyline?" },
  {
    role: "assistant",
    content: "Lean Under 2.5",
    structured: { fixtureHome: "SWE", fixtureAway: "TUN", wcEventId: "760424" },
  },
];

const UZB_COL_HISTORY = [
  { role: "user", content: "Best bet on UZB vs COL if I only know the moneyline?" },
  { role: "assistant", content: "Lean Over 2.5 goals." },
];

const GHA_PAN_STRUCTURED = [
  { role: "user", content: "Best bet on Ghana vs Panama moneyline?" },
  {
    role: "assistant",
    content: "Lean Panama ML",
    structured: { fixtureHome: "GHA", fixtureAway: "PAN", wcEventId: "22" },
  },
];

const MIXED_10_TURN = [
  ...GHA_PAN_STRUCTURED,
  { role: "user", content: "What about Uzbek total?" },
  { role: "assistant", content: "Under 2.5 for Uzbekistan vs Colombia" },
  { role: "user", content: "Morocco props?" },
  { role: "assistant", content: "Hakimi shots" },
  { role: "user", content: "How does extra time work?" },
  { role: "assistant", content: "Two 15-minute periods" },
];

/** @type {Array<{ id: string, question: string, history?: object[], expect: Partial<ReturnType<typeof previewWcPropsRoute>> }>} */
const CASES = [
  { id: "explicit-pair-001", question: "best player props for Ghana vs Panama?", expect: { pinnedHome: "GHA", pinnedAway: "PAN", pinnedEventId: "22", needsRouting: true, fetchAttempted: true, askShape: "fixture_board" } },
  { id: "explicit-pair-002", question: "UZB vs COL player prop board", expect: { pinnedHome: "UZB", pinnedAway: "COL", pinnedEventId: "24", needsRouting: true } },
  { id: "explicit-pair-003", question: "SWE vs TUN anytime scorer props", expect: { pinnedHome: "SWE", pinnedAway: "TUN", pinnedEventId: "760424", needsRouting: true } },
  { id: "explicit-pair-004", question: "parlays for the winner of Ghana vs Panama", expect: { pinnedHome: "GHA", pinnedAway: "PAN", needsRouting: true, askShape: "fixture_board" } },
  { id: "explicit-pair-005", question: "best Ghana vs Panama bets", expect: { pinnedHome: "GHA", pinnedAway: "PAN", pinnedEventId: "22", needsRouting: false } },

  { id: "thread-structured-001", question: "best player props for this game?", history: SWE_TUN_HISTORY, expect: { pinnedEventId: "760424", pinnedHome: "SWE", pinnedAway: "TUN", fetchAttempted: true } },
  { id: "thread-structured-002", question: "best player prop parlays?", history: SWE_TUN_HISTORY, expect: { pinnedEventId: "760424", fetchAttempted: true, askShape: "fixture_board" } },
  { id: "thread-structured-003", question: "player props SGP ideas", history: SWE_TUN_HISTORY, expect: { pinnedEventId: "760424", needsRouting: true, askShape: "fixture_board" } },

  { id: "nation-ref-001", question: "best players prop parlays?", history: [...UZB_COL_HISTORY, { role: "user", content: "What about the Uzbek match?" }], expect: { pinnedHome: "UZB", pinnedAway: "COL", pinnedEventId: "24", fetchAttempted: true } },
  { id: "nation-ref-002", question: "best parlays?", history: [...GHA_PAN_STRUCTURED, { role: "user", content: "Morocco props?" }], expect: { pinnedHome: "MAR", pinnedAway: "BRA", pinnedEventId: "30" } },
  { id: "nation-ref-003", question: "best parlays for Ghana?", history: MIXED_10_TURN, expect: { pinnedHome: "GHA", pinnedAway: "PAN", pinnedEventId: "22" } },

  { id: "ambiguous-stack-001", question: "best parlays?", history: MIXED_10_TURN, expect: { pinnedHome: null, pinnedEventId: null, ambiguous: true, fetchAttempted: false, fetchBlockedAmbiguous: true } },

  { id: "phrase-parlay-001", question: "best player prop parlays?", history: UZB_COL_HISTORY, expect: { needsRouting: true, askShape: "fixture_board" } },
  { id: "phrase-parlay-002", question: "best players prop parlays?", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-003", question: "2-leg player parlay", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-004", question: "same-game parlay props", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-005", question: "best parlay plays", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-006", question: "best parlay legs", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-007", question: "player props SGP ideas", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-008", question: "best player prop combos", history: UZB_COL_HISTORY, expect: { needsRouting: true } },

  { id: "phrase-prop-001", question: "best player props tonight", expect: { needsRouting: true } },
  { id: "phrase-prop-002", question: "prop board for UZB vs COL", expect: { pinnedEventId: "24" } },
  { id: "phrase-prop-003", question: "anytime scorer board", expect: { needsRouting: true, askShape: "slate" } },

  { id: "named-leg-001", question: "James Rodriguez anytime scorer", expect: { needsRouting: true } },
  { id: "named-leg-002", question: "Gordon over 1.5 shots", expect: { askShape: "named_legs", needsRouting: true } },

  { id: "negative-001", question: "who is 2nd in Group K?", expect: { needsRouting: false, fetchAttempted: false } },
  { id: "negative-002", question: "Uruguay to win the World Cup?", expect: { needsRouting: false } },
  { id: "negative-003", question: "how does extra time work?", expect: { needsRouting: false } },
  { id: "negative-004", question: "Over 2.5 goals Ghana vs Panama", expect: { needsRouting: false } },

  { id: "demonym-001", question: "Panama canal props", expect: { pinnedHome: null, pinnedAway: null } },
  { id: "demonym-002", question: "Panama vs US props", expect: { pinnedHome: "PAN", pinnedAway: "USA" } },
  { id: "demonym-003", question: "Panamanian scorer props", expect: { pinnedHome: "GHA", pinnedAway: "PAN", pinnedEventId: "22" } },

  { id: "event-id-001", question: "best parlays?", history: UZB_COL_HISTORY, incomingWcEventId: "24", expect: { pinnedEventId: "24", pinMethod: "explicit_event_id" } },

  { id: "followup-moneyline-001", question: "best player prop parlays?", history: [{ role: "user", content: "Best bet on UZB vs COL moneyline?" }, { role: "assistant", content: "Lean Over 2.5", structured: { fixtureHome: "UZB", fixtureAway: "COL", wcEventId: "24" } }], expect: { pinnedEventId: "24", pinnedHome: "UZB", pinnedAway: "COL", fetchAttempted: true } },

  { id: "cross-context-001", question: "Ghana vs Panama total is 2.5, best props?", expect: { pinnedHome: "GHA", pinnedAway: "PAN", needsRouting: true } },

  { id: "slate-shape-001", question: "best player props for today?", expect: { needsRouting: true, askShape: "slate" } },

  { id: "parlay-bare-001", question: "best parlays?", history: [], expect: { needsRouting: true, pinnedEventId: null, fetchAttempted: false } },

  { id: "thread-deictic-001", question: "prop ideas for that game", history: SWE_TUN_HISTORY, expect: { pinnedEventId: "760424" } },

  { id: "phrase-parlay-009", question: "3 player parlay", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "phrase-parlay-010", question: "rank the best 3 player parlays", history: UZB_COL_HISTORY, expect: { needsRouting: true } },
  { id: "explicit-pair-006", question: "MAR vs BRA player props", expect: { pinnedHome: "MAR", pinnedAway: "BRA", pinnedEventId: "30" } },
  { id: "nation-ref-004", question: "best props for Colombia", expect: { pinnedHome: "UZB", pinnedAway: "COL" } },

  { id: "prod-bug-players-prop-001", question: "best players prop parlays?", history: UZB_COL_HISTORY, expect: { pinnedHome: "UZB", pinnedAway: "COL", pinnedEventId: "24", needsRouting: true, fetchAttempted: true } },
  { id: "geo-exclusion-jordan-001", question: "Jordan river cruise", expect: { pinnedHome: null, pinnedAway: null, needsRouting: false } },
  { id: "nation-ref-005", question: "What about the Uzbek match?", history: UZB_COL_HISTORY, expect: { pinnedHome: "UZB", pinnedAway: "COL", pinnedEventId: "24" } },

  { id: "ambiguous-greedy-001", question: "best parlays?", history: [
    { role: "user", content: "Best bet on Ghana vs Panama moneyline?" },
    { role: "assistant", content: "Lean ML", structured: { fixtureHome: "GHA", fixtureAway: "PAN", wcEventId: "22" } },
    { role: "user", content: "What about Morocco?" },
    { role: "assistant", content: "Hakimi edge" },
    { role: "user", content: "Colombia scorer?" },
    { role: "assistant", content: "James Rodriguez anytime" },
  ], expect: { pinnedHome: null, fetchAttempted: false, fetchBlockedAmbiguous: true, ambiguous: true } },
];

const MEX_KOR_PROPS_THREAD = [
  { role: "user", content: "MEX vs KOR moneyline" },
  {
    role: "assistant",
    content: "Lean Mexico +100",
    structured: { fixtureHome: "MEX", fixtureAway: "KOR", wcEventId: "991122" },
    wcEventId: "991122",
  },
  {
    role: "user",
    content: "Son, Jimenez, and Quinones each going over 2.5 shots attempted?",
  },
  {
    role: "assistant",
    content: "3 of 3 playable",
    structured: { fixtureHome: "MEX", fixtureAway: "KOR", wcEventId: "991122" },
  },
];

/** Phase 2 — unified pipeline lane resolution (props vs matchup_ml). */
const PIPELINE_CASES = [
  {
    id: "pipeline-props-thread-001",
    question: "best player prop parlays for this game?",
    history: MEX_KOR_PROPS_THREAD,
    expect: { lane: "props", pinnedEventId: "991122" },
  },
  {
    id: "pipeline-matchup-ml-001",
    question: "Who wins MEX vs KOR?",
    history: MEX_KOR_PROPS_THREAD,
    expect: { lane: "matchup_ml", pinnedEventId: "991122", propsApplyRoute: false },
  },
];

/** Prod bug: legacy path broken, v2 preview would fetch — documents Phase 2 obligation. */
const LEGACY_GAP_CASES = [
  {
    id: "legacy-prod-bug-players-prop-parlay",
    question: "best players prop parlays?",
    history: UZB_COL_HISTORY,
    expect: {
      wcIntent: "PARLAY",
      legacyLoadMatchProps: false,
      prodStillBrokenOnMain: true,
      v2FetchAttempted: true,
      v2PinnedEventId: "24",
    },
  },
];

function assertCase(caseRow, got) {
  const exp = caseRow.expect;
  for (const [key, want] of Object.entries(exp)) {
    const val = got[key];
    if (want === null) {
      if (val != null && val !== false) {
        throw new Error(`${caseRow.id}: ${key} expected null/false got ${JSON.stringify(val)}`);
      }
    } else if (val !== want) {
      throw new Error(`${caseRow.id}: ${key} expected ${JSON.stringify(want)} got ${JSON.stringify(val)}`);
    }
  }
}

const staging = process.argv.includes("--staging");
if (staging) {
  console.error("[contract] --staging POST not implemented yet; run offline only");
  process.exit(1);
}

let failed = 0;
for (const c of CASES) {
  try {
    const got = previewWcPropsRoute({
      question: c.question,
      history: c.history || [],
      matches: STUB_MATCHES,
      incomingWcEventId: c.incomingWcEventId || null,
    });
    assertCase(c, got);
    console.log(`OK  ${c.id}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${c.id}: ${err.message}`);
  }
}

for (const c of LEGACY_GAP_CASES) {
  try {
    const got = simulateLegacyProdFetchDecision({
      question: c.question,
      history: c.history || [],
      matches: STUB_MATCHES,
    });
    assertCase(c, got);
    console.log(`OK  ${c.id}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${c.id}: ${err.message}`);
  }
}

for (const c of PIPELINE_CASES) {
  try {
    const turn = resolveWcUrTakeV2Turn({
      question: c.question,
      history: c.history || [],
      matches: STUB_MATCHES,
      routeHeader: "1",
    });
    const got = {
      lane: turn.lane,
      pinnedEventId:
        turn.propsRoute?.wcEventId || turn.matchupMl?.wcEventId || null,
      propsApplyRoute: turn.propsRoute?.applyRoute ?? false,
    };
    assertCase(c, got);
    console.log(`OK  ${c.id}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${c.id}: ${err.message}`);
  }
}

const total = CASES.length + LEGACY_GAP_CASES.length + PIPELINE_CASES.length;
console.log(`\n=== CONTRACT ${total - failed}/${total} passed ===`);
process.exit(failed ? 1 : 0);
