import assert from "node:assert/strict";
import test from "node:test";
import {
  scoreWcCardContractVoice,
  wcCardHeadlineAnnouncesOnly,
  wcCardPlayRestatesCall,
} from "./wcCardContractVoice.js";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("wcCardPlayRestatesCall flags duplicate lean and call", () => {
  const call = "Mbappé at +600 is the consensus Golden Boot favorite.";
  const lean = "Lean: Mbappé at +600 is the consensus Golden Boot favorite.";
  assert.equal(wcCardPlayRestatesCall(lean, call), true);
});

test("wcCardHeadlineAnnouncesOnly flags consensus-only headlines", () => {
  assert.equal(
    wcCardHeadlineAnnouncesOnly("Mbappé at +600 is the consensus Golden Boot favorite."),
    true,
  );
  assert.equal(
    wcCardHeadlineAnnouncesOnly("Market has the name — France's path is underpriced."),
    false,
  );
});

test("scoreWcCardContractVoice passes arguing card shape", () => {
  const good = scoreWcCardContractVoice({
    call: "Books price Spain to win; sims price Spain for volume.",
    line: "Market ESP +450 · UR sims ~+380.",
    lean: "Lean Spain goals leader — structural volume, not a single prop yet.",
    whyNow: "Spain wins 45% of sims with 83% QF rate.",
    edge: "Early knockout exit or rotated XI before lineups confirm.",
    callType: "analysis",
  });
  assert.equal(good.passed, true, good.issues.join(", "));
});

test("buildWcCompactStructured separates play from headline", () => {
  const structured = buildWcCompactStructured({
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    playerMarketTier: "market_only",
    summary:
      "Market has the name — France's path is what books underprice. Market +600 · UR path ~+318.",
    deep:
      "France projects six games with Mbappé as primary scorer. Pass at +600 — fair favorite, not mispriced. Watch for lineup confirmation and a shorter knockout run.",
  });
  assert.ok(structured.call.includes("Market has the name"));
  assert.equal(wcCardPlayRestatesCall(structured.lean, structured.call), false);
  assert.ok(structured.edge.length >= 12);
  assert.match(structured.lean, /pass/i);
});
