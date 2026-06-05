import test from "node:test";
import assert from "node:assert/strict";

import {
  isSundayGrandPrixRaceSession,
  extractGrandPrixRaceStartFromSessions,
  resolveF1RaceStart,
} from "./f1RaceStart.js";

// --- isSundayGrandPrixRaceSession ---

test("isSundayGrandPrixRaceSession returns true for Race session_name", () => {
  assert.equal(isSundayGrandPrixRaceSession({ session_name: "Race" }), true);
});

test("isSundayGrandPrixRaceSession returns false for Sprint", () => {
  assert.equal(isSundayGrandPrixRaceSession({ session_name: "Sprint" }), false);
});

test("isSundayGrandPrixRaceSession returns false for Practice", () => {
  assert.equal(isSundayGrandPrixRaceSession({ session_name: "Practice 1" }), false);
});

test("isSundayGrandPrixRaceSession returns false for Qualifying", () => {
  assert.equal(isSundayGrandPrixRaceSession({ session_name: "Qualifying" }), false);
});

test("isSundayGrandPrixRaceSession returns true for session_type Race with non-sprint name", () => {
  assert.equal(
    isSundayGrandPrixRaceSession({ session_name: "Grand Prix", session_type: "Race" }),
    true,
  );
});

test("isSundayGrandPrixRaceSession returns false for empty session_name with Race type", () => {
  assert.equal(
    isSundayGrandPrixRaceSession({ session_name: "", session_type: "Race" }),
    false,
  );
});

// --- extractGrandPrixRaceStartFromSessions ---

test("extractGrandPrixRaceStartFromSessions returns earliest race start", () => {
  const sessions = [
    { session_name: "Practice 1", date_start: "2025-06-13T10:00:00Z" },
    { session_name: "Race", date_start: "2025-06-15T14:00:00Z" },
    { session_name: "Qualifying", date_start: "2025-06-14T13:00:00Z" },
  ];
  assert.equal(extractGrandPrixRaceStartFromSessions(sessions), "2025-06-15T14:00:00Z");
});

test("extractGrandPrixRaceStartFromSessions returns null for no race sessions", () => {
  const sessions = [
    { session_name: "Practice 1", date_start: "2025-06-13T10:00:00Z" },
    { session_name: "Sprint", date_start: "2025-06-14T11:00:00Z" },
  ];
  assert.equal(extractGrandPrixRaceStartFromSessions(sessions), null);
});

test("extractGrandPrixRaceStartFromSessions returns null for empty array", () => {
  assert.equal(extractGrandPrixRaceStartFromSessions([]), null);
});

test("extractGrandPrixRaceStartFromSessions returns null for null", () => {
  assert.equal(extractGrandPrixRaceStartFromSessions(null), null);
});

// --- resolveF1RaceStart ---

test("resolveF1RaceStart returns race.race_start when present", () => {
  assert.equal(resolveF1RaceStart({ race_start: "2025-06-15T14:00:00Z" }), "2025-06-15T14:00:00Z");
});

test("resolveF1RaceStart falls back to sessions matching meeting_key", () => {
  const race = { meeting_key: 42 };
  const sessions = [
    { meeting_key: 42, session_name: "Race", date_start: "2025-06-15T14:00:00Z" },
    { meeting_key: 99, session_name: "Race", date_start: "2025-06-22T14:00:00Z" },
  ];
  assert.equal(resolveF1RaceStart(race, sessions), "2025-06-15T14:00:00Z");
});

test("resolveF1RaceStart returns null for null race", () => {
  assert.equal(resolveF1RaceStart(null), null);
});

test("resolveF1RaceStart returns null when no sessions match", () => {
  const race = { meeting_key: 42 };
  const sessions = [
    { meeting_key: 99, session_name: "Race", date_start: "2025-06-22T14:00:00Z" },
  ];
  assert.equal(resolveF1RaceStart(race, sessions), null);
});
