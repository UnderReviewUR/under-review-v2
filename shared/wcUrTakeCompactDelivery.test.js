import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
} from "./wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("buildWcCompactStructured — player market PASS is short", () => {
  const s = buildWcCompactStructured({
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    playerMarketTier: "market_only",
    summary:
      "Mbappé at +600 is fairly priced — PASS. France group favorite is context only.",
    deep: "Haaland +800 is the main alt if you want longer odds.",
  });
  assert.match(s.call, /PASS/i);
  assert.match(s.call, /\+600/);
  assert.ok(s.whyNow.length <= 320);
  assert.equal(s.edge.length <= 200, true);
});

test("buildWcCompactStructured — structural headline not cut at 100 chars", () => {
  const longLead =
    "Group E is the sharpest mispricing — Germany (Contender) is undervalued to advance second behind Ecuador in the group-winner market.";
  const s = buildWcCompactStructured({
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: `${longLead} Netherlands path is the coin flip.`,
    deep: "",
  });
  assert.match(s.call, /Ecuador/i);
  assert.ok(s.call.length > 100);
});

test("formatWcCompactDisplayText — no section headers", () => {
  const text = formatWcCompactDisplayText(
    {
      lean: "Lean: PASS — Mbappé +600.",
      call: "PASS — Mbappé +600",
      confidence: "Speculative",
      whyNow: "Haaland +800 is the alt.",
    },
    "",
  );
  assert.ok(!/MATCH READ/i.test(text));
  assert.match(text, /THE PLAY/);
});
