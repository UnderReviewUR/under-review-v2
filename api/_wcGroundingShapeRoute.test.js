import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcGroundingClaudePromptBlock,
  buildWcGroundingSlateClaudeSummary,
  buildWcPlayerMarketGroundingPromptBlock,
  isWcPropsShapeRoutedAsk,
  shouldSkipWcPlayerPropsFastPathForShape,
} from "../shared/wcGroundingShapeRoute.js";
import {
  buildWcGroundingPacketForUrTake,
  prepareWcGroundingPacketForHandler,
  resolveWcNamedLegMatchesForGrounding,
} from "./_wcGroundingUrTake.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import { shouldRunWcPlayerPropsFastPath } from "./ur-take/wcPlayerPropsFastPath.js";

function ghaPanProps() {
  return {
    eventId: "22",
    homeTeam: "GHA",
    awayTeam: "PAN",
    source: "bdl",
    lastUpdated: Date.now() - 45_000,
    markets: {
      player_shots_ou: Array.from({ length: 18 }, (_, i) => ({
        name: `Shot Player ${i + 1}`,
        americanOdds: `+${100 + i * 5}`,
        line: "0.5",
        side: "over",
        nationAbbr: i % 2 === 0 ? "GHA" : "PAN",
      })),
      player_sot_ou: Array.from({ length: 12 }, (_, i) => ({
        name: `SOT Player ${i + 1}`,
        americanOdds: `+${110 + i * 5}`,
        line: "0.5",
        side: "over",
        nationAbbr: i % 2 === 0 ? "GHA" : "PAN",
      })),
      anytime_scorer: [],
    },
  };
}

const ghaPanMatches = [
  {
    id: "22",
    homeTeam: "GHA",
    awayTeam: "PAN",
    status: "1h",
    minute: "2",
    commenceTs: Date.parse("2026-06-17T18:00:00.000Z"),
  },
];

test("1 — Ghana vs Panama routes fixture_board and Claude prompt uses views.claude not raw rows", () => {
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "shape-1",
    question: "Best player props for Ghana and Panama?",
    routingQuestion: "Best player props for Ghana and Panama?",
    history: [],
    matches: ghaPanMatches,
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: ghaPanProps(),
  });

  assert.equal(packet.ask.shape, "fixture_board");
  assert.ok(shouldSkipWcPlayerPropsFastPathForShape(packet.ask.shape));

  const block = buildWcGroundingClaudePromptBlock(packet);
  assert.match(block, /GROUNDING PACKET/);
  assert.match(block, /"askShape": "fixture_board"/);
  assert.match(block, /"count": 18/);
  assert.doesNotMatch(block, /MATCH PLAYER PROPS — event/);
  assert.doesNotMatch(block, /PLAYER SHOTS \(O\/U\):/);
});

test("2 — Gordon over 1.5 shots routes named_legs with deterministic ladder match", () => {
  const matchPlayerProps = {
    markets: {
      player_shots_ou: [
        {
          name: "Declan Rice",
          americanOdds: "+120",
          line: "1.5",
          side: "over",
          nationAbbr: "ENG",
        },
        {
          name: "Anthony Gordon",
          americanOdds: "+145",
          line: "1.5",
          side: "over",
          nationAbbr: "ENG",
        },
      ],
    },
  };

  const question = "Anthony Gordon over 1.5 shots?";
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "shape-2",
    question,
    routingQuestion: question,
    history: [],
    matches: [],
    fixtureTeams: [],
    resolvedEventId: null,
    matchPlayerProps,
    namedLegMatches: resolveWcNamedLegMatchesForGrounding(question, matchPlayerProps),
  });

  assert.equal(packet.ask.shape, "named_legs");
  assert.ok(shouldSkipWcPlayerPropsFastPathForShape(packet.ask.shape));
  assert.equal(packet.namedLegMatches.length, 1);
  assert.equal(packet.namedLegMatches[0].status, "matched");
  assert.match(String(packet.namedLegMatches[0].matched?.playerName || ""), /Gordon/i);
});

test("3 — image_slip skips props fast path", () => {
  assert.equal(
    shouldRunWcPlayerPropsFastPath(
      WC_INTENT.PLAYER_PROP,
      "Thoughts on these?",
      [],
      false,
      true,
    ),
    false,
  );

  const packet = buildWcGroundingPacketForUrTake({
    requestId: "shape-3",
    question: "Thoughts on these?",
    routingQuestion: "Thoughts on these?",
    history: [],
    matches: ghaPanMatches,
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: ghaPanProps(),
    hasImage: true,
  });

  assert.equal(packet.ask.shape, "image_slip");
  assert.ok(shouldSkipWcPlayerPropsFastPathForShape(packet.ask.shape));
});

test("4 — ambiguous single-team ask keeps fixture_board with alternate caveat path", async () => {
  const matches = [
    { id: "22", homeTeam: "GHA", awayTeam: "PAN", status: "live", minute: "10" },
    { id: "44", homeTeam: "GHA", awayTeam: "KOR", status: "NS", commenceTs: Date.now() + 3600000 },
  ];
  const packet = await prepareWcGroundingPacketForHandler({
    sportHint: "worldcup",
    wcIntent: WC_INTENT.PLAYER_PROP,
    question: "Best props for Ghana?",
    routingQuestion: "Best props for Ghana?",
    history: [],
    hasImage: false,
    wcContext: {
      allMatches: matches,
      wcEventId: "22",
      playerMarketKv: { matchPlayerProps: ghaPanProps(), wcEventId: "22" },
    },
    wcRequiredEntities: ["GHA"],
    requestId: "shape-4",
  });

  assert.ok(packet);
  assert.equal(packet.ask.shape, "fixture_board");
  assert.ok(Array.isArray(packet.pinnedFixture?.alternateCandidates));
});

test("5 — slate ask builds slim fixture summaries for Claude", () => {
  const matches = [
    { id: "22", homeTeam: "GHA", awayTeam: "PAN", status: "NS", commenceTs: Date.now() + 3600000 },
    { id: "33", homeTeam: "ENG", awayTeam: "CRO", status: "NS", commenceTs: Date.now() + 7200000 },
  ];
  const byEvent = {
    22: ghaPanProps(),
    33: {
      markets: {
        player_shots_ou: [{ name: "Player A", americanOdds: "+120", line: "0.5", side: "over" }],
      },
    },
  };

  const packet = buildWcGroundingPacketForUrTake({
    requestId: "shape-5",
    question: "Best player props on today's slate?",
    routingQuestion: "Best player props on today's slate?",
    history: [],
    matches,
    fixtureTeams: [],
    resolvedEventId: null,
    matchPlayerProps: null,
  });
  packet.slateFixturesSummary = buildWcGroundingSlateClaudeSummary(
    matches,
    byEvent,
    "Best player props on today's slate?",
  );

  assert.equal(packet.ask.shape, "slate");
  const block = buildWcPlayerMarketGroundingPromptBlock({
    packet,
    slateFixturesSummary: packet.slateFixturesSummary,
  });
  assert.match(block, /slateFixtures/);
  assert.ok(packet.slateFixturesSummary.length >= 1);
});

test("6 — follow-up preserves pinned fixture from history", async () => {
  const history = [
    {
      role: "user",
      content: "Best player props for Ghana and Panama?",
    },
    {
      role: "assistant",
      structured: {
        sport: "worldcup",
        wcEventId: "22",
        fixtureHome: "GHA",
        fixtureAway: "PAN",
        callType: "player_market_odds",
        call: "Semenyo over 0.5 shots +125",
        lean: "Semenyo over 0.5 shots +125",
        propBoardRows: [{ label: "Mohammed Kudus", lean: "Over 0.5 shots +110", odds: "+110" }],
      },
    },
  ];

  const packet = await prepareWcGroundingPacketForHandler({
    sportHint: "worldcup",
    wcIntent: WC_INTENT.PLAYER_PROP,
    question: "Why that pick?",
    routingQuestion: "Why that pick?",
    history,
    hasImage: false,
    wcContext: {
      allMatches: ghaPanMatches,
      wcEventId: "22",
      playerMarketKv: { matchPlayerProps: ghaPanProps(), wcEventId: "22" },
      conversationHistory: history,
    },
    wcRequiredEntities: ["GHA", "PAN"],
    requestId: "shape-6",
  });

  assert.ok(packet);
  assert.equal(packet.pinnedFixture?.eventId, "22");
  assert.equal(packet.pinnedFixture?.home, "GHA");
  assert.equal(packet.pinnedFixture?.away, "PAN");
  assert.equal(packet.ask.shape, "follow_up_explain");
  assert.equal(shouldSkipWcPlayerPropsFastPathForShape(packet.ask.shape), false);
});

test("isWcPropsShapeRoutedAsk gates non-props WC intents", () => {
  assert.equal(
    isWcPropsShapeRoutedAsk({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.RULES,
      routingQuestion: "How does extra time work?",
      hasImage: false,
      history: [],
    }),
    false,
  );
});

test("isWcPropsShapeRoutedAsk — screenshot market analyze is not props shape", () => {
  assert.equal(
    isWcPropsShapeRoutedAsk({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.GENERAL,
      routingQuestion: "analyze the options on this screenshot. whats best to play?",
      hasImage: true,
      history: [],
    }),
    false,
  );
});
