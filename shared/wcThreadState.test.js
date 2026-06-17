import test from "node:test";
import assert from "node:assert/strict";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import {
  inferWcCardType,
  WC_CARD_TYPE,
  parsePropBoardFromStructured,
  extractWcThreadStateFromHistory,
  finalizeWcStructuredThreadState,
} from "./wcThreadState.js";
import { buildWcPropsListFace } from "../src/lib/wcTakeCardUi.js";

test("classifyWcQuestionIntent routes cross-market SGP to PARLAY not MATCHUP", () => {
  const intent = classifyWcQuestionIntent("Parlay: Messi scorer + under 2.5?");
  assert.equal(intent, WC_INTENT.PARLAY);
});

test("inferWcCardType detects prop board from call copy", () => {
  const cardType = inferWcCardType({
    callType: "player_market_verified",
    call: "Argentina vs Algeria — top player props",
    lean: "1. Lionel Messi anytime scorer -114\n2. Lautaro Martínez anytime scorer +180",
  });
  assert.equal(cardType, WC_CARD_TYPE.PROP_BOARD);
});

test("buildWcPropsListFace renders multi-row board not collapsed headline", () => {
  const face = buildWcPropsListFace({
    call: "Argentina vs Algeria — top player props",
    propBoardRows: [
      { label: "Lionel Messi", lean: "Anytime scorer -114" },
      { label: "Lautaro Martínez", lean: "Anytime scorer +180" },
      { label: "Riyad Mahrez", lean: "Anytime scorer +420" },
    ],
  });
  assert.ok(face);
  assert.match(face.intro, /top player props/i);
  assert.equal(face.rows.length, 3);
  assert.match(face.rows[0].lean, /-114/);
});

test("thread state accumulates totals and prop board across turns", () => {
  const history = [
    {
      role: "assistant",
      structured: {
        callType: "matchup",
        fixtureHome: "ARG",
        fixtureAway: "ALG",
        lean: "Pass on ML — Lean Under 2.5 goals",
        line: "Posted Under 2.5 -114",
      },
    },
    {
      role: "assistant",
      structured: {
        callType: "player_market_verified",
        cardType: WC_CARD_TYPE.PROP_BOARD,
        fixtureHome: "ARG",
        fixtureAway: "ALG",
        call: "Argentina vs Algeria — top player props",
        propBoardRows: [
          { label: "Lionel Messi", odds: "-114", market: "anytime_scorer" },
          { label: "Riyad Mahrez", odds: "+420", market: "anytime_scorer" },
        ],
        lean: "1. Lionel Messi anytime scorer -114\n2. Riyad Mahrez anytime scorer +420",
      },
    },
  ];

  const thread = extractWcThreadStateFromHistory(history);
  assert.equal(thread.fixtureHome, "ARG");
  assert.equal(thread.lastTotalsLean?.side, "Under");
  assert.equal(thread.lastTotalsLean?.line, "2.5");
  assert.equal(thread.lastPropBoard.length, 2);
  assert.ok(thread.cardTypes.includes(WC_CARD_TYPE.PROP_BOARD));

  const finalized = finalizeWcStructuredThreadState(
    {
      callType: "parlay",
      fixtureHome: "ARG",
      fixtureAway: "ALG",
      parlayLegs: [
        { play: "Lionel Messi anytime scorer", odds: "-114" },
        { play: "Under 2.5 goals", odds: "-114" },
      ],
    },
    history,
    WC_INTENT.PARLAY,
  );
  assert.equal(finalized.cardType, WC_CARD_TYPE.PARLAY_TICKET);
  assert.ok(finalized.wcThreadState.lastTotalsLean);
  assert.equal(parsePropBoardFromStructured(finalized).length, 0);
});
