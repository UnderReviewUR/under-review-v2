import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
} from "./wcUrTakeCompactDelivery.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

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
