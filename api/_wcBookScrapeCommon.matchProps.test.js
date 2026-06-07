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

test("parseMatchPlayerPropRowsFromJson extracts extended player prop markets", () => {
  const samplePath = join(__dirname, "fixtures", "wc-match-props-extended-sample.json");
  const json = JSON.parse(readFileSync(samplePath, "utf8"));
  const markets = parseMatchPlayerPropRowsFromJson(json, { homeTeam: "BRA", awayTeam: "FRA" });
  assert.ok((markets.anytime_scorer || []).length >= 3);
  assert.equal((markets.player_assists_ou || []).length, 2);
  assert.equal((markets.player_sot_ou || []).length, 1);
  assert.equal((markets.player_card || []).length, 1);
  const assist = markets.player_assists_ou.find((r) => /Mbapp/i.test(r.name));
  assert.equal(assist?.line, "0.5");
  assert.equal(assist?.side, "over");
  const card = markets.player_card[0];
  assert.equal(card?.side, "yes");
});
