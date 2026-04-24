import test from "node:test";
import assert from "node:assert/strict";
import { buildDynamicHomeQuestions } from "./buildDynamicHomeQuestions.js";

const TEAM_NEEDS = {
  "Dallas Cowboys": { headline: "DL/EDGE, IOL, LB", tags: ["EDGE", "IDL", "IOL", "LB"] },
  "Las Vegas Raiders": { headline: "QB, EDGE, CB", tags: ["QB", "EDGE", "CB"] },
  "New York Jets": { headline: "OT, WR, EDGE", tags: ["OT", "WR", "EDGE"] },
};

function buildDraftPromptSet(userCity = "", nflSeasonMode = false) {
  return buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode,
    nflDraftMeta: { phase: "pre_draft", teamNeeds: TEAM_NEEDS },
    userCity,
    context: null,
    golfData: null,
    nbaGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-04-10T17:00:00.000Z"),
  });
}

test("draft mode includes three high-intent NFL draft prompts", () => {
  const prompts = buildDraftPromptSet();
  const texts = prompts.map((p) => p.text);
  assert.ok(texts.some((t) => /sleepers/i.test(t) && /2026 draft/i.test(t)));
  assert.ok(texts.some((t) => t.includes("Simulate the first 3 rounds")));
  assert.ok(texts.some((t) => /Top 5/i.test(t) && /trade/i.test(t)));
});

test("Dallas location hint prioritizes Cowboys simulation prompt", () => {
  const prompts = buildDraftPromptSet("Dallas");
  const simulationPrompt = prompts.find((p) => p.text.includes("Simulate the first 3 rounds"));
  assert.ok(simulationPrompt);
  assert.match(simulationPrompt.text, /Dallas Cowboys/);
});

test("draft prompts do not require nfl in-season mode", () => {
  const prompts = buildDraftPromptSet("", false);
  const texts = prompts.map((p) => p.text);
  assert.ok(texts.some((t) => /sleepers/i.test(t) && /2026 draft/i.test(t)));
});

test("Rounds 2–3 calendar day swaps NFL draft prompt rail", () => {
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: {
      phase: "during_draft",
      teamNeeds: TEAM_NEEDS,
      event: {
        dates: { round1: "2026-04-23", rounds2to3: "2026-04-24", rounds4to7: "2026-04-25" },
      },
    },
    userCity: "",
    context: null,
    golfData: null,
    nbaGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-04-24T17:00:00.000Z"),
  });
  const texts = prompts.map((p) => p.text);
  assert.ok(texts.some((t) => /Rounds 2/i.test(t) || /Day 2/i.test(t)));
});

