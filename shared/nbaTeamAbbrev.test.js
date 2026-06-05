import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTeamAbbr, normalizeNbaSideToken } from "./nbaTeamAbbrev.js";

// --- normalizeTeamAbbr ---

test("normalizeTeamAbbr maps full team names", () => {
  assert.equal(normalizeTeamAbbr("Boston Celtics"), "BOS");
  assert.equal(normalizeTeamAbbr("Los Angeles Lakers"), "LAL");
  assert.equal(normalizeTeamAbbr("Golden State Warriors"), "GSW");
});

test("normalizeTeamAbbr maps LA Clippers and Los Angeles Clippers", () => {
  assert.equal(normalizeTeamAbbr("LA Clippers"), "LAC");
  assert.equal(normalizeTeamAbbr("Los Angeles Clippers"), "LAC");
});

test("normalizeTeamAbbr returns UNK for falsy input", () => {
  assert.equal(normalizeTeamAbbr(null), "UNK");
  assert.equal(normalizeTeamAbbr(""), "UNK");
  assert.equal(normalizeTeamAbbr(undefined), "UNK");
});

test("normalizeTeamAbbr falls back to last word slice for unknown name", () => {
  const result = normalizeTeamAbbr("Some Unknown Team");
  assert.equal(result, "TEA");
});

// --- normalizeNbaSideToken ---

test("normalizeNbaSideToken returns abbr when valid", () => {
  assert.equal(normalizeNbaSideToken({ abbr: "BOS" }), "BOS");
  assert.equal(normalizeNbaSideToken({ abbr: "lal" }), "LAL");
});

test("normalizeNbaSideToken strips dots from abbreviation", () => {
  assert.equal(normalizeNbaSideToken({ abbr: "L.A.C" }), "LAC");
});

test("normalizeNbaSideToken falls back to name lookup", () => {
  assert.equal(normalizeNbaSideToken({ name: "Boston Celtics" }), "BOS");
});

test("normalizeNbaSideToken returns empty for null/undefined", () => {
  assert.equal(normalizeNbaSideToken(null), "");
  assert.equal(normalizeNbaSideToken(undefined), "");
});

test("normalizeNbaSideToken returns empty for non-object", () => {
  assert.equal(normalizeNbaSideToken("string"), "");
});

test("normalizeNbaSideToken skips UNK abbreviation", () => {
  assert.equal(normalizeNbaSideToken({ abbr: "UNK" }), "");
});

test("normalizeNbaSideToken skips ? abbreviation", () => {
  assert.equal(normalizeNbaSideToken({ abbr: "?" }), "");
});
