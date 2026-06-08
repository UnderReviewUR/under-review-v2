import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNbaRecentFormFromH2h } from "./_nbaH2hSplits.js";

describe("buildNbaRecentFormFromH2h", () => {
  it("summarizes last meeting from split row", () => {
    const text = buildNbaRecentFormFromH2h([
      {
        summary: "SAS ATS 1-1 vs NYK (3 meetings with lines)",
        meetings: [
          {
            awayAbbr: "NYK",
            homeAbbr: "SAS",
            awayScore: 105,
            homeScore: 110,
            closingSpread: "SAS -4.5",
          },
        ],
      },
    ]);
    assert.match(text, /SAS ATS 1-1/);
    assert.match(text, /NYK 105/);
  });
});
