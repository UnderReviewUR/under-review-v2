import assert from "node:assert/strict";
import test from "node:test";
import { buildResolvedWcPlayerRegistry } from "./wcPlayerRegistry.js";
import {
  formatWcKeyPlayersPromptBlock,
  formatWcSquadTruthGuardBlock,
  getWcStarsByNation,
  rankWcTeamKeyPlayers,
} from "./wcKeyPlayers.js";

const registry = buildResolvedWcPlayerRegistry(null);

test("Haaland ranks #1 key player for Norway even with no live odds data", () => {
  const ranked = rankWcTeamKeyPlayers(registry, "NOR", { limit: 6 });
  assert.ok(ranked.length >= 4);
  assert.match(ranked[0].name, /Haaland/);
  assert.equal(ranked[0].isStar, true);
});

test("same-surname teammate is not falsely starred (Lisandro vs Lautaro Martínez)", () => {
  const ranked = rankWcTeamKeyPlayers(registry, "ARG", { limit: 12 });
  const lisandro = ranked.find((r) => /Lisandro/.test(r.name));
  const lautaro = ranked.find((r) => /Lautaro/.test(r.name));
  assert.ok(lautaro, "Lautaro should be present");
  assert.equal(lautaro.isStar, true);
  if (lisandro) assert.equal(lisandro.isStar, false);
});

test("multi-name star still detected (Yamal)", () => {
  const ranked = rankWcTeamKeyPlayers(registry, "ESP", { limit: 6 });
  const yamal = ranked.find((r) => /Yamal/.test(r.name));
  assert.ok(yamal, "Yamal should surface");
  assert.equal(yamal.isStar, true);
});

test("Golden Boot odds boost and surface in the row", () => {
  const ranked = rankWcTeamKeyPlayers(registry, "NOR", {
    limit: 6,
    goldenBoot: {
      byKey: new Map(),
      byName: new Map([["erling braut haaland", { americanOdds: "+450", impliedRank: 1 }]]),
    },
  });
  const haaland = ranked.find((r) => /Haaland/.test(r.name));
  assert.equal(haaland.goldenBootOdds, "+450");
});

test("block names talisman, includes rules, and flags OUT players", () => {
  const block = formatWcKeyPlayersPromptBlock(["NOR"], {
    registry,
    goldenBootRows: [
      { name: "Erling Braut Haaland", nationAbbr: "NOR", americanOdds: "+450", impliedRank: 1 },
    ],
    injuriesBoard: {
      rows: [{ name: "Erling Braut Haaland", teamAbbr: "NOR", status: "out (knee)", impact: "high" }],
    },
  });
  assert.ok(block);
  assert.match(block, /KEY PLAYERS/);
  assert.match(block, /Haaland/);
  assert.match(block, /OUT\/UNAVAILABLE/);
  assert.match(block, /never omit a listed talisman/i);
  assert.match(block, /never club\/domestic-league form/i);
});

test("OUT star is de-prioritized below an available forward", () => {
  const block = formatWcKeyPlayersPromptBlock(["NOR"], {
    registry,
    injuriesBoard: {
      rows: [{ name: "Erling Braut Haaland", teamAbbr: "NOR", status: "ruled out", impact: "high" }],
    },
  });
  // Haaland still listed (model must know the star is out) but flagged.
  assert.match(block, /Haaland/);
  assert.match(block, /OUT\/UNAVAILABLE/);
});

test("returns null for unknown team abbreviations", () => {
  assert.equal(formatWcKeyPlayersPromptBlock(["ZZZ"], { registry }), null);
  assert.equal(formatWcKeyPlayersPromptBlock([], { registry }), null);
});

test("squad-truth guard grounds Haaland→NOR and forbids denying squad membership", () => {
  const stars = getWcStarsByNation();
  const haaland = stars.find((s) => /Haaland/.test(s.name));
  assert.ok(haaland, "Haaland should be in the star→nation map");
  assert.equal(haaland.nationAbbr, "NOR");

  const guard = formatWcSquadTruthGuardBlock();
  assert.match(guard, /WC SQUAD TRUTH/);
  assert.match(guard, /NEVER tell a user that a named player is not on/i);
  assert.match(guard, /Haaland \(NOR\)/);
});
