import assert from "node:assert/strict";
import test from "node:test";
import {
  extractNflPriorBoardPlayerKeys,
  extractNflPriorMatchupAbbrs,
  looksLikeNflPropsRefreshAsk,
  nflPlayerKeyIsExcluded,
  shouldNflPropsRefreshBatch,
} from "./nflAskPropsBatch.js";
import { pickNflPropsBoardTickets } from "./nflAskPropTrim.js";
import { looksLikeNflPropsBoardAsk } from "./nflAskNormalize.js";

test("looksLikeNflPropsRefreshAsk covers new/more/different phrasing", () => {
  assert.equal(looksLikeNflPropsRefreshAsk("provide new player props"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("give me more props"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("different props"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("who else?"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("provide a few more"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("a few more"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("give me a few more"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("another set of player props"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("new set of props"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("another board"), true);
  assert.equal(looksLikeNflPropsRefreshAsk("Maye over 214.5?"), false);
});

test("refresh asks still count as props-board asks", () => {
  assert.equal(looksLikeNflPropsBoardAsk("provide new player props"), true);
  assert.equal(looksLikeNflPropsBoardAsk("give me more props"), true);
  assert.equal(looksLikeNflPropsBoardAsk("provide a few more"), true);
  assert.equal(looksLikeNflPropsBoardAsk("another set of player props"), true);
});

test("shouldNflPropsRefreshBatch treats repeat best-props as refresh when prior board exists", () => {
  const history = [
    {
      role: "assistant",
      structured: {
        lean: "Lean: Goff under 267.5.",
        whyNow: "Board:\n1. Goff under 267.5\n2. Shakir under 46.5\n3. Allen under 254.5",
      },
    },
  ];
  assert.equal(shouldNflPropsRefreshBatch("another set of player props", history), true);
  assert.equal(shouldNflPropsRefreshBatch("best player props for bills vs lions?", history), true);
  assert.equal(shouldNflPropsRefreshBatch("best player props for bills vs lions?", []), false);
});

test("extractNflPriorBoardPlayerKeys reads board list + lean", () => {
  const keys = extractNflPriorBoardPlayerKeys([
    {
      role: "assistant",
      structured: {
        lean: "Lean: Mahomes under 225.5.",
        call: "MAHOMES UNDER 225.5",
        whyNow:
          "Board:\n1. Mahomes under 225.5 (passing yards)\n2. Worthy over 40.5 (receiving yards)\n3. Walker over 80.5 (rushing yards)",
      },
    },
  ]);
  assert.ok(keys.has("mahomes"));
  assert.ok(keys.has("worthy"));
  assert.ok(keys.has("walker"));
});

test("extractNflPriorMatchupAbbrs finds DEN @ KC", () => {
  const m = extractNflPriorMatchupAbbrs([
    { role: "user", content: "best player props for broncos vs chiefs tonight?" },
    {
      role: "assistant",
      content: "Lean: Mahomes under 225.5.\nBoard:\n1. Mahomes under 225.5\nDEN @ KC",
    },
  ]);
  assert.deepEqual(m, { awayAbbr: "DEN", homeAbbr: "KC" });
});

test("pickNflPropsBoardTickets excludes prior batch players", () => {
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
      player: "Xavier Worthy",
      team: "KC",
      prop: "receiving yards",
      propRaw: "receiving_yards",
      line: 40.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "DEN @ KC",
      player: "Bo Nix",
      team: "DEN",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 230.5,
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
    excludePlayerKeys: new Set(["mahomes", "worthy", "walker"]),
    maxTickets: 4,
  });
  const names = batch2.map((r) => String(r.player));
  assert.ok(names.every((n) => !/mahomes|worthy|walker/i.test(n)));
  assert.ok(names.some((n) => /Nix|Sutton|Pacheco/i.test(n)));
  assert.equal(nflPlayerKeyIsExcluded("Patrick Mahomes", ["mahomes"]), true);
});

test("priorTicketLines blocks near-duplicate numbers on refresh", () => {
  const props = [
    {
      game: "BUF @ DET",
      player: "Jared Goff",
      team: "DET",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 267.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "BUF @ DET",
      player: "Jared Goff",
      team: "DET",
      prop: "passing yards",
      propRaw: "passing_yards",
      line: 265.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "BUF @ DET",
      player: "Amon-Ra St. Brown",
      team: "DET",
      prop: "receiving yards",
      propRaw: "receiving_yards",
      line: 88.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
    {
      game: "BUF @ DET",
      player: "Jahmyr Gibbs",
      team: "DET",
      prop: "rushing yards",
      propRaw: "rushing_yards",
      line: 78.5,
      overOdds: -110,
      underOdds: -110,
      eventId: "1",
    },
  ];
  const batch2 = pickNflPropsBoardTickets(props, {
    scope: new Set(["BUF", "DET"]),
    question: "another set of player props",
    excludePlayerKeys: new Set(["goff"]),
    priorTicketLines: [{ playerKey: "goff", line: 267.5 }],
    maxTickets: 4,
    briefcase: {
      players: {
        seasonStats: [
          { player: "Amon-Ra St. Brown", games: 1, recYds: 95 },
          { player: "Jahmyr Gibbs", games: 1, rushYds: 80 },
        ],
      },
    },
  });
  assert.ok(batch2.every((r) => !/Goff/i.test(String(r.player))));
  assert.ok(batch2.some((r) => /Brown|Gibbs/i.test(String(r.player))));
});
