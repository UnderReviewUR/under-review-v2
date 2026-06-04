import assert from "node:assert/strict";
import test from "node:test";
import {
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
