import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
} from "./wcUrTakeCompactDelivery.js";
import { buildWcGroupSlatePrebuiltStructured } from "./wcGroupComposition.js";
import { buildWcTomorrowSlatePrebuiltStructured } from "./wcTomorrowSlatePrebuilt.js";
import { normalizeWcStructuredForDelivery } from "./wcUrTakeStructured.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { WC_CARD_CONTRACT_GOLDEN_CASES } from "./wcCardContractGolden.fixture.js";

test("buildWcCompactStructured — explain history sets breakdownDefaultExpanded", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-pivot-props-then-totals");
  assert.ok(row);
  const compact = buildWcCompactStructured({
    question: row.question,
    wcIntent: WC_INTENT.MATCHUP,
    summary: "Under 2.5 — low tempo script holds.",
    deep: "Posted Under 2.5 -114. WINS IF: 0-0, 1-0, 1-1.",
    history: row.history,
    structuredSeed: {
      callType: "matchup",
      lean: "Pass on ML — Lean Under 2.5 goals",
      whyNow: "Under 2.5 cashes on a low-event script even if Belgium control.",
      breakdownAvailable: true,
    },
  });
  assert.equal(compact.breakdownDefaultExpanded, true);
  assert.doesNotMatch(String(compact.whyNow || ""), /…$/);
});

test("buildWcCompactStructured — whyNow stays short when deep is long", () => {
  const deep =
    "Son is Korea's primary threat in a must-perform opener. He operates wide left and creates as much as he finishes. South Korea do not funnel volume through one striker. Three goals needs a deep run the sims do not support. Sims show a low probability of advancing past a group with Mexico. WATCH FOR: penalty duties and confirmed XI.";
  const s = buildWcCompactStructured({
    question: "Son over 2.5 goals?",
    wcIntent: WC_INTENT.PLAYER_PROP,
    summary: "Pass on Son over 2.5 goals — steep ask for a wide forward.",
    deep,
  });
  assert.ok(s.whyNow.split(/\s+/).length <= 45);
  assert.ok(s.deep.split(/\s+/).length <= 230);
  assert.ok(s.deep.length > s.whyNow.length);
});

test("buildWcCompactStructured — player prop ladder yields line-by-line why and lean", () => {
  const s = buildWcCompactStructured({
    question: "Son over 2.5 shots?",
    wcIntent: WC_INTENT.PLAYER_PROP,
    playerMarketTier: "market_only",
    summary:
      "Son over 3 total shots is the real edge — the market prices him as a volume shooter and the -135 consensus is playable.",
    deep:
      "Son's shot lines tell the story: over 1 at -2500, over 2 at -400, over 3 at -135. The market is practically giving away over 3 as a near-certainty. Over 2.5 isn't a posted line — the closest playable threshold is over 3 at -135, which implies roughly 57% and clears breakeven comfortably. WATCH FOR: if Korea go a goal down early and Son drops deeper, shot volume could shift to assists.",
  });
  assert.match(s.deep, /Over 1 · -2500/);
  assert.match(s.deep, /Over 3 · -135/);
  assert.match(s.deep, /Over 2\.5 isn't posted/i);
  assert.match(s.lean, /over 3 at -135/i);
  assert.doesNotMatch(s.lean, /no actionable line/i);
});

test("buildWcCompactStructured — player market PASS keeps complete sentences", () => {
  const s = buildWcCompactStructured({
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    playerMarketTier: "market_only",
    summary:
      "Market has the name — France's path is what books underprice. Market +600 · UR path ~+318.",
    deep:
      "France projects six knockout games with Mbappé as primary scorer. Pass at +600 — fair favorite. Watch for lineup confirmation and a shorter French run.",
  });
  assert.match(s.call, /Market has the name/);
  assert.match(s.line, /\+600/);
  assert.match(s.call, /\.$/);
  assert.match(s.whyNow, /\.$/);
  assert.match(s.edge, /\.$/);
  assert.ok(s.breakdownAvailable);
});

test("buildWcCompactStructured — structural headline is full sentence", () => {
  const longLead =
    "Group E is the sharpest mispricing — Germany (Contender) is undervalued to advance second behind Ecuador in the group-winner market.";
  const s = buildWcCompactStructured({
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: `${longLead} Netherlands path is the coin flip.`,
    deep: "Germany's bracket opens if they finish second. Watch for Ecuador upset variance in the opener.",
  });
  assert.match(s.call, /Ecuador/i);
  assert.match(s.call, /\.$/);
  assert.match(s.line, /Netherlands/i);
});

test("buildWcCompactStructured — player volume question synthesizes line and watch for", () => {
  const summary =
    "Bruno Fernandes recording 7 assists in a single World Cup tournament is structurally implausible — Portugal's likely tournament run and midfield role distribution don't support that volume.";
  const deep =
    "Sims show 44.85% to reach the quarterfinals and 8.39% to reach the final. Watch for: Portugal's actual group performance and confirmed starting XI in June. Pass — this prop is not worth pricing until confirmed lineups emerge.";
  const s = buildWcCompactStructured({
    question: "What are the chances Bruno Fernandes records 7 assists in the World Cup?",
    wcIntent: "GENERAL",
    summary,
    deep,
  });
  assert.equal(s.callType, "player_prop");
  assert.match(s.line, /44\.85%/);
  assert.match(s.edge, /Watch for|Portugal/i);
  assert.doesNotMatch(s.edge, /^Fair price — recheck after lineups lock\.$/);
});

test("buildWcCompactStructured — crazy prediction synthesizes lean from odds delta", () => {
  const summary =
    "Norway wins the tournament — a Contender in Group I with a path through France that the market has completely abandoned.";
  const line =
    "Sims give them 0.65% outright, but their group structure and knockout draw create a realistic run that books are pricing as a 200-to-1 longshot when it should be closer to 80-to-1.";
  const deep =
    "Norway sits in Group I as a Contender alongside France. Watch for: France's lineup confirmation and Senegal's form in warm-ups.";
  const s = buildWcCompactStructured({
    question: "Share your craziest World Cup prediction",
    wcIntent: WC_INTENT.GENERAL,
    summary: `${summary} ${line}`,
    deep,
  });
  assert.match(s.lean, /Lean: Norway/i);
  assert.match(s.lean, /200-to-1/);
  assert.match(s.lean, /80-to-1/);
  assert.doesNotMatch(s.lean, /No play yet/i);
});

test("buildWcCompactStructured — advancement R16 uses callType advancement and delta line", () => {
  const s = buildWcCompactStructured({
    question: "Will the USMNT reach the Round of 16?",
    wcIntent: WC_INTENT.ENTITY_PRICING,
    summary:
      "USA reaches Round of 16 in roughly 15% of tournament sims — well below the -130 market price. Pass at -130 — sim 15% vs market ~57%.",
    deep:
      "USA r16Pct 14.58% vs FanDuel -130 (BDL futures seed). Group D path is tight. Watch for Paraguay opener form.",
    structuredSeed: { callType: "advancement" },
  });
  assert.equal(s.callType, "advancement");
  assert.match(s.line, /-130/);
  assert.match(s.line, /15%/);
  assert.match(s.line, /57%/);
});

test("buildWcCompactStructured — watch for does not recycle whyNow tail", () => {
  const why =
    "USA advance sim is 62% — market implies 52% on escape from Group D.";
  const deep = `${why} Türkiye tops the group in 44% of sims. Paraguay second-place path is tighter priced. Watch for USA–Paraguay opener lineups.`;
  const s = buildWcCompactStructured({
    question: "Which Group D advancement path is most mispriced?",
    wcIntent: WC_INTENT.ENTITY_PRICING,
    summary: `USA escape is the misprice in Group D. [UR model · 10k Poisson/Elo · Jun 10] sim 62% vs market 52%.`,
    deep,
    structuredSeed: { callType: "advancement", whyNow: why },
  });
  assert.notEqual(s.edge.trim(), why.trim());
  assert.ok(!/62% — market implies 52%/.test(s.edge) || /Watch for/i.test(s.edge));
});

test("buildWcCompactStructured — tomorrow_slate seed preserves prebuilt lean", () => {
  const nowMs = Date.parse("2026-06-12T01:14:00Z");
  const seed = buildWcTomorrowSlatePrebuiltStructured({
    question: "Best World Cup bets for tomorrow?",
    nowMs,
  });
  assert.ok(seed);
  const s = buildWcCompactStructured({
    question: "Best World Cup bets for tomorrow?",
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: `${seed.lean}\n\n${seed.whyNow}`,
    deep: "",
    structuredSeed: seed,
  });
  assert.equal(s.callType, "tomorrow_slate");
  assert.match(s.lean, /tomorrow's slate/i);
  assert.doesNotMatch(s.lean, /Pass — no actionable line/i);
  const norm = normalizeWcStructuredForDelivery(s, WC_INTENT.STRUCTURAL, "Best World Cup bets for tomorrow?");
  assert.equal(norm.callType, "tomorrow_slate");
  assert.doesNotMatch(norm.lean, /Pass — no actionable line/i);
});
test("buildWcCompactStructured — group_slate seed preserves prebuilt lean", () => {
  const seed = buildWcGroupSlatePrebuiltStructured({ groupLetter: "K", pickAbbr: "COL" });
  const s = buildWcCompactStructured({
    question: "Which group is most mispriced for advancement?",
    wcIntent: WC_INTENT.ENTITY_PRICING,
    summary: `${seed.lean}\n\n${seed.whyNow}`,
    deep: "",
    structuredSeed: seed,
  });
  assert.match(s.lean, /Colombia|Group K/i);
  assert.doesNotMatch(s.lean, /Pass — no actionable line/i);
});

test("buildWcCompactStructured — golden boot marketing prompt names a pick", () => {
  const s = buildWcCompactStructured({
    question: "Golden Boot pick for World Cup 2026 — who scores most and why?",
    wcIntent: WC_INTENT.GOLDEN_BOOT,
    playerMarketTier: "market_only",
    summary:
      "Mbappé leads the adjusted model by a wide margin — six expected games and confirmed penalty taker for France.",
    deep:
      "France projects a 34.86% semifinal rate in UR sims. Market +600 on Mbappé; Vinícius Júnior sits at +1000. Pass at +600 — fair favorite. Watch for France's Group I opener — if Mbappé starts and scores in Game 1, the +600 number moves fast.",
  });
  assert.equal(s.callType, "player_market_odds");
  assert.match(s.call, /Mbappé/i);
  assert.doesNotMatch(s.lean, /no actionable line/i);
  assert.match(s.lean, /Mbappé/i);
  assert.match(s.lean, /Golden Boot/i);
  assert.match(s.line, /\+600|Market/i);
});

test("buildWcCompactStructured — matchup group opener avoids generic pass lean", () => {
  const s = buildWcCompactStructured({
    question: "Who wins CAN vs BIH (Group B)?",
    wcIntent: WC_INTENT.MATCHUP,
    summary:
      "Canada (Favorite) controls Group B paths, but the opener ML is fair — no mispricing on the moneyline.",
    deep:
      "[UR model · 10k Poisson/Elo · Jun 12] Canada advances in 86.84% of sims vs Bosnia and Herzegovina. Watch for lineup confirmation before locking a scorer leg.",
  });
  assert.equal(s.callType, "matchup");
  assert.doesNotMatch(s.call, /advancement paths/i);
  assert.doesNotMatch(s.lean, /no actionable line/i);
  assert.match(s.line, /86\.84%|UR sim/i);
});

test("buildWcCompactStructured — educational betting primer skips Pass lean", () => {
  const s = buildWcCompactStructured({
    question: "how do i even bet on the world cup? like what's the easiest thing to understand",
    wcIntent: WC_INTENT.GENERAL,
    summary:
      "Start with group-stage moneylines or both-teams-to-advance bets — they're the easiest entry point.",
    deep:
      "Mexico vs South Africa is the opener. Tournament winner is simpler if you want one long swing. Avoid player props until you know lineups.",
  });
  assert.doesNotMatch(s.lean, /Pass — no actionable line/i);
  assert.match(s.lean, /group-stage moneylines|both-teams-to-advance/i);
});

test("formatWcCompactDisplayText — no section headers", () => {
  const text = formatWcCompactDisplayText(
    {
      lean: "Lean: PASS — Mbappé +600.",
      call: "PASS — Mbappé +600",
      confidence: "Speculative",
      whyNow: "Haaland +800 is the alt.",
    },
    "",
  );
  assert.ok(!/MATCH READ/i.test(text));
  assert.match(text, /THE PLAY/);
});

test("formatWcCompactDisplayText — group_slate is lean-only (card holds detail)", () => {
  const text = formatWcCompactDisplayText(
    {
      callType: "group_slate",
      lean: "Lean: Colombia to advance in Group K.",
      call: "Colombia in Group K — best group-stage value (to advance)",
      whyNow: "Group K is four teams…",
      confidence: "Speculative",
    },
    "",
  );
  assert.equal(text, "Lean: Colombia to advance in Group K.");
  assert.doesNotMatch(text, /THE PLAY/i);
});

test("buildWcCompactStructured — group_slate prebuilt keeps seed deep when responseDeep null", () => {
  const seed = buildWcGroupSlatePrebuiltStructured({
    groupLetter: "D",
    pickAbbr: "USA",
    advanceOdds: "-750",
    simPct: 51.9,
    impliedPct: 88.2,
    delta: -36.3,
    bdlFutures: {
      source: "balldontlie_live",
      lastUpdated: Date.now(),
      byMarketType: {
        qualify_from_group: {
          USA: { american: -750, americanDisplay: "-750", vendor: "draftkings" },
        },
      },
    },
  });
  assert.ok(seed?.deep && seed.deep.length > 120);
  const compact = buildWcCompactStructured({
    question: "Best group-stage value?",
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: seed.lean,
    deep: null,
    structuredSeed: seed,
  });
  assert.ok(compact.deep.length > 120);
  assert.equal(compact.breakdownAvailable, true);
  assert.match(compact.deep, /DraftKings/i);
  assert.doesNotMatch(compact.deep, /BallDontLie GOAT/i);
});

test("buildWcCompactStructured — group_slate seed preserves auditFootnote", () => {
  const footnote = "Sources: 10,000 Elo/Poisson sims · updated Jun 13, 12:00 PM EDT · Advance lines DraftKings via BDL · Jun 13, 11:30 AM EDT.";
  const compact = buildWcCompactStructured({
    question: "any potential upsets that people are overlooking?",
    wcIntent: WC_INTENT.STRUCTURAL,
    summary: "Lean: Pass on DR Congo to advance in Group K at +100.",
    deep: null,
    structuredSeed: {
      sport: "worldcup",
      callType: "group_slate",
      groupLetter: "K",
      lean: "Lean: Pass on DR Congo to advance in Group K at +100.",
      call: "Overlooked group-stage misprices",
      whyNow: "DR Congo leads the board.",
      deep: "Angle: Group K — DR Congo to advance",
      breakdownAvailable: true,
      auditFootnote: footnote,
    },
  });
  assert.equal(compact.auditFootnote, footnote);
});
