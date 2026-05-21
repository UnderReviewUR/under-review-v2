import test from "node:test";
import assert from "node:assert/strict";

import {
  lintUrTakeOutput,
  qaRequiresRegeneration,
  runUnderReviewPostProcess,
  QA_SAFE_FALLBACK_PREFIX,
  qaLiveFollowUps,
  LIVE_FOLLOW_UP_FALLBACK,
} from "./_urTakeOutputQA.js";
import { buildDefaultUnsupportedClaimFlags } from "./_urTakeSportEvidence.js";

test("QA: bad double-double wording fails stat logic after deterministic rewrite path", () => {
  const raw =
    "The double-double absorbs variance — he can hit it on 8 REB + 2 AST in transition.";
  const post = runUnderReviewPostProcess(raw, { sport: "nba" });
  assert.ok(post.issues.includes("invalid_stat_term_logic"));
  assert.ok(!/\b8\s*REB\s*\+\s*2\s*AST\b/i.test(post.text));
  assert.ok(post.qa.issueCodes.includes("stat_logic_error_remaining") === false);
});

test("QA: simulated model answer claims 8+2 is a double-double → lint detects remaining stat logic error", () => {
  const fakeModel =
    "Yes — a double-double here means 8 rebounds and 2 assists for a big in this matchup.";
  const lint = lintUrTakeOutput(fakeModel, { betIntegrityIssues: [] });
  assert.equal(lint.shouldRegenerate, true);
  assert.ok(lint.criticalRegenerationCodes.includes("stat_logic_error_remaining"));
});

test("PRA wrong definition triggers regeneration", () => {
  const t =
    "PRA is only points in this book's alternate market — use points for the same-game parlay leg.";
  const lint = lintUrTakeOutput(t, { betIntegrityIssues: [] });
  assert.ok(lint.criticalRegenerationCodes.includes("pra_definition_conflict"));
  assert.equal(qaRequiresRegeneration(lint), true);
});

test("extreme assist line vs season average (context) is flagged", () => {
  const t =
    "With playmaking upside, lean Over 12.5 assists for Tyrese Maxey in this spot.";
  const playerStats = [{ name: "Tyrese Maxey", ast: 6.2, pts: 22, reb: 3 }];
  const lint = lintUrTakeOutput(t, { betIntegrityIssues: [], nbaContext: { playerStats } });
  assert.ok(lint.criticalRegenerationCodes.includes("prop_line_extreme_vs_average"));
});

test("extreme rebound under vs season average is flagged from question + playerStats", () => {
  const t = "Lean under on boards — matchup stays big.";
  const playerStats = [{ name: "Jalen Duren", reb: 11.5, pts: 14, ast: 1 }];
  const lint = lintUrTakeOutput(t, {
    betIntegrityIssues: [],
    sport: "nba",
    question: "Jalen Duren under 5 rebounds tonight?",
    nbaContext: { playerStats },
  });
  assert.ok(lint.criticalRegenerationCodes.includes("extreme_rebound_under_vs_average"));
});

test("roster coherence: player mapped outside allowed teams fails", () => {
  const map = new Map([["Nikola Jokic", "DEN"]]);
  const t = "Same-game parlay: Nikola Jokic over 10 assists alongside Embiid scoring.";
  const lint = lintUrTakeOutput(t, {
    betIntegrityIssues: [],
    coherenceContext: {
      allowedTeamAbbreviations: ["PHI", "MIL"],
      knownPlayerToTeam: map,
    },
  });
  assert.ok(lint.criticalRegenerationCodes.includes("roster_coherence_violation"));
});

test("bench + high assist line triggers structural risk flag", () => {
  const t =
    "Reserve guard runs the second unit — take Over 9.5 assists for the bench microwave.";
  const lint = lintUrTakeOutput(t, { betIntegrityIssues: [] });
  assert.ok(lint.criticalRegenerationCodes.includes("bench_role_high_auxiliary_line"));
});

test("safe fallback prefix is empty — no QA boilerplate prepended to user output", () => {
  const map = new Map([["Nikola Jokic", "DEN"]]);
  const raw =
    "Same-game parlay: Nikola Jokic over 10 assists — correlation with Embiid scoring.";
  const post = runUnderReviewPostProcess(raw, {
    sport: "nba",
    intent: "prop",
    coherenceContext: {
      allowedTeamAbbreviations: ["PHI", "MIL"],
      knownPlayerToTeam: map,
    },
    applySafeFallbackPrefix: true,
  });
  assert.equal(QA_SAFE_FALLBACK_PREFIX, "");
  assert.ok(!/\bQA notice\b/i.test(post.text));
});

test("quality score components respond to probability and risk cues", () => {
  const good =
    "Lean Over 24.5 points — ~58% implied vs role; HIGH RISK if minutes stay capped; season avg 22 PPG vs line.";
  const lint = lintUrTakeOutput(good, { betIntegrityIssues: [] });
  assert.ok(lint.score >= 2);
  assert.equal(lint.shouldRegenerate, false);
});

test("QA: triple-decimal stats near pts/PRA trigger regeneration", () => {
  const t =
    "Projection lands at 13.584 pts vs a soft matchup — lean over if minutes hold.";
  const lint = lintUrTakeOutput(t, { betIntegrityIssues: [] });
  assert.ok(lint.criticalRegenerationCodes.includes("over_precise_decimal_stats"));
});

test("QA: projection invalid phrase triggers regeneration", () => {
  const lint = lintUrTakeOutput("projection invalid for this market.", {
    betIntegrityIssues: [],
  });
  assert.ok(lint.criticalRegenerationCodes.includes("robotic_projection_invalid_phrase"));
});

test("QA: player unavailable + probable language mismatch", () => {
  const lint = lintUrTakeOutput(
    "Player unavailable — he's probable but I'm fading the points anyway.",
    { betIntegrityIssues: [] },
  );
  assert.ok(
    lint.criticalRegenerationCodes.includes("status_language_player_unavailable_mismatch"),
  );
});

test("QA: probable vs ruled out contradiction (Edwards)", () => {
  const lint = lintUrTakeOutput(
    "Anthony Edwards is probable for tonight but he is ruled out — skip the prop.",
    { betIntegrityIssues: [] },
  );
  assert.ok(lint.criticalRegenerationCodes.includes("status_contradiction_probable_vs_out"));
});

test("QA: report-style headers echo", () => {
  const lint = lintUrTakeOutput("STRUCTURAL REALITY: pace is fast.", {
    betIntegrityIssues: [],
  });
  assert.ok(lint.criticalRegenerationCodes.includes("report_style_header_echo"));
});

test("QA: bro tone flags AI jargon and long sentences", () => {
  const jargon = lintUrTakeOutput(
    "The sharpest structural angle is the rotation vacancy created by the injury.",
    { betIntegrityIssues: [] },
  );
  assert.ok(jargon.criticalRegenerationCodes.includes("bro_tone_ai_jargon"));

  const longSent =
    "This is a single sentence that keeps going and going with filler words about the matchup and the injury report and the betting perspective and the line movement and the rotation and the usage and the pace and the scheme until it clearly exceeds forty words which should trigger regeneration.";
  const longLint = lintUrTakeOutput(longSent, { betIntegrityIssues: [] });
  assert.ok(longLint.criticalRegenerationCodes.includes("bro_tone_sentence_too_long"));
});

test("post-process strips triple decimals from user-facing output", () => {
  const post = runUnderReviewPostProcess("Model edge ~13.584 pts vs line.", {
    sport: "nba",
  });
  assert.ok(!/\b13\.584\b/.test(post.text));
});

test("QA: slate-wide ask + single-game 4-leg parlay heuristic", () => {
  const t =
    "4 legs on this parlay, all from PHI @ NYK — spread, points, boards, assists.";
  const lint = lintUrTakeOutput(t, {
    betIntegrityIssues: [],
    slateWidePropQuestion: true,
  });
  assert.ok(lint.issueCodes.includes("slate_wide_answer_may_be_single_game_parlay"));
});

test("post-process strips banned headers and replaces robotic phrases", () => {
  const raw = `STRUCTURAL REALITY: edge is pace.\nSTATUS SHIFT: player unavailable.\nThis projection invalid setup is thin.`;
  const post = runUnderReviewPostProcess(raw, { sport: "nba" });
  assert.ok(!/\bSTRUCTURAL REALITY\b/i.test(post.text));
  assert.ok(!/\bSTATUS SHIFT\b/i.test(post.text));
  assert.ok(!/\bprojection invalid\b/i.test(post.text));
  assert.match(post.text, /can't play that directly/i);
});

test("post-process adds diversification line for slate-wide one-game parlay", () => {
  const raw = "4 legs parlay in PHI @ NYK only — points, boards, assists, spread.";
  const post = runUnderReviewPostProcess(raw, {
    sport: "nba",
    slateWidePropQuestion: true,
  });
  assert.match(post.text, /diversify across the slate/i);
});

test("post-process rewrites probable/out contradiction to conditional phrasing", () => {
  const raw = "Anthony Edwards is probable and ruled out in this report.";
  const post = runUnderReviewPostProcess(raw, { sport: "nba" });
  assert.ok(!/\bprobable\b[\s\S]{0,80}\b(?:ruled out|is out)\b/i.test(post.text));
  assert.match(post.text, /if he's in/i);
  assert.match(post.text, /if he sits/i);
});

test("post-process appends slip completeness warning when legs are missing", () => {
  const raw = "Leg 1 — over points. Leg 2 — over rebounds.";
  const post = runUnderReviewPostProcess(raw, {
    sport: "nba",
    intent: "slip_review",
    expectedSlipLegCount: 4,
  });
  assert.match(post.text, /missing a leg here — worth a closer look/i);
});

test("QA: flags dense live paragraphs", () => {
  const dense =
    "Best look: take the live over here because pace, transition frequency, foul profile, and matchup dynamics all project sustained scoring through multiple lineup combinations while the market lags possessions and efficiency changes across recent minutes. Watch: only back off if the game slows to a walk and second-unit shot quality collapses.";
  const lint = lintUrTakeOutput(dense, { betIntegrityIssues: [], liveMode: true });
  assert.ok(lint.issueCodes.includes("live_mode_dense_paragraph"));
});

test("QA: flags report-style headers in live output", () => {
  const live = "Best look: Over 219.5.\nLIVE TRIGGER: if pace stays high.\nWatch: foul trouble.";
  const lint = lintUrTakeOutput(live, { betIntegrityIssues: [], liveMode: true });
  assert.ok(lint.criticalRegenerationCodes.includes("report_style_header_echo"));
});

test("QA: clean Best look / Also like / Watch live response passes", () => {
  const clean =
    "Best look: Knicks team total over 107.5 if pace stays above average.\nAlso like: Brunson 2H points over if his usage holds.\nWatch: if foul trouble cuts minutes, this edge weakens.";
  const lint = lintUrTakeOutput(clean, { betIntegrityIssues: [], liveMode: true });
  assert.equal(lint.shouldRegenerate, false);
  assert.ok(!lint.issueCodes.includes("report_style_header_echo"));
  assert.ok(!lint.issueCodes.includes("live_mode_dense_paragraph"));
});

test("QA live follow-ups: valid suggestions pass", () => {
  const r = qaLiveFollowUps([
    "still like this line?",
    "good for second half?",
    "live alt worth it?",
  ]);
  assert.equal(r.usedFallback, false);
  assert.equal(r.followUps.length, 3);
  assert.ok(r.followUps.every((s) => s.includes("?")));
});

test("QA live follow-ups: duplicates are dropped", () => {
  const r = qaLiveFollowUps([
    "still like this line?",
    "still like this line?",
    "good for second half?",
    "pair this with anything?",
  ]);
  assert.equal(r.usedFallback, false);
  assert.equal(r.followUps.length, 3);
  assert.equal(new Set(r.followUps.map((s) => s.toLowerCase())).size, 3);
});

test("QA live follow-ups: over 7 words dropped", () => {
  const r = qaLiveFollowUps([
    "still like this line?",
    "would you like more detailed betting analysis on this prop tonight?",
    "good for second half?",
  ]);
  assert.equal(r.usedFallback, false);
  assert.ok(!r.followUps.some((s) => s.includes("detailed")));
});

test("QA live follow-ups: formal phrases dropped", () => {
  const r = qaLiveFollowUps([
    "explore more betting insights?",
    "still like this line?",
    "good for second half?",
  ]);
  assert.equal(r.usedFallback, false);
  assert.ok(!r.followUps.some((s) => /\binsights\b/i.test(s)));
});

test("QA live follow-ups: fallback when too few valid remain", () => {
  const r = qaLiveFollowUps([
    "Would you like more analysis?",
    "explore recommendation engines?",
    "see insights here?",
  ]);
  assert.equal(r.usedFallback, true);
  assert.deepEqual(r.followUps, [...LIVE_FOLLOW_UP_FALLBACK]);
});

test("QA: soft matchup hedge triggers driver hints and downgrades High confidence", () => {
  const flags = buildDefaultUnsupportedClaimFlags();
  const raw =
    "High confidence. The defense tends to get exposed in isolation when they switch everything.";
  const post = runUnderReviewPostProcess(raw, { sport: "nba", unsupportedClaimFlags: flags });
  assert.ok((post.qa.qaEvidenceDriverHints || []).length > 0);
  assert.ok(/Medium confidence/i.test(post.text));
  assert.equal(post.qa.shouldRegenerate, false);
});
