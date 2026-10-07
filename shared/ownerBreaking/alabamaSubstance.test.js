import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractLikelyPersonNames,
  formatAlabamaPushBody,
  hasAlabamaSubstance,
  isVagueAlabamaTopic,
} from "./alabamaSubstance.js";

describe("isVagueAlabamaTopic", () => {
  it("flags coach / injury topic labels the owner hated", () => {
    assert.equal(isVagueAlabamaTopic("Alabama coach updates"), true);
    assert.equal(isVagueAlabamaTopic("Injuries for starting players"), true);
    assert.equal(isVagueAlabamaTopic("Alabama injury update — ESPN"), true);
    assert.equal(isVagueAlabamaTopic("What we know about Alabama injuries"), true);
  });

  it("keeps concrete status lines", () => {
    assert.equal(
      isVagueAlabamaTopic("Jalen Milroe questionable vs Georgia — ankle"),
      false,
    );
  });
});

describe("hasAlabamaSubstance", () => {
  it("requires name or actionable fact — drops empty blurbs", () => {
    assert.equal(hasAlabamaSubstance("Alabama coach updates"), false);
    assert.equal(hasAlabamaSubstance("Injuries for starting players"), false);
    assert.equal(hasAlabamaSubstance("Alabama limited in practice Friday"), false);
  });

  it("keeps named injury / availability", () => {
    assert.equal(
      hasAlabamaSubstance("Jalen Milroe questionable vs Georgia — ankle"),
      true,
    );
    assert.equal(
      hasAlabamaSubstance("Alabama QB ruled out with ankle injury vs Georgia"),
      true,
    );
  });

  it("salvages vague title when description has the fact", () => {
    assert.equal(
      hasAlabamaSubstance(
        "Alabama injury update",
        "Jalen Milroe is questionable vs Georgia with an ankle injury.",
      ),
      true,
    );
  });

  it("keeps coaching hire/fire with a person or role", () => {
    assert.equal(
      hasAlabamaSubstance("Alabama fires defensive coordinator"),
      true,
    );
    assert.equal(
      hasAlabamaSubstance("Alabama names John Smith offensive coordinator"),
      true,
    );
  });
});

describe("extractLikelyPersonNames", () => {
  it("finds people and skips Crimson Tide", () => {
    const names = extractLikelyPersonNames(
      "Jalen Milroe questionable — Crimson Tide vs Georgia",
    );
    assert.ok(names.some((n) => /Milroe/i.test(n)));
    assert.ok(!names.some((n) => /Crimson Tide/i.test(n)));
  });
});

describe("formatAlabamaPushBody", () => {
  it("puts the named fact on the lock screen", () => {
    const body = formatAlabamaPushBody({
      title: "Jalen Milroe questionable vs Georgia with ankle injury - ESPN",
      description: "",
    });
    assert.match(body, /Milroe/i);
    assert.match(body, /questionable|ankle|Georgia/i);
    assert.doesNotMatch(body, /ESPN/i);
  });

  it("pulls substance from description when title is a topic label", () => {
    const body = formatAlabamaPushBody({
      title: "Alabama coach updates",
      description: "Alabama names John Smith offensive coordinator.",
    });
    assert.match(body, /John Smith/i);
    assert.match(body, /coordinator/i);
    assert.doesNotMatch(body, /coach updates/i);
  });
});
