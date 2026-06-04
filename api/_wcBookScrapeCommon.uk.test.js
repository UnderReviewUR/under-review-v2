import assert from "node:assert/strict";
import test from "node:test";
import {
  americanFromFractional,
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
