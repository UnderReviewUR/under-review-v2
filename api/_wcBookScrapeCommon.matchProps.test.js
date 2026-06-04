import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseMatchPlayerPropRowsFromJson } from "./_wcBookScrapeCommon.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("parseMatchPlayerPropRowsFromJson extracts anytime scorer market", () => {
  const samplePath = join(__dirname, "fixtures", "wc-match-props-book-sample.json");
  const json = JSON.parse(readFileSync(samplePath, "utf8"));
  const markets = parseMatchPlayerPropRowsFromJson(json, { homeTeam: "BRA", awayTeam: "FRA" });
  assert.ok((markets.anytime_scorer || []).length >= 3);
  assert.ok(markets.anytime_scorer.some((r) => /Mbapp/i.test(r.name)));
});
