import assert from "node:assert/strict";
import test from "node:test";
import {
  americanFromFractional,
  parseFanDuelResearchGoldenBootFromHtml,
  parseGoldenBootRowsForBook,
  parseUkAggregatorGoldenBootRowsFromHtml,
} from "./_wcBookScrapeCommon.js";

test("parseUkAggregatorGoldenBootRowsFromHtml reads fractional odds", () => {
  const html = `
    <div>Kylian Mbappé 5/1</div>
    <div>Harry Kane 7/1</div>
    <div>Erling Haaland 8/1</div>
    <div>Lamine Yamal 9/1</div>
    <div>Vinícius Júnior 10/1</div>
  `;
  const rows = parseUkAggregatorGoldenBootRowsFromHtml(html);
  assert.ok(rows.length >= 5);
  assert.equal(rows[0].americanOdds, "+500");
});

test("parseGoldenBootRowsForBook uses UK parser for paddypower", () => {
  const html = `<span>Kylian Mbappé</span><span>11/2</span>`.repeat(6);
  const rows = parseGoldenBootRowsForBook(html, "paddypower");
  assert.ok(Array.isArray(rows));
});

test("americanFromFractional handles short prices", () => {
  assert.ok(americanFromFractional("11/2"));
});

test("parseFanDuelResearchGoldenBootFromHtml reads NEXT_DATA odds prose", () => {
  const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"body":"Kylian Mbappe (+600) and Harry Kane (+700) and Erling Haaland (+1400) and Lamine Yamal (+2000) and Vinicius Junior (+3500)"}}}</script>`;
  const rows = parseFanDuelResearchGoldenBootFromHtml(html);
  assert.ok(rows.length >= 4);
  assert.ok(rows.some((r) => r.name.includes("Mbapp") && r.americanOdds === "+600"));
});

test("parseGoldenBootRowsForBook filters DK golf bleed from regex HTML", () => {
  const html = `Patrick Cantlay +2500 Paul Casey +4500 Marc Leishman +10000 Minimum leg odds of +200`;
  const rows = parseGoldenBootRowsForBook(html, "draftkings");
  assert.equal(rows.length, 0);
});
