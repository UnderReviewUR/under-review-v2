import assert from "node:assert/strict";
import test from "node:test";
import { extractWcTurnArtifact } from "./wcTurnArtifact.js";
import {
  projectWcFollowUpChips,
  projectWcNextLine,
} from "./wcTurnArtifactProjections.js";
import { finalizeWcStructuredThreadState } from "./wcThreadState.js";
import { buildWcTakeAwareFollowUpChips } from "./wcTakeAwareFollowUps.js";

test("MEX-KOR named-leg artifact never projects match-goals chips", () => {
  const structured = {
    wcNamedPlayerPropsCard: true,
    cardType: "single_lean",
    fixtureHome: "MEX",
    fixtureAway: "KOR",
    askShape: "named_legs",
    lean: "1. Jimenez over 2.5 shots +120 — playable\n2. Quinones over 2.5 shots -105 — playable",
    call: "2 of 2 playable",
    namedLegCitation: {
      playerName: "Jimenez",
      legId: "player_shots_ou|jimenez|2.5|over|draftkings",
      americanOdds: "+120",
      line: "2.5",
      side: "over",
      market: "player_shots_ou",
    },
  };
  const artifact = extractWcTurnArtifact(structured);
  assert.ok(artifact);
  assert.equal(artifact.wcNamedPlayerPropsCard, true);
  assert.equal(artifact.matchTotalsLean, null);

  const chips = projectWcFollowUpChips(artifact, []);
  assert.ok(chips.some((c) => /parlay/i.test(c)));
  assert.doesNotMatch(chips.join(" "), /goals/i);
  assert.doesNotMatch(projectWcNextLine(artifact) || "", /goals/i);
});

test("AUS-USA prop board uses nationAbbr not blind away team", () => {
  const structured = {
    cardType: "prop_board",
    fixtureHome: "AUS",
    fixtureAway: "USA",
    call: "Australia vs United States — top player props",
    propBoardRows: [
      {
        label: "Jackson Irvine",
        market: "player_shots_ou",
        odds: "-177",
        nationAbbr: "AUS",
      },
      {
        label: "Christian Pulisic",
        market: "player_shots_ou",
        odds: "-2500",
        nationAbbr: "USA",
      },
    ],
  };
  const artifact = extractWcTurnArtifact(structured);
  const chips = projectWcFollowUpChips(artifact, []);
  assert.ok(chips.some((c) => /Jackson Irvine/i.test(c)));
  assert.doesNotMatch(chips.join(" "), /United States scorer value besides Jackson Irvine/i);
});

test("totals lean chips read typed matchTotalsLean not lean prose", () => {
  const structured = {
    cardType: "single_lean",
    fixtureHome: "BEL",
    fixtureAway: "EGY",
    callType: "matchup",
    matchTotalsLean: { side: "Under", line: "2.5", odds: "-114" },
    lean: "Pass on ML — Lean Under 2.5 goals",
    call: "Belgium -140 to win",
  };
  const artifact = extractWcTurnArtifact(structured);
  const chips = projectWcFollowUpChips(artifact, []);
  assert.ok(chips.some((c) => /scores early/i.test(c)));
  assert.match(projectWcNextLine(artifact) || "", /Under 2\.5/);
});

test("parlay chip pairs prop board lead with prior typed totals", () => {
  const propsStructured = {
    cardType: "prop_board",
    fixtureHome: "AUS",
    fixtureAway: "USA",
    propBoardRows: [
      {
        label: "Christian Pulisic",
        market: "anytime_scorer",
        odds: "+450",
        nationAbbr: "USA",
      },
    ],
  };
  const priorTotalsTurn = {
    role: "assistant",
    structured: {
      cardType: "single_lean",
      fixtureHome: "AUS",
      fixtureAway: "USA",
      matchTotalsLean: { side: "Over", line: "2.5", odds: "-110" },
    },
  };
  const chips = buildWcTakeAwareFollowUpChips({ structured: propsStructured }, "", [
    priorTotalsTurn,
  ]);
  assert.ok(chips.some((c) => /Parlay: Christian Pulisic scorer \+ over 2\.5/i.test(c)));
});

test("finalizeWcStructuredThreadState stamps matchTotalsLean on delivery", () => {
  const structured = {
    callType: "matchup",
    fixtureHome: "BEL",
    fixtureAway: "EGY",
    lean: "Lean Under 2.5 goals",
    line: "Posted Under 2.5 -114",
  };
  const out = finalizeWcStructuredThreadState(structured, [], "MATCHUP");
  assert.equal(out.matchTotalsLean?.side, "Under");
  assert.equal(out.matchTotalsLean?.line, "2.5");
  assert.ok(out.wcThreadState?.lastTotalsLean);
});
