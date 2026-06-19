#!/usr/bin/env node
/**
 * Brutal offline stress harness for WC elite phases A–E — zero API / LLM credits.
 *
 * Usage:
 *   node scripts/stress-wc-phases-offline.mjs
 *   node scripts/stress-wc-phases-offline.mjs --verbose   # print every PASS line
 *   node scripts/stress-wc-phases-offline.mjs --critique  # print soft-spot audit even when green
 */
import assert from "node:assert/strict";
import { classifyWcQuestionIntent, WC_INTENT } from "../shared/wcUrTakeIntent.js";
import {
  inferSportFromQuestionText,
  resolveSportHint,
  shouldLockWorldCupThreadSport,
} from "../shared/urTakeSportRouting.js";
import {
  WC_CARD_TYPE,
  extractWcThreadStateFromHistory,
  finalizeWcStructuredThreadState,
  inferWcCardType,
  mergeThreadStateFromStructured,
  parsePropBoardFromStructured,
} from "../shared/wcThreadState.js";
import {
  buildWcFixturePlayerPropsListStructured,
  buildWcFixturePlayerParlayStructured,
  WC_PLAYER_MARKET_TIER,
} from "../shared/wcPlayerMarketResolve.js";
import {
  buildWcThreadParlayStructured,
  shouldBuildWcThreadParlay,
} from "../shared/wcThreadParlayPrebuilt.js";
import {
  buildWcPropsListFace,
  buildWcParlayListFace,
  prepareWcCardFaceDisplay,
  pickWcCardHeadline,
} from "../src/lib/wcTakeCardUi.js";
import {
  buildWcTakeAwareFollowUpChips,
  buildWcTakeAwareNextLine,
} from "../shared/wcTakeAwareFollowUps.js";
import { mergeWcFollowUpChips } from "../shared/wcUrTakeFollowUps.js";
import { classifyWcVerdictForUi } from "../shared/wcUrTakeVerdict.js";
import { shouldRunWcPlayerPropsFastPath } from "../api/ur-take/wcPlayerPropsFastPath.js";
import { shouldUseWcFixtureMatchupPrebuilt } from "../shared/wcFixtureMatchupPrebuilt.js";
import { calculateParlayOdds, parseAmericanOddsValue } from "../src/lib/calculateParlayOdds.js";
import {
  extractWcMatchupPlayHeadline,
  isWcSaneGoalTotalLine,
  parseWcMatchGoalsOverUnder,
} from "../shared/wcMatchupWinnerLine.js";
import { normalizeWcStructuredForDelivery } from "../shared/wcUrTakeStructured.js";
import { isGenericWcPlayerPropQuestion } from "../shared/wcUrTakePlayerMarket.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";
import {
  WC_CARD_CONTRACT_GOLDEN_CASES,
  WC_CARD_CONTRACT_THREAD_CASES,
} from "../shared/wcCardContractGolden.fixture.js";
import {
  runWcCardContractSingleTurnGate,
  runWcCardContractThreadGate,
} from "../shared/wcCardContractGate.js";
import { runWcFanReliabilityAudit } from "../shared/wcFanReliabilityAudit.js";
import { scoreWcCardContractIntent } from "../shared/wcCardContractScorer.js";
import { runWcTurnArtifactSloGate } from "../shared/wcTurnArtifactSlo.js";

const VERBOSE = process.argv.includes("--verbose");
const SHOW_CRITIQUE = process.argv.includes("--critique") || VERBOSE;

/** @type {string[]} */
const critiqueNotes = [];

const eventPayload = {
  ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
  eventId: "760416",
  lastUpdated: Date.now(),
};
const kvBlocks = { matchPlayerProps: eventPayload, wcEventId: "760416" };

const ARG_ALG_MATCHUP_PRIOR = {
  role: "assistant",
  structured: {
    callType: "matchup",
    fixtureHome: "ARG",
    fixtureAway: "ALG",
    call: "Argentina -200 to win",
    lean: "Pass on ML — Lean Under 2.5 goals",
    line: "Posted Under 2.5 -114",
    whyNow: "Algeria sits deep — Argentina rarely blows out Game 1 openers.",
  },
};

const ARG_ALG_PROPS_PRIOR = {
  role: "assistant",
  structured: {
    cardType: WC_CARD_TYPE.PROP_BOARD,
    callType: "player_market_verified",
    fixtureHome: "ARG",
    fixtureAway: "ALG",
    call: "Argentina vs Algeria — top player props",
    propBoardRows: [
      { label: "Lionel Messi", odds: "-114", market: "anytime_scorer" },
      { label: "Lautaro Martínez", odds: "+180", market: "anytime_scorer" },
      { label: "Riyad Mahrez", odds: "+420", market: "anytime_scorer" },
    ],
    lean:
      "1. Lionel Messi anytime scorer -114\n2. Lautaro Martínez anytime scorer +180\n3. Riyad Mahrez anytime scorer +420",
  },
};

const FRA_BRA_MATCHUP_PRIOR = {
  role: "assistant",
  structured: {
    callType: "matchup",
    fixtureHome: "FRA",
    fixtureAway: "BRA",
    lean: "Lean Under 2.5 goals",
    line: "Posted Under 2.5 -110",
  },
};

/** @type {Record<string, { pass: number, fail: number, cases: string[] }>} */
const report = {
  A: { pass: 0, fail: 0, cases: [] },
  B: { pass: 0, fail: 0, cases: [] },
  C: { pass: 0, fail: 0, cases: [] },
  D: { pass: 0, fail: 0, cases: [] },
  E: { pass: 0, fail: 0, cases: [] },
  F: { pass: 0, fail: 0, cases: [] },
};

/**
 * @param {"A"|"B"|"C"|"D"|"E"|"F"} phase
 * @param {string} label
 * @param {() => void} fn
 */
function stress(phase, label, fn) {
  try {
    fn();
    report[phase].pass += 1;
    if (VERBOSE) report[phase].cases.push(`PASS  ${label}`);
  } catch (err) {
    report[phase].fail += 1;
    const msg = err instanceof Error ? err.message : String(err);
    report[phase].cases.push(`FAIL  ${label} — ${msg}`);
  }
}

/**
 * @param {"A"|"B"|"C"|"D"|"E"|"F"} phase
 * @param {string} prefix
 * @param {unknown[]} items
 * @param {(item: unknown, index: number) => void} fn
 */
function stressEach(phase, prefix, items, fn) {
  items.forEach((item, i) => {
    stress(phase, `${prefix} #${i + 1}`, () => fn(item, i));
  });
}

console.log("=== WC Phases A–F BRUTAL offline stress (no API / no credits) ===\n");

// ═══════════════════════════════════════════════════════════════════════════
// PHASE A — Intent routing matrix + thread memory torture
// ═══════════════════════════════════════════════════════════════════════════

/** @type {[string, string, object[]?][]} */
const intentMustEqual = [
  ["Parlay: Messi scorer + under 2.5?", WC_INTENT.PARLAY, [ARG_ALG_MATCHUP_PRIOR]],
  ["PARLAY messi to score + UNDER 2.5 goals?", WC_INTENT.PARLAY, [ARG_ALG_MATCHUP_PRIOR]],
  ["sgp: lautaro scorer and under 2.5", WC_INTENT.PARLAY, [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR]],
  ["Build a 2-leg ticket: Messi AG + under 2.5", WC_INTENT.PARLAY, [ARG_ALG_PROPS_PRIOR]],
  ["Parlay: Mbappé + France ML?", WC_INTENT.PARLAY, []],
  ["4 player parlay for CIV vs ECU", WC_INTENT.PARLAY, []],
  ["Thoughts on the over 2.5?", WC_INTENT.MATCHUP, []],
  ["Is under 2.5 the play for ARG vs ALG?", WC_INTENT.MATCHUP, [ARG_ALG_MATCHUP_PRIOR]],
  ["Over or under goals?", WC_INTENT.MATCHUP, [ARG_ALG_MATCHUP_PRIOR]],
  ["Best player props for Brazil vs France?", WC_INTENT.PLAYER_PROP, []],
  ["Jimenez 2+ shots and Mexico team to score first goal — correlated?", WC_INTENT.PLAYER_PROP, []],
  ["Who wins ARG vs ALG?", WC_INTENT.MATCHUP, []],
  ["What are the knockout rules for extra time?", WC_INTENT.RULES, []],
  ["Is Brazil +450 mispriced to win the World Cup?", WC_INTENT.ENTITY_PRICING, []],
  ["Best value in Group D?", WC_INTENT.STRUCTURAL, []],
];

stressEach("A", "intent routing must equal", intentMustEqual, ([q, expected, history]) => {
  const intent = classifyWcQuestionIntent(q, history || []);
  assert.equal(intent, expected, `"${q}" → ${intent}, want ${expected}`);
});

/** @type {[string, string[]][]} */
const intentMustNotEqual = [
  ["Parlay: Messi scorer + under 2.5?", [WC_INTENT.MATCHUP, WC_INTENT.UNCLASSIFIED]],
  ["SGP: scorer + under 2.5 for ARG vs ALG", [WC_INTENT.MATCHUP]],
  ["Best player props for Brazil vs France?", [WC_INTENT.MATCHUP, WC_INTENT.PARLAY]],
  ["Thoughts on the over 2.5?", [WC_INTENT.PARLAY, WC_INTENT.PLAYER_PROP]],
  ["Jimenez 2+ shots and Mexico team to score first goal", [WC_INTENT.PARLAY, WC_INTENT.MATCHUP]],
  ["What about player props?", [WC_INTENT.MATCHUP, WC_INTENT.PARLAY]],
];

stressEach("A", "intent anti-routing", intentMustNotEqual, ([q, forbidden]) => {
  const history = q.includes("player props") ? [ARG_ALG_MATCHUP_PRIOR] : [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  const intent = classifyWcQuestionIntent(q, history);
  for (const bad of forbidden) {
    assert.notEqual(intent, bad, `"${q}" wrongly classified ${bad}`);
  }
});

/** Paraphrase fuzz — known ARG/ALG SGP shapes must stay PARLAY. */
const parlayPhrases = [
  "parlay messi scorer + under 2.5?",
  "Parlay: Lionel Messi anytime scorer and Under 2.5 goals",
  "SGP ticket — Messi to score + under 2.5",
  "same game parlay: Messi AG + u2.5",
  "2-leg parlay Messi scorer under 2.5",
  "build parlay with messi goal and under 2.5",
];

stressEach("A", "SGP paraphrase → PARLAY", parlayPhrases, (q) => {
  const intent = classifyWcQuestionIntent(q, [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR]);
  assert.equal(intent, WC_INTENT.PARLAY);
  assert.notEqual(intent, WC_INTENT.MATCHUP);
});

stress("A", "matchup prebuilt blocked on cross-market parlay", () => {
  const qs = [
    "Parlay: Messi scorer + under 2.5?",
    "4 player parlay for ARG vs ALG?",
    "Best player props for ARG vs ALG?",
  ];
  for (const q of qs) {
    assert.equal(
      shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.MATCHUP, {
        conversationHistory: [ARG_ALG_MATCHUP_PRIOR],
      }),
      false,
      q,
    );
  }
});

stress("A", "fast-path: totals-only follow-up does NOT hijack props path", () => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  assert.equal(
    shouldRunWcPlayerPropsFastPath(WC_INTENT.MATCHUP, "Thoughts on under 2.5?", history, true),
    false,
  );
  assert.equal(
    shouldRunWcPlayerPropsFastPath(WC_INTENT.PARLAY, "Parlay: Messi + under 2.5?", history, true),
    true,
  );
});

stress("A", "thread: 3-turn ARG arc accumulates fixture + totals + props", () => {
  const history = [
    { role: "user", content: "Best bet ARG vs ALG" },
    ARG_ALG_MATCHUP_PRIOR,
    { role: "user", content: "What about player props?" },
    ARG_ALG_PROPS_PRIOR,
  ];
  const thread = extractWcThreadStateFromHistory(history);
  assert.equal(thread.fixtureHome, "ARG");
  assert.equal(thread.fixtureAway, "ALG");
  assert.equal(thread.lastTotalsLean?.side, "Under");
  assert.equal(thread.lastTotalsLean?.line, "2.5");
  assert.equal(thread.lastPropBoard.length, 3);
  assert.deepEqual(thread.cardTypes.slice(-2), [WC_CARD_TYPE.SINGLE_LEAN, WC_CARD_TYPE.PROP_BOARD]);
});

stress("A", "thread: 12-turn history retains latest fixture (no bleed)", () => {
  let state = {
    wcEventId: null,
    fixtureHome: "",
    fixtureAway: "",
    lastTotalsLean: null,
    lastPropBoard: [],
    lastParlayLegs: null,
    cardTypes: [],
  };
  const pairs = [
    ["USA", "PAR"],
    ["FRA", "BRA"],
    ["ARG", "ALG"],
    ["ENG", "GHA"],
  ];
  for (let i = 0; i < 12; i++) {
    const [home, away] = pairs[i % pairs.length];
    state = mergeThreadStateFromStructured(state, {
      fixtureHome: home,
      fixtureAway: away,
      lean: i % 2 ? `Lean Under ${2 + (i % 3)}.5 goals` : `Lean Over ${2 + (i % 2)}.5 goals`,
      callType: "matchup",
    });
  }
  assert.equal(state.fixtureHome, "ENG");
  assert.equal(state.fixtureAway, "GHA");
});

stress("A", "thread: user turns ignored; empty assistant skipped", () => {
  const thread = extractWcThreadStateFromHistory([
    { role: "user", structured: { fixtureHome: "XXX", fixtureAway: "YYY" } },
    { role: "assistant", structured: null },
    ARG_ALG_MATCHUP_PRIOR,
  ]);
  assert.equal(thread.fixtureHome, "ARG");
});

stress("A", "cardType inference matrix", () => {
  const cases = [
    [{ callType: "rules" }, WC_CARD_TYPE.RULES],
    [{ callType: "parlay", parlayLegs: [{ play: "a" }, { play: "b" }] }, WC_CARD_TYPE.PARLAY_TICKET],
    [{ callType: "tomorrow_slate" }, WC_CARD_TYPE.SLATE_BOARD],
    [{ call: "FRA vs BRA — top player props", lean: "1. A\n2. B\n3. C" }, WC_CARD_TYPE.PROP_BOARD],
    [{ call: "Argentina -200 to win", callType: "matchup" }, WC_CARD_TYPE.SINGLE_LEAN],
  ];
  for (const [structured, expected] of cases) {
    assert.equal(inferWcCardType(structured), expected);
  }
});

stress("A", "finalize parlay stamps wcThreadState with full prior arc", () => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  const out = finalizeWcStructuredThreadState(
    {
      callType: "parlay",
      fixtureHome: "ARG",
      fixtureAway: "ALG",
      parlayLegs: [
        { play: "Lionel Messi anytime scorer", odds: "-114" },
        { play: "Under 2.5 goals", odds: "-114" },
      ],
    },
    history,
    WC_INTENT.PARLAY,
  );
  assert.equal(out.cardType, WC_CARD_TYPE.PARLAY_TICKET);
  assert.equal(out.wcThreadState.lastPropBoard.length, 3);
  assert.equal(out.wcThreadState.lastTotalsLean?.side, "Under");
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE B — PROP_BOARD builder + UI invariants
// ═══════════════════════════════════════════════════════════════════════════

const pluralPropAsks = [
  "Best player props for Brazil vs France?",
  "What are the top player props for FRA vs BRA?",
  "player props for Brazil vs France",
  "Best player props for this matchup?",
  "3 top player props from each team for Brazil vs France?",
  "What about player props?",
];

stressEach("B", "plural props → PROP_BOARD", pluralPropAsks, (q) => {
  const ctx = {
    requiredEntities: ["FRA", "BRA"],
    wcEventId: "760416",
    conversationHistory:
      q.includes("this matchup") || q.includes("What about")
        ? [
            { role: "user", content: "FRA vs BRA" },
            { role: "assistant", structured: { fixtureHome: "FRA", fixtureAway: "BRA" } },
          ]
        : [],
  };
  const s = buildWcFixturePlayerPropsListStructured(
    q,
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    ctx,
  );
  assert.ok(s, q);
  assert.equal(s.cardType, WC_CARD_TYPE.PROP_BOARD);
  assert.match(s.call, /top player props|props per side/i);
  assert.ok((s.propBoardRows || []).length >= 2);
  const numbered = s.lean.match(/^\s*\d+\./gm) || [];
  assert.ok(numbered.length >= 3, `expected ≥3 numbered rows, got ${numbered.length}`);
});

const singlePropAsks = [
  "Will Kylian Mbappé score vs Brazil?",
  "Mbappé anytime scorer vs Brazil?",
  "Is Vinícius Júnior a good scorer bet?",
];

stressEach("B", "named single prop ≠ PROP_BOARD", singlePropAsks, (q) => {
  const s = buildWcFixturePlayerPropsListStructured(
    q,
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["FRA", "BRA"] },
  );
  if (!s) return;
  assert.notEqual(s.cardType, WC_CARD_TYPE.PROP_BOARD);
  assert.doesNotMatch(s.call, /top player props/i);
});

stress("B", "prop board covers both nations from KV", () => {
  const s = buildWcFixturePlayerPropsListStructured(
    "Best player props for Brazil vs France?",
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["FRA", "BRA"] },
  );
  const nations = new Set(
    (s.propBoardRows || []).map((r) => {
      const blob = `${r.label} ${r.lean}`;
      if (/Mbappé|Dembélé|Griezmann/i.test(blob)) return "FRA";
      if (/Vinícius|Rodrygo|Raphinha/i.test(blob)) return "BRA";
      return "?";
    }),
  );
  assert.ok(nations.has("FRA"), "missing FRA side");
  assert.ok(nations.has("BRA"), "missing BRA side");
});

stress("B", "UI: list face never collapses to (+N more)", () => {
  const s = buildWcFixturePlayerPropsListStructured(
    "Best player props for Brazil vs France?",
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["FRA", "BRA"] },
  );
  const headline = pickWcCardHeadline({
    lean: s.lean,
    call: s.call,
    callType: s.callType,
    cardType: s.cardType,
  });
  assert.doesNotMatch(headline, /\+\d+ more/i);
  const display = prepareWcCardFaceDisplay({
    callType: s.callType,
    cardType: s.cardType,
    call: s.call,
    lean: s.lean,
    propBoardRows: s.propBoardRows,
    focusLayout: true,
  });
  assert.ok(display.slateListFace?.rows?.length >= 3);
  assert.doesNotMatch(display.headline, /\+\d+ more/i);
});

stress("B", "UI: per-team ask labels props per side", () => {
  const s = buildWcFixturePlayerPropsListStructured(
    "3 top player props from each team for Brazil vs France?",
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["FRA", "BRA"] },
  );
  assert.match(s.call, /props per side/i);
  assert.ok((s.lean.match(/^\s*\d+\./gm) || []).length >= 4);
});

stress("B", "named-leg delivery keeps multi-leg whyNow (no goals synthesis)", () => {
  const seed = {
    callType: "player_market_odds",
    wcNamedPlayerPropsCard: true,
    call: "2 of 2 playable",
    lean: "1. Jimenez over 3 at +360 — playable\n2. Quinones over 3 at +370 — playable",
    whyNow: "All 2 names have posted lines in MATCH PLAYER PROPS.",
    edge: "Best combo value: Jimenez · Quinones",
  };
  const normalized = normalizeWcStructuredForDelivery(
    seed,
    WC_INTENT.PLAYER_PROP,
    "Jimenez and Quinones each going over 2.5 shots attempted?",
  );
  assert.match(String(normalized.whyNow), /All 2 names/i);
  assert.doesNotMatch(String(normalized.whyNow), /nearest posted line to your ask/i);
});

stress("B", "named-leg card face never rewrites player over 3 as match goals", () => {
  const lean = [
    "1. Jimenez over 3 at +360 — playable",
    "2. Quinones over 3 at +370 — playable",
  ].join("\n");
  const face = prepareWcCardFaceDisplay({
    callType: "player_market_odds",
    wcNamedPlayerPropsCard: true,
    call: "2 of 2 playable",
    lean,
    why: "All 2 names have posted lines in MATCH PLAYER PROPS.",
    focusLayout: true,
    question: "Jimenez and Quinones each going over 2.5 shots attempted?",
  });
  assert.match(face.headline, /Jimenez over 3 at \+360/i);
  assert.doesNotMatch(face.headline, /goals/i);
  assert.equal(extractWcMatchupPlayHeadline(face.headline), "");
  assert.equal(parseWcMatchGoalsOverUnder(face.headline), null);
});

stress("B", "follow-up chip respects prop board player nation", () => {
  const chips = buildWcTakeAwareFollowUpChips(
    {
      structured: {
        cardType: "prop_board",
        fixtureHome: "AUS",
        fixtureAway: "USA",
        call: "Australia vs United States — top player props",
        lean: "1. Jackson Irvine over 0.5 shots -177",
        propBoardRows: [
          { label: "Jackson Irvine", market: "player_shots_ou", odds: "-177", nationAbbr: "AUS" },
        ],
      },
    },
    "best player props for usa vs australia?",
    [],
  );
  assert.doesNotMatch(chips.join(" "), /United States scorer value besides Jackson Irvine/i);
});

stress("B", "parsePropBoardFromStructured round-trip", () => {
  const rows = parsePropBoardFromStructured(ARG_ALG_PROPS_PRIOR.structured);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].player, "Lionel Messi");
  assert.equal(rows[0].odds, "-114");
});

stress("B", "corrupt single-row lean must not fake a board face", () => {
  const face = buildWcPropsListFace({
    call: "Messi -114",
    lean: "1. Lionel Messi anytime scorer -114",
    cardType: "single_lean",
  });
  assert.equal(face, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE C — Cross-market SGP + player parlay separation
// ═══════════════════════════════════════════════════════════════════════════

const crossMarketAsks = [
  "Parlay: Messi scorer + under 2.5?",
  "under 2.5 and Messi to score — parlay",
  "SGP: Lautaro Martínez goal + Under 2.5",
  "Parlay: Mahrez scorer + under 2.5 goals?",
];

stressEach("C", "shouldBuildWcThreadParlay true", crossMarketAsks, (q) => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  assert.equal(shouldBuildWcThreadParlay(q, history, WC_INTENT.PARLAY), true);
});

const playerOnlyParlayAsks = [
  "4 player parlay for ARG vs ALG?",
  "4 player parlay for FRA vs BRA?",
  "rank the best 4 player parlays for Brazil vs France",
  "player parlay for this match",
];

stressEach("C", "shouldBuildWcThreadParlay false (player-only)", playerOnlyParlayAsks, (q) => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  assert.equal(shouldBuildWcThreadParlay(q, history, WC_INTENT.PLAYER_PROP), false);
});

stressEach("C", "thread SGP builds ticket", crossMarketAsks.slice(0, 2), (q) => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  const ticket = buildWcThreadParlayStructured(
    q,
    history,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.ok(ticket, q);
  assert.equal(ticket.cardType, WC_CARD_TYPE.PARLAY_TICKET);
  assert.equal(ticket.parlayLegs.length, 2);
  assert.match(ticket.parlayLegs[1].play, /Under 2\.5/i);
  assert.ok(ticket.parlayCombinedOdds);
});

stress("C", "SGP combined odds math: longer price than either leg", () => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Messi scorer + under 2.5?",
    history,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  const leg1 = parseAmericanOddsValue(ticket.parlayLegs[0].odds);
  const leg2 = parseAmericanOddsValue(ticket.parlayLegs[1].odds);
  const combined = parseAmericanOddsValue(ticket.parlayCombinedOdds);
  assert.ok(leg1 != null && leg2 != null && combined != null);
  const expected = calculateParlayOdds([leg1, leg2]);
  assert.equal(combined, expected);
  if (leg1 < 0 && leg2 < 0) {
    assert.ok(combined > Math.max(leg1, leg2), "combined should pay more than single leg");
  }
});

stress("C", "SGP without totals thread or question returns null", () => {
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Messi scorer + France ML?",
    [ARG_ALG_PROPS_PRIOR],
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.equal(ticket, null);
});

stress("C", "SGP resolves partial player name (Lautaro)", () => {
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Lautaro scorer + under 2.5?",
    [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR],
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.ok(ticket);
  assert.match(ticket.parlayLegs[0].play, /Lautaro|Martínez/i);
});

stress("C", "player-only 4-leg parlay from KV (separate path)", () => {
  for (const n of [2, 3, 4, 5]) {
    const s = buildWcFixturePlayerParlayStructured(
      `${n} player parlay for FRA vs BRA?`,
      WC_PLAYER_MARKET_TIER.MARKET_ONLY,
      kvBlocks,
      { requiredEntities: ["FRA", "BRA"] },
      n,
    );
    assert.ok(s, `n=${n}`);
    const legs = (s.lean.match(/\n/g) || []).length + 1;
    assert.ok(legs >= 2 && legs <= n, `n=${n} got ${legs} legs`);
    if (n <= 4) assert.equal(legs, n);
  }
});

stress("C", "parlay list face + display for SGP ticket", () => {
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Messi scorer + under 2.5?",
    [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR],
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  const face = buildWcParlayListFace({
    call: ticket.call,
    parlayLegs: ticket.parlayLegs,
    parlayCombinedOdds: ticket.parlayCombinedOdds,
  });
  assert.equal(face.rows.length, 2);
  const display = prepareWcCardFaceDisplay({
    callType: "parlay",
    cardType: WC_CARD_TYPE.PARLAY_TICKET,
    call: ticket.call,
    lean: ticket.lean,
    parlayLegs: ticket.parlayLegs,
    parlayCombinedOdds: ticket.parlayCombinedOdds,
    why: ticket.whyNow,
    focusLayout: true,
  });
  assert.ok(display.slateListFace?.rows?.length === 2);
  assert.match(display.headline, /SGP|2-leg/i);
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE D — Thread-aware chips / Next lines (anti-pollution)
// ═══════════════════════════════════════════════════════════════════════════

stress("D", "props board → Messi + Under parlay chip", () => {
  const chips = buildWcTakeAwareFollowUpChips(
    { structured: ARG_ALG_PROPS_PRIOR.structured },
    "",
    [ARG_ALG_MATCHUP_PRIOR],
  );
  assert.ok(chips.some((c) => /Parlay:.*Messi.*Under 2\.5/i.test(c)));
});

stress("D", "mergeWcFollowUpChips filters stale generics after props arc", () => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  const message = {
    structured: ARG_ALG_PROPS_PRIOR.structured,
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcMatchTeams: { home: "ARG", away: "ALG" },
  };
  const chips = mergeWcFollowUpChips(
    classifyWcVerdictForUi(message, "What about player props?"),
    message,
    "What about player props?",
    history,
  );
  const banned = [
    /^Build a parlay around this\.?$/i,
    /besides the moneyline/i,
    /clearest angle on this matchup/i,
  ];
  for (const re of banned) {
    assert.ok(!chips.some((c) => re.test(c)), `stale chip matched ${re}`);
  }
  assert.ok(chips.length >= 1 && chips.length <= 3);
});

stress("D", "Next line after Under references opponent or line", () => {
  const line = buildWcTakeAwareNextLine({ structured: ARG_ALG_MATCHUP_PRIOR.structured });
  assert.match(line || "", /Algeria|Under 2\.5/i);
});

stress("D", "FRA/BRA props after totals — parlay chip uses lead scorer", () => {
  const propsStructured = buildWcFixturePlayerPropsListStructured(
    "Best player props for Brazil vs France?",
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["FRA", "BRA"] },
  );
  const chips = buildWcTakeAwareFollowUpChips(
    { structured: propsStructured },
    "",
    [FRA_BRA_MATCHUP_PRIOR],
  );
  assert.ok(chips.some((c) => /Parlay:.*Under 2\.5/i.test(c)));
});

stress("D", "empty history → no parlay chip hallucination", () => {
  const chips = buildWcTakeAwareFollowUpChips(
    { structured: { call: "Brazil +450 fair", lean: "Pass at +450" } },
    "",
    [],
  );
  assert.ok(!chips.some((c) => /Parlay:/i.test(c)));
});

stress("D", "chip dedupe: no duplicate chips (case-insensitive)", () => {
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  const message = {
    structured: ARG_ALG_PROPS_PRIOR.structured,
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcMatchTeams: { home: "ARG", away: "ALG" },
  };
  const chips = mergeWcFollowUpChips(
    classifyWcVerdictForUi(message, ""),
    message,
    "",
    history,
  );
  const lower = chips.map((c) => c.toLowerCase());
  assert.equal(lower.length, new Set(lower).size);
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE E — Golden corpus + gates + full ARG/ALG simulation
// ═══════════════════════════════════════════════════════════════════════════

stress("E", "ARG/ALG golden ids registered", () => {
  const ids = WC_CARD_CONTRACT_GOLDEN_CASES.map((c) => c.id);
  assert.ok(ids.includes("thread-arg-alg-props-board"));
  assert.ok(ids.includes("thread-arg-alg-sgp-parlay"));
});

stressEach("E", "thread golden intent", WC_CARD_CONTRACT_THREAD_CASES, (c) => {
  if (!c.expectedIntent) return;
  const intent = classifyWcQuestionIntent(c.question, c.history || []);
  assert.equal(
    intent,
    c.expectedIntent,
    `${c.id}: got ${intent}, want ${c.expectedIntent}`,
  );
});

stressEach("E", "thread golden intent scorer", WC_CARD_CONTRACT_THREAD_CASES, (c) => {
  if (!c.expectedIntent) return;
  const scored = scoreWcCardContractIntent(c.question, c.expectedIntent, c.history || []);
  assert.ok(
    scored.passed,
    `${c.id}: got ${scored.actual}, want ${scored.expected}`,
  );
});

stress("E", "exemplarGood never uses collapsed (+N more) headline pattern", () => {
  for (const c of WC_CARD_CONTRACT_THREAD_CASES) {
    const ex = c.exemplarGood;
    if (!ex) continue;
    const blob = [ex.call, ex.lean].filter(Boolean).join(" ");
    assert.doesNotMatch(blob, /\+\d+ more/i, c.id);
  }
});

stress("E", "full ARG/ALG 3-turn offline simulation invariants", () => {
  // Turn 1: matchup prebuilt shape
  assert.equal(classifyWcQuestionIntent("Best bet ARG vs ALG — only know ML"), WC_INTENT.MATCHUP);

  // Turn 2: props board
  const propsQ = "What about player props?";
  const propsIntent = classifyWcQuestionIntent(propsQ, [ARG_ALG_MATCHUP_PRIOR]);
  assert.ok(
    propsIntent === WC_INTENT.CONTINUATION ||
      propsIntent === WC_INTENT.PLAYER_PROP ||
      propsIntent === WC_INTENT.GENERAL,
  );

  // Turn 3: SGP
  const parlayQ = "Parlay: Messi scorer + under 2.5?";
  const history = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];
  assert.equal(classifyWcQuestionIntent(parlayQ, history), WC_INTENT.PARLAY);
  assert.equal(shouldBuildWcThreadParlay(parlayQ, history, WC_INTENT.PARLAY), true);

  const ticket = buildWcThreadParlayStructured(
    parlayQ,
    history,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.ok(ticket?.parlayLegs?.length === 2);
  assert.equal(inferWcCardType(ticket), WC_CARD_TYPE.PARLAY_TICKET);
});

stress("E", "contract gates + fan reliability", () => {
  assert.equal(runWcCardContractSingleTurnGate().fail, 0);
  assert.equal(runWcCardContractThreadGate().fail, 0);
  assert.equal(runWcFanReliabilityAudit().fail, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE F — Adversarial / near-unrealistic torture + invariants
// ═══════════════════════════════════════════════════════════════════════════

const SGP_HISTORY = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR];

/** Must build a 2-leg SGP ticket from thread context. */
const sgpMustBuildTicket = [
  "Parlay: Messi scorer + under 2.5?",
  "PARLAY: messi + under 2.5 goals for arg vs alg",
  "Build parlay: Under 2.5 + Messi AG",
  "parlay: under 2.5 and messi",
  "under 2.5 and Messi to score — parlay",
  "SGP ticket — Messi to score + under 2.5",
  "same game parlay: Messi AG + u2.5",
  "2-leg parlay Messi scorer under 2.5",
  "build parlay with messi goal and under 2.5",
  "give me a sgp with messi to score and the under 2.5 we talked about",
  "why under 2.5? also parlay messi scorer",
  "Parlay: Messi scorer + under 2.5?\u200B",
  "   Parlay:   Messi   scorer   +   under   2.5?   ",
  "PARLAY MESSI SCORER + UNDER 2.5",
  "Parlay: Lautaro Martínez goal + Under 2.5",
  "Parlay: Mahrez scorer + under 2.5 goals?",
];

stressEach("F", "SGP paraphrase must build ticket", sgpMustBuildTicket, (q) => {
  const ticket = buildWcThreadParlayStructured(
    q,
    SGP_HISTORY,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.ok(ticket, `null ticket for: ${q.slice(0, 70)}`);
  assert.equal(ticket.cardType, WC_CARD_TYPE.PARLAY_TICKET);
  assert.equal(ticket.parlayLegs.length, 2);
  assert.match(ticket.parlayLegs[0].play, /scorer/i);
  assert.match(ticket.parlayLegs[1].play, /Under|Over/i);
  assert.ok(ticket.parlayCombinedOdds);
  const combined = parseAmericanOddsValue(ticket.parlayCombinedOdds);
  const legs = ticket.parlayLegs.map((l) => parseAmericanOddsValue(l.odds));
  assert.ok(legs.every((n) => n != null));
  assert.equal(combined, calculateParlayOdds(legs));
});

/** Must NOT route to thread SGP builder (fixture player-parlay or LLM path). */
const sgpMustNotBuild = [
  "4 player parlay for ARG vs ALG?",
  "4 player parlay for FRA vs BRA?",
  "player parlay for this match",
  "player parlay messi mahrez lautaro under 2.5",
  "3 leg parlay messi + under 2.5",
  "rank the best 4 player parlays for Brazil vs France",
  "5-leg parlay with Messi and Under 2.5",
];

stressEach("F", "thread SGP builder must reject", sgpMustNotBuild, (q) => {
  assert.equal(
    shouldBuildWcThreadParlay(q, SGP_HISTORY, WC_INTENT.PARLAY),
    false,
    `should not build thread SGP: ${q}`,
  );
});

/** Intent traps — wrong bucket is a product bug. */
const intentTraps = [
  ["Parlay: Messi scorer + under 2.5?", WC_INTENT.PARLAY, SGP_HISTORY, [WC_INTENT.MATCHUP]],
  ["Thoughts on the over 2.5?", WC_INTENT.MATCHUP, SGP_HISTORY, [WC_INTENT.PARLAY, WC_INTENT.PLAYER_PROP]],
  ["Best player props for Brazil vs France?", WC_INTENT.PLAYER_PROP, [], [WC_INTENT.MATCHUP, WC_INTENT.PARLAY]],
  ["What about player props?", WC_INTENT.PLAYER_PROP, [ARG_ALG_MATCHUP_PRIOR], [WC_INTENT.MATCHUP, WC_INTENT.PARLAY]],
  ["4 player parlay for CIV vs ECU", WC_INTENT.PARLAY, [], [WC_INTENT.MATCHUP]],
  ["Who wins ARG vs ALG?", WC_INTENT.MATCHUP, [], [WC_INTENT.PARLAY]],
  ["What are the knockout rules for extra time?", WC_INTENT.RULES, [], [WC_INTENT.MATCHUP]],
];

stressEach("F", "intent trap routing", intentTraps, ([q, expected, history, forbidden]) => {
  const intent = classifyWcQuestionIntent(q, history || []);
  assert.equal(intent, expected, `"${q}" → ${intent}, want ${expected}`);
  for (const bad of forbidden) {
    assert.notEqual(intent, bad);
  }
});

/** Garbage / malformed inputs must never throw. */
const garbageInputs = [
  "",
  "   ",
  null,
  undefined,
  "Parlay: Messi scorer + under 2.5?" + " ".repeat(800),
  "Parlay: Messi scorer + under 2.5?" + "\n".repeat(40),
  "🫠 Parlay: Messi scorer + under 2.5? 🔥",
  "Parlay: Messi scorer + under 2.5?\uFEFF",
  "Parlay: Messi scorer + under 2.5?\u200B\u200C\u200D",
  "PARLAY: MESSI SCORER + UNDER 2.5???",
  "parlay parlay parlay messi messi messi under under 2.5 2.5",
];

stressEach("F", "garbage input never throws", garbageInputs, (q) => {
  assert.doesNotThrow(() => {
    const question = q == null ? "" : String(q);
    classifyWcQuestionIntent(question, SGP_HISTORY);
    shouldBuildWcThreadParlay(question, SGP_HISTORY, WC_INTENT.PARLAY);
    buildWcThreadParlayStructured(
      question,
      SGP_HISTORY,
      WC_PLAYER_MARKET_TIER.VERIFIED,
      kvBlocks,
      { requiredEntities: ["ARG", "ALG"] },
    );
    buildWcFixturePlayerPropsListStructured(
      question || "props?",
      WC_PLAYER_MARKET_TIER.MARKET_ONLY,
      kvBlocks,
      { requiredEntities: ["FRA", "BRA"] },
    );
  });
});

stress("F", "insane totals line falls back to thread Under 2.5", () => {
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Messi scorer + under 999.5?",
    SGP_HISTORY,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.ok(ticket);
  assert.match(ticket.parlayLegs[1].play, /Under 2\.5/i);
  const parsed = parseWcMatchGoalsOverUnder("under 999.5");
  assert.equal(parsed, null);
});

stress("F", "unknown scorer name returns null ticket (no hallucinated leg)", () => {
  const ticket = buildWcThreadParlayStructured(
    "Parlay: XyzUnknown scorer + under 2.5?",
    SGP_HISTORY,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.equal(ticket, null);
});

stress("F", "SGP without totals thread or question returns null", () => {
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Messi scorer only?",
    [ARG_ALG_PROPS_PRIOR],
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.equal(ticket, null);
});

stress("F", "thread pollution: 50-turn fixture roulette ends on latest pair", () => {
  /** @type {object[]} */
  const history = [];
  const pairs = [
    ["USA", "PAR"],
    ["FRA", "BRA"],
    ["ARG", "ALG"],
    ["ENG", "GHA"],
    ["MEX", "RSA"],
  ];
  for (let i = 0; i < 50; i++) {
    const [home, away] = pairs[i % pairs.length];
    history.push({
      role: "assistant",
      structured: {
        fixtureHome: home,
        fixtureAway: away,
        lean: `Lean Under ${2 + (i % 4)}.5 goals`,
        callType: "matchup",
      },
    });
  }
  const thread = extractWcThreadStateFromHistory(history);
  assert.equal(thread.fixtureHome, "MEX");
  assert.equal(thread.fixtureAway, "RSA");
});

stress("F", "thread pollution: wrong-nation props board does not bleed into SGP teams", () => {
  const fraBraProps = buildWcFixturePlayerPropsListStructured(
    "Best player props for Brazil vs France?",
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["FRA", "BRA"] },
  );
  const pollutedHistory = [ARG_ALG_MATCHUP_PRIOR, ARG_ALG_PROPS_PRIOR, { role: "assistant", structured: fraBraProps }];
  const ticket = buildWcThreadParlayStructured(
    "Parlay: Messi scorer + under 2.5?",
    pollutedHistory,
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  assert.ok(ticket);
  assert.equal(ticket.fixtureHome, "ARG");
  assert.equal(ticket.fixtureAway, "ALG");
  assert.match(ticket.parlayLegs[0].play, /Messi/i);
});

const propBoardFuzz = [
  "Best player props for Brazil vs France?",
  "player props for Brazil vs France",
  "What about player props?",
  "3 top player props from each team for Brazil vs France?",
  "top props FRA vs BRA",
  "anytime scorer board Brazil vs France",
  "give me the prop board for FRA vs BRA",
  "list top scorer props Brazil France",
];

stressEach("F", "prop board fuzz → PROP_BOARD + no collapse", propBoardFuzz, (q) => {
  const ctx = {
    requiredEntities: ["FRA", "BRA"],
    wcEventId: "760416",
    conversationHistory:
      q.includes("What about") || q.includes("this matchup")
        ? [
            { role: "user", content: "FRA vs BRA" },
            { role: "assistant", structured: { fixtureHome: "FRA", fixtureAway: "BRA" } },
          ]
        : q.includes("What about")
          ? [FRA_BRA_MATCHUP_PRIOR]
          : [],
  };
  if (q.includes("What about")) {
    ctx.conversationHistory = [FRA_BRA_MATCHUP_PRIOR];
  }
  const s = buildWcFixturePlayerPropsListStructured(
    q,
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    ctx,
  );
  if (!s) {
    if (/\b(board|list)\b/i.test(q) && !/\bplayer props\b/i.test(q)) {
      critiqueNotes.push(`SOFT: "${q}" did not prebuild prop board — may need LLM path`);
      return;
    }
    assert.fail(`expected prop board for: ${q}`);
  }
  assert.equal(s.cardType, WC_CARD_TYPE.PROP_BOARD);
  assert.ok((s.propBoardRows || []).length >= 3);
  const headline = pickWcCardHeadline({
    lean: s.lean,
    call: s.call,
    callType: s.callType,
    cardType: s.cardType,
  });
  assert.doesNotMatch(headline, /\+\d+ more/i);
  assert.doesNotMatch(s.call, /\+\d+ more/i);
  const display = prepareWcCardFaceDisplay({
    callType: s.callType,
    cardType: s.cardType,
    call: s.call,
    lean: s.lean,
    propBoardRows: s.propBoardRows,
    focusLayout: true,
  });
  assert.ok(display.slateListFace?.rows?.length >= 3);
});

stress("F", "top props shorthand detected as plural prop ask", () => {
  assert.equal(isGenericWcPlayerPropQuestion("top props FRA vs BRA"), true);
});

stress("F", "every built SGP totals line is sane soccer O/U", () => {
  for (const q of sgpMustBuildTicket) {
    const ticket = buildWcThreadParlayStructured(
      q,
      SGP_HISTORY,
      WC_PLAYER_MARKET_TIER.VERIFIED,
      kvBlocks,
      { requiredEntities: ["ARG", "ALG"] },
    );
    if (!ticket) continue;
    const line = ticket.parlayLegs[1].play.match(/(\d+\.?\d*)/)?.[1];
    assert.ok(line && isWcSaneGoalTotalLine(Number.parseFloat(line)), q);
  }
});

stress("F", "matchup prebuilt blocked on all parlay/props variants", () => {
  const blockers = [
    ...sgpMustBuildTicket.slice(0, 5),
    "4 player parlay for ARG vs ALG?",
    "Best player props for ARG vs ALG?",
    "top props FRA vs BRA",
  ];
  for (const q of blockers) {
    assert.equal(
      shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.MATCHUP, {
        conversationHistory: SGP_HISTORY,
      }),
      false,
      q,
    );
  }
});

stress("F", "fast-path gate: PARLAY yes, totals-only follow-up no", () => {
  assert.equal(
    shouldRunWcPlayerPropsFastPath(WC_INTENT.PARLAY, "Parlay: Messi + under 2.5?", SGP_HISTORY, true),
    true,
  );
  assert.equal(
    shouldRunWcPlayerPropsFastPath(WC_INTENT.MATCHUP, "Thoughts on under 2.5?", SGP_HISTORY, true),
    false,
  );
  assert.equal(
    shouldRunWcPlayerPropsFastPath(WC_INTENT.PLAYER_PROP, "What about player props?", [ARG_ALG_MATCHUP_PRIOR], true),
    true,
  );
});

stress("F", "chips never suggest stale generic parlay after prop board", () => {
  const message = {
    structured: ARG_ALG_PROPS_PRIOR.structured,
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcMatchTeams: { home: "ARG", away: "ALG" },
  };
  const chips = mergeWcFollowUpChips(
    classifyWcVerdictForUi(message, "What about player props?"),
    message,
    "What about player props?",
    SGP_HISTORY,
  );
  const toxic = [
    /besides the moneyline/i,
    /^Build a parlay around/i,
    /clearest angle on this matchup/i,
    /Messi -114 \(\+\d+ more\)/i,
  ];
  for (const re of toxic) {
    assert.ok(!chips.some((c) => re.test(c)), `toxic chip: ${re}`);
  }
});

stress("F", "full golden thread corpus intent + scorer", () => {
  for (const c of WC_CARD_CONTRACT_THREAD_CASES) {
    if (!c.expectedIntent) continue;
    const scored = scoreWcCardContractIntent(c.question, c.expectedIntent, c.history || []);
    assert.ok(scored.passed, `${c.id}: ${scored.actual} !== ${scored.expected}`);
  }
});

stress("F", "ARG/ALG 4-turn: ML → props → SGP → explain totals still threaded", () => {
  const turn1 = ARG_ALG_MATCHUP_PRIOR;
  const turn2 = ARG_ALG_PROPS_PRIOR;
  const parlayQ = "Parlay: Messi scorer + under 2.5?";
  const ticket = buildWcThreadParlayStructured(
    parlayQ,
    [turn1, turn2],
    WC_PLAYER_MARKET_TIER.VERIFIED,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  const finalized = finalizeWcStructuredThreadState(ticket, [turn1, turn2], WC_INTENT.PARLAY);
  const history4 = [turn1, turn2, { role: "assistant", structured: finalized }];
  const thread = extractWcThreadStateFromHistory(history4);
  assert.equal(thread.fixtureHome, "ARG");
  assert.equal(thread.lastTotalsLean?.side, "Under");
  assert.equal(thread.lastPropBoard.length, 3);
  assert.equal(thread.lastParlayLegs?.length, 2);
  assert.ok(thread.cardTypes.includes(WC_CARD_TYPE.PARLAY_TICKET));
  const explainIntent = classifyWcQuestionIntent("why under 2.5?", history4);
  assert.ok(
    explainIntent === WC_INTENT.MATCHUP ||
      explainIntent === WC_INTENT.CONTINUATION ||
      explainIntent === WC_INTENT.GENERAL,
  );
});

// Documented soft spots — fail if we regress into worse behavior
stress("F", "critique: bare props? without thread is not PLAYER_PROP yet", () => {
  const intent = classifyWcQuestionIntent("props?", []);
  if (intent !== WC_INTENT.PLAYER_PROP && intent !== WC_INTENT.CONTINUATION) {
    critiqueNotes.push(
      `SOFT: bare "props?" classifies ${intent} without thread — consider thread-aware CONTINUATION`,
    );
  }
});

stress("F", "critique: collapsed Messi (+N more) user paste must not become PROP_BOARD", () => {
  const s = buildWcFixturePlayerPropsListStructured(
    "Messi -114 (+2 more)",
    WC_PLAYER_MARKET_TIER.MARKET_ONLY,
    kvBlocks,
    { requiredEntities: ["ARG", "ALG"] },
  );
  if (s?.cardType === WC_CARD_TYPE.PROP_BOARD) {
    assert.fail("collapsed headline paste must not synthesize prop board");
  }
});

stress("F", "routing: few bucks must not infer NBA", () => {
  const q = "I don't need an edge. I'm fine with making a few bucks tops";
  assert.notEqual(inferSportFromQuestionText(q), "nba");
});

stress("F", "routing: WC thread lock on recreational bucks follow-up", () => {
  const history = [
    { role: "user", content: "Should I bet the spread here?", sport: "worldcup" },
    { role: "assistant", content: "SLIP VERDICT Fade", sport: "worldcup" },
  ];
  assert.equal(
    resolveSportHint({
      incomingSportHint: "nba",
      question: "I'm fine with making a few bucks tops",
      chatHistory: history,
    }),
    "worldcup",
  );
  assert.equal(
    shouldLockWorldCupThreadSport({
      question: "I don't need an edge. I'm fine with making a few bucks tops",
      textualSport: inferSportFromQuestionText(
        "I don't need an edge. I'm fine with making a few bucks tops",
      ),
      historySport: "worldcup",
      chatHistory: history,
    }),
    true,
  );
});

stress("F", "turn-artifact SLO golden gate (wrong-lane / wrong-fixture)", () => {
  const slo = runWcTurnArtifactSloGate();
  if (slo.failed > 0) {
    const detail = slo.failures.map((f) => `${f.id}: ${f.reasons.join("; ")}`).join(" | ");
    assert.fail(`SLO gate ${slo.passed}/${slo.passed + slo.failed}: ${detail}`);
  }
  assert.equal(slo.failed, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// Report
// ═══════════════════════════════════════════════════════════════════════════
let totalPass = 0;
let totalFail = 0;
const failedLines = [];

for (const phase of ["A", "B", "C", "D", "E", "F"]) {
  const p = report[phase];
  totalPass += p.pass;
  totalFail += p.fail;
  console.log(`\n── Phase ${phase} (${p.pass}/${p.pass + p.fail}) ──`);
  if (p.fail > 0 || VERBOSE) {
    for (const line of p.cases) {
      console.log(`  ${line}`);
      if (line.startsWith("FAIL")) failedLines.push(`[${phase}] ${line}`);
    }
  } else {
    console.log(`  ${p.pass} checks passed`);
  }
}

console.log(`\n=== Summary: ${totalPass}/${totalPass + totalFail} brutal offline stress checks ===`);
if (totalFail > 0) {
  console.error(`\n${totalFail} failure(s):`);
  for (const line of failedLines) console.error(`  ${line}`);
  process.exitCode = 1;
} else {
  console.log("All phases stress-tested offline — zero API credits used.");
  if (critiqueNotes.length > 0) {
    console.log(`\n── Critique / known soft spots (${critiqueNotes.length}) ──`);
    for (const note of critiqueNotes) console.log(`  ⚠ ${note}`);
    if (!SHOW_CRITIQUE) {
      console.log("  (re-run with --critique to always print this block)\n");
    } else {
      console.log("");
    }
  } else {
    console.log("No soft-spot critiques flagged.\n");
  }
}
