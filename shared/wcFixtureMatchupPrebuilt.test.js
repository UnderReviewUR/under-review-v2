import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  extractPriorTotalsLeanFromHistory,
  getWcFixtureMlSeed,
  isWcPromoFixturePair,
  resolveWcFixturePairFromHistory,
  resolveWcFixturePairFromQuestion,
  shouldUseWcFixtureMatchupAltFollowUpPrebuilt,
  shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt,
  shouldUseWcFixtureMatchupPrebuilt,
  shouldUseWcLiveBetTimingPrebuilt,
  buildWcLiveBetTimingPrebuiltStructured,
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

test("buildWcFixtureMatchupPrebuiltStructured GER vs CUW heavy favorite leans Over 4.5", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "GER",
    away: "CUW",
    group: "E",
    question: "Best bet on GER vs CUW if I only know the moneyline?",
    match: {
      odds: {
        home: { moneyline: "-3500" },
        away: { moneyline: "+3000" },
        draw: { moneyline: "+1600" },
        totalLine: 4.5,
        totalOver: "-110",
        provider: "draftkings",
      },
    },
  });
  assert.equal(structured?.call, "Lean Over 4.5 goals");
  assert.match(structured?.whyNow || "", /Heavy favorite/i);
  assert.doesNotMatch(structured?.whyNow || "", /sits deep and Germany rarely blows/i);
});

test("buildWcFixtureMatchupPrebuiltStructured other-side follow-up flips Over to Under", () => {
  const history = [
    { content: "Best bet on GER vs CUW if I only know the moneyline?" },
    {
      role: "assistant",
      structured: { call: "Lean Over 4.5 goals", lean: "Pass on ML — Lean Over 4.5 goals" },
    },
  ];
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "GER",
    away: "CUW",
    group: "E",
    question: "What's the other side?",
    match: {
      odds: {
        home: { moneyline: "-3500" },
        away: { moneyline: "+3000" },
        draw: { moneyline: "+1600" },
        totalLine: 4.5,
        totalOver: "-110",
        provider: "draftkings",
      },
    },
    history,
  });
  assert.equal(structured?.call, "Lean Under 4.5 goals");
  assert.doesNotMatch(structured?.lean || "", /Pass on ML/i);
});

test("extractPriorTotalsLeanFromHistory reads last assistant totals lean", () => {
  const prior = extractPriorTotalsLeanFromHistory([
    { role: "assistant", structured: { call: "Lean Over 4.5 goals" } },
  ]);
  assert.deepEqual(prior, { kind: "over", line: "4.5" });
});

test("buildWcFixtureMatchupPrebuiltStructured why-under follow-up reaffirms prior Under lean", () => {
  const history = [
    { role: "user", content: "Best bet on BEL vs EGY if I only know the moneyline?" },
    {
      role: "assistant",
      structured: { lean: "Pass on ML — Lean Under 2.5 goals", call: "Lean Under 2.5 goals" },
    },
  ];
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "BEL",
    away: "EGY",
    group: "G",
    question: "why under 2.5 goals?",
    match: {
      odds: {
        home: { moneyline: "-140" },
        away: { moneyline: "+380" },
        draw: { moneyline: "+260" },
        totalLine: 2.5,
        totalOver: "-106",
        totalUnder: "-114",
      },
    },
    history,
  });
  assert.match(structured?.call || "", /Under 2\.5/i);
  assert.doesNotMatch(structured?.call || "", /Over 2\.5/i);
  const first = buildWcFixtureMatchupPrebuiltStructured({
    home: "BEL",
    away: "EGY",
    group: "G",
    question: "Best bet on BEL vs EGY if I only know the moneyline?",
    match: {
      odds: {
        home: { moneyline: "-140" },
        away: { moneyline: "+380" },
        draw: { moneyline: "+260" },
        totalLine: 2.5,
        totalOver: "-106",
        totalUnder: "-114",
      },
    },
  });
  assert.notEqual(structured?.whyNow, first?.whyNow);
  assert.match(structured?.whyNow || "", /low tempo|packs in|cashes when/i);
  assert.doesNotMatch(structured?.whyNow || "", /rarely blows teams out/i);
  assert.equal(structured?.breakdownDefaultExpanded, true);
  assert.match(structured?.deep || "", /WINS IF:/i);
  assert.match(structured?.deep || "", /under -114/i);
});

test("buildWcFixtureMatchupPrebuiltStructured Over or under goals flips prior totals lean", () => {
  const history = [
    { content: "Best bet on GER vs CUW if I only know the moneyline?" },
    {
      role: "assistant",
      structured: { call: "Lean Over 4.5 goals", lean: "Pass on ML — Lean Over 4.5 goals" },
    },
  ];
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "GER",
    away: "CUW",
    group: "E",
    question: "Over or under goals?",
    match: {
      odds: {
        home: { moneyline: "-3500" },
        away: { moneyline: "+3000" },
        draw: { moneyline: "+1600" },
        totalLine: 4.5,
        totalOver: "-110",
        provider: "draftkings",
      },
    },
    history,
  });
  assert.equal(structured?.call, "Lean Under 4.5 goals");
});

test("buildWcFixtureMatchupPrebuiltStructured other-side after both-advance leans Under", () => {
  const history = [
    { content: "Who wins USA vs PAR (Group D)?" },
    {
      role: "assistant",
      structured: { call: "Both teams to advance in Group D.", lean: "Pass on ML — both teams to advance" },
    },
  ];
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "USA",
    away: "PAR",
    group: "D",
    question: "What's the other side?",
    match: { odds: getWcFixtureMlSeed("USA", "PAR") },
    teamStats: {
      USA: { advancePct: 51.8 },
      PAR: { advancePct: 75.95 },
      TUR: { advancePct: 42 },
    },
    history,
  });
  assert.equal(structured?.call, "Lean Under 2.5 goals");
});

test("shouldUseWcFixtureMatchupAltFollowUpPrebuilt when fixture pair in history", () => {
  const history = [{ content: "Best bet on GER vs CUW if I only know the moneyline?" }];
  assert.ok(
    shouldUseWcFixtureMatchupAltFollowUpPrebuilt("What's the other side?", WC_INTENT.MATCHUP, {
      isConversationFollowUp: true,
      history,
    }),
  );
});

test("shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt on mashup follow-up", () => {
  const history = [{ content: "Best bet on GER vs CUW if I only know the moneyline?" }];
  assert.ok(
    shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt(
      "Who wins Best bet on GER vs CUW if I only know the moneyline?",
      WC_INTENT.MATCHUP,
      { isConversationFollowUp: true, history, hasKvFixture: true },
    ),
  );
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

test("live ESP vs CPV over 3.5 follow-up routes through alt prebuilt at 0-0 live", () => {
  const q =
    "Is this due to a slow start? I imagine Spain start putting together goals. Thoughts on over 3.5?";
  const history = [
    { role: "user", content: "Best live angle on ESP vs CPV right now?" },
    {
      role: "assistant",
      content: "Lean Under 2.5 goals",
      wcMatchTeams: { home: "ESP", away: "CPV" },
    },
  ];
  assert.equal(
    shouldUseWcFixtureMatchupAltFollowUpPrebuilt(q, WC_INTENT.MATCHUP, {
      isConversationFollowUp: true,
      hasKvFixture: true,
      history,
      match: { status: "live", homeScore: 0, awayScore: 0 },
    }),
    true,
  );
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "ESP",
    away: "CPV",
    group: "H",
    question: q,
    match: {
      status: "live",
      homeScore: 0,
      awayScore: 0,
      odds: {
        home: { moneyline: "-450" },
        away: { moneyline: "+1200" },
        draw: { moneyline: "+550" },
        totalLine: 2.5,
        provider: "draftkings",
      },
    },
    history,
  });
  assert.match(structured?.lean || structured?.call || "", /over 3\.5/i);
});

test("live bet timing follow-up reaffirms prior Over 1.5 lean at 0-0 second half", () => {
  const q =
    "When's the best time to place the bet? The second half just started. 0-0 is the score";
  const history = [
    { role: "user", content: "Best live angle on ESP vs CPV right now?" },
    { role: "assistant", content: "Lean Under 2.5 goals", wcMatchTeams: { home: "ESP", away: "CPV" } },
    { role: "user", content: "What's the chances there's over 1.5 goals scored?" },
    { role: "assistant", content: "Lean Over 1.5 goals", wcMatchTeams: { home: "ESP", away: "CPV" } },
  ];
  assert.equal(
    shouldUseWcLiveBetTimingPrebuilt(q, { isConversationFollowUp: true, history }),
    true,
  );
  const structured = buildWcLiveBetTimingPrebuiltStructured({
    home: "ESP",
    away: "CPV",
    group: "H",
    question: q,
    match: { status: "live", homeScore: 0, awayScore: 0 },
    history,
  });
  assert.match(structured?.call || "", /over 1\.5/i);
  assert.match(structured?.whyNow || "", /0-0|second-half|lock live/i);
  assert.doesNotMatch(structured?.lean || "", /no actionable line yet/i);
});

test("live NED vs JPN at 2-1 blocks prebuilt under 2.5 on live-angle prompt", () => {
  assert.equal(
    shouldUseWcFixtureMatchupPrebuilt({
      sport: "wc",
      question: "Best live angle on NED vs JPN right now?",
      home: "NED",
      away: "JPN",
      group: "F",
      match: { status: "live", homeScore: 2, awayScore: 1 },
    }),
    false
  );
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "NED",
    away: "JPN",
    group: "F",
    question: "Best live angle on NED vs JPN right now?",
    match: { status: "live", homeScore: 2, awayScore: 1, odds: getWcFixtureMlSeed("NED", "JPN") },
  });
  assert.equal(structured, null);
});

test("CIV vs ECU moneyline best-bet prompt prefers totals not both advance", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "CIV",
    away: "ECU",
    group: "E",
    question: "Best bet on CIV vs ECU if I only know the moneyline?",
    match: {
      odds: {
        home: { moneyline: "+145" },
        draw: { moneyline: "+220" },
        away: { moneyline: "+155" },
        provider: "seed",
      },
    },
    teamStats: {
      CIV: { advancePct: 45 },
      ECU: { advancePct: 62 },
      GER: { advancePct: 58 },
      CUW: { advancePct: 20 },
    },
  });
  assert.match(structured?.lean || "", /under 2\.5|over 2\.5/i);
  assert.doesNotMatch(structured?.lean || "", /both teams to advance/i);
});

test("player parlay question does not use fixture matchup prebuilt", () => {
  const q = "List player parlay props to consider for the remaining matches today";
  assert.equal(
    shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.MATCHUP, { hasKvFixture: true }),
    false,
  );
  assert.equal(
    shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt(q, WC_INTENT.MATCHUP, {
      isConversationFollowUp: true,
      hasKvFixture: true,
      history: [
        {
          role: "user",
          content: "Best bet on CIV vs ECU if I only know the moneyline?",
        },
      ],
    }),
    false,
  );
});

test("4 player parlay for named fixture does not use matchup prebuilt", () => {
  const q = "4 player parlay for CIV vs ECU";
  assert.equal(
    shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.PLAYER_PROP, { hasKvFixture: true }),
    false,
  );
  assert.equal(
    shouldUseWcFixtureMatchupAltFollowUpPrebuilt(q, WC_INTENT.PLAYER_PROP, {
      isConversationFollowUp: true,
      hasKvFixture: true,
      mentionedTeams: ["CIV", "ECU"],
      history: [
        {
          role: "user",
          content: "Best bet on CIV vs ECU if I only know the moneyline?",
        },
      ],
    }),
    false,
  );
});
