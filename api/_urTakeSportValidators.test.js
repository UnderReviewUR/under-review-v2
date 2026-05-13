import test from "node:test";
import assert from "node:assert/strict";

import {
  lintMlbOutput,
  lintNflOutput,
  lintGolfOutput,
  lintF1Output,
  lintNhlOutput,
  lintSoccerOutput,
  lintTennisOutput,
  lintSportEvidenceEnforcement,
  sportEvidenceLayerIsThin,
  runSportSpecificValidators,
} from "./_urTakeSportValidators/index.js";
import { lintUrTakeOutput } from "./_urTakeOutputQA.js";

function codes(issues) {
  return issues.map((i) => i.code);
}

test("MLB: HR prop safe leg triggers inflation / cross-sport critical", () => {
  const t = "This HR prop is a safe leg on my parlay slip.";
  const m = lintMlbOutput(t);
  assert.ok(codes(m).includes("mlb_hr_prop_probability_inflation"));
  const full = lintUrTakeOutput(t, { sport: "mlb", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, true);
});

test("MLB: pitcher K over without starter context → warning only", () => {
  const t =
    "The pitcher over 5.5 strikeouts is my lean — stuff plays vs this lineup.";
  const m = lintMlbOutput(t);
  assert.ok(codes(m).includes("mlb_pitcher_k_prop_without_starter_context"));
  assert.ok(!m.some((i) => i.requiresRegeneration && i.code.startsWith("mlb_pitcher")));
});

test("MLB: pitcher win reliable without bullpen/run support → warning", () => {
  const t = "Pitcher win is reliable tonight — ride the ace narrative.";
  const m = lintMlbOutput(t);
  assert.ok(codes(m).includes("mlb_pitcher_win_context_missing"));
});

test("NFL: anytime TD lock → critical", () => {
  const t = "His anytime TD is a lock in this game script.";
  const n = lintNflOutput(t);
  assert.ok(codes(n).includes("nfl_anytime_td_overconfidence"));
  assert.ok(n.some((i) => i.requiresRegeneration));
});

test("NFL: QB under passing + two WR overs without explanation → correlation", () => {
  const t =
    "SGP: QB under 200 passing yards. Over 65.5 receiving yards for Adams. Over 70.5 receiving yards for Jefferson.";
  const n = lintNflOutput(t);
  assert.ok(codes(n).includes("nfl_correlation_conflict"));
});

test("NFL: RB rushing over without workload cues → warning", () => {
  const t = "Lean over 85.5 rushing yards — I like the matchup.";
  const n = lintNflOutput(t);
  assert.ok(codes(n).includes("nfl_rb_usage_context_gap"));
});

test("Golf: outright safe → critical", () => {
  const t = "The outright winner is safe — book the ticket.";
  const g = lintGolfOutput(t);
  assert.ok(codes(g).includes("golf_outright_probability_inflation"));
});

test("Golf: Top 10 without form/course context → warning", () => {
  const t = "Top 10 finish is the play on my card tonight.";
  const g = lintGolfOutput(t);
  assert.ok(codes(g).includes("golf_placement_context_gap"));
});

test("F1: fastest lap safe without tyre/pit → critical", () => {
  const t = "Fastest lap is safe given his race pace.";
  const f = lintF1Output(t);
  assert.ok(codes(f).includes("f1_fastest_lap_volatility_missing"));
  assert.ok(f.some((i) => i.code === "f1_fastest_lap_volatility_missing" && i.requiresRegeneration));
});

test("F1: podium call without pace/quali/reliability wording → warning", () => {
  const t = "Podium prediction: he finishes top three cash.";
  const f = lintF1Output(t);
  assert.ok(codes(f).includes("f1_result_probability_inflation"));
});

test("NHL: anytime goal lock → critical", () => {
  const t = "Anytime goal scorer is a lock — empty net path.";
  const n = lintNhlOutput(t);
  assert.ok(codes(n).includes("nhl_goal_scorer_overconfidence"));
});

test("NHL: SOG prop without volume/PP context → warning", () => {
  const t = "Take over 3.5 shots on goal — I like the price.";
  const n = lintNhlOutput(t);
  assert.ok(codes(n).includes("nhl_sog_context_gap"));
});

test("Soccer: goal scorer overconfidence → critical", () => {
  const t = "Anytime goal scorer is guaranteed today.";
  const s = lintSoccerOutput(t);
  assert.ok(codes(s).includes("soccer_goal_scorer_overconfidence"));
});

test("Soccer: shots prop without role context → warning", () => {
  const t = "Over 2.5 shots on target is the edge.";
  const s = lintSoccerOutput(t);
  assert.ok(codes(s).includes("soccer_shots_context_gap"));
});

test("Tennis: match winner lock → critical", () => {
  const t = "Match winner on the moneyline is a lock.";
  const x = lintTennisOutput(t);
  assert.ok(codes(x).includes("tennis_match_winner_overconfidence"));
});

test("Tennis: aces prop without surface/return context → warning", () => {
  const t = "Lean over 9.5 aces — lean on the serve.";
  const x = lintTennisOutput(t);
  assert.ok(codes(x).includes("tennis_aces_context_gap"));
});

test("runSportSpecificValidators respects sport hint", () => {
  const t = "Anytime TD is a lock.";
  const nfl = runSportSpecificValidators(t, { sport: "nfl" });
  assert.ok(nfl.issues.some((i) => i.code === "nfl_anytime_td_overconfidence"));
  const mlb = runSportSpecificValidators(t, { sport: "mlb" });
  assert.ok(!mlb.issues.some((i) => i.code === "nfl_anytime_td_overconfidence"));
});

test("sport evidence enforcement: flags block sharp money without feed", () => {
  const flags = {
    lineMovementEvidence: false,
    weatherEvidence: false,
    injuryEvidence: false,
    matchupStatsEvidence: false,
    courseEvidence: false,
    surfaceEvidence: false,
    sessionDataEvidence: false,
  };
  const issues = lintSportEvidenceEnforcement("Sharp money steamed this side.", {
    unsupportedClaimFlags: flags,
  });
  assert.ok(issues.some((i) => i.code === "unsupported_line_movement_claim" && i.requiresRegeneration));
});

test("sport evidence enforcement: thin layer + High confidence is critical", () => {
  const thinLayer = {
    verifiedSnapshot: ["One fact"],
    baselineFacts: [],
    dataLimitations: [],
    unsupportedClaimFlags: {
      lineMovementEvidence: false,
      weatherEvidence: false,
      injuryEvidence: false,
      matchupStatsEvidence: false,
      courseEvidence: false,
      surfaceEvidence: false,
      sessionDataEvidence: false,
    },
    confidenceDrivers: [],
  };
  assert.equal(sportEvidenceLayerIsThin(thinLayer), true);
  const issues = lintSportEvidenceEnforcement("This is a High confidence take on the over.", {
    sportEvidenceLayer: thinLayer,
  });
  assert.ok(issues.some((i) => i.code === "evidence_thin_high_confidence_cap"));
});

test("sport evidence enforcement runs before sport switch (generic route)", () => {
  const flags = {
    lineMovementEvidence: false,
    weatherEvidence: false,
    injuryEvidence: false,
    matchupStatsEvidence: false,
    courseEvidence: false,
    surfaceEvidence: false,
    sessionDataEvidence: false,
  };
  const r = runSportSpecificValidators("Syndicate reverse line movement confirms the under.", {
    sport: "generic",
    unsupportedClaimFlags: flags,
  });
  assert.ok(r.criticalCodes.includes("unsupported_line_movement_claim"));
});

test("healthy MLB writeup: no critical sport flags", () => {
  const t =
    "Listed starter with a 28% K rate and soft contact profile — over 5.5 strikeouts is a lean vs this lineup; volatility stays live and the bullpen is rested.";
  const full = lintUrTakeOutput(t, { sport: "mlb", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("healthy F1 writeup: podium with quali + tyre context", () => {
  const t =
    "Podium lean: strong qualifying slot, long-run race pace, and clean tyre strategy vs degradation — bank volatility risk.";
  const f = lintF1Output(t);
  assert.equal(f.filter((i) => i.code === "f1_result_probability_inflation").length, 0);
});

test("healthy NFL: QB passing with defense and weather", () => {
  const t =
    "Passing yards under — secondary can cloud windows and wind over 15mph caps explosive shots.";
  const n = lintNflOutput(t);
  assert.equal(n.filter((i) => i.code === "nfl_qb_prop_context_gap").length, 0);
});

/** One calibrated “good answer” per sport — must not trigger QA regeneration. */
test("false-positive: MLB HR copy (volatile + matchup + weather)", () => {
  const t =
    "This HR prop is volatile, but the price is playable because of matchup and weather context.";
  const full = lintUrTakeOutput(t, { sport: "mlb", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: NFL anytime TD (variance + goal-line role)", () => {
  const t =
    "Anytime TD is high variance; lean only if goal-line role is confirmed.";
  const full = lintUrTakeOutput(t, { sport: "nfl", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: Golf outright ‘not safe’ + course fit", () => {
  const t =
    "Outright winner is not safe, but course fit supports a small stake.";
  assert.equal(lintGolfOutput(t).filter((i) => i.requiresRegeneration).length, 0);
  const full = lintUrTakeOutput(t, { sport: "golf", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: F1 podium / pace / tyres (no inflated certainty)", () => {
  const t =
    "Podium lean is thin; qualifying pace, race tyres, and reliability history explain the price — treat as volatility.";
  const full = lintUrTakeOutput(t, { sport: "f1", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: NHL goal scorer variance + PP context", () => {
  const t =
    "Anytime goal scorer markets are noisy; PP1 deployment and shot volume vs matchup pace keep this speculative.";
  const full = lintUrTakeOutput(t, { sport: "nhl", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: Soccer goal/shots with role + minutes", () => {
  const t =
    "Anytime goal pricing is sharp; projected minutes, striker role, and opponent defensive shape anchor only a lean.";
  const full = lintUrTakeOutput(t, { sport: "soccer", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: Tennis match winner + surface context", () => {
  const t =
    "Match winner is only a lean — clay surface speed, return metrics, and recent form justify limited stake.";
  const full = lintUrTakeOutput(t, { sport: "tennis", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});

test("false-positive: NBA lean with usage + matchup (no stat misuse)", () => {
  const t =
    "Lean over 24.5 points — season usage stable vs drop coverage; matchup pace supports shot volume; variance noted.";
  const full = lintUrTakeOutput(t, { sport: "nba", betIntegrityIssues: [] });
  assert.equal(full.shouldRegenerate, false);
});
