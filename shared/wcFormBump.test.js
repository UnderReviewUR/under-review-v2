import test from "node:test";
import assert from "node:assert/strict";
import {
  FORM_BASELINE,
  applyFormBump,
  buildFixtureFormKey,
  buildSimFormFingerprintSuffix,
  formBumpFromRating,
} from "./wcFormBump.js";

test("formBumpFromRating — mapping and clamp", () => {
  assert.equal(formBumpFromRating(6.5), 0.96);
  assert.equal(formBumpFromRating(FORM_BASELINE), 1);
  assert.equal(formBumpFromRating(8.5), 1.04);
  assert.equal(formBumpFromRating(9.0), 1.06);
});

test("formBumpFromRating — null/undefined → 1.0", () => {
  assert.equal(formBumpFromRating(null), 1);
  assert.equal(formBumpFromRating(undefined), 1);
  assert.equal(formBumpFromRating(Number.NaN), 1);
});

test("buildFixtureFormKey — sorted uppercase", () => {
  assert.equal(buildFixtureFormKey("por", "col"), "COL|POR");
  assert.equal(buildFixtureFormKey("COL", "POR"), "COL|POR");
});

test("applyFormBump — scales lambda", () => {
  assert.equal(applyFormBump(1.3, 8.5), 1.3 * 1.04);
});

test("buildSimFormFingerprintSuffix — compact stable suffix", () => {
  assert.equal(buildSimFormFingerprintSuffix({}), "frm:0:0");
  assert.equal(
    buildSimFormFingerprintSuffix({
      formFixturesResolved: 12,
      formTeamsAffected: 18,
      formRatingMin: 6.84,
      formRatingMax: 8.31,
    }),
    "frm:12:18:6.8-8.3",
  );
});
