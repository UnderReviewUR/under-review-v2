import test from "node:test";
import assert from "node:assert/strict";

import { clerkAuthDenial, summarizeEntitlementPolicy } from "./_proClerkPolicy.js";

test("clerkAuthDenial: 503 when Clerk server env not treated as configured", () => {
  const a = clerkAuthDenial("user_2a", { clerkSecretConfigured: false });
  assert.equal(a.denied, true);
  assert.equal(a.status, 503);
  assert.equal(a.body.error, "clerk_required");
});

test("clerkAuthDenial: 401 when no user id but Clerk is configured", () => {
  const a = clerkAuthDenial(null, { clerkSecretConfigured: true });
  assert.equal(a.denied, true);
  assert.equal(a.status, 401);
  assert.equal(a.body.error, "sign_in_required");
});

test("clerkAuthDenial: allows when configured and user id present", () => {
  const a = clerkAuthDenial("user_2a", { clerkSecretConfigured: true });
  assert.equal(a.denied, false);
});

test("public policy: checkout/restore/pro-status use email + Stripe (no Clerk JWT)", () => {
  const p = summarizeEntitlementPolicy();
  assert.equal(p.checkoutRequiresJwt, false);
  assert.equal(p.restoreRequiresJwt, false);
  assert.equal(p.proStatusRequiresJwt, false);
  assert.equal(p.clientEmailIgnoredForCheckout, false);
});
