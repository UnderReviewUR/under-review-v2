import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTalkVerifiedContextBlock,
  hasWcTalkGrounding,
  isWcStubUrTakeContext,
  truncateForTalkPrompt,
} from "./wcTalkGrounding.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("isWcStubUrTakeContext flags prebuilt stubs", () => {
  assert.equal(isWcStubUrTakeContext({ source: "worldcup_fixture_matchup_prebuilt" }), true);
  assert.equal(
    isWcStubUrTakeContext({ promptBlock: "WORLD CUP 2026 — VERIFIED CONTEXT" }),
    false,
  );
});

test("buildWcTalkVerifiedContextBlock injects truncated promptBlock", () => {
  const block = buildWcTalkVerifiedContextBlock({
    promptBlock: `${"x".repeat(5000)}\nWORLD CUP 2026 — VERIFIED CONTEXT`,
    phase: "ROUND_OF_32",
    fixtures: [{ homeTeam: "BRA", awayTeam: "JPN", round: "Round of 32" }],
  });
  assert.match(block, /truncated/);
  assert.match(block, /Fixture: BRA vs JPN/);
});

test("buildWcTalkVerifiedContextBlock uses rules block when intent is RULES", () => {
  const block = buildWcTalkVerifiedContextBlock(
    {
      phase: "ROUND_OF_32",
      staticRulesBlock: "Extra time: two 15-minute periods.",
      knockoutAppendix: "Knockout tiebreakers apply.",
    },
    [],
    WC_INTENT.RULES,
  );
  assert.match(block, /TOURNAMENT RULES/);
  assert.match(block, /Extra time/);
});

test("hasWcTalkGrounding allows thread with prior lean on stub", () => {
  const ok = hasWcTalkGrounding(
    { source: "worldcup_fixture_matchup_prebuilt" },
    [
      {
        role: "assistant",
        structured: { lean: "Over 2.5 goals", fixtureHome: "BRA", fixtureAway: "JPN" },
      },
    ],
  );
  assert.equal(ok, true);
});

test("hasWcTalkGrounding blocks empty stub with no prior lean", () => {
  const ok = hasWcTalkGrounding({ source: "worldcup_cross_group_prebuilt" }, []);
  assert.equal(ok, false);
});

test("truncateForTalkPrompt leaves short text intact", () => {
  assert.equal(truncateForTalkPrompt("hello"), "hello");
});
