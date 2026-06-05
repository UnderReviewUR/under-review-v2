import test from "node:test";
import assert from "node:assert/strict";

import {
  nbaGameHasVerifiedBoxScore,
  classifyNbaBoardGamePhase,
} from "./nbaBoardGamePhase.js";

// --- nbaGameHasVerifiedBoxScore ---

test("nbaGameHasVerifiedBoxScore returns true with numeric scores", () => {
  assert.equal(
    nbaGameHasVerifiedBoxScore({ homeTeam: { score: 105 }, awayTeam: { score: 98 } }),
    true,
  );
});

test("nbaGameHasVerifiedBoxScore returns true with string numeric scores", () => {
  assert.equal(
    nbaGameHasVerifiedBoxScore({ homeTeam: { score: "102" }, awayTeam: { score: "99" } }),
    true,
  );
});

test("nbaGameHasVerifiedBoxScore returns false when scores are null", () => {
  assert.equal(
    nbaGameHasVerifiedBoxScore({ homeTeam: { score: null }, awayTeam: { score: null } }),
    false,
  );
});

test("nbaGameHasVerifiedBoxScore returns false for null game", () => {
  assert.equal(nbaGameHasVerifiedBoxScore(null), false);
});

test("nbaGameHasVerifiedBoxScore returns false for non-object", () => {
  assert.equal(nbaGameHasVerifiedBoxScore("string"), false);
});

test("nbaGameHasVerifiedBoxScore returns false when only home score exists", () => {
  assert.equal(nbaGameHasVerifiedBoxScore({ homeTeam: { score: 50 } }), false);
});

// --- classifyNbaBoardGamePhase ---

test("classifyNbaBoardGamePhase returns final for state=post", () => {
  assert.equal(classifyNbaBoardGamePhase({ state: "post" }), "final");
});

test("classifyNbaBoardGamePhase returns final for status with Final", () => {
  assert.equal(classifyNbaBoardGamePhase({ state: "", status: "Final" }), "final");
});

test("classifyNbaBoardGamePhase returns pregame for state=pre", () => {
  assert.equal(classifyNbaBoardGamePhase({ state: "pre" }), "pregame");
});

test("classifyNbaBoardGamePhase returns live for state=in with valid box score and period", () => {
  assert.equal(
    classifyNbaBoardGamePhase({
      state: "in",
      period: 2,
      homeTeam: { score: 48 },
      awayTeam: { score: 52 },
    }),
    "live",
  );
});

test("classifyNbaBoardGamePhase returns halftime for state=in with halftime status", () => {
  assert.equal(
    classifyNbaBoardGamePhase({
      state: "in",
      status: "Halftime",
      homeTeam: { score: 55 },
      awayTeam: { score: 50 },
    }),
    "halftime",
  );
});

test("classifyNbaBoardGamePhase returns unknown for state=in without box score", () => {
  assert.equal(classifyNbaBoardGamePhase({ state: "in" }), "unknown");
});

test("classifyNbaBoardGamePhase returns unknown for null", () => {
  assert.equal(classifyNbaBoardGamePhase(null), "unknown");
});

test("classifyNbaBoardGamePhase returns unknown for empty object", () => {
  assert.equal(classifyNbaBoardGamePhase({}), "unknown");
});
