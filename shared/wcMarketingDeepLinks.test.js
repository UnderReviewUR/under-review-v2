import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWcAppDeepLink,
  isWorldCupMarketingPath,
  parseUrMarketingDeepLink,
  resolveUrColdLoadRoute,
  resolveWcMarketingPrompt,
  WC_LANDING_PROMPTS,
  WC_MARKETING_URL,
} from "./wcMarketingDeepLinks.js";

test("buildWcAppDeepLink uses main shell with sport=worldcup by default", () => {
  const url = buildWcAppDeepLink("groupValue");
  const u = new URL(url);
  assert.equal(u.pathname, "/");
  assert.equal(u.searchParams.get("sport"), "worldcup");
  assert.equal(u.searchParams.get("p"), "groupValue");
  assert.equal(u.searchParams.get("q"), null);
  assert.equal(u.searchParams.get("ask"), null);
});

test("buildWcAppDeepLink resolves full prompt to key when known", () => {
  const url = buildWcAppDeepLink(WC_LANDING_PROMPTS.winner);
  assert.equal(new URL(url).searchParams.get("p"), "winner");
});

test("buildWcAppDeepLink prefill uses ask=0", () => {
  const url = buildWcAppDeepLink("winner", { auto: false });
  const u = new URL(url);
  assert.equal(u.searchParams.get("p"), "winner");
  assert.equal(u.searchParams.get("ask"), "0");
});

test("buildWcAppDeepLink legacy query mode", () => {
  const url = buildWcAppDeepLink("winner", { path: false });
  const u = new URL(url);
  assert.equal(u.searchParams.get("sport"), "worldcup");
  assert.equal(u.searchParams.get("p"), "winner");
});

test("parseUrMarketingDeepLink accepts p= key", () => {
  const sp = new URLSearchParams("p=goldenBoot");
  const parsed = parseUrMarketingDeepLink(sp, "/worldcup");
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.promptKey, "goldenBoot");
  assert.ok(parsed.q.includes("Golden Boot"));
});

test("parseUrMarketingDeepLink legacy sport=worldcup and prompt alias", () => {
  const sp = new URLSearchParams("sport=worldcup&prompt=hello");
  const parsed = parseUrMarketingDeepLink(sp);
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.q, "hello");
});

test("parseUrMarketingDeepLink legacy wc=1 and ask=0", () => {
  const sp = new URLSearchParams("wc=1&p=darkHorse&ask=0");
  const parsed = parseUrMarketingDeepLink(sp);
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.prefillOnly, true);
  assert.equal(parsed.promptKey, "darkHorse");
});

test("parseUrMarketingDeepLink /worldcup path", () => {
  const sp = new URLSearchParams("p=winner");
  const parsed = parseUrMarketingDeepLink(sp, "/worldcup");
  assert.equal(parsed.isWorldCup, true);
  assert.equal(parsed.cleanPath, "/worldcup");
  assert.equal(isWorldCupMarketingPath("/worldcup/"), true);
});

test("resolveUrColdLoadRoute opens worldcup tab from bare /worldcup path", () => {
  const route = resolveUrColdLoadRoute("/worldcup", "");
  assert.equal(route.screen, "worldcup");
  assert.equal(route.tab, "worldcup");
  assert.equal(route.cleanPath, "/worldcup");
  assert.equal(route.wcDeepLinkAction, null);
});

test("resolveUrColdLoadRoute captures p= for auto-ask", () => {
  const route = resolveUrColdLoadRoute("/worldcup", "p=winner");
  assert.equal(route.screen, "worldcup");
  assert.ok(route.wcDeepLinkAction?.q.includes("World Cup 2026"));
  assert.equal(route.wcDeepLinkAction?.prefillOnly, false);
});

test("resolveWcMarketingPrompt maps keys", () => {
  assert.equal(resolveWcMarketingPrompt("winner").key, "winner");
  assert.equal(resolveWcMarketingPrompt("custom question").key, null);
});

test("WC_MARKETING_URL is the comment link base", () => {
  assert.equal(WC_MARKETING_URL, "https://under-review.app/worldcup");
});
