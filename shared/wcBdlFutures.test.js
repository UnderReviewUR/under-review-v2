import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBdlFuturesIndex,
  buildWcBdlFuturesPromptBlock,
  formatWcBdlAdvancePriceAttribution,
  getBdlFuturesPrice,
  normalizeBdlFuturesRow,
  pickBestVendorOffer,
} from "./wcBdlFutures.js";
import { WC_ADVANCEMENT_MARKET } from "./wcAdvancementMarket.js";

test("normalizeBdlFuturesRow parses R16 futures", () => {
  const row = normalizeBdlFuturesRow({
    market_type: "to_reach_round_of_16",
    market_name: "To Reach Round of 16",
    subject: { abbreviation: "USA", name: "United States" },
    vendor: "draftkings",
    american_odds: -115,
  });
  assert.equal(row?.teamAbbr, "USA");
  assert.equal(row?.american, -115);
  assert.equal(row?.marketType, "to_reach_round_of_16");
});

test("pickBestVendorOffer prefers draftkings", () => {
  const offers = [
    normalizeBdlFuturesRow({
      market_type: "outright",
      subject: { abbreviation: "USA" },
      vendor: "fanduel",
      american_odds: 900,
    }),
    normalizeBdlFuturesRow({
      market_type: "outright",
      subject: { abbreviation: "USA" },
      vendor: "draftkings",
      american_odds: 850,
    }),
  ].filter(Boolean);
  assert.equal(pickBestVendorOffer(offers)?.vendor, "draftkings");
});

test("buildBdlFuturesIndex groups by market and team", () => {
  const index = buildBdlFuturesIndex([
    {
      market_type: "to_reach_round_of_16",
      subject: { abbreviation: "USA", name: "United States" },
      vendor: "draftkings",
      american_odds: -115,
    },
    {
      market_type: "outright",
      subject: { abbreviation: "USA", name: "United States" },
      vendor: "draftkings",
      american_odds: 1300,
    },
  ]);
  assert.equal(getBdlFuturesPrice(index.byMarketType, "to_reach_round_of_16", "USA")?.american, -115);
  assert.equal(getBdlFuturesPrice(index.byMarketType, "outright", "USA")?.american, 1300);
});

test("buildWcBdlFuturesPromptBlock binds R16 not outright", () => {
  const seed = {
    seededAt: Date.now(),
    byMarketType: {
      to_reach_round_of_16: { USA: { american: -115, americanDisplay: "-115", vendor: "draftkings" } },
      outright: { USA: { american: 1300, americanDisplay: "+1300", vendor: "draftkings" } },
    },
  };
  const block = buildWcBdlFuturesPromptBlock(
    seed,
    "Will the USMNT reach the Round of 16?",
    ["USA"],
  );
  assert.match(block, /Round of 16/i);
  assert.match(block, /-115/);
  assert.doesNotMatch(block, /\+1300/);
});

test("buildWcBdlFuturesPromptBlock returns null without seed", () => {
  assert.equal(buildWcBdlFuturesPromptBlock(null, "Will USA win?", ["USA"]), null);
});

test("formatWcBdlAdvancePriceAttribution cites BDL GOAT vendor line", () => {
  const line = formatWcBdlAdvancePriceAttribution("USA", {
    source: "balldontlie_live",
    lastUpdated: Date.UTC(2026, 5, 10),
    byMarketType: {
      qualify_from_group: {
        USA: { american: -750, americanDisplay: "-750", vendor: "draftkings" },
      },
    },
  });
  assert.match(line, /Book line: -750/);
  assert.match(line, /DraftKings via BallDontLie GOAT live/);
});
