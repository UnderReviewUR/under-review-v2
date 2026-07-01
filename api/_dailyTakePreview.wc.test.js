import test from "node:test";
import assert from "node:assert/strict";
import { pickWcDailyTakeMatch } from "./_dailyTakePreview.js";

const NOW = Date.parse("2026-07-01T18:00:00-04:00");

const FINISHED = {
  id: "99",
  homeTeam: "ENG",
  awayTeam: "COD",
  status: "ft",
  commenceTs: NOW - 4 * 60 * 60 * 1000,
};

const LIVE = {
  id: "1",
  homeTeam: "BEL",
  awayTeam: "SEN",
  status: "live",
  commenceTs: NOW - 60 * 60 * 1000,
};

const NEXT = {
  id: "2",
  homeTeam: "BIH",
  awayTeam: "USA",
  status: "ns",
  commenceTs: NOW + 2 * 60 * 60 * 1000,
};

const LATER = {
  id: "3",
  homeTeam: "NED",
  awayTeam: "JPN",
  status: "ns",
  commenceTs: NOW + 5 * 60 * 60 * 1000,
};

test("pickWcDailyTakeMatch — skips finished, prefers live", () => {
  const pick = pickWcDailyTakeMatch([FINISHED, NEXT, LIVE], NOW);
  assert.equal(pick?.id, "1");
});

test("pickWcDailyTakeMatch — earliest upcoming when nothing live", () => {
  const pick = pickWcDailyTakeMatch([FINISHED, LATER, NEXT], NOW);
  assert.equal(pick?.id, "2");
});
