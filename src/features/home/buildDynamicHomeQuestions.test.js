import test from "node:test";
import assert from "node:assert/strict";
import { buildDynamicHomeQuestions } from "./buildDynamicHomeQuestions.js";

const TEAM_NEEDS = {
  "Dallas Cowboys": { headline: "DL/EDGE, IOL, LB", tags: ["EDGE", "IDL", "IOL", "LB"] },
  "Las Vegas Raiders": { headline: "QB, EDGE, CB", tags: ["QB", "EDGE", "CB"] },
  "New York Jets": { headline: "OT, WR, EDGE", tags: ["OT", "WR", "EDGE"] },
};

function buildDraftPromptSet(userCity = "") {
  return buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: true,
    nflDraftMeta: { phase: "pre_draft", teamNeeds: TEAM_NEEDS },
    userCity,
    context: null,
    golfData: null,
    nbaGames: [],
    f1Data: null,
  });
}

test("draft mode includes three high-intent NFL draft prompts", () => {
  const prompts = buildDraftPromptSet();
  const texts = prompts.map((p) => p.text);
  assert.ok(texts.includes("Who are the biggest sleepers in the 2026 Draft class?"));
  assert.ok(texts.some((t) => t.includes("Simulate the first 3 rounds")));
  assert.ok(texts.includes("Which teams are most likely to trade up into the Top 5?"));
});

test("Dallas location hint prioritizes Cowboys simulation prompt", () => {
  const prompts = buildDraftPromptSet("Dallas");
  const simulationPrompt = prompts.find((p) => p.text.includes("Simulate the first 3 rounds"));
  assert.ok(simulationPrompt);
  assert.match(simulationPrompt.text, /Dallas Cowboys/);
});
