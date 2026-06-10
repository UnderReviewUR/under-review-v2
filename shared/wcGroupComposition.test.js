import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcGroupSlatePrebuiltStructured,
  detectWcGroupMathMismatch,
  detectWcGroupRosterMismatch,
  formatWcGroupCompositionPromptBlock,
  getWcGroupComposition,
  resolveWcGroupLettersForPrompt,
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "./wcGroupComposition.js";
import { runWcUrTakeQA, wcQaRequiresRegeneration } from "../api/_wcUrTakeQA.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("Group D — Türkiye Favorite, Paraguay Contender, two Longshots", () => {
  const comp = getWcGroupComposition("D");
  assert.equal(comp.teams.length, 4);
  assert.equal(comp.favorite?.abbreviation, "TUR");
  assert.equal(comp.contender?.abbreviation, "PAR");
  assert.equal(comp.longshots.length, 2);
  assert.deepEqual(
    comp.longshots.map((t) => t.abbreviation).sort(),
    ["AUS", "USA"],
  );
});

test("detectWcGroupMathMismatch — three longshots with two named fails", () => {
  const bad =
    "Paraguay in Group D offers value. Contender-tier strength facing a Favorite (Türkiye) and three Longshots (Australia, USA).";
  const m = detectWcGroupMathMismatch(bad, "D");
  assert.ok(m?.issues?.some((i) => i.code === "wc_group_longshot_count"));
});

test("detectWcGroupRosterMismatch — Austria wrongly listed in Group K fails", () => {
  const bad =
    "Group K features Portugal (Favorite) as the clear leader, but Austria, Uzbekistan, and DR Congo are all beatable.";
  const m = detectWcGroupRosterMismatch(bad);
  assert.ok(m?.issues?.some((i) => i.code === "wc_group_roster_mismatch" && i.team === "AUT"));
});

test("runWcUrTakeQA — wrong group roster triggers regeneration", () => {
  const bad =
    "Colombia at +4000 is the best group-stage value. Group K features Portugal, Austria, Uzbekistan, and DR Congo.";
  const qa = runWcUrTakeQA({
    responseText: bad,
    structured: {
      call: "Colombia at +4000 — best group-stage value.",
      whyNow: bad,
    },
    question: "What's the best group-stage value bet right now?",
    wcIntent: WC_INTENT.STRUCTURAL,
  });
  assert.ok(qa.issueCodes.includes("wc_group_roster_mismatch"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("resolveWcGroupLettersForPrompt — cross-group value caps binding blocks", () => {
  const letters = resolveWcGroupLettersForPrompt(
    "What's the best group-stage value bet right now?",
    { wcIntent: WC_INTENT.STRUCTURAL, topMispriceGroups: ["K", "D", "I", "C"] },
  );
  assert.ok(letters.length <= 4);
  assert.ok(letters.includes("K"));
});

test("shouldUseWcCrossGroupValuePrebuilt — flagship value question", () => {
  assert.equal(
    shouldUseWcCrossGroupValuePrebuilt(
      "What's the best group-stage value bet right now — one pick?",
      WC_INTENT.STRUCTURAL,
    ),
    true,
  );
});

test("runWcUrTakeQA — group math mismatch triggers regeneration", () => {
  const qa = runWcUrTakeQA({
    responseText:
      "Paraguay in Group D — three Longshots (Australia, USA) behind Türkiye.",
    structured: {
      call: "Paraguay in Group D offers the best group-stage value.",
      whyNow:
        "Facing Türkiye (Favorite) and three Longshots (Australia, USA).",
    },
    question: "What's the best group-stage value bet?",
    wcIntent: WC_INTENT.STRUCTURAL,
  });
  assert.ok(qa.issueCodes.includes("wc_group_math_mismatch"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("prebuilt Group D copy names all four tiers correctly", () => {
  const pre = buildWcGroupSlatePrebuiltStructured({ groupLetter: "D", pickAbbr: "PAR" });
  assert.ok(pre);
  assert.doesNotMatch(pre.lean, /\+1[5-9]\d{2,}/);
  assert.doesNotMatch(pre.edge || "", /\+1[5-9]\d{2,}/);
  assert.match(pre.whyNow, /Türkiye.*Favorite/i);
  assert.match(pre.whyNow, /Paraguay.*Contender/i);
  assert.match(pre.whyNow, /Longshots/i);
  assert.ok(!/three\s+long\s*shot/i.test(pre.whyNow));
  const qa = runWcUrTakeQA({
    responseText: `${pre.lean}\n\n${pre.whyNow}`,
    structured: pre,
    question: "Best value to advance from the group stage?",
    wcIntent: WC_INTENT.STRUCTURAL,
  });
  assert.ok(!qa.issueCodes.includes("wc_group_winner_outright_bleed"));
});

test("formatWcGroupCompositionPromptBlock binds four teams", () => {
  const block = formatWcGroupCompositionPromptBlock("D");
  assert.match(block, /GROUP D/i);
  assert.match(block, /exactly 4 teams/i);
  assert.match(block, /Never say "three longshots"/i);
});

test("shouldUseWcGroupSlatePrebuilt — broad cross-group value defers to model", () => {
  assert.equal(
    shouldUseWcGroupSlatePrebuilt(
      "What's the best group-stage value bet on the board?",
      WC_INTENT.STRUCTURAL,
    ),
    false,
  );
  assert.equal(
    shouldUseWcGroupSlatePrebuilt(
      "Best value to advance from the group stage?",
      WC_INTENT.STRUCTURAL,
    ),
    true,
  );
  assert.equal(
    shouldUseWcGroupSlatePrebuilt("Who wins Group A?", WC_INTENT.STRUCTURAL),
    false,
  );
});
