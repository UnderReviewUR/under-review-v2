import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcPlayerMarketIntent,
  classifyWcQuestionIntent,
  isWcMatchTotalsQuestion,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  buildWcPlayerMarketEmptyStructured,
  resolveWcPlayerMarketAnswer,
} from "./wcPlayerMarketResolve.js";
import { inferWorldCupFromPlayerMarketQuestion } from "./wcUrTakeKeywords.js";
import {
  buildWcPlayerPropPassHeadline,
  detectTeamAnswerToPlayerQuestion,
  detectWcPlayerPropMarketLabel,
  extractWcNamedPlayerFromQuestion,
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
