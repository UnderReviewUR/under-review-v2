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

describe("resolveSportHint cross-tab WC guarantee (entry point must not matter)", () => {
  // A genuine World Cup question must reach the WC pipeline regardless of which
  // tab/sport hint the client sends.
  const wcQuestions = [
    "best bets for the Netherlands match?",
    "Who wins the World Cup final?",
    "Brazil vs Argentina group stage lean",
    "Mbappe anytime scorer odds tonight",
    "both teams to score in the USA match?",
  ];
  const nonWcTabHints = ["nba", "nfl", "mlb", "golf", "tennis", "generic", ""];

  for (const question of wcQuestions) {
    for (const incomingSportHint of nonWcTabHints) {
      it(`routes "${question}" to worldcup even with hint="${incomingSportHint || "(none)"}"`, () => {
        const hint = resolveSportHint({ incomingSportHint, question });
        assert.equal(hint, "worldcup");
      });
    }
  }

  it("vague WC follow-up with no textual sport inherits worldcup from history (nba hint)", () => {
    const hint = resolveSportHint({
      incomingSportHint: "nba",
      question: "what about the other side?",
      chatHistory: [
        { role: "user", content: "NED vs MAR best bet?", sport: "worldcup" },
        { role: "assistant", content: "Lean Under 2.5", sport: "worldcup" },
      ],
    });
    assert.equal(hint, "worldcup");
  });

  it("does NOT hijack a real NBA question typed on a WC-less generic tab", () => {
    const hint = resolveSportHint({
      incomingSportHint: "generic",
      question: "Lakers -4.5 tonight, good bet?",
    });
    assert.notEqual(hint, "worldcup");
  });
});
