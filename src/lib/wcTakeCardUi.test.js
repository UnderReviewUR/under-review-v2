import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcTakeStatGrid,
  pickWcThePlayLine,
  pickWcCardHeadline,
  pickWcFocusWhyLine,
  pickWcMatchupAltPlay,
  pickWcMatchupWinnerHeadline,
  wcCardSectionText,
  compressWcCardSections,
  prepareWcCardFaceDisplay,
  wcLineSlotIsNumericDelta,
  wcTakeCardHasVisibleContent,
} from "./wcTakeCardUi.js";

const USA_PAR_DEEP =
  "USA +110 vs Paraguay +285 on the ML. Pass on USA +110 — lean both teams to advance in Group D.";

test("prepareWcCardFaceDisplay — pass lean ignores long prop call headline", () => {
  const face = prepareWcCardFaceDisplay({
    callType: "player_market_verified",
    call: "Enner Valencia anytime scorer at +450 is the sharpest lean — Ecuador's set-piece taker and primary forward in a group-stage match.",
    lean: "Pass — no actionable line yet; see Watch For before locking a bet.",
    why: "Valencia: PK taker.",
    focusLayout: true,
  });
  assert.equal(face.headline, "Pass — no actionable line yet; see Watch For before locking a bet.");
  assert.doesNotMatch(face.headline, /set-piece taker/i);
});

test("prepareWcCardFaceDisplay — numbered fixture props list in why", () => {
  const lean = [
    "1. Enner Valencia anytime scorer +450",
    "2. Nicolas Jackson anytime scorer +380",
    "3. Sebastien Haller over 0.5 SOT -110",
  ].join("\n");
  const face = prepareWcCardFaceDisplay({
    callType: "player_market_verified",
    call: "Enner Valencia anytime scorer +450",
    lean,
    why: lean,
    focusLayout: true,
    question: "Best player props for Ecuador vs Ivory Coast?",
  });
  assert.match(face.headline, /Enner Valencia anytime scorer \+450 \(\+2 more\)/);
  assert.match(face.sections.why, /Nicolas Jackson/);
  assert.doesNotMatch(face.headline, /lean his/i);
});

test("buildWcTakeStatGrid uses line slot instead of truncating headline", () => {
  const headline =
    "Bruno Fernandes recording 7 assists in a single World Cup tournament is structurally implausible — Portugal's group strength and likely knockout run don't support that volume.";
  const grid = buildWcTakeStatGrid({
    call: headline,
    line: "Sims show 44.85% to reach the quarterfinals and 8.39% to reach the final.",
    lean: "Pass — this prop is not worth pricing until confirmed lineups emerge.",
    confidence: "Speculative",
    callType: "player_prop",
  });
  assert.equal(grid.slots.length, 2);
  assert.equal(grid.slots[0].label, "Line");
  assert.match(grid.slots[0].value, /44\.85%/);
  assert.doesNotMatch(grid.slots[0].value, /structur$/);
});

test("buildWcTakeStatGrid omits duplicate headline when only play differs", () => {
  const headline = "Market has the name — France's path is what books underprice.";
  const grid = buildWcTakeStatGrid({
    call: headline,
    lean: "Pass at +600 — fair favorite.",
    confidence: "Speculative",
    callType: "single",
  });
  assert.ok(grid.slots.some((s) => s.label === "Play"));
  assert.ok(!grid.slots.some((s) => s.value.includes("structur")));
});

test("pickWcThePlayLine prefers lean when distinct from headline", () => {
  const headline = "Brazil value at +800";
  const play = pickWcThePlayLine({
    headline,
    lean: "Lean: Brazil outright +800 — group winner path is clean",
    call: headline,
  });
  assert.match(play, /Lean: Brazil/);
});

test("pickWcThePlayLine hides duplicate play for advancement when line slot set", () => {
  const line =
    "Pass at current odds; the group path is tight and knockout advancement requires both escaping Group D.";
  assert.equal(
    pickWcThePlayLine({
      callType: "advancement",
      headline: "USA reaches Round of 16 in roughly 15% of sims",
      lean: line,
      call: line,
      lineSlot: line,
    }),
    "",
  );
});

test("buildWcTakeStatGrid advancement uses structured line", () => {
  const grid = buildWcTakeStatGrid({
    callType: "advancement",
    call: "USA R16 reach mispriced",
    line: "Pass at -130 — sim 15% vs market 57%.",
    confidence: "Medium",
  });
  assert.equal(grid.slots[0].value, "Pass at -130 — sim 15% vs market 57%.");
});

test("compressWcCardSections drops why when it repeats line slot", () => {
  const line =
    "Colombia needs a top-two finish in Group K — the path is not finishing last on points behind Portugal.";
  const why =
    "Group K is four teams: Portugal (Favorite), Colombia (Contender), Uzbekistan and DR Congo (Longshots). " +
    line;
  const out = compressWcCardSections({
    callType: "group_slate",
    headline: "Colombia in Group K — best group-stage value (to advance)",
    lineSlot: line,
    why,
    watchFor: "Watch the Portugal vs Colombia opener — a point or better for Colombia should tighten advance prices.",
    thePlay: "",
  });
  assert.match(out.why, /Group K is four teams/);
  assert.doesNotMatch(out.why, /top-two finish/);
  assert.ok(out.watchFor);
});

test("wcCardSectionText drops empty placeholders", () => {
  assert.equal(wcCardSectionText("—"), "");
  assert.equal(wcCardSectionText("Watch the left channel"), "Watch the left channel");
});

test("prepareWcCardFaceDisplay keeps full why on focus layout", () => {
  const why =
    "Over 3 at -135 (~57% implied) — nearest posted line to your ask with extra context on Korea's chase shape.";
  const face = prepareWcCardFaceDisplay({
    lean: "Lean over 3 at -135",
    call: "Lean over 3 at -135",
    why,
    watchFor: "Watch Korea's shape when they chase — volume spikes late.",
    breakdown: "Over 1 · -450 · juice\nOver 3 · -135 · worth paying ✓",
    focusLayout: true,
  });
  assert.equal(face.sections.why, why);
  assert.equal(face.sections.watchFor, "");
  assert.match(face.breakdownText, /Korea/);
});

test("wcLineSlotIsNumericDelta rejects path prose", () => {
  assert.equal(
    wcLineSlotIsNumericDelta(
      "Paraguay needs a top-two finish in Group D — the path is not finishing last on points behind Türkiye.",
    ),
    false,
  );
  assert.equal(wcLineSlotIsNumericDelta("Market ~42.1% · UR sim 58.3% · delta +16.2pt."), true);
});

test("buildWcTakeStatGrid group_slate hides path prose from line slot", () => {
  const grid = buildWcTakeStatGrid({
    callType: "group_slate",
    line: "Paraguay needs a top-two finish in Group D — the path is not finishing last on points behind Türkiye.",
    confidence: "Medium",
  });
  assert.equal(grid.slots.length, 1);
  assert.equal(grid.slots[0].label, "Confidence");
});

test("pickWcCardHeadline shortens misprice lean to actionable play", () => {
  const headline = pickWcCardHeadline({
    callType: "group_slate",
    lean: "Lean: Group D — USA advancement misprice (-36.0pt sim vs market).",
  });
  assert.equal(headline, "United States to advance in Group D");
});

test("prepareWcCardFaceDisplay keeps Under 2.5 headline intact", () => {
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: "Pass on ML — Lean Under 2.5 goals — cleaner angle than the ML.",
    lean: "Pass on ML — Lean Under 2.5 goals — cleaner angle than the ML.",
    focusLayout: true,
  });
  assert.equal(face.headline, "Lean Under 2.5 goals");
});

test("pickWcFocusWhyLine compresses sim vs market to one line", () => {
  const line = pickWcFocusWhyLine(
    "The market prices USA to advance at 88.2% implied, but UR sims put the escape path at 51.9% (-36.3pt).",
  );
  assert.match(line, /Market 88\.2%/);
  assert.match(line, /UR sim 51\.9%/);
  assert.match(line, /-36\.3pt/);
});

test("pickWcMatchupWinnerHeadline surfaces ML winner from verified copy", () => {
  const headline = pickWcMatchupWinnerHeadline({
    call: "CAN vs BIH — Group B opener",
    why: "ML at CAN -120 (implied 55%) while UR sims give 86.46% to advance from Group B.",
  });
  assert.equal(headline, "Canada -120 to win");
});

test("prepareWcCardFaceDisplay matchup focus shows alt play under winner headline", () => {
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    call: "United States +110 to win",
    lean: "Pass on ML — lean Under 2.5 goals — cleaner angle than the ML.",
    why: "USA +110 vs Paraguay +285 on the moneyline.",
    breakdown: "USA +110 vs Paraguay +285 on the ML.",
    breakdownAvailable: true,
    focusLayout: true,
    question: "Who wins USA vs PAR (Group D)?",
  });
  assert.equal(face.headline, "United States +110 to win");
  assert.match(face.sections.thePlay, /Alt:.*Under 2\.5/i);
});

test("pickWcMatchupAltPlay skips duplicate of headline", () => {
  assert.equal(pickWcMatchupAltPlay("Lean Canada -120 to win", "Canada -120 to win"), "");
});

test("pickWcCardHeadline matchup pass uses call not boilerplate lean", () => {
  const headline = pickWcCardHeadline({
    callType: "matchup",
    lean: "Pass — no actionable line yet; see Watch For before locking a bet.",
    call: "Canada -120 to win",
  });
  assert.match(headline, /Canada -120 to win/i);
  assert.doesNotMatch(headline, /no actionable line/i);
});

test("pickWcFocusWhyLine compresses sim advance sentence", () => {
  const line = pickWcFocusWhyLine(
    "Canada advances in 86.84% of sims vs Bosnia and Herzegovina in Group B.",
    "",
  );
  assert.match(line, /UR sim: Canada 86\.84%/);
});

test("prepareWcCardFaceDisplay focus mode hides watch for on card face", () => {
  const face = prepareWcCardFaceDisplay({
    lean: "Lean: USA to advance in Group D at -750",
    call: "Group D — USA advancement misprice",
    why: "The market prices USA to advance at 88.2% implied, but UR sims put the escape path at 51.9% (-36.3pt).",
    watchFor: "If United States advance odds drift wider than -750, pass.",
    focusLayout: true,
    callType: "group_slate",
  });
  assert.equal(face.sections.watchFor, "");
  assert.match(face.sections.why, /88\.2%/);
  assert.match(face.breakdownText, /drift wider than -750/);
  assert.match(face.breakdownText, /88\.2%/);
  assert.match(face.breakdownText, /51\.9%/);
});

test("prepareWcCardFaceDisplay tomorrow_slate keeps breakdown self-contained", () => {
  const whyNow =
    "Today's slate (2026-06-13, 2 matches): Qatar vs Switzerland · Brazil vs Morocco. 1) Qatar vs Switzerland: lean both teams to advance.";
  const deep = `Today's World Cup slate (2026-06-13) — 2 matches

Match: Qatar vs Switzerland (Group B)
Kickoff: Fri 6:00 PM ET
Lean: lean both teams to advance in Group B.
MATCH ODDS: Qatar +1300 · Draw +600 · Switzerland -475`;
  const face = prepareWcCardFaceDisplay({
    lean: "2 angles on today's slate — lead Qatar vs Switzerland: lean both teams…",
    call: "2 angles on today's slate — lead Qatar vs Switzerland",
    why: whyNow,
    watchFor: "Watch the scoreboard after 60 minutes — group math can flip the right side.",
    breakdown: deep,
    breakdownAvailable: true,
    focusLayout: true,
    callType: "tomorrow_slate",
  });
  assert.doesNotMatch(face.breakdownText, /1\) Qatar vs Switzerland/);
  assert.doesNotMatch(face.breakdownText, /Watch the scoreboard after 60 minutes/);
  assert.match(face.breakdownText, /Match: Qatar vs Switzerland/);
  assert.equal(face.breakdownAvailable, true);
});

test("prepareWcCardFaceDisplay tomorrow_slate goal-total board keeps slate headline", () => {
  const face = prepareWcCardFaceDisplay({
    lean: "4 goal-total leans on today's slate — lead France vs Senegal: Lean Under 2.5 goals",
    call: "4 goal-total leans — lead France vs Senegal",
    why: "Today's slate (2026-06-16) — 4 matches. France vs Senegal: Under 2.5 · England vs Ghana: Under 2.5",
    breakdown: `Today's World Cup slate (2026-06-16) — 4 matches

Match: France vs Senegal (Group I)
Lean: Under 2.5 goals`,
    breakdownAvailable: true,
    focusLayout: true,
    callType: "tomorrow_slate",
  });
  assert.match(face.headline, /4 goal-total leans/i);
  assert.doesNotMatch(face.headline, /^Under 2\.5 goals$/i);
  assert.equal(face.breakdownAvailable, true);
});

test("prepareWcCardFaceDisplay exposes full breakdown when preview is truncated", () => {
  const longDeep = "MATCH ODDS: Spain -450. ".repeat(90).trim();
  const face = prepareWcCardFaceDisplay({
    callType: "matchup",
    lean: "Lean Under 2.5 goals",
    call: "Spain -450 to win",
    why: "Spain dominates possession live but remains scoreless at halftime.",
    breakdown: longDeep,
    breakdownAvailable: true,
    focusLayout: true,
  });
  assert.equal(face.breakdownTruncated, true);
  assert.ok(face.breakdownTextFull.length > face.breakdownText.length);
  assert.match(face.breakdownText, /…$/);
  assert.doesNotMatch(face.breakdownTextFull, /…$/);
  assert.equal(face.sections.why.endsWith("…"), false);
});

test("wcTakeCardHasVisibleContent — empty structured face is not visible", () => {
  assert.equal(
    wcTakeCardHasVisibleContent({
      headline: "",
      sections: { why: "", watchFor: "", thePlay: "" },
      breakdownText: "",
      breakdownAvailable: false,
    }),
    false,
  );
  assert.equal(
    wcTakeCardHasVisibleContent({
      headline: "USA to advance in Group D at -750",
      sections: { why: "", watchFor: "", thePlay: "" },
      breakdownText: "",
      breakdownAvailable: false,
    }),
    true,
  );
});
