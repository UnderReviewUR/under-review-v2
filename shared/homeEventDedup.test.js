import test from "node:test";
import assert from "node:assert/strict";

import {
  nbaEventKey,
  mlbEventKey,
  tennisEventKeyFromNormalized,
  tennisEventKeyFromBoardRow,
  f1EventKey,
  golfSnapshotKey,
  nflSnapshotBoardKey,
  parseAwayHomeFromLabel,
} from "./homeEventDedup.js";

// --- nbaEventKey ---

test("nbaEventKey returns nba:id for numeric BDL id", () => {
  const key = nbaEventKey({ id: "12345" });
  assert.equal(key, "nba:12345");
});

test("nbaEventKey falls back to team-based key when id is not numeric BDL", () => {
  const key = nbaEventKey({
    id: "espn-abc",
    awayTeam: { abbr: "BOS" },
    homeTeam: { abbr: "LAL" },
    startTimeSource: "espn",
  });
  assert.ok(key.startsWith("nba:BOS|LAL|"));
});

test("nbaEventKey returns null for null input", () => {
  assert.equal(nbaEventKey(null), null);
});

test("nbaEventKey returns null for non-object", () => {
  assert.equal(nbaEventKey("string"), null);
});

// --- mlbEventKey ---

test("mlbEventKey returns mlb:id when id exists", () => {
  assert.equal(mlbEventKey({ id: "456" }), "mlb:456");
});

test("mlbEventKey uses gamePk fallback", () => {
  assert.equal(mlbEventKey({ gamePk: "789" }), "mlb:789");
});

test("mlbEventKey falls back to team names", () => {
  const key = mlbEventKey({
    awayTeam: { abbr: "NYY" },
    homeTeam: { abbr: "BOS" },
  });
  assert.ok(key.startsWith("mlb:NYY|BOS|"));
});

test("mlbEventKey returns null for null", () => {
  assert.equal(mlbEventKey(null), null);
});

// --- tennisEventKeyFromNormalized ---

test("tennisEventKeyFromNormalized uses bdl_match_id", () => {
  assert.equal(
    tennisEventKeyFromNormalized({ raw: { bdl_match_id: "t-1" } }),
    "tennis:t-1",
  );
});

test("tennisEventKeyFromNormalized falls back to player names", () => {
  const key = tennisEventKeyFromNormalized({
    raw: { home: "Sinner", away: "Alcaraz", event_date: "2025-06-15" },
  });
  assert.equal(key, "tennis:Sinner|Alcaraz|2025-06-15");
});

test("tennisEventKeyFromNormalized returns null for null", () => {
  assert.equal(tennisEventKeyFromNormalized(null), null);
});

// --- tennisEventKeyFromBoardRow ---

test("tennisEventKeyFromBoardRow uses bdl_match_id", () => {
  assert.equal(tennisEventKeyFromBoardRow({ bdl_match_id: "t-2" }), "tennis:t-2");
});

test("tennisEventKeyFromBoardRow falls back to player names", () => {
  const key = tennisEventKeyFromBoardRow({
    home_team: "Player A",
    away_team: "Player B",
    event_date: "2025-01-01",
  });
  assert.equal(key, "tennis:Player A|Player B|2025-01-01");
});

test("tennisEventKeyFromBoardRow returns null for null", () => {
  assert.equal(tennisEventKeyFromBoardRow(null), null);
});

// --- f1EventKey ---

test("f1EventKey uses meeting_key", () => {
  assert.equal(f1EventKey({ meeting_key: 1234 }), "f1:1234");
});

test("f1EventKey falls back to meeting name", () => {
  assert.equal(f1EventKey({ name: "Monaco Grand Prix" }), "f1:Monaco Grand Prix");
});

test("f1EventKey returns null for null", () => {
  assert.equal(f1EventKey(null), null);
});

test("f1EventKey returns null for empty object", () => {
  assert.equal(f1EventKey({}), null);
});

// --- golfSnapshotKey ---

test("golfSnapshotKey uses currentEvent id", () => {
  assert.equal(golfSnapshotKey({ currentEvent: { id: "ev-1" } }), "golf:ev-1");
});

test("golfSnapshotKey falls back to event name", () => {
  assert.equal(
    golfSnapshotKey({ currentEvent: { shortName: "The Masters" } }),
    "golf:The Masters",
  );
});

test("golfSnapshotKey returns null for null", () => {
  assert.equal(golfSnapshotKey(null), null);
});

// --- nflSnapshotBoardKey ---

test("nflSnapshotBoardKey returns constant", () => {
  assert.equal(nflSnapshotBoardKey(), "nfl:weekly-props-board");
});

// --- parseAwayHomeFromLabel ---

test("parseAwayHomeFromLabel parses @ format", () => {
  const result = parseAwayHomeFromLabel("BOS @ LAL");
  assert.deepEqual(result, { away: "BOS", home: "LAL" });
});

test("parseAwayHomeFromLabel parses vs format", () => {
  const result = parseAwayHomeFromLabel("BOS vs LAL");
  assert.deepEqual(result, { away: "BOS", home: "LAL" });
});

test("parseAwayHomeFromLabel parses at format", () => {
  const result = parseAwayHomeFromLabel("BOS at LAL");
  assert.deepEqual(result, { away: "BOS", home: "LAL" });
});

test("parseAwayHomeFromLabel returns empty for unrecognized format", () => {
  assert.deepEqual(parseAwayHomeFromLabel("BOS LAL"), { away: "", home: "" });
});

test("parseAwayHomeFromLabel returns empty for null", () => {
  assert.deepEqual(parseAwayHomeFromLabel(null), { away: "", home: "" });
});

test("parseAwayHomeFromLabel returns empty for empty string", () => {
  assert.deepEqual(parseAwayHomeFromLabel(""), { away: "", home: "" });
});
