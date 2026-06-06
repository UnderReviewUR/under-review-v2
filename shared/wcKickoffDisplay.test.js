import test from "node:test";
import assert from "node:assert/strict";
import { formatWcKickoffDisplay, parseWcKickoffEtMs } from "./wcKickoffDisplay.js";

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
