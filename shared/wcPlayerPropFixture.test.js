import assert from "node:assert/strict";
import test from "node:test";
import {
  detectWcPlayerPropMarketKey,
  findWcMatchPlayerPropRowForQuestion,
  resolveWcEventIdForPlayerNation,
  resolveWcPlayerNationFromQuestion,
} from "./wcPlayerPropFixture.js";
import {
  attachMatchPlayerPropsFreshness,
  createEmptyMatchPlayerPropMarkets,
  isMatchPlayerPropsFresh,
} from "./wcMatchPlayerProps.js";

test("resolveWcPlayerNationFromQuestion — Son → KOR", () => {
  assert.equal(resolveWcPlayerNationFromQuestion("Son 2.5 shots?"), "KOR");
});

test("resolveWcPlayerNationFromQuestion — Jimenez → MEX", () => {
  assert.equal(resolveWcPlayerNationFromQuestion("Jimenez 2+ shots?"), "MEX");
});

test("detectWcPlayerPropMarketKey — shots vs SOT", () => {
  assert.equal(detectWcPlayerPropMarketKey("Son 2.5 shots?"), "player_shots_ou");
  assert.equal(detectWcPlayerPropMarketKey("Son 1.5 shots on target?"), "player_sot_ou");
});

test("detectWcPlayerPropMarketKey — score or assist before assists market", () => {
  assert.equal(
    detectWcPlayerPropMarketKey("Jimenez to score or assist?"),
    "player_goal_or_assist",
  );
});

test("findWcMatchPlayerPropRowForQuestion — goal or assist row", () => {
  const event = {
    markets: {
      player_goal_or_assist: [
        {
          name: "Raul Jimenez",
          americanOdds: "+180",
          line: "1",
          side: "over",
          nationAbbr: "MEX",
        },
      ],
    },
  };
  const row = findWcMatchPlayerPropRowForQuestion("Jimenez to score or assist?", event);
  assert.equal(row?.market, "player_goal_or_assist");
  assert.equal(row?.americanOdds, "+180");
});

test("findWcMatchPlayerPropRowForQuestion — Son 2.5 picks nearest milestone line", () => {
  const event = {
    markets: {
      player_shots_ou: [
        {
          name: "Son Heung-min",
          americanOdds: "-400",
          line: "2",
          side: "over",
          nationAbbr: "KOR",
        },
        {
          name: "Son Heung-min",
          americanOdds: "-135",
          line: "3",
          side: "over",
          nationAbbr: "KOR",
        },
      ],
    },
  };
  const row = findWcMatchPlayerPropRowForQuestion("Son 2.5 shots?", event);
  assert.equal(row?.line, "3");
  assert.equal(row?.americanOdds, "-135");
});

test("resolveWcEventIdForPlayerNation — pins upcoming KOR fixture", () => {
  const matches = [
    {
      id: "kor-cze-1",
      homeTeam: "KOR",
      awayTeam: "CZE",
      status: "scheduled",
      commenceTs: Date.now() + 86400000,
    },
  ];
  assert.equal(resolveWcEventIdForPlayerNation(matches, "KOR"), "kor-cze-1");
});

test("isMatchPlayerPropsFresh — shots-only BDL payload counts as fresh", () => {
  const markets = createEmptyMatchPlayerPropMarkets();
  markets.player_shots_ou = [
    {
      name: "Heungmin Son",
      americanOdds: "-110",
      line: "2.5",
      side: "over",
      nationAbbr: "KOR",
    },
  ];
  const event = {
    eventId: "999",
    lastUpdated: Date.now(),
    source: "balldontlie",
    markets,
  };
  const attached = attachMatchPlayerPropsFreshness(event);
  assert.equal(attached?.stale, false);
  assert.equal(isMatchPlayerPropsFresh(event), true);
});
