import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNbaFinalsStructuredForDelivery,
  formatNbaFinalsStructuredDisplayText,
  isNbaFinalsStructured,
  normalizeNbaFinalsStructuredFields,
  nbaFinalsStructuredToCardSections,
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
