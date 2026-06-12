import assert from "node:assert/strict";
import test from "node:test";
import { runWcUrTakeQA, wcQaRequiresRegeneration } from "../api/_wcUrTakeQA.js";
import { WC_RELEVANCE_REGRESSION_TURNS } from "../api/wcUrTakeRelevance.fixture.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import {
  buildWcMatchupIntentRules,
  detectContenderAheadOfFavoriteClaim,
  getWcTeamStrengthTags,
} from "../shared/wcUrTakeMatchup.js";

test("buildWcMatchupIntentRules — group stage paths language", () => {
  const block = buildWcMatchupIntentRules({ phase: "GROUP_STAGE" });
  assert.match(block, /1st and 2nd place both advance/i);
  assert.match(block, /Do not carry strong opinions/i);
  assert.match(block, /Contender finishes "ahead of"/i);
  assert.match(block, /Wins-if \/ dies-if/i);
  assert.match(block, /U2\.5 = tight favorite win/i);
});

test("getWcTeamStrengthTags — Norway and France in Group I", () => {
  const tags = getWcTeamStrengthTags(null, ["NOR", "FRA"]);
  assert.equal(tags.NOR, "Contender");
  assert.equal(tags.FRA, "Favorite");
});

test("detectContenderAheadOfFavoriteClaim — Norway ahead of France", () => {
  const headline = "Norway advances from Group I ahead of France based on tournament structure.";
  assert.equal(
    detectContenderAheadOfFavoriteClaim(headline, { NOR: "Contender", FRA: "Favorite" }),
    true,
  );
});

test("detectContenderAheadOfFavoriteClaim — balanced path passes", () => {
  const headline =
    "France (Favorite) and Norway (Contender) both have advancement paths — France for 1st, Norway for 2nd.";
  assert.equal(
    detectContenderAheadOfFavoriteClaim(headline, { NOR: "Contender", FRA: "Favorite" }),
    false,
  );
});

test("runWcUrTakeQA — Norway vs France bad headline fails MATCHUP QA", () => {
  const qa = runWcUrTakeQA({
    responseText:
      "Norway advances from Group I ahead of France based on tournament structure and strength matchup.",
    structured: {
      lean: "Lean: Norway advances from Group I ahead of France.",
      whyNow: "Norway is a Contender with a path.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[2].question,
    wcIntent: WC_INTENT.MATCHUP,
    requiredEntities: ["NOR", "FRA"],
    forbiddenEntities: ["BRA"],
    strengthTags: { NOR: "Contender", FRA: "Favorite" },
  });
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_matchup_contender_ahead_of_favorite"));
  assert.ok(wcQaRequiresRegeneration(qa));
});

test("runWcUrTakeQA — balanced Norway vs France headline passes", () => {
  const qa = runWcUrTakeQA({
    responseText:
      "France (Favorite) and Norway (Contender) both can advance from Group I — France is the default 1st-place lean, while Norway's realistic path is 2nd.",
    structured: {
      call: "France and Norway both have Group I paths — market overweights a clean favorite sweep.",
      line: "Market FRA -110 group · UR sims ~52% FRA 1st.",
      lean: "Lean: Both France and Norway have group advancement paths.",
      whyNow: "France is Favorite for 1st; Norway Contender for 2nd.",
      edge: "A Haaland injury or France slip lets Senegal steal second and break Norway's path.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[2].question,
    wcIntent: WC_INTENT.MATCHUP,
    requiredEntities: ["NOR", "FRA"],
    strengthTags: { NOR: "Contender", FRA: "Favorite" },
  });
  assert.equal(qa.passed, true);
});
