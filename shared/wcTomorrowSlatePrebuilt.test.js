import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTomorrowSlatePrebuiltStructured,
  buildWcTomorrowSlateMatchAngles,
  buildWcSlateMatchOutcomeAngle,
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
  assert.match(String(card.lean || ""), /2 angles on tomorrow's slate/i);
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
  assert.match(String(card?.lean || ""), /3 angles on tomorrow's slate/i);
});

test("buildWcTomorrowSlatePrebuiltStructured — goal totals board per match today", () => {
  const nowMs = Date.parse("2026-06-16T14:00:00Z");
  const matches = [
    {
      homeTeam: "FRA",
      awayTeam: "SEN",
      group: "I",
      date: "2026-06-16",
      time: "15:00 ET",
      status: "NS",
      odds: { totalLine: "2.5", totalOver: "-110", totalUnder: "-110", home: { moneyline: "-130" }, away: { moneyline: "+350" } },
    },
    {
      homeTeam: "ENG",
      awayTeam: "GHA",
      group: "L",
      date: "2026-06-16",
      time: "18:00 ET",
      status: "NS",
      odds: { totalLine: "2.5", totalOver: "+105", totalUnder: "-125", home: { moneyline: "-165" }, away: { moneyline: "+420" } },
    },
  ];
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "what are the best goal totals per match today?",
    matches,
    nowMs,
  });
  assert.ok(card);
  assert.match(String(card.lean || ""), /goal-total leans/i);
  assert.match(String(card.deep || ""), /Under 2\.5|Over 2\.5/i);
  assert.doesNotMatch(String(card.lean || ""), /no actionable line/i);
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
  assert.match(String(card.lean || ""), /5 angles on today's slate/i);
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

test("predict each game today — slate prediction mode with book + sim per match", () => {
  const nowMs = Date.parse("2026-06-13T14:41:00Z");
  const matches = [
    { homeTeam: "ENG", awayTeam: "GHA", group: "L", date: "2026-06-13", time: "15:00 ET", status: "NS" },
    { homeTeam: "FRA", awayTeam: "SEN", group: "I", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    { homeTeam: "ARG", awayTeam: "ALG", group: "J", date: "2026-06-13", time: "21:00 ET", status: "NS" },
  ];
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "predict the outcomes for each world cup game today",
    matches,
    nowMs,
  });
  assert.ok(card);
  assert.equal(card.slatePredictionMode, true);
  assert.equal(card.tomorrowFixtureCount, 3);
  assert.match(String(card.lean || ""), /3 match predictions on today's slate/i);
  assert.match(String(card.call || ""), /3 match predictions/i);
  assert.match(String(card.whyNow || ""), /3 matches/i);
  assert.match(String(card.whyNow || ""), /Kickoffs show ET and Central/i);
  assert.doesNotMatch(String(card.whyNow || ""), /1\) England/i);
  assert.match(String(card.deep || ""), /Match: England vs Ghana/i);
  assert.match(String(card.deep || ""), /Kickoff:/i);
  assert.match(String(card.deep || ""), /Book:/i);
  assert.match(String(card.deep || ""), /UR sim:/i);
  assert.match(String(card.deep || ""), /Pick:/i);
  assert.doesNotMatch(String(card.lean || ""), /no actionable line yet/i);
  assert.match(String(card.deep || ""), /Book:[\s\S]*UR sim:[\s\S]*Pick:/);

  const angle = buildWcSlateMatchOutcomeAngle(matches[0], { nowMs });
  assert.match(angle.predictionPick || "", /England to win/i);
  assert.match(angle.bookLine || "", /-165/);
  assert.ok(angle.simLine);
  assert.match(angle.kickoff || "", /ET/);
});

test("today slate lists kickoff ET for every Jun 13 fixture", () => {
  const nowMs = Date.parse("2026-06-13T15:28:00Z");
  const matches = [
    { homeTeam: "USA", awayTeam: "PAR", group: "D", date: "2026-06-13", time: "15:00 ET", status: "NS" },
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "21:00 ET", status: "NS" },
    { homeTeam: "HAI", awayTeam: "SCO", group: "C", date: "2026-06-13", time: "22:00 ET", status: "NS" },
  ];
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "predict the results of each world cup match today",
    matches,
    nowMs,
  });
  assert.ok(card);
  assert.equal(card.tomorrowFixtureCount, 4);
  assert.match(String(card.lean || ""), /4 match predictions on today's slate/i);
  assert.match(String(card.deep || ""), /Kickoff:.*ET/);
  assert.match(String(card.whyNow || ""), /4 matches/i);
});

test("after-midnight ET game on Jun 14 rolls into Jun 13 today slate", () => {
  const nowMs = Date.parse("2026-06-13T15:28:00Z");
  const midnightEt = Date.parse("2026-06-14T04:00:00.000Z");
  const matches = [
    { homeTeam: "USA", awayTeam: "PAR", group: "D", date: "2026-06-13", time: "15:00 ET", status: "NS" },
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "18:00 ET", status: "NS" },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "21:00 ET", status: "NS" },
    {
      homeTeam: "HAI",
      awayTeam: "SCO",
      group: "C",
      date: "2026-06-14",
      time: "12:00 AM ET",
      commenceTs: midnightEt,
      status: "NS",
    },
  ];
  const { matches: slate } = resolveWcSlateMatches(matches, nowMs, "today");
  assert.equal(slate.length, 4);
  assert.ok(slate.some((m) => m.homeTeam === "HAI"));
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "predict the results of each world cup match today",
    matches,
    nowMs,
  });
  assert.equal(card?.tomorrowFixtureCount, 4);
  assert.match(String(card.deep || ""), /11:00 PM/i);
});

test("prod Jun 13 board — USA final, three remaining predictions", () => {
  const nowMs = Date.parse("2026-06-13T16:51:00Z");
  const matches = [
    { homeTeam: "USA", awayTeam: "PAR", group: "D", date: "2026-06-13", time: "01:00", status: "FT", commenceTs: 1781312400000 },
    { homeTeam: "QAT", awayTeam: "SUI", group: "B", date: "2026-06-13", time: "19:00", status: "NS", commenceTs: 1781377200000 },
    { homeTeam: "BRA", awayTeam: "MAR", group: "C", date: "2026-06-13", time: "22:00", status: "NS", commenceTs: 1781388000000 },
    { homeTeam: "HAI", awayTeam: "SCO", group: "C", date: "2026-06-14", time: "01:00", status: "NS", commenceTs: 1781398800000 },
  ];
  const card = buildWcTomorrowSlatePrebuiltStructured({
    question: "predict the results of each world cup match today",
    matches,
    nowMs,
  });
  assert.equal(card?.tomorrowFixtureCount, 3);
  assert.match(String(card.whyNow || ""), /1 final · 3 remaining/i);
  assert.match(String(card.deep || ""), /3:00 PM ET · Sat 2:00 PM/i);
});
