import test from "node:test";
import assert from "node:assert/strict";

import {
  pickFirstNbaModelContextPropLineRow,
  buildCompositePropLineKey,
  buildOpeningLineSnapshotFromModelContext,
} from "./_takeOpeningLineSnapshot.js";

test("NBA: first propLines row in array order that passes verification filters", () => {
  const propLines = [
    { player: "Jayson Tatum", prop: "points", line: 28.5, side: "over", odds: -110, book: "dk", eventId: "e1" },
    { player: "Jayson Tatum", prop: "points", line: 27.5, side: "over", odds: -105, book: "fd", eventId: "e1" },
  ];
  const pl = pickFirstNbaModelContextPropLineRow(
    propLines,
    "Jayson Tatum over 28.5 points",
    "Jayson Tatum",
    [{ name: "Jayson Tatum", team: "BOS", pts: 30 }],
  );
  assert.ok(pl);
  assert.equal(pl.line, 28.5);
  assert.equal(pl.book, "dk");
});

test("buildOpeningLineSnapshotFromModelContext NBA attaches boardFetchedAt and snapshotSource", () => {
  const snap = buildOpeningLineSnapshotFromModelContext({
    sport: "nba",
    question: "Jayson Tatum over 28.5 points",
    nbaContextForModel: {
      propLines: [
        {
          player: "Jayson Tatum",
          prop: "points",
          line: 28.5,
          side: "Over",
          odds: -110,
          book: "dk",
          eventId: "ev99",
        },
      ],
      playerStats: [{ name: "Jayson Tatum", team: "BOS" }],
    },
    targetedPlayer: "Jayson Tatum",
    boardFetchedAt: "2026-01-02T12:00:00.000Z",
  });
  assert.ok(snap);
  assert.equal(snap.snapshotSource, "model_context_propLines");
  assert.equal(snap.boardFetchedAt, "2026-01-02T12:00:00.000Z");
  assert.equal(snap.openingAmerican, -110);
  assert.equal(snap.openingDecimal, 1.9091);
  assert.equal(snap.openingBook, "dk");
  assert.equal(snap.side, "Over");
  assert.equal(snap.eventId, "ev99");
  assert.ok(String(snap.propLineKey || "").includes("ev99"));
});

test("buildCompositePropLineKey prefers explicit propLineKey on row", () => {
  assert.equal(
    buildCompositePropLineKey({ propLineKey: "stable-id-1", player: "X" }, "nba"),
    "stable-id-1",
  );
});
