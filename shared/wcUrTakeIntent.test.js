import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTurnScopeBlock,
  classifyWcQuestionIntent,
  classifyWcPlayerMarketIntent,
  shouldInjectStaticRules,
  isWcPlayerMarketIntent,
  isWcFixturePlayerMarketIntent,
  isWcPlayerAwardMarketIntent,
  WC_INTENT,
  WC_INTENT_CATALOG,
} from "./wcUrTakeIntent.js";
import {
  resolveRequiredEntities,
  textMentionsWcTeam,
} from "./wcUrTakeEntityBinding.js";

test("classifyWcQuestionIntent — Norway pricing", () => {
  assert.equal(
    classifyWcQuestionIntent("Norway at +2500 to win the World Cup — mispriced?"),
    WC_INTENT.ENTITY_PRICING,
  );
});

test("classifyWcQuestionIntent — Brazil pricing", () => {
  assert.equal(
    classifyWcQuestionIntent("Is Brazil mispriced to win the tournament?"),
    WC_INTENT.ENTITY_PRICING,
  );
});

test("classifyWcQuestionIntent — matchup", () => {
  assert.equal(
    classifyWcQuestionIntent("Norway vs France — who advances? Look at the odds."),
    WC_INTENT.MATCHUP,
  );
});

test("classifyWcQuestionIntent — rules", () => {
  assert.equal(
    classifyWcQuestionIntent("What are the knockout rules for extra time and penalties?"),
    WC_INTENT.RULES,
  );
});

test("shouldInjectStaticRules — true for rules question during group stage", () => {
  const q = "What are the knockout rules for extra time and penalties?";
  assert.equal(shouldInjectStaticRules(q, WC_INTENT.RULES), true);
});

test("textMentionsWcTeam — Brazil aliases", () => {
  assert.ok(textMentionsWcTeam("Brazil is fairly priced at +500", "BRA"));
  assert.ok(!textMentionsWcTeam("Norway offers value", "BRA"));
});

test("resolveRequiredEntities — matchup returns both teams", () => {
  const entities = resolveRequiredEntities(
    "Norway vs France — who advances? Look at the odds.",
    [],
    WC_INTENT.MATCHUP,
  );
  assert.deepEqual(entities.sort(), ["FRA", "NOR"]);
});

test("classifyWcQuestionIntent — player market intents", () => {
  assert.equal(classifyWcQuestionIntent("who will score the most goals?"), WC_INTENT.TOP_SCORER);
  assert.equal(
    classifyWcQuestionIntent("which player will score the most goals?"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("classifyWcQuestionIntent — extended match player prop intents", () => {
  assert.equal(
    classifyWcQuestionIntent("Will Mbappé record an assist in France vs Brazil?"),
    WC_INTENT.PLAYER_PROP,
  );
  assert.equal(
    classifyWcQuestionIntent("Best player shots on target prop for Vinícius?"),
    WC_INTENT.PLAYER_PROP,
  );
  assert.equal(
    classifyWcQuestionIntent("Is Casemiro worth the yellow card prop?"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("classifyWcQuestionIntent — player parlay beats matchup when fixture named", () => {
  assert.equal(classifyWcPlayerMarketIntent("4 player parlay"), WC_INTENT.PLAYER_PROP);
  assert.equal(
    classifyWcQuestionIntent("4 player parlay for CIV vs ECU"),
    WC_INTENT.PARLAY,
  );
  assert.equal(classifyWcQuestionIntent("4 player parlay"), WC_INTENT.PARLAY);
});

test("isWcPlayerMarketIntent — PLAYER_PROP and PARLAY only in narrow helper", () => {
  assert.equal(isWcPlayerMarketIntent(WC_INTENT.PLAYER_PROP), true);
  assert.equal(isWcPlayerMarketIntent(WC_INTENT.PARLAY), true);
  assert.equal(isWcPlayerMarketIntent(WC_INTENT.GOLDEN_BOOT), false);
  assert.equal(isWcFixturePlayerMarketIntent(WC_INTENT.PARLAY), true);
  assert.equal(isWcPlayerAwardMarketIntent(WC_INTENT.GOLDEN_BOOT), true);
  assert.equal(isWcPlayerAwardMarketIntent(WC_INTENT.PARLAY), false);
});

test("resolveRequiredEntities — player market returns no teams", () => {
  assert.deepEqual(
    resolveRequiredEntities("which player will score the most goals?", [], WC_INTENT.PLAYER_PROP),
    [],
  );
});

test("WC_INTENT_CATALOG — includes GENERAL catch-all", () => {
  const general = WC_INTENT_CATALOG.find((row) => row.id === WC_INTENT.GENERAL);
  assert.ok(general);
  assert.match(general.description, /catch-all|any World Cup/i);
});

test("classifyWcQuestionIntent — tournament winner uses ENTITY_PRICING", () => {
  assert.equal(classifyWcQuestionIntent("Who wins the World Cup?"), WC_INTENT.ENTITY_PRICING);
  assert.equal(classifyWcQuestionIntent("who wins the world cup?"), WC_INTENT.ENTITY_PRICING);
});

test("classifyWcQuestionIntent — Game 1 matchup stays MATCHUP not tournament winner", () => {
  assert.equal(
    classifyWcQuestionIntent("South Africa or Mexico — Who will win Game 1?"),
    WC_INTENT.MATCHUP,
  );
});

test("classifyWcQuestionIntent — open questions use GENERAL not group template", () => {
  assert.equal(classifyWcQuestionIntent("What's your read on the host nations?"), WC_INTENT.GENERAL);
  assert.equal(
    classifyWcQuestionIntent("How does the expanded format change knockout paths?"),
    WC_INTENT.GENERAL,
  );
});

test("classifyWcQuestionIntent — group slate stays STRUCTURAL", () => {
  assert.equal(classifyWcQuestionIntent("Best group stage bet?"), WC_INTENT.STRUCTURAL);
});

test("classifyWcQuestionIntent — predictions roundup multi-slot", () => {
  const q =
    "The World Cup starts this week! Let's hear your predictions: 🏆 Winners: 🐎 Dark horse: 📈 Breakout player: 🔝 Top goalscorer:";
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.PREDICTIONS_ROUNDUP);
});

test("classifyWcQuestionIntent — contextual follow-up after top-5 list", () => {
  const contextual =
    "User: predict the top 5 goal scorers for the world cup\n\nFollow-up:\nWho is mispriced instead?";
  const contextualNumber =
    "User: predict the top 5 goal scorers for the world cup\n\nFollow-up:\nGive me a specific number to target.";
  assert.equal(classifyWcQuestionIntent(contextual, []), WC_INTENT.ENTITY_PRICING);
  assert.equal(classifyWcQuestionIntent(contextualNumber, []), WC_INTENT.GENERAL);
  const scope = buildWcTurnScopeBlock(contextual, WC_INTENT.ENTITY_PRICING);
  assert.ok(!/RANKED LIST of goalscorers/i.test(scope));
});

test("resolveRequiredEntities — match-scoped player prop binds both teams", () => {
  const entities = resolveRequiredEntities(
    "Best anytime goalscorer in France vs Brazil?",
    [],
    WC_INTENT.PLAYER_PROP,
  );
  assert.deepEqual(entities.sort(), ["BRA", "FRA"]);
});

test("classifyWcQuestionIntent — Jimenez shots home prop", () => {
  assert.equal(classifyWcQuestionIntent("Jimenez 2+ shots?"), WC_INTENT.PLAYER_PROP);
});

test("classifyWcQuestionIntent — Son O/U shots line", () => {
  assert.equal(classifyWcQuestionIntent("Son 2.5 shots?"), WC_INTENT.PLAYER_PROP);
});

test("classifyWcQuestionIntent — Jimenez SGP combo", () => {
  assert.equal(
    classifyWcQuestionIntent("Jimenez 2+ shots and Mexico team to score first goal"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("buildWcTurnScopeBlock — tournament winner pivots away from prior fixture", () => {
  const scope = buildWcTurnScopeBlock("who wins the world cup?", WC_INTENT.ENTITY_PRICING);
  assert.match(scope, /TOURNAMENT outright/i);
  assert.match(scope, /NOT.*Game 1/i);
  assert.match(scope, /winPct/i);
});

test("buildWcTurnScopeBlock — line movement cites user price", () => {
  const scope = buildWcTurnScopeBlock(
    "It's Germany at -669. Does that go to like -575 if it's scoreless early on?",
    WC_INTENT.MATCHUP,
  );
  assert.match(scope, /ODDS LINE MOVEMENT/i);
  assert.match(scope, /User cited price: -669/i);
});

test("classifyWcQuestionIntent — single-nation match bet routes to MATCHUP not outright", () => {
  assert.equal(
    classifyWcQuestionIntent("Best bets for the Netherlands match?"),
    WC_INTENT.MATCHUP,
  );
});

test("classifyWcQuestionIntent — NED vs MAR market ranking is MATCHUP not PARLAY", () => {
  const q =
    "Rank these options beginning with which to use to which to avoid over 2.5 total goals at +127 both teams to score at -163 Netherlands money line at +144 Morocco money line +245";
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.MATCHUP);
});

test("buildWcTurnScopeBlock — market ranking forbids parlay framing", () => {
  const q =
    "Rank these options over 2.5 at +127 both teams to score at -163 Netherlands money line at +144";
  const scope = buildWcTurnScopeBlock(q, WC_INTENT.MATCHUP);
  assert.match(scope, /RANK or COMPARE posted match markets/i);
  assert.match(scope, /NOT a player parlay/i);
  assert.match(scope, /Label Over vs Under explicitly/i);
});

test("buildWcTurnScopeBlock — line movement on user price correction", () => {
  const scope = buildWcTurnScopeBlock("Under 2.5 goals is at -133", WC_INTENT.MATCHUP);
  assert.match(scope, /ODDS LINE MOVEMENT/i);
  assert.match(scope, /User cited price: -133/i);
});
