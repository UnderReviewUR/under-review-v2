import assert from "node:assert/strict";
import test from "node:test";
import { findWcNamedPlayerPropLegMatch } from "./wcPlayerPropFixture.js";
import { buildWcNamedPlayerPropsStructured } from "./wcPlayerMarketResolve.js";
import { leadWcPropBoardRow, extractWcTurnArtifact } from "./wcTurnArtifact.js";
import { WC_CARD_TYPE } from "./wcThreadState.js";

const ausEgyProps = {
  eventId: "99",
  homeTeam: "AUS",
  awayTeam: "EGY",
  lastUpdated: Date.now(),
  markets: {
    player_sot_ou: [
      {
        name: "Mohamed Salah",
        americanOdds: "-162",
        line: "0.5",
        side: "over",
        nationAbbr: "EGY",
      },
      {
        name: "Mahmoud Trézéguet",
        americanOdds: "-120",
        line: "1",
        side: "over",
        nationAbbr: "EGY",
      },
      {
        name: "Jackson Irvine",
        americanOdds: "+210",
        line: "0.5",
        side: "over",
        nationAbbr: "AUS",
      },
    ],
  },
};

test("findWcNamedPlayerPropLegMatch — last-name Salah hits Mohamed Salah SOT row", () => {
  const hit = findWcNamedPlayerPropLegMatch(
    {
      name: "Salah",
      threshold: "",
      marketKey: "player_sot_ou",
      marketLabel: "shots on target",
    },
    ausEgyProps,
  );
  assert.ok(hit?.row?.americanOdds);
  assert.match(String(hit.row.name || ""), /Salah/i);
  assert.equal(hit.marketKey, "player_sot_ou");
});

test("buildWcNamedPlayerPropsStructured — Salah get-on-target ask cites posted SOT", () => {
  const structured = buildWcNamedPlayerPropsStructured(
    "How many shots will Salah get on target?",
    "verified",
    { matchPlayerProps: ausEgyProps, wcEventId: "99" },
    { wcEventId: "99", requiredEntities: ["AUS", "EGY"] },
  );
  assert.ok(structured);
  assert.match(String(structured.lean || ""), /Salah/i);
  assert.match(String(structured.lean || ""), /-162/);
  assert.doesNotMatch(String(structured.lean || ""), /no .*line posted yet/i);
});

test("leadWcPropBoardRow — parlay ticket uses current legs not stale prop board", () => {
  const artifact = extractWcTurnArtifact({
    cardType: WC_CARD_TYPE.PARLAY_TICKET,
    callType: "parlay",
    fixtureHome: "AUS",
    fixtureAway: "EGY",
    propBoardRows: [{ label: "Mahmoud Trézéguet", odds: "-120", market: "player_sot_ou" }],
    parlayLegs: [
      { play: "Mohamed Salah over 0.5 shots on target", odds: "-162" },
      { play: "Awer Mabil over 1 shots on target", odds: "+125" },
      { play: "Jackson Irvine over 0.5 shots on target", odds: "+210" },
    ],
  });
  const lead = leadWcPropBoardRow(artifact);
  assert.ok(lead);
  assert.match(String(lead.player || ""), /Salah/i);
});
