import test from "node:test";
import assert from "node:assert/strict";

import { shouldRunNbaBoardWarmupCron } from "./nbaBoardWarmupPolicy.js";

test("shouldRunNbaBoardWarmupCron skips during WC tournament window", () => {
  const wcKickoff = Date.parse("2026-06-11T16:00:00.000Z");
  assert.equal(shouldRunNbaBoardWarmupCron(wcKickoff), false);
});

test("shouldRunNbaBoardWarmupCron runs outside WC tournament", () => {
  const preWc = Date.parse("2026-05-15T12:00:00.000Z");
  assert.equal(shouldRunNbaBoardWarmupCron(preWc), true);
});

test("NBA_BOARD_WARMUP_FORCE overrides WC skip", () => {
  process.env.NBA_BOARD_WARMUP_FORCE = "1";
  try {
    const wcKickoff = Date.parse("2026-06-11T16:00:00.000Z");
    assert.equal(shouldRunNbaBoardWarmupCron(wcKickoff), true);
  } finally {
    delete process.env.NBA_BOARD_WARMUP_FORCE;
  }
});
