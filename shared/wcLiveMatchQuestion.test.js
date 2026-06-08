import test from "node:test";
import assert from "node:assert/strict";
import {
  isWcLiveDominanceQuestion,
  selectLiveFixtureForQuestion,
} from "./wcLiveMatchQuestion.js";

test("isWcLiveDominanceQuestion detects live dominance phrasing", () => {
  assert.equal(isWcLiveDominanceQuestion("Who is dominating possession right now?"), true);
  assert.equal(isWcLiveDominanceQuestion("Spain group stage path"), false);
});

test("selectLiveFixtureForQuestion picks sole live match", () => {
  const matches = [
    { id: "1", homeTeam: "ESP", awayTeam: "FRA", status: "live", commenceTs: 100 },
    { id: "2", homeTeam: "BRA", awayTeam: "ARG", status: "ns", commenceTs: 200 },
  ];
  const fx = selectLiveFixtureForQuestion(matches, "Who is ahead right now?", null);
  assert.equal(fx?.id, "1");
});
