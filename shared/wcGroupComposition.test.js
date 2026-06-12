import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcGroupSlatePrebuiltStructured,
  buildWcCrossGroupValuePrebuiltStructured,
  buildWcRunnerUpFollowUpPrebuiltStructured,
  formatWcGroupSlateNumericLine,
  isWcGroupAdvancementPathProse,
  repairWcGroupSlateStructuredLine,
  detectWcGroupMathMismatch,
  detectWcGroupRosterMismatch,
  formatWcGroupCompositionPromptBlock,
  getWcGroupComposition,
  resolveWcGroupLettersForPrompt,
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "./wcGroupComposition.js";
import { WC_LANDING_PROMPTS } from "./wcMarketingDeepLinks.js";
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

test("shouldUseWcCrossGroupValuePrebuilt — blocks runner-up follow-up chip", () => {
  assert.equal(
    shouldUseWcCrossGroupValuePrebuilt("Which group is the runner-up value?", WC_INTENT.STRUCTURAL),
    false,
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

test("buildWcCrossGroupValuePrebuiltStructured — misprice question cites runner-up", () => {
  const pre = buildWcCrossGroupValuePrebuiltStructured({
    question: "Which group is most mispriced for advancement — name #1 and runner-up?",
    teamStats: {
      COL: { advancePct: 72 },
      PAR: { advancePct: 55 },
    },
    bdlFutures: {
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: {
          COL: { american: 150 },
          PAR: { american: -110 },
        },
      },
    },
  });
  assert.ok(pre);
  assert.match(pre.whyNow || "", /Runner-up/i);
  assert.match(pre.whyNow || "", /Runner-up gap: Group [A-L]/i);
});

test("buildWcCrossGroupValuePrebuiltStructured — misprice + coin flip ships premium deep", () => {
  const q =
    "Which 2026 World Cup group stage group is most mispriced on advancement or group-winner markets – and which second-place path is still a coin flip the books have wrong?";
  const pre = buildWcCrossGroupValuePrebuiltStructured({
    question: q,
    teamStats: {
      USA: { advancePct: 51.9, groupWinPct: 12 },
      PAR: { advancePct: 48.5, groupWinPct: 18 },
      COL: { advancePct: 72, groupWinPct: 45 },
    },
    bdlFutures: {
      source: "balldontlie_live",
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: {
          USA: { american: -750, americanDisplay: "-750", vendor: "draftkings" },
          PAR: { american: 110, americanDisplay: "+110", vendor: "draftkings" },
          COL: { american: 150, americanDisplay: "+150", vendor: "draftkings" },
        },
        win_group: {
          COL: { american: 200, americanDisplay: "+200", vendor: "draftkings" },
          PAR: { american: 900, americanDisplay: "+900", vendor: "draftkings" },
        },
      },
    },
  });
  assert.ok(pre);
  assert.match(pre.whyNow || "", /Coin-flip|coin-flip/i);
  assert.match(pre.deep || "", /BallDontLie GOAT/i);
  assert.equal(pre.breakdownAvailable, true);
});

test("buildWcRunnerUpFollowUpPrebuiltStructured — runner-up group card", () => {
  const pre = buildWcRunnerUpFollowUpPrebuiltStructured({
    groupLetter: "K",
    pickAbbr: "COL",
    teamStats: {
      COL: { advancePct: 72 },
      PAR: { advancePct: 55 },
    },
    bdlFutures: {
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: {
          COL: { american: 150 },
          PAR: { american: -110 },
        },
      },
    },
  });
  assert.ok(pre);
  assert.match(pre.call || "", /Group K.*runner-up value/i);
  assert.match(pre.lean || "", /Lean:.*advance/i);
  assert.doesNotMatch(pre.lean || "", /fade/i);
  assert.match(pre.whyNow || "", /cross-group #2 misprice|market/i);
  assert.equal(pre.groupLetter, "K");
  assert.equal(pre.runnerUpGroupLetter, "K");
});

test("buildWcCrossGroupValuePrebuiltStructured — returns null without ranking inputs", () => {
  assert.equal(
    buildWcCrossGroupValuePrebuiltStructured({
      question: "Which group is most mispriced for advancement?",
    }),
    null,
  );
});

test("prebuilt Group D copy names all four tiers correctly", () => {
  const pre = buildWcGroupSlatePrebuiltStructured({ groupLetter: "D", pickAbbr: "PAR" });
  assert.ok(pre);
  assert.doesNotMatch(pre.lean, /\+1[5-9]\d{2,}/);
  assert.doesNotMatch(pre.edge || "", /\+1[5-9]\d{2,}/);
  assert.doesNotMatch(pre.edge || "", /VERIFIED CONTEXT/i);
  assert.ok(String(pre.line || "").trim().length > 20);
  assert.notEqual(String(pre.line || "").trim(), String(pre.call || "").trim());
  assert.match(pre.deep || "", /top-two finish/i);
  assert.match(pre.whyNow, /Türkiye/i);
  assert.match(pre.whyNow, /Paraguay/i);
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

test("buildWcGroupSlatePrebuiltStructured — numeric line on face, path in deep", () => {
  const pre = buildWcGroupSlatePrebuiltStructured({
    groupLetter: "D",
    pickAbbr: "PAR",
    advanceOdds: "+180",
    simPct: 58.3,
    impliedPct: 42.1,
    delta: 16.2,
    bdlFutures: {
      source: "balldontlie_live",
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: {
          PAR: { american: 180, americanDisplay: "+180", vendor: "draftkings" },
        },
      },
    },
  });
  assert.ok(pre);
  assert.match(pre.line, /Market ~42\.1%/);
  assert.match(pre.deep, /top-two finish/i);
  assert.match(pre.deep, /BallDontLie GOAT/i);
  assert.match(pre.deep, /DraftKings/i);
  assert.match(pre.deep, /58\.3%/);
  assert.match(pre.deep, /Group D is four teams/i);
  assert.doesNotMatch(pre.line, /top-two finish/i);
});

test("buildWcCrossGroupValuePrebuiltStructured — groupValue prompt ships BDL-backed premium deep", () => {
  const pre = buildWcCrossGroupValuePrebuiltStructured({
    question: WC_LANDING_PROMPTS.groupValue,
    teamStats: {
      USA: { advancePct: 51.9 },
      PAR: { advancePct: 58.3 },
    },
    bdlFutures: {
      source: "balldontlie_live",
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: {
          USA: { american: -750, americanDisplay: "-750", vendor: "draftkings" },
          PAR: { american: 180, americanDisplay: "+180", vendor: "draftkings" },
        },
      },
    },
  });
  assert.ok(pre);
  assert.match(pre.lean || "", /-750/);
  assert.match(pre.whyNow || "", /51\.9%|market/i);
  assert.match(pre.deep || "", /BallDontLie GOAT/i);
  assert.match(pre.deep || "", /Group D is four teams/i);
  assert.match(pre.deep || "", /top-two finish/i);
});

test("repairWcGroupSlateStructuredLine — moves path prose off LINE slot", () => {
  const path =
    "Paraguay needs a top-two finish in Group D — the path is not finishing last on points behind Türkiye.";
  const repaired = repairWcGroupSlateStructuredLine({
    callType: "group_slate",
    line: path,
    whyNow:
      "The market implies Paraguay is 42.1% to advance, but UR sims put it at 58.3% (+16.2pt) — gap.",
    edge: "Watch opener.",
  });
  assert.match(repaired.line, /Market ~42\.1%/);
  assert.match(repaired.deep, /top-two finish/);
  assert.equal(isWcGroupAdvancementPathProse(repaired.line), false);
  assert.match(formatWcGroupSlateNumericLine({ impliedPct: 42.1, simPct: 58.3, delta: 16.2 }), /delta \+16\.2pt/);
});
