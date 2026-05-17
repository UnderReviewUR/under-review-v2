import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyUrTakeClientCatchPhase,
  isSafariNetworkLoadFailed,
  userMessageForUrTakeClientFailure,
} from "./urTakeFetch.js";

test("isSafariNetworkLoadFailed detects TypeError Load failed", () => {
  assert.equal(isSafariNetworkLoadFailed(new TypeError("Load failed")), true);
  assert.equal(isSafariNetworkLoadFailed(new TypeError("Failed to fetch")), true);
  assert.equal(isSafariNetworkLoadFailed(new Error("Load failed")), false);
});

test("classifyUrTakeClientCatchPhase maps abort and network", () => {
  assert.equal(classifyUrTakeClientCatchPhase({ name: "AbortError" }), "abort");
  assert.equal(
    classifyUrTakeClientCatchPhase(new TypeError("Load failed")),
    "network_load_failed",
  );
  assert.equal(classifyUrTakeClientCatchPhase(new Error("boom")), "client_catch");
});

test("userMessageForUrTakeClientFailure avoids raw Load failed", () => {
  assert.match(
    userMessageForUrTakeClientFailure("network_load_failed"),
    /Connection dropped/i,
  );
  assert.doesNotMatch(
    userMessageForUrTakeClientFailure("network_load_failed"),
    /Load failed/i,
  );
  assert.match(
    userMessageForUrTakeClientFailure("client_catch", { golfContextMismatch: true }),
    /different week/i,
  );
});
