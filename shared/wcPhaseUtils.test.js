import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldCupPhase,
  isKnockoutPhase,
  selectGroupsForPrompt,
  formatKnockoutBracketPrompt,
  filterOutrightsForQuestion,
} from "./wcPhaseUtils.js";

test("getWorldCupPhase returns PRE_GROUP with zero finished matches", () => {
  assert.equal(getWorldCupPhase([{ status: "NS" }]), "PRE_GROUP");
});

test("getWorldCupPhase returns GROUP_STAGE after first results", () => {
  const matches = [{ status: "FT", round: "Group Stage" }, { status: "NS" }];
  assert.equal(getWorldCupPhase(matches), "GROUP_STAGE");
});

test("getWorldCupPhase detects knockout from round field", () => {
  const matches = [
    ...Array.from({ length: 72 }, () => ({ status: "FT", round: "Group Stage" })),
    { status: "NS", round: "Round of 16", homeTeam: "NOR", awayTeam: "FRA" },
  ];
  assert.equal(getWorldCupPhase(matches), "ROUND_OF_16");
});

test("selectGroupsForPrompt scopes to mentioned teams in group stage", () => {
  const groups = {
    A: [{ name: "Mexico", strengthTag: "Favorite" }],
    I: [{ name: "Norway", strengthTag: "Contender" }],
  };
  const scoped = selectGroupsForPrompt(groups, {
    phase: "GROUP_STAGE",
    mentionedTeams: ["NOR"],
    fixtures: [],
  });
  assert.ok(scoped.I);
  assert.equal(scoped.A, undefined);
});

test("selectGroupsForPrompt omits all groups in knockout when no mentions", () => {
  const groups = { A: [{ name: "Mexico" }] };
  const scoped = selectGroupsForPrompt(groups, { phase: "QUARTERFINALS", mentionedTeams: [], fixtures: [] });
  assert.deepEqual(scoped, {});
});

test("formatKnockoutBracketPrompt includes ET/pens rule", () => {
  const block = formatKnockoutBracketPrompt(
    [{ round: "Quarterfinal", homeTeam: "NOR", awayTeam: "ESP", status: "NS", date: "2026-07-10" }],
    ["NOR"],
  );
  assert.ok(block);
  assert.match(block, /away goals rule does NOT apply/i);
  assert.match(block, /NOR.*ESP/);
});

test("filterOutrightsForQuestion keeps only mentioned teams", () => {
  const kv = { outrights: { NOR: "+2500", ESP: "+650", BRA: "+500" }, lastUpdated: Date.now() };
  const filtered = filterOutrightsForQuestion(kv, ["NOR"]);
  assert.deepEqual(filtered.outrights, { NOR: "+2500" });
});
