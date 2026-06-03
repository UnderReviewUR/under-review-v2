import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWcOutrightOdds,
  mergeWcTeamsWithOutrights,
  resolveWcOutrightOdds,
} from "./wc2026OutrightOdds.js";

test("formatWcOutrightOdds renders em dash for null", () => {
  assert.equal(formatWcOutrightOdds(null), "—");
  assert.equal(formatWcOutrightOdds(undefined), "—");
  assert.equal(formatWcOutrightOdds(""), "—");
  assert.equal(formatWcOutrightOdds("+850"), "+850");
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
