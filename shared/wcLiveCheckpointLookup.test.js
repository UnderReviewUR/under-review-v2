import assert from "node:assert/strict";
import test from "node:test";
import {
  WC_CHECKPOINT_MARKET,
  WC_CHECKPOINT_MINUTE,
  estimateCheckpointDriftAmerican,
  lookupWcCheckpointScenario,
  parseWcLiveCheckpointMinuteBucket,
  resolveWcLineMovementMarketKind,
} from "./wcLiveCheckpointLookup.js";

test("parseWcLiveCheckpointMinuteBucket — buckets by clock", () => {
  assert.equal(parseWcLiveCheckpointMinuteBucket("5 mins in and scoreless"), WC_CHECKPOINT_MINUTE.EARLY);
  assert.equal(parseWcLiveCheckpointMinuteBucket("0-0 about 30 minutes in"), WC_CHECKPOINT_MINUTE.MID);
  assert.equal(parseWcLiveCheckpointMinuteBucket("still 0-0 at 65'"), WC_CHECKPOINT_MINUTE.LATE);
  assert.equal(parseWcLiveCheckpointMinuteBucket("scoreless at half-time"), WC_CHECKPOINT_MINUTE.MID);
  assert.equal(parseWcLiveCheckpointMinuteBucket("around the 30th minute still 0-0"), WC_CHECKPOINT_MINUTE.MID);
  assert.equal(parseWcLiveCheckpointMinuteBucket("before the 30' mark if still level"), WC_CHECKPOINT_MINUTE.EARLY);
});

test("resolveWcLineMovementMarketKind — moneyline is not to-advance", () => {
  assert.equal(
    resolveWcLineMovementMarketKind("France moneyline at -525 if 0-0 at 30"),
    WC_CHECKPOINT_MARKET.ML_90MIN,
  );
  assert.equal(
    resolveWcLineMovementMarketKind("France -650 to advance at 0-0"),
    WC_CHECKPOINT_MARKET.TO_ADVANCE,
  );
});

test("resolveWcLineMovementMarketKind — money line + over prefers ML", () => {
  const q =
    "money line is -525 on france... over 1.5 is -525 as well. wait for 0-0 about 30 minutes";
  assert.equal(resolveWcLineMovementMarketKind(q), WC_CHECKPOINT_MARKET.ML_90MIN);
});

test("lookupWcCheckpointScenario — Germany-tier -669 mid checkpoint", () => {
  const row = lookupWcCheckpointScenario({
    american: -669,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    marketKind: WC_CHECKPOINT_MARKET.ML_90MIN,
  });
  assert.equal(row?.direction, "drift_out");
  assert.equal(row?.openAmerican, -669);
});

test("estimateCheckpointDriftAmerican — clock-sensitive ML drift", () => {
  const early = estimateCheckpointDriftAmerican(-525, WC_CHECKPOINT_MINUTE.EARLY, WC_CHECKPOINT_MARKET.ML_90MIN);
  const mid = estimateCheckpointDriftAmerican(-525, WC_CHECKPOINT_MINUTE.MID, WC_CHECKPOINT_MARKET.ML_90MIN);
  const late = estimateCheckpointDriftAmerican(-525, WC_CHECKPOINT_MINUTE.LATE, WC_CHECKPOINT_MARKET.ML_90MIN);
  assert.ok(Number(String(early).replace("-", "")) > Number(String(mid).replace("-", "")));
  assert.ok(Number(String(mid).replace("-", "")) > Number(String(late).replace("-", "")));
  assert.equal(mid, "-378");
});

test("lookupWcCheckpointScenario — France-tier mid checkpoint", () => {
  const row = lookupWcCheckpointScenario({
    american: -525,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    marketKind: WC_CHECKPOINT_MARKET.ML_90MIN,
  });
  assert.equal(row?.direction, "drift_out");
  assert.equal(row?.driftTarget, "-378");
});

test("lookupWcCheckpointScenario — to-advance holds/shortens", () => {
  const row = lookupWcCheckpointScenario({
    american: -650,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    marketKind: WC_CHECKPOINT_MARKET.TO_ADVANCE,
  });
  assert.equal(row?.direction, "shorten_or_hold");
});
