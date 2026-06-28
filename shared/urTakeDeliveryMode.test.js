import assert from "node:assert/strict";
import test from "node:test";

import {
  isUrTalkModeEnabled,
  resolveUrTakeDeliveryMode,
} from "./urTakeDeliveryMode.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("talk mode off by default", () => {
  const prev = process.env.UR_TALK_MODE;
  delete process.env.UR_TALK_MODE;
  assert.equal(isUrTalkModeEnabled(), false);
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.RULES,
      question: "how does extra time work?",
    }),
    "take",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
});

test("rules question routes to talk when enabled", () => {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.RULES,
      question: "how does group stage advancement work?",
    }),
    "talk",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
  else delete process.env.UR_TALK_MODE;
});

test("slate betting question stays take when enabled", () => {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.STRUCTURAL,
      question: "best totals on tomorrow's slate?",
      isConversationFollowUp: false,
    }),
    "take",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
  else delete process.env.UR_TALK_MODE;
});

test("explain follow-up routes to talk when enabled", () => {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.MATCHUP,
      question: "why under 2.5?",
      isConversationFollowUp: true,
      history: [
        { role: "user", content: "totals tomorrow" },
        {
          role: "assistant",
          structured: { lean: "Lean Under 2.5", callType: "group_slate" },
        },
      ],
    }),
    "talk",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
  else delete process.env.UR_TALK_MODE;
});

test("casual wc follow-up routes to talk when enabled", () => {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      wcIntent: "ENTITY_PRICING",
      question: "hmm what if Mexico scores first?",
      isConversationFollowUp: true,
      history: [
        { role: "user", content: "USA vs Mexico lean?" },
        { role: "assistant", structured: { lean: "Lean: Pass." } },
      ],
    }),
    "talk",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
  else delete process.env.UR_TALK_MODE;
});

test("nba thread follow-up routes to talk when enabled", () => {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "nba",
      wcIntent: null,
      question: "why though? what's the actual edge",
      isConversationFollowUp: true,
      history: [
        { role: "user", content: "Celtics vs Knicks spread?" },
        { role: "assistant", content: "Lean: Under 228." },
      ],
    }),
    "talk",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
  else delete process.env.UR_TALK_MODE;
});

test("parlay follow-up stays take when enabled", () => {
  const prev = process.env.UR_TALK_MODE;
  process.env.UR_TALK_MODE = "1";
  assert.equal(
    resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      wcIntent: WC_INTENT.MATCHUP,
      question: "build me a 3-leg parlay on that",
      isConversationFollowUp: true,
      history: [
        { role: "user", content: "USA vs Mexico" },
        { role: "assistant", structured: { lean: "Lean: USA ML." } },
      ],
    }),
    "take",
  );
  if (prev) process.env.UR_TALK_MODE = prev;
  else delete process.env.UR_TALK_MODE;
});
