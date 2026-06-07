import assert from "node:assert/strict";
import test from "node:test";
import { americanFromFractional } from "../api/_wcBookScrapeCommon.js";
import {
  mergeGoldenBootConsensus,
  mergeGoldenBootWithSeed,
  parseAmericanOddsNumber,
} from "./wcGoldenBootConsensus.js";
import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import { goldenBootRowsFromKv, isPlausibleGoldenBootRow } from "./wcPlayerOddsFreshness.js";

test("mergeGoldenBootConsensus — median across books", () => {
  const merged = mergeGoldenBootConsensus(
    [
      {
        book: "draftkings",
        ok: true,
        rows: [
          { name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA" },
          { name: "Harry Kane", americanOdds: "+700", nationAbbr: "ENG" },
        ],
      },
      {
        book: "fanduel",
        ok: true,
        rows: [
          { name: "Kylian Mbappé", americanOdds: "+650", nationAbbr: "FRA" },
          { name: "Harry Kane", americanOdds: "+750", nationAbbr: "ENG" },
        ],
      },
    ],
    [],
  );

  assert.ok(merged.rows.length >= 2);
  const mbappe = merged.rows.find((r) => r.name.includes("Mbapp"));
  assert.ok(mbappe);
  assert.ok(mbappe.bookOdds.draftkings);
  assert.ok(mbappe.bookOdds.fanduel);
  assert.equal(parseAmericanOddsNumber(mbappe.americanOdds) != null, true);
});

test("mergeGoldenBootConsensus — more books tighten median toward middle", () => {
  const mbappe = { name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA" };
  const twoBook = mergeGoldenBootConsensus(
    [
      { book: "draftkings", ok: true, rows: [{ ...mbappe, americanOdds: "+600" }] },
      { book: "fanduel", ok: true, rows: [{ ...mbappe, americanOdds: "+800" }] },
    ],
    [],
  );
  const fiveBook = mergeGoldenBootConsensus(
    [
      { book: "draftkings", ok: true, rows: [{ ...mbappe, americanOdds: "+600" }] },
      { book: "fanduel", ok: true, rows: [{ ...mbappe, americanOdds: "+650" }] },
      { book: "betmgm", ok: true, rows: [{ ...mbappe, americanOdds: "+700" }] },
      { book: "paddypower", ok: true, rows: [{ ...mbappe, americanOdds: "+620" }] },
      { book: "oddschecker", ok: true, rows: [{ ...mbappe, americanOdds: "+680" }] },
    ],
    [],
  );
  const twoOdds = parseAmericanOddsNumber(twoBook.rows[0].americanOdds);
  const fiveOdds = parseAmericanOddsNumber(fiveBook.rows[0].americanOdds);
  assert.ok(twoOdds != null && fiveOdds != null);
  assert.equal(Object.keys(fiveBook.rows[0].bookOdds).length, 5);
  assert.ok(Math.abs(fiveOdds - 650) < Math.abs(twoOdds - 650));
});

test("mergeGoldenBootConsensus — filters nation-only outcomes", () => {
  const merged = mergeGoldenBootConsensus(
    [
      {
        book: "draftkings",
        ok: true,
        rows: [
          { name: "France", americanOdds: "+400", nationAbbr: "FRA" },
          { name: "Harry Kane", americanOdds: "+700", nationAbbr: "ENG" },
        ],
      },
    ],
    [],
  );
  assert.ok(!merged.rows.some((r) => r.name === "France"));
  assert.ok(merged.rows.some((r) => r.name === "Harry Kane"));
});

test("mergeGoldenBootWithSeed — fills gaps", () => {
  const rows = mergeGoldenBootWithSeed([], WC_GOLDEN_BOOT_SEED_ROWS);
  assert.ok(rows.length >= 10);
  assert.ok(rows[0].name);
});

test("americanFromFractional — converts UK prices", () => {
  assert.equal(americanFromFractional("5/1"), "+500");
  assert.equal(americanFromFractional("2/1"), "+200");
});

test("isPlausibleGoldenBootRow — drops DK HTML parser junk", () => {
  assert.equal(isPlausibleGoldenBootRow({ name: "Fworld-cup", americanOdds: "-2026" }), false);
  assert.equal(
    isPlausibleGoldenBootRow({ name: "Minimum leg odds of", americanOdds: "-200" }),
    false,
  );
  assert.equal(
    isPlausibleGoldenBootRow({ name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA" }),
    true,
  );
  const filtered = goldenBootRowsFromKv({
    rows: [
      { name: "Fworld-cup", americanOdds: "-2026", impliedRank: 1 },
      { name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA", impliedRank: 2 },
    ],
  });
  assert.match(filtered[0].name, /Mbapp/);
});

test("isPlausibleGoldenBootRow — rejects golfers without FIFA nation", () => {
  assert.equal(
    isPlausibleGoldenBootRow({ name: "Patrick Cantlay", americanOdds: "+2500" }),
    false,
  );
  assert.equal(
    isPlausibleGoldenBootRow({ name: "Paul Casey", americanOdds: "+4500" }),
    false,
  );
});

test("goldenBootRowsFromKv — prod bleed fixture drops golfers, keeps footballers", () => {
  const filtered = goldenBootRowsFromKv({
    rows: [
      { name: "Patrick Cantlay", americanOdds: "+2500", impliedRank: 9 },
      { name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA", impliedRank: 2 },
      { name: "Harry Kane", americanOdds: "+700", nationAbbr: "ENG", impliedRank: 4 },
      { name: "Erling Haaland", americanOdds: "+800", nationAbbr: "NOR", impliedRank: 6 },
      { name: "Lamine Yamal", americanOdds: "+900", nationAbbr: "ESP", impliedRank: 8 },
      { name: "Vinícius Júnior", americanOdds: "+1000", nationAbbr: "BRA", impliedRank: 10 },
    ],
  }, 5);
  assert.equal(filtered.length, 5);
  assert.ok(filtered.every((r) => !/cantlay|casey|leishman/i.test(r.name)));
  assert.match(filtered[0].name, /Mbapp/);
});

test("mergeGoldenBootConsensus — skips book rows without nationAbbr", () => {
  const merged = mergeGoldenBootConsensus(
    [
      {
        book: "draftkings",
        ok: true,
        rows: [
          { name: "Patrick Cantlay", americanOdds: "+2500" },
          { name: "Harry Kane", americanOdds: "+700", nationAbbr: "ENG" },
        ],
      },
    ],
    [],
  );
  assert.ok(!merged.rows.some((r) => /cantlay/i.test(r.name)));
  assert.ok(merged.rows.some((r) => r.name === "Harry Kane"));
});
