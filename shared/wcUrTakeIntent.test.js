import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcQuestionIntent,
  shouldInjectStaticRules,
  WC_INTENT,
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

test("resolveRequiredEntities — player market returns no teams", () => {
  assert.deepEqual(
    resolveRequiredEntities("which player will score the most goals?", [], WC_INTENT.PLAYER_PROP),
    [],
  );
});
