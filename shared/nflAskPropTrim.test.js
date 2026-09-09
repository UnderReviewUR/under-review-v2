import assert from "node:assert/strict";
import test from "node:test";
import {
  nflGameIdsFromGames,
  pickNflGamesForScope,
  pickNflPropsBoardTickets,
  filterNflPropsForMatchup,
  buildNflPlayerTeamIndex,
  mergeNflPlayerTeamIndexesPreferLast,
  mergeNflRostersByTeamPreferLast,
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

test("pickNflPropsBoardTickets prefers full-game rush yards over 1H", () => {
  const props = [
    {
      game: "NE @ SEA",
      player: "Drake Maye",
      team: "NE",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 261.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "NE @ SEA",
      player: "Rhamondre Stevenson",
      team: "NE",
      prop: "rushing yards 1h",
      propRaw: "rushing_yards_1h",
      line: 27.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "NE @ SEA",
      player: "Rhamondre Stevenson",
      team: "NE",
      prop: "rushing yards",
      propRaw: "rushing_yards",
      line: 56.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
  ];
  const out = pickNflPropsBoardTickets(props, {
    scope: ["NE", "SEA"],
    eventIds: ["1"],
    rosterNames: ["Drake Maye", "Rhamondre Stevenson"],
    question: "player props for the game tonight?",
    maxTickets: 5,
  });
  const stevenson = out.filter((p) => /stevenson/i.test(String(p.player)));
  assert.equal(stevenson.length, 1);
  assert.equal(stevenson[0].line, 56.5);
  assert.doesNotMatch(String(stevenson[0].prop), /1h/i);
});

test("filterNflPropsForMatchup drops PHI-indexed Brown and unknown no-roster RB", () => {
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

test("filterNflPropsForMatchup keeps BDL NE Brown and slate roster Price", () => {
  const teamIndex = buildNflPlayerTeamIndex([
    { name: "Drake Maye", team: "NE" },
    { name: "A.J. Brown", team: "NE" },
    { name: "Jadarian Price", team: "SEA" },
    { name: "Jaxon Smith-Njigba", team: "SEA" },
  ]);
  const props = [
    { player: "Drake Maye", line: 234.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "A.J. Brown", line: 62.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "Jadarian Price", line: 51.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
    { player: "Jaxon Smith-Njigba", line: 81.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" },
  ];
  const out = filterNflPropsForMatchup(props, {
    scope: new Set(["NE", "SEA"]),
    rosterNames: ["Drake Maye", "A.J. Brown", "Jadarian Price", "Jaxon Smith-Njigba"],
    playerTeamByName: teamIndex,
  });
  const names = out.map((p) => p.player);
  assert.ok(names.includes("A.J. Brown"));
  assert.ok(names.includes("Jadarian Price"));
  assert.ok(names.includes("Drake Maye"));
});

test("BDL team index wins over stale static PHI for A.J. Brown", () => {
  const staticIdx = buildNflPlayerTeamIndex([{ name: "A.J. Brown", team: "PHI" }]);
  const bdlIdx = buildNflPlayerTeamIndex([{ name: "A.J. Brown", team: "NE" }]);
  const merged = mergeNflPlayerTeamIndexesPreferLast(staticIdx, bdlIdx);
  assert.equal(merged["aj brown"], "NE");
  const out = filterNflPropsForMatchup(
    [{ player: "AJ Brown", line: 62.5, overOdds: -110, underOdds: -110, game: "NE @ SEA" }],
    {
      scope: ["NE", "SEA"],
      rosterNames: ["A.J. Brown"],
      playerTeamByName: merged,
    },
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].player, "AJ Brown");
});

test("filterNflPropsForMatchup drops AJ Brown alias when index still says PHI", () => {
  const teamIndex = buildNflPlayerTeamIndex([
    { name: "Drake Maye", team: "NE" },
    { name: "A.J. Brown", team: "PHI" },
    { name: "Jaxon Smith-Njigba", team: "SEA" },
  ]);
  const props = [
    { player: "Drake Maye", team: "NE", line: 261.5, game: "NE @ SEA" },
    { player: "AJ Brown", team: "SEA", line: 62.5, game: "NE @ SEA" },
    { player: "Jadarian Price", team: "NE", line: 40.5, game: "NE @ SEA" },
    { player: "Jaxon Smith-Njigba", team: "SEA", line: 81.5, game: "NE @ SEA" },
  ];
  const out = filterNflPropsForMatchup(props, {
    scope: ["NE", "SEA"],
    rosterNames: ["Drake Maye", "Jaxon Smith-Njigba"],
    playerTeamByName: teamIndex,
  });
  const names = out.map((p) => p.player);
  assert.deepEqual(names.sort(), ["Drake Maye", "Jaxon Smith-Njigba"].sort());
});

test("filterNflPropsForMatchup does not fail open when allowlist misses everyone", () => {
  const out = filterNflPropsForMatchup(
    [
      { player: "A.J. Brown", game: "NE @ SEA", line: 1 },
      { player: "Jadarian Price", game: "NE @ SEA", line: 1 },
    ],
    {
      scope: ["NE", "SEA"],
      rosterNames: ["Drake Maye", "Sam Darnold"],
      playerTeamByName: buildNflPlayerTeamIndex([
        { name: "Drake Maye", team: "NE" },
        { name: "A.J. Brown", team: "PHI" },
      ]),
    },
  );
  assert.equal(out.length, 0);
});

test("mergeNflRostersByTeamPreferLast keeps BDL Brown and ESPN Maye", () => {
  const espn = { NE: [{ name: "Drake Maye", source: "espn" }] };
  const bdl = { NE: [{ name: "A.J. Brown", source: "balldontlie_nfl" }] };
  const merged = mergeNflRostersByTeamPreferLast(espn, bdl);
  const names = merged.NE.map((r) => r.name).sort();
  assert.deepEqual(names, ["A.J. Brown", "Drake Maye"]);
});

test("normalizePlayerKey collapses A.J. / AJ initials", async () => {
  const { normalizePlayerKey } = await import("./nflAskPropTrim.js");
  assert.equal(normalizePlayerKey("A.J. Brown"), "aj brown");
  assert.equal(normalizePlayerKey("AJ Brown"), "aj brown");
  assert.equal(normalizePlayerKey("A J Brown"), "aj brown");
});

test("inferNflPropTicketSide fades the high print when books disagree", async () => {
  const { inferNflPropTicketSide, preferHighPrintPrimary } = await import("./nflAskPropTrim.js");
  const rows = [
    { player: "Drake Maye", prop: "passing yards", propRaw: "passing_yards", line: 232.5, overOdds: -110, underOdds: -110 },
    { player: "Drake Maye", prop: "pass yards", propRaw: "pass_yds", line: 262.5, overOdds: -110, underOdds: -110 },
  ];
  const high = inferNflPropTicketSide(rows[1], rows, { openerWeek: true });
  assert.equal(high.side, "Under");
  assert.match(high.why, /Main is 262\.5/);
  assert.match(high.why, /232\.5/);
  const cheap = inferNflPropTicketSide(rows[0], rows);
  assert.equal(cheap.side, "Over");
  const picked = preferHighPrintPrimary([rows[0]], rows);
  assert.equal(picked[0].line, 262.5);
});

test("preferHighPrintPrimary ignores 400+ alts and other Maye markets", async () => {
  const { inferNflPropTicketSide, preferHighPrintPrimary } = await import("./nflAskPropTrim.js");
  const rows = [
    { player: "Drake Maye", prop: "passing yards", propRaw: "passing_yards", line: 232.5, overOdds: -110, underOdds: -110 },
    { player: "Drake Maye", prop: "passing yards", propRaw: "passing_yards", line: 261.5, overOdds: -110, underOdds: -110 },
    { player: "Drake Maye", prop: "passing yards", propRaw: "passing_yards", line: 460.5, overOdds: -110, underOdds: -110 },
    { player: "Drake Maye", prop: "rushing yards", propRaw: "rushing_yards", line: 47.5, overOdds: -110, underOdds: -110 },
    { player: "Drake Maye", prop: "passing + rushing yards", propRaw: "passing_rushing_yards", line: 109.5, overOdds: -110, underOdds: -110 },
  ];
  const picked = preferHighPrintPrimary([rows[0]], rows);
  assert.equal(picked[0].line, 261.5);
  const ticket = inferNflPropTicketSide(picked[0], rows);
  assert.equal(ticket.side, "Under");
  assert.match(ticket.why, /261\.5/);
  assert.match(ticket.why, /232\.5/);
  assert.doesNotMatch(ticket.why, /460\.5|47\.5|109\.5/);
});
