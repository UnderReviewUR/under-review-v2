import assert from "node:assert/strict";
import test from "node:test";
import { planLiveSnapshot } from "./liveSnapshotPlan.js";
import { GROUP_STAGE_OPENERS } from "./wc2026PromoFixtures.js";

test("planLiveSnapshot includes World Cup during promo window", () => {
  const promoMs = Date.parse("2026-06-02T16:00:00Z");
  const plan = planLiveSnapshot({
    nowMs: promoMs,
    wcMatches: GROUP_STAGE_OPENERS.map((m) => ({
      ...m,
      status: "NS",
    })),
    tickerNbaGames: [],
    f1Data: null,
    golfSnapshotKey: () => null,
  });
  assert.ok(plan.items.some((i) => i.kind === "worldcup"));
  assert.ok(plan.keys.some((k) => k.startsWith("worldcup:")));
});

test("planLiveSnapshot omits World Cup outside promo window", () => {
  const plan = planLiveSnapshot({
    nowMs: Date.parse("2026-05-01T16:00:00Z"),
    wcMatches: GROUP_STAGE_OPENERS,
    tickerNbaGames: [],
    f1Data: null,
    golfSnapshotKey: () => null,
  });
  assert.ok(!plan.items.some((i) => i.kind === "worldcup"));
});

test("planLiveSnapshot prioritizes World Cup before NBA", () => {
  const promoMs = Date.parse("2026-06-02T16:00:00Z");
  const plan = planLiveSnapshot({
    nowMs: promoMs,
    wcMatches: GROUP_STAGE_OPENERS.map((m) => ({ ...m, status: "NS" })),
    tickerNbaGames: [
      {
        id: 99,
        state: "pre",
        startTimeUtc: new Date(promoMs + 2 * 60 * 60 * 1000).toISOString(),
        awayTeam: { abbr: "BOS" },
        homeTeam: { abbr: "LAL" },
      },
    ],
    f1Data: null,
    golfSnapshotKey: () => null,
  });
  assert.equal(plan.items[0]?.kind, "worldcup");
});

test("filterAndOrderWcMatchesForSnapshot ranks confirmed XI first", async () => {
  const { filterAndOrderWcMatchesForSnapshot } = await import("./liveSnapshotFilters.js");
  const nowMs = Date.parse("2026-06-11T20:00:00Z");
  const ordered = filterAndOrderWcMatchesForSnapshot(
    [
      {
        id: "a",
        homeTeam: "USA",
        awayTeam: "PAR",
        status: "NS",
        commenceTs: nowMs + 60 * 60 * 1000,
        xiStatus: "pending",
      },
      {
        id: "b",
        homeTeam: "MEX",
        awayTeam: "RSA",
        status: "NS",
        commenceTs: nowMs + 2 * 60 * 60 * 1000,
        xiStatus: "confirmed",
      },
    ],
    nowMs,
  );
  assert.equal(ordered[0]?.id, "b");
});
