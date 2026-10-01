import test from "node:test";
import assert from "node:assert/strict";
import {
  freeLimitChipMessage,
  freeLimitChipMessageForScope,
} from "./freeTierCopy.js";

test("freeLimitChipMessageForScope distinguishes session vs day", () => {
  assert.match(freeLimitChipMessageForScope(1, "session"), /this session/i);
  assert.match(freeLimitChipMessageForScope(2, "email"), /today/i);
  assert.match(freeLimitChipMessage(2), /2 free questions left/i);
});
