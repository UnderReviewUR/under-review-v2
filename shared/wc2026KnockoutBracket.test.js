import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WC2026_KNOCKOUT_BRACKET,
  assignThirdPlaceToR32Slots,
  buildR32PairingsFromTemplate,
  parseBracketSlot,
  resolveBracketSlot,
} from "./wc2026KnockoutBracket.js";

test("WC2026_KNOCKOUT_BRACKET — 16 R32 matches from openfootball", () => {
  const r32 = WC2026_KNOCKOUT_BRACKET.find((r) => r.round === "r32")?.matches || [];
  assert.equal(r32.length, 16);
  assert.equal(r32[0].num, 73);
});

test("parseBracketSlot — group and winner refs", () => {
  assert.deepEqual(parseBracketSlot("1A"), { kind: "first", group: "A" });
  assert.deepEqual(parseBracketSlot("2B"), { kind: "second", group: "B" });
  assert.deepEqual(parseBracketSlot("W74"), { kind: "winner", matchNum: 74 });
  assert.deepEqual(parseBracketSlot("3A/B/C/D/F"), {
    kind: "third",
    eligibleGroups: ["A", "B", "C", "D", "F"],
  });
});

test("buildR32PairingsFromTemplate — resolves concrete teams", () => {
  /** @type {Map<string, Array<{ team: { abbreviation: string } }>>} */
  const groupResults = new Map([
    ["A", [{ team: { abbreviation: "MEX" } }, { team: { abbreviation: "KOR" } }]],
    ["B", [{ team: { abbreviation: "CAN" } }, { team: { abbreviation: "SUI" } }]],
  ]);
  for (const letter of "CDEFGHIJKL") {
    if (!groupResults.has(letter)) {
      groupResults.set(letter, [
        { team: { abbreviation: `${letter}1` } },
        { team: { abbreviation: `${letter}2` } },
      ]);
    }
  }

  const bestThird = [
    { team: { abbreviation: "THA" }, group: "A", points: 4, gd: 1, gf: 3 },
    { team: { abbreviation: "THB" }, group: "B", points: 4, gd: 0, gf: 2 },
    { team: { abbreviation: "THC" }, group: "C", points: 3, gd: 0, gf: 2 },
    { team: { abbreviation: "THD" }, group: "D", points: 3, gd: -1, gf: 1 },
    { team: { abbreviation: "THE" }, group: "E", points: 3, gd: 0, gf: 2 },
    { team: { abbreviation: "THF" }, group: "F", points: 3, gd: 0, gf: 1 },
    { team: { abbreviation: "THG" }, group: "G", points: 3, gd: -1, gf: 1 },
    { team: { abbreviation: "THH" }, group: "H", points: 3, gd: 0, gf: 2 },
  ];

  const pairings = buildR32PairingsFromTemplate(groupResults, bestThird);
  assert.equal(pairings.length, 16);
  const m73 = pairings.find(([, , num]) => num === 73);
  assert.ok(m73);
  assert.equal(m73[0].abbreviation, "KOR");
  assert.equal(m73[1].abbreviation, "SUI");
});

test("resolveBracketSlot — W74 uses winners map", () => {
  const winners = new Map([[74, { abbreviation: "FRA" }]]);
  const team = resolveBracketSlot("W74", {
    groupResults: new Map(),
    thirdByMatchNum: new Map(),
    winners,
    losers: new Map(),
  });
  assert.equal(team?.abbreviation, "FRA");
});
