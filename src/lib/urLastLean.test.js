import test from "node:test";
import assert from "node:assert/strict";
import {
  UR_LAST_LEAN_KEY,
  UR_LAST_LEAN_TTL_MS,
  formatLastLeanTimeAgo,
  readUrLastLean,
  resolveMatchupLabelForLastLean,
  saveUrLastLean,
} from "./urLastLean.js";

const storage = new Map();

test("saveUrLastLean and readUrLastLean round-trip", () => {
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  storage.clear();
  const ok = saveUrLastLean({
    lean: "Lean: Brunson O29.5. CLE perimeter is thin.",
    sport: "NBA",
    matchup: "CLE @ NYK",
    question: "Brunson points?",
  });
  assert.equal(ok, true);
  const row = readUrLastLean();
  assert.ok(row);
  assert.match(row.lean, /^Lean:/);
  assert.equal(row.sport, "NBA");
  assert.equal(row.matchup, "CLE @ NYK");
  globalThis.localStorage = prev;
  storage.delete(UR_LAST_LEAN_KEY);
});

test("readUrLastLean drops expired rows", () => {
  const expired = readUrLastLean({
    lean: "Lean: Pass.",
    sport: "NBA",
    matchup: "CLE @ NYK",
    question: "x",
    ts: Date.now() - UR_LAST_LEAN_TTL_MS - 1000,
  });
  assert.equal(expired, null);
});

test("resolveMatchupLabelForLastLean uses matchup context abbrevs", () => {
  const label = resolveMatchupLabelForLastLean({
    matchupContext: { awayAbbr: "CLE", homeAbbr: "NYK" },
    sportHint: "nba",
  });
  assert.equal(label, "CLE @ NYK");
});

test("formatLastLeanTimeAgo", () => {
  const twoHours = formatLastLeanTimeAgo(Date.now() - 2 * 60 * 60 * 1000);
  assert.match(twoHours, /h ago/);
});
