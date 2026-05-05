import test from "node:test";
import assert from "node:assert/strict";

import { getSlipImageRouteMeta, shouldDowngradeVagueSlipToGeneral } from "./_slipImageIntent.js";

test("getSlipImageRouteMeta — no image never routes to slip", () => {
  assert.deepEqual(getSlipImageRouteMeta("my parlay thoughts", false), {
    routesToSlip: false,
    via: null,
  });
});

test("getSlipImageRouteMeta — explicit slip language + image", () => {
  assert.deepEqual(getSlipImageRouteMeta("rate my slip", true), {
    routesToSlip: true,
    via: "explicit",
  });
});

test("getSlipImageRouteMeta — keyword cues (odds / legs) without saying slip", () => {
  assert.deepEqual(getSlipImageRouteMeta("what do you think of these odds", true), {
    routesToSlip: true,
    via: "keywords",
  });
  assert.deepEqual(getSlipImageRouteMeta("5 legs — too chalky?", true), {
    routesToSlip: true,
    via: "keywords",
  });
});

test("getSlipImageRouteMeta — vague captions + image (incl. empty = image-first upload)", () => {
  assert.deepEqual(getSlipImageRouteMeta("thoughts?", true), { routesToSlip: true, via: "vague" });
  assert.deepEqual(getSlipImageRouteMeta("What do you think?", true), {
    routesToSlip: true,
    via: "vague",
  });
  assert.deepEqual(getSlipImageRouteMeta("", true), { routesToSlip: true, via: "vague" });
});

test("getSlipImageRouteMeta — exclude non-betting screenshot questions from vague routing", () => {
  assert.deepEqual(getSlipImageRouteMeta("who won the game?", true), {
    routesToSlip: false,
    via: null,
  });
  assert.deepEqual(getSlipImageRouteMeta("who won?", true), {
    routesToSlip: false,
    via: null,
  });
});

test("getSlipImageRouteMeta — vacation photo caption does not auto-route", () => {
  assert.deepEqual(
    getSlipImageRouteMeta(
      "here is a picture from my trip to the museum it was really cool and we walked a lot",
      true,
    ),
    { routesToSlip: false, via: null },
  );
});

test("shouldDowngradeVagueSlipToGeneral — vague route + pipeline vague_no_betting_ui", () => {
  assert.equal(shouldDowngradeVagueSlipToGeneral("vague", "vague_no_betting_ui"), true);
});

test("shouldDowngradeVagueSlipToGeneral — explicit keywords route survives inventory miss wording", () => {
  assert.equal(shouldDowngradeVagueSlipToGeneral("explicit", "vague_no_betting_ui"), false);
  assert.equal(shouldDowngradeVagueSlipToGeneral("keywords", "vague_no_betting_ui"), false);
});

test("shouldDowngradeVagueSlipToGeneral — vague route but real slip UI detected", () => {
  assert.equal(shouldDowngradeVagueSlipToGeneral("vague", null), false);
  assert.equal(shouldDowngradeVagueSlipToGeneral("vague", undefined), false);
});

test("regression: vague caption + sportsbook keyword routes to slip; vague + no betting UI downgrades", () => {
  assert.deepEqual(getSlipImageRouteMeta("thoughts? draftkings", true), {
    routesToSlip: true,
    via: "keywords",
  });
  assert.equal(shouldDowngradeVagueSlipToGeneral("vague", "vague_no_betting_ui"), true);
});
