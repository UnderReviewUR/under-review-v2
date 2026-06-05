import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveWcVenue, formatVenueWarningsForPrompt } from "./wcVenueMetadata.js";

describe("resolveWcVenue", () => {
  test("Mexico City / Azteca is high altitude", () => {
    const v = resolveWcVenue("Estadio Azteca", "Mexico City");
    assert.ok(v);
    assert.equal(v.highAltitude, true);
    assert.equal(v.country, "MEX");
    assert.ok(v.altitudeFt >= 7000);
    assert.ok(v.altitudeNote);
  });

  test("Guadalajara is high altitude", () => {
    const v = resolveWcVenue("Estadio Akron", "Guadalajara");
    assert.ok(v);
    assert.equal(v.highAltitude, true);
    assert.equal(v.country, "MEX");
  });

  test("MetLife is not high altitude", () => {
    const v = resolveWcVenue("MetLife Stadium", "East Rutherford");
    assert.ok(v);
    assert.equal(v.highAltitude, false);
    assert.equal(v.country, "USA");
    assert.equal(v.altitudeNote, null);
  });

  test("returns null for unknown venue", () => {
    const v = resolveWcVenue("Unknown Stadium", "Unknown City");
    assert.equal(v, null);
  });

  test("returns null for empty inputs", () => {
    assert.equal(resolveWcVenue(null, null), null);
    assert.equal(resolveWcVenue("", ""), null);
  });
});

describe("formatVenueWarningsForPrompt", () => {
  test("returns warning for high altitude fixture", () => {
    const result = formatVenueWarningsForPrompt([
      { homeTeam: "MEX", awayTeam: "RSA", stadium: "Estadio Azteca", city: "Mexico City" },
    ]);
    assert.ok(result);
    assert.ok(result.includes("VENUE CONDITIONS"));
    assert.ok(result.includes("7,349 ft"));
    assert.ok(result.includes("MEX vs RSA"));
  });

  test("returns null for sea-level fixture", () => {
    const result = formatVenueWarningsForPrompt([
      { homeTeam: "USA", awayTeam: "ENG", stadium: "MetLife Stadium", city: "East Rutherford" },
    ]);
    assert.equal(result, null);
  });

  test("returns null for empty fixtures", () => {
    assert.equal(formatVenueWarningsForPrompt([]), null);
    assert.equal(formatVenueWarningsForPrompt(null), null);
  });
});
