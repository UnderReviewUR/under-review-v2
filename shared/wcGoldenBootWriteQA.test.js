import test from "node:test";
import assert from "node:assert/strict";
import { gateGoldenBootKvWrite } from "./wcGoldenBootWriteQA.js";

test("gateGoldenBootKvWrite allows ESPN-backed rows", () => {
  const gate = gateGoldenBootKvWrite(
    [
      { name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA" },
      { name: "Harry Kane", americanOdds: "+700", nationAbbr: "ENG" },
      { name: "Erling Haaland", americanOdds: "+1400", nationAbbr: "NOR" },
    ],
    { source: "consensus", booksUsed: ["espn", "fanduel"] },
  );
  assert.equal(gate.allowWrite, true);
  assert.ok(gate.verifiedCount >= 3);
});
