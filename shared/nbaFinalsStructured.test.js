import assert from "node:assert/strict";
import test from "node:test";
import { buildNbaFinalsDisplayHeadline } from "./nbaFinalsTakeDisplay.js";
import {
  buildNbaFinalsStructuredForDelivery,
  formatNbaFinalsStructuredDisplayText,
  isNbaFinalsStructured,
  normalizeNbaFinalsStructuredFields,
  nbaFinalsStructuredToCardSections,
  repairNbaFinalsStructuredFields,
  sanitizeNbaFinalsFaceText,
  splitMergedNbaFinalsFields,
  validateNbaFinalsStructuredResponse,
} from "./nbaFinalsStructured.js";

test("normalizeNbaFinalsStructuredFields — accepts snake_case", () => {
  const fields = normalizeNbaFinalsStructuredFields({
    sharp_angle: "Wembanyama under 10 rebounds",
    context: "NYK pace suppresses boards.",
    the_play: "Line 10.5+ → UNDER",
    confidence: "medium",
    watch_for: "Early foul count",
    one_thing: "SAS pace spike flips it",
  });
  assert.ok(fields);
  assert.equal(fields.confidence, "Medium");
  assert.equal(validateNbaFinalsStructuredResponse(fields).valid, true);
});

test("buildNbaFinalsStructuredForDelivery — callType nba_finals", () => {
  const fields = {
    sharpAngle: "Wembanyama under 10 rebounds",
    context: "NYK pace suppresses boards.",
    thePlay: "Line 10.5+ → UNDER",
    confidence: "Medium",
    watchFor: "Early foul count",
    oneThing: "SAS pace spike flips it",
  };
  const s = buildNbaFinalsStructuredForDelivery(fields, {
    gameNumber: 3,
    seriesScoreLabel: "Knicks lead series 2-0",
    tonightMatchupLabel: "SAS @ NYK",
    venueLabel: "New York (MSG)",
  });
  assert.equal(s.callType, "nba_finals");
  assert.match(s.headline || "", /Game 3/i);
  assert.ok(isNbaFinalsStructured(s));
  const sections = nbaFinalsStructuredToCardSections(s);
  assert.match(sections?.sharpAngle || "", /Wembanyama/i);
});

test("sanitizeNbaFinalsFaceText — strips pipeline copy", () => {
  const t = sanitizeNbaFinalsFaceText(
    "Under 10.5 if posted at -110 or better. No verified line in context — watch for this threshold when the board opens.",
  );
  assert.doesNotMatch(t, /verified line/i);
  assert.doesNotMatch(t, /board opens/i);
});

test("splitMergedNbaFinalsFields — unpacks blob sharpAngle", () => {
  const out = splitMergedNbaFinalsFields({
    sharpAngle:
      "Wembanyama under 10.5 rebounds – Knicks depth. Context: Pace control suppresses boards. The Play: Under 10.5. Confidence: Medium",
  });
  assert.match(out.sharpAngle, /Wembanyama under 10\.5/i);
  assert.match(out.context, /Pace control/i);
  assert.equal(out.confidence, "Medium");
});

test("buildNbaFinalsDisplayHeadline — question overrides stale 0-0 relevance", () => {
  const h = buildNbaFinalsDisplayHeadline(
    {
      finalsMode: true,
      finalsGameNumber: 3,
      finalsSeriesSummary: "Spurs and Knicks tied 0-0",
    },
    "Knicks lead the series 2-0 — Game 3 SAS @ NYK",
  );
  assert.match(h, /Knicks lead/i);
  assert.match(h, /2-0/);
  assert.doesNotMatch(h, /tied 0-0/i);
});

test("formatNbaFinalsStructuredDisplayText — labeled lines", () => {
  const s = buildNbaFinalsStructuredForDelivery(
    {
      sharpAngle: "Under 10.5 boards",
      context: "Pace control.",
      thePlay: "UNDER",
      confidence: "Medium",
      watchFor: "Fouls",
      oneThing: "Pace",
    },
    null,
  );
  const text = formatNbaFinalsStructuredDisplayText(s);
  assert.match(text, /^SHARP ANGLE:/m);
  assert.match(text, /^Watch For:/m);
});
