import assert from "node:assert";
import test from "node:test";
import { deleteDurableJson, setDurableJson } from "./_durableStore.js";
import { aggregatePublicLedgerStats } from "./_takeLedger.js";

function row(i, conf = "High — edge") {
  return {
    id: `row_${i}`,
    sport: "nba",
    confidence: conf,
    status: "settled",
    result: i % 2 === 0 ? "win" : "loss",
    playLine: "Team ML",
    createdAt: new Date().toISOString(),
    parsedBet: { oddsAmerican: -110, marketType: "team_moneyline", team: "X" },
  };
}

test("aggregatePublicLedgerStats null when fewer than 20 takes globally", async () => {
  const k = "takes:agg_small@test.com";
  await deleteDurableJson(k);
  await setDurableJson(k, { takes: Array.from({ length: 19 }, (_, i) => row(i)) }, { ttlSeconds: 120 });
  const a = await aggregatePublicLedgerStats();
  await deleteDurableJson(k);
  assert.strictEqual(a, null);
});

test("aggregatePublicLedgerStats counts totals and high-tier win rate", async () => {
  const k = "takes:agg_large@test.com";
  await deleteDurableJson(k);
  const takes = Array.from({ length: 21 }, (_, i) => row(i));
  await setDurableJson(k, { takes }, { ttlSeconds: 120 });
  const a = await aggregatePublicLedgerStats();
  await deleteDurableJson(k);
  assert.ok(a);
  assert.strictEqual(a.totalTakes >= 21, true);
  assert.ok(typeof a.highConfidenceWinRate === "number");
});
