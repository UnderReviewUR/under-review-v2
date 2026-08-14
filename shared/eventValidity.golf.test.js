import assert from "node:assert/strict";
import test from "node:test";
import {
  EVENT_VALIDITY,
  classifyGolfEvent,
  coerceGolfInWeekFeedState,
  isGolfTournamentFinal,
  isGolfTournamentWeekStillOpen,
} from "./eventValidity.js";

const WYNDHAM_R1_NIGHT = Date.parse("2026-08-08T22:00:00-04:00");
const AFTER_SUNDAY = Date.parse("2026-08-12T10:00:00-04:00");

test("classifyGolfEvent: ESPN post after Round 1 is ACTIVE (not tournament final)", () => {
  const event = {
    id: "401",
    name: "Wyndham Championship",
    shortName: "Wyndham",
    state: "post",
    round: "Final",
    startDate: "2026-08-08T11:00:00Z",
    endDate: "2026-08-11",
  };
  assert.equal(classifyGolfEvent(event, WYNDHAM_R1_NIGHT), EVENT_VALIDITY.ACTIVE);
  assert.equal(isGolfTournamentFinal(event, WYNDHAM_R1_NIGHT), false);
  assert.equal(isGolfTournamentWeekStillOpen(event, WYNDHAM_R1_NIGHT), true);
});

test("classifyGolfEvent: post after end date is FINISHED", () => {
  const event = {
    id: "401",
    name: "Wyndham Championship",
    shortName: "Wyndham",
    state: "post",
    startDate: "2026-08-08T11:00:00Z",
    endDate: "2026-08-11",
  };
  assert.equal(classifyGolfEvent(event, AFTER_SUNDAY), EVENT_VALIDITY.FINISHED);
  assert.equal(isGolfTournamentFinal(event, AFTER_SUNDAY), true);
});

test("coerceGolfInWeekFeedState: post → in while week open", () => {
  const event = {
    id: "1",
    name: "Wyndham Championship",
    startDate: "2026-08-08T11:00:00Z",
    endDate: "2026-08-11",
  };
  assert.equal(coerceGolfInWeekFeedState("post", event, WYNDHAM_R1_NIGHT), "in");
  assert.equal(coerceGolfInWeekFeedState("post", event, AFTER_SUNDAY), "post");
});

test("classifyGolfEvent: start+4d fallback when endDate missing", () => {
  const event = {
    id: "2",
    name: "Wyndham Championship",
    state: "final",
    startDate: "2026-08-08T11:00:00Z",
  };
  assert.equal(classifyGolfEvent(event, WYNDHAM_R1_NIGHT), EVENT_VALIDITY.ACTIVE);
});
