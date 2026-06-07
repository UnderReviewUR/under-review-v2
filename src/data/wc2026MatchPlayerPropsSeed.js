/**
 * Per-event match player props seed — France vs Brazil (event 760416) for tests/smoke.
 */

/** @type {Record<string, { eventId: string, homeTeam: string, awayTeam: string, markets: Record<string, Array<{ name: string, americanOdds: string, nationAbbr?: string }>> }>} */
export const WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT = {
  "760416": {
    eventId: "760416",
    homeTeam: "BRA",
    awayTeam: "FRA",
    markets: {
      anytime_scorer: [
        { name: "Kylian Mbappé", americanOdds: "+180", nationAbbr: "FRA" },
        { name: "Vinícius Júnior", americanOdds: "+220", nationAbbr: "BRA" },
        { name: "Rodrygo", americanOdds: "+350", nationAbbr: "BRA" },
        { name: "Ousmane Dembélé", americanOdds: "+400", nationAbbr: "FRA" },
        { name: "Raphinha", americanOdds: "+450", nationAbbr: "BRA" },
        { name: "Antoine Griezmann", americanOdds: "+500", nationAbbr: "FRA" },
      ],
      first_goalscorer: [
        { name: "Kylian Mbappé", americanOdds: "+550", nationAbbr: "FRA" },
        { name: "Vinícius Júnior", americanOdds: "+650", nationAbbr: "BRA" },
      ],
      player_assists_ou: [
        { name: "Kylian Mbappé", americanOdds: "+140", nationAbbr: "FRA", line: "0.5", side: "over" },
        { name: "Antoine Griezmann", americanOdds: "+220", nationAbbr: "FRA", line: "0.5", side: "over" },
      ],
      player_sot_ou: [
        { name: "Vinícius Júnior", americanOdds: "-115", nationAbbr: "BRA", line: "1.5", side: "over" },
      ],
      player_card: [
        { name: "Casemiro", americanOdds: "+280", nationAbbr: "BRA", side: "yes" },
      ],
    },
  },
};
