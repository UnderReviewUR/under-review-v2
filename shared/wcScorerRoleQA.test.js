import assert from "node:assert/strict";
import test from "node:test";
import {
  detectWcScorerRoleMismatch,
  hasWcPlayerNameInText,
  isWcImplausibleGoldenBootPosition,
  isWcRoundupTopScorerSlotValid,
  wcRoundupInvalidSlotKeys,
} from "./wcScorerRoleQA.js";
import { parseWcPredictionSlots } from "./wcPredictionsRoundup.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

const BAD_SCORER_SLOT =
  "The board hasn't posted individual odds yet, but structure favors a midfielder-forward hybrid from a team that plays 60+ minutes per knockout game.";

test("isWcRoundupTopScorerSlotValid — rejects vague hybrid dodge", () => {
  assert.equal(isWcRoundupTopScorerSlotValid(BAD_SCORER_SLOT), false);
});

test("isWcRoundupTopScorerSlotValid — accepts named player", () => {
  assert.ok(isWcRoundupTopScorerSlotValid("Kylian Mbappé +600 — pens and shot share on France's path."));
  assert.ok(isWcRoundupTopScorerSlotValid("Lamine Yamal +900 — minutes edge if Spain go deep."));
});

test("isWcRoundupTopScorerSlotValid — accepts Pass with named lean", () => {
  assert.ok(
    isWcRoundupTopScorerSlotValid(
      "Pass until boards post — structurally Mbappé or Haaland tier only.",
    ),
  );
});

test("detectWcScorerRoleMismatch — flags Pedri as top scorer", () => {
  const hit = detectWcScorerRoleMismatch(
    "Top goalscorer: Pedri offers volume through Spain's deep run.",
    { topScorerSlotValue: "Pedri (Spain) — volume through knockout minutes." },
  );
  assert.ok(hit);
  assert.equal(hit.player, "Pedri");
});

test("detectWcScorerRoleMismatch — allows Pedri assist prop", () => {
  const hit = detectWcScorerRoleMismatch("Pedri assist volume prop in Group H is the edge.", {});
  assert.equal(hit, null);
});

test("runWcUrTakeQA — fails unnamed top scorer roundup", () => {
  const deep = `Winners: Spain — sims path favorite.
Dark horse: Colombia — transition chaos in knockouts.
Breakout player: Florian Wirtz — soft Group E minutes.
Top goalscorer: ${BAD_SCORER_SLOT}
Watch for: lineups lock in 48 hours.
PLAY: Lean Spain +400.`;

  const structured = buildWcCompactStructured({
    question: "Winners: Dark horse: Breakout player: Top goalscorer:",
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    summary: "Spain path leads sims.",
    deep,
  });

  const qa = runWcUrTakeQA({
    responseText: structured.call,
    structured,
    question:
      "The World Cup starts this week! Winners: Dark horse: Breakout player: Top goalscorer:",
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
  });

  assert.ok(qa.issueCodes.includes("wc_roundup_scorer_unnamed"));
});

test("runWcUrTakeQA — fails Pedri top scorer role mismatch", () => {
  const deep = `Winners: Spain — path favorite.
Dark horse: Colombia — QF upside.
Breakout player: Lamine Yamal — creator load.
Top goalscorer: Pedri — Spain's deep run gives him knockout minutes volume.
Watch for: injuries.
PLAY: Pass Boot — fair board.`;

  const structured = buildWcCompactStructured({
    question: "Winners: Dark horse: Breakout player: Top goalscorer:",
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    summary: "Spain path thesis.",
    deep,
  });

  const qa = runWcUrTakeQA({
    responseText: structured.call,
    structured,
    question: "Winners: Dark horse: Breakout player: Top goalscorer:",
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
  });

  assert.ok(qa.issueCodes.includes("wc_scorer_role_mismatch"));
});

test("wcRoundupInvalidSlotKeys — parse + validate bad production-shaped answer", () => {
  const deep = `Winners: Spain. Dark horse: Colombia. Breakout player: Florian Wirtz (Germany). Top goalscorer: ${BAD_SCORER_SLOT}`;
  const slots = parseWcPredictionSlots(deep);
  const invalid = wcRoundupInvalidSlotKeys(slots);
  assert.ok(invalid.includes("topScorer"));
});

test("hasWcPlayerNameInText — mononyms", () => {
  assert.ok(hasWcPlayerNameInText("Mbappé +600"));
  assert.ok(hasWcPlayerNameInText("Yamal volume edge"));
});

test("isWcImplausibleGoldenBootPosition — creator mids", () => {
  assert.ok(isWcImplausibleGoldenBootPosition("M"));
  assert.ok(isWcImplausibleGoldenBootPosition("CM"));
  assert.equal(isWcImplausibleGoldenBootPosition("F"), false);
  assert.equal(isWcImplausibleGoldenBootPosition("ST"), false);
});

test("detectWcScorerRoleMismatch — registry position M for Pedri", () => {
  const hit = detectWcScorerRoleMismatch("Top goalscorer: Pedri — Spain deep run.", {
    topScorerSlotValue: "Pedri — volume through knockout minutes.",
    playerRegistryTeams: {
      ESP: {
        players: [{ name: "Pedri", position: "M", nationAbbr: "ESP" }],
      },
    },
  });
  assert.ok(hit);
  assert.ok(
    hit.reason === "registry_position_not_striker" ||
      hit.reason === "creator_midfielder_as_top_scorer",
  );
});

test("detectWcScorerRoleMismatch — Yamal F passes registry gate", () => {
  const hit = detectWcScorerRoleMismatch("Top goalscorer: Lamine Yamal +900.", {
    topScorerSlotValue: "Lamine Yamal +900 — minutes edge.",
    playerRegistryTeams: {
      ESP: {
        players: [{ name: "Lamine Yamal", position: "F", nationAbbr: "ESP" }],
      },
    },
  });
  assert.equal(hit, null);
});
