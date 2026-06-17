import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferSportFromQuestionText,
  isCasualMoneyBucksPhrase,
  resolveSportHint,
  shouldLockWorldCupThreadSport,
} from "./urTakeSportRouting.js";

describe("isCasualMoneyBucksPhrase", () => {
  it("detects recreational money talk", () => {
    assert.equal(
      isCasualMoneyBucksPhrase("I'm fine with making a few bucks tops"),
      true,
    );
    assert.equal(isCasualMoneyBucksPhrase("just want to make a buck"), true);
    assert.equal(isCasualMoneyBucksPhrase("a few bucks on this"), true);
  });

  it("does not flag Milwaukee Bucks team mentions", () => {
    assert.equal(isCasualMoneyBucksPhrase("Milwaukee Bucks spread tonight"), false);
    assert.equal(isCasualMoneyBucksPhrase("Giannis and the Bucks ML"), false);
  });
});

describe("inferSportFromQuestionText bucks false positive", () => {
  it("does not route few bucks to NBA", () => {
    assert.notEqual(
      inferSportFromQuestionText("I don't need an edge. I'm fine with making a few bucks tops"),
      "nba",
    );
  });

  it("still routes explicit Bucks team to NBA", () => {
    assert.equal(inferSportFromQuestionText("Bucks -4.5 tonight"), "nba");
  });
});

describe("shouldLockWorldCupThreadSport", () => {
  const wcHistory = [
    { role: "user", content: "Should I bet the spread here?", sport: "worldcup" },
    { role: "assistant", content: "Fade ARG -2.5", sport: "worldcup" },
  ];

  it("locks recreational WC follow-up after bucks phrase", () => {
    assert.equal(
      shouldLockWorldCupThreadSport({
        question: "I'm fine with making a few bucks tops",
        textualSport: "nba",
        historySport: "worldcup",
        chatHistory: wcHistory,
      }),
      true,
    );
  });

  it("does not lock explicit NBA pivot", () => {
    assert.equal(
      shouldLockWorldCupThreadSport({
        question: "switch to Lakers spread tonight",
        textualSport: "nba",
        historySport: "worldcup",
        chatHistory: wcHistory,
      }),
      false,
    );
  });
});

describe("resolveSportHint WC thread lock", () => {
  const wcHistory = [
    { role: "user", content: "ARG vs ALG spread?", sport: "worldcup" },
    { role: "assistant", content: "Live spread read", sport: "worldcup" },
  ];

  it("keeps worldcup on bucks recreational follow-up", () => {
    const hint = resolveSportHint({
      incomingSportHint: "nba",
      question: "I don't need an edge. I'm fine with making a few bucks tops",
      chatHistory: wcHistory,
    });
    assert.equal(hint, "worldcup");
  });
});
