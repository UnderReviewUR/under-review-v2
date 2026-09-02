import assert from "node:assert/strict";
import { describe, it, test } from "node:test";
import {
  hasNflAskLexicon,
  hasStrongNbaOnlyLexicon,
  inferSportFromQuestionText,
  isCasualMoneyBucksPhrase,
  resolveSportHint,
  shouldLockWorldCupThreadSport,
} from "./urTakeSportRouting.js";

test("James Cook rush yards vs PHI is NFL, not NBA james/PHI", () => {
  const q = "James Cook rush yards vs PHI — over or under 72.5?";
  assert.equal(hasNflAskLexicon(q), true);
  assert.equal(hasStrongNbaOnlyLexicon(q), false);
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(
    resolveSportHint({ incomingSportHint: "nfl", question: q }),
    "nfl",
  );
  assert.equal(
    resolveSportHint({ incomingSportHint: "generic", question: q }),
    "nfl",
  );
});

test("DET @ CIN spread stays NFL when tab is nfl", () => {
  const q = "DET @ CIN — CIN -6.5 · total 37.5. Side or total?";
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(
    resolveSportHint({ incomingSportHint: "nfl", question: q }),
    "nfl",
  );
});

test("DET @ CIN stays NFL even if the ask says don't route to NBA", () => {
  const q = "DET @ CIN — CIN -6.5. Don't route this to NBA.";
  assert.equal(hasNflAskLexicon(q), true);
  assert.equal(hasStrongNbaOnlyLexicon(q), false);
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(
    resolveSportHint({ incomingSportHint: "nfl", question: q }),
    "nfl",
  );
  assert.equal(
    resolveSportHint({ incomingSportHint: "generic", question: q }),
    "nfl",
  );
});

test("GB @ PIT -2.5 without the word spread still routes NFL", () => {
  const q = "GB @ PIT — GB -2.5";
  assert.equal(inferSportFromQuestionText(q), "nfl");
});

test("backup football + CIN -6.5 is NFL, not World Cup football", () => {
  const q = "Is Joe Burrow even dressing tonight vs Detroit or is CIN -6.5 just backup football?";
  assert.equal(hasNflAskLexicon(q), true);
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(
    resolveSportHint({ incomingSportHint: "nfl", question: q }),
    "nfl",
  );
});

test("Cardinals at Raiders total stays NFL, not MLB Cardinals", () => {
  const q =
    "Why is Cardinals at Raiders sitting at 42.5 when every other game tonight is 36–39?";
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(
    resolveSportHint({ incomingSportHint: "nfl", question: q }),
    "nfl",
  );
});

test("explicit Lakers ask can still pivot off NFL tab", () => {
  assert.equal(
    resolveSportHint({
      incomingSportHint: "nfl",
      question: "Lakers ML tonight?",
    }),
    "nba",
  );
});

test("LeBron / 76ers remain NBA", () => {
  assert.equal(inferSportFromQuestionText("LeBron points prop tonight"), "nba");
  assert.equal(inferSportFromQuestionText("76ers vs Celtics spread"), "nba");
});

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

  it("does not keep worldcup on bucks follow-up while WC product is off", () => {
    const hint = resolveSportHint({
      incomingSportHint: "nba",
      question: "I don't need an edge. I'm fine with making a few bucks tops",
      chatHistory: wcHistory,
    });
    assert.notEqual(hint, "worldcup");
  });
});

describe("resolveSportHint — WC off: live surface is NFL / La Liga", () => {
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
      it(`does not route "${question}" to worldcup with hint="${incomingSportHint || "(none)"}"`, () => {
        const hint = resolveSportHint({ incomingSportHint, question });
        assert.notEqual(hint, "worldcup");
      });
    }
  }

  it("anytime scorer lands on La Liga while WC is off", () => {
    assert.equal(
      resolveSportHint({ incomingSportHint: "generic", question: "Mbappe anytime scorer odds tonight" }),
      "laliga",
    );
  });

  it("vague WC follow-up does not inherit inactive worldcup history", () => {
    const hint = resolveSportHint({
      incomingSportHint: "nba",
      question: "what about the other side?",
      chatHistory: [
        { role: "user", content: "NED vs MAR best bet?", sport: "worldcup" },
        { role: "assistant", content: "Lean Under 2.5", sport: "worldcup" },
      ],
    });
    assert.notEqual(hint, "worldcup");
  });

  it("does NOT hijack a real NBA question typed on a WC-less generic tab", () => {
    const hint = resolveSportHint({
      incomingSportHint: "generic",
      question: "Lakers -4.5 tonight, good bet?",
    });
    assert.notEqual(hint, "worldcup");
  });
});
