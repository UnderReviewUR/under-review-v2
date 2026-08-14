import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNflAskDisciplinePromptBlock,
  buildNflGameScriptLine,
  buildNflNextStepLine,
  buildNflSeasonTypeWarning,
  confidenceForNflMarket,
  detectNflAskPhase,
  isNflAltLineAsk,
  summarizeNflBookDisagreement,
} from "./nflAskDiscipline.js";

test("detectNflAskPhase separates draft / props / exotic", () => {
  assert.equal(detectNflAskPhase("simulate cowboys draft rounds 1-3"), "draft");
  assert.equal(detectNflAskPhase("James Cook rush yards over"), "weekly_props");
  assert.equal(detectNflAskPhase("race to 10 points BUF vs KC"), "exotic");
  assert.equal(detectNflAskPhase("Chiefs season win total"), "futures");
});

test("confidence bands soften TD and lottery markets", () => {
  assert.equal(confidenceForNflMarket("spread").band, "firm");
  assert.equal(confidenceForNflMarket("rush_yds").band, "medium");
  assert.equal(confidenceForNflMarket("anytime_td").band, "soft");
  assert.equal(confidenceForNflMarket("first_td").band, "lottery");
  assert.equal(confidenceForNflMarket("method_exact").band, "lottery");
});

test("alt detection and book disagreement", () => {
  assert.equal(isNflAltLineAsk("Cook alt rushing yards 95.5"), true);
  const d = summarizeNflBookDisagreement(
    [
      { player: "James Cook", propRaw: "rush_yds", line: 72.5, book: "DK" },
      { player: "James Cook", propRaw: "rush_yds", line: 78.5, book: "FD" },
    ],
    "James Cook",
    ["rush_yds"],
  );
  assert.equal(d.disagree, true);
  assert.equal(d.min, 72.5);
  assert.equal(d.max, 78.5);
});

test("game script and preseason warning", () => {
  const script = buildNflGameScriptLine(
    {
      homeAbbr: "PHI",
      awayAbbr: "BUF",
      spread: { favoriteAbbr: "PHI", displayLine: "PHI -3.5" },
    },
    "BUF",
  );
  assert.match(script, /dog/i);
  assert.match(
    buildNflSeasonTypeWarning([{ seasonType: "preseason" }]),
    /preseason/i,
  );
  assert.match(
    buildNflSeasonTypeWarning([{ seasonType: "pre", week: 1 }]),
    /PRESEASON WEEK 1 HARD STOP/,
  );
});

test("conditional if-sit ask is a hard stop in discipline", () => {
  const block = buildNflAskDisciplinePromptBlock({
    question: "If Love only plays one series at Pittsburgh, under 39.5?",
  });
  assert.match(block, /CONDITIONAL HARD STOP/);
});

test("ambiguous player is a hard stop, not an assumed athlete", () => {
  const block = buildNflAskDisciplinePromptBlock({
    question: "Williams over 70 receiving",
    ambiguousPlayer: "Javonte Williams (DAL) / Jameson Williams (DET)",
  });
  assert.match(block, /HARD STOP/);
  assert.match(block, /Do NOT assume/i);
  assert.match(block, /Lean: Pass/i);
});

test("discipline block anti-blur + next step", () => {
  const block = buildNflAskDisciplinePromptBlock({
    question: "SGP Mahomes pass yards + Kelce rec yards",
    hasLiveLine: true,
    injuryFlag: false,
  });
  assert.match(block, /ANTI-BLUR|anti-blur/i);
  assert.match(block, /SGP CORRELATION/);
  assert.match(block, /NEXT:/);
  assert.match(block, /Data vintage/);
  assert.match(block, /CITATION BAN/);
  assert.equal(
    buildNflNextStepLine({
      phase: "weekly_props",
      marketId: "rush_yds",
      hasLiveLine: false,
      injuryFlag: false,
      isAlt: false,
    }).startsWith("NEXT:"),
    true,
  );
});
