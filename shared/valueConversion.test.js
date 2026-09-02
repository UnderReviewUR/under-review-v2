import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldOfferValueTrial,
  shouldShowLedgerRenewalPitch,
  VALUE_TRIAL_SUCCESS_TAKE_THRESHOLD,
} from "./valueConversion.js";

test("shouldOfferValueTrial after second successful take", () => {
  assert.ok(
    shouldOfferValueTrial({
      successfulTakes: VALUE_TRIAL_SUCCESS_TAKE_THRESHOLD,
      isPro: false,
      paywallSuppressed: false,
    }),
  );
  assert.ok(!shouldOfferValueTrial({ successfulTakes: 1, isPro: false }));
});

test("shouldOfferValueTrial on track attempt", () => {
  assert.ok(shouldOfferValueTrial({ trackAttempt: true, isPro: false }));
});

test("shouldShowLedgerRenewalPitch at five settled plays", () => {
  assert.ok(shouldShowLedgerRenewalPitch({ settled: 5, wins: 3, losses: 2 }));
  assert.ok(!shouldShowLedgerRenewalPitch({ settled: 4 }));
});
