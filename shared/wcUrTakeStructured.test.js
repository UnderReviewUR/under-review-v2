import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWcStructuredForDelivery } from "./wcUrTakeStructured.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("normalizeWcStructuredForDelivery — rules callType", () => {
  const out = normalizeWcStructuredForDelivery(
    { sport: "worldcup", whyNow: "ET then pens if level after 90.", lean: "Lean: ET applies." },
    WC_INTENT.RULES,
    "How do knockout rules work?",
    [],
  );
  assert.equal(out.callType, "rules");
  assert.match(String(out.edge), /not a betting pick/i);
});

test("normalizeWcStructuredForDelivery — matchup callType", () => {
  const out = normalizeWcStructuredForDelivery(
    { sport: "worldcup", call: "—", lean: "Both can advance." },
    WC_INTENT.MATCHUP,
    "Norway vs France — who advances?",
    ["NOR", "FRA"],
  );
  assert.equal(out.callType, "matchup");
  assert.equal(out.call, "Group advancement paths");
});
