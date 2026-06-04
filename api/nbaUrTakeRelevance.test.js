import assert from "node:assert/strict";
import test from "node:test";
import { NBA_FINALS_RELEVANCE_REGRESSION_TURNS } from "./nbaUrTakeRelevance.fixture.js";
import {
  classifyNbaQuestionIntent,
  NBA_INTENT,
  resolveRequiredNbaEntities,
} from "../shared/nbaUrTakeIntent.js";
import {
  buildNbaRelevanceLog,
  nbaContextAgeMinutes,
  nbaContextHasOutrightsBlock,
} from "../shared/nbaUrTakeRelevance.js";
import { nbaRequiresLiveUrTakeBoardRefresh } from "../shared/nbaLiveBoardRefresh.js";
import { formatNbaOutrightsForPrompt } from "../shared/nbaOutrightsFreshness.js";
import { resolveNbaFinalsUrTakeContext } from "../shared/nbaFinalsUtils.js";
import {
  getNbaVerdictFollowUpChips,
  resolveNbaVerdictFromQuestion,
} from "../shared/nbaUrTakeVerdict.js";

test("NBA Finals regression fixture has eight turns with expected metadata", () => {
  assert.equal(NBA_FINALS_RELEVANCE_REGRESSION_TURNS.length, 8);
  assert.equal(NBA_FINALS_RELEVANCE_REGRESSION_TURNS[0].scenario, "pregame_game1");
  assert.equal(NBA_FINALS_RELEVANCE_REGRESSION_TURNS[4].scenario, "who_wins_series");
  assert.equal(NBA_FINALS_RELEVANCE_REGRESSION_TURNS[6].expectedIntent, "FINALS_MVP");
  assert.equal(NBA_FINALS_RELEVANCE_REGRESSION_TURNS[7].scenario, "game_3_preview");
});

test("classifyNbaQuestionIntent — Finals regression thread intents", () => {
  const history = [];
  for (const turn of NBA_FINALS_RELEVANCE_REGRESSION_TURNS) {
    const intent = classifyNbaQuestionIntent(turn.question, history);
    assert.equal(
      intent,
      turn.expectedIntent,
      `intent mismatch for [${turn.scenario}]: ${turn.question}`,
    );
    history.push({ role: "user", content: turn.question });
    history.push({
      role: "assistant",
      content: "Lean: placeholder.",
      sport: "nba",
    });
  }
});

test("resolveRequiredNbaEntities — Finals regression thread entities", () => {
  const history = [];
  for (const turn of NBA_FINALS_RELEVANCE_REGRESSION_TURNS) {
    const intent = classifyNbaQuestionIntent(turn.question, history);
    const entities = resolveRequiredNbaEntities(turn.question, history, intent);
    assert.deepEqual(
      entities.sort(),
      turn.expectedEntities.sort(),
      `entities mismatch for [${turn.scenario}]: ${turn.question}`,
    );
    history.push({ role: "user", content: turn.question });
  }
});

test("buildNbaRelevanceLog — pregame snapshot shape", () => {
  const log = buildNbaRelevanceLog({
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[0].question,
    nbaContext: {
      todaysGames: [
        {
          state: "pre",
          awayTeam: { abbr: "SAS" },
          homeTeam: { abbr: "NYK" },
        },
      ],
      playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 0, homeWins: 0 }],
      propsOddsStale: false,
    },
    nbaContextFromClient: {
      propsOddsMeta: { propsOddsFetchedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
    },
    mustFetchNbaBoard: false,
    serverBoardFetched: false,
    clientContextUsable: true,
    nbaMatchup: { awayAbbr: "SAS", homeAbbr: "NYK", label: "SAS at NYK" },
    isConversationFollowUp: false,
  });
  assert.equal(log.nbaIntent, NBA_INTENT.PREGAME_MATCHUP);
  assert.deepEqual(log.requiredEntities.sort(), ["NYK", "SAS"]);
  assert.equal(log.mustFetchNbaBoard, false);
  assert.equal(log.clientContextUsable, true);
  assert.equal(log.serverBoardFetched, false);
  assert.equal(log.focusedGamePhase, "pregame");
  assert.equal(log.outrightsInjected, false);
  assert.equal(log.playoffSeriesRowsReturned, 1);
  assert.equal(log.seriesSnapshotInjected, true);
  assert.equal(log.clientPropsAgeMinutes, 45);
});

test("nbaRequiresLiveUrTakeBoardRefresh — live follow-up turn", () => {
  const clientContext = {
    todaysGames: [
      {
        state: "in",
        period: 3,
        id: 9001,
        awayTeam: { abbr: "SAS", score: 70 },
        homeTeam: { abbr: "NYK", score: 72 },
      },
    ],
    propLines: [{ game: "SAS @ NYK" }],
  };
  assert.equal(
    nbaRequiresLiveUrTakeBoardRefresh(
      clientContext,
      NBA_FINALS_RELEVANCE_REGRESSION_TURNS[2].question,
    ),
    true,
  );
});

test("buildNbaRelevanceLog — live Q2 props + totals (Phase 3)", () => {
  const turn = NBA_FINALS_RELEVANCE_REGRESSION_TURNS[1];
  assert.equal(turn.scenario, "live_q2_props");
  assert.equal(turn.expectPropsFresh, true);
  assert.equal(turn.expectGameTotal, true);

  const clientContext = {
    todaysGames: [
      {
        state: "in",
        period: 2,
        id: 9001,
        awayTeam: { abbr: "SAS", score: 48 },
        homeTeam: { abbr: "NYK", score: 52 },
      },
    ],
    propLines: [{ game: "SAS @ NYK", player: "Jalen Brunson" }],
  };
  const liveForced = nbaRequiresLiveUrTakeBoardRefresh(clientContext, turn.question);
  assert.equal(liveForced, true);

  const propsFetchedAtMs = Date.now() - 8 * 60 * 1000;
  const log = buildNbaRelevanceLog({
    question: turn.question,
    nbaContext: {
      ...clientContext,
      liveBoxscore: {
        period: 2,
        players: [{ name: "Jalen Brunson", team: "NYK", pf: 2 }],
      },
      propsOddsStale: false,
      propsOdds: {
        hasPostedLines: true,
        isLive: true,
        fetchedAt: new Date(propsFetchedAtMs).toISOString(),
        freshness: {
          isStale: false,
          ageMinutes: 8,
          maxAgeMinutes: 15,
        },
      },
      gameTotals: {
        "SAS @ NYK": { total: 214.5, pace: "SLOW", source: "odds_api" },
      },
    },
    nbaContextFromClient: clientContext,
    mustFetchNbaBoard: true,
    serverBoardFetched: true,
    clientContextUsable: false,
    liveBoardRefreshForced: true,
    clientContextIgnored: true,
    nbaMatchup: { awayAbbr: "SAS", homeAbbr: "NYK", label: "SAS at NYK" },
    isConversationFollowUp: true,
  });
  assert.equal(log.nbaIntent, NBA_INTENT.LIVE_IN_GAME);
  assert.equal(log.focusedGamePhase, "live");
  assert.equal(log.mustFetchNbaBoard, true);
  assert.equal(log.serverBoardFetched, true);
  assert.equal(log.clientContextUsable, false);
  assert.equal(log.liveBoardRefreshForced, true);
  assert.equal(log.clientContextIgnored, true);
  assert.equal(log.liveBoxscorePresent, true);
  assert.equal(log.isConversationFollowUp, true);
  assert.equal(log.propsStale, false);
  assert.equal(log.propsAgeMinutes, 8);
  assert.equal(log.propsMaxAgeMinutes, 15);
  assert.equal(log.propsLiveFreshness, true);
  assert.equal(log.gameTotalsPresent, true);
  assert.equal(log.gameTotalLine, 214.5);
});

test("NBA Finals regression — verdict-aware follow-up chips", () => {
  for (const turn of NBA_FINALS_RELEVANCE_REGRESSION_TURNS) {
    if (!turn.expectVerdict) continue;
    const nbaIntentForMsg =
      turn.expectedIntent === "CONTINUATION" ? "LIVE_IN_GAME" : turn.expectedIntent;
    const message = {
      nbaRelevance: { nbaIntent: nbaIntentForMsg, finalsMode: true },
      structured:
        turn.expectVerdict === "HAS_EDGE"
          ? { lean: "NYK +180 is mispriced to win the Finals series." }
          : turn.expectVerdict === "SERIES"
            ? { lean: "Knicks have the better path — series lean NYK." }
            : { lean: "Live lean: stay on the over with this pace." },
    };
    const verdict = resolveNbaVerdictFromQuestion(turn.question, message);
    assert.equal(verdict, turn.expectVerdict, `verdict for [${turn.scenario}]`);
    const chips = getNbaVerdictFollowUpChips(verdict, turn.expectedIntent);
    if (turn.expectFollowUpChip) {
      assert.ok(
        chips.some((c) => turn.expectFollowUpChip.test(c)),
        `chip match for [${turn.scenario}]: ${chips.join(" | ")}`,
      );
    }
  }
});

test("resolveNbaFinalsUrTakeContext — regression thread finalsMode", () => {
  for (const turn of NBA_FINALS_RELEVANCE_REGRESSION_TURNS) {
    if (!turn.expectFinalsMode) continue;
    const intent = classifyNbaQuestionIntent(turn.question, []);
    const ctx = resolveNbaFinalsUrTakeContext({
      question: turn.question,
      nbaIntent: intent,
      nbaMatchup:
        turn.expectedEntities.length >= 2
          ? { awayAbbr: turn.expectedEntities[0], homeAbbr: turn.expectedEntities[1] }
          : { awayAbbr: "SAS", homeAbbr: "NYK" },
      nbaContext: {
        playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 1, homeWins: 1 }],
        todaysGames: [
          {
            awayTeam: { abbr: "SAS", score: 48 },
            homeTeam: { abbr: "NYK", score: 52 },
            state: turn.expectedIntent === "LIVE_IN_GAME" ? "in" : "pre",
            period: turn.expectedIntent === "LIVE_IN_GAME" ? 2 : 0,
          },
        ],
      },
    });
    assert.equal(ctx.finalsMode, true, `finalsMode for [${turn.scenario}]`);
    assert.ok(ctx.contextBlock, `contextBlock for [${turn.scenario}]`);
  }
});

test("buildNbaRelevanceLog — series winner with outrights and finals mode", () => {
  const seriesKv = {
    outrights: { NYK: "+180", SAS: "-205" },
    lastUpdated: Date.now() - 45 * 60 * 1000,
    source: "espn",
    stale: false,
    freshness: { isStale: false, ageMinutes: 45, ageText: "45 min ago", maxAgeMinutes: 360 },
  };
  const block = formatNbaOutrightsForPrompt({
    nbaIntent: NBA_INTENT.SERIES_WINNER,
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[5].question,
    requiredEntities: ["NYK"],
    seriesKv,
    mvpKv: null,
  });
  const log = buildNbaRelevanceLog({
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[5].question,
    nbaContext: {
      playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 0, homeWins: 0 }],
      finalsOutrightsBlock: block,
      finalsMode: true,
      finalsSeriesState: {
        seriesScoreLabel: "Knicks lead series 0-0",
        gameNumber: 1,
      },
    },
    mustFetchNbaBoard: true,
    serverBoardFetched: true,
    clientContextUsable: false,
    outrightsInjected: true,
    seriesOutrightsStale: false,
    mvpOutrightsStale: null,
    seriesOutrightsAgeMinutes: 45,
    mvpOutrightsAgeMinutes: null,
    finalsMode: true,
    finalsSeriesSummary: "Knicks lead series 0-0",
    finalsGameNumber: 1,
    finalsContextInjected: true,
  });
  assert.equal(log.nbaIntent, NBA_INTENT.SERIES_WINNER);
  assert.deepEqual(log.requiredEntities, ["NYK"]);
  assert.equal(log.outrightsInjected, true);
  assert.equal(log.seriesOutrightsStale, false);
  assert.equal(log.seriesOutrightsAgeMinutes, 45);
  assert.equal(log.finalsMode, true);
  assert.equal(log.finalsContextInjected, true);
});

test("buildNbaRelevanceLog — who wins the series (Phase 4)", () => {
  const turn = NBA_FINALS_RELEVANCE_REGRESSION_TURNS[4];
  const log = buildNbaRelevanceLog({
    question: turn.question,
    nbaContext: {
      finalsMode: true,
      finalsSeriesState: {
        seriesScoreLabel: "Knicks lead series 2-1",
        gameNumber: 4,
        summaryOneLiner: "NYK leads 2-1 — Game 4 tonight.",
      },
      finalsOutrightsBlock: "NBA FINALS SERIES ODDS",
    },
    outrightsInjected: true,
    finalsMode: true,
    finalsSeriesSummary: "Knicks lead series 2-1",
    finalsGameNumber: 4,
    finalsContextInjected: true,
  });
  assert.equal(log.nbaIntent, NBA_INTENT.SERIES_WINNER);
  assert.equal(log.finalsMode, true);
  assert.equal(log.finalsGameNumber, 4);
  assert.equal(log.outrightsInjected, true);
});

test("buildNbaRelevanceLog — Finals MVP with outrights injected", () => {
  const mvpKv = {
    candidates: [{ name: "Victor Wembanyama", odds: "+220", team: "SAS" }],
    outrights: { "Victor Wembanyama": "+220" },
    lastUpdated: Date.now() - 20 * 60 * 1000,
    source: "espn",
    stale: false,
    freshness: { isStale: false, ageMinutes: 20, ageText: "20 min ago", maxAgeMinutes: 360 },
  };
  const log = buildNbaRelevanceLog({
    question: NBA_FINALS_RELEVANCE_REGRESSION_TURNS[6].question,
    nbaContext: { finalsOutrightsBlock: "NBA FINALS MVP ODDS" },
    outrightsInjected: true,
    mvpOutrightsStale: false,
    mvpOutrightsAgeMinutes: 20,
  });
  assert.equal(log.nbaIntent, NBA_INTENT.FINALS_MVP);
  assert.equal(log.outrightsInjected, true);
  assert.equal(log.mvpOutrightsStale, false);
  assert.equal(log.mvpOutrightsAgeMinutes, 20);
});

test("nbaContextHasOutrightsBlock — false until Phase 2", () => {
  assert.equal(nbaContextHasOutrightsBlock({}), false);
  assert.equal(nbaContextHasOutrightsBlock({ outrights: [{ team: "NYK" }] }), true);
});

test("nbaContextAgeMinutes — null for missing timestamp", () => {
  assert.equal(nbaContextAgeMinutes(null), null);
});

test("instrumentation shape — series winner log fields (sample)", () => {
  const question = NBA_FINALS_RELEVANCE_REGRESSION_TURNS[5].question;
  const logLine = {
    event: "ur_take_complete",
    sport: "nba",
    nbaRelevance: buildNbaRelevanceLog({
      question,
      nbaContext: {
        playoffSeries: [{ away: "SAS", home: "NYK" }],
        finalsOutrightsBlock: "NBA FINALS SERIES ODDS",
      },
      mustFetchNbaBoard: true,
      serverBoardFetched: true,
      clientContextUsable: false,
      outrightsInjected: true,
      seriesOutrightsStale: false,
      seriesOutrightsAgeMinutes: 30,
    }),
  };
  assert.equal(logLine.nbaRelevance.nbaIntent, "SERIES_WINNER");
  assert.deepEqual(logLine.nbaRelevance.requiredEntities, ["NYK"]);
  assert.equal(logLine.nbaRelevance.outrightsInjected, true);
  assert.equal(logLine.nbaRelevance.seriesOutrightsStale, false);
  assert.equal(logLine.nbaRelevance.qaEntityMatch, null);
});
