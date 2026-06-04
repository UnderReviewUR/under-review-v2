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
    },
  },
};
