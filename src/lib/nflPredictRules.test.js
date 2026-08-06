import assert from "node:assert/strict";
import test from "node:test";

import { NFL_2026_SCHEDULE as schedule } from "../data/nfl2026Schedule.js";
import { NFL_2026_TEAMS as teams } from "../data/nfl2026Teams.js";
import {
  collectBracketWinners,
  initBracket,
  pickBracketGame,
  reseedDivisionalRound,
} from "./nflPredictBracket.js";
import { getProjectedRecord, getTeamSchedule } from "./nflPredictDerived.js";
import { getPlayoffPicture } from "./nflPredictPlayoffs.js";

/** @param {string} abbr */
function team(abbr) {
  const t = teams.find((x) => x.abbr === abbr);
  assert.ok(t, `missing team ${abbr}`);
  return t;
}

/** @param {number} seed @param {string} abbr */
function slot(seed, abbr) {
  return { seed, team: team(abbr) };
}

function pickByWinTotals() {
  /** @type {Record<string, { winner: string, confidence: number }>} */
  const picks = {};
  const wt = Object.fromEntries(teams.map((t) => [t.abbr, t.winTotal]));
  for (const g of schedule) {
    const hw = wt[g.homeTeam] ?? 8.5;
    const aw = wt[g.awayTeam] ?? 8.5;
    picks[g.id] = { winner: hw + 0.4 >= aw ? g.homeTeam : g.awayTeam, confidence: 80 };
  }
  return picks;
}

/** @param {string} abbr @param {"win"|"lose"} mode */
function lockTeamSeason(abbr, mode) {
  /** @type {Record<string, { winner: string, confidence: number }>} */
  const picks = {};
  for (const g of getTeamSchedule(abbr, schedule)) {
    if (mode === "win") picks[g.id] = { winner: abbr, confidence: 80 };
    else picks[g.id] = { winner: g.homeTeam === abbr ? g.awayTeam : g.homeTeam, confidence: 80 };
  }
  return picks;
}

test("reseedDivisionalRound — chalk WC: #1 vs #4, #2 vs #3", () => {
  const out = reseedDivisionalRound(slot(1, "BAL"), [slot(2, "KC"), slot(3, "BUF"), slot(4, "JAX")]);
  assert.equal(out.div1Home?.seed, 1);
  assert.equal(out.div1Away?.seed, 4);
  assert.equal(out.div2Home?.seed, 2);
  assert.equal(out.div2Away?.seed, 3);
});

test("reseedDivisionalRound — #7 upset: #1 vs #7, #3 vs #4", () => {
  const out = reseedDivisionalRound(slot(1, "BAL"), [slot(7, "PIT"), slot(3, "BUF"), slot(4, "JAX")]);
  assert.equal(out.div1Away?.seed, 7);
  assert.equal(out.div2Home?.seed, 3);
  assert.equal(out.div2Away?.seed, 4);
});

test("reseedDivisionalRound — #5 and #6 upset: #1 vs #6, #2 vs #5", () => {
  const out = reseedDivisionalRound(slot(1, "BAL"), [slot(2, "KC"), slot(6, "NE"), slot(5, "LAC")]);
  assert.equal(out.div1Away?.seed, 6);
  assert.equal(out.div2Home?.seed, 2);
  assert.equal(out.div2Away?.seed, 5);
});

test("reseedDivisionalRound — incomplete WC leaves divisional unassigned (NFL reseeds after full WC)", () => {
  const out = reseedDivisionalRound(slot(1, "BAL"), [slot(2, "KC"), slot(3, "BUF"), null]);
  assert.equal(out.div1Home?.seed, 1);
  assert.equal(out.div1Away, null);
  assert.equal(out.div2Home, null);
  assert.equal(out.div2Away, null);
});

test("bracket init + chalk WC applies NFL reseed through live bracket state", () => {
  const pic = getPlayoffPicture(pickByWinTotals(), schedule, teams);
  let bracket = initBracket(pic);

  assert.equal(bracket.afc.divisional[0].home?.seed, 1);
  assert.equal(bracket.afc.divisional[0].away, null, "no divisional away until all WC winners known");

  for (const g of bracket.afc.wildCard) {
    bracket = pickBracketGame(bracket, g.id, g.home.team.abbr);
  }

  assert.equal(bracket.afc.divisional[0].away?.seed, 4, "#1 hosts lowest remaining seed (#4 on chalk)");
  assert.equal(bracket.afc.divisional[1].home?.seed, 2);
  assert.equal(bracket.afc.divisional[1].away?.seed, 3);

  for (const g of bracket.nfc.wildCard) {
    bracket = pickBracketGame(bracket, g.id, g.home.team.abbr);
  }
  assert.equal(bracket.nfc.divisional[0].away?.seed, 4);
  assert.equal(bracket.nfc.divisional[1].home?.seed, 2);
  assert.equal(bracket.nfc.divisional[1].away?.seed, 3);
});

test("WC upset reshuffles both divisional games and clears both divisional winners", () => {
  const pic = getPlayoffPicture(pickByWinTotals(), schedule, teams);
  let bracket = initBracket(pic);

  for (const conf of ["afc", "nfc"]) {
    for (const g of bracket[conf].wildCard) {
      bracket = pickBracketGame(bracket, g.id, g.home.team.abbr);
    }
  }

  // Lock chalk divisional winners, then flip AFC 2v7 to the 7-seed.
  bracket = pickBracketGame(bracket, "afc-div-1", bracket.afc.divisional[0].home.team.abbr);
  bracket = pickBracketGame(bracket, "afc-div-2", bracket.afc.divisional[1].home.team.abbr);
  assert.ok(collectBracketWinners(bracket)["afc-div-1"]);
  assert.ok(collectBracketWinners(bracket)["afc-div-2"]);

  const seven = bracket.afc.wildCard[0].away.team.abbr;
  bracket = pickBracketGame(bracket, "afc-wc-1", seven);

  assert.equal(bracket.afc.divisional[0].away?.seed, 7);
  assert.equal(bracket.afc.divisional[1].home?.seed, 3);
  assert.equal(bracket.afc.divisional[1].away?.seed, 4);

  const winners = collectBracketWinners(bracket);
  assert.equal(winners["afc-div-1"], undefined);
  assert.equal(winners["afc-div-2"], undefined);
  assert.equal(winners["afc-champ"], undefined);
  assert.equal(winners["super-bowl"], undefined);
});

test("getProjectedRecord — locked 17-0 / 0-17 are exact (no 16.5 / 0.5 clamp)", () => {
  const unbeaten = getProjectedRecord("DAL", lockTeamSeason("DAL", "win"), schedule, teams);
  assert.equal(unbeaten.wins, 17);
  assert.equal(unbeaten.remaining, 0);
  assert.equal(unbeaten.projectedWins, 17);
  assert.equal(unbeaten.projectedLosses, 0);

  const winless = getProjectedRecord("DAL", lockTeamSeason("DAL", "lose"), schedule, teams);
  assert.equal(winless.losses, 17);
  assert.equal(winless.remaining, 0);
  assert.equal(winless.projectedWins, 0);
  assert.equal(winless.projectedLosses, 17);
});

test("getProjectedRecord — partial slate still soft-clamps away from exact 0 / 17", () => {
  const empty = getProjectedRecord("DAL", {}, schedule, teams);
  assert.equal(empty.remaining, 17);
  assert.ok(empty.projectedWins >= 0.5 && empty.projectedWins <= 16.5);
  assert.notEqual(empty.projectedWins, 0);
  assert.notEqual(empty.projectedWins, 17);
});
