export default function handler(req, res) {

res.setHeader("Access-Control-Allow-Origin", "*");

res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {

return res.status(200).end();

}

if (req.method !== "GET") {

return res.status(405).json({ error: "Method not allowed" });

}

return res.status(200).json({

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

Sinner_Medvedev: {

h2h: "Sinner leads 8-7",

surface_edge: "Sinner",

note: "Medvedev's return profile keeps Sinner's ace total honest. If this reaches a third set, Sinner's tiebreak edge becomes decisive.",

angle: "Medvedev's tiebreak profile is a real liability in long matches.",

key_stat: "Sinner averages around 8.1 aces per match on hard courts in this context set"

},

Alcaraz_Sinner: {

h2h: "Alcaraz leads 11-6",

surface_edge: "Alcaraz",

note: "Alcaraz won Miami in 2022 and 2023. His movement and variety play extremely well here.",

angle: "The drop shot and change-of-height pattern is the tactical pressure point.",

key_stat: "Alcaraz entered this context on a major outdoor hard-court streak"

},

Sabalenka_Swiatek: {

h2h: "Swiatek leads 8-5",

surface_edge: "Sabalenka",

note: "Sabalenka's hard-court ceiling is higher in these conditions. Swiatek's overall edge historically is stronger on slower surfaces, especially clay.",

angle: "If the match gets tight late, Sabalenka's serve-plus-first-ball profile matters most.",

key_stat: "Sabalenka is at peak Elo in this dataset"

},

Sabalenka_Rybakina: {

h2h: "Sabalenka leads 9-7",

surface_edge: "Rybakina",

note: "Rybakina's serve is the one weapon that can consistently hold up against Sabalenka's pace.",

angle: "This is one of the thinnest high-end WTA matchup edges on the board.",

key_stat: "Rybakina has the highest ace rate in this WTA set"

},

Swiatek_Gauff: {

h2h: "Swiatek leads 11-5",

surface_edge: "Swiatek",

note: "Swiatek's return game has consistently exposed Gauff's serve volatility.",

angle: "Double faults and second-serve pressure are the swing variables.",

key_stat: "Swiatek owns the top break-rate profile in this context set"

},

Pegula_Sabalenka: {

h2h: "Sabalenka leads 9-3",

surface_edge: "Pegula",

note: "Pegula's current form and hard-court comfort make her much more dangerous than the H2H alone suggests.",

angle: "Pegula is one of the most live pressure-return players in the draw.",

key_stat: "Pegula opened 2026 in elite form in this context set"

}

},

ace_props: {

Sinner: {

avg_aces_hard: 8.1,

ace_rate: "10.2%",

note: "Miami's medium-fast conditions keep him near the key 8-ace zone."

},

Alcaraz: {

avg_aces_hard: 7.4,

ace_rate: "7.2%",

note: "He wins more through variety and point construction than pure ace volume."

},

Medvedev: {

avg_aces_hard: 9.8,

ace_rate: "11.2%",

note: "Flat serving profile still plays up well on hard courts."

},

Fritz: {

avg_aces_hard: 12.1,

ace_rate: "15.8%",

note: "One of the cleanest pure ace-over profiles in the pool."

},

Rybakina: {

avg_aces_hard: 7.2,

ace_rate: "10.3%",

note: "Best pure serve profile on the WTA side in this context."

},

Sabalenka: {

avg_aces_hard: 4.8,

ace_rate: "6.6%",

note: "Power matters more than raw ace count in her scoring profile."

}

}

});

}
