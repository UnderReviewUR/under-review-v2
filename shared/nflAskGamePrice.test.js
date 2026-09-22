import assert from "node:assert/strict";
import test from "node:test";
import { buildNflGamePriceTake } from "./nflAskGamePrice.js";
import { buildNflPropsBoardFallbackTake } from "./nflAskGuard.js";
import { selectNflWeekContainingMatchup } from "./nflAskPropTrim.js";

const NYJ = {
  providerGameId: 1392251,
  awayAbbr: "NYJ",
  homeAbbr: "DET",
  total: { line: 47.5, overOdds: -115, underOdds: -105 },
  spread: { displayLine: "DET -6.5", favoriteAbbr: "DET", favoritePoint: 6.5 },
};

const KC = {
  providerGameId: 99,
  awayAbbr: "KC",
  homeAbbr: "BUF",
  total: { line: 51.5, overOdds: -110, underOdds: -110 },
  spread: { displayLine: "BUF -2.5" },
};

const SCORING = {
  league: {
    teamDefense: {
      NYJ: { ptsScored: 20, livePtsAllowed: 15, gamesPlayed: 2 },
      DET: { ptsScored: 31, livePtsAllowed: 35.5, gamesPlayed: 2 },
      KC: { ptsScored: 16, livePtsAllowed: 16, gamesPlayed: 2 },
      BUF: { ptsScored: 16, livePtsAllowed: 16, gamesPlayed: 2 },
    },
  },
};

test("GOAT scoring rates lean the total when the blend is two points off", () => {
  const take = buildNflGamePriceTake({
    question: "On NYJ @ DET, the total is 47.5. Over, under, or pass? Give me the lean.",
    games: [NYJ],
    briefcase: SCORING,
  });
  assert.equal(take.call, "OVER 47.5");
  assert.match(take.lean, /Over 47\.5/);
  assert.match(take.whyNow, /50\.8/);
  assert.match(take.whyNow, /-115/);
  assert.doesNotMatch(`${take.lean} ${take.call} ${take.whyNow}`, /wait for props/i);
});

test("a quieter matchup leans under the same way", () => {
  const take = buildNflGamePriceTake({
    question: "On KC @ BUF, the total is 51.5. Over, under, or pass?",
    games: [KC],
    briefcase: SCORING,
  });
  assert.equal(take.call, "UNDER 51.5");
  assert.match(take.lean, /Under 51\.5/);
  assert.doesNotMatch(take.lean, /NYJ|47\.5/);
});

test("a posted total with no scoring rates stays a pass, not a props watch list", () => {
  const take = buildNflGamePriceTake({
    question: "On NYJ @ DET, the total is 47.5. Over, under, or pass? Give me the lean.",
    games: [NYJ, KC],
  });
  assert.equal(take.call, "PASS");
  assert.match(take.lean, /Pass on 47\.5/);
  assert.match(take.whyNow, /Over -115, under -105/);
  assert.doesNotMatch(`${take.lean} ${take.whyNow} ${take.call}`, /wait for props/i);
});

test("the same rule holds for a different matchup", () => {
  const take = buildNflGamePriceTake({
    question: "On KC @ BUF, the total is 51.5. Over, under, or pass?",
    games: [NYJ, KC],
  });
  assert.match(take.lean, /Pass on 51\.5/);
  assert.match(take.whyNow, /KC @ BUF|51\.5/);
  assert.doesNotMatch(take.lean, /NYJ|47\.5/);
});

test("a spread ask uses the posted spread", () => {
  const take = buildNflGamePriceTake({
    question: "On NYJ @ DET, the spread is 6.5. Who covers?",
    games: [NYJ],
  });
  assert.match(take.lean, /Pass on DET -6\.5/);
  assert.doesNotMatch(take.call, /WAIT FOR PROPS/);
});

test("props-board fallback does not hijack a total", () => {
  const take = buildNflPropsBoardFallbackTake({
    question: "On NYJ @ DET, the total is 47.5. Over, under, or pass? Give me the lean.",
    games: [NYJ],
    propLines: [],
  });
  assert.equal(take.call, "PASS");
  assert.match(take.lean, /47\.5/);
  assert.doesNotMatch(take.lean, /Wait for props/i);
});

test("a named matchup walks forward to the week that has both teams", () => {
  const chosen = selectNflWeekContainingMatchup(
    [
      {
        week: 2,
        games: [
          { awayAbbr: "DET", homeAbbr: "BUF" },
          { awayAbbr: "GB", homeAbbr: "NYJ" },
        ],
      },
      {
        week: 3,
        games: [{ awayAbbr: "NYJ", homeAbbr: "DET" }],
      },
    ],
    ["NYJ", "DET"],
  );
  assert.equal(chosen.week, 3);
});
