import assert from "node:assert/strict";
import test from "node:test";
import { buildWcGroundingStripModel } from "./wcGroundingCardUi.js";

test("buildWcGroundingStripModel formats Phase 1 Ghana vs Panama strip", () => {
  const model = buildWcGroundingStripModel({
    pinBanner: {
      headline: "Ghana vs Panama",
      subline: "Live · 1st half, 2'",
      homeAbbr: "GHA",
      awayAbbr: "PAN",
    },
    inventoryStrip: {
      posted: ["Shots", "SOT"],
      notPosted: ["Anytime goals"],
      freshnessLabel: "Updated 45s ago (BDL)",
    },
  });

  assert.equal(model?.pinnedLine, "PINNED · Ghana vs Panama (GHA–PAN)");
  assert.equal(model?.statusLine, "Live · 1st half, 2' · Updated 45s ago (BDL)");
  assert.equal(model?.postedLine, "Posted: Shots · SOT");
  assert.equal(model?.notPostedLine, "Not posted: Anytime goals");
});
