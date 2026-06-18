import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWcGroundingCardToStructured,
  buildWcGroundingPacketForUrTake,
} from "./_wcGroundingUrTake.js";
import {
  buildWcGroundingStripModel,
  formatWcGroundingPinnedLine,
} from "../shared/wcGroundingCardUi.js";

function makeMarketRows(count, prefix) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      name: `${prefix} Player ${i + 1}`,
      americanOdds: `+${100 + i * 5}`,
      line: "0.5",
      side: "over",
      nationAbbr: i % 2 === 0 ? "GHA" : "PAN",
    });
  }
  return rows;
}

test("buildWcGroundingPacketForUrTake — Ghana vs Panama surfaces card grounding", () => {
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "phase1-gha-pan",
    question: "Best player props for Ghana and Panama?",
    routingQuestion: "Best player props for Ghana and Panama?",
    history: [],
    matches: [
      {
        id: "22",
        homeTeam: "GHA",
        awayTeam: "PAN",
        status: "1h",
        minute: "2",
        commenceTs: Date.parse("2026-06-17T18:00:00.000Z"),
        bdlMatchId: 22,
      },
    ],
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: {
      eventId: "22",
      homeTeam: "GHA",
      awayTeam: "PAN",
      source: "bdl",
      lastUpdated: Date.now() - 45_000,
      markets: {
        player_shots_ou: makeMarketRows(18, "Shot"),
        player_sot_ou: makeMarketRows(12, "SOT"),
        anytime_scorer: [],
      },
    },
    loadMeta: { attempts: 1, coldStart: false, fromCache: true, loadMs: 12, failed: false },
  });

  const structured = applyWcGroundingCardToStructured(
    {
      sport: "worldcup",
      callType: "player_market_odds",
      call: "Match player props — lines loading",
      lean: "Waiting on books",
      whyNow: "Fixture Panama vs Ghana",
      edge: "Try again soon",
      confidence: "Speculative",
    },
    packet,
  );

  assert.equal(structured.groundingVisible, true);
  assert.equal(structured.groundingPinBanner?.headline, "Ghana vs Panama");
  assert.ok(structured.groundingInventoryStrip?.posted.includes("Shots"));
  assert.ok(structured.groundingInventoryStrip?.notPosted.includes("Anytime goals"));
  assert.ok(structured.caveats.some((c) => /anytime goal/i.test(c)));

  const strip = buildWcGroundingStripModel({
    pinBanner: structured.groundingPinBanner,
    inventoryStrip: structured.groundingInventoryStrip,
  });
  assert.equal(formatWcGroundingPinnedLine(structured.groundingPinBanner), "PINNED · Ghana vs Panama (GHA–PAN)");
  assert.match(strip?.statusLine || "", /Live · 1st half, 2'/);
  assert.match(strip?.statusLine || "", /Updated 45s ago \(BDL\)/);
  assert.equal(strip?.postedLine, "Posted: Shots · SOT");
  assert.match(strip?.notPostedLine || "", /Not posted:.*Anytime goals/);
});

test("applyWcGroundingCardToStructured — fixture ambiguity caveat", () => {
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "phase1-ambiguity",
    question: "Best props for Ghana?",
    routingQuestion: "Best props for Ghana?",
    history: [],
    matches: [
      { id: "22", homeTeam: "GHA", awayTeam: "PAN", status: "live", minute: "10" },
      { id: "44", homeTeam: "GHA", awayTeam: "KOR", status: "NS", commenceTs: Date.now() + 3600000 },
    ],
    fixtureTeams: ["GHA", "PAN"],
    resolvedEventId: "22",
    matchPlayerProps: {
      lastUpdated: Date.now() - 30_000,
      source: "bdl",
      markets: { player_shots_ou: makeMarketRows(4, "Shot"), anytime_scorer: [] },
    },
  });

  packet.pinnedFixture = {
    ...packet.pinnedFixture,
    alternateCandidates: [{ eventId: "44", home: "GHA", away: "KOR", status: "NS" }],
  };

  const structured = applyWcGroundingCardToStructured({ sport: "worldcup", callType: "player_market_odds" }, packet);
  assert.ok(structured.caveats.some((c) => /Did you mean Ghana vs Panama or Ghana vs/i.test(c)));
});
