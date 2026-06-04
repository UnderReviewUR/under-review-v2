/**
 * Phase 6 — NBA Finals sprint end-to-end regression (automated).
 * Covers fixture turns, live refresh, outrights, Finals mode, verdict UX, freshness signals.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { NBA_FINALS_RELEVANCE_REGRESSION_TURNS } from "./nbaUrTakeRelevance.fixture.js";
import {
  classifyNbaQuestionIntent,
  NBA_INTENT,
  resolveRequiredNbaEntities,
} from "../shared/nbaUrTakeIntent.js";
import { nbaRequiresLiveUrTakeBoardRefresh } from "../shared/nbaLiveBoardRefresh.js";
import { formatNbaOutrightsForPrompt, nbaOutrightsInjectedForContext } from "../shared/nbaOutrightsFreshness.js";
import {
  buildNbaFinalsContextBlock,
  resolveNbaFinalsUrTakeContext,
} from "../shared/nbaFinalsUtils.js";
import {
  filterNbaFollowUpsForVerdict,
  getNbaVerdictFollowUpChips,
  getNbaVerdictNextLine,
  resolveNbaVerdictFromQuestion,
} from "../shared/nbaUrTakeVerdict.js";
import { buildNbaPropsFreshness } from "../shared/nbaPropsCachePolicy.js";
import { buildNbaRelevanceLog } from "../shared/nbaUrTakeRelevance.js";

const PLAYOFF_SERIES = [{ away: "SAS", home: "NYK", awayWins: 1, homeWins: 2 }];

const LIVE_CLIENT_CONTEXT = {
  todaysGames: [
    {
      state: "in",
      period: 2,
      clock: "5:12",
      awayTeam: { abbr: "SAS", score: 48 },
      homeTeam: { abbr: "NYK", score: 52 },
    },
  ],
  playoffSeries: PLAYOFF_SERIES,
};

test("Phase 6 — fixture turn count and scenarios", () => {
  assert.ok(NBA_FINALS_RELEVANCE_REGRESSION_TURNS.length >= 8);
  const scenarios = new Set(NBA_FINALS_RELEVANCE_REGRESSION_TURNS.map((t) => t.scenario));
  for (const id of [
    "pregame_game1",
    "live_q2_props",
    "live_followup_turn3",
    "live_thread_edge_followup",
    "who_wins_series",
    "series_winner_misprice",
    "finals_mvp",
    "game_3_preview",
  ]) {
    assert.ok(scenarios.has(id), `missing scenario ${id}`);
  }
});

test("Phase 6 — full fixture intent + entity pass (no bleed)", () => {
  const history = [];
  let pass = 0;
  for (const turn of NBA_FINALS_RELEVANCE_REGRESSION_TURNS) {
    const intent = classifyNbaQuestionIntent(turn.question, history);
    assert.equal(intent, turn.expectedIntent, `[${turn.scenario}] intent`);
    const entities = resolveRequiredNbaEntities(turn.question, history, intent);
    assert.deepEqual(
      entities.sort(),
      turn.expectedEntities.sort(),
      `[${turn.scenario}] entities`,
    );
    for (const bad of turn.forbiddenEntities || []) {
      assert.ok(!entities.includes(bad), `[${turn.scenario}] forbidden ${bad}`);
    }
    history.push({ role: "user", content: turn.question });
    history.push({ role: "assistant", content: "Lean: test.", sport: "nba" });
    pass += 1;
  }
  assert.equal(pass, NBA_FINALS_RELEVANCE_REGRESSION_TURNS.length);
});

test("Phase 6 — live board refresh on follow-ups", () => {
  assert.equal(
    nbaRequiresLiveUrTakeBoardRefresh(
      LIVE_CLIENT_CONTEXT,
      NBA_FINALS_RELEVANCE_REGRESSION_TURNS[1].question,
    ),
    true,
  );
  assert.equal(
    nbaRequiresLiveUrTakeBoardRefresh(
      LIVE_CLIENT_CONTEXT,
      NBA_FINALS_RELEVANCE_REGRESSION_TURNS[2].question,
    ),
    true,
  );
  assert.equal(
    nbaRequiresLiveUrTakeBoardRefresh(
      { todaysGames: [{ state: "pre", awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" } }] },
      NBA_FINALS_RELEVANCE_REGRESSION_TURNS[0].question,
    ),
    false,
  );
});

test("Phase 6 — outrights injected and misprice rules when fresh", () => {
  const seriesKv = {
    outrights: { NYK: "+180", SAS: "-205" },
    lastUpdated: Date.now() - 30 * 60 * 1000,
    source: "espn",
    stale: false,
    freshness: { isStale: false, ageMinutes: 30, ageText: "30 min ago", maxAgeMinutes: 360 },
  };
  const block = formatNbaOutrightsForPrompt({
    nbaIntent: NBA_INTENT.SERIES_WINNER,
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[5].question,
    requiredEntities: ["NYK"],
    seriesKv,
    mvpKv: null,
  });
  assert.ok(block);
  assert.match(block, /NBA FINALS SERIES ODDS/);
  assert.match(block, /NYK: \+180/);
  assert.match(block, /mispriced/i);
  assert.ok(nbaOutrightsInjectedForContext(seriesKv, null));
});

test("Phase 6 — Finals context blocks balanced tone (no dynasty/clutch without stats)", () => {
  const ctx = resolveNbaFinalsUrTakeContext({
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[7].question,
    nbaMatchup: { awayAbbr: "SAS", homeAbbr: "NYK" },
    nbaContext: { playoffSeries: PLAYOFF_SERIES, todaysGames: LIVE_CLIENT_CONTEXT.todaysGames },
    nbaIntent: NBA_INTENT.PREGAME_MATCHUP,
  });
  const block = ctx.contextBlock || "";
  assert.match(block, /NBA FINALS CONTEXT/);
  assert.match(block, /clutch|legacy|dynasty/i);
  assert.match(block, /unless a specific stat/i);
  assert.match(block, /Balanced preview/i);
});

test("Phase 6 — verdict chips and Next line per turn class", () => {
  const seriesVerdict = resolveNbaVerdictFromQuestion(
    NBA_FINALS_RELEVANCE_REGRESSION_TURNS[5].question,
    {
      nbaRelevance: { nbaIntent: NBA_INTENT.SERIES_WINNER },
      structured: { lean: "NYK +180 is mispriced for the series." },
    },
  );
  assert.equal(seriesVerdict, "HAS_EDGE");
  const chips = getNbaVerdictFollowUpChips(seriesVerdict, NBA_INTENT.SERIES_WINNER);
  assert.ok(chips.some((c) => /kills this edge/i.test(c)));
  assert.match(getNbaVerdictNextLine("FAIR_PRICE"), /would need to change/i);

  const filtered = filterNbaFollowUpsForVerdict(
    ["Build a parlay around this.", "What would need to change?"],
    "FAIR_PRICE",
  );
  assert.equal(filtered.length, 1);
});

test("Phase 6 — live props freshness communicated", () => {
  const fresh = buildNbaPropsFreshness(Date.now() - 8 * 60 * 1000, Date.now(), { isLive: true });
  assert.equal(fresh.isStale, false);
  assert.equal(fresh.maxAgeMinutes, 15);
  const stale = buildNbaPropsFreshness(Date.now() - 20 * 60 * 1000, Date.now(), { isLive: true });
  assert.equal(stale.isStale, true);
  assert.match(String(stale.staleWarning || ""), /live game/i);
});

test("Phase 6 — nbaRelevance log snapshot for live Q2", () => {
  const log = buildNbaRelevanceLog({
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[1].question,
    nbaContext: {
      ...LIVE_CLIENT_CONTEXT,
      propsOddsStale: false,
      propsOdds: { isLive: true, freshness: { ageMinutes: 8, maxAgeMinutes: 15, isStale: false } },
      gameTotals: { "SAS @ NYK": { total: 214.5, pace: "SLOW" } },
      finalsMode: true,
      finalsSeriesState: { seriesScoreLabel: "Knicks lead series 2-1", gameNumber: 3 },
    },
    liveBoardRefreshForced: true,
    clientContextIgnored: true,
    mustFetchNbaBoard: true,
    serverBoardFetched: true,
    finalsMode: true,
    finalsSeriesSummary: "Knicks lead series 2-1",
    finalsGameNumber: 3,
    finalsContextInjected: true,
  });
  assert.equal(log.nbaIntent, NBA_INTENT.LIVE_IN_GAME);
  assert.equal(log.liveBoardRefreshForced, true);
  assert.equal(log.propsStale, false);
  assert.equal(log.gameTotalsPresent, true);
  assert.equal(log.finalsMode, true);
});
