import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBettingStyleAppendix,
  buildLiveModeVoicePrompt,
  buildNbaBdlAvailabilityGroundingPrompt,
  buildTakeTrustUiMetadata,
  mergeTrustWithQaHints,
  composeRegisteredUrTakeSystemPrompt,
  detectOutrightBasketIntent,
  detectParlayIntent,
  resolveEvidenceSparsityProfile,
} from "./_urTakeSystemPromptRegistry.js";

test("buildNbaBdlAvailabilityGroundingPrompt matches NBA injury bundle shape", () => {
  const g = buildNbaBdlAvailabilityGroundingPrompt();
  assert.match(g, /Every player in the payload has a bdlAvailability entry/);
  assert.match(g, /NOT LISTED \/ ACTIVE per BDL/);
});

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
  assert.match(p, /FACT AUTHORITY — SERVER GROUNDING/);
  assert.match(p, /COMMITMENT RULE \(all UR Take responses\):/);
  assert.match(p, /Per ESPN, Mitchell Robinson is OUT for Game 3/);
  assert.match(p, /\*\*BallDontLie\*\* is the canonical league-data backbone/);
  assert.match(p, /THE UNDERREVIEW RESPONSE FRAMEWORK/);
  assert.match(p, /GENERIC \/ AMBIGUOUS SPORT SPINE/);
});

test("parlay question still receives canonical arrow parlay rule from COMMITMENT RULE", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    question: "Provide a 4 leg parlay for the lakers vs thunder. Player props only.",
  });
  assert.match(p, /INJURY GROUNDING: Every player in the payload has a bdlAvailability entry/);
  assert.match(p, /PARLAY AND PROP REQUEST RULE/);
  assert.match(p, /THE CALL:/);
  assert.match(p, /→ \[Last name\]/);
  assert.doesNotMatch(p, /PARLAY RESPONSE STRUCTURE \(when user asks for a parlay\)/);
});

test("detectParlayIntent", () => {
  assert.equal(detectParlayIntent("best player props tonight"), false);
  assert.equal(detectParlayIntent("4 leg parlay lakers thunder"), true);
  assert.equal(detectParlayIntent("Give me an SGP for this game"), true);
});

test("detectOutrightBasketIntent — not confused with parlay detector", () => {
  const q = "I could technically place $1 on 3 players and still come out ahead";
  assert.equal(detectOutrightBasketIntent(q), true);
  assert.equal(detectParlayIntent(q), false);
});

test("composeRegisteredUrTakeSystemPrompt prepends memoryBlock when provided", () => {
  const mem =
    "[PRIOR SESSION MEMORY — last 1 take]\n- Apr 29: nba — lean over (Medium confidence)";
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    memoryBlock: mem,
  });
  assert.ok(p.startsWith(mem));
  assert.match(p, /SESSION MEMORY RULE/);
  assert.match(p, /SESSION MEMORY NARRATIVE RULE/);
});

test("composeRegisteredUrTakeSystemPrompt includes UnderReview voice and follow-up quality rules", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "medium",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
  });
  assert.match(p, /NO DATA UNAVAILABLE CLOSINGS \(mandatory\)/);
  assert.match(p, /PLAYER VERIFICATION RULE — ALL SPORTS \(mandatory\)/);
  assert.match(p, /FORWARD HOOK DISCIPLINE \(mandatory\)/);
  assert.match(p, /UNDERREVIEW VOICE — SHARP FRIEND, NOT A REPORT/);
  assert.match(p, /Never "suggests", "indicates"/);
  assert.match(p, /THE ONE-LINE TEST/);
  assert.match(p, /FOLLOW-UP RESPONSE RULE — MANDATORY/);
  assert.match(p, /Treat every follow-up like a text reply from a friend who already knows the context/);
  assert.match(p, /STAT TERM LOCK/);
  assert.match(
    p,
    /STATUS & TRUTH/,
    "injury/status realism lives in the unified UnderReview voice block",
  );
});

test("composeRegisteredUrTakeSystemPrompt injects slate-wide rule for best props tonight (NBA)", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    question: "best NBA props tonight",
  });
  assert.match(p, /SLATE-WIDE "BEST PROPS TONIGHT"/);
  assert.match(p, /not only the matchup card/);
});

test("composeRegisteredUrTakeSystemPrompt appends slip review voice for slip_review", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    intent: "slip_review",
  });
  assert.match(p, /SLIP REVIEW VOICE \(mandatory — slip_review route\)/);
  assert.match(p, /Acknowledge every leg the deterministic vision block lists/);
});

test("composeRegisteredUrTakeSystemPrompt appends NBA decision spine for nba", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "medium",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "structural_only",
    mlbDecisionMode: null,
  });
  assert.match(p, /NBA DECISION MODE SPINE — structural_only/);
});

test("composeRegisteredUrTakeSystemPrompt appends MLB decision spine for mlb", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "low",
    sportHint: "mlb",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "none",
    mlbDecisionMode: "structural_only",
  });
  assert.match(p, /MLB DECISION MODE SPINE — structural_only/);
});

test("composeRegisteredUrTakeSystemPrompt appends DATA AVAILABILITY RULE for all sports", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nfl",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "none",
    mlbDecisionMode: null,
  });
  assert.match(p, /DATA AVAILABILITY RULE \(all sports, mandatory\)/);
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

test("composeRegisteredUrTakeSystemPrompt appends LIVE BET CONVICTION RULE for slip_review", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    intent: "slip_review",
  });
  assert.match(p, /LIVE BET CONVICTION RULE:/);
  assert.match(p, /Let it ride — the thesis hasn't changed/);
});

test("composeRegisteredUrTakeSystemPrompt appends LIVE BET CONVICTION RULE when liveSignals.hasLiveKeyword", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    intent: "general",
    liveSignals: { hasLiveKeyword: true },
  });
  assert.match(p, /LIVE BET CONVICTION RULE:/);
});

test("composeRegisteredUrTakeSystemPrompt appends live formatting when isEffectivelyLive without keyword", () => {
  const p = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "high",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    tennisSystemPromptExtra: "",
    nbaDecisionMode: "actionable",
    mlbDecisionMode: null,
    intent: "general",
    liveSignals: { hasLiveKeyword: false, isBoardLive: true, isEffectivelyLive: true },
  });
  assert.match(p, /LIVE BET CONVICTION RULE:/);
  assert.match(p, /LIVE MODE OUTPUT SHAPE/);
});

test("buildLiveModeVoicePrompt includes Best look and Watch shape", () => {
  const p = buildLiveModeVoicePrompt();
  assert.match(p, /\bBest look:/);
  assert.match(p, /\bWatch:/);
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

test("buildTakeTrustUiMetadata passes through confidenceDrivers and claimEvidenceFlags", () => {
  const t = buildTakeTrustUiMetadata({
    contextQuality: "high",
    evidenceSparsityProfile: { sparseQuestion: false, thinEvidence: false },
    sportHint: "tennis",
    confidenceDrivers: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"],
    claimEvidenceFlags: { lineMovementEvidence: false, foo: true },
  });
  assert.equal(t.confidenceDrivers.length, 12);
  assert.equal(t.claimEvidenceFlags.lineMovementEvidence, false);
  assert.equal(t.claimEvidenceFlags.foo, true);
});

test("mergeTrustWithQaHints dedupes and caps driver list", () => {
  const t = buildTakeTrustUiMetadata({
    contextQuality: "high",
    evidenceSparsityProfile: { sparseQuestion: false, thinEvidence: false },
    sportHint: "nba",
    confidenceDrivers: ["Payload/context quality: high"],
  });
  const m = mergeTrustWithQaHints(t, ["Limited matchup evidence", "Limited matchup evidence", "x"]);
  assert.ok(m.confidenceDrivers.includes("Limited matchup evidence"));
  assert.ok(m.confidenceDrivers.includes("Payload/context quality: high"));
  assert.ok(m.confidenceDrivers.length <= 16);
});

test("buildBettingStyleAppendix('limits') contains PUSH THE LIMITS", () => {
  const p = buildBettingStyleAppendix("limits");
  assert.match(p, /PUSH THE LIMITS/);
});

test("buildBettingStyleAppendix('balanced') contains BALANCED", () => {
  const p = buildBettingStyleAppendix("balanced");
  assert.match(p, /BALANCED/);
});
