import assert from "node:assert/strict";
import test from "node:test";
import {
  filterMatchPlayerPropScrapeRows,
  isMatchPlayerPropParserJunkName,
} from "./wcMatchPlayerPropRowGuard.js";

test("filterMatchPlayerPropScrapeRows - blocks golf bleed and parser junk", () => {
  const rows = [
    { name: "Patrick Cantlay", americanOdds: "+2500" },
    { name: "Paul Casey", americanOdds: "+4500" },
    { name: "The top", americanOdds: "-15" },
    { name: "We often see him go off at", americanOdds: "+6600" },
    { name: "Minimum leg odds of", americanOdds: "-200" },
    { name: "Fworld-cup", americanOdds: "-2026" },
    { name: "Alexis Vega", americanOdds: "+450", nationAbbr: "MEX" },
  ];
  const out = filterMatchPlayerPropScrapeRows(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Alexis Vega");
});

test("isMatchPlayerPropParserJunkName - flags editorial fragments", () => {
  assert.equal(isMatchPlayerPropParserJunkName("Minimum leg odds of"), true);
  assert.equal(isMatchPlayerPropParserJunkName("Lionel Messi"), false);
});
