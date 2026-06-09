import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("wcBdlPolicy", () => {
  it("isWcGoatPrimaryEnabled respects WC_BDL_GOAT_PRIMARY=0", async () => {
    const prevKey = process.env.BALLDONTLIE_API_KEY;
    const prevFlag = process.env.WC_BDL_GOAT_PRIMARY;
    process.env.BALLDONTLIE_API_KEY = "test-key";
    process.env.WC_BDL_GOAT_PRIMARY = "0";
    const { isWcGoatPrimaryEnabled, hasWcBdlApiKey } = await import("./wcBdlPolicy.js");
    assert.equal(hasWcBdlApiKey(), true);
    assert.equal(isWcGoatPrimaryEnabled(), false);
    process.env.BALLDONTLIE_API_KEY = prevKey;
    process.env.WC_BDL_GOAT_PRIMARY = prevFlag;
  });
});

describe("wcBdlNormalize player props", () => {
  it("maps BDL anytime_goal to anytime_scorer", async () => {
    const { normalizeBdlPlayerPropsToMarkets } = await import("../api/_wcBdlNormalize.js");
    const markets = normalizeBdlPlayerPropsToMarkets([
      {
        prop_type: "anytime_goal",
        vendor: "draftkings",
        player: { name: "Lionel Messi" },
        market: { type: "milestone", odds: 450 },
      },
    ]);
    assert.equal(markets.anytime_scorer.length, 1);
    assert.equal(markets.anytime_scorer[0].name, "Lionel Messi");
    assert.equal(markets.anytime_scorer[0].americanOdds, "+450");
  });
});
