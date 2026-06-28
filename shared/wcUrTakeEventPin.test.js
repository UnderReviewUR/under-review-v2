import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeWcUrTakeEventPin,
  resolveWcFeaturedEventPin,
  resolveWcThreadEventPin,
} from "./wcUrTakeEventPin.js";

test("resolveWcThreadEventPin reads last user wcEventId", () => {
  const pin = resolveWcThreadEventPin([
    { role: "user", wcEventId: "101", wcMatchTeams: { home: "BRA", away: "JPN" } },
    { role: "ai", text: "lean" },
  ]);
  assert.equal(pin.eventId, "101");
  assert.deepEqual(pin.matchTeams, { home: "BRA", away: "JPN" });
});

test("mergeWcUrTakeEventPin prefers explicit eventId", () => {
  const pin = mergeWcUrTakeEventPin({
    explicitEventId: "55",
    matches: [{ id: "55", homeTeam: "USA", awayTeam: "MEX" }],
    threadMsgs: [{ role: "user", wcEventId: "101" }],
  });
  assert.equal(pin.eventId, "55");
  assert.deepEqual(pin.matchTeams, { home: "USA", away: "MEX" });
});

test("resolveWcFeaturedEventPin picks live match", () => {
  const pin = resolveWcFeaturedEventPin(
    [
      { id: "1", homeTeam: "USA", awayTeam: "MEX", status: "ns" },
      { id: "2", homeTeam: "BRA", awayTeam: "JPN", status: "live" },
    ],
    [{ id: "2", homeTeam: "BRA", awayTeam: "JPN", status: "live" }],
  );
  assert.equal(pin.eventId, "2");
});
