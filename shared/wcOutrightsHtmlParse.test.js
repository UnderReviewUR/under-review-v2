import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCoversOutrightsFromHtml,
  parseOddsSharkOutrightsFromHtml,
  parseWcTournamentWinnerOutrightsFromHtml,
  isViableWcOutrightsMap,
} from "./wcOutrightsHtmlParse.js";

test("parseCoversOutrightsFromHtml reads team (odds) prose blocks", () => {
  const html =
    "<p><strong>Spain (+400):</strong> La Roja...</p>" +
    "<p><strong>England (+550):</strong> If not now...</p>" +
    "<p><strong>France (+475):</strong> Les Bleus...</p>" +
    "<p><strong>Brazil (+800):</strong> Selecao...</p>" +
    "<p><strong>Argentina (+900):</strong> Albiceleste...</p>" +
    "<p><strong>Portugal (+850):</strong> CR7...</p>" +
    "<p><strong>Germany (+1300):</strong> Die Mannschaft...</p>" +
    "<p><strong>Netherlands (+1800):</strong> Oranje...</p>";
  const map = parseCoversOutrightsFromHtml(html);
  assert.equal(map.ESP, "+400");
  assert.equal(map.ENG, "+550");
  assert.equal(map.FRA, "+475");
  assert.ok(isViableWcOutrightsMap(map));
});

test("parseOddsSharkOutrightsFromHtml reads escaped tab-separated winner table", () => {
  const html =
    "Spain\\t\\t\\t+440\\t\\t\\t\\t\\t\\t\\tFrance\\t\\t\\t+460\\t\\t\\t\\t\\t\\t\\tEngland\\t\\t\\t+650\\t\\t\\t\\t\\t\\t\\tBrazil\\t\\t\\t+800\\t\\t\\t\\t\\t\\t\\tPortugal\\t\\t\\t+1000\\t\\t\\t\\t\\t\\t\\tArgentina\\t\\t\\t+1000\\t\\t\\t\\t\\t\\t\\tGermany\\t\\t\\t+1300\\t\\t\\t\\t\\t\\t\\tNetherlands\\t\\t\\t+1800";
  const map = parseOddsSharkOutrightsFromHtml(html);
  assert.equal(map.ESP, "+440");
  assert.equal(map.FRA, "+460");
  assert.equal(map.ENG, "+650");
  assert.ok(isViableWcOutrightsMap(map));
});

test("parseCoversOutrightsFromHtml ignores group-winner negative odds outside winner section", () => {
  const html =
    "<h2>Odds to Win the 2026 FIFA World Cup</h2>" +
    "<p><strong>Spain (+400):</strong> favorite</p>" +
    "<p><strong>France (+475):</strong> close second</p>" +
    "<h2>Group Winner Odds</h2>" +
    "<p><strong>Germany (-200):</strong> Group E favorite</p>";
  const map = parseCoversOutrightsFromHtml(html);
  assert.equal(map.ESP, "+400");
  assert.equal(map.FRA, "+475");
  assert.equal(map.GER, undefined);
});

test("parseWcTournamentWinnerOutrightsFromHtml picks best strategy per source", () => {
  const html =
    'meta description="Spain with +450 odds, France with +490 odds" />' +
    "Spain\t+440\tFrance\t+460\tEngland\t+650\tBrazil\t+800\tArgentina\t+900\tPortugal\t+950\tGermany\t+1300\tNetherlands\t+1600";
  const map = parseWcTournamentWinnerOutrightsFromHtml(html, "oddsshark");
  assert.ok(map.ESP);
  assert.ok(isViableWcOutrightsMap(map));
});
