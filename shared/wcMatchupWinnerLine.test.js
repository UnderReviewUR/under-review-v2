import assert from "node:assert/strict";
import test from "node:test";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  detectWcMatchupMissingWinnerLine,
  extractWcMatchupPlayHeadline,
  extractWcMatchupWinnerLine,
  parseWcMatchupTeamsFromQuestion,
} from "./wcMatchupWinnerLine.js";
import { runWcUrTakeQA, wcQaRequiresRegeneration } from "../api/_wcUrTakeQA.js";
import { prepareWcCardFaceDisplay } from "../src/lib/wcTakeCardUi.js";

const USA_PAR_DEEP = `
USA +110 (implied 47.6%) vs Paraguay +285 (implied 26.0%) on the moneyline.
UR sim: Paraguay advances in 75.95% of sims; USA advances in 51.8%.
THE PLAY: Pass on USA +110 — lean both teams to advance in Group D.
Lean Paraguay +285 as the live underdog price if you want a winner ticket.
`.trim();

test("extractWcMatchupWinnerLine picks ML favorite when both prices cited", () => {
  const teams = parseWcMatchupTeamsFromQuestion("Who wins USA vs PAR (Group D)?");
  const line = extractWcMatchupWinnerLine(USA_PAR_DEEP, teams);
  assert.equal(line, "United States +110 to win");
});

test("extractWcMatchupWinnerLine resolves ML at CAN -120", () => {
  const teams = { home: "CAN", away: "BIH" };
  const line = extractWcMatchupWinnerLine(
    "ML at CAN -120 (implied 55%) while UR sims give 86.46% to advance from Group B.",
    teams,
  );
  assert.equal(line, "Canada -120 to win");
});

test("buildWcCompactStructured matchup sets winner call not advancement paths", () => {
  const structured = buildWcCompactStructured({
    wcIntent: WC_INTENT.MATCHUP,
    question: "Who wins USA vs PAR (Group D)?",
    summary: "Pass on the ML — both teams can advance in Group D.",
    deep: USA_PAR_DEEP,
  });
  assert.equal(structured.call, "United States +110 to win");
  assert.doesNotMatch(structured.call, /advancement paths/i);
  assert.match(structured.lean, /both teams to advance/i);
});

test("extractWcMatchupPlayHeadline surfaces Under 2.5 from pass-on-ML lean", () => {
  const play = extractWcMatchupPlayHeadline(
    "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.",
  );
  assert.equal(play, "Lean Under 2.5 goals");
});

test("buildWcCompactStructured uses play headline when no ML odds cited", () => {
  const structured = buildWcCompactStructured({
    wcIntent: WC_INTENT.MATCHUP,
    question: "Who wins USA vs PAR (Group D)?",
    summary: "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.",
    structuredSeed: {
      call: "USA vs PAR — Group D advancement paths",
      lean: "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.",
      whyNow: "Lineups are not confirmed. Both teams can advance from Group D.",
      edge: "Lineups are not confirmed before kickoff.",
    },
  });
  assert.equal(structured.call, "Lean Under 2.5 goals");
  assert.ok(!structured.edge || !/Watch for Lineups are not confirmed/i.test(structured.edge));
});

test("prepareWcCardFaceDisplay USA vs PAR without ML shows play as headline not paths", () => {
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: "USA vs PAR — Group D advancement paths",
    lean: "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.",
    why: "USA controls at home but Paraguay sits deep in openers.",
    focusLayout: true,
  });
  assert.equal(face.headline, "Lean Under 2.5 goals");
  assert.doesNotMatch(face.headline, /advancement paths/i);
});

test("prepareWcCardFaceDisplay USA vs PAR focus shows winner headline from deep", () => {
  const structured = buildWcCompactStructured({
    wcIntent: WC_INTENT.MATCHUP,
    question: "Who wins USA vs PAR (Group D)?",
    summary: "Pass on the ML — both teams can advance in Group D.",
    deep: USA_PAR_DEEP,
  });
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: structured.call,
    lean: structured.lean,
    why: structured.whyNow,
    watchFor: structured.edge,
    thePlay: structured.lean,
    breakdown: structured.deep,
    breakdownAvailable: true,
    focusLayout: true,
    lineSlot: structured.line,
    question: "Who wins USA vs PAR (Group D)?",
  });
  assert.equal(face.headline, "United States +110 to win");
  assert.match(face.sections.thePlay, /Alt:.*both teams to advance/i);
});

test("detectWcMatchupMissingWinnerLine flags advancement-paths headline", () => {
  const structured = {
    call: "USA vs PAR — Group D advancement paths",
    lean: "Pass on ML — fair price at +110.",
    whyNow: "Group D opener with tight advancement paths.",
    deep: USA_PAR_DEEP,
  };
  assert.equal(
    detectWcMatchupMissingWinnerLine("Who wins USA vs PAR (Group D)?", structured, "MATCHUP"),
    true,
  );
});

test("buildWcCompactStructured overrides advancement-paths seed when odds live in whyNow", () => {
  const structured = buildWcCompactStructured({
    wcIntent: WC_INTENT.MATCHUP,
    question: "Who wins USA vs PAR (Group D)?",
    summary: "Pass on ML — lean both teams to advance in Group D.",
    structuredSeed: {
      call: "USA vs PAR — Group D advancement paths",
      lean: "Pass on ML — lean both teams to advance in Group D.",
      whyNow:
        "USA +110 vs Paraguay +285 on the moneyline. UR sims give Paraguay a stronger group path.",
      edge: "Watch for lineup news before locking the bet.",
    },
  });
  assert.equal(structured.call, "United States +110 to win");
  assert.doesNotMatch(structured.call, /advancement paths/i);
});

test("runWcUrTakeQA passes after compact fixes advancement-paths seed", () => {
  const structured = buildWcCompactStructured({
    wcIntent: WC_INTENT.MATCHUP,
    question: "Who wins USA vs PAR (Group D)?",
    summary: "Pass on ML — lean both teams to advance in Group D.",
    structuredSeed: {
      call: "USA vs PAR — Group D advancement paths",
      lean: "Pass on ML — lean both teams to advance in Group D.",
      whyNow: "USA +110 vs Paraguay +285. Both can advance from Group D.",
      edge: "Watch for lineup news.",
    },
  });
  const qa = runWcUrTakeQA({
    responseText: structured.lean,
    structured,
    question: "Who wins USA vs PAR (Group D)?",
    wcIntent: WC_INTENT.MATCHUP,
    requiredEntities: ["USA", "PAR"],
  });
  assert.ok(!qa.issueCodes.includes("wc_matchup_missing_winner_line"));
});

test("runWcUrTakeQA triggers regen when winner line missing and no odds to synthesize", () => {
  const qa = runWcUrTakeQA({
    responseText: "USA vs PAR — Group D advancement paths",
    structured: {
      sport: "worldcup",
      callType: "matchup",
      call: "USA vs PAR — Group D advancement paths",
      lean: "Pass on ML — no clear edge until lineups lock.",
      whyNow: "Group D opener — tight paths.",
      deep: "Both teams need points in a cautious opener script.",
    },
    question: "Who wins USA vs PAR (Group D)?",
    wcIntent: WC_INTENT.MATCHUP,
    requiredEntities: ["USA", "PAR"],
  });
  assert.ok(!qa.issueCodes.includes("wc_matchup_missing_winner_line"));
});
