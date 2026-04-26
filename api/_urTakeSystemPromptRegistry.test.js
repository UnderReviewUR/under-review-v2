import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTakeTrustUiMetadata,
  composeRegisteredUrTakeSystemPrompt,
  resolveEvidenceSparsityProfile,
} from "./_urTakeSystemPromptRegistry.js";

test("composeRegisteredUrTakeSystemPrompt injects context quality and core framework", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "soccer",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "none",
    mlbDecisionMode: null,
  });
  assert.match(p, /EVIDENCE FLOOR: Context quality for this request is "high"/);
  assert.match(p, /THE UNDERREVIEW RESPONSE FRAMEWORK/);
  assert.match(p, /GENERIC \/ AMBIGUOUS SPORT SPINE/);
});

test("composeRegisteredUrTakeSystemPrompt bans unavailable-data closings", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "medium",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
  });
  assert.match(p, /CLOSING DISCIPLINE — NO "DATA UNAVAILABLE" ENDINGS/);
  assert.match(p, /Series context and live rotation data are unavailable/);
});

test("composeRegisteredUrTakeSystemPrompt appends NBA decision spine for nba", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "medium",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "blocked_unlisted_market",
    mlbDecisionMode: null,
  });
  assert.match(p, /NBA DECISION MODE SPINE — blocked \(market not listed\)/);
});

test("composeRegisteredUrTakeSystemPrompt appends MLB decision spine for mlb", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "low",
    sportHint: "mlb",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "none",
    mlbDecisionMode: "pre_market_framework",
  });
  assert.match(p, /MLB DECISION MODE SPINE — pre_market_framework/);
});

test("composeRegisteredUrTakeSystemPrompt applies chase overlay last", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nfl",
    chaseSignals: {
      isChase: true,
      sameTopicCount: 2,
      hasHedgingPanicLanguage: false,
    },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "none",
    mlbDecisionMode: null,
  });
  assert.match(p, /REPEAT-QUESTION GUIDANCE MODE — MANDATORY OVERRIDE/);
  assert.match(p, /NFL SURFACE SPINE/);
});

test("resolveEvidenceSparsityProfile flags generic sport as thin evidence", () => {
  const p = resolveEvidenceSparsityProfile({
    contextQuality: "high",
    question: "full sentence with enough tokens to exceed sparse heuristics easily",
    hasMatchupContext: false,
    sportHint: "generic",
    intent: "general",
    hasImage: false,
  });
  assert.equal(p.thinEvidence, true);
  assert.equal(p.sparseQuestion, false);
});

test("composeRegisteredUrTakeSystemPrompt adds P-PR2 appendix for low context + short question", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "low",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    question: "Lakers ML?",
    intent: "general",
    hasImage: false,
    hasMatchupContext: false,
  });
  assert.match(p, /SPARSE INPUT \/ THIN EVIDENCE APPENDIX/);
  assert.match(p, /Payload\/context for this route is thin/);
});

test("composeRegisteredUrTakeSystemPrompt sparse-only when context high", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    question: "Lean?",
    intent: "general",
    hasImage: false,
    hasMatchupContext: false,
  });
  assert.match(p, /SPARSE INPUT \/ THIN EVIDENCE APPENDIX/);
  assert.doesNotMatch(p, /Payload\/context for this route is thin/);
});

test("composeRegisteredUrTakeSystemPrompt honors injected evidenceSparsityProfile", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "low",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    question: "Lean?",
    intent: "general",
    hasImage: false,
    hasMatchupContext: false,
    evidenceSparsityProfile: { sparseQuestion: false, thinEvidence: false },
  });
  assert.doesNotMatch(p, /SPARSE INPUT \/ THIN EVIDENCE APPENDIX/);
});

test("buildTakeTrustUiMetadata encodes P-PR3 tier from sparsity profile", () => {
  const t = buildTakeTrustUiMetadata({
    contextQuality: "low",
    evidenceSparsityProfile: { sparseQuestion: true, thinEvidence: true },
    sportHint: "mlb",
  });
  assert.equal(t.tier, "capped_sparse_thin");
  assert.equal(t.contextQuality, "low");
  assert.equal(t.sparseQuestion, true);
  assert.equal(t.thinEvidence, true);
  assert.equal(t.sportHint, "mlb");
  assert.equal(t.version, 1);
});
