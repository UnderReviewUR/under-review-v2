import assert from "node:assert/strict";
import test from "node:test";
import { buildWcMatchScrapeTargetsFromMatches } from "./_scrapeSchedule.js";

test("buildWcMatchScrapeTargetsFromMatches emits wc_match_bundle with live 90s interval", async () => {
  const nowMs = Date.parse("2026-06-10T18:00:00Z");
  const matches = [
    { id: "live1", status: "live", commenceTs: nowMs - 3600000, homeTeam: "MEX", awayTeam: "RSA", date: "2026-06-11" },
    { id: "u1", status: "NS", commenceTs: nowMs + 3600000, homeTeam: "USA", awayTeam: "PAR", date: "2026-06-12" },
    { id: "u2", status: "NS", commenceTs: nowMs + 7200000, homeTeam: "BRA", awayTeam: "MAR", date: "2026-06-12" },
    { id: "u3", status: "NS", commenceTs: nowMs + 10800000, homeTeam: "FRA", awayTeam: "SEN", date: "2026-06-13" },
    { id: "u4", status: "NS", commenceTs: nowMs + 14400000, homeTeam: "GER", awayTeam: "AUS", date: "2026-06-13" },
  ];

  const { bundle } = await buildWcMatchScrapeTargetsFromMatches(matches, nowMs);

  assert.equal(bundle.length, 5);
  assert.equal(bundle[0].sport, "wc_match_bundle");
  assert.equal(bundle[0].meta?.scrapeMode, "live");
  assert.equal(bundle[0].meta?.fixedIntervalMs, 90_000);
  assert.equal(bundle.filter((t) => t.meta?.scrapeMode === "ramp").length, 4);
  assert.ok(bundle.every((t) => t.sport === "wc_match_bundle"));
});
