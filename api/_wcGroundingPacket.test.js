import assert from "node:assert/strict";
import test from "node:test";
import { buildWcGroundingPacket } from "./_wcGroundingPacket.js";

/**
 * Build N unique O/U rows for a market (one leg each).
 * @param {number} count
 * @param {string} prefix
 */
function makeMarketRows(count, prefix) {
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      name: `${prefix} Player ${i + 1}`,
      americanOdds: `+${100 + i * 5}`,
      line: "0.5",
      side: "over",
      nationAbbr: i % 2 === 0 ? "GHA" : "PAN",
      playerId: 9000 + i,
    });
  }
  return rows;
}

test("buildWcGroundingPacket — Ghana vs Panama (event 22, live 1H)", () => {
  const rawBdlPlayerProps = {
    player_shots_ou: makeMarketRows(18, "Shot"),
    player_sot_ou: makeMarketRows(12, "SOT"),
    anytime_scorer: [],
  };

  const packet = buildWcGroundingPacket({
    requestId: "test-gha-pan-22",
    askContext: {
      shape: "fixture_board",
      question: "Best player props for Ghana and Panama?",
      routingQuestion: "Best player props for Ghana and Panama?",
      hasImage: false,
      mentionedTeams: ["GHA", "PAN"],
    },
    pinnedFixture: {
      eventId: "22",
      bdlMatchId: 22,
      home: "GHA",
      away: "PAN",
      homeDisplay: "Ghana",
      awayDisplay: "Panama",
      status: "live",
      kickoffUtc: "2026-06-17T18:00:00.000Z",
      slateDateEt: "2026-06-17",
      clockDisplay: "1st, 2'",
      pinMethod: "two_teams_in_question",
    },
    rawBdlPlayerProps,
    dataFreshness: {
      source: "balldontlie",
      ageMs: 45_000,
      ageSec: 45,
      fetchedAt: "2026-06-17T18:02:00.000Z",
      inPlay: true,
      refresh: {
        attempted: false,
        succeeded: false,
        reason: "fresh_enough",
        durationMs: null,
      },
      isStale: false,
      staleAfterSec: 90,
    },
  });

  assert.equal(packet.fullLadder.totalLegs, 30);

  const postedMarkets = packet.marketsSummary.posted.map((m) => m.market);
  assert.ok(postedMarkets.includes("player_shots_ou"));
  assert.ok(postedMarkets.includes("player_sot_ou"));
  assert.ok(packet.marketsSummary.empty.includes("anytime_scorer"));

  assert.ok(packet.views.claude.markets.length >= 1);
  assert.ok(packet.views.claude.markets[0].topLegs.length <= 5);

  assert.equal(packet.views.card.pinBanner?.headline, "Ghana vs Panama");
  assert.ok(packet.views.card.inventoryStrip.posted.includes("Shots"));
  assert.ok(packet.views.card.inventoryStrip.notPosted.includes("Anytime goals"));

  assert.ok(packet.blockers.codes.includes("anytime_scorer_empty"));

  assert.equal(packet.views.validation.allowedLegIds.size, 30);
  assert.equal(Object.keys(packet.views.validation.playerIndex).length, 30);
});
