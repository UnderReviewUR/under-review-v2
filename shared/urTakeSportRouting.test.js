import test from "node:test";
import assert from "node:assert/strict";

import {
  appendSportTabNudge,
  buildSportTabNudgeLine,
  buildUrTakeNoDeadEndPrompt,
  inferNbaFromMatchupSlug,
  inferSportFromChatHistory,
  inferSportFromQuestionText,
  resolveSportHint,
  sportsContextSwitched,
  stripUrTakeDeadEndCopy,
} from "./urTakeSportRouting.js";

test("Lakers prop on golf UI hint resolves to NBA", () => {
  const h = resolveSportHint({
    incomingSportHint: "golf",
    question: "Best Lakers player prop tonight?",
    matchupContext: null,
    hasImage: false,
    golfContext: { currentEvent: { name: "PGA Championship" } },
  });
  assert.equal(h, "nba");
});

test("Miami Grand Prix + generic tab resolves to F1", () => {
  const h = resolveSportHint({
    incomingSportHint: "generic",
    question: "For Miami Grand Prix on Sunday, what is the best race-only betting angle?",
    matchupContext: null,
    hasImage: false,
    golfContext: null,
  });
  assert.equal(h, "f1");
});

test("tab nudge points user to answered sport tab", () => {
  assert.equal(
    buildSportTabNudgeLine({ answeredSport: "nba", uiSportHint: "golf" }),
    "For more NBA takes, tap the NBA tab.",
  );
  assert.equal(buildSportTabNudgeLine({ answeredSport: "golf", uiSportHint: "golf" }), null);
});

test("appendSportTabNudge is a no-op (no tab redirect)", () => {
  const base = "Lean Celtics -4.5.";
  const out = appendSportTabNudge(base, {
    answeredSport: "nba",
    uiSportHint: "golf",
  });
  assert.equal(out, base);
});

test("LeBron prop on golf UI hint resolves to NBA", () => {
  const h = resolveSportHint({
    incomingSportHint: "golf",
    question: "LeBron James points prop tonight?",
    matchupContext: null,
    hasImage: false,
    golfContext: { currentEvent: { name: "PGA Championship" } },
  });
  assert.equal(h, "nba");
});

test("group-stage value bet on World Cup tab resolves to worldcup", () => {
  const q =
    "What's the best group-stage value bet right now — one pick, direct answer?";
  assert.equal(inferSportFromQuestionText(q), "worldcup");
  const h = resolveSportHint({
    incomingSportHint: "worldcup",
    question: q,
    matchupContext: null,
    hasImage: false,
    golfContext: null,
    chatHistory: [],
  });
  assert.equal(h, "worldcup");
});

test("World Cup tab hint wins over NBA thread history", () => {
  const h = resolveSportHint({
    incomingSportHint: "worldcup",
    question: "Best group stage bet?",
    matchupContext: null,
    hasImage: false,
    chatHistory: [
      { role: "user", content: "Stephon Castle over 16.5?" },
      { role: "assistant", content: "Castle over is the play.", sport: "nba" },
    ],
  });
  assert.equal(h, "worldcup");
});

test("ambiguous follow-up inherits last assistant sport from history", () => {
  const h = resolveSportHint({
    incomingSportHint: "golf",
    question: "what about the total?",
    matchupContext: null,
    hasImage: false,
    golfContext: { currentEvent: { name: "PGA Championship" } },
    chatHistory: [
      { role: "user", content: "Celtics spread?" },
      { role: "assistant", content: "Lean Celtics -4.5.", sport: "nba" },
      { role: "user", content: "what about the total?" },
    ],
  });
  assert.equal(h, "nba");
});

test("stripUrTakeDeadEndCopy removes WRONG SPORT and verified-player refusals", () => {
  const s = stripUrTakeDeadEndCopy(
    "WRONG SPORT. Switch tabs.\n\nScottie Scheffler isn't a verified player on tonight's slate.\n\nCeltics -4.5 is the lean.",
  );
  assert.equal(s, "Celtics -4.5 is the lean.");
});

test("buildUrTakeNoDeadEndPrompt mandates inference over clarification", () => {
  assert.match(buildUrTakeNoDeadEndPrompt(), /out of scope/i);
  assert.match(buildUrTakeNoDeadEndPrompt(), /burden of interpretation/i);
});

test("inferSportFromQuestionText: Yankees → mlb", () => {
  assert.equal(inferSportFromQuestionText("best Yankees prop tonight?"), "mlb");
});

test("inferNbaFromMatchupSlug: SAS @ OKC", () => {
  assert.equal(inferNbaFromMatchupSlug("SAS @ OKC best angle?"), true);
  assert.equal(inferSportFromQuestionText("SAS @ OKC best angle?"), "nba");
});

test("SAS @ OKC from golf session routes to NBA not golf history", () => {
  const h = resolveSportHint({
    incomingSportHint: "golf",
    question: "SAS @ OKC spread and total",
    matchupContext: null,
    hasImage: false,
    golfContext: { currentEvent: { name: "PGA Championship" } },
    chatHistory: [
      { role: "user", content: "Scheffler top 20?" },
      { role: "assistant", content: "Lean Scheffler top 20.", sport: "golf" },
    ],
  });
  assert.equal(h, "nba");
});

test("sportsContextSwitched detects golf → nba", () => {
  assert.equal(sportsContextSwitched("golf", "nba"), true);
  assert.equal(sportsContextSwitched("golf", "golf"), false);
});

test("stripUrTakeDeadEndCopy removes cross-sport narration", () => {
  const s = stripUrTakeDeadEndCopy(
    "I need to flag a cross-sport mismatch. Your first question was about golf.\n\nLean Thunder -4.5.",
  );
  assert.equal(s, "Lean Thunder -4.5.");
});
