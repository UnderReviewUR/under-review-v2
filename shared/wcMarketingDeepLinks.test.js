import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWcAppDeepLink,
  isWorldCupMarketingPath,
  parseUrMarketingDeepLink,
  WC_LANDING_PROMPTS,
} from "./wcMarketingDeepLinks.js";

test("buildWcAppDeepLink uses /worldcup path by default", () => {
  const url = buildWcAppDeepLink(WC_LANDING_PROMPTS.groupValue);
  const u = new URL(url);
  assert.equal(u.pathname, "/worldcup");
  assert.ok(u.searchParams.get("q")?.includes("group-stage"));
  assert.equal(u.searchParams.get("prefill"), null);
});

test("buildWcAppDeepLink legacy query mode", () => {
  const url = buildWcAppDeepLink("test", { path: false });
  const u = new URL(url);
  assert.equal(u.searchParams.get("sport"), "worldcup");
});

test("buildWcAppDeepLink prefill mode", () => {
  const url = buildWcAppDeepLink("test", { auto: false });
  assert.equal(new URL(url).searchParams.get("prefill"), "1");
});

test("parseUrMarketingDeepLink accepts sport=worldcup and prompt alias", () => {
  const sp = new URLSearchParams("sport=worldcup&prompt=hello");
  const parsed = parseUrMarketingDeepLink(sp);
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.q, "hello");
});

test("parseUrMarketingDeepLink legacy wc=1", () => {
  const sp = new URLSearchParams("wc=1&q=dark%20horse");
  const parsed = parseUrMarketingDeepLink(sp);
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.q, "dark horse");
});

test("parseUrMarketingDeepLink /worldcup path", () => {
  const sp = new URLSearchParams("q=hello");
  const parsed = parseUrMarketingDeepLink(sp, "/worldcup");
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.cleanPath, "/worldcup");
  assert.equal(isWorldCupMarketingPath("/worldcup/"), true);
});
