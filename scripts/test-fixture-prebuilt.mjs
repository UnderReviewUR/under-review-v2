/**
 * Smoke WC fixture matchup prebuilt — local path only (no Anthropic).
 */
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";
import {
  shouldUseWcFixtureMatchupPrebuilt,
  buildWcFixtureMatchupPrebuiltStructured,
} from "../shared/wcFixtureMatchupPrebuilt.js";
import {
  buildWcFixtureMatchupPrebuiltFromInputs,
  resolveWcFixtureMatchupPrebuiltInputs,
} from "../api/_wcFixtureMatchupPrebuiltInputs.js";

const prompts = [
  "Who wins USA vs PAR (Group D)?",
  "USA vs Paraguay — best bet for Americans who only know the moneyline (group context, not just ML)",
  "Who wins MEX vs RSA tonight?",
];

for (const question of prompts) {
  const t0 = Date.now();
  const wcIntent = classifyWcQuestionIntent(question);
  const should = shouldUseWcFixtureMatchupPrebuilt(question, wcIntent);
  let structured = null;
  let err = "";

  try {
    if (should) {
      structured = await buildWcFixtureMatchupPrebuiltFromInputs({ question });
    }
  } catch (e) {
    err = e?.message || String(e);
  }

  console.log(
    JSON.stringify({
      question: question.slice(0, 80),
      wcIntent,
      shouldPrebuilt: should,
      elapsedMs: Date.now() - t0,
      call: structured?.call || null,
      lean: structured?.lean || null,
      err: err || null,
    }),
  );
}

const staticOnly = buildWcFixtureMatchupPrebuiltStructured({
  home: "USA",
  away: "PAR",
  group: "D",
  question: "Who wins USA vs PAR (Group D)?",
  match: { odds: { home: { moneyline: "+110" }, draw: { moneyline: "+240" }, away: { moneyline: "+285" } } },
  teamStats: { USA: { advancePct: 51.8 }, PAR: { advancePct: 75.95 } },
});
console.log(
  JSON.stringify({
    label: "static_only",
    elapsedMs: 0,
    call: staticOnly?.call,
    lean: staticOnly?.lean,
  }),
);

const inputs = await resolveWcFixtureMatchupPrebuiltInputs({
  question: "Who wins USA vs PAR (Group D)?",
});
console.log(
  JSON.stringify({
    label: "inputs_resolve",
    hasInputs: Boolean(inputs),
    home: inputs?.home,
    away: inputs?.away,
    hasOdds: Boolean(inputs?.match?.odds),
    hasTeamStats: Boolean(inputs?.teamStats),
  }),
);
