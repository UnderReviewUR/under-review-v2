import test from "node:test";
import assert from "node:assert/strict";

import {
  textOrEmpty,
  renderableArray,
  collectUrTakeMsgsRenderIssues,
  collectSavedTakeRowIssues,
  isReactTextChildSafe,
} from "./urTakeRenderSafe.js";
import { buildSharpBriefStatGrid } from "./urTakeSharpBriefUi.js";
import { buildEstimatedEdgeCardModel } from "./urTakeEstimatedEdgeUi.js";

test("textOrEmpty primitives and caps", () => {
  assert.equal(textOrEmpty(null), "");
  assert.equal(textOrEmpty("hello", 3), "hel");
  assert.equal(textOrEmpty(42), "42");
  assert.equal(textOrEmpty(true), "true");
  assert.equal(textOrEmpty(BigInt(9)), "9");
  assert.equal(textOrEmpty(Symbol("s")), "");
  assert.equal(textOrEmpty(() => 1), "");
});

test("renderableArray", () => {
  assert.deepEqual(renderableArray([1, 2]), [1, 2]);
  assert.deepEqual(renderableArray(null), []);
  assert.deepEqual(renderableArray({}), []);
});

test("isReactTextChildSafe", () => {
  assert.equal(isReactTextChildSafe("a"), true);
  assert.equal(isReactTextChildSafe(1), true);
  assert.equal(isReactTextChildSafe(null), true);
  assert.equal(isReactTextChildSafe({}), false);
  assert.equal(isReactTextChildSafe(Symbol("x")), false);
});

test("collectUrTakeMsgsRenderIssues: null row, bad structured, parlayLegs shape, drivers", () => {
  const msgs = [
    null,
    { role: "ai", text: "ok", structured: { call: { o: 1 }, whyNow: "x", edge: "y", confidence: "Medium" } },
    {
      role: "ai",
      text: "t",
      structured: {
        call: "C",
        whyNow: "w",
        edge: "e",
        confidence: "High",
        parlayLegs: "not-array",
        timestamp: Symbol("bad"),
      },
    },
    {
      role: "ai",
      text: "t2",
      estimatedEdge: { source: "estimated_edge", drivers: [{ x: 1 }] },
    },
  ];
  const issues = collectUrTakeMsgsRenderIssues(msgs);
  const paths = issues.map((i) => i.path);
  assert.ok(paths.includes("<row>"));
  assert.ok(paths.some((p) => p.startsWith("structured.call")));
  assert.ok(paths.includes("structured.parlayLegs"));
  assert.ok(paths.includes("structured.timestamp"));
  assert.ok(paths.some((p) => p.startsWith("estimatedEdge.drivers")));
});

test("collectSavedTakeRowIssues flags object snippet", () => {
  const issues = collectSavedTakeRowIssues([{ id: "1", sport: "nba", headlineSnippet: { bad: 1 } }]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, "headlineSnippet");
});

test("buildSharpBriefStatGrid tolerates odd structured.call types (stringified downstream)", () => {
  const grid = buildSharpBriefStatGrid({
    estimatedEdge: null,
    takeMeta: null,
    structured: { call: { not: "a string" }, confidence: "Medium", callType: "single" },
    parlayLegs: "not-array",
  });
  assert.ok(Array.isArray(grid.slots));
  assert.ok(grid.slots.every((s) => typeof s.label === "string"));
});

test("buildEstimatedEdgeCardModel stringifies object drivers", () => {
  const m = buildEstimatedEdgeCardModel({
    source: "estimated_edge",
    dataQuality: "strong",
    projection: "26",
    confidence: "High",
    dataQualityReason: "ok",
    drivers: [{ reason: "x" }, "plain"],
  });
  assert.ok(m);
  assert.equal(m.drivers.length, 2);
  assert.ok(typeof m.drivers[0] === "string");
});
