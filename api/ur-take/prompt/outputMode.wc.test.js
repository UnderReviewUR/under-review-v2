import assert from "node:assert/strict";
import test from "node:test";
import { buildJsonOutputContract } from "./outputMode.js";
import { WC_INTENT } from "../../../shared/wcUrTakeIntent.js";

test("buildJsonOutputContract worldcup tier2_5 does not throw", () => {
  const block = buildJsonOutputContract("tier2_5_json", "worldcup", {
    wcIntent: WC_INTENT.STRUCTURAL,
  });
  assert.match(block, /OUTPUT CONTRACT/);
  assert.match(block, /WORLD CUP/);
});

test("buildJsonOutputContract worldcup player market tier2_5", () => {
  const block = buildJsonOutputContract("tier2_5_json", "worldcup", {
    wcIntent: WC_INTENT.GOLDEN_BOOT,
  });
  assert.match(block, /PLAYER MARKET|WORLD CUP PLAYER/i);
});
