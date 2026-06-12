import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcSimAttributionLabel,
  detectMissingComparativeProof,
  detectMissingWcSimAttribution,
  detectMissingWcCardFaceNumericWhy,
  ensureWcCardFaceNumericWhy,
  extractWcModelAttributionPrefix,
  extractWcRunnerUpFromHistory,
  extractWcRunnerUpGroupFromHistory,
  extractWcRunnerUpFromStructured,
  parseWcRunnerUpGroupLetter,
  isWcThinRosterOnlyWhy,
  isWcWatchForDupedAgainstWhy,
  stripWcModelAttributionPrefix,
  buildWcPushBackBindingBlock,
  parentTakeHasWcRunnerUpAnchor,
  synthesizeWcCardFaceNumericWhy,
  wcCardFaceBlobHasNumericWhy,
  wcSentenceSimilarity,
  isWcRunnerUpValueFollowUp,
  parseWcRunnerUpTeamAbbr,
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

  structured.modelAttribution = "UR model · 10k Poisson/Elo · Jun 11";
  structured.line = "Market -130 · sim 15% vs market ~57%.";
  structured.whyNow = "USA advance 15% vs market 57%.";
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

test("isWcThinRosterOnlyWhy flags roster trivia without deltas", () => {
  assert.equal(
    isWcThinRosterOnlyWhy(
      "Group D is four teams: Türkiye (Favorite), Paraguay (Contender), Australia and United States (Longshots).",
    ),
    true,
  );
  assert.equal(
    isWcThinRosterOnlyWhy("UR sims: COD advance 41.2% vs market 68.0% (-26.8pt)."),
    false,
  );
});

test("parseWcRunnerUpGroupLetter handles call headline variants", () => {
  assert.equal(
    parseWcRunnerUpGroupLetter("Group D most mispriced (#1); Group K runner-up"),
    "K",
  );
  assert.equal(parseWcRunnerUpGroupLetter("Runner-up Group K: COD 41% vs market 68%"), "K");
  assert.equal(
    parseWcRunnerUpGroupLetter(
      "Runner-up gap: Group K — COD is 50.0% market vs 23.3% sim (-26.7pt).",
    ),
    "K",
  );
});

test("parseWcRunnerUpTeamAbbr parses runner-up gap prose", () => {
  assert.equal(
    parseWcRunnerUpTeamAbbr(
      "Runner-up gap: Group K — COD is 50.0% market vs 23.3% sim (-26.7pt).",
    ),
    "COD",
  );
});

test("isWcRunnerUpValueFollowUp — which group is the runner-up value", () => {
  assert.equal(isWcRunnerUpValueFollowUp("Which group is the runner-up value?"), true);
});

test("extractWcRunnerUpFromHistory — runner-up gap in prior whyNow", () => {
  const history = [
    {
      role: "assistant",
      structured: {
        call: "Group D — USA advancement misprice",
        whyNow:
          "The market prices USA to advance at 88.2% implied, but UR sims put the escape path at 51.9% (-36.4pt). Runner-up gap: Group K — COD is 50.0% market vs 23.3% sim (-26.7pt).",
      },
    },
  ];
  const row = extractWcRunnerUpFromHistory(history);
  assert.equal(row.group, "K");
  assert.equal(row.teamAbbr, "COD");
});

test("extractWcRunnerUpFromStructured prefers explicit runnerUpGroupLetter", () => {
  const row = extractWcRunnerUpFromStructured({
    call: "Paraguay in Group D — best group-stage value",
    runnerUpGroupLetter: "K",
    runnerUpTeamAbbr: "COD",
  });
  assert.equal(row.group, "K");
  assert.equal(row.teamAbbr, "COD");
});

test("parentTakeHasWcRunnerUpAnchor — structured field or call prose", () => {
  assert.equal(
    parentTakeHasWcRunnerUpAnchor({
      structured: { call: "Paraguay in Group D — best group-stage value" },
    }),
    false,
  );
  assert.equal(
    parentTakeHasWcRunnerUpAnchor({
      structured: {
        call: "Group D most mispriced (#1); Group K runner-up",
        runnerUpGroupLetter: "K",
      },
    }),
    true,
  );
  assert.equal(
    parentTakeHasWcRunnerUpAnchor({
      structured: { call: "Group D most mispriced (#1); Group K runner-up" },
    }),
    true,
  );
});

test("buildWcPushBackBindingBlock binds runner-up group from structured history", () => {
  const history = [
    { role: "user", content: "best group value?" },
    {
      role: "assistant",
      content: "Group D most mispriced (#1); Group K runner-up",
      structured: {
        call: "Group D most mispriced (#1); Group K runner-up",
        runnerUpGroupLetter: "K",
        runnerUpTeamAbbr: "COD",
      },
    },
  ];
  const block = buildWcPushBackBindingBlock("Which group is the runner-up value?", history);
  assert.match(block, /Group K/);
  assert.match(block, /COD/);
  assert.equal(extractWcRunnerUpGroupFromHistory(history), "K");
});

test("extractWcModelAttributionPrefix splits bracket label from WHY body", () => {
  const raw =
    "[UR model · 10k Poisson/Elo · Jun 11] #1 Group D (USA sim 52.8% vs market 88.2%, -35.4pt).";
  const { attribution, body } = extractWcModelAttributionPrefix(raw);
  assert.equal(attribution, "UR model · 10k Poisson/Elo · Jun 11");
  assert.equal(body, "#1 Group D (USA sim 52.8% vs market 88.2%, -35.4pt).");
  assert.equal(stripWcModelAttributionPrefix(raw), body);
});

test("detectMissingWcCardFaceNumericWhy — requires number in why or line", () => {
  const thin = {
    callType: "player_prop",
    lean: "Lean over 3 at -135",
    whyNow: "Son is the focal point when Korea pushes wide.",
    line: "",
  };
  assert.equal(
    detectMissingWcCardFaceNumericWhy(thin, "Son over 2.5 shots"),
    true,
  );

  const good = {
    ...thin,
    whyNow: "Over 3 at -135 (~57% implied) — nearest posted line to your ask.",
  };
  assert.equal(detectMissingWcCardFaceNumericWhy(good, "Son over 2.5 shots"), false);

  const lineOnly = {
    ...thin,
    whyNow: "Son is the focal point when Korea pushes wide.",
    line: "Pass at -130 — sim 15% vs market ~57%.",
  };
  assert.equal(detectMissingWcCardFaceNumericWhy(lineOnly, "USA advance"), false);
});

test("ensureWcCardFaceNumericWhy synthesizes from ladder in deep", () => {
  const repaired = ensureWcCardFaceNumericWhy(
    {
      callType: "player_prop",
      lean: "Lean over 3 at -135",
      whyNow: "Son is the focal point when Korea pushes wide.",
      deep: "Over 1 · -450 · juice\nOver 2 · -220 · still heavy\nOver 3 · -135 · worth paying ✓",
    },
    "Son over 2.5 shots",
  );
  assert.match(String(repaired.whyNow), /Over 3 at -135/);
  assert.match(String(repaired.whyNow), /implied/);
});

test("synthesizeWcCardFaceNumericWhy prefers structured line slot", () => {
  const line = synthesizeWcCardFaceNumericWhy({
    line: "Market -130 · sim 15% vs market ~57%.",
    lean: "Pass on USA advance at current juice.",
  });
  assert.match(line, /-130/);
  assert.match(line, /15%/);
});

test("wcCardFaceBlobHasNumericWhy accepts odds and percentages", () => {
  assert.equal(wcCardFaceBlobHasNumericWhy("Over 3 at -135"), true);
  assert.equal(wcCardFaceBlobHasNumericWhy("Books treat him as the focal winger."), false);
});
