#!/usr/bin/env node
/**
 * Strict offline QA — CFB + La Liga routing, boards, context builders.
 * Usage: npm run qa:cfb-laliga
 */
import assert from "node:assert/strict";
import {
  hasCfbAskLexicon,
  hasLaligaAskLexicon,
  inferSportFromQuestionText,
} from "../shared/urTakeSportRouting.js";
import { detectSportFromQuestion } from "../src/lib/detectSportFromQuestion.js";
import { isNavSportVisible } from "../shared/siteSportVisibility.js";
import {
  normalizeNcaafGames,
  createEmptyNcaafBriefcase,
} from "../api/_ncaafBdl.js";
import {
  normalizeLaligaMatches,
  normalizeLaligaOddsRows,
  createEmptyLaligaBriefcase,
} from "../api/_laligaBdl.js";
import { buildNcaafAskBriefcaseHealth } from "../api/_ncaafContext.js";
import { buildLaligaAskBriefcaseHealth } from "../api/_laligaContext.js";

assert.equal(isNavSportVisible("cfb"), true);
assert.equal(isNavSportVisible("laliga"), true);

assert.equal(hasCfbAskLexicon("Ohio State vs Michigan spread?"), true);
assert.equal(hasLaligaAskLexicon("Real Madrid vs Barcelona 1X2"), true);
assert.equal(inferSportFromQuestionText("Alabama -7.5 vs Auburn total"), "cfb");
assert.equal(inferSportFromQuestionText("Barcelona BTTS vs Sevilla"), "laliga");
assert.equal(detectSportFromQuestion("Chiefs spread?", "cfb"), "nfl");

const cfbGame = normalizeNcaafGames([
  {
    id: 1,
    week: 1,
    season: 2026,
    home_team: { abbreviation: "OSU", full_name: "Ohio State" },
    visitor_team: { abbreviation: "MICH", full_name: "Michigan" },
  },
]);
assert.equal(cfbGame[0].homeAbbr, "OSU");

const llMatch = normalizeLaligaMatches([
  {
    id: 9,
    short_name: "BAR @ RMA",
    name: "Barcelona at Real Madrid",
    status: "scheduled",
  },
]);
assert.equal(llMatch[0].homeAbbr, "RMA");

const llOdds = normalizeLaligaOddsRows([{ match_id: 9, vendor: "draftkings", home_odds: -110, draw_odds: 250, away_odds: 280 }]);
assert.equal(llOdds[0].moneyline.home, -110);

const cfbHealth = await buildNcaafAskBriefcaseHealth({
  question: "Ohio State spread?",
  includeLiveBoard: false,
  board: {
    games: [{ awayAbbr: "MICH", homeAbbr: "OSU", providerGameId: 1 }],
    odds: [{ game_id: 1, spread: { home: "-3.5" } }],
    propLines: [],
  },
});
assert.ok(cfbHealth.promptBlock.includes("NCAAF SUITCASE"));

const llHealth = await buildLaligaAskBriefcaseHealth({
  question: "Real Madrid to win?",
  includeLiveBoard: false,
  board: {
    matches: [{ awayAbbr: "BAR", homeAbbr: "RMA", providerMatchId: 9 }],
    odds: [{ match_id: 9, moneyline: { home: -120, draw: 280, away: 320 } }],
    propLines: [],
    standings: [{ teamName: "Real Madrid", position: 1, points: 9 }],
  },
});
assert.ok(llHealth.promptBlock.includes("LA LIGA SUITCASE"));

assert.ok(createEmptyNcaafBriefcase().slate);
assert.ok(createEmptyLaligaBriefcase().slate);

console.log(JSON.stringify({ ok: true, event: "qa_cfb_laliga_pass", checks: 14 }));
