import assert from "node:assert/strict";
import test from "node:test";
import { buildStaticGroupsFallback } from "./_wcData.js";

test("buildStaticGroupsFallback returns 12 groups with corrected teams", () => {
  const groups = buildStaticGroupsFallback();
  assert.equal(Object.keys(groups).length, 12);
  assert.deepEqual(
    groups.A.map((r) => r.team).sort(),
    ["CZE", "KOR", "MEX", "RSA"].sort(),
  );
  assert.deepEqual(
    groups.B.map((r) => r.team).sort(),
    ["BIH", "CAN", "QAT", "SUI"].sort(),
  );
  assert.deepEqual(
    groups.F.map((r) => r.team).sort(),
    ["JPN", "NED", "SWE", "TUN"].sort(),
  );
});
