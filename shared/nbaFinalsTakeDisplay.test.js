import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNbaFinalsDisplayHeadline,
  parseNbaFinalsScannableTake,
  scrubStaleFinalsTiedCopy,
  shouldReplaceNbaFinalsHeadline,
} from "./nbaFinalsTakeDisplay.js";

test("parseNbaFinalsScannableTake — labeled format", () => {
  const raw = `SHARP ANGLE: Wembanyama under 10 rebounds
Context: NYK pace control suppresses boards.
The Play: Line at 10.5+ → UNDER
Confidence: Medium
Watch For: Early foul count
One Thing: SAS pace spike flips it`;
  const p = parseNbaFinalsScannableTake(raw);
  assert.ok(p?.parsed);
  assert.match(p.sharpAngle, /Wembanyama/i);
  assert.equal(p.confidence, "Medium");
});

test("shouldReplaceNbaFinalsHeadline — Game 3 SA road error", () => {
  assert.equal(
    shouldReplaceNbaFinalsHeadline(
      "NYK leads 2-0 heading into Game 3 on the road in San Antonio.",
      { finalsGameNumber: 3 },
    ),
    true,
  );
});

test("extractNbaFinalsHeuristicSections — legacy prose wall", () => {
  const sample = `THE FRAGILE ASSUMPTION
that New York's perimeter depth will replicate suffocation. Wembanyama's rebound line is the sharpest angle.
If his line posts at 10.5 or higher, under is the play.
The live trigger: if Wembanyama plays under 28 minutes in the first half.
Confidence: Medium. Look for Wembanyama under 10.`;
  const p = parseNbaFinalsScannableTake(sample);
  assert.ok(p);
  assert.match(p.sharpAngle || "", /Wembanyama|under/i);
  assert.equal(p.confidence, "Medium");
});

test("scrubStaleFinalsTiedCopy — replaces model stale lean with nbaRelevance", () => {
  const out = scrubStaleFinalsTiedCopy(
    "Series tied 0-0 — Game 3 in New York. Knicks are 2-0 ATS.",
    {
      finalsMode: true,
      finalsGameNumber: 3,
      finalsSeriesSummary: "Knicks lead series 2-0",
    },
    "provide 3 leg player parlay for nba game tonight",
  );
  assert.match(out, /Knicks lead series 2-0/i);
  assert.doesNotMatch(out, /tied 0-0/i);
});

test("buildNbaFinalsDisplayHeadline — Game 3 NY", () => {
  const h = buildNbaFinalsDisplayHeadline(
    {
      finalsMode: true,
      finalsGameNumber: 3,
      finalsSeriesSummary: "Knicks lead series 2-0",
    },
    "Game 3 preview",
  );
  assert.ok(h);
  assert.match(h, /Game 3/i);
  assert.match(h, /New York|SAS @ NYK/i);
});
