import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFixtureStateGuardBlock,
  buildWcImageReferenceGroundingBlock,
  buildWcLiveStateGuardBlock,
  buildWcStubGuardSliceBlock,
  formatWorldCupUrTakePromptBlock,
  selectFixturesForQuestion,
} from "./_wcUrTakeContext.js";
import { buildMatchOddsFreshnessPromptBlock } from "../shared/wcOddsFreshness.js";

test("selectFixturesForQuestion pins wcEventId when present", () => {
  const matches = [
    { id: "760415", homeTeam: "MEX", awayTeam: "RSA", status: "NS", commenceTs: 1 },
    { id: "760416", homeTeam: "USA", awayTeam: "PAR", status: "NS", commenceTs: 2 },
  ];
  const picked = selectFixturesForQuestion(matches, [], "760416");
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "760416");
});

test("selectFixturesForQuestion picks two-team matchup", () => {
  const matches = [
    { id: "1", homeTeam: "MEX", awayTeam: "RSA", status: "NS", commenceTs: 1 },
    { id: "2", homeTeam: "USA", awayTeam: "PAR", status: "NS", commenceTs: 2 },
  ];
  const picked = selectFixturesForQuestion(matches, ["MEX", "RSA"]);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "1");
});

test("formatWorldCupUrTakePromptBlock includes MATCH INTEL and injury rule", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: { A: [{ name: "Mexico", strengthTag: "Favorite" }] },
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760415",
        homeTeam: "MEX",
        awayTeam: "RSA",
        status: "NS",
        homeScore: null,
        awayScore: null,
        lineups: {
          home: { formation: "4-3-3", starters: [{ name: "Ochoa", jersey: "1" }], bench: [] },
          away: { formation: null, starters: [], bench: [] },
        },
        players: { home: [], away: [] },
        teamStats: { home: {}, away: {} },
        goals: [],
        injuries: [],
      },
    ],
  });
  assert.match(block, /MATCH INTEL \(event 760415\)/);
  assert.match(block, /INJURY \/ AVAILABILITY/);
  assert.match(block, /Do not invent player availability/);
});

test("formatWorldCupUrTakePromptBlock surfaces passes possession corners and cards", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760500",
        homeTeam: "FRA",
        awayTeam: "ENG",
        status: "live",
        homeScore: 1,
        awayScore: 0,
        lineupConfirmed: true,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: {
          home: {
            shots: 8,
            shotsOnTarget: 4,
            possessionPct: 58,
            passes: 420,
            passesCompleted: 360,
            passPct: 86,
            corners: 5,
            fouls: 9,
          },
          away: {
            shots: 5,
            possessionPct: 42,
            passes: 310,
            passesCompleted: 250,
            passPct: 81,
          },
        },
        players: {
          home: [
            {
              name: "Kylian Mbappé",
              goals: 1,
              assists: 1,
              keyPasses: 3,
              yellowCards: 1,
              minutesPlayed: 67,
            },
          ],
          away: [],
        },
        goals: [{ scorer: "Mbappé", assist: "Griezmann", minute: "23'" }],
        injuries: [],
      },
    ],
  });

  assert.match(block, /passes 360\/420 \(86%\)/);
  assert.match(block, /possession 58%/);
  assert.match(block, /corners 5/);
  assert.match(block, /3 key passes/);
  assert.match(block, /1 yellow/);
  assert.match(block, /Live team stats \(binding/);
});

test("formatWorldCupUrTakePromptBlock includes post-match chance quality when present", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760501",
        homeTeam: "FRA",
        awayTeam: "ENG",
        status: "FT",
        homeScore: 2,
        awayScore: 1,
        finalized: true,
        lineupConfirmed: true,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: {
          home: { shots: 14, shotsOnTarget: 6, possessionPct: 58, corners: 5 },
          away: { shots: 8, shotsOnTarget: 3, possessionPct: 42, corners: 2 },
        },
        players: {
          home: [
            {
              name: "Kylian Mbappé",
              shots: 5,
              shotsOnTarget: 3,
              keyPasses: 2,
              goals: 1,
              assists: 1,
            },
          ],
          away: [],
        },
        goals: [],
        injuries: [],
        advancedStats: {
          source: "espn_chance_index",
          sourceLabel: "Post-match chance quality (ESPN-derived estimate — not Opta xG)",
          homeTeam: "FRA",
          awayTeam: "ENG",
          team: {
            home: { chanceIndex: 1.2, shots: 14, shotsOnTarget: 6 },
            away: { chanceIndex: 0.7, shots: 8, shotsOnTarget: 3 },
          },
          players: [
            {
              name: "Kylian Mbappé",
              nationAbbr: "FRA",
              chanceIndex: 0.58,
              shots: 5,
              shotsOnTarget: 3,
              keyPasses: 2,
              goals: 1,
              assists: 1,
            },
          ],
        },
      },
    ],
  });

  assert.match(block, /POST-MATCH CHANCE QUALITY/);
  assert.match(block, /not Opta xG/i);
  assert.match(block, /Team chance index/);
  assert.match(block, /Mbapp/);
});

test("formatWorldCupUrTakePromptBlock live match includes live chance index", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760502",
        homeTeam: "FRA",
        awayTeam: "ENG",
        status: "live",
        homeScore: 0,
        awayScore: 0,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: {
          home: { shots: 8, shotsOnTarget: 4, possessionPct: 60, corners: 2 },
          away: { shots: 2, shotsOnTarget: 0, possessionPct: 40, corners: 0 },
        },
        players: {
          home: [{ name: "Kylian Mbappé", shots: 3, shotsOnTarget: 2, keyPasses: 1 }],
          away: [],
        },
        goals: [],
        injuries: [],
      },
    ],
  });
  assert.match(block, /LIVE CHANCE INDEX/);
  assert.match(block, /not Opta xG/i);
  assert.match(block, /Team chance index/);
});

test("formatWorldCupUrTakePromptBlock renders 0-0 for a live match with null score fields", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760599",
        homeTeam: "NED",
        awayTeam: "MAR",
        status: "live",
        homeScore: null,
        awayScore: null,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: { home: {}, away: {} },
        players: { home: [], away: [] },
        goals: [],
        injuries: [],
      },
    ],
  });
  // The model must never be told "Status: live" with no score for a live fixture.
  assert.match(block, /Status: live · Score 0-0/);
});

test("live in-play prompt carries score, goal-probability totals, and chance index together", () => {
  const now = Date.parse("2026-07-04T19:00:00.000Z");
  // Goal-probability market (Over/Under total goals) on a fresh live fixture.
  const oddsBlock = buildMatchOddsFreshnessPromptBlock(
    {
      homeTeam: "NED",
      awayTeam: "MAR",
      status: "live",
      odds: {
        home: { moneyline: "+175" },
        draw: { moneyline: "+210" },
        away: { moneyline: "+360" },
        totalLine: "2.5",
        totalOver: "+140",
        totalUnder: "-170",
      },
      oddsUpdatedAt: now - 60 * 1000,
    },
    now,
  );
  assert.ok(oddsBlock, "expected a fixture odds block for the live match");

  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    fixtureOddsBlocks: [oddsBlock],
    matchDetails: [
      {
        eventId: "760599",
        homeTeam: "NED",
        awayTeam: "MAR",
        status: "live",
        // Feed reports null mid-game; renderer must still surface a definite score.
        homeScore: null,
        awayScore: null,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: {
          home: { shots: 9, shotsOnTarget: 4, possessionPct: 61, corners: 4 },
          away: { shots: 3, shotsOnTarget: 1, possessionPct: 39, corners: 1 },
        },
        players: {
          home: [{ name: "Cody Gakpo", shots: 3, shotsOnTarget: 2, keyPasses: 2 }],
          away: [],
        },
        goals: [],
        injuries: [],
      },
    ],
  });

  // Knows the score mid-game.
  assert.match(block, /Status: live · Score 0-0/);
  // Can ground a goal-probability answer: live totals + chance index proxy.
  assert.match(block, /FIXTURE MATCH ODDS/);
  assert.match(block, /Over \+140/);
  assert.match(block, /Under -170/);
  assert.match(block, /LIVE CHANCE INDEX/);
  assert.match(block, /not Opta xG/i);
});

test("knockout phase suppresses group Favorite/Contender/Longshot framing", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "ROUND_OF_32",
    groupsForPrompt: {
      I: [{ name: "Norway", strengthTag: "Contender", hasResults: false }],
      E: [{ name: "Ivory Coast", strengthTag: "Longshot", hasResults: false }],
    },
    fixtures: [
      { homeTeam: "NOR", awayTeam: "CIV", round: "Round of 32", status: "NS" },
    ],
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [],
  });
  // The group strength-tag TABLE must not render (the KNOCKOUT FIXTURE SCOPE instruction
  // line legitimately contains the word "Contender" when telling the model NOT to use it).
  assert.doesNotMatch(block, /Group I:/);
  assert.doesNotMatch(block, /Norway \(Contender/);
  assert.doesNotMatch(block, /Ivory Coast \(Longshot/);
  assert.match(block, /KNOCKOUT FIXTURE SCOPE/);
});

test("pre-match fixture injects the not-started guard (no live framing)", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "ROUND_OF_32",
    groupsForPrompt: {},
    fixtures: [{ homeTeam: "NOR", awayTeam: "CIV", round: "Round of 32", status: "NS" }],
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [],
  });
  assert.match(block, /PRE-MATCH \(not started/);
  assert.match(block, /has NOT kicked off/);
  assert.match(block, /NOR vs CIV/);
});

test("live fixture does NOT inject the pre-match guard", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "ROUND_OF_32",
    groupsForPrompt: {},
    fixtures: [{ homeTeam: "NOR", awayTeam: "CIV", round: "Round of 32", status: "live" }],
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [],
  });
  assert.doesNotMatch(block, /PRE-MATCH \(not started/);
});

test("buildWcLiveStateGuardBlock: live fixture surfaces score and forbids asking for it", () => {
  const guard = buildWcLiveStateGuardBlock(
    [],
    [{ homeTeam: "BEL", awayTeam: "SEN", homeScore: 0, awayScore: 1, status: "HT" }],
    [],
  );
  assert.match(String(guard), /LIVE STATE \(binding/);
  assert.match(String(guard), /BEL 0-1 SEN — HT/);
  assert.match(String(guard), /NEVER reply by asking for the current score/i);
  // No live match anywhere → no guard.
  assert.equal(
    buildWcLiveStateGuardBlock([{ homeTeam: "MEX", awayTeam: "ECU", status: "NS" }], [], []),
    null,
  );
});

test("formatWorldCupUrTakePromptBlock injects LIVE STATE for a live cited fixture", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "ROUND_OF_32",
    groupsForPrompt: {},
    fixtures: [{ homeTeam: "BEL", awayTeam: "SEN", round: "Round of 32", status: "live", homeScore: 0, awayScore: 1 }],
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [],
  });
  assert.match(block, /LIVE STATE \(binding/);
  assert.match(block, /BEL 0-1 SEN/);
});

test("buildWcFixtureStateGuardBlock: pre-match yields guard, live/finished yields null", () => {
  const pre = buildWcFixtureStateGuardBlock(
    [{ homeTeam: "NOR", awayTeam: "CIV", status: "NS" }],
    [],
  );
  assert.match(String(pre), /PRE-MATCH \(not started/);
  assert.match(String(pre), /NOR vs CIV/);
  assert.equal(buildWcFixtureStateGuardBlock([{ status: "live" }], []), null);
  assert.equal(buildWcFixtureStateGuardBlock([{ status: "FT" }], []), null);
  assert.equal(buildWcFixtureStateGuardBlock([], []), null);
});

test("buildWcStubGuardSliceBlock keeps guardrails when the model runs on a prebuilt stub", () => {
  // Live stub: LIVE STATE + knockout rules + squad truth must all bind.
  const liveSlice = buildWcStubGuardSliceBlock({
    phase: "ROUND_OF_32",
    fixtures: [{ homeTeam: "BEL", awayTeam: "SEN", homeScore: 0, awayScore: 1, status: "HT" }],
    matchDetails: [],
    live: [],
  });
  assert.match(liveSlice, /KNOCKOUT PHASE \(mandatory\)/);
  assert.match(liveSlice, /LIVE STATE \(binding/);
  assert.match(liveSlice, /BEL 0-1 SEN/);
  assert.match(liveSlice, /WC SQUAD TRUTH/);

  // Pre-match stub: PRE-MATCH guard binds instead of LIVE STATE.
  const preSlice = buildWcStubGuardSliceBlock({
    phase: "ROUND_OF_32",
    fixtures: [{ homeTeam: "MEX", awayTeam: "ECU", status: "NS" }],
    matchDetails: [],
    live: [],
  });
  assert.match(preSlice, /PRE-MATCH \(not started/);
  assert.doesNotMatch(preSlice, /LIVE STATE/);

  // Empty stub still carries squad truth (never crashes).
  const emptySlice = buildWcStubGuardSliceBlock(null);
  assert.match(emptySlice, /WC SQUAD TRUTH/);
});

test("buildWcImageReferenceGroundingBlock grounds knockout + bracket + squad truth (Home-tab image)", () => {
  const matches = [
    ...Array.from({ length: 72 }, () => ({ status: "FT", round: "Group Stage" })),
    { status: "NS", round: "Round of 32", homeTeam: "CIV", awayTeam: "NOR", date: "2026-06-30" },
  ];
  const block = buildWcImageReferenceGroundingBlock(
    matches,
    Date.parse("2026-06-30T18:00:00-04:00"),
  );
  assert.match(block, /apply ONLY if the screenshot shows a World Cup/i);
  assert.match(block, /Round of 32/);
  assert.match(block, /KNOCKOUT SIGNAL/);
  assert.match(block, /never describe it as a "qualifier"/);
  assert.match(block, /CIV vs NOR/);
  assert.match(block, /WC SQUAD TRUTH/);
  assert.match(block, /Haaland \(NOR\)/);
});

test("squadTruthGuardBlock is rendered when provided", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "ROUND_OF_32",
    groupsForPrompt: {},
    fixtures: [{ homeTeam: "NOR", awayTeam: "CIV", round: "Round of 32", status: "NS" }],
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [],
    squadTruthGuardBlock: "WC SQUAD TRUTH (binding):\n  ... Erling Braut Haaland (NOR) ...",
  });
  assert.match(block, /WC SQUAD TRUTH/);
  assert.match(block, /Haaland \(NOR\)/);
});

test("keyPlayersBlock is rendered when provided", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "ROUND_OF_32",
    groupsForPrompt: {},
    fixtures: [{ homeTeam: "NOR", awayTeam: "CIV", round: "Round of 32", status: "NS" }],
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [],
    keyPlayersBlock: "KEY PLAYERS (per cited team):\n  NOR key players (ranked):\n    - Erling Braut Haaland (FW)",
  });
  assert.match(block, /KEY PLAYERS \(per cited team\)/);
  assert.match(block, /Haaland/);
});

test("formatWorldCupUrTakePromptBlock does not fabricate a score for a not-started match", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760600",
        homeTeam: "MEX",
        awayTeam: "RSA",
        status: "NS",
        homeScore: null,
        awayScore: null,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: { home: {}, away: {} },
        players: { home: [], away: [] },
        goals: [],
        injuries: [],
      },
    ],
  });
  assert.doesNotMatch(block, /Score 0-0/);
});
