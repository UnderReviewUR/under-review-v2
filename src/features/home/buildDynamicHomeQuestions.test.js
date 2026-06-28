import test from "node:test";
import assert from "node:assert/strict";
import { buildDynamicHomeQuestions } from "./buildDynamicHomeQuestions.js";
import { classifyTennisMatch, EVENT_VALIDITY } from "../../../shared/eventValidity.js";

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

test("tennis home: Masters / 1000 context surfaces tournament futures prompt when no eligible matchups", () => {
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: null,
    userCity: "",
    context: { currentTournament: { name: "Miami Open" } },
    golfData: null,
    nbaGames: [],
    mlbGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-04-10T17:00:00.000Z"),
  });
  const tennisPrompt = prompts.find((p) => p.sportHint === "tennis");
  assert.ok(tennisPrompt);
  assert.equal(tennisPrompt.text, "Tournament value — Miami Open?");
  assert.match(tennisPrompt.prompt, /Miami Open/i);
});

test("tennis home: stale live match does not produce named live prompt", () => {
  const start = Date.parse("2026-06-01T08:00:00.000Z");
  const now = Date.parse("2026-06-01T20:00:00.000Z");
  const staleLive = {
    league: "ATP",
    commenceTs: start,
    raw: {
      home: "A",
      away: "B",
      live: "1",
      event_status: "",
    },
  };
  assert.equal(classifyTennisMatch(staleLive, now), EVENT_VALIDITY.FINISHED);
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [staleLive],
    tennisLiveMatches: [staleLive],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: null,
    userCity: "",
    context: null,
    golfData: null,
    nbaGames: [],
    mlbGames: [],
    f1Data: null,
    promoNowMs: now,
  });
  const namedLive = prompts.find(
    (p) => p.text.startsWith("Live edge —") && p.text.includes("A vs B"),
  );
  assert.equal(namedLive, undefined);
});

test("NBA Finals window caps to one home prompt", () => {
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: null,
    userCity: "",
    context: null,
    golfData: null,
    nbaGames: [
      {
        state: "in",
        postseason: true,
        awayTeam: { abbr: "BOS" },
        homeTeam: { abbr: "NYK" },
      },
      {
        state: "pre",
        postseason: true,
        awayTeam: { abbr: "LAL" },
        homeTeam: { abbr: "DEN" },
      },
    ],
    mlbGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-06-05T16:00:00.000Z"),
  });
  const nba = prompts.filter((p) => p.sportHint === "nba");
  assert.equal(nba.length, 1);
});

test("World Cup promo window adds knockout prompts after group stage", () => {
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: null,
    userCity: "",
    context: null,
    golfData: null,
    nbaGames: [],
    mlbGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-06-29T16:00:00.000Z"),
    wcMatches: [],
  });
  const wc = prompts.find((p) => p.id === "q-wc-promo");
  assert.ok(wc);
  assert.match(wc.text, /knockout/i);
});

test("World Cup promo window adds group stage value prompt", () => {
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: null,
    userCity: "",
    context: null,
    golfData: null,
    nbaGames: [],
    mlbGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-06-02T16:00:00.000Z"),
  });
  const wc = prompts.find((p) => p.sportHint === "worldcup");
  assert.ok(wc);
  assert.equal(wc.text, "Best group stage value bet right now?");
});

test("WC promo + NBA Finals overlap adds finals prompt and second WC angle", () => {
  const prompts = buildDynamicHomeQuestions({
    activeTournamentMatches: [],
    tennisLiveMatches: [],
    tennisUpcomingMatches: [],
    nflSeasonMode: false,
    nflDraftMeta: null,
    userCity: "",
    context: null,
    golfData: null,
    nbaGames: [
      {
        state: "in",
        postseason: true,
        awayTeam: { abbr: "BOS" },
        homeTeam: { abbr: "NYK" },
      },
    ],
    nbaPlayoffSeries: [{ away: "BOS", home: "NYK", awayWins: 1, homeWins: 0 }],
    mlbGames: [],
    f1Data: null,
    promoNowMs: Date.parse("2026-06-05T16:00:00.000Z"),
  });
  const ids = prompts.map((p) => p.id);
  assert.ok(ids.includes("q-wc-promo"));
  assert.ok(ids.includes("q-wc-group-misprice"));
  assert.ok(ids.includes("q-nba-finals"));
  const finals = prompts.find((p) => p.id === "q-nba-finals");
  assert.ok(finals.text.includes("Game 2"));
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

