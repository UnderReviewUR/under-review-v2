import assert from "node:assert/strict";
import { test } from "node:test";

import {
  detectWcMatchupPassOnlyWithoutAlternate,
  WC_MATCH_BETTING_PROMPT_RULES,
} from "./wcMatchBettingPrompt.js";

test("WC_MATCH_BETTING_PROMPT_RULES mentions alternate markets", () => {
  assert.match(WC_MATCH_BETTING_PROMPT_RULES, /both teams to advance/i);
  assert.match(WC_MATCH_BETTING_PROMPT_RULES, /never end with only "Pass/i);
});

test("detectWcMatchupPassOnlyWithoutAlternate flags pass-only ML", () => {
  assert.equal(
    detectWcMatchupPassOnlyWithoutAlternate(
      "Who wins MEX vs RSA?",
      {
        lean: "Pass at -240 — this is a fair line, not a mispricing.",
        whyNow: "Mexico is the favorite at altitude.",
        edge: "Fair price — recheck after lineups lock.",
      },
      "MATCHUP",
    ),
    true,
  );
});

test("detectWcMatchupPassOnlyWithoutAlternate passes when alternate named", () => {
  assert.equal(
    detectWcMatchupPassOnlyWithoutAlternate(
      "Who wins MEX vs RSA?",
      {
        lean: "Pass on MEX -240 — lean Both Teams to Advance in Group A.",
        whyNow: "Both sides qualify in sims often enough.",
        edge: "Watch lineups.",
      },
      "MATCHUP",
    ),
    false,
  );
});
