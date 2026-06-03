import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcHomePromoCard,
  orderHomeQuestionsForWcPromo,
} from "./buildWcHomePromoCard.js";

test("buildWcHomePromoCard returns card during promo window", () => {
  const card = buildWcHomePromoCard(Date.parse("2026-06-02T16:00:00Z"));
  assert.ok(card);
  assert.equal(card.sportHint, "worldcup");
  assert.ok(card.trustLine?.includes("Starting XIs"));
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

test("buildWcHomePromoCard highlights are take-style bullets", () => {
  const card = buildWcHomePromoCard(Date.parse("2026-06-02T16:00:00Z"));
  assert.ok(card.highlights[0].includes("Norway mispriced"));
  assert.ok(card.highlights[1].includes("Paraguay"));
  assert.ok(card.highlights[2].includes("Group I"));
});
