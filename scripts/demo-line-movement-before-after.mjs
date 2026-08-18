import {
  synthesizeWcOddsLineMovementLean,
  synthesizeWcLiveEntryPlanningLean,
  repairWcTalkLineMovementProse,
  runWcLineMovementOutputQA,
  resolveWcLineMovementMarketKind,
  shouldForceWcLineMovementStructuredCard,
  isWcLineMovementTalkEligible,
  parseWcLiveCheckpointMinuteBucket,
  wcCheckpointMarketLabel,
  wcCheckpointMinuteLabel,
} from "../shared/wcOddsLineMovement.js";

const FRA_OPTS = {
  home: "PAR",
  away: "FRA",
  match: {
    odds: {
      home: { moneyline: "+1800" },
      away: { moneyline: "-550" },
      draw: { moneyline: "+650" },
    },
  },
};

const scenarios = [
  {
    id: "A — Original FRA thread (0-0 ~30, ML + live entry)",
    q: "money line is -525 on france... over 1.5 is -525 as well. i might wait to see if its 0-0 about 30 minutes in and then evaluate the lines",
    bad:
      "At 0-0 after 30, FRA moneyline will compress tighter (probably -650+) because Paraguay's still in it. Over 1.5 will likely shorten to -600+ at 0-0 after 30 because France gets desperate for goals.",
    synthFn: (q) => synthesizeWcLiveEntryPlanningLean(q, FRA_OPTS),
  },
  {
    id: "B — Cited price + hypothetical (Germany early 5 min)",
    q: "It's Germany at -669. Does that go to like -575 if it's scoreless early on?",
    bad:
      "At 0-0 early, Germany moneyline shortens to -750+ as they control the game even without a goal.",
    synthFn: (q) => synthesizeWcOddsLineMovementLean(q),
  },
  {
    id: "C — To-advance explicit (knockout)",
    q: "If it's 0-0 at 30, does France -650 to advance shorten or drift?",
    bad:
      "France to advance drifts out to -450 at 0-0 ~30 just like the 90-minute moneyline.",
    synthFn: (q) => synthesizeWcOddsLineMovementLean(q, FRA_OPTS),
  },
];

for (const s of scenarios) {
  const kind = resolveWcLineMovementMarketKind(s.q);
  const bucket = parseWcLiveCheckpointMinuteBucket(s.q);
  const synth = s.synthFn(s.q);
  const repaired = repairWcTalkLineMovementProse(s.bad, s.q);
  const qaBad = runWcLineMovementOutputQA(s.bad, s.q);
  const qaFixed = runWcLineMovementOutputQA(repaired, s.q);
  console.log(`\n=== ${s.id} ===`);
  console.log(`Market: ${kind} → ${wcCheckpointMarketLabel(kind)}`);
  console.log(`Minute bucket: ${bucket} → ${wcCheckpointMinuteLabel(bucket)}`);
  console.log(`Force Take card: ${shouldForceWcLineMovementStructuredCard(s.q)}`);
  console.log(`Talk eligible: ${isWcLineMovementTalkEligible(s.q)}`);
  console.log("\nBEFORE (buggy):");
  console.log(s.bad);
  console.log(`QA flags: ${qaBad.issueCodes.join(", ") || "pass"}`);
  console.log("\nAFTER (deterministic synthesis):");
  console.log(synth);
  console.log("\nAFTER (Talk repair of BEFORE):");
  console.log(repaired);
  console.log(`QA flags: ${qaFixed.issueCodes.join(", ") || "pass"}`);
}

const ambiguous = [
  "France to win at 0-0 30 minutes — does the line move?",
  "France ML if scoreless at 30",
  "France -525 to win if 0-0 at 30",
  "France to advance at 0-0 30 if level",
  "who wins FRA vs PAR",
  "if France is pushing at 65' 0-0, then Over 2.5 might shorten",
];

console.log("\n=== Ambiguous language classification ===");
for (const q of ambiguous) {
  const kind = resolveWcLineMovementMarketKind(q);
  const bucket = parseWcLiveCheckpointMinuteBucket(q);
  const qa = runWcLineMovementOutputQA(q, q);
  console.log(`Q: ${q}`);
  console.log(`  market=${kind} (${wcCheckpointMarketLabel(kind)}) minute=${bucket} qa=${qa.issueCodes.join(",") || "pass"}`);
}
