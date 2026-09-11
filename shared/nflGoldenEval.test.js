import test from "node:test";
import assert from "node:assert/strict";

import {
  nflGoldenEvalCitedNumbers,
  nflGoldenEvalTakeText,
  runNflGoldenEvalCase,
  summarizeNflGoldenEvalResults,
} from "./nflGoldenEval.js";
import { NFL_GOLDEN_BOARDS, nflGoldenEvalCases } from "./nflGoldenEval.fixtures.js";
import { resolveNflScopeTeamAbbrevSet } from "../api/_nflContext.js";
import { scrubNflMatchupPropLines } from "../api/_nflMatchupPropHygiene.js";

const deps = {
  resolveScope: (q, ctx) => resolveNflScopeTeamAbbrevSet(q, ctx),
  scrub: (props, opts) => scrubNflMatchupPropLines(props, opts),
};

const baseTake = {
  call: "PASS",
  callType: "prop",
  confidence: "Speculative",
  lean: "Lean: Pass.",
  whyNow: "Nothing here.",
  edge: "No edge.",
  analysis: {
    matchupAnalysis: "Neutral.",
    injuryContext: "Check inactives.",
    marketContext: "Efficient.",
    lineMovement: "No movement.",
    statisticalEdge: "Priors only.",
  },
  caveats: ["Confirm the number."],
};

test("cited numbers cover the call and over/under body claims, not vig or seasons", () => {
  const cited = nflGoldenEvalCitedNumbers({
    ...baseTake,
    call: "KITTLE UNDER 48.5",
    edge: "I'd take the over 62.5 at -110 after his 2025 season.",
  });
  assert.ok(cited.includes(48.5));
  assert.ok(cited.includes(62.5));
  assert.ok(!cited.includes(110));
  assert.ok(!cited.includes(2025));
});

test("take text includes every user-visible field", () => {
  const text = nflGoldenEvalTakeText({ ...baseTake, whyNow: "Marker phrase here." });
  assert.match(text, /Marker phrase here/);
  assert.match(text, /Check inactives/);
});

test("a number nobody posted never reaches the user", () => {
  for (const fixture of [
    { ...baseTake, call: "DARNOLD UNDER 777.5" },
    { ...baseTake, call: "DARNOLD UNDER 230.5", whyNow: "I'd hammer the under 777.5 here." },
    { ...baseTake, call: "DARNOLD UNDER 230.5", edge: "I'd take the under 777.5." },
  ]) {
    const result = runNflGoldenEvalCase(
      {
        id: "rig-invented",
        question: "Darnold under 249.5 passing yards tonight?",
        board: "neSea",
        modelFixture: fixture,
      },
      NFL_GOLDEN_BOARDS.neSea,
      deps,
    );
    assert.ok(result.guardCodes.includes("invented_line"), "guard should catch it");
    assert.ok(!/777\.5/.test(result.text), "fabricated number must not ship");
    assert.ok(!result.issueCodes.some((c) => c.startsWith("invented_number")));
  }
});

test("grader flags an invented number that the guard does not scan", () => {
  const result = runNflGoldenEvalCase(
    {
      id: "rig-invented-prose",
      question: "Darnold under 249.5 passing yards tonight?",
      board: "neSea",
      modelFixture: {
        ...baseTake,
        analysis: { ...baseTake.analysis, injuryContext: "Bet the over 777.5 regardless." },
      },
    },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.ok(
    result.issueCodes.some((c) => c.startsWith("invented_number:777.5")),
    `expected invented_number, got ${result.issueCodes.join(",")}`,
  );
  assert.equal(result.passed, false);
});

test("a real stat claim in the action fields is not treated as an invented line", () => {
  const result = runNflGoldenEvalCase(
    {
      id: "rig-historical",
      question: "Darnold under 249.5 passing yards tonight?",
      board: "neSea",
      modelFixture: {
        ...baseTake,
        call: "DARNOLD UNDER 230.5",
        edge: "He has gone over 300 yards twice all year. I'd take the under 230.5.",
      },
    },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.ok(!result.guardCodes.includes("invented_line"));
  assert.match(result.call, /230\.5/);
});

// A single stated prop is not a shape UR authors deterministically, so the
// guard leaves the fixture text alone — which is what these rigs need to see.
const STATED_PROP_Q = "Darnold under 249.5 passing yards tonight?";

test("grader flags a take that asks the user for the lines", () => {
  const result = runNflGoldenEvalCase(
    {
      id: "rig-asks",
      question: STATED_PROP_Q,
      board: "neSea",
      modelFixture: { ...baseTake, whyNow: "Can't help without the actual prop lines." },
      forbidText: [{ label: "asked_user_for_lines", re: "can'?t help without" }],
    },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.ok(result.issueCodes.includes("forbidden_text:asked_user_for_lines"));
});

test("grader flags an unnamed player and an unquoted line", () => {
  const missing = runNflGoldenEvalCase(
    {
      id: "rig-unnamed",
      question: STATED_PROP_Q,
      board: "neSea",
      modelFixture: baseTake,
      grounded: ["Darnold"],
    },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.ok(missing.issueCodes.includes("ungrounded_player:Darnold"));

  const unquoted = runNflGoldenEvalCase(
    {
      id: "rig-unquoted",
      question: STATED_PROP_Q,
      board: "neSea",
      modelFixture: { ...baseTake, edge: "I like Darnold tonight." },
      grounded: ["Darnold"],
    },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.ok(unquoted.issueCodes.includes("ungrounded_number:Darnold"));
});

test("grader flags a scoped team the named player is not on", () => {
  const result = runNflGoldenEvalCase(
    {
      id: "rig-forbid-scope",
      question: "kelce props tonight?",
      board: "kcBuf",
      modelFixture: baseTake,
      forbidScope: ["KC"],
    },
    NFL_GOLDEN_BOARDS.kcBuf,
    deps,
  );
  assert.ok(result.issueCodes.includes("scope_forbidden:KC"));
});

test("a scoped ask drops rows carried over from another matchup", () => {
  // The neSea board ships A.J. Brown stamped DAL @ PHI and Romeo Doubs stamped
  // GB @ DET — same players, different games, different numbers.
  const result = runNflGoldenEvalCase(
    { id: "rig-cross-game", question: "best player props NE @ SEA?", board: "neSea", modelFixture: baseTake },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.deepEqual(
    result.issueCodes.filter((c) => c.startsWith("cross_game_row")),
    [],
  );
});

test("stale wrong-game stamps are dropped even without a matchup scope", () => {
  // A.J. Brown is NE on BDL — the DAL @ PHI stamp must never reach the prompt,
  // including on the week board (empty scope).
  const result = runNflGoldenEvalCase(
    {
      id: "rig-stale-stamp",
      question: "brown over 34.5 receiving yards?",
      board: "neSea",
      modelFixture: baseTake,
      evidence: ["Brown"],
    },
    NFL_GOLDEN_BOARDS.neSea,
    deps,
  );
  assert.deepEqual(result.scope, []);
  assert.deepEqual(
    result.issueCodes.filter((c) => c.startsWith("cross_game_row")),
    [],
  );
  assert.ok(!result.issueCodes.includes("evidence_missing:Brown"));
});

test("aliased abbreviations are not treated as a different game", () => {
  const result = runNflGoldenEvalCase(
    { id: "rig-alias", question: "best player props SF @ LAR?", board: "sfLar", modelFixture: baseTake },
    { ...NFL_GOLDEN_BOARDS.sfLar, games: [{ ...NFL_GOLDEN_BOARDS.sfLar.games[0], homeAbbr: "LA" }] },
    deps,
  );
  assert.deepEqual(
    result.issueCodes.filter((c) => c.startsWith("cross_game_row")),
    [],
  );
});

test("summary separates real failures from labelled known gaps", () => {
  const summary = summarizeNflGoldenEvalResults([
    { passed: true, issueCodes: [] },
    { passed: false, knownGap: true, issueCodes: ["scope_mismatch:x"] },
    { passed: false, issueCodes: ["invented_number:9"] },
  ]);
  assert.equal(summary.pass, 1);
  assert.equal(summary.knownGaps, 1);
  assert.equal(summary.fail, 1);
  assert.deepEqual(summary.byCode, { scope_mismatch: 1, invented_number: 1 });
});

test("the production slip grades all four player legs off live rows", () => {
  const row = nflGoldenEvalCases("ticket-five-leg-lowercase")[0];
  const result = runNflGoldenEvalCase(row, NFL_GOLDEN_BOARDS[row.board], deps);
  assert.deepEqual(result.issueCodes, []);
  assert.deepEqual(result.scope, ["NE", "SEA"]);
  assert.equal(result.marketId, "ticket_review");
});

test("every golden case either passes or is labelled a known gap", () => {
  const unlabelled = nflGoldenEvalCases()
    .map((row) => ({ row, result: runNflGoldenEvalCase(row, NFL_GOLDEN_BOARDS[row.board], deps) }))
    .filter(({ result }) => !result.passed && !result.knownGap)
    .map(({ result }) => `${result.id}: ${result.issueCodes.join(",")}`);
  assert.deepEqual(unlabelled, []);
});

test("known gaps stay documented so they cannot quietly become the baseline", () => {
  for (const row of nflGoldenEvalCases().filter((r) => r.knownGap)) {
    assert.ok(String(row.why || "").length > 40, `${row.id} needs a why note`);
  }
});
