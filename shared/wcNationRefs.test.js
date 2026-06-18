import assert from "node:assert/strict";
import test from "node:test";
import { extractWcNationRefs } from "./wcNationRefs.js";
import { WC_NATION_DEMONYMS } from "./wcNationDemonyms.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

test("wcNationDemonyms covers all 48 WC teams", () => {
  assert.equal(Object.keys(WC_NATION_DEMONYMS).length, WC_2026_TEAMS.length);
});

test("extractWcNationRefs — co-signal and geo exclusion", () => {
  assert.deepEqual(extractWcNationRefs("Panama canal props"), []);
  assert.deepEqual(extractWcNationRefs("Panama vs US props").sort(), ["PAN", "USA"]);
  assert.deepEqual(extractWcNationRefs("Panamanian scorer"), ["PAN"]);
  assert.deepEqual(extractWcNationRefs("The Panama team props?"), ["PAN"]);
  assert.deepEqual(extractWcNationRefs("best props for Panama"), ["PAN"]);
  assert.deepEqual(extractWcNationRefs("What about the Uzbek match?"), ["UZB"]);
  assert.deepEqual(extractWcNationRefs("Moroccan oil"), []);
  assert.deepEqual(extractWcNationRefs("Morocco props"), ["MAR"]);
});
