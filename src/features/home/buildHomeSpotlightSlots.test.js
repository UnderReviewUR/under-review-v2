import test from "node:test";
import assert from "node:assert/strict";
import {
  pickWcHomeCompactFixtures,
  resolveHomeSpotlightRightSlot,
} from "./buildHomeSpotlightSlots.js";

const WC_NOW = Date.parse("2026-07-01T16:00:00-04:00");

const LIVE = {
  id: "1",
  homeTeam: "BEL",
  awayTeam: "SEN",
  status: "live",
  homeScore: 0,
  awayScore: 1,
  commenceTs: WC_NOW - 3_600_000,
  date: "2026-07-01",
};

const UPCOMING = {
  id: "2",
  homeTeam: "NED",
  awayTeam: "JPN",
  status: "ns",
  commenceTs: WC_NOW + 3_600_000,
  date: "2026-07-01",
};

test("pickWcHomeCompactFixtures — live before upcoming", () => {
  const fixtures = pickWcHomeCompactFixtures([UPCOMING, LIVE], WC_NOW, { limit: 2 });
  assert.equal(fixtures[0]?.id, "1");
  assert.equal(fixtures[1]?.id, "2");
});

test("pickWcHomeCompactFixtures — respects excludeIds", () => {
  const fixtures = pickWcHomeCompactFixtures([LIVE, UPCOMING], WC_NOW, {
    excludeIds: ["1"],
    limit: 2,
  });
  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0]?.id, "2");
});

test("resolveHomeSpotlightRightSlot — WC fallback when golf off", () => {
  const slot = resolveHomeSpotlightRightSlot(null, false, [LIVE, UPCOMING], WC_NOW);
  assert.equal(slot.kind, "wc-fallback");
  assert.ok(Array.isArray(slot.fixtures) && slot.fixtures.length > 0);
});
