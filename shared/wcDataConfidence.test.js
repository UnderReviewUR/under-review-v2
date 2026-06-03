import assert from "node:assert/strict";
import test from "node:test";
import {
  capWcStructuredConfidence,
  deriveWcDataConfidence,
  wcDataConfidenceCautionBanner,
  wcDataConfidenceChipLabel,
  wcDataConfidenceNeedsCaution,
} from "./wcDataConfidence.js";

test("deriveWcDataConfidence confirmed when lineup posted", () => {
  assert.equal(deriveWcDataConfidence([{ lineupConfirmed: true, injuries: [] }]), "confirmed");
});

test("deriveWcDataConfidence limited_intel when injuries without lineup", () => {
  assert.equal(
    deriveWcDataConfidence([{ lineupConfirmed: false, injuries: [{ name: "Pulisic" }] }]),
    "limited_intel",
  );
});

test("deriveWcDataConfidence pre_match_estimate by default", () => {
  assert.equal(deriveWcDataConfidence([]), "pre_match_estimate");
  assert.equal(wcDataConfidenceChipLabel("pre_match_estimate"), "Pre-match estimate");
});

test("wcDataConfidenceNeedsCaution and banner copy", () => {
  assert.equal(wcDataConfidenceNeedsCaution("confirmed"), false);
  assert.equal(wcDataConfidenceNeedsCaution("pre_match_estimate"), true);
  assert.ok(wcDataConfidenceCautionBanner("pre_match_estimate")?.includes("Lineups not yet confirmed"));
  assert.ok(wcDataConfidenceCautionBanner("limited_intel")?.includes("Starting XIs not confirmed"));
});

test("capWcStructuredConfidence downgrades High when intel unconfirmed", () => {
  assert.equal(capWcStructuredConfidence("High", "confirmed"), "High");
  assert.equal(capWcStructuredConfidence("High", "pre_match_estimate"), "Medium");
  assert.equal(capWcStructuredConfidence("High", "limited_intel"), "Speculative");
  assert.equal(capWcStructuredConfidence("Medium", "limited_intel"), "Speculative");
  assert.equal(capWcStructuredConfidence("Speculative", "pre_match_estimate"), "Speculative");
});
