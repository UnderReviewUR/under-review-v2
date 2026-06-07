import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcQuestionIntent,
  shouldInjectStaticRules,
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

test("classifyWcQuestionIntent — open questions use GENERAL not group template", () => {
  assert.equal(classifyWcQuestionIntent("Who wins the World Cup?"), WC_INTENT.GENERAL);
  assert.equal(classifyWcQuestionIntent("What's your read on the host nations?"), WC_INTENT.GENERAL);
  assert.equal(
    classifyWcQuestionIntent("How does the expanded format change knockout paths?"),
    WC_INTENT.GENERAL,
  );
});

test("classifyWcQuestionIntent — group slate stays STRUCTURAL", () => {
  assert.equal(classifyWcQuestionIntent("Best group stage bet?"), WC_INTENT.STRUCTURAL);
});

test("resolveRequiredEntities — match-scoped player prop binds both teams", () => {
  const entities = resolveRequiredEntities(
    "Best anytime goalscorer in France vs Brazil?",
    [],
    WC_INTENT.PLAYER_PROP,
  );
  assert.deepEqual(entities.sort(), ["BRA", "FRA"]);
});
