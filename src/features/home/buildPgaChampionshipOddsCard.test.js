import test from "node:test";
import assert from "node:assert/strict";
import { buildPgaChampionshipOddsHomeCard } from "./buildPgaChampionshipOddsCard.js";

test("buildPgaChampionshipOddsHomeCard shows top five during active PGA week", () => {
  const card = buildPgaChampionshipOddsHomeCard({
    currentEvent: { id: "401734002", name: "PGA Championship", state: "in" },
    odds: {
      hasPostedLines: true,
      fetchedAt: "2026-05-15T16:00:00.000Z",
      freshness: { isStale: false, ageMinutes: 12 },
      outrights: [
        { player: "Scottie Scheffler", odds: 450 },
        { player: "Rory McIlroy", odds: 900 },
        { player: "Jon Rahm", odds: 1200 },
        { player: "Xander Schauffele", odds: 1400 },
        { player: "Collin Morikawa", odds: 1600 },
        { player: "Tiger Woods", odds: 5000 },
      ],
    },
  });
  assert.ok(card);
  assert.equal(card.leaders.length, 5);
  assert.equal(card.leaders[0].player, "Scottie Scheffler");
  assert.match(card.prompt, /Scottie Scheffler/);
});

test("buildPgaChampionshipOddsHomeCard hidden without posted lines", () => {
  const card = buildPgaChampionshipOddsHomeCard({
    currentEvent: { id: "401734002", name: "PGA Championship", state: "in" },
    odds: { hasPostedLines: false, outrights: [] },
  });
  assert.equal(card, null);
});
