import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcHomePromoCard,
  buildWcXiConfirmedHomeStarter,
  orderHomeQuestionsForWcPromo,
} from "./buildWcHomePromoCard.js";

test("buildWcHomePromoCard returns card during promo window", () => {
  const card = buildWcHomePromoCard(Date.parse("2026-06-02T16:00:00Z"));
  assert.ok(card);
  assert.equal(card.sportHint, "worldcup");
  assert.ok(card.trustLine?.includes("Starting XIs"));
  assert.ok(card.tagline?.includes("104 matches"));
  assert.ok(card.featureLine?.includes("Live odds"));
  assert.equal(card.matchesCta, "See today's matches");
});

test("orderHomeQuestionsForWcPromo blends WC, NBA Finals, second WC", () => {
  const list = [
    { id: "mlb", sportHint: "mlb", text: "MLB" },
    { id: "q-wc-group-misprice", sportHint: "worldcup", text: "WC2" },
    { id: "q-nba-finals", sportHint: "nba", text: "NBA Finals" },
    { id: "q-wc-promo", sportHint: "worldcup", text: "WC1" },
  ];
  const out = orderHomeQuestionsForWcPromo(list, Date.parse("2026-06-02T16:00:00Z"));
  assert.deepEqual(
    out.slice(0, 3).map((p) => p.id),
    ["q-wc-promo", "q-nba-finals", "q-wc-group-misprice"],
  );
});

test("buildWcHomePromoCard highlights are tournament value bullets", () => {
  const card = buildWcHomePromoCard(Date.parse("2026-06-02T16:00:00Z"));
  assert.ok(card.highlights[0].includes("104 matches"));
  assert.ok(card.highlights[1].includes("Live in-game odds"));
  assert.ok(card.highlights[2].includes("line movement"));
});

test("buildWcXiConfirmedHomeStarter for XI notice", () => {
  const starter = buildWcXiConfirmedHomeStarter({
    eventId: "wc-1",
    homeTeam: "USA",
    awayTeam: "PAR",
  });
  assert.ok(starter);
  assert.equal(starter.sportHint, "worldcup");
  assert.match(starter.text, /PAR vs USA|USA vs PAR/);
  assert.match(starter.prompt, /player prop/i);
  assert.equal(buildWcXiConfirmedHomeStarter(null), null);
});
