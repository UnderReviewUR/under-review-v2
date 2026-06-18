/**
 * FIFA nation demonyms + aliases for thread fixture resolution (Phase 1).
 * One entry per WC_2026_TEAMS abbreviation.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

/** @type {Record<string, string[]>} */
export const WC_NATION_DEMONYMS = {
  ALG: ["algerian", "algerians", "algeria"],
  ARG: ["argentine", "argentines", "argentina"],
  AUS: ["australian", "australians", "socceroos", "australia"],
  AUT: ["austrian", "austrians", "austria"],
  BEL: ["belgian", "belgians", "belgium"],
  BIH: ["bosnian", "bosnians", "bosnia"],
  BRA: ["brazilian", "brazilians", "brazil"],
  CAN: ["canadian", "canadians", "canada"],
  CIV: ["ivorian", "ivorians", "ivory coast", "cote d'ivoire"],
  COD: ["congolese", "dr congo", "drc"],
  COL: ["colombian", "colombians", "colombia"],
  CPV: ["cape verdean", "cape verde"],
  CRO: ["croatian", "croats", "croatia"],
  CUW: ["curacaoan", "curacao", "curaçao"],
  CZE: ["czech", "czechs", "czechia"],
  ECU: ["ecuadorian", "ecuadorians", "ecuador"],
  EGY: ["egyptian", "egyptians", "egypt"],
  ENG: ["english", "england"],
  ESP: ["spanish", "spain"],
  FRA: ["french", "france"],
  GER: ["german", "germans", "germany"],
  GHA: ["ghanaian", "ghana"],
  HAI: ["haitian", "haitians", "haiti"],
  IRN: ["iranian", "iranians", "iran"],
  IRQ: ["iraqi", "iraqis", "iraq"],
  JOR: ["jordanian", "jordanians", "jordan"],
  JPN: ["japanese", "japan"],
  KOR: ["korean", "koreans", "south korea"],
  KSA: ["saudi", "saudis", "saudi arabia"],
  MAR: ["moroccan", "moroccans", "morocco"],
  MEX: ["mexican", "mexicans", "mexico"],
  NED: ["dutch", "netherlands", "holland"],
  NOR: ["norwegian", "norwegians", "norway"],
  NZL: ["new zealand", "kiwis", "all whites"],
  PAN: ["panamanian", "panamanians", "panama"],
  PAR: ["paraguayan", "paraguayans", "paraguay"],
  POR: ["portuguese", "portugal"],
  QAT: ["qatari", "qataris", "qatar"],
  RSA: ["south african", "south africans", "south africa"],
  SCO: ["scottish", "scots", "scotland"],
  SEN: ["senegalese", "senegal"],
  SUI: ["swiss", "switzerland"],
  SWE: ["swedish", "swedes", "sweden"],
  TUN: ["tunisian", "tunisians", "tunisia"],
  TUR: ["turkish", "turks", "turkiye", "turkey", "türkiye"],
  URU: ["uruguayan", "uruguayans", "uruguay"],
  USA: ["american", "americans", "united states", "usmnt", "yanks"],
  UZB: ["uzbek", "uzbeks", "uzbekistan"],
};

/** Verify map covers every team in seed at module load. */
const _abbrs = new Set(WC_2026_TEAMS.map((t) => String(t.abbreviation).toUpperCase()));
for (const abbr of Object.keys(WC_NATION_DEMONYMS)) {
  if (!_abbrs.has(abbr)) {
    throw new Error(`wcNationDemonyms: unknown abbr ${abbr}`);
  }
}
for (const t of WC_2026_TEAMS) {
  const abbr = String(t.abbreviation).toUpperCase();
  if (!WC_NATION_DEMONYMS[abbr]) {
    throw new Error(`wcNationDemonyms: missing abbr ${abbr}`);
  }
}
