import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendSessionStructuralEdgeBlock,
  findEstablishedSessionStructuralEdge,
} from "../shared/urTakeSessionStructuralEdge.js";

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

test("appendSessionStructuralEdgeBlock — golf leader vs value rule", () => {
  const history = [
    {
      role: "assistant",
      sport: "golf",
      structured: {
        call: "Back Jon Rahm top-20",
        whyNow: "Structural edge on approach.",
        edge: "Value at current prices.",
        confidence: "Medium",
      },
      content: "",
    },
  ];
  const out = appendSessionStructuralEdgeBlock("", history, "golf");
  assert.match(out, /SESSION STRUCTURAL EDGE/);
  assert.match(out, /Jon Rahm/);
  assert.match(out, /leaderboard leader/i);
  assert.match(out, /Do NOT flip THE PLAY/i);
});
