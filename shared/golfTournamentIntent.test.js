import test from "node:test";
import assert from "node:assert/strict";
import {
  alignGolfBoardSnapshotForQuestion,
  extractGolfTournamentIntentFromQuestion,
  findBestScheduleRowForIntent,
  golfCourseConflictsWithIntent,
  golfCurrentEventMatchesIntent,
  golfQuestionNeedsEventRealign,
} from "./golfTournamentIntent.js";

test("extractGolfTournamentIntentFromQuestion detects PGA Championship", () => {
  const intent = extractGolfTournamentIntentFromQuestion(
    "For PGA Championship this week, what is the single best betting angle?",
  );
  assert.equal(intent?.slug, "pga_championship");
  assert.equal(intent?.label, "PGA Championship");
});

test("golfQuestionNeedsEventRealign when feed week differs from question", () => {
  const board = {
    currentEvent: {
      name: "THE CJ CUP Byron Nelson",
      shortName: "Byron Nelson",
      course: "TPC Craig Ranch",
    },
    tourSchedule: [
      {
        name: "PGA Championship",
        shortName: "PGA Championship",
        courseName: "Valhalla Golf Club",
        status: "Upcoming",
        startDate: "2026-05-14",
      },
      {
        name: "THE CJ CUP Byron Nelson",
        shortName: "Byron Nelson",
        courseName: "TPC Craig Ranch",
        status: "Live",
      },
    ],
  };
  assert.equal(
    golfQuestionNeedsEventRealign(
      board,
      "For PGA Championship this week, best outright angle?",
    ),
    true,
  );
});

test("alignGolfBoardSnapshotForQuestion swaps to schedule major", () => {
  const board = {
    currentEvent: {
      name: "THE CJ CUP Byron Nelson",
      course: "TPC Craig Ranch",
      state: "in",
      leaderboard: [{ name: "Smalley", score: "-3" }],
    },
    tourSchedule: [
      {
        name: "PGA Championship",
        shortName: "PGA Championship",
        courseName: "Valhalla Golf Club",
        status: "Upcoming",
      },
    ],
  };
  const aligned = alignGolfBoardSnapshotForQuestion(
    board,
    "PGA Championship outright value?",
  );
  assert.equal(aligned.currentEvent.name, "PGA Championship");
  assert.match(String(aligned.currentEvent.course), /valhalla/i);
  assert.equal(aligned.currentEvent.state, "pre");
  assert.equal(aligned.currentEvent.leaderboard.length, 0);
  assert.equal(aligned.questionEventAlignment?.requestedLabel, "PGA Championship");
});

test("findBestScheduleRowForIntent prefers named major", () => {
  const intent = extractGolfTournamentIntentFromQuestion("Masters week picks");
  const row = findBestScheduleRowForIntent(
    [
      { name: "RBC Heritage", courseName: "Harbour Town" },
      { name: "Masters Tournament", courseName: "Augusta National Golf Club" },
    ],
    intent,
  );
  assert.match(String(row?.name), /masters/i);
});

test("golfCurrentEventMatchesIntent when names align", () => {
  const intent = extractGolfTournamentIntentFromQuestion("PGA Championship picks");
  assert.equal(
    golfCurrentEventMatchesIntent(
      { name: "PGA Championship", shortName: "PGA" },
      intent,
    ),
    true,
  );
});

test("golfCourseConflictsWithIntent blocks wrong venue on correct name", () => {
  const intent = extractGolfTournamentIntentFromQuestion("PGA Championship picks");
  assert.equal(golfCourseConflictsWithIntent("TPC Craig Ranch", intent), true);
  assert.equal(
    golfCurrentEventMatchesIntent(
      { name: "PGA Championship", course: "TPC Craig Ranch" },
      intent,
    ),
    false,
  );
  assert.equal(
    golfQuestionNeedsEventRealign(
      { currentEvent: { name: "PGA Championship", course: "TPC Craig Ranch" } },
      "PGA Championship picks",
    ),
    true,
  );
});

test("intent_only client align does not keep Byron Nelson course", () => {
  const board = {
    currentEvent: {
      name: "THE CJ CUP Byron Nelson",
      course: "TPC Craig Ranch",
      state: "in",
      leaderboard: [{ name: "Smalley" }],
    },
    tourSchedule: [],
  };
  const aligned = alignGolfBoardSnapshotForQuestion(
    board,
    "PGA Championship outright angle?",
  );
  assert.notEqual(aligned.currentEvent.course, "TPC Craig Ranch");
  assert.equal(aligned.currentEvent.course, "TBD");
});
