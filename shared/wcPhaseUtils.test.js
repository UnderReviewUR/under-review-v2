import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldCupPhase,
  isKnockoutPhase,
  selectGroupsForPrompt,
  formatKnockoutBracketPrompt,
  formatKnockoutUrTakeAppendix,
  formatKnockoutPhasePromptRules,
  getTeamKnockoutStatus,
  filterOutrightsForQuestion,
  getWorldCupPhaseFromEtDate,
  resolveWcTournamentPhase,
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

test("formatKnockoutBracketPrompt lists verified fixtures by round", () => {
  const block = formatKnockoutBracketPrompt(
    [{ round: "Quarterfinal", homeTeam: "NOR", awayTeam: "ESP", status: "NS", date: "2026-07-10" }],
    ["NOR"],
  );
  assert.ok(block);
  assert.match(block, /KNOCKOUT BRACKET/);
  assert.match(block, /NOR.*ESP/);
});

test("formatKnockoutUrTakeAppendix includes ET/pens and away-goals abolition", () => {
  const matches = [
    { round: "Quarterfinal", homeTeam: "NOR", awayTeam: "ESP", status: "NS", date: "2026-07-10" },
  ];
  const block = formatKnockoutUrTakeAppendix("QUARTERFINALS", matches, ["NOR"], "Can Norway still win?");
  assert.ok(block);
  assert.match(block, /KNOCKOUT STAGE RULES/);
  assert.match(block, /extra time.*penalty/i);
  assert.match(block, /away goals rule does NOT apply/i);
  assert.match(block, /Quarterfinals/);
  assert.match(block, /CITED TEAM PATH/);
  assert.match(block, /NOR: Active/);
});

test("formatKnockoutUrTakeAppendix marks eliminated teams on tournament-winner questions", () => {
  const matches = [
    {
      round: "Round of 16",
      homeTeam: "NOR",
      awayTeam: "FRA",
      status: "FT",
      homeScore: 0,
      awayScore: 2,
      date: "2026-07-05",
    },
    { round: "Quarterfinal", homeTeam: "ESP", awayTeam: "BRA", status: "NS", date: "2026-07-10" },
  ];
  const block = formatKnockoutUrTakeAppendix(
    "QUARTERFINALS",
    matches,
    ["NOR"],
    "Can Norway still win the tournament?",
  );
  assert.match(block, /NOR: Eliminated/);
  assert.match(block, /cannot win the tournament/i);
});

test("formatKnockoutUrTakeAppendix covers advancement questions with ET/pens guidance", () => {
  const matches = [
    { round: "Round of 16", homeTeam: "NOR", awayTeam: "FRA", status: "NS", date: "2026-07-05" },
  ];
  const block = formatKnockoutUrTakeAppendix(
    "ROUND_OF_16",
    matches,
    ["NOR", "FRA"],
    "Norway vs France — who advances?",
  );
  assert.match(block, /advancement angles/i);
  assert.match(block, /do not treat a draw price as a safe push/i);
  assert.match(block, /\[R16\] NOR vs FRA/);
});

test("getTeamKnockoutStatus returns active with next fixture", () => {
  const matches = [
    { round: "Quarterfinal", homeTeam: "NOR", awayTeam: "ESP", status: "NS", date: "2026-07-10" },
  ];
  const status = getTeamKnockoutStatus("NOR", matches);
  assert.equal(status.state, "active");
  assert.ok(status.nextFixture);
});

test("formatKnockoutPhasePromptRules returns null outside knockout", () => {
  assert.equal(formatKnockoutPhasePromptRules("GROUP_STAGE"), null);
  assert.match(formatKnockoutPhasePromptRules("QUARTERFINALS"), /KNOCKOUT PHASE/);
});

test("filterOutrightsForQuestion keeps only mentioned teams", () => {
  const kv = { outrights: { NOR: "+2500", ESP: "+650", BRA: "+500" }, lastUpdated: Date.now() };
  const filtered = filterOutrightsForQuestion(kv, ["NOR"]);
  assert.deepEqual(filtered.outrights, { NOR: "+2500" });
});

test("getWorldCupPhaseFromEtDate — Jun 28 is knockout calendar", () => {
  const ms = Date.parse("2026-06-28T20:00:00-04:00");
  assert.equal(getWorldCupPhaseFromEtDate(ms), "ROUND_OF_32");
  const sparseGroupFeed = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    status: "ft",
    round: "Group Stage",
    group: "A",
  }));
  assert.equal(getWorldCupPhase(sparseGroupFeed), "GROUP_STAGE");
  const resolved = resolveWcTournamentPhase(sparseGroupFeed, ms);
  assert.equal(resolved, "ROUND_OF_32");
  assert.equal(isKnockoutPhase(resolved), true);
});
