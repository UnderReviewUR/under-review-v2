import test from "node:test";
import assert from "node:assert/strict";

import {
  appendSportTabNudge,
  buildSportTabNudgeLine,
  buildUrTakeNoDeadEndPrompt,
  inferSportFromQuestionText,
  resolveSportHint,
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

test("appendSportTabNudge adds line once", () => {
  const out = appendSportTabNudge("Lean Celtics -4.5.", {
    answeredSport: "nba",
    uiSportHint: "golf",
  });
  assert.match(out, /tap the NBA tab\.$/);
  const again = appendSportTabNudge(out, { answeredSport: "nba", uiSportHint: "golf" });
  assert.equal((again.match(/tap the NBA tab/gi) || []).length, 1);
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
