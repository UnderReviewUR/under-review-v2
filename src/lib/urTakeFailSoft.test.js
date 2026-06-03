import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveUrTakeFailSoftFromResponse,
  resolveUrTakeFailSoftPresentation,
  UR_TAKE_FAIL_SOFT_RETRY_MESSAGE,
} from "./urTakeFailSoft.js";

test("resolveUrTakeFailSoftPresentation quota shows upgrade not retry", () => {
  const q = resolveUrTakeFailSoftPresentation({ code: "free_quota_exceeded" });
  assert.equal(q.retryable, false);
  assert.equal(q.showUpgrade, true);
});

test("resolveUrTakeFailSoftFromResponse misconfigured is retryable", () => {
  const r = resolveUrTakeFailSoftFromResponse(500, { code: "server_misconfigured" });
  assert.equal(r.retryable, true);
  assert.equal(r.message, UR_TAKE_FAIL_SOFT_RETRY_MESSAGE);
});
