import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseMatchPlayerPropRowsForDisplay,
  formatMatchPlayerPropRowForPrompt,
  hasMatchPlayerPropRows,
  isMatchPlayerPropsFresh,
  matchPlayerPropRowsFromEvent,
  matchPlayerPropsForEvent,
} from "./wcMatchPlayerProps.js";
import { MOCK_WC_MATCH_PLAYER_PROPS_EVENT } from "../api/wcPlayerMarkets.fixture.js";

test("matchPlayerPropsForEvent reads by event id", () => {
  const kv = { byEventId: { 760416: MOCK_WC_MATCH_PLAYER_PROPS_EVENT } };
  const event = matchPlayerPropsForEvent(kv, "760416");
  assert.equal(event?.eventId, "760416");
  assert.ok(isMatchPlayerPropsFresh(event));
});

test("matchPlayerPropRowsFromEvent returns anytime rows", () => {
  const rows = matchPlayerPropRowsFromEvent(
    MOCK_WC_MATCH_PLAYER_PROPS_EVENT,
    "anytime_scorer",
    10,
  );
  assert.ok(rows.length >= 3);
  assert.match(rows[0].name, /Mbapp/);
  assert.equal(rows[0].americanOdds, "+180");
});

test("hasMatchPlayerPropRows true when extended markets present", () => {
  assert.ok(hasMatchPlayerPropRows(MOCK_WC_MATCH_PLAYER_PROPS_EVENT));
  const assists = matchPlayerPropRowsFromEvent(
    MOCK_WC_MATCH_PLAYER_PROPS_EVENT,
    "player_assists_ou",
    5,
  );
  assert.equal(assists.length, 2);
  assert.equal(assists[0].line, "0.5");
  assert.equal(assists[0].side, "over");
  assert.match(
    formatMatchPlayerPropRowForPrompt("player_assists_ou", assists[0]),
    /Over 0\.5: \+140/,
  );
});

test("collapseMatchPlayerPropRowsForDisplay — one row per player with shortest odds", () => {
  const rows = [
    { name: "Stephen Eustaquio", americanOdds: "+850", nationAbbr: "CAN" },
    { name: "Stephen Eustaquio", americanOdds: "+13000", nationAbbr: "CAN" },
    { name: "Stephen Eustaquio", americanOdds: "+70000", nationAbbr: "CAN" },
    { name: "Richie Laryea", americanOdds: "+950", nationAbbr: "CAN" },
    { name: "Richie Laryea", americanOdds: "+18000", nationAbbr: "CAN" },
  ];
  const out = collapseMatchPlayerPropRowsForDisplay(rows, "anytime_scorer");
  assert.equal(out.length, 2);
  assert.equal(out[0].name, "Stephen Eustaquio");
  assert.equal(out[0].americanOdds, "+850");
  assert.equal(out[1].americanOdds, "+950");
});

test("collapseMatchPlayerPropRowsForDisplay — assists O/U merges milestone + line rows", () => {
  const rows = [
    { name: "Liam Millar", americanOdds: "+475", line: "0.5", side: "over" },
    { name: "Liam Millar", americanOdds: "+5000" },
    { name: "Jonathan Osorio", americanOdds: "+500", line: "0.5", side: "over" },
    { name: "Jonathan Osorio", americanOdds: "+5000", side: "yes" },
  ];
  const out = collapseMatchPlayerPropRowsForDisplay(rows, "player_assists_ou");
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((row) => [row.name, row.americanOdds]),
    [
      ["Liam Millar", "+475"],
      ["Jonathan Osorio", "+500"],
    ],
  );
});
