import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatNbaSlateBannerLine,
  inferNbaSlateDayLabel,
} from "./nbaTime.js";

describe("nbaTime slate banner", () => {
  const game = {
    awayTeam: { abbr: "SAS" },
    homeTeam: { abbr: "OKC" },
    startTimeUtc: "2026-05-23T01:30:00Z",
    slateDayLabel: "Tomorrow",
  };

  it("formats playoff banner with series and Tomorrow ET tip", () => {
    assert.equal(
      formatNbaSlateBannerLine(game, "Game 3"),
      "SAS @ OKC · Game 3 · Tomorrow 9:30 PM ET",
    );
    assert.equal(inferNbaSlateDayLabel(game), "Tomorrow");
  });
});
