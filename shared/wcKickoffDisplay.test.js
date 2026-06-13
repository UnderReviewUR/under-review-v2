import test from "node:test";
import assert from "node:assert/strict";
import {
  formatWcKickoffDisplay,
  parseWcKickoffEtMs,
  wcMatchEtDateYmd,
  wcMatchIsEarlyEtMorningKickoff,
  wcMatchOnEtBroadcastSlateDay,
} from "./wcKickoffDisplay.js";

test("parseWcKickoffEtMs — Mexico opener Jun 11 15:00 ET", () => {
  const ms = parseWcKickoffEtMs("2026-06-11", "15:00 ET");
  assert.ok(Number.isFinite(ms));
  const etHour = new Date(ms).toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  });
  assert.match(String(etHour), /15|3/);
});

test("parseWcKickoffEtMs — respects AM/PM", () => {
  const midnight = parseWcKickoffEtMs("2026-06-14", "12:00 AM ET");
  const elevenPm = parseWcKickoffEtMs("2026-06-13", "11:00 PM ET");
  assert.ok(Number.isFinite(midnight));
  assert.ok(Number.isFinite(elevenPm));
  assert.match(
    new Date(midnight).toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: true,
    }),
    /12.*AM/i,
  );
  assert.match(
    new Date(elevenPm).toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: true,
    }),
    /11.*PM/i,
  );
});

test("formatWcKickoffDisplay — uses commenceTs", () => {
  const text = formatWcKickoffDisplay({
    commenceTs: 1781204400000,
    date: "2026-06-11",
    time: "15:00 ET",
  });
  assert.match(text, /ET/);
});

test("formatWcKickoffDisplay — date/time fallback", () => {
  const text = formatWcKickoffDisplay({ date: "2026-06-11", time: "15:00 ET" });
  assert.ok(text.length > 0);
  assert.match(text, /ET/);
});

test("formatWcKickoffDisplay — after-midnight ET shows Central local time", () => {
  const ms = Date.parse("2026-06-14T04:00:00.000Z");
  const text = formatWcKickoffDisplay({
    commenceTs: ms,
    date: "2026-06-14",
    time: "12:00 AM ET",
  });
  assert.match(text, /12:00 AM ET/i);
  assert.match(text, /11:00 PM/i);
  assert.match(text, /CT|CDT|CST/);
});

test("wcMatchEtDateYmd — evening ET kickoff stays on slate day not UTC date", () => {
  const usaNinePmEt = Date.parse("2026-06-13T01:00:00.000Z");
  assert.equal(wcMatchEtDateYmd(usaNinePmEt), "2026-06-12");
});

test("wcMatchOnEtBroadcastSlateDay — midnight ET counts on prior evening slate", () => {
  const ms = Date.parse("2026-06-14T04:00:00.000Z");
  const match = {
    homeTeam: "HAI",
    awayTeam: "SCO",
    date: "2026-06-14",
    time: "12:00 AM ET",
    commenceTs: ms,
    status: "NS",
  };
  assert.ok(wcMatchIsEarlyEtMorningKickoff(match));
  assert.ok(wcMatchOnEtBroadcastSlateDay(match, "2026-06-13"));
  assert.equal(wcMatchEtDateYmd(ms), "2026-06-14");
});
