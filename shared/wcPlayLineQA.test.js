import assert from "node:assert/strict";
import test from "node:test";
import { isWcValidPlayLine } from "./wcPlayLineQA.js";

test("isWcValidPlayLine — rejects production fragment", () => {
  assert.equal(isWcValidPlayLine("Lean: that actually holds."), false);
});

test("isWcValidPlayLine — accepts Boot lean", () => {
  assert.ok(isWcValidPlayLine("Lean: Lamine Yamal Golden Boot +900 — games-played edge."));
});

test("isWcValidPlayLine — accepts Pass with odds", () => {
  assert.ok(isWcValidPlayLine("Pass at +600 on Mbappé — fair Golden Boot price."));
});
