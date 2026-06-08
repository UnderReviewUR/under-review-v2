import assert from "node:assert/strict";
import test from "node:test";
import {
  abbrForOpenFootballTeam,
  normalizeOpenFootballMatch,
  normalizeOpenFootballSchedule,
  parseOpenFootballKickoffUtc,
  validateEspnScheduleAgainstOpenFootball,
} from "./wcOpenFootballSchedule.js";

test("abbrForOpenFootballTeam resolves aliases and placeholders", () => {
  assert.equal(abbrForOpenFootballTeam("Czech Republic"), "CZE");
  assert.equal(abbrForOpenFootballTeam("Bosnia & Herzegovina"), "BIH");
  assert.equal(abbrForOpenFootballTeam("Turkey"), "TUR");
  assert.equal(abbrForOpenFootballTeam("Mexico"), "MEX");
  assert.equal(abbrForOpenFootballTeam("2A"), "2A");
  assert.equal(abbrForOpenFootballTeam("3A/B/C/D/F"), "3A/B/C/D/F");
  assert.equal(abbrForOpenFootballTeam("W74"), "W74");
});

test("parseOpenFootballKickoffUtc converts UTC offset to epoch", () => {
  const ts = parseOpenFootballKickoffUtc("2026-06-11", "13:00 UTC-6");
  assert.equal(ts, Date.parse("2026-06-11T19:00:00.000Z"));
});

test("normalizeOpenFootballSchedule parses group + knockout rows", () => {
  const matches = normalizeOpenFootballSchedule({
    matches: [
      {
        round: "Matchday 1",
        num: 1,
        date: "2026-06-11",
        time: "13:00 UTC-6",
        team1: "Mexico",
        team2: "South Africa",
        group: "Group A",
        ground: "Mexico City",
      },
      {
        round: "Round of 32",
        num: 73,
        date: "2026-06-28",
        time: "12:00 UTC-7",
        team1: "2A",
        team2: "2B",
        ground: "Los Angeles (Inglewood)",
      },
    ],
  });

  assert.equal(matches.length, 2);
  assert.equal(matches[0].id, "of-1");
  assert.equal(matches[0].homeTeam, "MEX");
  assert.equal(matches[0].awayTeam, "RSA");
  assert.equal(matches[0].group, "A");
  assert.equal(matches[1].homeTeam, "2A");
  assert.equal(matches[1].awayTeam, "2B");
  assert.equal(matches[1].group, "");
});

test("validateEspnScheduleAgainstOpenFootball flags drift", () => {
  const openFootball = normalizeOpenFootballSchedule({
    matches: [
      {
        date: "2026-06-11",
        time: "13:00 UTC-6",
        team1: "Mexico",
        team2: "South Africa",
        group: "Group A",
        round: "Matchday 1",
      },
      {
        date: "2026-06-12",
        time: "06:00 UTC-6",
        team1: "South Korea",
        team2: "Czech Republic",
        group: "Group A",
        round: "Matchday 1",
      },
    ],
  });

  const espn = [
    {
      id: "espn-1",
      date: "2026-06-11",
      homeTeam: "MEX",
      awayTeam: "RSA",
      group: "A",
      commenceTs: Date.parse("2026-06-11T19:00:00.000Z"),
    },
    {
      id: "espn-2",
      date: "2026-06-12",
      homeTeam: "CZE",
      awayTeam: "KOR",
      group: "A",
      commenceTs: Date.parse("2026-06-12T02:00:00.000Z"),
    },
  ];

  const report = validateEspnScheduleAgainstOpenFootball(espn, openFootball);
  assert.equal(report.matched, 2);
  assert.equal(report.mismatchCount, 0);
  assert.equal(report.ok, false);
});
