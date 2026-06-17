import assert from "node:assert/strict";
import test from "node:test";
import {
  detectWcPlayerPropMarketKey,
  findWcMatchPlayerPropRowForQuestion,
  findWcNamedPlayerPropLegMatch,
  resolveWcEventIdForFixtureTeams,
  resolveWcEventIdForPlayerNation,
  resolveWcPlayerNationFromQuestion,
  resolveWcPlayerPropSlateFixtureTeams,
} from "./wcPlayerPropFixture.js";
import {
  attachMatchPlayerPropsFreshness,
  createEmptyMatchPlayerPropMarkets,
  isMatchPlayerPropsFresh,
} from "./wcMatchPlayerProps.js";
import { formatWcNamedPlayerPropLegAnswer } from "./wcUrTakePlayerMarket.js";

test("resolveWcPlayerNationFromQuestion — Son → KOR", () => {
  assert.equal(resolveWcPlayerNationFromQuestion("Son 2.5 shots?"), "KOR");
});

test("resolveWcPlayerNationFromQuestion — Musa → NGA (not CRO homonym)", () => {
  assert.equal(resolveWcPlayerNationFromQuestion("musa over 1.5 shots?"), "NGA");
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

test("resolveWcEventIdForFixtureTeams — pins live ECU vs CIV fixture", () => {
  const matches = [
    {
      id: "760423",
      homeTeam: "ECU",
      awayTeam: "CIV",
      status: "live",
      commenceTs: Date.now(),
    },
    {
      id: "760424",
      homeTeam: "FRA",
      awayTeam: "BRA",
      status: "scheduled",
      commenceTs: Date.now() + 86400000,
    },
  ];
  assert.equal(resolveWcEventIdForFixtureTeams(matches, "ECU", "CIV"), "760423");
  assert.equal(resolveWcEventIdForFixtureTeams(matches, "CIV", "ECU"), "760423");
});

test("resolveWcPlayerPropSlateFixtureTeams — pins featured tonight match when one remains", () => {
  const nowMs = Date.parse("2026-06-14T22:00:00-04:00");
  const matches = [
    {
      id: "760423",
      homeTeam: "CIV",
      awayTeam: "ECU",
      status: "live",
      date: "2026-06-14",
      commenceTs: nowMs - 3600000,
    },
    {
      id: "760425",
      homeTeam: "SWE",
      awayTeam: "TUN",
      status: "scheduled",
      date: "2026-06-14",
      time: "9:00 PM ET",
      commenceTs: nowMs + 3600000,
    },
  ];
  assert.deepEqual(
    resolveWcPlayerPropSlateFixtureTeams(
      "there is another game tonight. best player props?",
      matches,
      nowMs,
    ),
    ["SWE", "TUN"],
  );
});

test("findWcNamedPlayerPropLegMatch — Gordon falls back to shots each half", () => {
  const event = {
    markets: {
      player_shots_ou: [
        {
          name: "Harry Kane",
          americanOdds: "-110",
          line: "1.5",
          side: "over",
          nationAbbr: "ENG",
        },
      ],
      player_shots_each_half: [
        {
          name: "Anthony Gordon",
          americanOdds: "+105",
          line: "1",
          side: "over",
          nationAbbr: "ENG",
        },
      ],
    },
  };
  const leg = {
    name: "anthony gordon",
    threshold: "1.5",
    marketKey: "player_shots_ou",
    marketLabel: "shots",
  };
  const hit = findWcNamedPlayerPropLegMatch(leg, event);
  assert.ok(hit?.row);
  assert.equal(hit.marketKey, "player_shots_each_half");
  assert.equal(hit.isProxy, true);
  assert.equal(hit.row.americanOdds, "+105");
  const line = formatWcNamedPlayerPropLegAnswer(leg, hit);
  assert.match(line, /each half/i);
  assert.doesNotMatch(line, /full-match 1\.5 not posted/i);
});

test("findWcNamedPlayerPropLegMatch — Kane stays on full-match SOT", () => {
  const event = {
    markets: {
      player_sot_ou: [
        {
          name: "Harry Kane",
          americanOdds: "-125",
          line: "1.5",
          side: "over",
          nationAbbr: "ENG",
        },
      ],
      player_sot_each_half: [
        {
          name: "Harry Kane",
          americanOdds: "+200",
          line: "1",
          side: "over",
          nationAbbr: "ENG",
        },
      ],
    },
  };
  const leg = {
    name: "kane",
    threshold: "1.5",
    marketKey: "player_sot_ou",
    marketLabel: "shots on target",
  };
  const hit = findWcNamedPlayerPropLegMatch(leg, event);
  assert.equal(hit?.marketKey, "player_sot_ou");
  assert.equal(hit?.isProxy, false);
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
