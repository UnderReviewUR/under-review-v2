import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLineMovementContext,
  formatSpreadDisplay,
  normalizeSpreadFromOutcomes,
  resolveOutcomeTeamAbbr,
} from "./gameLineSpread.js";

describe("normalizeSpreadFromOutcomes", () => {
  it("CLE @ DET — home favorite DET -4.5 (not inverted CLE -4.5)", () => {
    const result = normalizeSpreadFromOutcomes({
      homeAbbr: "DET",
      awayAbbr: "CLE",
      homeName: "Detroit Pistons",
      awayName: "Cleveland Cavaliers",
      outcomes: [
        { name: "Detroit Pistons", point: -4.5 },
        { name: "Cleveland Cavaliers", point: 4.5 },
      ],
    });
    assert.ok(result);
    assert.equal(result.favoriteAbbr, "DET");
    assert.equal(result.underdogAbbr, "CLE");
    assert.equal(result.spreadPoint, -4.5);
    assert.equal(result.displayLine, "DET -4.5");
    assert.equal(result.favoriteIsHome, true);
  });

  it("never assigns home negative line to away abbr", () => {
    const result = normalizeSpreadFromOutcomes({
      homeAbbr: "DET",
      awayAbbr: "CLE",
      homeName: "Detroit Pistons",
      awayName: "Cleveland Cavaliers",
      outcomes: [
        { name: "Cleveland Cavaliers", point: 4.5 },
        { name: "Detroit Pistons", point: -4.5 },
      ],
    });
    assert.equal(result?.displayLine, "DET -4.5");
    assert.notEqual(result?.displayLine, "CLE -4.5");
  });

  it("away favorite OKC -7 at home CHA", () => {
    const result = normalizeSpreadFromOutcomes({
      homeAbbr: "CHA",
      awayAbbr: "OKC",
      outcomes: [
        { name: "Oklahoma City Thunder", point: -7 },
        { name: "Charlotte Hornets", point: 7 },
      ],
    });
    assert.equal(result.favoriteAbbr, "OKC");
    assert.equal(result.favoriteIsHome, false);
    assert.equal(result.displayLine, "OKC -7");
  });

  it("returns null when no negative spread outcome", () => {
    const result = normalizeSpreadFromOutcomes({
      homeAbbr: "BOS",
      awayAbbr: "MIA",
      outcomes: [
        { name: "Boston Celtics", point: 3 },
        { name: "Miami Heat", point: 3 },
      ],
    });
    assert.equal(result, null);
  });
});

describe("resolveOutcomeTeamAbbr", () => {
  it("maps full team names to abbr", () => {
    assert.equal(
      resolveOutcomeTeamAbbr("Detroit Pistons", "DET", "CLE", "Detroit Pistons", "Cleveland Cavaliers"),
      "DET",
    );
    assert.equal(
      resolveOutcomeTeamAbbr("Cleveland Cavaliers", "DET", "CLE", "Detroit Pistons", "Cleveland Cavaliers"),
      "CLE",
    );
  });
});

describe("buildLineMovementContext", () => {
  it("builds sharp-money narrative when line moves", () => {
    const ctx = buildLineMovementContext(
      [{ displayLine: "DET -2.5", capturedAt: "2026-05-10T10:00:00.000Z", offsetHours: 12 }],
      { displayLine: "DET -4.5", capturedAt: "2026-05-10T22:00:00.000Z" },
    );
    assert.equal(ctx.hasMovement, true);
    assert.match(ctx.narrative, /opened DET -2\.5/);
    assert.match(ctx.narrative, /now DET -4\.5/);
  });
});

describe("formatSpreadDisplay", () => {
  it("formats PK at zero", () => {
    assert.equal(formatSpreadDisplay("DET", 0), "DET PK");
  });
});
