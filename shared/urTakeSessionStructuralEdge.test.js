import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendSessionStructuralEdgeBlock,
  buildStructuralEdgeChipModel,
  findEstablishedSessionStructuralEdge,
  golfersNameMatch,
} from "./urTakeSessionStructuralEdge.js";

test("golfersNameMatch — last name", () => {
  assert.equal(golfersNameMatch("Jon Rahm", "Rahm"), true);
  assert.equal(golfersNameMatch("Alex Smalley", "Jon Rahm"), false);
});

test("buildStructuralEdgeChipModel — Rahm edge vs Smalley leader", () => {
  const history = [
    {
      role: "assistant",
      sport: "golf",
      structured: {
        call: "Jon Rahm top-20 value",
        whyNow: "Approach game fits chase script.",
        edge: "Structural edge at these prices.",
        confidence: "High",
      },
      content: "",
    },
  ];
  const chip = buildStructuralEdgeChipModel({
    sessionHistory: history,
    sportHint: "golf",
    leaderboard: [{ name: "Alex Smalley", position: 1, score: "-8" }],
    outrights: [{ player: "Jon Rahm", odds: 488 }],
    formatOdds: (n) => (n > 0 ? `+${n}` : String(n)),
  });
  assert.ok(chip);
  assert.match(chip.label, /The angle: Jon Rahm \+488/);
});

test("buildStructuralEdgeChipModel — hidden when leader matches edge", () => {
  const history = [
    {
      role: "assistant",
      sport: "golf",
      structured: { call: "Alex Smalley outright", confidence: "Medium" },
      content: "",
    },
  ];
  const chip = buildStructuralEdgeChipModel({
    sessionHistory: history,
    sportHint: "golf",
    leaderboard: [{ name: "Alex Smalley", position: 1 }],
    outrights: [],
    formatOdds: (n) => `+${n}`,
  });
  assert.equal(chip, null);
});

test("findEstablishedSessionStructuralEdge — structured golf Rahm thesis", () => {
  const history = [
    {
      role: "assistant",
      sport: "golf",
      structured: {
        call: "Jon Rahm outright / top-20 value",
        whyNow: "Approach game and major pedigree fit this chase script.",
        edge: "Structural edge vs the field at these prices.",
        confidence: "High",
        callType: "outright",
      },
      content: "Summary text",
    },
  ];
  const edge = findEstablishedSessionStructuralEdge(history, "golf");
  assert.ok(edge);
  assert.equal(edge.player, "Jon Rahm");
});
