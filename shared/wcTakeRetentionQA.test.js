import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcSimAttributionLabel,
  detectMissingComparativeProof,
  detectMissingWcSimAttribution,
  extractWcModelAttributionPrefix,
  isWcWatchForDupedAgainstWhy,
  stripWcModelAttributionPrefix,
  wcSentenceSimilarity,
} from "./wcTakeRetentionQA.js";

test("wcSentenceSimilarity flags near-duplicate sentences", () => {
  const a = "Norway advances in 27.8% of sims — market overprices the path.";
  const b = "Norway advances in 27.8% of sims — market overprices the path.";
  assert.equal(wcSentenceSimilarity(a, b), 1);
});

test("detectMissingWcSimAttribution requires label when sim % cited", () => {
  const structured = {
    line: "Market -130 · sim 15% vs market ~57%.",
    whyNow: "USA path is clean through Group D.",
  };
  assert.equal(detectMissingWcSimAttribution("sims show 15% R16 reach", structured), true);

  structured.line =
    "[UR model · 10k Poisson/Elo · Jun 10] Market -130 · sim 15% vs market ~57%.";
  assert.equal(detectMissingWcSimAttribution("sims show 15% R16 reach", structured), false);

  structured.line = "Market FRA -110 group · UR sims ~52% FRA 1st.";
  assert.equal(detectMissingWcSimAttribution("France path", structured), false);
});

test("isWcWatchForDupedAgainstWhy catches WHY reuse", () => {
  const why = "USA advance sim is 62% — books imply 48%.";
  const watch = "USA advance sim is 62% — books imply 48%.";
  assert.equal(isWcWatchForDupedAgainstWhy(watch, why, ""), true);
  assert.equal(
    isWcWatchForDupedAgainstWhy("Watch for Türkiye lineup news before locking USA escape.", why, ""),
    false,
  );
});

test("detectMissingComparativeProof — cross-group requires two groups", () => {
  const q = "Which World Cup group is most mispriced?";
  assert.equal(
    detectMissingComparativeProof(q, "Group I second-place market is rich.", { call: "Group I" }),
    true,
  );
  assert.equal(
    detectMissingComparativeProof(
      q,
      "Group D delta is widest vs Group I runner-up — compare escape paths.",
      { call: "Group D" },
    ),
    false,
  );
});

test("detectMissingComparativeProof — Group D path requires team compare", () => {
  const q = "Which Group D advancement path is most mispriced?";
  assert.equal(detectMissingComparativeProof(q, "USA is mispriced.", { call: "USA" }), true);
  assert.equal(
    detectMissingComparativeProof(
      q,
      "USA escape vs Paraguay second-place path — market delta favors USA advance.",
      { call: "USA path" },
    ),
    false,
  );
});

test("buildWcSimAttributionLabel formats date from timestamp", () => {
  const label = buildWcSimAttributionLabel(Date.parse("2026-06-10T12:00:00.000Z"));
  assert.match(label, /\[UR model · 10k Poisson\/Elo · Jun 10\]/);
});

test("extractWcModelAttributionPrefix splits bracket label from WHY body", () => {
  const raw =
    "[UR model · 10k Poisson/Elo · Jun 11] #1 Group D (USA sim 52.8% vs market 88.2%, -35.4pt).";
  const { attribution, body } = extractWcModelAttributionPrefix(raw);
  assert.equal(attribution, "UR model · 10k Poisson/Elo · Jun 11");
  assert.equal(body, "#1 Group D (USA sim 52.8% vs market 88.2%, -35.4pt).");
  assert.equal(stripWcModelAttributionPrefix(raw), body);
});
