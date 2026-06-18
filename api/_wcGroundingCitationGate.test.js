import assert from "node:assert/strict";
import test from "node:test";
import {
  assessWcGroundingCitationGate,
  buildWcCitationGateRetryUserPrompt,
  buildWcGroundingDeterministicFallback,
  enforceWcGroundingCitationGate,
  extractCitedLegIdsFromWcPropsResponse,
  shouldRunWcGroundingCitationGate,
  validateWcCitedLegIds,
  validateWcNamedLegCitationBinding,
} from "./_wcGroundingCitationGate.js";
import { buildWcGroundingPacketForUrTake, resolveWcNamedLegMatchesForGrounding } from "./_wcGroundingUrTake.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

function ghaPanProps() {
  return {
    eventId: "22",
    homeTeam: "GHA",
    awayTeam: "PAN",
    source: "bdl",
    lastUpdated: Date.now() - 45_000,
    markets: {
      player_shots_ou: Array.from({ length: 18 }, (_, i) => ({
        name: i === 0 ? "Antoine Semenyo" : `Shot Player ${i + 1}`,
        americanOdds: i === 0 ? "-112" : `+${100 + i * 5}`,
        line: i === 0 ? "3.5" : "0.5",
        side: "over",
        nationAbbr: i % 2 === 0 ? "GHA" : "PAN",
        vendor: "betrivers",
      })),
      player_sot_ou: Array.from({ length: 12 }, (_, i) => ({
        name: `SOT Player ${i + 1}`,
        americanOdds: `+${110 + i * 5}`,
        line: "0.5",
        side: "over",
        nationAbbr: i % 2 === 0 ? "GHA" : "PAN",
        vendor: "betrivers",
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

test("shouldRunWcGroundingCitationGate — fixture_board yes, image_slip no", () => {
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "gate-shape",
    question: "Best player props for Ghana vs Panama?",
    routingQuestion: "Best player props for Ghana vs Panama?",
    history: [],
    matches: ghaPanMatches,
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: ghaPanProps(),
  });
  assert.equal(packet.ask.shape, "fixture_board");
  assert.equal(shouldRunWcGroundingCitationGate(packet), true);

  const imagePacket = buildWcGroundingPacketForUrTake({
    requestId: "gate-image",
    question: "Thoughts on these?",
    routingQuestion: "Thoughts on these?",
    history: [],
    matches: ghaPanMatches,
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: ghaPanProps(),
    hasImage: true,
  });
  assert.equal(imagePacket.ask.shape, "image_slip");
  assert.equal(shouldRunWcGroundingCitationGate(imagePacket), false);
});

test("Ghana fixture_board — valid legIds pass without retry", async () => {
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "gate-gha",
    question: "Best player props for Ghana vs Panama?",
    routingQuestion: "Best player props for Ghana vs Panama?",
    history: [],
    matches: ghaPanMatches,
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: ghaPanProps(),
  });

  const validId = "player_shots_ou|antoine semenyo|3.5|over|betrivers";
  assert.ok(packet.views.validation.allowedLegIds.has(validId));

  const structured = {
    sport: "worldcup",
    callType: "player_market_verified",
    propBoardRows: [{ label: "Semenyo", legId: validId, odds: "-112" }],
    citations: [{ legId: validId, americanOdds: "-112" }],
    lean: `Semenyo over 3.5 shots at -112 (${validId})`,
  };

  const cited = extractCitedLegIdsFromWcPropsResponse(structured);
  assert.ok(cited.includes(validId));

  const assessment = assessWcGroundingCitationGate({ structured, packet });
  assert.equal(assessment.pass, true);

  let retryCalled = false;
  const result = await enforceWcGroundingCitationGate({
    structured,
    responseText: structured.lean,
    packet,
    question: "Best player props for Ghana vs Panama?",
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcContext: { playerMarketKv: { matchPlayerProps: ghaPanProps(), wcEventId: "22" } },
    tier: "verified",
    retryAnthropic: async () => {
      retryCalled = true;
      return null;
    },
  });

  assert.equal(retryCalled, false);
  assert.equal(result.log.outcome, "pass");
});

test("invalid legId typo fails validation", () => {
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "gate-invalid",
    question: "Best player props for Ghana vs Panama?",
    routingQuestion: "Best player props for Ghana vs Panama?",
    history: [],
    matches: ghaPanMatches,
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: ghaPanProps(),
  });

  const bogus = "player_shots_ou|fake player|9.5|over|betrivers";
  const check = validateWcCitedLegIds([bogus], packet.views.validation.allowedLegIds);
  assert.equal(check.valid, false);
  assert.deepEqual(check.invalid, [bogus]);
});

test("Gordon named_legs — wrong legId fails binding and uses deterministic fallback", async () => {
  const matchPlayerProps = {
    eventId: "46",
    homeTeam: "ENG",
    awayTeam: "CRO",
    markets: {
      player_shots_ou: [
        {
          name: "Anthony Gordon",
          americanOdds: "-2500",
          line: "0.5",
          side: "over",
          nationAbbr: "ENG",
          vendor: "betrivers",
        },
        {
          name: "Harry Kane",
          americanOdds: "-110",
          line: "1.5",
          side: "over",
          nationAbbr: "ENG",
          vendor: "betrivers",
        },
      ],
    },
  };

  const question = "Anthony Gordon over 1.5 shots?";
  const namedLegMatches = resolveWcNamedLegMatchesForGrounding(question, matchPlayerProps);
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "gate-gordon",
    question,
    routingQuestion: question,
    history: [],
    matches: [],
    fixtureTeams: [],
    resolvedEventId: "46",
    matchPlayerProps,
    namedLegMatches,
  });

  assert.equal(packet.ask.shape, "named_legs");

  const gordonLegId = namedLegMatches[0]?.matched?.legId;
  assert.ok(gordonLegId);
  assert.match(String(gordonLegId), /gordon/i);

  const kaneLegId = "player_shots_ou|harry kane|1.5|over|betrivers";
  const claudeStructured = {
    sport: "worldcup",
    callType: "player_market_verified",
    propBoardRows: [{ label: "Kane", legId: kaneLegId, odds: "-110" }],
    lean: "over 1.5 at -110",
  };

  const namedBinding = validateWcNamedLegCitationBinding(packet, [kaneLegId]);
  assert.equal(namedBinding.valid, false);
  assert.ok(namedBinding.missingRequired.includes(gordonLegId));

  const assessment = assessWcGroundingCitationGate({
    structured: claudeStructured,
    packet,
  });
  assert.equal(assessment.pass, false);

  const retryPrompt = buildWcCitationGateRetryUserPrompt(packet, {
    missingRequired: namedBinding.missingRequired,
  });
  assert.match(retryPrompt, /missing required named-leg legId/);
  assert.match(retryPrompt, /topLegsFromGroundingPacket/);

  let retryCount = 0;
  const result = await enforceWcGroundingCitationGate({
    structured: claudeStructured,
    responseText: claudeStructured.lean,
    packet,
    question,
    wcIntent: WC_INTENT.PLAYER_PROP,
    wcContext: {
      playerMarketKv: { matchPlayerProps, wcEventId: "46" },
      wcEventId: "46",
    },
    tier: "verified",
    retryAnthropic: async () => {
      retryCount += 1;
      return { structured: claudeStructured, responseText: claudeStructured.lean };
    },
  });

  assert.equal(retryCount, 1);
  assert.equal(result.log.outcome, "deterministic_fallback");
  assert.equal(result.structured?.wcCitationGateFallback, true);
  assert.match(String(result.structured?.lean || ""), /Gordon|over|pass/i);
});
