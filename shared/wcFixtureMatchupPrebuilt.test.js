import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  getWcFixtureMlSeed,
  isWcPromoFixturePair,
  resolveWcFixturePairFromHistory,
  resolveWcFixturePairFromQuestion,
  shouldUseWcFixtureMatchupAltFollowUpPrebuilt,
  shouldUseWcFixtureMatchupPrebuilt,
} from "./wcFixtureMatchupPrebuilt.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";
import { prepareWcCardFaceDisplay } from "../src/lib/wcTakeCardUi.js";

test("resolveWcFixturePairFromQuestion finds USA vs PAR", () => {
  const pair = resolveWcFixturePairFromQuestion("Who wins USA vs PAR (Group D)?");
  assert.equal(pair?.home, "USA");
  assert.equal(pair?.away, "PAR");
  assert.equal(pair?.group, "D");
});

test("shouldUseWcFixtureMatchupPrebuilt for matchup intent", () => {
  const q = "Who wins USA vs PAR (Group D)?";
  assert.ok(shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.MATCHUP));
  assert.ok(!shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.STRUCTURAL));
});

test("buildWcFixtureMatchupPrebuiltStructured USA vs PAR winner headline", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question: "Who wins USA vs PAR (Group D)?",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
    },
  });
  assert.equal(structured?.call, "Lean Under 2.5 goals");
  assert.match(structured?.whyNow || "", /sits deep/i);
  assert.match(structured?.whyNow || "", /rarely blows teams out/i);
  assert.doesNotMatch(structured?.whyNow || "", /advances in \d/i);
  assert.match(structured?.deep || "", /WINS IF:/i);
  assert.match(structured?.deep || "", /DIES IF:/i);
  assert.match(structured?.deep || "", /MATCH ODDS:/i);
  assert.doesNotMatch(structured?.edge || "", /lineup/i);
});

test("buildWcFixtureMatchupPrebuiltStructured marketing prompt leans both advance when sim supports", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question:
      "USA vs Paraguay — best bet for Americans who only know the moneyline (group context, not just ML)",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 42 },
    },
  });
  assert.match(structured?.lean || "", /both teams to advance/i);
  assert.match(structured?.whyNow || "", /Türkiye|Turkey/i);
});

test("buildWcFixtureMatchupPrebuiltStructured marketing prompt avoids both advance when Türkiye likely advances", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question:
      "USA vs Paraguay — best bet for Americans who only know the moneyline (group context, not just ML)",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 62 },
    },
  });
  assert.match(structured?.lean || "", /under 2\.5/i);
  assert.doesNotMatch(structured?.lean || "", /both teams to advance/i);
});

test("prepareWcCardFaceDisplay shows prebuilt winner + alt play", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question: "Who wins USA vs PAR (Group D)?",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
    },
  });
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: structured.call,
    lean: structured.lean,
    why: structured.whyNow,
    watchFor: structured.edge,
    thePlay: structured.lean,
    breakdown: structured.deep,
    breakdownAvailable: true,
    focusLayout: true,
    lineSlot: structured.line,
    question: "Who wins USA vs PAR (Group D)?",
  });
  assert.equal(face.headline, "Lean Under 2.5 goals");
  assert.match(face.sections.thePlay, /Alt:.*United States \+110 to win/i);
  assert.match(face.sections.why, /sits deep/i);
});

test("runWcUrTakeQA passes prebuilt USA vs PAR", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question: "Who wins USA vs PAR (Group D)?",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
    },
  });
  const qa = runWcUrTakeQA({
    responseText: structured.lean,
    structured,
    question: "Who wins USA vs PAR (Group D)?",
    wcIntent: WC_INTENT.MATCHUP,
    requiredEntities: ["USA", "PAR"],
    teamStats: { USA: { advancePct: 51.8 }, PAR: { advancePct: 75.95 } },
  });
  assert.ok(!qa.issueCodes.includes("wc_matchup_missing_winner_line"));
});

test("isWcPromoFixturePair recognizes opener slate", () => {
  assert.ok(isWcPromoFixturePair("USA", "PAR"));
  assert.ok(!isWcPromoFixturePair("USA", "MEX"));
});

test("resolveWcFixturePairFromHistory reads prior who-wins turn", () => {
  const pair = resolveWcFixturePairFromHistory([
    { content: "Who wins USA vs PAR (Group D)?" },
    { structured: { callType: "matchup", fixtureHome: "USA", fixtureAway: "PAR", groupLetter: "D" } },
  ]);
  assert.equal(pair?.home, "USA");
  assert.equal(pair?.away, "PAR");
});

test("shouldUseWcFixtureMatchupAltFollowUpPrebuilt on besides-ML follow-up", () => {
  const history = [{ content: "Who wins USA vs PAR (Group D)?" }];
  assert.ok(
    shouldUseWcFixtureMatchupAltFollowUpPrebuilt(
      "What's the best bet besides the moneyline?",
      WC_INTENT.MATCHUP,
      { isConversationFollowUp: true, history },
    ),
  );
  assert.ok(
    !shouldUseWcFixtureMatchupPrebuilt(
      "What's the best bet besides the moneyline?",
      WC_INTENT.MATCHUP,
      { isConversationFollowUp: true },
    ),
  );
});

test("buildWcFixtureMatchupPrebuiltStructured alt follow-up uses play headline not ML", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question:
      "Who wins USA vs PAR (Group D)?\n\nFollow-up:\nWhat's the best bet besides the moneyline?",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
    },
  });
  assert.equal(structured?.call, "Lean Under 2.5 goals");
  assert.doesNotMatch(structured?.call || "", /to win/i);
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: structured.call,
    lean: structured.lean,
    why: structured.whyNow,
    watchFor: structured.edge,
    thePlay: structured.lean,
    breakdown: structured.deep,
    breakdownAvailable: true,
    focusLayout: true,
    lineSlot: structured.line,
    question: "What's the best bet besides the moneyline?",
  });
  assert.equal(face.headline, "Lean Under 2.5 goals");
  assert.match(face.sections.thePlay, /Alt:.*United States \+110 to win/i);
});

test("prepareWcCardFaceDisplay both-advance follow-up uses advance headline not ML", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question: "Both teams to advance?",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 42 },
    },
  });
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: structured.call,
    lean: structured.lean,
    why: structured.whyNow,
    watchFor: structured.edge,
    thePlay: structured.lean,
    breakdown: structured.deep,
    breakdownAvailable: true,
    focusLayout: true,
    lineSlot: structured.line,
    question: "Both teams to advance?",
  });
  assert.match(face.headline, /both teams to advance/i);
  assert.doesNotMatch(face.headline, /to win/i);
});
