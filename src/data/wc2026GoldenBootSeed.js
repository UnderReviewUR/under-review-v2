/**
 * Golden Boot cold-start rows — used only when live ESPN/Odds API feeds are empty.
 * Replace via wc2026_golden_boot KV cron; not cited as live lines in UR Take Phase B.
 */

/** @type {import("../../shared/wc2026PlayerConstants.js").WcGoldenBootRow[]} */
export const WC_GOLDEN_BOOT_SEED_ROWS = [
  { name: "Kylian Mbappé", nationAbbr: "FRA", americanOdds: "+600", impliedRank: 1 },
  { name: "Harry Kane", nationAbbr: "ENG", americanOdds: "+700", impliedRank: 2 },
  { name: "Erling Haaland", nationAbbr: "NOR", americanOdds: "+800", impliedRank: 3 },
  { name: "Lamine Yamal", nationAbbr: "ESP", americanOdds: "+900", impliedRank: 4 },
  { name: "Vinícius Júnior", nationAbbr: "BRA", americanOdds: "+1000", impliedRank: 5 },
  { name: "Lionel Messi", nationAbbr: "ARG", americanOdds: "+1200", impliedRank: 6 },
  { name: "Robert Lewandowski", nationAbbr: "POL", americanOdds: "+1400", impliedRank: 7 },
  { name: "Mohamed Salah", nationAbbr: "EGY", americanOdds: "+1600", impliedRank: 8 },
  { name: "Cristiano Ronaldo", nationAbbr: "POR", americanOdds: "+1800", impliedRank: 9 },
  { name: "Julián Álvarez", nationAbbr: "ARG", americanOdds: "+2000", impliedRank: 10 },
];
