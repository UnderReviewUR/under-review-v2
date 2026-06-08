import test from "node:test";
import assert from "node:assert/strict";
import {
  WC_GOLDEN_BOOT_SOURCE_COUNT,
  WC_GOLDEN_BOOT_SOURCE_REGISTRY,
} from "./wcGoldenBootSourceRegistry.js";
import { listEnabledWcGoldenBootBooks } from "./wcBookScrapePolicy.js";
import { validateGoldenBootKvRows } from "./wcGoldenBootWriteQA.js";

test("registry includes 25+ golden boot sources", () => {
  assert.ok(WC_GOLDEN_BOOT_SOURCE_COUNT >= 27);
  assert.ok(WC_GOLDEN_BOOT_SOURCE_REGISTRY.paddypower);
  assert.ok(WC_GOLDEN_BOOT_SOURCE_REGISTRY.bet365);
  assert.ok(WC_GOLDEN_BOOT_SOURCE_REGISTRY.sky_sports);
  assert.ok(WC_GOLDEN_BOOT_SOURCE_REGISTRY.actionnetwork);
  assert.ok(WC_GOLDEN_BOOT_SOURCE_REGISTRY.vsin);
  assert.ok(WC_GOLDEN_BOOT_SOURCE_REGISTRY.oddsshark);
  assert.equal(
    WC_GOLDEN_BOOT_SOURCE_REGISTRY.covers.defaultUrl,
    "https://www.covers.com/world-cup",
  );
  assert.equal(
    WC_GOLDEN_BOOT_SOURCE_REGISTRY.oddschecker.defaultUrl,
    "https://www.oddschecker.com/us/soccer/world-cup",
  );
});

test("listEnabledWcGoldenBootBooks includes US defaults locally", () => {
  const prev = { ...process.env };
  delete process.env.WC_SCRAPE_UK;
  delete process.env.WC_SCRAPE_AGG;
  delete process.env.WC_SCRAPE_MEDIA;
  delete process.env.VERCEL_ENV;
  try {
    const enabled = listEnabledWcGoldenBootBooks();
    assert.ok(enabled.includes("draftkings"));
    assert.ok(enabled.includes("fanduel"));
    assert.ok(enabled.includes("betmgm"));
  } finally {
    process.env = prev;
  }
});

test("validateGoldenBootKvRows rejects golf bleed sample", () => {
  const qa = validateGoldenBootKvRows(
    [
      { name: "Patrick Cantlay", americanOdds: "+2500", nationAbbr: "USA" },
      { name: "Paul Casey", americanOdds: "+4500", nationAbbr: "ENG" },
    ],
    { source: "consensus", booksUsed: ["draftkings"] },
  );
  assert.equal(qa.ok, false);
});
