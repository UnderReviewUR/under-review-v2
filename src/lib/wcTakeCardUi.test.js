import assert from "node:assert/strict";
import test from "node:test";
import { capWcHeadlineWords, pickWcThePlayLine, wcCardSectionText } from "./wcTakeCardUi.js";

test("capWcHeadlineWords limits to twelve words", () => {
  const long =
    "Brazil is structurally mispriced at plus eight hundred given group depth and knockout path";
  const capped = capWcHeadlineWords(long, 12);
  assert.equal(capped.split(/\s+/).length, 12);
  assert.match(capped, /…$/);
});

test("capWcHeadlineWords avoids comma ellipsis and prefers em-dash clause break", () => {
  const long =
    "Spain (ESP) projects the most goals across the tournament — favorite status, 7+ goal pace";
  const capped = capWcHeadlineWords(long, 12);
  assert.doesNotMatch(capped, /,\s*…$/);
  assert.match(capped, /tournament…$/);
});

test("pickWcThePlayLine prefers lean when distinct from headline", () => {
  const headline = "Brazil value at +800";
  const play = pickWcThePlayLine({
    headline,
    lean: "Lean Brazil outright +800 — group winner path is clean",
    call: headline,
  });
  assert.match(play, /Lean Brazil/);
});

test("wcCardSectionText drops empty placeholders", () => {
  assert.equal(wcCardSectionText("—"), "");
  assert.equal(wcCardSectionText("Watch the left channel"), "Watch the left channel");
});
