import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseWcHomeFavoriteLanguage,
  detectWcHomeFavoriteMislabel,
  parseWcMatchupLabelHomeAbbr,
  repairWcHomeFavoriteLanguage,
} from "./wcHostNationLanguage.js";

test("canUseWcHomeFavoriteLanguage — hosts only", () => {
  assert.equal(canUseWcHomeFavoriteLanguage("MEX"), true);
  assert.equal(canUseWcHomeFavoriteLanguage("USA"), true);
  assert.equal(canUseWcHomeFavoriteLanguage("CAN"), true);
  assert.equal(canUseWcHomeFavoriteLanguage("AUS"), false);
  assert.equal(canUseWcHomeFavoriteLanguage("EGY"), false);
});

test("parseWcMatchupLabelHomeAbbr reads listed home from Away vs Home label", () => {
  assert.equal(parseWcMatchupLabelHomeAbbr("EGY vs AUS"), "AUS");
  assert.equal(parseWcMatchupLabelHomeAbbr("MEX vs ENG"), "ENG");
});

test("repairWcHomeFavoriteLanguage fixes Australia home favorite mislabel", () => {
  const raw =
    "AUS sits +265 as home favorite, but Egypt's experience in deep tournament runs makes this closer than the line suggests. Draw at +195 is also live.";
  const fixed = repairWcHomeFavoriteLanguage(raw, { homeTeam: "AUS" });
  assert.doesNotMatch(fixed, /home favorite/i);
  assert.match(fixed, /on the moneyline|listed home side/i);
});

test("repairWcHomeFavoriteLanguage keeps Mexico host phrasing", () => {
  const raw = "Mexico -180 as home favorite at altitude — host edge is real.";
  const fixed = repairWcHomeFavoriteLanguage(raw, { homeTeam: "MEX" });
  assert.match(fixed, /home favorite/i);
});

test("detectWcHomeFavoriteMislabel flags non-host listed home", () => {
  assert.equal(
    detectWcHomeFavoriteMislabel("AUS sits +265 as home favorite", { homeTeam: "AUS" }),
    true,
  );
  assert.equal(
    detectWcHomeFavoriteMislabel("Mexico home favorite at altitude", { homeTeam: "MEX" }),
    false,
  );
});
