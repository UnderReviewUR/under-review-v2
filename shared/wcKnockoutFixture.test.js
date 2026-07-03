import assert from "node:assert/strict";
import test from "node:test";
import {
  detectWcKnockoutBothAdvanceBleed,
  detectWcKnockoutFormatBoilerplateLead,
  isWcKnockoutFormatBoilerplateSentence,
  detectWcKnockoutDrawDismissal,
  isWcKnockoutDrawDismissalSentence,
  repairWcKnockoutMatchupStructured,
  stripWcKnockoutFormatBoilerplateLead,
  stripKnockoutDrawDismissal,
} from "./wcKnockoutFixture.js";

const R32_MATCH = { homeTeam: "EGY", awayTeam: "AUS", round: "Round of 32", status: "NS" };
const KNOCKOUT_SCOPE = { tournamentPhase: "ROUND_OF_32" };

test("detectWcKnockoutBothAdvanceBleed — tournament sims both-advance on R32", () => {
  const structured = {
    lean: "Egypt advances — Salah's creation load overwhelms Australia.",
    whyNow:
      "Both teams advance from the Round of 32 in tournament sims (100% each), but this is single elimination.",
  };
  assert.equal(
    detectWcKnockoutBothAdvanceBleed("", structured, [R32_MATCH], KNOCKOUT_SCOPE),
    true,
  );
});

test("stripWcKnockoutFormatBoilerplateLead removes format openers", () => {
  const raw =
    "Both teams advance from the Round of 32 in tournament sims (100% each), but this is single elimination – exactly one team wins. The 90-minute moneyline is the only settlement that matters for advancement; extra time and penalties are live if level after 90. Pass the moneyline — lean Egypt -1.5 (+105).";
  const stripped = stripWcKnockoutFormatBoilerplateLead(raw);
  assert.doesNotMatch(stripped, /Both teams advance/i);
  assert.doesNotMatch(stripped, /single elimination/i);
  assert.match(stripped, /Egypt -1\.5/);
});

test("isWcKnockoutFormatBoilerplateSentence flags settlement reminders", () => {
  assert.equal(
    isWcKnockoutFormatBoilerplateSentence(
      "The 90-minute moneyline is the only settlement that matters for advancement.",
    ),
    true,
  );
  assert.equal(
    isWcKnockoutFormatBoilerplateSentence(
      "Egypt -110 · UR win bar 58% — Salah's creation breaks Australia's low block.",
    ),
    false,
  );
});

test("detectWcKnockoutFormatBoilerplateLead flags wasted whyNow opening", () => {
  const structured = {
    whyNow:
      "Both teams advance from the Round of 32 in tournament sims (100% each), but this is single elimination. Pass the ML — lean Over 2.5.",
  };
  assert.equal(
    detectWcKnockoutFormatBoilerplateLead("", structured, [R32_MATCH], KNOCKOUT_SCOPE),
    true,
  );
});

test("repairWcKnockoutMatchupStructured strips sims-advance bleed from whyNow", () => {
  const repaired = repairWcKnockoutMatchupStructured(
    {
      call: "Egypt advances — Salah's creation load overwhelms Australia.",
      lean: "Pass on ML — lean Over 2.5 goals",
      whyNow:
        "Both teams advance from the Round of 32 in tournament sims (100% each), but this is single elimination. Pass the moneyline — lean Egypt -1.5 (+105).",
    },
    R32_MATCH,
    KNOCKOUT_SCOPE,
  );
  assert.doesNotMatch(String(repaired.whyNow), /Both teams advance/i);
  assert.match(String(repaired.whyNow), /Egypt -1\.5/);
});

test("detectWcKnockoutDrawDismissal — avoid draw because one team must advance", () => {
  const structured = {
    deep:
      "Avoid the draw at +195; too juicy a trap in a knockout where one team has to advance.",
  };
  assert.equal(
    detectWcKnockoutDrawDismissal("", structured, [R32_MATCH], KNOCKOUT_SCOPE),
    true,
  );
});

test("isWcKnockoutDrawDismissalSentence — tactical fade without format confusion is OK", () => {
  assert.equal(
    isWcKnockoutDrawDismissalSentence(
      "Fade Draw +195 — Egypt presses for a lead and Australia chases late, not a cagey 0-0 script.",
    ),
    false,
  );
});

test("stripKnockoutDrawDismissal removes invalid draw dismissal", () => {
  const raw =
    "If Over 2.5 goals posts at -110 or better, that's live too. Avoid the draw at +195; too juicy a trap in a knockout where one team has to advance.";
  const stripped = stripKnockoutDrawDismissal(raw);
  assert.doesNotMatch(stripped, /Avoid the draw/i);
  assert.match(stripped, /Over 2\.5/);
});

test("repairWcKnockoutMatchupStructured strips draw dismissal from deep", () => {
  const repaired = repairWcKnockoutMatchupStructured(
    {
      lean: "Lean Egypt -1.5 (+105)",
      deep:
        "Egypt -1.5 is the cleanest lean. Avoid the draw at +195; too juicy a trap in a knockout where one team has to advance.",
    },
    R32_MATCH,
    KNOCKOUT_SCOPE,
  );
  assert.doesNotMatch(String(repaired.deep), /Avoid the draw/i);
});
