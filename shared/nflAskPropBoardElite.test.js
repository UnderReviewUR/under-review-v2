import assert from "node:assert/strict";
import test from "node:test";
import {
  detectNflBoardScriptConflicts,
  nflPropBatch2PassesFloor,
  orderNflPropsBoardByPrimaryEdge,
  scoreNflPropPrimaryEdge,
} from "./nflAskPropBoardElite.js";
import {
  inferNflPropTicketSide,
  nflPropMarketKeyBase,
  nflPropPeerLines,
  nflPropSameTicket,
  pickNflConsensusMarketRow,
  pickNflPropsBoardTickets,
} from "./nflAskPropTrim.js";

test("scoreNflPropPrimaryEdge prefers pace-backed ticket over soft opener default", () => {
  const soft = {
    player: "Bo Nix",
    team: "DEN",
    propRaw: "passing_yards",
    line: 230.5,
    overOdds: -110,
    underOdds: -110,
  };
  const shopped = {
    player: "Patrick Mahomes",
    team: "KC",
    propRaw: "passing_yards",
    line: 262.5,
    overOdds: -110,
    underOdds: -110,
  };
  const peers = [
    shopped,
    { ...shopped, line: 225.5 },
  ];
  const softScore = scoreNflPropPrimaryEdge(soft, [soft], inferNflPropTicketSide, nflPropMarketKeyBase, {
    openerWeek: true,
    peerLines: nflPropPeerLines,
  });
  const shopScore = scoreNflPropPrimaryEdge(shopped, peers, inferNflPropTicketSide, nflPropMarketKeyBase, {
    openerWeek: true,
    peerLines: nflPropPeerLines,
  });
  assert.ok(shopScore > softScore);
});

test("detectNflBoardScriptConflicts flags QB under vs teammate WR over", () => {
  const notes = detectNflBoardScriptConflicts([
    {
      row: { player: "Patrick Mahomes", team: "KC", propRaw: "passing_yards", line: 225.5 },
      side: "Under",
      market: "pass_yds",
    },
    {
      row: { player: "Xavier Worthy", team: "KC", propRaw: "receiving_yards", line: 40.5 },
      side: "Over",
      market: "rec_yds",
    },
  ]);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /pass script/i);
});

test("nflPropBatch2PassesFloor rejects empty depth", () => {
  assert.equal(
    nflPropBatch2PassesFloor(
      { player: "Depth Guy" },
      { valueBoost: 0, volume: 0, edgeScore: 8, strict: true },
    ),
    false,
  );
  assert.equal(
    nflPropBatch2PassesFloor(
      { player: "Star" },
      { valueBoost: 32, volume: 0, edgeScore: 10, strict: true },
    ),
    true,
  );
});

test("orderNflPropsBoardByPrimaryEdge promotes line-shop fade over soft opener", () => {
  const nix = {
    player: "Bo Nix",
    team: "DEN",
    propRaw: "passing_yards",
    line: 230.5,
    overOdds: -110,
    underOdds: -110,
  };
  const mahomesMain = {
    player: "Patrick Mahomes",
    team: "KC",
    propRaw: "passing_yards",
    line: 225.5,
    overOdds: -110,
    underOdds: -110,
  };
  const mahomesHigh = {
    player: "Patrick Mahomes",
    team: "KC",
    propRaw: "passing_yards",
    line: 262.5,
    overOdds: -110,
    underOdds: -110,
  };
  const ordered = orderNflPropsBoardByPrimaryEdge([nix, mahomesMain], [mahomesMain, mahomesHigh, nix], {
    openerWeek: true,
    briefcase: null,
    inferSide: inferNflPropTicketSide,
    marketKey: nflPropMarketKeyBase,
    sameTicket: nflPropSameTicket,
    peerLines: nflPropPeerLines,
    pickConsensus: pickNflConsensusMarketRow,
  });
  assert.equal(ordered[0].player, "Patrick Mahomes");
  assert.equal(Number(ordered[0].line), 262.5);
});

test("batch-2 exclude keeps floor tickets only", () => {
  const props = [
    {
      game: "DEN @ KC",
      player: "Patrick Mahomes",
      team: "KC",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 225.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "DEN @ KC",
      player: "Courtland Sutton",
      team: "DEN",
      prop: "receiving yards",
      propRaw: "receiving_yards",
      line: 55.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "DEN @ KC",
      player: "Isiah Pacheco",
      team: "KC",
      prop: "rushing yards",
      propRaw: "rushing_yards",
      line: 48.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
  ];
  const batch2 = pickNflPropsBoardTickets(props, {
    scope: new Set(["DEN", "KC"]),
    question: "provide new player props",
    excludePlayerKeys: new Set(["mahomes"]),
    maxTickets: 4,
    briefcase: {
      players: {
        seasonStats: [
          { player: "Courtland Sutton", games: 1, recYds: 70 },
          { player: "Isiah Pacheco", games: 1, rushYds: 60 },
        ],
      },
    },
  });
  assert.ok(batch2.every((r) => !/mahomes/i.test(String(r.player))));
  assert.ok(batch2.length >= 1);
});
