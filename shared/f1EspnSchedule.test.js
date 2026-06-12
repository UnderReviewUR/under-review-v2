import test from "node:test";
import assert from "node:assert/strict";
import {
  F1_2026_VALID_RACES,
  buildScheduleFromEspnCalendar,
  canonicalMeetingNameFromEspnLabel,
  patchScheduleWithEspnCurrentEvent,
} from "./f1EspnSchedule.js";

test("canonicalMeetingNameFromEspnLabel maps sponsor labels", () => {
  assert.equal(
    canonicalMeetingNameFromEspnLabel("MSC Cruises Barcelona-Catalunya Grand Prix"),
    "Spanish Grand Prix",
  );
  assert.equal(
    canonicalMeetingNameFromEspnLabel("Tag Heuer Spanish Grand Prix"),
    "Spanish Grand Prix (Madrid)",
  );
  assert.equal(
    canonicalMeetingNameFromEspnLabel("Qatar Airways Australian Grand Prix"),
    "Australian Grand Prix",
  );
  assert.equal(canonicalMeetingNameFromEspnLabel("Monaco Grand Prix"), "Monaco Grand Prix");
});

test("buildScheduleFromEspnCalendar marks current Barcelona weekend", () => {
  const now = new Date("2026-06-12T16:00:00.000Z");
  const calendar = [
    {
      label: "MSC Cruises Barcelona-Catalunya Grand Prix",
      startDate: "2026-06-12T14:30Z",
      endDate: "2026-06-14T16:00Z",
      event: { $ref: "http://sports.core.api.espn.pvt/v2/sports/racing/leagues/f1/events/600057435" },
    },
    {
      label: "Lenovo Austrian Grand Prix",
      startDate: "2026-06-26T14:30Z",
      endDate: "2026-06-28T16:00Z",
      event: { $ref: "http://sports.core.api.espn.pvt/v2/sports/racing/leagues/f1/events/600057436" },
    },
  ];
  const currentEvent = {
    id: "600057435",
    name: "MSC Cruises Barcelona-Catalunya Grand Prix",
    circuit: {
      fullName: "Circuit de Barcelona-Catalunya",
      shortName: "Barcelona",
      address: { city: "Montmeló", country: "Spain" },
    },
    competitions: [{ type: { abbreviation: "Race" }, startDate: "2026-06-14T13:00:00.000Z" }],
  };

  const schedule = buildScheduleFromEspnCalendar({ calendar, currentEvent, now });

  assert.equal(schedule.scheduleSource, "espn");
  assert.equal(schedule.usingFallback, false);
  assert.equal(schedule.races.length, 2);
  const next = schedule.races.find((r) => r.is_next);
  assert.equal(next?.meeting_name, "Spanish Grand Prix");
  assert.equal(next?.circuitFullName, "Circuit de Barcelona-Catalunya");
  assert.equal(next?.race_start, "2026-06-14T13:00:00.000Z");
  assert.ok(F1_2026_VALID_RACES.has(String(next?.meeting_name)));
});

test("patchScheduleWithEspnCurrentEvent enriches OpenF1 next race", () => {
  const schedule = {
    races: [{ meeting_name: "Spanish Grand Prix", is_next: true, race_start: null }],
    upcoming: [],
    current: [],
  };
  const currentEvent = {
    circuit: { fullName: "Circuit de Barcelona-Catalunya", address: { city: "Montmeló" } },
    competitions: [{ type: { abbreviation: "Race" }, startDate: "2026-06-14T13:00:00.000Z" }],
  };

  const out = patchScheduleWithEspnCurrentEvent(schedule, currentEvent);
  assert.equal(out.races[0].circuitFullName, "Circuit de Barcelona-Catalunya");
  assert.equal(out.races[0].race_start, "2026-06-14T13:00:00.000Z");
});
