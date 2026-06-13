import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTomorrowSlatePrebuiltStructured,
  buildWcTomorrowSlateMatchAngles,
  resolveWcTomorrowSlateMatches,
  resolveWcSlateMatches,
} from "./wcTomorrowSlatePrebuilt.js";
import { buildStaticPromoMatchesFallback } from "./wc2026PromoFixtures.js";

test("tomorrow slate on Jun 11 evening excludes Argentina", () => {
  const nowMs = Date.parse("2026-06-12T01:14:00Z");
  const matches = buildStaticPromoMatchesFallback(nowMs);
  const { tomorrowYmd, matches: slate } = resolveWcTomorrowSlateMatches(matches, nowMs);
  assert.equal(tomorrowYmd, "2026-06-12");
  const teams = slate.flatMap((m) => [m.homeTeam, m.awayTeam]);
  assert.ok(teams.includes("GER"));
  assert.ok(teams.includes("BRA"));
  assert.ok(!teams.includes("ARG"));
});

test("buildWcTomorrowSlatePrebuiltStructured covers every tomorrow fixture", () => {
  const nowMs = Date.parse("2026-06-12T01:14:00Z");
  const matches = buildStaticPromoMatchesFallback(nowMs);
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "Best World Cup bets for tomorrow?",
    matches,
    nowMs,
  });
  assert.ok(card);
  assert.equal(card.tomorrowFixtureCount, 2);
  assert.equal(card.tomorrowSlateAngles?.length, 2);
  assert.match(String(card.whyNow || ""), /2 matches/);
  assert.match(String(card.lean || ""), /2 angles on tomorrow's ET slate/i);
  assert.doesNotMatch(String(card.deep || ""), /\bArgentina\b/i);
  assert.doesNotMatch(String(card.lean || ""), /outright/i);
});

test("excludes commenceTs-only rows without explicit fixture date", () => {
  const nowMs = Date.parse("2026-06-12T17:00:00Z");
  const matches = [
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "19:00", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "22:00", status: "NS" },
    {
      homeTeam: "HAI",
      awayTeam: "SCO",
      group: "C",
      status: "NS",
      commenceTs: Date.parse("2026-06-13T05:00:00Z"),
    },
  ];
  const { matches: slate } = resolveWcTomorrowSlateMatches(matches, nowMs);
  assert.equal(slate.length, 2);
  assert.ok(!slate.some((m) => m.homeTeam === "HAI"));
});

test("late 9pm ET kickoff uses FIFA UTC matchday when KV date is ET-only", () => {
  const nowMs = Date.parse("2026-06-12T17:00:00Z");
  const matches = [
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "19:00 ET", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    {
      homeTeam: "HAI",
      awayTeam: "SCO",
      group: "C",
      date: "2026-06-13",
      time: "21:00 ET",
      status: "NS",
      commenceTs: Date.parse("2026-06-14T01:00:00.000Z"),
    },
  ];
  const { matches: slate } = resolveWcTomorrowSlateMatches(matches, nowMs);
  assert.equal(slate.length, 2);
  assert.ok(!slate.some((m) => m.homeTeam === "HAI"));
});

test("multi-match KV slate builds one angle per fixture", () => {
  const nowMs = Date.parse("2026-06-12T17:00:00Z");
  const matches = [
    { homeTeam: "USA", awayTeam: "PAR", group: "D", date: "2026-06-13", time: "15:00 ET", status: "NS" },
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "21:00 ET", status: "NS" },
    { homeTeam: "ARG", awayTeam: "ALG", group: "J", date: "2026-06-14", time: "21:00 ET", status: "NS" },
  ];
  const { matches: slate } = resolveWcTomorrowSlateMatches(matches, nowMs);
  assert.equal(slate.length, 3);
  const angles = buildWcTomorrowSlateMatchAngles(slate, {
    question: "Best World Cup bets for tomorrow?",
    nowMs,
  });
  assert.equal(angles.length, 3);
  assert.ok(!angles.some((a) => a.home === "ARG" || a.away === "ARG"));
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "Best World Cup bets for tomorrow?",
    matches,
    nowMs,
  });
  assert.equal(card?.tomorrowFixtureCount, 3);
  assert.match(String(card?.lean || ""), /3 angles on tomorrow's ET slate/i);
});

test("today's slate question resolves Jun 13 fixtures not tomorrow", () => {
  const nowMs = Date.parse("2026-06-13T14:41:00Z");
  const matches = [
    { homeTeam: "ENG", awayTeam: "GHA", group: "L", date: "2026-06-13", time: "15:00 ET", status: "NS" },
    { homeTeam: "FRA", awayTeam: "SEN", group: "I", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    { homeTeam: "ARG", awayTeam: "ALG", group: "J", date: "2026-06-13", time: "21:00 ET", status: "NS" },
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "19:00 ET", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "22:00 ET", status: "NS" },
  ];
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "Best bet on today's slate",
    matches,
    nowMs,
  });
  assert.ok(card);
  assert.equal(card.slateDay, "today");
  assert.equal(card.slateEtDate, "2026-06-13");
  assert.equal(card.tomorrowFixtureCount, 5);
  assert.match(String(card.lean || ""), /5 angles on today's ET slate/i);
  assert.doesNotMatch(String(card.lean || ""), /tomorrow/i);
  assert.match(String(card.deep || ""), /Match:/);
  assert.doesNotMatch(String(card.deep || ""), /\bHaiti vs Scotland\b/i);
});

test("today slate filter matches WC today tab (live + scheduled, ET date)", () => {
  const nowMs = Date.parse("2026-06-13T14:41:00Z");
  const matches = [
    { homeTeam: "ENG", awayTeam: "GHA", group: "L", date: "2026-06-13", time: "15:00 ET", status: "live" },
    { homeTeam: "FRA", awayTeam: "SEN", group: "I", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    { homeTeam: "ARG", awayTeam: "ALG", group: "J", date: "2026-06-13", time: "21:00 ET", status: "NS" },
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "19:00 ET", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "22:00 ET", status: "NS" },
    { homeTeam: "HAI", awayTeam: "SCO", group: "C", date: "2026-06-14", time: "15:00 ET", status: "NS" },
  ];
  const { matches: slate } = resolveWcSlateMatches(matches, nowMs, "today");
  assert.equal(slate.length, 5);
  assert.ok(slate.some((m) => m.homeTeam === "ENG"));
  assert.ok(!slate.some((m) => m.homeTeam === "HAI"));
});
