import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcPlayerMarketIntent,
  classifyWcQuestionIntent,
  isWcMatchTotalsQuestion,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  buildWcNamedPlayerPropsStructured,
  buildWcPlayerMarketEmptyStructured,
  resolveWcPlayerMarketAnswer,
} from "./wcPlayerMarketResolve.js";
import { inferWorldCupFromPlayerMarketQuestion } from "./wcUrTakeKeywords.js";
import {
  buildWcPlayerPropPassHeadline,
  detectTeamAnswerToPlayerQuestion,
  detectWcPlayerPropMarketLabel,
  extractWcNamedPlayerFromQuestion,
  extractWcNamedPlayerPropLegsFromQuestion,
  finalizeWcPlayerPropStructured,
  formatWcPlayerMarketPromptRules,
  formatWcPlayerPropLadderBreakdown,
  formatWcPlayerPropLadderWhy,
  isGenericWcPlayerPropQuestion,
  isWcFixturePlayerPropsQuestion,
  isWcMisroutedShotsHeadline,
  isWcPlayerPropPassStructured,
  isWcShotsPropQuestion,
  questionAsksForWcPlayerMarket,
  repairWcPlayerPropPassCard,
  repairWcShotsPropStructured,
  resolveWcPlayerMarketResponse,
  shouldForceWcPlayerMarketPass,
  synthesizePlayerPropPlayFromCitedOdds,
  synthesizeGoldenBootPlayFromBlob,
  extractGoldenBootPlayerFromBlob,
} from "./wcUrTakePlayerMarket.js";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";
import { normalizeWcStructuredForDelivery } from "./wcUrTakeStructured.js";
import { mockWcContextWithPlayerMarkets } from "../api/wcPlayerMarkets.fixture.js";
import { runWcUrTakeQA, wcQaRequiresRegeneration } from "../api/_wcUrTakeQA.js";

test("classifyWcQuestionIntent — top scorer without player word", () => {
  assert.equal(classifyWcQuestionIntent("who will score the most goals?"), WC_INTENT.TOP_SCORER);
});

test("classifyWcQuestionIntent — explicit player", () => {
  assert.equal(
    classifyWcQuestionIntent("which player will score the most goals?"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("classifyWcQuestionIntent — team goals stays structural", () => {
  assert.equal(
    classifyWcQuestionIntent("which team will score the most goals in the tournament?"),
    WC_INTENT.STRUCTURAL,
  );
});

test("questionAsksForWcPlayerMarket — golden boot", () => {
  assert.equal(questionAsksForWcPlayerMarket("Best golden boot value?"), true);
  assert.equal(classifyWcPlayerMarketIntent("Best golden boot value?"), WC_INTENT.GOLDEN_BOOT);
});

test("classifyWcQuestionIntent — Golden Boot pick question is GOLDEN_BOOT not PLAYER_PROP", () => {
  const q = "Golden Boot pick for World Cup 2026 – who scores most and why?";
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.GOLDEN_BOOT);
  assert.equal(extractWcNamedPlayerFromQuestion(q), null);
});

test("extractWcNamedPlayerFromQuestion — host nations read is not a player name", () => {
  assert.equal(extractWcNamedPlayerFromQuestion("What's your read on the host nations?"), null);
  assert.equal(
    classifyWcQuestionIntent("What's your read on the host nations?"),
    WC_INTENT.GENERAL,
  );
});

test("isWcMatchTotalsQuestion — Spain over 3.5 routes to MATCHUP not player props", () => {
  const q = "Safe to bet Spain game has over 3.5 goals?";
  const history = [
    { role: "user", content: "Best bet on ESP vs CPV if I only know the moneyline?" },
    {
      role: "assistant",
      content: "Lean Over 4.5 goals",
      wcMatchTeams: { home: "ESP", away: "CPV" },
    },
  ];
  assert.equal(isWcMatchTotalsQuestion(q), true);
  assert.equal(extractWcNamedPlayerFromQuestion(q), null);
  assert.equal(classifyWcQuestionIntent(q, history), WC_INTENT.MATCHUP);
});

test("isWcMatchTotalsQuestion — thoughts on over 3.5 without goals word", () => {
  const q =
    "Is this due to a slow start? I imagine Spain start putting together goals. Thoughts on over 3.5?";
  const history = [
    { role: "user", content: "Best live angle on ESP vs CPV right now?" },
    { role: "assistant", content: "Lean Under 2.5 goals", wcMatchTeams: { home: "ESP", away: "CPV" } },
  ];
  assert.equal(isWcMatchTotalsQuestion(q), true);
  assert.equal(classifyWcQuestionIntent(q, history), WC_INTENT.MATCHUP);
});

test("classifyWcQuestionIntent — team match goals is score prediction not player prop", () => {
  assert.equal(
    classifyWcQuestionIntent("How many goals will Spain score today?"),
    WC_INTENT.SCORE_PREDICTION,
  );
  assert.equal(extractWcNamedPlayerFromQuestion("How many goals will Spain score today?"), null);
});

test("resolveWcPlayerMarketAnswer — fixture scorer intel when match props missing", () => {
  const resolved = resolveWcPlayerMarketAnswer(
    "who is most likely to score?",
    WC_INTENT.PLAYER_PROP,
    {
      conversationHistory: [
        { role: "user", content: "France vs Spain moneyline — who wins?" },
        { role: "assistant", content: "Lean France.", wcMatchTeams: { home: "FRA", away: "ESP" } },
      ],
    },
    {
      goldenBoot: {
        rows: [
          { name: "Kylian Mbappé", nationAbbr: "FRA", americanOdds: "+600" },
          { name: "Lamine Yamal", nationAbbr: "ESP", americanOdds: "+900" },
        ],
      },
      matchPlayerProps: null,
    },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(String(resolved.structured?.lean || ""), /Mbappé/i);
  assert.match(String(resolved.structured?.lean || ""), /Yamal/i);
  assert.doesNotMatch(String(resolved.structured?.lean || ""), /lines loading/i);
  assert.doesNotMatch(String(resolved.structured?.lean || ""), /no actionable line/i);
});

test("extractWcNamedPlayerPropLegsFromQuestion — multi-player shots ask", () => {
  const q =
    "anthony gordon over 1.5 shots attempted, kane over 1.5 shots on target? musa over 1.5 shots? are these good bets?";
  const legs = extractWcNamedPlayerPropLegsFromQuestion(q);
  assert.equal(legs.length, 3);
  assert.equal(legs[0].name, "anthony gordon");
  assert.equal(legs[0].marketKey, "player_shots_ou");
  assert.equal(legs[1].name, "kane");
  assert.equal(legs[1].marketKey, "player_sot_ou");
  assert.equal(legs[2].name, "musa");
});

test("extractWcNamedPlayerPropLegsFromQuestion — each going shared threshold", () => {
  const q =
    "thoughts on Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
  const legs = extractWcNamedPlayerPropLegsFromQuestion(q);
  assert.equal(legs.length, 3);
  assert.deepEqual(
    legs.map((l) => l.name),
    ["Son", "Jimenez", "Quinones"],
  );
  assert.equal(legs[0].threshold, "2.5");
  assert.equal(legs[0].marketKey, "player_shots_ou");
});

test("resolveWcPlayerMarketAnswer — named multi-player shots no longer uses slate pass", () => {
  const q =
    "anthony gordon over 1.5 shots attempted, kane over 1.5 shots on target? musa over 1.5 shots? are these good bets?";
  const resolved = resolveWcPlayerMarketAnswer(q, WC_INTENT.PLAYER_PROP, {}, null);
  assert.equal(resolved.forcePass, true);
  assert.ok(resolved.structured);
  assert.doesNotMatch(String(resolved.structured.whyNow || ""), /remaining slate/i);
  assert.match(String(resolved.structured.whyNow || ""), /books usually publish closer to kickoff/i);
  assert.match(String(resolved.structured.call || ""), /anthony gordon, kane, or musa/i);
});

test("buildWcNamedPlayerPropsStructured — proxy labels full-match miss on card face", () => {
  const q = "anthony gordon over 1.5 shots attempted?";
  const kv = {
    matchPlayerProps: {
      eventId: "22",
      homeTeam: "ENG",
      awayTeam: "CRO",
      markets: {
        player_shots_ou: [],
        player_shots_each_half: [
          {
            name: "Anthony Gordon",
            americanOdds: "+105",
            line: "1",
            side: "over",
            nationAbbr: "ENG",
          },
        ],
      },
    },
  };
  const s = buildWcNamedPlayerPropsStructured(q, "verified", kv, {
    allMatches: [{ id: "22", homeTeam: "ENG", awayTeam: "CRO", status: "scheduled" }],
  });
  assert.ok(s);
  assert.match(s.call, /No 1\.5 full-match shots line for Anthony Gordon/i);
  assert.match(s.call, /nearest is over 1 each half at \+105/i);
  assert.match(s.whyNow, /full-match 1\.5 isn't posted/i);
});

test("extractWcNamedPlayerPropLegsFromQuestion — parser battery", () => {
  const cases = [
    {
      q: "Son, Jimenez, and Quinones over 2.5 shots",
      names: ["Son", "Jimenez", "Quinones"],
      threshold: "2.5",
    },
    {
      q: "Son, Jiménez and Quiñones over 2.5 shots",
      names: ["Son", "Jiménez", "Quiñones"],
      threshold: "2.5",
    },
    {
      q: "Son and Jimenez to each have 2+ shots",
      names: ["Son", "Jimenez"],
      threshold: "2",
    },
    {
      q: "shots for Son, Jimenez, Quinones, and Lee Kang-in over 2.5 shots",
      names: ["Son", "Jimenez", "Quinones", "Lee Kang-in"],
      threshold: "2.5",
    },
  ];
  for (const { q, names, threshold } of cases) {
    const legs = extractWcNamedPlayerPropLegsFromQuestion(q);
    assert.equal(
      legs.length,
      names.length,
      `expected ${names.length} legs for: ${q}`,
    );
    assert.deepEqual(
      legs.map((l) => l.name),
      names,
      `name mismatch for: ${q}`,
    );
    if (threshold) {
      assert.equal(legs[0].threshold, threshold, `threshold mismatch for: ${q}`);
    }
  }
});

test("buildWcNamedPlayerPropsStructured — no line is a straight pass", () => {
  const q = "anthony gordon over 1.5 shots?";
  const kv = {
    matchPlayerProps: {
      eventId: "22",
      markets: { player_shots_ou: [], player_shots_each_half: [] },
    },
  };
  const s = buildWcNamedPlayerPropsStructured(q, "verified", kv, {
    allMatches: [{ id: "22", homeTeam: "ENG", awayTeam: "CRO", status: "scheduled" }],
  });
  assert.ok(s);
  assert.match(s.lean, /no shots line posted yet for anthony gordon/i);
  assert.match(s.whyNow, /no shots line posted yet for anthony gordon/i);
});

test("buildWcNamedPlayerPropsStructured — each-going no-line names all players", () => {
  const q = "thoughts on Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
  const kv = {
    matchPlayerProps: {
      eventId: "28",
      homeTeam: "MEX",
      awayTeam: "KOR",
      markets: { player_shots_ou: [], player_shots_each_half: [] },
    },
    wcEventId: "28",
  };
  const s = buildWcNamedPlayerPropsStructured(q, "verified", kv, {
    wcEventId: "28",
    fixtureHome: "MEX",
    fixtureAway: "KOR",
    allMatches: [{ id: "28", homeTeam: "MEX", awayTeam: "KOR", status: "scheduled" }],
  });
  assert.ok(s);
  assert.match(s.call, /Son, Jimenez, or Quinones/i);
  assert.doesNotMatch(s.call, /and Quinones each going/i);
  assert.match(s.whyNow, /books usually publish closer to kickoff/i);
  assert.match(s.edge, /Directional read/i);
});

test("resolveWcPlayerMarketResponse — with KV does not force pass", () => {
  const ctx = mockWcContextWithPlayerMarkets({ wcIntent: WC_INTENT.PLAYER_PROP });
  const resolved = resolveWcPlayerMarketResponse(
    "which player will score the most goals?",
    WC_INTENT.PLAYER_PROP,
    ctx,
  );
  assert.equal(resolved.forcePass, false);
  assert.equal(resolved.playerMarketTier, "market_only");
  assert.ok(resolved.promptAppendix?.includes("GOLDEN BOOT"));
});

test("resolveWcPlayerMarketResponse — empty KV forces thin fallback", () => {
  const resolved = resolveWcPlayerMarketResponse(
    "which player will score the most goals?",
    WC_INTENT.PLAYER_PROP,
    { dataConfidence: "pre_match_estimate", matchDetails: [], playerMarketKv: null },
  );
  assert.equal(resolved.forcePass, false);
  assert.ok(resolved.promptAppendix);
});

test("detectTeamAnswerToPlayerQuestion — France headline fails", () => {
  assert.equal(
    detectTeamAnswerToPlayerQuestion(
      "France will score the most goals in the tournament.",
      "Mbappé leads the attack.",
      "which player will score the most goals?",
    ),
    true,
  );
});

test("detectTeamAnswerToPlayerQuestion — thin structured passes QA detector", () => {
  const s = buildWcPlayerMarketEmptyStructured(
    "who will score the most goals?",
    WC_INTENT.TOP_SCORER,
  );
  assert.equal(
    detectTeamAnswerToPlayerQuestion(s.lean, s.whyNow, "who will score the most goals?"),
    false,
  );
});

test("runWcUrTakeQA — France-as-player answer fails with regeneration", () => {
  const qa = runWcUrTakeQA({
    responseText: "France will score the most goals in the tournament.",
    structured: {
      lean: "Lean: France will score the most goals in the tournament.",
      whyNow: "France has attacking depth.",
    },
    question: "which player will score the most goals?",
    wcIntent: WC_INTENT.PLAYER_PROP,
    requiredEntities: [],
    forbiddenEntities: [],
    playerMarketKv: mockWcContextWithPlayerMarkets().playerMarketKv,
  });
  assert.equal(qa.passed, false);
  assert.equal(qa.qaPlayerMatch, "fail");
  assert.ok(qa.issueCodes.includes("wc_player_question_team_lead"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("shouldForceWcPlayerMarketPass — false when KV populated", () => {
  assert.equal(
    shouldForceWcPlayerMarketPass({
      wcContext: mockWcContextWithPlayerMarkets(),
    }),
    false,
  );
});

test("isWcFixturePlayerPropsQuestion — Ecuador vs Ivory Coast", () => {
  const q = "Best player props for Ecuador vs Ivory Coast?";
  assert.equal(isWcFixturePlayerPropsQuestion(q), true);
  assert.match(formatWcPlayerMarketPromptRules(WC_INTENT.PLAYER_PROP, q), /MULTIPLE player props/);
});

test("buildWcPlayerPropPassHeadline — generic remaining matches slate", () => {
  const q = "What are the best player props for the remaining matches?";
  assert.equal(
    buildWcPlayerPropPassHeadline(q),
    "Player props for remaining matches — Pass until lines post.",
  );
  assert.equal(extractWcNamedPlayerFromQuestion(q), null);
  assert.equal(isGenericWcPlayerPropQuestion(q), true);
});

test("buildWcPlayerPropPassHeadline — today's remaining matches slate", () => {
  const q = "Best player props for today's remaining matches?";
  assert.equal(
    buildWcPlayerPropPassHeadline(q),
    "Player props for remaining matches — Pass until lines post.",
  );
  assert.equal(extractWcNamedPlayerFromQuestion(q), null);
});

test("inferWorldCupFromPlayerMarketQuestion — generic player props", () => {
  assert.equal(
    inferWorldCupFromPlayerMarketQuestion("Best player props for today's remaining matches?"),
    true,
  );
  assert.equal(inferWorldCupFromPlayerMarketQuestion("Best props for LeBron tonight"), false);
});

test("classifyWcQuestionIntent — today's remaining player props", () => {
  assert.equal(
    classifyWcQuestionIntent("Best player props for today's remaining matches?"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("resolveWcPlayerMarketAnswer — generic slate without match props forces pass", () => {
  const resolved = resolveWcPlayerMarketAnswer(
    "Best player props for today's remaining matches?",
    WC_INTENT.PLAYER_PROP,
    { playerMarketKv: { goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] } } },
    {
      goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] },
      matchPlayerProps: null,
    },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.structured?.call || "", /remaining matches/i);
});

test("buildWcPlayerPropPassHeadline — named player unchanged", () => {
  assert.equal(buildWcPlayerPropPassHeadline("Son 2.5 shots?"), "No posted Son shots line — Pass.");
});

test("repairWcPlayerPropPassCard — generic slate avoids What name leak", () => {
  const repaired = repairWcPlayerPropPassCard(
    {
      call: "No posted What are the player prop line — Pass.",
      lean: "Pass — no actionable line yet.",
      whyNow: "Tournament is in Final phase (Spain vs Argentina projected).",
    },
    "What are the best player props for the remaining matches?",
  );
  assert.equal(
    repaired.call,
    "Player props for remaining matches — Pass until lines post.",
  );
  assert.doesNotMatch(repaired.call, /\bWhat\b/);
});

test("detectWcPlayerPropMarketLabel — shots vs SOT", () => {
  assert.equal(detectWcPlayerPropMarketLabel("Son 2.5 shots?"), "shots");
  assert.equal(detectWcPlayerPropMarketLabel("Son 1.5 shots on target?"), "shots on target");
  assert.equal(detectWcPlayerPropMarketLabel("Jimenez to score or assist?"), "goal or assist");
});

test("isWcPlayerPropPassStructured — skips pass when body cites American odds", () => {
  assert.equal(
    isWcPlayerPropPassStructured(
      {
        call: "No posted Son shots line — Pass.",
        lean: "Pass — no actionable line yet.",
        whyNow: "Son's shots board is steep: over 1 at -2500, over 2 at -400, over 3 at -135.",
      },
      "Son 2.5 shots?",
    ),
    false,
  );
});

test("repairWcPlayerPropPassCard — short headline and shots wording", () => {
  const repaired = repairWcPlayerPropPassCard(
    {
      call:
        "No verified shots-on-target line for Son Heung-min exists in the current market feed — Pass until a line posts.",
      lean: "Pass — no actionable line yet; see Watch For before locking a bet.",
      whyNow:
        "Son is South Korea's primary threat for KOR vs CZE, but no match shots-on-target prop is listed.",
      edge: "Wait for lineups and a posted shots line.",
    },
    "Son 2.5 shots?",
  );
  assert.equal(repaired.call, "No posted Son shots line — Pass.");
  assert.match(repaired.whyNow, /shots/i);
  assert.doesNotMatch(repaired.whyNow, /shots-on-target/i);
});

test("repairWcPlayerPropPassCard — SGP combo keeps correlation on pass", () => {
  const repaired = repairWcPlayerPropPassCard(
    {
      call: "Pass — no actionable line yet; see Watch For before locking a bet.",
      lean: "Pass — no actionable line yet.",
      whyNow: "",
      edge: "Wait for lineups.",
    },
    "Jimenez 2+ shots and Mexico team to score first goal",
  );
  assert.match(repaired.call, /share one script/i);
  assert.match(repaired.lean, /script/i);
});

test("formatWcPlayerPropLadderBreakdown — dedupes repeated legs", () => {
  const out = formatWcPlayerPropLadderBreakdown(
    "over 3 at -135. over 3 at -135. over 3 at -135.",
    "Son over 2.5 shots?",
  );
  assert.equal((out.match(/Over 3 · -135/g) || []).length, 1);
});

test("isWcMisroutedShotsHeadline — blocks outright +190 on shots ask", () => {
  assert.equal(isWcShotsPropQuestion("Son over 2.5 shots?"), true);
  assert.equal(isWcMisroutedShotsHeadline("Son +190 — structural longshot thesis.", "Son over 2.5 shots?"), true);
  assert.equal(isWcMisroutedShotsHeadline("Lean: over 3 at -135 — worth paying.", "Son over 2.5 shots?"), false);
});

test("repairWcShotsPropStructured — forces ladder headline and line breakdown", () => {
  const repaired = repairWcShotsPropStructured(
    {
      call: "Son +190 — structural longshot thesis.",
      lean: "Lean: Son +190 — structural longshot thesis.",
      whyNow: "Son's shot lines: over 1 at -2500, over 2 at -400, over 3 at -135, over 4 at +190.",
      edge: "Watch for confirmed lineup.",
      deep: "Son's shot lines: over 1 at -2500, over 2 at -400, over 3 at -135, over 4 at +190. Lean over 3 at -135.",
    },
    "Son over 2.5 shots?",
  );
  assert.match(repaired.call, /over 3 at -135/i);
  assert.doesNotMatch(repaired.call, /structural longshot/i);
  assert.match(repaired.deep, /Over 1 · -2500/);
  assert.match(repaired.deep, /Over 3 · -135/);
  assert.match(repaired.deep, /Over 2\.5 isn't posted/i);
  assert.match(repaired.line, /nearest to 2\.5 ask/i);
  assert.match(repaired.whyNow, /Over 3 at -135/);
  assert.match(repaired.whyNow, /implied/);
});

test("finalizeWcPlayerPropStructured — buildWcCompactStructured misroute repair", () => {
  const s = buildWcCompactStructured({
    question: "Son over 2.5 shots?",
    wcIntent: WC_INTENT.PLAYER_PROP,
    summary: "Son +190 — structural longshot thesis.",
    deep:
      "Over 1 at -2500, over 2 at -400, over 3 at -135, over 4 at +190. Korea need a result vs Czechia. WATCH FOR: confirmed XI.",
  });
  assert.match(s.call, /over 3 at -135/i);
  assert.doesNotMatch(s.call, /\+190.*thesis/i);
});

test("formatWcPlayerPropLadderWhy — does not orphan leg verdict fragments", () => {
  const why =
    "Son is Korea's primary threat.\nOver 1 at -2500 is juice.\nOver 2 at -400 is still heavy.\nOver 3 at -135 is where the value lives.";
  const out = formatWcPlayerPropLadderWhy(why, "Son over 2.5 shots?");
  assert.doesNotMatch(out, /^is juice/m);
  assert.doesNotMatch(out, /\nis juice/i);
  assert.match(out, /Over 1 at -2500/);
  assert.match(out, /Over 3 at -135/);
});

test("formatWcPlayerPropLadderWhy — splits milestone legs line by line", () => {
  const why =
    "Son's shot lines tell the story: over 1 at -2500, over 2 at -400, over 3 at -135. Over 2.5 isn't posted.";
  const out = formatWcPlayerPropLadderWhy(why, "Son over 2.5 shots?");
  assert.match(out, /Over 1 at -2500/);
  assert.match(out, /Over 2 at -400/);
  assert.match(out, /Over 3 at -135/);
  assert.match(out, /nearest playable to your ask/i);
  assert.ok(out.includes("\n"));
});

test("synthesizeGoldenBootPlayFromBlob — marketing pick names Mbappé not generic pass", () => {
  const play = synthesizeGoldenBootPlayFromBlob(
    "Mbappé leads the adjusted model by a wide margin — six expected games for France.",
    "Market +600 on Mbappé. Pass at +600 — fair favorite. Vinícius at +1000.",
    "Golden Boot pick for World Cup 2026 — who scores most and why?",
  );
  assert.match(play, /Mbappé/i);
  assert.match(play, /Golden Boot/i);
  assert.doesNotMatch(play, /no actionable line/i);
});

test("extractGoldenBootPlayerFromBlob — finds leader from prose", () => {
  assert.equal(
    extractGoldenBootPlayerFromBlob("Mbappé leads the adjusted model by a wide margin."),
    "Mbappé",
  );
});

test("synthesizePlayerPropPlayFromCitedOdds — lean over 3 when edge language present", () => {
  const play = synthesizePlayerPropPlayFromCitedOdds(
    "Son over 3 total shots is the real edge.",
    "over 1 at -2500, over 2 at -400, over 3 at -135 clears breakeven comfortably.",
    "Son over 2.5 shots?",
  );
  assert.match(play, /Lean: over 3 at -135/i);
  assert.match(play, /worth paying/i);
});

test("normalizeWcStructuredForDelivery — player prop pass repair", () => {
  const out = normalizeWcStructuredForDelivery(
    {
      call:
        "No verified shots-on-target line for Son Heung-min exists in the current market feed — Pass until books post.",
      lean: "Pass — no verified line.",
      whyNow: "Fixture is KOR vs CZE on June 12.",
      edge: "Watch for confirmed XI.",
      playerMarketTier: "thin",
    },
    WC_INTENT.PLAYER_PROP,
    "Son 2.5 shots?",
  );
  assert.equal(out.call, "No posted Son shots line — Pass.");
});

test("finalizeWcPlayerPropStructured repairs multi-leg whyNow goals bleed", () => {
  const out = finalizeWcPlayerPropStructured(
    {
      wcNamedPlayerPropsCard: true,
      call: "2 of 2 playable",
      lean: "1. Jimenez over 3 at +360 — playable\n2. Quinones over 3 at +370 — playable",
      whyNow: "Over 3 at +360 (~21.7% implied) — nearest posted line to your ask.",
    },
    "Jimenez and Quinones each going over 2.5 shots attempted?",
  );
  assert.match(String(out.whyNow), /All 2 names have posted lines/i);
});

test("extractWcNamedPlayerPropLegsFromQuestion — bare each going over extracts all three names", () => {
  const q = "Son, Jimenez, and Quinones each going over 2.5 shots attempted?";
  const legs = extractWcNamedPlayerPropLegsFromQuestion(q);
  assert.equal(legs.length, 3);
  assert.deepEqual(
    legs.map((l) => l.name),
    ["Son", "Jimenez", "Quinones"],
  );
});

test("extractWcNamedPlayerPropLegsFromQuestion — two names with and (no comma) each going", () => {
  const q = "Jimenez and Quinones each going over 2.5 shots attempted?";
  const legs = extractWcNamedPlayerPropLegsFromQuestion(q);
  assert.equal(legs.length, 2);
  assert.deepEqual(
    legs.map((l) => l.name),
    ["Jimenez", "Quinones"],
  );
  assert.equal(legs[0].threshold, "2.5");
});
