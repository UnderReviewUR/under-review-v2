/**
 * Thread archetype regression — routing + checkpoint line direction.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  isWcPriceSensitiveTalkBypass,
  isWcSimpleMatchupTalkOpener,
  resolveUrTakeDeliveryMode,
} from "./urTakeDeliveryMode.js";
import { isWcVagueMatchGoalsOverUnderAsk } from "./wcMatchBettingPrompt.js";
import {
  buildWcLiveEntryPlanningPrebuiltStructured,
  isWcLineMovementWrongDirectionProse,
  synthesizeWcLiveEntryPlanningLean,
} from "./wcOddsLineMovement.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

const FRA_HISTORY = [
  {
    role: "user",
    content: "Who wins FRA vs PAR? Give me the sharpest pre-match lean with the line.",
  },
  {
    role: "assistant",
    structured: {
      lean: "FRA moneyline at -575 to win",
      call: "FRA -575 to win",
      fixtureHome: "FRA",
      fixtureAway: "PAR",
    },
  },
];

function withTalkMode(fn) {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  try {
    fn();
  } finally {
    if (prev) process.env.UR_TALK_MODE = prev;
    else delete process.env.UR_TALK_MODE;
  }
}

test("FRA sharp opener — Take not Talk", () => {
  withTalkMode(() => {
    const q = "Who wins FRA vs PAR? Give me the sharpest pre-match lean with the line.";
    assert.equal(isWcSimpleMatchupTalkOpener(q), false);
    assert.equal(
      resolveUrTakeDeliveryMode({
        sportHint: "worldcup",
        wcIntent: WC_INTENT.MATCHUP,
        question: q,
        isConversationFollowUp: false,
      }),
      "take",
    );
  });
});

test("FRA besides ML follow-up — Take not Talk", () => {
  withTalkMode(() => {
    const q = "What's the best bet besides the moneyline?";
    assert.equal(isWcPriceSensitiveTalkBypass(q), true);
    assert.equal(
      resolveUrTakeDeliveryMode({
        sportHint: "worldcup",
        wcIntent: WC_INTENT.MATCHUP,
        question: q,
        isConversationFollowUp: true,
        history: FRA_HISTORY,
      }),
      "take",
    );
  });
});

test("FRA wait for 0-0 at 30 — Take + drift-out lean", () => {
  const q =
    "money line is -525 on france... over 1.5 is -525. i might wait to see if 0-0 about 30 minutes in and evaluate the lines";
  withTalkMode(() => {
    assert.equal(isWcPriceSensitiveTalkBypass(q), true);
    assert.equal(
      resolveUrTakeDeliveryMode({
        sportHint: "worldcup",
        wcIntent: WC_INTENT.MATCHUP,
        question: q,
        isConversationFollowUp: true,
        history: FRA_HISTORY,
      }),
      "take",
    );
  });
  const lean = synthesizeWcLiveEntryPlanningLean(q, {
    home: "PAR",
    away: "FRA",
    match: {
      odds: {
        home: { moneyline: "-525" },
        away: { moneyline: "+1800" },
        draw: { moneyline: "+650" },
      },
    },
  });
  assert.match(lean, /France/i);
  assert.match(lean, /drift/i);
  assert.doesNotMatch(lean, /(?:toward|to|at|compress(?:es)?\s+to)\s*-650/i);
});

test("FRA O2.5 tempting — Take + vague OU classifier", () => {
  const q = "over 2.5 goals at -150 is tempting";
  withTalkMode(() => {
    assert.equal(isWcVagueMatchGoalsOverUnderAsk(q), true);
    assert.equal(isWcPriceSensitiveTalkBypass(q), true);
    assert.equal(
      resolveUrTakeDeliveryMode({
        sportHint: "worldcup",
        wcIntent: WC_INTENT.MATCHUP,
        question: q,
        isConversationFollowUp: true,
        history: FRA_HISTORY,
      }),
      "take",
    );
  });
});

test("explain-only follow-up stays Talk", () => {
  withTalkMode(() => {
    assert.equal(isWcPriceSensitiveTalkBypass("why under 2.5?"), false);
    assert.equal(
      resolveUrTakeDeliveryMode({
        sportHint: "worldcup",
        wcIntent: WC_INTENT.MATCHUP,
        question: "why under 2.5?",
        isConversationFollowUp: true,
        history: [
          { role: "user", content: "totals on FRA vs PAR" },
          { role: "assistant", structured: { lean: "Lean Under 2.5" } },
        ],
      }),
      "talk",
    );
  });
});

test("live entry prebuilt — FRA checkpoint card", () => {
  const q =
    "money line is -525 on france... i might wait to see if 0-0 about 30 minutes in and evaluate the lines";
  const card = buildWcLiveEntryPlanningPrebuiltStructured({
    home: "FRA",
    away: "PAR",
    question: q,
  });
  assert.ok(card);
  assert.match(String(card.lean), /drift/i);
});

test("wrong-direction prose detector — -650 at 0-0", () => {
  const bad =
    "At 0-0 after 30, FRA moneyline will compress tighter (probably -650+) because Paraguay's still in it.";
  assert.equal(isWcLineMovementWrongDirectionProse(bad, bad), true);
});
