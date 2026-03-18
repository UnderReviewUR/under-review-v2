export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    tournaments: {
      miami_open: {
        surface: "Hard",
        speed: "Medium-Fast",
        atp_favorite: "Sinner",
        wta_favorite: "Sabalenka",
        note: "Miami hard courts play slightly slower than the US Open. Heavy topspin and baseline consistency are rewarded. Big servers still have an edge but rallies run longer. Humidity in early rounds can affect ball speed."
      }
    },
    matchups: {
      "Sinner_Medvedev": {
        h2h: "Sinner leads 8-7",
        surface_edge: "Sinner",
        note: "Medvedev's return profile keeps Sinner's ace total honest — 8 is a sharper line than it looks. If this reaches a third set, Sinner's 81% tiebreak rate is the deciding factor.",
        angle: "Medvedev wins only 42% of tiebreaks — worst in the ATP top 10. Third set is a major liability for him.",
        key_stat: "Sinner averages 8.1 aces per match on Miami hard courts"
      },
      "Alcaraz_Sinner": {
        h2h: "Alcaraz leads 11-6",
        surface_edge: "Alcaraz",
        note: "Alcaraz won Miami in 2022 and 2023. His movement and variety are maximized on this surface. Sinner has beaten him recently but the H2H and location favor Alcaraz.",
        angle: "Alcaraz's drop shot forces Sinner off the baseline — the key tactical battle.",
        key_stat: "Alcaraz is 34-0 on outdoor hard courts in his current streak"
      },
      "Sabalenka_Swiatek": {
        h2h: "Swiatek leads 8-5",
        surface_edge: "Sabalenka",
        note: "Sabalenka is ranked #1 on hard courts by Elo — this is her best surface. Swiatek's H2H lead comes largely from clay. On Miami hard courts the edge shifts to Sabalenka.",
        angle: "Sabalenka's 92.3% tiebreak rate (24-2) is historically extraordinary. If the match goes tight she almost always closes.",
        key_stat: "Sabalenka is at career peak Elo (2247) this month"
      },
      "Sabalenka_Rybakina": {
        h2h: "Sabalenka leads 9-7",
        surface_edge: "Rybakina",
        note: "This is the best matchup in women's tennis. Rybakina's flat serve is the one weapon that can neutralize Sabalenka's power. Rybakina leads in grass Elo — fast surfaces suit her.",
        angle: "Razor thin H2H. Best hard court matchup on the WTA tour.",
        key_stat: "Rybakina has the highest ace rate on the WTA tour at 10.3%"
      },
      "Swiatek_Gauff": {
        h2h: "Swiatek leads 11-5",
        surface_edge: "Swiatek",
        note: "Swiatek's dominance over Gauff is one of the most lopsided H2H records in the top 10. Gauff's 10.4% DF rate is exploited by Swiatek's return game.",
        angle: "Gauff's yElo is only #14 in 2026 — she is underperforming her ranking significantly this season.",
        key_stat: "Swiatek has the #1 break rate on tour at 43.8%"
      },
      "Pegula_Sabalenka": {
        h2h: "Sabalenka leads 9-3",
        surface_edge: "Pegula",
        note: "Pegula is at career peak Elo and running yElo #2 in 2026. Her hard court Elo (#3) is essentially tied with Swiatek. Despite the H2H deficit she is the most dangerous opponent Sabalenka could face at Miami.",
        angle: "Pegula is massively underrated by the market right now. Best value in the WTA draw.",
        key_stat: "Pegula is 16-3 in 2026 — best season of her career"
      }
    },
    ace_props: {
      "Sinner": {
        avg_aces_hard: 8.1,
        ace_rate: "10.2%",
        note: "Miami's medium-fast surface puts his average right at the 8-ace line. The key variable is Medvedev's return pressure."
      },
      "Alcaraz": {
        avg_aces_hard: 7.4,
        ace_rate: "7.2%",
        note: "Not a primary ace generator. Lines under 6 are playable under."
      },
      "Medvedev": {
        avg_aces_hard: 9.8,
        ace_rate: "11.2%",
        note: "High ace volume for his style. Hard courts amplify his flat serve."
      },
      "Fritz": {
        avg_aces_hard: 12.1,
        ace_rate: "15.8%",
        note: "Highest ace rate on tour. Any line under 10 leans over."
      },
      "Rybakina": {
        avg_aces_hard: 7.2,
        ace_rate: "10.3%",
        note: "Best serve on the WTA tour. Hard court lines around 5-6 lean over."
      },
      "Sabalenka": {
        avg_aces_hard: 4.8,
        ace_rate: "6.6%",
        note: "Wins through power not aces. Lines over 5 lean under."
      }
    }
  });
}
