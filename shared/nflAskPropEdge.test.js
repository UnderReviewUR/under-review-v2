import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNflPropEdgeForRow,
  voteNflPropEdgeSide,
  nflPropOpponentAbbr,
} from "./nflAskPropEdge.js";
import { inferNflPropTicketSide } from "./nflAskPropTrim.js";

test("nflPropOpponentAbbr reads the other side of the stamp", () => {
  assert.equal(
    nflPropOpponentAbbr({ team: "DAL", game: "DAL @ NYG" }),
    "NYG",
  );
  assert.equal(
    nflPropOpponentAbbr({ team: "NYG", game: "DAL @ NYG" }),
    "DAL",
  );
});

test("infer uses recent pace over juice when books agree", () => {
  const row = {
    player: "CeeDee Lamb",
    team: "DAL",
    game: "DAL @ NYG",
    prop: "receiving yards",
    propRaw: "receiving_yards",
    line: 78.5,
    overOdds: -110,
    underOdds: -110,
  };
  const briefcase = {
    players: {
      recentStats: [
        { player: "CeeDee Lamb", recYds: 52 },
        { player: "CeeDee Lamb", recYds: 41 },
        { player: "CeeDee Lamb", recYds: 48 },
      ],
      seasonStats: [{ player: "CeeDee Lamb", games: 3, recYds: 141 }],
    },
    league: { injuries: [], teamDefense: {} },
  };
  const ticket = inferNflPropTicketSide(row, [row], { briefcase, openerWeek: false });
  assert.equal(ticket.side, "Under");
  assert.match(ticket.why, /pace/i);
});

test("infer leans Over when pace clears a soft number", () => {
  const row = {
    player: "Javonte Williams",
    team: "DAL",
    game: "DAL @ NYG",
    prop: "rushing yards",
    propRaw: "rushing_yards",
    line: 45.5,
    overOdds: -110,
    underOdds: -110,
  };
  const briefcase = {
    players: {
      recentStats: [
        { player: "Javonte Williams", rushYds: 78 },
        { player: "Javonte Williams", rushYds: 91 },
        { player: "Javonte Williams", rushYds: 64 },
      ],
    },
    league: { injuries: [], teamDefense: {} },
  };
  const ticket = inferNflPropTicketSide(row, [row], { briefcase, openerWeek: false });
  assert.equal(ticket.side, "Over");
  assert.match(ticket.why, /clears/i);
});

test("OUT player fades the over", () => {
  const row = {
    player: "George Pickens",
    team: "DAL",
    game: "DAL @ NYG",
    prop: "receiving yards",
    propRaw: "receiving_yards",
    line: 64.5,
    overOdds: -110,
    underOdds: -110,
  };
  const briefcase = {
    players: { recentStats: [], seasonStats: [] },
    league: {
      injuries: [{ player: "George Pickens", status: "Out", team: "DAL" }],
      teamDefense: {},
    },
  };
  const ticket = inferNflPropTicketSide(row, [row], { briefcase });
  assert.equal(ticket.side, "Under");
  assert.match(ticket.why, /Out/i);
});

test("soft opponent D votes Over when pace is quiet", () => {
  const row = {
    player: "CeeDee Lamb",
    team: "DAL",
    game: "DAL @ NYG",
    prop: "receiving yards",
    propRaw: "receiving_yards",
    line: 62.5,
    overOdds: -110,
    underOdds: -110,
  };
  const edge = buildNflPropEdgeForRow(row, "rec_yds", {
    players: { recentStats: [], seasonStats: [] },
    league: {
      injuries: [],
      teamDefense: {
        NYG: { tier: "WEAK", pass: { rank: 28 }, rush: { rank: 16 }, overall: { rank: 25 } },
      },
    },
  });
  assert.equal(edge.defenseSoft, true);
  const vote = voteNflPropEdgeSide(row, "rec_yds", edge, { openerWeek: false });
  assert.ok(vote);
  assert.equal(vote.side, "Over");
});

test("book disagreement still beats pace", () => {
  const low = {
    player: "Drake Maye",
    team: "NE",
    game: "NE @ SEA",
    prop: "passing yards",
    propRaw: "passing_yards",
    line: 232.5,
    overOdds: -110,
    underOdds: -110,
  };
  const high = { ...low, line: 262.5 };
  const briefcase = {
    players: {
      recentStats: [
        { player: "Drake Maye", passYds: 180 },
        { player: "Drake Maye", passYds: 195 },
        { player: "Drake Maye", passYds: 170 },
      ],
    },
    league: { injuries: [], teamDefense: {} },
  };
  const cheap = inferNflPropTicketSide(low, [low, high], { briefcase, openerWeek: false });
  assert.equal(cheap.side, "Over");
  assert.match(cheap.why, /cheap number/i);
});
