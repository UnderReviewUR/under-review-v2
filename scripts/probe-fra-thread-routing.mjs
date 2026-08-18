import { isWcOddsLineMovementQuestion, synthesizeWcOddsLineMovementLean } from "../shared/wcOddsLineMovement.js";
import { isWcLiveBetTimingQuestion } from "../shared/wcLiveMatchQuestion.js";
import { resolveUrTakeDeliveryMode } from "../shared/urTakeDeliveryMode.js";
import { isWcVagueMatchGoalsOverUnderAsk } from "../shared/wcMatchBettingPrompt.js";

process.env.UR_TALK_MODE = "1";

const cases = [
  ["T1 opener", "Who wins FRA vs PAR? Give me the sharpest pre-match lean with the line.", false],
  ["T2 alt", "What's the best bet besides the moneyline?", true],
  [
    "T3 wait 30",
    "right now the money line is -525 on france...over 1.5 total goals in regulation is -525 as well. i might wait to see if its 0-0 about 30 minutes in and then evaluate the lines",
    true,
  ],
  ["T4 O2.5", "over 2.5 goals at -150 is tempting", true],
];

for (const [label, q, fu] of cases) {
  console.log(label, {
    delivery: resolveUrTakeDeliveryMode({
      sportHint: "worldcup",
      question: q,
      history: [{}],
      isConversationFollowUp: fu,
    }),
    lineMovement: isWcOddsLineMovementQuestion(q),
    betTiming: isWcLiveBetTimingQuestion(q),
    vagueOu: isWcVagueMatchGoalsOverUnderAsk(q),
  });
}

const q3 = cases[2][1];
console.log("\nsynth lean for T3:", synthesizeWcOddsLineMovementLean(q3));
