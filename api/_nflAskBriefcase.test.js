import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNflAskBriefcaseHealth,
  formatNflBriefcaseHealthPromptBlock,
} from "./_nflAskBriefcase.js";
import { createEmptyNflGoatBriefcase, evaluateBriefcaseForInteraction } from "../shared/nflGoatExtractionContract.js";

test("formatNflBriefcaseHealthPromptBlock includes grade and guidance", () => {
  const b = createEmptyNflGoatBriefcase();
  const health = evaluateBriefcaseForInteraction(b, "Parsons sacks?");
  const block = formatNflBriefcaseHealthPromptBlock(health);
  assert.match(block, /NFL SUITCASE HEALTH/);
  assert.match(block, /grade RED/i);
  assert.match(block, /Sacks/i);
  assert.match(block, /never refuse/i);
});

test("formatNflBriefcaseHealthPromptBlock does not FORCE PASS a posted spread", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.games = [{ id: 1, awayAbbr: "DET", homeAbbr: "CIN" }];
  b.slate.odds = [{ game_id: 1, spread: "CIN -6.5", total: 37.5 }];
  b.league.injuries = [{ player: "Y" }];
  const health = evaluateBriefcaseForInteraction(b, "DET @ CIN — CIN -6.5. Side or total?");
  const block = formatNflBriefcaseHealthPromptBlock(health);
  assert.equal(health.forcePass, false);
  assert.doesNotMatch(block, /FORCE PASS/);
  assert.match(block, /Empty player-prop or roster pockets do not kill a posted spread/);
});

test("buildNflAskBriefcaseHealth grades offline without live board", async () => {
  const { interaction, promptBlock, briefcase } = await buildNflAskBriefcaseHealth({
    question: "spread on KC?",
    includeLiveBoard: false,
    injuries: [{ player: "X", status: "Out" }],
    depth: { KC: { qb1: "Mahomes", qb2: "n/a", qb3: "n/a" } },
    uiPlayers: { "Patrick Mahomes": { team: "KC", position: "QB" } },
  });
  assert.ok(promptBlock.includes("NFL SUITCASE HEALTH"));
  assert.equal(interaction.detected.marketId, "spread");
  assert.ok(briefcase.league.injuries.length >= 1);
  assert.ok(Object.keys(briefcase.league.rostersByTeam).length >= 1);
  // Without games/odds, always-load pockets missing → not green
  assert.notEqual(interaction.grade, "green");
});

test("buildNflAskBriefcaseHealth fills rosters from ESPN players when Ourlads depth is empty", async () => {
  const { briefcase } = await buildNflAskBriefcaseHealth({
    question: "DEN @ ATL spread?",
    includeLiveBoard: false,
    espnRosterPlayers: [
      { name: "Bo Nix", team: "DEN", position: "QB", rosterStatus: "Active" },
      { name: "Michael Penix Jr.", team: "ATL", position: "QB", rosterStatus: "Active" },
    ],
  });
  assert.ok(briefcase.league.rostersByTeam.DEN?.some((r) => r.name === "Bo Nix"));
  assert.ok(briefcase.league.rostersByTeam.ATL?.some((r) => /Penix/i.test(r.name)));
});
