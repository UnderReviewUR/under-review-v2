import test from "node:test";
import assert from "node:assert/strict";

import { resolveMlbDecisionMode } from "./ur-take.js";

const gNyyBos = {
  awayTeam: { name: "New York Yankees", abbr: "NYY" },
  homeTeam: { name: "Boston Red Sox", abbr: "BOS" },
};

const gLadSf = {
  awayTeam: { name: "Los Angeles Dodgers", abbr: "LAD" },
  homeTeam: { name: "San Francisco Giants", abbr: "SF" },
};

test("resolveMlbDecisionMode: no_data when games, props, and totals are all absent", () => {
  assert.equal(resolveMlbDecisionMode({}, "any question"), "no_data");
  assert.equal(resolveMlbDecisionMode({ games: [], propLines: [], gameTotals: {} }, ""), "no_data");
});

test("resolveMlbDecisionMode: generic board ask + unrelated slate props → pre_market_framework", () => {
  assert.equal(
    resolveMlbDecisionMode(
      { propLines: [{ player: "Someone", propRaw: "pitcher_strikeouts" }] },
      "Best MLB look tonight?",
    ),
    "pre_market_framework",
  );
});

test("resolveMlbDecisionMode: relevant player + relevant market in propLines → actionable", () => {
  assert.equal(
    resolveMlbDecisionMode(
      {
        games: [gNyyBos],
        propLines: [
          {
            game: "New York Yankees @ Boston Red Sox",
            player: "Gerrit Cole",
            prop: "strikeouts",
            propRaw: "pitcher_strikeouts",
            line: 6.5,
          },
        ],
      },
      "Is Gerrit Cole strikeouts over a good play tonight?",
    ),
    "actionable",
  );
});

test("resolveMlbDecisionMode: player has props but requested market missing → pre_market_framework", () => {
  assert.equal(
    resolveMlbDecisionMode(
      {
        games: [gLadSf],
        propLines: [
          {
            game: "Los Angeles Dodgers @ San Francisco Giants",
            player: "Shohei Ohtani",
            propRaw: "batter_home_runs",
            prop: "home runs",
          },
        ],
      },
      "Ohtani TB?",
    ),
    "pre_market_framework",
  );
});

test("resolveMlbDecisionMode: props on slate but not for asked player → pre_market_framework", () => {
  assert.equal(
    resolveMlbDecisionMode(
      {
        games: [gLadSf],
        propLines: [
          {
            game: "Los Angeles Dodgers @ San Francisco Giants",
            player: "Mookie Betts",
            propRaw: "batter_hits",
          },
        ],
      },
      "Shohei Ohtani strikeout prop — over or under?",
    ),
    "pre_market_framework",
  );
});

test("resolveMlbDecisionMode: game-level ask with props for that matchup → actionable", () => {
  assert.equal(
    resolveMlbDecisionMode(
      {
        games: [gLadSf],
        propLines: [
          {
            game: "Los Angeles Dodgers @ San Francisco Giants",
            player: "Mookie Betts",
            propRaw: "batter_hits",
          },
        ],
      },
      "Anything stand out for Dodgers vs Giants?",
    ),
    "actionable",
  );
});

test("resolveMlbDecisionMode: matchup props exist only elsewhere on slate → pre_market_framework", () => {
  assert.equal(
    resolveMlbDecisionMode(
      {
        games: [gNyyBos, gLadSf],
        propLines: [
          {
            game: "New York Yankees @ Boston Red Sox",
            player: "Aaron Judge",
            propRaw: "batter_home_runs",
          },
        ],
      },
      "Dodgers vs Giants — what is your lean?",
    ),
    "pre_market_framework",
  );
});

test("resolveMlbDecisionMode: game total wording + matching gameTotals key → actionable", () => {
  assert.equal(
    resolveMlbDecisionMode(
      {
        games: [gNyyBos],
        propLines: [],
        gameTotals: {
          "New York Yankees @ Boston Red Sox": { total: 8.5 },
        },
      },
      "NYY vs BOS game total over?",
    ),
    "actionable",
  );
});

test("resolveMlbDecisionMode: pre_market_framework when games exist but no props", () => {
  assert.equal(
    resolveMlbDecisionMode({ games: [{ homeTeam: {}, awayTeam: {} }] }, "Yankees tonight?"),
    "pre_market_framework",
  );
});

test("resolveMlbDecisionMode: pre_market_framework when only gameTotals (partial board)", () => {
  assert.equal(resolveMlbDecisionMode({ gameTotals: { "NYY@BOS": 9 } }, "Totals?"), "pre_market_framework");
});
