import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
} from "./wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("buildWcCompactStructured — player market PASS keeps complete sentences", () => {
  const s = buildWcCompactStructured({
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    playerMarketTier: "market_only",
    summary:
      "Market has the name — France's path is what books underprice. Market +600 · UR path ~+318.",
    deep:
      "France projects six knockout games with Mbappé as primary scorer. Pass at +600 — fair favorite. Watch for lineup confirmation and a shorter French run.",
  });
  assert.match(s.call, /Market has the name/);
  assert.match(s.line, /\+600/);
  assert.match(s.call, /\.$/);
  assert.match(s.whyNow, /\.$/);
  assert.match(s.edge, /\.$/);
  assert.ok(s.breakdownAvailable);
});

test("buildWcCompactStructured — structural headline is full sentence", () => {
  const longLead =
    "Group E is the sharpest mispricing — Germany (Contender) is undervalued to advance second behind Ecuador in the group-winner market.";
  const s = buildWcCompactStructured({
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: `${longLead} Netherlands path is the coin flip.`,
    deep: "Germany's bracket opens if they finish second. Watch for Ecuador upset variance in the opener.",
  });
  assert.match(s.call, /Ecuador/i);
  assert.match(s.call, /\.$/);
  assert.match(s.line, /Netherlands/i);
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
