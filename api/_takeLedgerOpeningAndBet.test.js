import test from "node:test";
import assert from "node:assert/strict";

import { getDurableJson } from "./_durableStore.js";
import {
  appendTakeForUser,
  extractTakeFromResponse,
  recordTakeBetSignal,
  recordEstimatedEdgeOutcome,
} from "./_takeLedger.js";

test("extractTakeFromResponse stores openingLineSnapshot on take", () => {
  const snap = {
    propLineKey: "k1",
    snapshotSource: "model_context_propLines",
    boardFetchedAt: "2026-01-01T00:00:00.000Z",
    openingAmerican: -115,
    openingDecimal: 2.15,
    openingBook: "bk",
    eventId: "e1",
    marketKey: "points",
    playerName: "A",
    line: 20.5,
    side: "over",
  };
  const t = extractTakeFromResponse({
    responseText: "THE PLAY\nTest over 1.5 y\n\nCONFIDENCE\nHigh",
    sport: "nba",
    intent: "prop_projection",
    question: "Will it hit?",
    openingLineSnapshot: snap,
  });
  assert.equal(t.openingLineSnapshot.propLineKey, "k1");
  assert.equal(t.openingLineSnapshot.snapshotSource, "model_context_propLines");
});

test("recordTakeBetSignal is one-way (second call rejected)", async () => {
  const email = `bet-sig-${Date.now()}@example.com`;
  const take = extractTakeFromResponse({
    responseText: "THE PLAY\nSide lean\n\nCONFIDENCE\nMedium",
    sport: "nba",
    intent: "general",
    question: "q?",
    openingLineSnapshot: {
      propLineKey: "x",
      snapshotSource: "model_context_propLines",
      boardFetchedAt: "2026-05-07T00:00:00.000Z",
    },
  });
  await appendTakeForUser(email, take);
  const r1 = await recordTakeBetSignal(email, take.id, true, "2026-05-07T10:00:00.000Z");
  assert.equal(r1.ok, true);
  const r2 = await recordTakeBetSignal(email, take.id, false, "2026-05-07T11:00:00.000Z");
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, "already_recorded");
});

test("recordTakeBetSignal updates estimatedEdgeMeta.userBetSignal", async () => {
  const email = `ee-bet-${Date.now()}@example.com`;
  const take = extractTakeFromResponse({
    responseText: "THE PLAY\nSide lean\n\nCONFIDENCE\nMedium",
    sport: "nba",
    intent: "general",
    question: "q?",
    openingLineSnapshot: null,
  });
  take.estimatedEdgeMeta = {
    v: 1,
    sport: "nba",
    marketType: "ml",
    subject: "BOS",
    dataQuality: "strong",
    dataQualityReason: "x",
    confidence: "Medium",
    projectionPresent: false,
    fairLinePresent: true,
    leanReadPresent: false,
    leanReadExcerpt: null,
    fairLineNumeric: -150,
    projectionNumeric: null,
    userBetSignal: null,
    outcome: null,
  };
  await appendTakeForUser(email, take);
  const r1 = await recordTakeBetSignal(email, take.id, true, "2026-05-07T10:00:00.000Z");
  assert.equal(r1.ok, true);
  const bundle = await getDurableJson(`takes:${email}`);
  const stored = bundle.takes.find((t) => t.id === take.id);
  assert.equal(stored.estimatedEdgeMeta.userBetSignal, "yes");
});

test("recordEstimatedEdgeOutcome writes outcome and miss distance", async () => {
  const email = `ee-out-${Date.now()}@example.com`;
  const take = extractTakeFromResponse({
    responseText: "THE PLAY\nOver\n\nCONFIDENCE\nMedium",
    sport: "nba",
    intent: "prop_projection",
    question: "q?",
    openingLineSnapshot: null,
  });
  take.estimatedEdgeMeta = {
    v: 1,
    sport: "nba",
    dataQuality: "usable",
    dataQualityReason: "",
    confidence: "Medium",
    projectionPresent: true,
    fairLinePresent: true,
    leanReadPresent: false,
    leanReadExcerpt: null,
    fairLineNumeric: 22.5,
    projectionNumeric: 24,
    userBetSignal: "yes",
    outcome: null,
  };
  await appendTakeForUser(email, take);
  const out = await recordEstimatedEdgeOutcome(email, take.id, {
    result: "win",
    actualLine: 23,
  });
  assert.equal(out.ok, true);
  const bundle = await getDurableJson(`takes:${email}`);
  const stored = bundle.takes.find((t) => t.id === take.id);
  assert.equal(stored.estimatedEdgeMeta.outcome.result, "win");
  assert.equal(stored.estimatedEdgeMeta.outcome.missDistance, 0.5);
});
