import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureLeanOnStructured,
  lintLeanContract,
  synthesizeLeanLine,
} from "./urTakeLean.js";

test("synthesizeLeanLine builds two-part lean from call and whyNow", () => {
  const lean = synthesizeLeanLine({
    call: "Wemby O11.5 REB",
    whyNow: "He's the only rebounder on SAS and the line hasn't moved yet tonight.",
  });
  assert.match(lean, /^Lean: Wemby O11\.5 REB\./);
  assert.ok(lean.length <= 120);
});

test("synthesizeLeanLine handles Pass and No play", () => {
  assert.equal(synthesizeLeanLine({ call: "PASS" }), "Lean: Pass.");
  assert.equal(synthesizeLeanLine({ call: "No play" }), "Lean: No play.");
});

test("lintLeanContract accepts valid lean", () => {
  const r = lintLeanContract({
    lean: "Lean: Under 228.5. Both defenses are elite and pace will be slow.",
  });
  assert.equal(r.ok, true);
});

test("lintLeanContract flags missing lean", () => {
  const r = lintLeanContract({ call: "X" });
  assert.equal(r.ok, false);
  assert.equal(r.code, "lean_contract_missing");
});

test("ensureLeanOnStructured fills lean when absent", () => {
  const out = ensureLeanOnStructured({
    call: "LAL -4.5",
    whyNow: "Home court and rest edge matter here tonight.",
  });
  assert.match(String(out.lean), /^Lean: LAL -4\.5\./);
});
