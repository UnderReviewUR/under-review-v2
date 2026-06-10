/**
 * World Cup Card Contract — golden fixture intent + layout scorer smoke tests.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { WC_CARD_CONTRACT_GOLDEN_CASES } from "../shared/wcCardContractGolden.fixture.js";
import {
  scoreWcCardContractIntent,
  scoreWcCardContractLayout,
  scoreWcCardContractCase,
} from "../shared/wcCardContractScorer.js";
import { scoreWcCardContractVoice } from "../shared/wcCardContractVoice.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";

test("golden fixture has twenty-one cases across intents", () => {
  assert.equal(WC_CARD_CONTRACT_GOLDEN_CASES.length, 21);
  const intents = new Set(WC_CARD_CONTRACT_GOLDEN_CASES.map((c) => c.expectedIntent));
  assert.ok(intents.has("RULES"));
  assert.ok(intents.has("PLAYER_PROP"));
  assert.ok(intents.has("GOLDEN_BOOT"));
});

test("layout scorer enforces headline cap and labeled fields", () => {
  const good = scoreWcCardContractLayout({
    call: "Brazil value at +800 outright.",
    line: "Market BRA +800 · UR ~+850.",
    confidence: "Medium",
    whyNow: "Group path is clean.",
    edge: "Watch late injury news.",
    lean: "Pass at +800 — fair favorite.",
    callType: "analysis",
  });
  assert.equal(good.passed, true);

  const bad = scoreWcCardContractLayout({
    call:
      "Brazil is structurally mispriced at plus eight hundred given group depth and knockout path and squad quality and bracket luck.",
    line: "Market BRA +800 · UR ~+850.",
    confidence: "Medium",
    whyNow: "Group path is clean.",
    edge: "Watch late injury news.",
    callType: "analysis",
  });
  assert.equal(bad.passed, false);
  assert.ok(bad.issues.includes("headline_over_18_words"));
});

test("intent scorer flags France vs Brazil prop question", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "player-prop-scorer");
  assert.ok(row);
  const intent = scoreWcCardContractIntent(row.question, row.expectedIntent);
  assert.equal(intent.passed, true);
  assert.equal(classifyWcQuestionIntent(row.question), "PLAYER_PROP");
});

test("Group D comparative advancement intent classifies as ENTITY_PRICING", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "group-d-comparative-advancement");
  assert.ok(row);
  const intent = scoreWcCardContractIntent(row.question, row.expectedIntent);
  assert.equal(intent.passed, true);
  assert.equal(classifyWcQuestionIntent(row.question), "ENTITY_PRICING");
});

test("Group D retention fixture passes QA gates with compliant structured payload", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "group-d-comparative-advancement");
  assert.ok(row);
  const structured = {
    call: "USA escape is the misprice — not Türkiye winning Group D.",
    line: "[UR model · 10k Poisson/Elo · Jun 10] USA advance sim 62% · market ~52% · vs Paraguay second-place path tighter.",
    whyNow:
      "Türkiye is the Favorite but USA advance at -110 implies 52% — sims have 62% escape with host path.",
    edge: "Watch for USA–Paraguay opener result before locking USA group-advance exposure.",
    lean: "Lean: USA qualify from group — sim delta vs market on escape path.",
    callType: "advancement",
    confidence: "Medium",
  };
  const scored = scoreWcCardContractCase({
    question: row.question,
    expectedIntent: row.expectedIntent,
    structured,
    wcIntent: "ENTITY_PRICING",
    outrightsAvailable: true,
    responseText: `${structured.call}\n${structured.line}\n${structured.whyNow}`,
  });
  assert.equal(scored.intentOk, true);
  assert.ok(
    !scored.issueCodes.includes("wc_missing_sim_attribution"),
    `attribution failed: ${scored.issueCodes.join(",")}`,
  );
  assert.ok(
    !scored.issueCodes.includes("wc_dedup_watch_for"),
    `dedup failed: ${scored.issueCodes.join(",")}`,
  );
  assert.ok(
    !scored.issueCodes.includes("wc_missing_comparative_proof"),
    `comparative failed: ${scored.issueCodes.join(",")}`,
  );
});

test("sample golden case passes layout scorer with mock structured payload", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "outright-mispriced");
  assert.ok(row);
  const payload = {
    call: "Brazil +450 is fair — market prices group I chaos correctly.",
    line: "Market BRA +450 · UR ~+480.",
    confidence: "Medium",
    whyNow: "Group I depth and knockout variance cap upside at +450.",
    edge: "Injury news on Vinícius could reprice this.",
    lean: "Pass at +450 — no edge on the outright.",
    callType: "analysis",
  };
  const layout = scoreWcCardContractLayout(payload);
  assert.equal(layout.passed, true, layout.issues?.join(", "));
  const voice = scoreWcCardContractVoice(payload);
  assert.equal(voice.passed, true, voice.issues?.join(", "));
  const intent = scoreWcCardContractIntent(row.question, row.expectedIntent);
  assert.equal(intent.passed, true);
});

test("golden day-one cases expect arguing voice", () => {
  const dayOne = WC_CARD_CONTRACT_GOLDEN_CASES.filter((c) => c.cardVoice === "argue");
  assert.ok(dayOne.length >= 10);
});
