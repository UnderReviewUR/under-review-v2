import test from "node:test";
import assert from "node:assert/strict";

import {
  lintUrTakeOutput,
  qaRequiresRegeneration,
  runUnderReviewPostProcess,
  QA_SAFE_FALLBACK_PREFIX,
} from "./_urTakeOutputQA.js";

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
