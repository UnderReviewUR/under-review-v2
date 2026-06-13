import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTomorrowSlatePrebuiltStructured,
  buildWcTomorrowSlateMatchAngles,
  resolveWcTomorrowSlateMatches,
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
