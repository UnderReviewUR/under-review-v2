import assert from "node:assert/strict";
import test from "node:test";
import { buildNflSlateTakes, nflFavoritePoint, nflGameMatchup } from "./nflSlateTakes.js";

function game(partial) {
  return {
    providerGameId: partial.providerGameId ?? 1,
    awayAbbr: "DET",
    homeAbbr: "CIN",
    status: "scheduled",
    seasonType: "preseason",
    ...partial,
  };
}

test("nflGameMatchup and favorite point read the posted spread", () => {
  const g = game({
    spread: {
      favoriteAbbr: "CIN",
      homePoint: -6.5,
      awayPoint: 6.5,
      displayLine: "CIN -6.5",
      homeImpliedDevig: 0.58,
      awayImpliedDevig: 0.42,
    },
  });
  assert.equal(nflGameMatchup(g), "DET @ CIN");
  assert.equal(nflFavoritePoint(g), -6.5);
});

test("buildNflSlateTakes returns play / pass / watch with extra locked rows", () => {
  const slate = [
    game({
      providerGameId: 1,
      awayAbbr: "DET",
      homeAbbr: "CIN",
      spread: {
        favoriteAbbr: "CIN",
        homePoint: -6.5,
        awayPoint: 6.5,
        displayLine: "CIN -6.5",
        homeImpliedDevig: 0.59,
        awayImpliedDevig: 0.41,
      },
      total: { line: 37.5, overImpliedDevig: 0.48, underImpliedDevig: 0.52 },
    }),
    game({
      providerGameId: 2,
      awayAbbr: "PHI",
      homeAbbr: "BAL",
      spread: {
        favoriteAbbr: "BAL",
        homePoint: -10.5,
        awayPoint: 10.5,
        displayLine: "BAL -10.5",
        homeImpliedDevig: 0.68,
        awayImpliedDevig: 0.32,
      },
      total: { line: 34.5, overImpliedDevig: 0.5, underImpliedDevig: 0.5 },
    }),
    game({
      providerGameId: 3,
      awayAbbr: "GB",
      homeAbbr: "IND",
      spread: {
        favoriteAbbr: "GB",
        homePoint: 3,
        awayPoint: -3,
        displayLine: "GB -3",
        homeImpliedDevig: 0.47,
        awayImpliedDevig: 0.53,
      },
      total: { line: 41.5, overImpliedDevig: 0.49, underImpliedDevig: 0.51 },
    }),
  ];

  const card = buildNflSlateTakes(slate, { nowMs: Date.parse("2026-08-13T20:00:00-04:00") });
  assert.equal(card.ok, true);
  assert.equal(card.preseason, true);
  assert.equal(card.kicker, "NFL · Preseason slate");
  assert.equal(card.title, "On this board");
  assert.match(card.subtitle, /Three reads/);
  assert.deepEqual(
    card.lanes.map((l) => l.kind),
    ["play", "pass", "watch"],
  );
  assert.ok(card.lanes.every((l) => !l.label), "no THE PLAY / PASS / WATCH stamps");
  assert.match(card.lanes[0].lean, /Don't bet these sides until inactives/);
  assert.match(card.lanes[0].why, /Preseason/);
  assert.doesNotMatch(card.lanes[0].lean, /CIN -6\.5/);
  assert.match(card.lanes[1].lean, /Don't lay BAL/);
  assert.match(card.lanes[2].lean, /GB -3/);
  assert.doesNotMatch(card.lanes[2].lean, /Watch|THE WATCH/i);
  assert.ok(card.extra.length >= 1);
  assert.ok(card.extra.every((row) => row.lean && row.why));
  assert.equal(
    new Set(card.lanes.map((l) => l.kind)).size,
    3,
    "three distinct jobs",
  );
});

test("single-game slate still fills three jobs from one board", () => {
  const card = buildNflSlateTakes([
    game({
      spread: {
        favoriteAbbr: "KC",
        homeAbbr: "KC",
        homePoint: -3,
        awayPoint: 3,
        displayLine: "KC -3",
        homeImpliedDevig: 0.55,
        awayImpliedDevig: 0.45,
      },
      total: { line: 44.5, overImpliedDevig: 0.51, underImpliedDevig: 0.49 },
      awayAbbr: "CHI",
      homeAbbr: "KC",
    }),
  ]);
  assert.equal(card.lanes.length, 3);
  assert.equal(card.lanes[0].kind, "play");
  assert.equal(card.lanes[1].kind, "pass");
  assert.equal(card.lanes[2].kind, "watch");
  assert.ok(card.extra.some((row) => row.kind === "extra-total"));
});

test("empty or final-only boards return null", () => {
  assert.equal(buildNflSlateTakes([]), null);
  assert.equal(
    buildNflSlateTakes([
      game({
        status: "final",
        spread: { favoriteAbbr: "CIN", homePoint: -3, awayPoint: 3, displayLine: "CIN -3" },
      }),
    ]),
    null,
  );
});

test("regular season hangs the posted favorite as the first take, not THE PLAY", () => {
  const card = buildNflSlateTakes(
    [
      game({
        seasonType: "regular",
        spread: {
          favoriteAbbr: "CIN",
          homePoint: -6.5,
          awayPoint: 6.5,
          displayLine: "CIN -6.5",
          homeImpliedDevig: 0.59,
          awayImpliedDevig: 0.41,
        },
        total: { line: 37.5, overImpliedDevig: 0.48, underImpliedDevig: 0.52 },
      }),
    ],
    { nowMs: Date.parse("2026-09-13T17:00:00.000Z") },
  );
  assert.equal(card.preseason, false);
  assert.equal(card.kicker, "Tonight");
  assert.match(card.lanes[0].lean, /CIN -6\.5/);
  assert.equal(card.lanes[0].label, "");
});
