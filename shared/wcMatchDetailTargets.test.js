import assert from "node:assert/strict";
import test from "node:test";
import { selectWcMatchDetailTargets } from "./wcMatchDetailTargets.js";

const now = Date.parse("2026-06-10T18:00:00Z");

test("selectWcMatchDetailTargets returns live plus next 3 upcoming only", () => {
  const matches = [
    { id: "1", status: "live", commenceTs: now - 3600000, homeTeam: "MEX", awayTeam: "RSA", date: "2026-06-11" },
    { id: "2", status: "NS", commenceTs: now + 3600000, homeTeam: "USA", awayTeam: "PAR", date: "2026-06-12" },
    { id: "3", status: "NS", commenceTs: now + 7200000, homeTeam: "BRA", awayTeam: "MAR", date: "2026-06-12" },
    { id: "4", status: "NS", commenceTs: now + 10800000, homeTeam: "FRA", awayTeam: "SEN", date: "2026-06-13" },
    { id: "5", status: "NS", commenceTs: now + 14400000, homeTeam: "GER", awayTeam: "AUS", date: "2026-06-13" },
  ];

  const targets = selectWcMatchDetailTargets(matches, now);
  const ids = targets.map((t) => t.eventId).sort();
  assert.deepEqual(ids, ["1", "2", "3", "4"]);
  assert.equal(targets.find((t) => t.eventId === "1")?.scrapeMode, "live");
  assert.equal(targets.filter((t) => t.scrapeMode === "ramp").length, 3);
});

test("selectWcMatchDetailTargets adds finalize for FT not yet finalized", () => {
  const matches = [
    { id: "9", status: "FT", commenceTs: now - 7200000, homeTeam: "MEX", awayTeam: "RSA", date: "2026-06-09" },
  ];
  const targets = selectWcMatchDetailTargets(matches, now, { finalizedEventIds: new Set() });
  assert.equal(targets.length, 1);
  assert.equal(targets[0].scrapeMode, "finalize");
});

test("selectWcMatchDetailTargets skips finalized FT", () => {
  const matches = [
    { id: "9", status: "FT", commenceTs: now - 7200000, homeTeam: "MEX", awayTeam: "RSA", date: "2026-06-09" },
  ];
  const targets = selectWcMatchDetailTargets(matches, now, { finalizedEventIds: new Set(["9"]) });
  assert.equal(targets.length, 0);
});
