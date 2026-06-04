import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEspnGoldenBootFutures } from "./_wcEspnPlayerFutures.js";

test("normalizeEspnGoldenBootFutures — skips team winner market", () => {
  const { rows } = normalizeEspnGoldenBootFutures({
    items: [
      {
        displayName: "World Cup Winner",
        entries: [{ team: { abbreviation: "FRA" }, odds: { american: 400 } }],
      },
      {
        displayName: "Golden Boot Winner",
        entries: [
          {
            athlete: { displayName: "Kylian Mbappé", id: "1" },
            team: { abbreviation: "FRA" },
            odds: { american: 600 },
          },
          {
            athlete: { displayName: "Harry Kane", id: "2" },
            team: { abbreviation: "ENG" },
            odds: { american: 700 },
          },
        ],
      },
    ],
  });

  assert.ok(rows.length >= 2);
  assert.ok(rows.some((r) => r.name.includes("Mbapp")));
  assert.ok(!rows.some((r) => r.name === "FRA"));
});
