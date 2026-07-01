import test from "node:test";
import assert from "node:assert/strict";
import { loadWcSlatePayloadPreferGoat } from "./wcSlateBundle.js";

test("loadWcSlatePayloadPreferGoat — returns preferred payload on success", async () => {
  const out = await loadWcSlatePayloadPreferGoat(
    async () => ({ groups: { A: [] }, source: "balldontlie" }),
    async () => ({ groups: {}, source: "espn" }),
    true,
  );
  assert.equal(out?.source, "balldontlie");
});

test("loadWcSlatePayloadPreferGoat — on failure accepts only BDL KV fallback", async () => {
  const bdl = await loadWcSlatePayloadPreferGoat(
    async () => {
      throw new Error("payload_failed");
    },
    async () => ({ groups: { A: [] }, source: "balldontlie" }),
    true,
  );
  assert.equal(bdl?.source, "balldontlie");

  const espn = await loadWcSlatePayloadPreferGoat(
    async () => {
      throw new Error("payload_failed");
    },
    async () => ({ groups: { A: [] }, source: "espn" }),
    true,
  );
  assert.equal(espn, null);
});

test("loadWcSlatePayloadPreferGoat — non-GOAT reads KV directly", async () => {
  const out = await loadWcSlatePayloadPreferGoat(
    async () => {
      throw new Error("should_not_run");
    },
    async () => ({ groups: { A: [] }, source: "espn" }),
    false,
  );
  assert.equal(out?.source, "espn");
});
