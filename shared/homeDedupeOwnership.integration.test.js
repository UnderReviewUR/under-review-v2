/**
 * Integration-style ownership: same canonical event key must not win placement in snapshot,
 * Today's Slate (visible rows), and spotlight cards simultaneously — matches App.jsx cardExcludeSet behavior.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  filterSlateRowsForSnapshotOverlap,
  buildCardExcludeSet,
  filterCardCandidatesByExcludeSet,
} from "./homeDedupeOwnership.js";

test("ownership chain: snapshot key suppresses overlapping slate row and card; slate-only key suppresses card only", () => {
  const liveSnapshotKeys = new Set(["nba:100", "tennis:atp|x"]);

  const slateRows = [
    { id: "safeLean", eventKeys: ["nba:100"] },
    { id: "sharpAngle", eventKeys: ["mlb:200"] },
    { id: "contrarian", eventKeys: [] },
  ];

  const visibleSlateRows = filterSlateRowsForSnapshotOverlap(liveSnapshotKeys, slateRows);
  assert.deepEqual(
    visibleSlateRows.map((r) => r.id),
    ["sharpAngle", "contrarian"],
  );

  const slateDisplayedKeys = new Set();
  for (const row of visibleSlateRows) {
    for (const k of row.eventKeys || []) slateDisplayedKeys.add(k);
  }
  assert.ok(slateDisplayedKeys.has("mlb:200"));
  assert.ok(!slateDisplayedKeys.has("nba:100"));

  const cardExclude = buildCardExcludeSet(liveSnapshotKeys, slateDisplayedKeys);
  const candidates = [
    { eventKey: "nba:100", surface: "nba_spotlight" },
    { eventKey: "mlb:200", surface: "mlb_spotlight" },
    { eventKey: "f1:monaco", surface: "f1_spotlight" },
  ];
  const cardsAfter = filterCardCandidatesByExcludeSet(cardExclude, candidates);

  assert.ok(
    !cardsAfter.some((c) => c.eventKey === "nba:100"),
    "NBA card suppressed — already owned by Live Snapshot",
  );
  assert.ok(
    !cardsAfter.some((c) => c.eventKey === "mlb:200"),
    "MLB card suppressed — key surfaced on Today's Slate visible row",
  );
  assert.ok(
    cardsAfter.some((c) => c.eventKey === "f1:monaco"),
    "Unclaimed key still eligible for cards",
  );

  const cardKeys = new Set(cardsAfter.map((c) => c.eventKey).filter(Boolean));
  for (const k of liveSnapshotKeys) {
    assert.ok(!cardKeys.has(k), `snapshot-owned ${k} must not also appear as a card`);
  }
  for (const k of slateDisplayedKeys) {
    assert.ok(!cardKeys.has(k), `slate-displayed ${k} must not also appear as a card`);
  }
});
