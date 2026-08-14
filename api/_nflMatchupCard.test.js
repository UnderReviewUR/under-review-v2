import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNflMatchupCard,
  findNflPoolPlayerInQuestion,
  listNflIdentitiesInQuestion,
  resolveNflOpponentAbbr,
  resolveHomeFromSlate,
  pickLivePropLine,
  buildInjuryOverrideLine,
  buildNflMatchupThesis,
} from "./_nflMatchupCard.js";

test("findNflPoolPlayerInQuestion hits full name and unique last name", () => {
  assert.equal(findNflPoolPlayerInQuestion("James Cook rush yards")?.name, "James Cook");
  assert.equal(findNflPoolPlayerInQuestion("Cook over 80.5")?.name, "James Cook");
});

test("listNflIdentitiesInQuestion IDs Maye and Richardson as QBs, not an RB", () => {
  const { identities } = listNflIdentitiesInQuestion(
    "Colts at Patriots first half under if Maye and Richardson get yanked after a series?",
  );
  const names = identities.map((p) => p.name);
  assert.ok(names.includes("Drake Maye"));
  assert.ok(names.includes("Anthony Richardson"));
  const ar = identities.find((p) => p.name === "Anthony Richardson");
  assert.equal(ar.pos, "QB");
  assert.equal(ar.team, "IND");
  assert.equal(ar.role, "backup");
});

test("resolveNflOpponentAbbr prefers other team in scope", () => {
  assert.equal(resolveNflOpponentAbbr("BUF", ["BUF", "PHI"], ""), "PHI");
});

test("resolveHomeFromSlate does not fall back to the wrong BUF game", () => {
  const miss = resolveHomeFromSlate(
    [{ awayAbbr: "BUF", homeAbbr: "CHI", spread: { favoriteAbbr: "CHI", displayLine: "CHI -3" } }],
    "BUF",
    "PHI",
  );
  assert.equal(miss.game, null);
  assert.equal(miss.homeAbbr, null);
});

test("resolveHomeFromSlate uses board game home", () => {
  const slate = resolveHomeFromSlate(
    [{ awayAbbr: "BUF", homeAbbr: "PHI", providerGameId: 1 }],
    "BUF",
    "PHI",
  );
  assert.equal(slate.homeAbbr, "PHI");
  assert.equal(slate.awayAbbr, "BUF");
});

test("pickLivePropLine matches rush yards", () => {
  const line = pickLivePropLine(
    [
      { player: "James Cook", propRaw: "rush_yds", prop: "rush yards", line: 78.5, overOdds: -110, underOdds: -110, book: "DraftKings" },
      { player: "James Cook", propRaw: "anytime_td", prop: "anytime TD", line: 0.5, overOdds: 120, book: "FanDuel" },
    ],
    "James Cook",
    ["rush_yds", "rushing_yards"],
  );
  assert.equal(line.line, 78.5);
  assert.equal(line.propRaw, "rush_yds");
});

test("buildInjuryOverrideLine flags Out player", () => {
  const line = buildInjuryOverrideLine(
    [{ player: "James Cook", status: "Out" }],
    { name: "James Cook", team: "BUF" },
  );
  assert.match(line, /INJURY OVERRIDE/);
});

test("buildNflMatchupCard includes live line, H2H, slate home, thesis, discipline", () => {
  const card = buildNflMatchupCard({
    question: "James Cook rush yards vs PHI",
    scopeTeams: ["BUF", "PHI"],
    games: [
      {
        awayAbbr: "BUF",
        homeAbbr: "PHI",
        spread: { favoriteAbbr: "PHI", displayLine: "PHI -3.5" },
      },
    ],
    propLines: [
      {
        player: "James Cook",
        propRaw: "rush_yds",
        prop: "rush yards",
        line: 72.5,
        overOdds: -115,
        underOdds: -105,
        book: "DraftKings",
      },
      {
        player: "James Cook",
        propRaw: "rush_yds",
        prop: "rush yards",
        line: 78.5,
        overOdds: -110,
        underOdds: -110,
        book: "FanDuel",
      },
    ],
    injuries: [],
  });
  assert.match(card.promptBlock, /NFL MATCHUP CARD/);
  assert.match(card.promptBlock, /Live MAIN line:.*72\.5|Live MAIN line:.*78\.5/);
  assert.match(card.promptBlock, /H2H note:/);
  assert.match(card.promptBlock, /Slate: BUF @ PHI/);
  assert.match(card.promptBlock, /Lincoln Financial|Weather:/);
  assert.match(card.promptBlock, /Script:/);
  assert.match(card.promptBlock, /Book range:/);
  assert.match(card.promptBlock, /NFL ASK DISCIPLINE/);
  assert.match(card.promptBlock, /NEXT:/);
  assert.equal(card.opponent, "PHI");
  assert.match(card.thesis, /James Cook/);
});

test("buildNflMatchupCard flags slate gap instead of inventing home/script", () => {
  const card = buildNflMatchupCard({
    question: "James Cook rush yards vs PHI",
    games: [{ awayAbbr: "BUF", homeAbbr: "CHI", spread: { favoriteAbbr: "CHI", displayLine: "CHI -3" } }],
    propLines: [],
  });
  assert.equal(card.opponent, "PHI");
  assert.equal(card.homeAbbr, null);
  assert.match(card.cardBlock, /SLATE GAP/);
  assert.doesNotMatch(card.cardBlock, /Slate: BUF @ CHI/);
  assert.doesNotMatch(card.cardBlock, /Script:/);
});

test("buildNflMatchupThesis formats one line", () => {
  const thesis = buildNflMatchupThesis({
    player: { name: "James Cook", pos: "RB", team: "BUF" },
    opponent: "PHI",
    defenseTier: "ELITE",
    liveLine: { prop: "rush yards", line: 72.5, book: "DK" },
    injuryLine: null,
    homeAbbr: "PHI",
  });
  assert.match(thesis, /vs PHI \(ELITE D\)/);
  assert.match(thesis, /@ PHI/);
  assert.match(thesis, /72\.5/);
});
