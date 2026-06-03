import assert from "node:assert/strict";
import test from "node:test";
import { buildMatchDetailMeta, buildStaticGroupsFallback } from "./_wcData.js";

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

test("buildMatchDetailMeta unavailable when no KV row", () => {
  assert.deepEqual(buildMatchDetailMeta(null), {
    lineupConfirmed: false,
    xiStatus: "unavailable",
    lastUpdated: null,
    dataConfidence: "pre_match_estimate",
  });
});

test("buildMatchDetailMeta pending when detail exists but XI not confirmed", () => {
  const meta = buildMatchDetailMeta({
    lineupConfirmed: false,
    lastUpdated: 1710000000000,
    injuries: [{ player: "A" }],
  });
  assert.equal(meta.xiStatus, "pending");
  assert.equal(meta.lineupConfirmed, false);
  assert.equal(meta.lastUpdated, 1710000000000);
  assert.equal(meta.dataConfidence, "limited_intel");
});

test("buildMatchDetailMeta confirmed when lineupConfirmed true", () => {
  const meta = buildMatchDetailMeta({
    lineupConfirmed: true,
    lastUpdated: 1710000001000,
  });
  assert.equal(meta.xiStatus, "confirmed");
  assert.equal(meta.lineupConfirmed, true);
  assert.equal(meta.dataConfidence, "confirmed");
});
