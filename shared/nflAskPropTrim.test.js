import assert from "node:assert/strict";
import test from "node:test";
import {
  nflGameIdsFromGames,
  pickNflGamesForScope,
  pickNflPropsBoardTickets,
  filterNflPropsForMatchup,
  buildNflPlayerTeamIndex,
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

test("pickNflPropsBoardTickets drops off-matchup players and duplicate Maye yards", () => {
  const props = [
    {
      game: "NE @ SEA",
      player: "Drake Maye",
      team: "NE",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 260.5,
      book: "draftkings",
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "NE @ SEA",
      player: "Drake Maye",
      team: "NE",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 232.5,
      book: "draftkings",
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "NE @ SEA",
      player: "Sam Darnold",
      team: "MIN",
      prop: "passing tds",
      propRaw: "passing_tds",
      line: 1.5,
      book: "draftkings",
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "NE @ SEA",
      player: "Jaxon Smith-Njigba",
      team: "SEA",
      prop: "receiving yards",
      propRaw: "receiving_yards",
      line: 75.5,
      book: "fanduel",
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
  ];
  const out = pickNflPropsBoardTickets(props, {
    scope: new Set(["NE", "SEA"]),
    eventIds: ["1"],
    rosterNames: ["Drake Maye", "Jaxon Smith-Njigba", "Geno Smith"],
    question: "Best player props for patriots vs Seahawks?",
    maxTickets: 4,
  });
  assert.ok(out.every((p) => p.player !== "Sam Darnold"));
  assert.equal(out.filter((p) => p.player === "Drake Maye").length, 1);
  assert.equal(out[0].line, 260.5);
  assert.ok(out.some((p) => p.player === "Jaxon Smith-Njigba"));
});

test("filterNflPropsForMatchup drops PHI Brown and unknown draft RB", () => {
  const teamIndex = buildNflPlayerTeamIndex([
    { name: "Drake Maye", team: "NE" },
    { name: "Jaxon Smith-Njigba", team: "SEA" },
    { name: "Cooper Kupp", team: "SEA" },
    { name: "A.J. Brown", team: "PHI" },
    { name: "TreVeyon Henderson", team: "NE" },
  ]);
  const props = [
    { player: "Drake Maye", line: 234.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "A.J. Brown", line: 62.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "Jadarian Price", line: 51.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "Jaxon Smith-Njigba", line: 81.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "Cooper Kupp", line: 29.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
  ];
  const out = filterNflPropsForMatchup(props, {
    scope: new Set(["NE", "SEA"]),
    rosterNames: Object.keys(teamIndex).filter((k) => ["NE", "SEA"].includes(teamIndex[k])),
    playerTeamByName: teamIndex,
  });
  const names = out.map((p) => p.player);
  assert.ok(names.includes("Drake Maye"));
  assert.ok(names.includes("Jaxon Smith-Njigba"));
  assert.ok(!names.includes("A.J. Brown"));
  assert.ok(!names.includes("Jadarian Price"));
});
