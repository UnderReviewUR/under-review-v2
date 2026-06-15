/**
 * WC Card Contract CI gate — must stay green for merge.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  runWcCardContractSingleTurnGate,
  runWcCardContractThreadGate,
} from "./wcCardContractGate.js";

test("thread gate is fully green", () => {
  const { fail, rows } = runWcCardContractThreadGate();
  assert.equal(fail, 0, rows.filter((r) => !r.ok).map((r) => `${r.id}:${r.section}`).join(", "));
});

test("single-turn layout + voice gate is fully green", () => {
  const { fail, rows } = runWcCardContractSingleTurnGate();
  assert.equal(fail, 0, rows.filter((r) => !r.ok).map((r) => `${r.id}`).join(", "));
});
