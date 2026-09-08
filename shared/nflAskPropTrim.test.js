import assert from "node:assert/strict";
import test from "node:test";
import {
  nflGameIdsFromGames,
  pickNflGamesForScope,
  trimNflPlayerPropsForAsk,
} from "./nflAskPropTrim.js";

test("pickNflGamesForScope returns NE @ SEA matchup", () => {
  const games = [
    { awayAbbr: "NE", homeAbbr: "SEA", providerGameId: 1 },
    { awayAbbr: "KC", homeAbbr: "BUF", providerGameId: 2 },
  ];
  const picked = pickNflGamesForScope(games, new Set(["NE", "SEA"]));
  assert.equal(picked.length, 1);
  assert.equal(picked[0].providerGameId, 1);
});

test("trimNflPlayerPropsForAsk prioritizes named player", () => {
  const props = [
    { game: "NE @ SEA", player: "Drake Maye", prop: "passing tds", propRaw: "passing_tds", line: 1.5 },
    { game: "NE @ SEA", player: "Other Guy", prop: "rush yds", propRaw: "rushing_yards", line: 40.5 },
    { game: "KC @ BUF", player: "Mahomes", prop: "pass yds", propRaw: "passing_yards", line: 275.5 },
  ];
  const out = trimNflPlayerPropsForAsk(props, {
    scope: new Set(["NE", "SEA"]),
    question: "Maye 1.5 passing TDs",
    maxRows: 10,
  });
  assert.equal(out.length, 2);
  assert.equal(out[0].player, "Drake Maye");
  assert.equal(out[0].propRaw, "passing_tds");
});

test("trimNflPlayerPropsForAsk prefers asked market over milestone yards spam", () => {
  const props = [
    {
      game: "NE @ SEA",
      player: "Drake Maye",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 15,
      marketType: "milestone",
      overOdds: -200,
    },
    {
      game: "NE @ SEA",
      player: "Drake Maye",
      prop: "passing tds",
      propRaw: "passing_tds",
      line: 1.5,
      overOdds: -110,
      underOdds: -110,
    },
  ];
  const out = trimNflPlayerPropsForAsk(props, {
    scope: ["NE", "SEA"],
    question: "Drake Maye over 1.5 passing TDs?",
    maxRows: 1,
  });
  assert.equal(out[0].propRaw, "passing_tds");
});

test("pickNflGamesForScope aliases LA to LAR", () => {
  const picked = pickNflGamesForScope(
    [{ awayAbbr: "SF", homeAbbr: "LAR", providerGameId: 7 }],
    ["LA", "SF"],
  );
  assert.equal(picked[0].providerGameId, 7);
});

test("nflGameIdsFromGames", () => {
  assert.deepEqual(nflGameIdsFromGames([{ providerGameId: 9 }, { providerGameId: null }]), [9]);
});
