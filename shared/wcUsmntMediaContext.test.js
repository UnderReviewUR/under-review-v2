import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWcUsmntMediaContextBlock,
  shouldInjectWcUsmntMediaContext,
} from "./wcUsmntMediaContext.js";

test("injects for USA team mention", () => {
  assert.equal(shouldInjectWcUsmntMediaContext("Will USA advance?", ["USA"]), true);
  const block = buildWcUsmntMediaContextBlock("Will USA advance?", ["USA"]);
  assert.ok(block?.includes("SportsLine"));
  assert.ok(block?.includes("+5500"));
});

test("injects for USMNT phrasing", () => {
  assert.equal(shouldInjectWcUsmntMediaContext("Best USMNT futures bet?", []), true);
});

test("skips unrelated nation question", () => {
  assert.equal(shouldInjectWcUsmntMediaContext("Is Norway mispriced?", ["NOR"]), false);
  assert.equal(buildWcUsmntMediaContextBlock("Is Norway mispriced?", ["NOR"]), null);
});
