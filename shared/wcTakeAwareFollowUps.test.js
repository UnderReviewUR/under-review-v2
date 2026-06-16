import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTakeAwareFollowUpChips,
  buildWcTakeAwareNextLine,
  resolveWcTakeAwareNextLine,
} from "./wcTakeAwareFollowUps.js";
import { isWcTournamentTopScorerQuestion } from "./wcUrTakeIntent.js";
import { WC_INTENT, classifyWcPlayerMarketIntent } from "./wcUrTakeIntent.js";

test("buildWcTakeAwareNextLine — Under 2.5 fixture take", () => {
  const line = buildWcTakeAwareNextLine({
    structured: {
      fixtureHome: "FRA",
      fixtureAway: "SEN",
      lean: "Lean Under 2.5 goals",
      call: "Lean Under 2.5 goals",
    },
  });
  assert.match(line || "", /Senegal sitting deep/i);
  assert.match(line || "", /Under 2\.5/i);
});

test("buildWcTakeAwareNextLine — posted Mbappé scorer", () => {
  const line = buildWcTakeAwareNextLine({
    structured: {
      fixtureHome: "FRA",
      fixtureAway: "SEN",
      call: "Kylian Mbappé anytime scorer -125",
      lean: "1. Kylian Mbappé anytime scorer -125",
      whyNow: "Posted anytime scorer lines for France vs Senegal.",
    },
  });
  assert.match(line || "", /Mbappé -125/i);
});

test("buildWcTakeAwareFollowUpChips — parlay from prior Under in history", () => {
  const chips = buildWcTakeAwareFollowUpChips(
    {
      structured: {
        fixtureHome: "FRA",
        fixtureAway: "SEN",
        call: "Kylian Mbappé anytime scorer -125",
        lean: "1. Kylian Mbappé anytime scorer -125",
      },
    },
    "",
    [
      {
        role: "assistant",
        structured: { lean: "Lean Under 2.5 goals", call: "Lean Under 2.5 goals" },
      },
    ],
  );
  assert.ok(chips.some((c) => /Parlay:.*Mbappé.*Under 2\.5/i.test(c)));
});

test("isWcTournamentTopScorerQuestion — tournament vs match", () => {
  assert.equal(
    isWcTournamentTopScorerQuestion("Who scores the most goals in the World Cup?"),
    true,
  );
  assert.equal(classifyWcPlayerMarketIntent("Who scores the most goals in the World Cup?"), WC_INTENT.TOP_SCORER);
  assert.equal(
    classifyWcPlayerMarketIntent("What are player props for this match?"),
    WC_INTENT.PLAYER_PROP,
  );
  assert.equal(
    isWcTournamentTopScorerQuestion("Who scores the most for France vs Senegal?"),
    false,
  );
});

test("resolveWcTakeAwareNextLine prefers take-aware copy", () => {
  const line = resolveWcTakeAwareNextLine("Next: generic", {
    structured: {
      fixtureHome: "FRA",
      fixtureAway: "SEN",
      lean: "Lean Under 2.5 goals",
    },
  });
  assert.match(line || "", /Under 2\.5/);
  assert.doesNotMatch(line || "", /generic/);
});
