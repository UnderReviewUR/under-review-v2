import assert from "node:assert/strict";
import test from "node:test";
import { deriveWcDataConfidence, wcDataConfidenceChipLabel } from "./wcDataConfidence.js";

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
