import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureLeanOnStructured,
  lintLeanContract,
  synthesizeLeanLine,
  truncateLeanAtWord,
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

test("truncateLeanAtWord avoids mid-word cut", () => {
  const long =
    "Pass at current odds; the group path is tight and knockout advancement requires both escaping Group D and navigating a likely Round of 32 matchup.";
  const out = truncateLeanAtWord(long, 120);
  assert.ok(out.length <= 121);
  assert.doesNotMatch(out, / navigat(?:ing)? a l$/);
  assert.match(out, /…$/);
});

test("synthesizeLeanLine preserves numbered WC player prop lists", () => {
  const lean = [
    "1. Victor Lindelöf anytime scorer +1100",
    "2. Viktor Gyökeres anytime scorer +123",
    "3. Dylan Bronn anytime scorer +1600",
    "4. Ellyes Skhiri anytime scorer +1300",
  ].join("\n");
  const out = synthesizeLeanLine({ lean });
  assert.match(out, /4\. Ellyes Skhiri/);
  assert.ok(out.length > 120);
});
