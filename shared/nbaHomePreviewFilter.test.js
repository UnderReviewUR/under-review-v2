import assert from "node:assert/strict";
import test from "node:test";

import {
  filterIrrelevantPlayersFromPreviewText,
  trimPreviewTextToCompleteSentences,
} from "./nbaHomePreviewFilter.js";

test("trimPreviewTextToCompleteSentences avoids mid-word cut", () => {
  const text =
    "The market is overweight on narrative while OKC's rim protection and pace control decide the cover.";
  const out = trimPreviewTextToCompleteSentences(text, 72);
  assert.ok(!/\bCar\b/.test(out));
  assert.ok(!out.endsWith("Car"));
  assert.ok(out.endsWith(".") || out.endsWith("…"));
});

test("filterIrrelevantPlayersFromPreviewText drops Biyombo sentences", () => {
  const text =
    "OKC's length controls the paint. Bismack Biyombo and Caruso are not the angle — watch Wembanyama's foul rate.";
  const out = filterIrrelevantPlayersFromPreviewText(text);
  assert.ok(!/biyombo/i.test(out));
  assert.match(out, /OKC|Wembanyama/i);
});

test("filterIrrelevantPlayersFromPreviewText drops David Jones sentences", () => {
  const text =
    "OKC length controls the paint. David Jones is not the angle. Watch Wembanyama foul rate.";
  const out = filterIrrelevantPlayersFromPreviewText(text);
  assert.ok(!/david\s+jones/i.test(out));
  assert.match(out, /Wembanyama/i);
});

test("filterIrrelevantPlayersFromPreviewText clears chunk that is only Biyombo fragment", () => {
  const text = "Bismack Biyombo and Car";
  assert.equal(filterIrrelevantPlayersFromPreviewText(text), "");
});
