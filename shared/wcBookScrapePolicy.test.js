import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWcMatchPlayerPropsUrlTemplate,
  isWcBookRegionEnabled,
  isWcGoldenBootBookEnabled,
  listWcMatchPlayerPropsScrapeUrls,
  wcBookScrapeFlagsSnapshot,
} from "./wcBookScrapePolicy.js";

test("UK, aggregator, and media regions default off without env", () => {
  const prevUk = process.env.WC_SCRAPE_UK;
  const prevAgg = process.env.WC_SCRAPE_AGG;
  const prevMedia = process.env.WC_SCRAPE_MEDIA;
  const prevVercel = process.env.VERCEL_ENV;
  delete process.env.WC_SCRAPE_UK;
  delete process.env.WC_SCRAPE_AGG;
  delete process.env.WC_SCRAPE_MEDIA;
  delete process.env.VERCEL_ENV;
  try {
    assert.equal(isWcBookRegionEnabled("uk"), false);
    assert.equal(isWcBookRegionEnabled("agg"), false);
    assert.equal(isWcBookRegionEnabled("media"), false);
    assert.equal(isWcGoldenBootBookEnabled("paddypower"), false);
    assert.equal(isWcGoldenBootBookEnabled("oddschecker"), false);
    assert.equal(isWcGoldenBootBookEnabled("actionnetwork"), false);
  } finally {
    if (prevUk !== undefined) process.env.WC_SCRAPE_UK = prevUk;
    if (prevAgg !== undefined) process.env.WC_SCRAPE_AGG = prevAgg;
    if (prevMedia !== undefined) process.env.WC_SCRAPE_MEDIA = prevMedia;
    if (prevVercel !== undefined) process.env.VERCEL_ENV = prevVercel;
  }
});

test("wcBookScrapeFlagsSnapshot includes alert-friendly structure", () => {
  const snap = wcBookScrapeFlagsSnapshot();
  assert.ok(snap.goldenBootSourcesRegistered >= 25);
  assert.ok(snap.goldenBoot);
  assert.ok("draftkings" in snap.goldenBoot);
  assert.ok(snap.regions);
});

test("applyWcMatchPlayerPropsUrlTemplate substitutes team slugs from registry", () => {
  const url = applyWcMatchPlayerPropsUrlTemplate(
    "https://sportsbook.fanduel.com/soccer/fifa-world-cup-2026/{home}-v-{away}",
    { homeTeam: "BRA", awayTeam: "FRA", eventId: "760416" },
  );
  assert.equal(url, "https://sportsbook.fanduel.com/soccer/fifa-world-cup-2026/brazil-v-france");
});

test("listWcMatchPlayerPropsScrapeUrls returns primary plus event fallback", () => {
  const urls = listWcMatchPlayerPropsScrapeUrls("draftkings", {
    eventId: "760416",
    homeTeam: "BRA",
    awayTeam: "FRA",
  });
  assert.ok(urls.length >= 2);
  assert.ok(urls[0].includes("draftkings.com"));
  assert.equal(urls[1], "https://sportsbook.draftkings.com/event/760416");
});
