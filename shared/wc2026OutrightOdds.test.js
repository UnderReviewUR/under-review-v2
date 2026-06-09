import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWcOutrightOdds,
  isPlausibleWcTournamentWinnerOdds,
  mergeWcTeamsWithOutrights,
  resolveWcOutrightOdds,
  sanitizeWcTournamentWinnerOutrights,
} from "./wc2026OutrightOdds.js";

test("formatWcOutrightOdds renders em dash for null", () => {
  assert.equal(formatWcOutrightOdds(null), "—");
  assert.equal(formatWcOutrightOdds(undefined), "—");
  assert.equal(formatWcOutrightOdds(""), "—");
  assert.equal(formatWcOutrightOdds("+850"), "+850 (9.50)");
});

test("resolveWcOutrightOdds prefers KV over static", () => {
  assert.equal(resolveWcOutrightOdds("BRA", { BRA: "+700" }, "+800"), "+700");
  assert.equal(resolveWcOutrightOdds("CZE", {}, null), null);
});

test("mergeWcTeamsWithOutrights overlays live prices", () => {
  const merged = mergeWcTeamsWithOutrights(
    [{ abbreviation: "CZE", outrightOdds: null }],
    { CZE: "+18000" },
  );
  assert.equal(merged[0].outrightOdds, "+18000");
  assert.equal(merged[0].outrightOddsSource, "kv");
});

test("mergeWcTeamsWithOutrights marks static fallback when KV missing", () => {
  const merged = mergeWcTeamsWithOutrights([{ abbreviation: "NOR", outrightOdds: "+2500" }], {});
  assert.equal(merged[0].outrightOdds, "+2500");
  assert.equal(merged[0].outrightOddsSource, "static");
});

test("mergeWcTeamsWithOutrights rejects group-winner ML from KV", () => {
  const merged = mergeWcTeamsWithOutrights(
    [{ abbreviation: "MEX", outrightOdds: "+7500" }],
    { MEX: "-110" },
  );
  assert.equal(merged[0].outrightOdds, "+7500");
  assert.equal(merged[0].outrightOddsSource, "static");
});

test("isPlausibleWcTournamentWinnerOdds rejects negative American lines", () => {
  assert.equal(isPlausibleWcTournamentWinnerOdds("-110"), false);
  assert.equal(isPlausibleWcTournamentWinnerOdds("+450"), true);
  const cleaned = sanitizeWcTournamentWinnerOutrights({ MEX: "-110", ESP: "+400" });
  assert.equal(cleaned.MEX, undefined);
  assert.equal(cleaned.ESP, "+400");
});
