// src/data/nba/players.js
// Curated prop profiles for top 80 NBA players
// pts/reb/ast = season per-game averages (2024-25)

export const NBA_PLAYERS = {

  "Nikola Jokic": {
    team:"DEN", pos:"C", tier:"ELITE",
    pts:29.6, reb:12.7, ast:10.2,
    props:{
      pts:{floor:22,ceil:45,lean:"OVER — triple-double machine, usage never dips"},
      reb:{floor:10,ceil:18,lean:"OVER — elite rebounder, sets own floor"},
      ast:{floor:7,ceil:15,lean:"OVER — best passing big in NBA history"},
      pra:{floor:45,ceil:70,lean:"OVER on PRA totals — safest bet in the NBA"},
    },
    usage:"37.2%",
    bettingAngles:[
      "PRA over is the safest prop in basketball — consistent 50+ nights",
      "Assists over in fast-paced games or vs weak defensive teams",
      "Rebounds over when Murray or Porter are out — he does everything",
      "Fade his pts line vs elite rim protection — PRA stays elite even then",
    ],
    note:"The most reliable prop player in the NBA. His floor is elite even on off nights.",
  },

  "Shai Gilgeous-Alexander": {
    team:"OKC", pos:"G", tier:"ELITE",
    pts:32.7, reb:5.1, ast:6.4,
    props:{
      pts:{floor:25,ceil:50,lean:"OVER — MVP-level scorer, gets to line at will"},
      reb:{floor:4,ceil:8,lean:"LEAN OVER — underrated rebounder for a guard"},
      ast:{floor:4,ceil:9,lean:"NEUTRAL — varies with pace and game script"},
      pra:{floor:38,ceil:58,lean:"OVER"},
    },
    usage:"34.1%",
    bettingAngles:[
      "Points over is the primary play — he gets to the line 8-10 times per game",
      "Free throw attempts prop: OVER almost every game",
      "PRA safer than pts alone — his reb/ast pad the line reliably",
    ],
    note:"2024-25 MVP frontrunner. Most efficient high-volume scorer in the league.",
  },

  "Luka Doncic": {
    team:"LAL", pos:"G", tier:"ELITE",
    pts:28.1, reb:8.2, ast:8.0,
    props:{
      pts:{floor:20,ceil:45,lean:"OVER — elite creator, but inconsistent nights exist"},
      reb:{floor:6,ceil:12,lean:"OVER — massive for a guard"},
      ast:{floor:6,ceil:13,lean:"OVER in pace-up games"},
      pra:{floor:38,ceil:60,lean:"OVER"},
    },
    usage:"36.8%",
    bettingAngles:[
      "PRA over is the safest play — even quiet scoring nights produce big all-around lines",
      "Assists over when LeBron/AD are limiting his scoring load",
      "Fade pts line vs elite perimeter defenders",
    ],
    note:"Trade to Lakers adds uncertainty. Monitor usage split with LeBron early season.",
  },

  "Jayson Tatum": {
    team:"BOS", pos:"F", tier:"ELITE",
    pts:26.9, reb:8.1, ast:4.9,
    props:{
      pts:{floor:20,ceil:42,lean:"OVER in playoff spots, NEUTRAL in blowouts"},
      reb:{floor:6,ceil:12,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:35,ceil:55,lean:"OVER"},
    },
    usage:"32.1%",
    bettingAngles:[
      "Points floor is high — scores 20+ in 70%+ of games",
      "Fade in big blowouts — Celtics rest starters early",
      "Back in elimination/must-win spots — elite performer under pressure",
    ],
    note:"High floor, massive ceiling. PRA is more reliable than pts alone.",
  },

  "Giannis Antetokounmpo": {
    team:"MIL", pos:"F", tier:"ELITE",
    pts:30.4, reb:11.5, ast:6.5,
    props:{
      pts:{floor:24,ceil:50,lean:"OVER — unstoppable in paint"},
      reb:{floor:9,ceil:16,lean:"OVER"},
      ast:{floor:4,ceil:10,lean:"NEUTRAL"},
      pra:{floor:44,ceil:65,lean:"OVER"},
    },
    usage:"35.7%",
    bettingAngles:[
      "PRA over is elite — 50+ PRA in over 40% of games",
      "FT volume makes pts props viable even on off nights",
      "Fade vs teams with multiple physical rim protectors",
    ],
    note:"All-time great. PRA is the safest market.",
  },

  "Anthony Edwards": {
    team:"MIN", pos:"G", tier:"ELITE",
    pts:27.8, reb:5.4, ast:5.1,
    props:{
      pts:{floor:20,ceil:44,lean:"OVER — explosive scorer, big ceiling"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:3,ceil:8,lean:"NEUTRAL"},
      pra:{floor:32,ceil:52,lean:"OVER"},
    },
    usage:"33.4%",
    bettingAngles:[
      "Points over is the primary market — he goes off in big games",
      "Back in rivalry/national TV games — elevates for big moments",
      "Fade vs elite perimeter defenders",
    ],
    note:"Best athlete in the league. Ceiling plays more reliable than floor plays.",
  },

  "Victor Wembanyama": {
    team:"SAS", pos:"C", tier:"ELITE",
    pts:24.5, reb:10.6, ast:3.9,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER — unique offensive skill set"},
      reb:{floor:8,ceil:15,lean:"OVER"},
      ast:{floor:2,ceil:6,lean:"NEUTRAL"},
      blk:{floor:2,ceil:6,lean:"OVER — elite shot blocker"},
    },
    usage:"30.2%",
    bettingAngles:[
      "Blocks over is the unique angle — 3.5 per game pace, best in the league",
      "PRA over in pace-up matchups",
      "Points ceiling is massive — 40+ point games are real",
    ],
    note:"Generational talent. Blocks prop is the best differentiating angle.",
  },

  "Karl-Anthony Towns": {
    team:"NYK", pos:"C", tier:"STAR",
    pts:24.3, reb:13.7, ast:3.2,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER"},
      reb:{floor:11,ceil:18,lean:"OVER — elite rebounder"},
      ast:{floor:2,ceil:5,lean:"NEUTRAL"},
      pra:{floor:38,ceil:55,lean:"OVER"},
    },
    usage:"28.7%",
    bettingAngles:[
      "Rebounds over is the primary play",
      "Back in MSG — home crowd lifts his performance",
      "PRA and rebounds are the reliable markets",
    ],
    note:"Elite rebounder, stretch big. PRA and rebounds are the consistent markets.",
  },

  "Tyrese Haliburton": {
    team:"IND", pos:"G", tier:"STAR",
    pts:20.1, reb:3.9, ast:10.9,
    props:{
      pts:{floor:14,ceil:32,lean:"NEUTRAL — scoring varies with game script"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:8,ceil:16,lean:"OVER — elite passer, primary creator"},
      pra:{floor:30,ceil:48,lean:"OVER"},
    },
    usage:"25.4%",
    bettingAngles:[
      "Assists over is the primary play — top-3 assist rate in the league",
      "Back in fast-paced games — Pacers run and his assists spike",
      "Injury history is the main risk — monitor reports",
    ],
    note:"Best pure point guard prop player for assists.",
  },

  "Donovan Mitchell": {
    team:"CLE", pos:"G", tier:"STAR",
    pts:26.1, reb:4.4, ast:5.4,
    props:{
      pts:{floor:19,ceil:42,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:3,ceil:8,lean:"NEUTRAL"},
      pra:{floor:30,ceil:50,lean:"OVER"},
    },
    usage:"30.8%",
    bettingAngles:[
      "Points over is the primary play — explosive scorer",
      "Back in national TV/big market games",
      "Fade vs elite perimeter defenders",
    ],
    note:"One of the most explosive scorers in the East.",
  },

  "Bam Adebayo": {
    team:"MIA", pos:"C", tier:"STAR",
    pts:19.2, reb:10.4, ast:4.4,
    props:{
      pts:{floor:14,ceil:28,lean:"NEUTRAL"},
      reb:{floor:8,ceil:14,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"OVER in pace-up games"},
      pra:{floor:30,ceil:46,lean:"OVER"},
    },
    usage:"25.1%",
    bettingAngles:[
      "PRA over is the consistent play",
      "Rebounds over in slow, physical games",
      "Fade pts vs elite rim protectors",
    ],
    note:"Elite two-way player. PRA is the reliable market.",
  },

  "LeBron James": {
    team:"LAL", pos:"F", tier:"STAR",
    pts:23.7, reb:8.0, ast:8.2,
    props:{
      pts:{floor:18,ceil:38,lean:"NEUTRAL — age-related variance increasing"},
      reb:{floor:6,ceil:11,lean:"OVER"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:36,ceil:55,lean:"OVER"},
    },
    usage:"29.4%",
    bettingAngles:[
      "PRA over is the safest play — contributes across all categories even at 40",
      "Fade pts on back-to-backs — rest management is real",
      "Doncic trade changes dynamics — monitor usage split",
    ],
    note:"Age-related variance is real. PRA safer than pts alone.",
  },

  "Stephen Curry": {
    team:"GSW", pos:"G", tier:"STAR",
    pts:26.4, reb:4.5, ast:6.1,
    props:{
      pts:{floor:18,ceil:50,lean:"OVER — massive ceiling on hot nights"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:4,ceil:9,lean:"NEUTRAL"},
      threes:{floor:2,ceil:10,lean:"OVER — best shooter in NBA history"},
    },
    usage:"30.5%",
    bettingAngles:[
      "3-pointers made over is the signature play — 5+ three nights are routine",
      "Points ceiling is massive — 50+ point games are still real",
      "Back in Chase Center — home crowd lifts his shooting",
    ],
    note:"3-pointers made prop is the unique differentiating market.",
  },

  "Kevin Durant": {
    team:"PHX", pos:"F", tier:"STAR",
    pts:27.1, reb:6.8, ast:4.2,
    props:{
      pts:{floor:22,ceil:45,lean:"OVER — elite scorer, most efficient in the league"},
      reb:{floor:5,ceil:10,lean:"NEUTRAL"},
      ast:{floor:2,ceil:6,lean:"NEUTRAL"},
      pra:{floor:33,ceil:55,lean:"OVER"},
    },
    usage:"31.8%",
    bettingAngles:[
      "Points over is the primary play — elite efficiency means consistent scoring",
      "Back when Booker is out — usage spikes significantly",
      "Fade in blowout losses — DNP risk in garbage time",
    ],
    note:"Most efficient scorer in the league. Points props are the most reliable market.",
  },

  "Devin Booker": {
    team:"PHX", pos:"G", tier:"STAR",
    pts:25.4, reb:4.3, ast:6.8,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:5,ceil:10,lean:"OVER"},
      pra:{floor:32,ceil:50,lean:"OVER"},
    },
    usage:"30.1%",
    bettingAngles:[
      "Points over is primary — elite scorer, gets to the line well",
      "Assists over when Durant is on a minutes restriction",
      "Back in nationally televised games",
    ],
    note:"Elite scorer. PRA and points are the consistent markets.",
  },

  "Ja Morant": {
    team:"MEM", pos:"G", tier:"STAR",
    pts:24.7, reb:5.1, ast:8.1,
    props:{
      pts:{floor:18,ceil:42,lean:"OVER when healthy"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:33,ceil:52,lean:"OVER"},
    },
    usage:"30.9%",
    bettingAngles:[
      "Health is the primary risk — monitor injury reports closely",
      "Points over when fully healthy — explosive scorer",
      "Fade on back-to-backs or after any injury concern",
    ],
    note:"Injury history is the main variable. Health check is mandatory.",
  },

  "Zion Williamson": {
    team:"NOP", pos:"F", tier:"STAR",
    pts:23.8, reb:5.8, ast:4.1,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER when healthy"},
      reb:{floor:4,ceil:9,lean:"NEUTRAL"},
      ast:{floor:3,ceil:6,lean:"NEUTRAL"},
      pra:{floor:28,ceil:46,lean:"OVER when playing"},
    },
    usage:"32.4%",
    bettingAngles:[
      "Health check is non-negotiable — confirm active before any bet",
      "FT volume: draws contact at elite rate",
      "Fade on minutes restriction games",
    ],
    note:"Highest injury risk on this list. Never bet without confirming active status.",
  },

  "Pascal Siakam": {
    team:"IND", pos:"F", tier:"STAR",
    pts:21.3, reb:7.8, ast:4.4,
    props:{
      pts:{floor:16,ceil:32,lean:"OVER"},
      reb:{floor:6,ceil:11,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:30,ceil:48,lean:"OVER"},
    },
    usage:"27.3%",
    bettingAngles:[
      "PRA over is the consistent play — contributes across all three categories",
      "Pacers fast pace benefits his athleticism",
      "Back alongside Haliburton",
    ],
    note:"Underrated prop player. PRA is the most consistent market.",
  },

  "De'Aaron Fox": {
    team:"SAC", pos:"G", tier:"STAR",
    pts:24.8, reb:4.1, ast:6.8,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:5,ceil:10,lean:"OVER"},
      pra:{floor:30,ceil:48,lean:"OVER"},
    },
    usage:"29.7%",
    bettingAngles:[
      "Points over in pace-up games — elite in transition",
      "Check game total and opponent defensive pace before betting",
      "Back in home games",
    ],
    note:"Pace-dependent scorer. Game total is the key contextual signal.",
  },

  "Darius Garland": {
    team:"CLE", pos:"G", tier:"STAR",
    pts:21.6, reb:2.8, ast:7.9,
    props:{
      pts:{floor:15,ceil:32,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:27,ceil:44,lean:"OVER"},
    },
    usage:"26.2%",
    bettingAngles:[
      "Assists over is the primary play — elite creator alongside Mitchell",
      "Points over in games where Mitchell is limited",
      "Back in pace-up matchups",
    ],
    note:"Elite passer. Assists are the primary market.",
  },

  "Cade Cunningham": {
    team:"DET", pos:"G", tier:"STAR",
    pts:25.2, reb:6.1, ast:9.0,
    props:{
      pts:{floor:19,ceil:38,lean:"OVER"},
      reb:{floor:5,ceil:9,lean:"OVER"},
      ast:{floor:7,ceil:13,lean:"OVER"},
      pra:{floor:36,ceil:54,lean:"OVER"},
    },
    usage:"31.5%",
    bettingAngles:[
      "PRA over is a strong play — elite all-around contributor",
      "Assists over — top-5 playmaker in the league",
      "Detroit rebuilding around him — usage locked in",
    ],
    note:"Undervalued prop player. PRA and assists are the consistent markets.",
  },

  "Paolo Banchero": {
    team:"ORL", pos:"F", tier:"STAR",
    pts:24.6, reb:7.4, ast:5.8,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      ast:{floor:4,ceil:8,lean:"NEUTRAL"},
      pra:{floor:33,ceil:52,lean:"OVER"},
    },
    usage:"30.2%",
    bettingAngles:[
      "PRA over — young star contributing across all three categories",
      "Points over in pace-up matchups",
      "Orlando's clear #1 option — usage is maximized",
    ],
    note:"Ascending star. PRA is the most reliable market.",
  },

  "Scottie Barnes": {
    team:"TOR", pos:"F", tier:"STAR",
    pts:21.8, reb:8.5, ast:6.2,
    props:{
      pts:{floor:16,ceil:32,lean:"NEUTRAL"},
      reb:{floor:7,ceil:12,lean:"OVER"},
      ast:{floor:4,ceil:9,lean:"OVER"},
      pra:{floor:32,ceil:48,lean:"OVER"},
    },
    usage:"27.8%",
    bettingAngles:[
      "PRA over is the primary play",
      "Rebounds over in physical matchups",
      "Toronto rebuilding around him — usage maximized",
    ],
    note:"Underrated prop player. PRA and rebounds are the most reliable markets.",
  },

  "Franz Wagner": {
    team:"ORL", pos:"F", tier:"STAR",
    pts:22.4, reb:5.2, ast:4.8,
    props:{
      pts:{floor:16,ceil:35,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:26,ceil:44,lean:"OVER"},
    },
    usage:"27.1%",
    bettingAngles:[
      "Points over is the primary market — consistent scorer alongside Banchero",
      "Back in games where Banchero draws double teams",
      "PRA over in pace-up matchups",
    ],
    note:"Reliable second scorer. Points are the consistent market.",
  },

  "Alperen Sengun": {
    team:"HOU", pos:"C", tier:"STAR",
    pts:21.1, reb:9.4, ast:5.1,
    props:{
      pts:{floor:16,ceil:32,lean:"OVER"},
      reb:{floor:7,ceil:14,lean:"OVER"},
      ast:{floor:3,ceil:8,lean:"OVER — elite passer for a center"},
      pra:{floor:32,ceil:50,lean:"OVER"},
    },
    usage:"26.4%",
    bettingAngles:[
      "PRA over is the primary play — elite all-around big man",
      "Assists over — rare playmaking ability for his position",
      "Most underrated prop player at the center position",
    ],
    note:"Most underrated prop player at center. PRA and assists are the edges.",
  },

  "Jalen Brunson": {
    team:"NYK", pos:"G", tier:"STAR",
    pts:26.6, reb:3.4, ast:7.5,
    props:{
      pts:{floor:20,ceil:42,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      ast:{floor:5,ceil:11,lean:"OVER"},
      pra:{floor:30,ceil:50,lean:"OVER"},
    },
    usage:"32.6%",
    bettingAngles:[
      "Points over is the primary play — elite scorer with no clear weakness",
      "Back at MSG — home crowd elevates his performance",
      "Assists over in pace-up games",
    ],
    note:"Top-5 scoring prop player. Points and assists are both reliable markets.",
  },

  "Jaylen Brown": {
    team:"BOS", pos:"F", tier:"STAR",
    pts:23.0, reb:5.5, ast:3.6,
    props:{
      pts:{floor:17,ceil:36,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:2,ceil:5,lean:"NEUTRAL"},
      pra:{floor:28,ceil:44,lean:"OVER"},
    },
    usage:"28.1%",
    bettingAngles:[
      "Points over is primary — elite scorer in Boston's championship system",
      "Back in elimination/playoff games",
      "Fade in blowouts — Boston rests starters when ahead big",
    ],
    note:"Championship-level performer. Points and PRA are the consistent markets.",
  },

  "Trae Young": {
    team:"ATL", pos:"G", tier:"STAR",
    pts:23.7, reb:2.8, ast:11.4,
    props:{
      pts:{floor:17,ceil:38,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      ast:{floor:9,ceil:16,lean:"OVER — top-3 assists in the league"},
      pra:{floor:32,ceil:52,lean:"OVER"},
    },
    usage:"31.2%",
    bettingAngles:[
      "Assists over is the primary play — consistently top-3 in the NBA",
      "Points over in pace-up games",
      "Atlanta rebuilding gives him maximum usage",
    ],
    note:"Most reliable assists prop player alongside Haliburton.",
  },

  "Damian Lillard": {
    team:"MIL", pos:"G", tier:"STAR",
    pts:24.1, reb:4.2, ast:7.4,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:5,ceil:11,lean:"OVER"},
      threes:{floor:2,ceil:7,lean:"OVER"},
    },
    usage:"29.8%",
    bettingAngles:[
      "Points over when Giannis is limited — usage spikes",
      "3-pointers made: elite from deep, especially from logo range",
      "Back in big games — elite clutch performer",
    ],
    note:"Elite scorer. Points and 3-pointers made are the primary markets.",
  },

  "LaMelo Ball": {
    team:"CHA", pos:"G", tier:"STAR",
    pts:22.4, reb:5.2, ast:8.5,
    props:{
      pts:{floor:16,ceil:36,lean:"NEUTRAL"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:30,ceil:50,lean:"OVER"},
    },
    usage:"28.6%",
    bettingAngles:[
      "Assists over is the primary play — elite playmaker",
      "Health check required — injury history is real",
      "PRA over when fully healthy",
    ],
    note:"Health-dependent. When healthy, assists and PRA are the reliable markets.",
  },

  "Anthony Davis": {
    team:"LAL", pos:"C", tier:"STAR",
    pts:24.7, reb:12.1, ast:3.4,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER when healthy"},
      reb:{floor:9,ceil:16,lean:"OVER"},
      blk:{floor:1,ceil:4,lean:"OVER"},
      pra:{floor:36,ceil:54,lean:"OVER"},
    },
    usage:"28.9%",
    bettingAngles:[
      "PRA over is the primary play — elite rebounder and scorer",
      "Health check required — history of missing games",
      "Fade when on minutes restriction",
    ],
    note:"Health and minutes are the variables. When fully playing, stats are elite.",
  },

  "Rudy Gobert": {
    team:"MIN", pos:"C", tier:"SOLID",
    pts:13.4, reb:12.0, ast:1.4,
    props:{
      pts:{floor:10,ceil:20,lean:"NEUTRAL"},
      reb:{floor:10,ceil:17,lean:"OVER — elite rebounder"},
      blk:{floor:1,ceil:4,lean:"OVER"},
      pra:{floor:24,ceil:36,lean:"NEUTRAL"},
    },
    usage:"17.8%",
    bettingAngles:[
      "Rebounds over is the primary play — consistently top-3 in the NBA",
      "Double-double prop: strong play, hits it 70%+ of games",
      "Fade pts — low usage, below-average FT shooter",
    ],
    note:"Rebounds and double-double props are the only consistent markets.",
  },

  "Jaren Jackson Jr.": {
    team:"MEM", pos:"C", tier:"SOLID",
    pts:22.1, reb:6.0, ast:1.6,
    props:{
      pts:{floor:16,ceil:34,lean:"OVER"},
      reb:{floor:4,ceil:9,lean:"NEUTRAL"},
      blk:{floor:2,ceil:5,lean:"OVER — Defensive Player of the Year caliber"},
      pra:{floor:26,ceil:42,lean:"OVER"},
    },
    usage:"27.4%",
    bettingAngles:[
      "Blocks over is the unique angle — one of the top-2 shot blockers in the league",
      "Points over in games where he's featured offensively alongside Ja",
      "Back when Ja is healthy — their pairing opens his offensive role",
    ],
    note:"Blocks prop is the differentiating market.",
  },

  "Desmond Bane": {
    team:"MEM", pos:"G", tier:"SOLID",
    pts:21.4, reb:4.2, ast:5.1,
    props:{
      pts:{floor:15,ceil:32,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:26,ceil:44,lean:"OVER"},
    },
    usage:"25.6%",
    bettingAngles:[
      "3-pointers made: elite shooter — back this prop in any pace-up game",
      "Points over when Ja is limited — usage spikes significantly",
      "Back in high-scoring games",
    ],
    note:"Elite shooter. 3-pointers made and points are the primary markets.",
  },

  "Kyrie Irving": {
    team:"DAL", pos:"G", tier:"SOLID",
    pts:24.2, reb:4.0, ast:5.3,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:4,ceil:8,lean:"NEUTRAL"},
      pra:{floor:28,ceil:48,lean:"OVER"},
    },
    usage:"29.4%",
    bettingAngles:[
      "Points over in games where he's the primary creator",
      "Health check required — availability has been inconsistent",
      "Dallas situation uncertain post-Doncic trade",
    ],
    note:"Dallas situation uncertain. Monitor team context carefully.",
  },

  "Brandon Ingram": {
    team:"NOP", pos:"F", tier:"SOLID",
    pts:22.3, reb:5.4, ast:5.8,
    props:{
      pts:{floor:16,ceil:34,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:4,ceil:8,lean:"NEUTRAL"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"28.1%",
    bettingAngles:[
      "Points over is primary — elite mid-range scorer",
      "Back when Zion is out — becomes the clear #1 option",
      "Fade when Zion is healthy and dominating usage",
    ],
    note:"Reliable scorer. Best value when Zion is limited or out.",
  },

  "Tyler Herro": {
    team:"MIA", pos:"G", tier:"SOLID",
    pts:22.8, reb:5.1, ast:5.2,
    props:{
      pts:{floor:16,ceil:36,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:3,ceil:8,lean:"NEUTRAL"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"27.8%",
    bettingAngles:[
      "Points over is primary — elite shooter with high-volume usage",
      "Back when Jimmy Butler is out — usage spikes massively",
      "Fade when full Miami roster is healthy",
    ],
    note:"Best value when Butler is limited. Monitor Butler status.",
  },

  "Jalen Williams": {
    team:"OKC", pos:"F", tier:"SOLID",
    pts:22.5, reb:4.5, ast:5.8,
    props:{
      pts:{floor:16,ceil:34,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:4,ceil:8,lean:"OVER"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"26.8%",
    bettingAngles:[
      "Points over when SGA is limited — usage spikes",
      "PRA over — elite all-around second option",
      "SGA usage is the primary variable",
    ],
    note:"Reliable second option. Best prop value when SGA is limited.",
  },

  "Evan Mobley": {
    team:"CLE", pos:"C", tier:"SOLID",
    pts:18.6, reb:9.4, ast:2.9,
    props:{
      pts:{floor:14,ceil:28,lean:"OVER"},
      reb:{floor:7,ceil:14,lean:"OVER"},
      blk:{floor:1,ceil:4,lean:"OVER"},
      pra:{floor:28,ceil:44,lean:"OVER"},
    },
    usage:"23.8%",
    bettingAngles:[
      "PRA over is the consistent play — elite all-around big man",
      "Rebounds over in physical interior matchups",
      "Blocks over — one of the best shot blockers in the East",
    ],
    note:"Undervalued prop player. PRA and rebounds are the reliable markets.",
  },

  "Josh Hart": {
    team:"NYK", pos:"G", tier:"SOLID",
    pts:12.4, reb:9.8, ast:4.6,
    props:{
      pts:{floor:8,ceil:22,lean:"NEUTRAL"},
      reb:{floor:8,ceil:14,lean:"OVER — elite rebounder for a guard"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:24,ceil:38,lean:"OVER"},
    },
    usage:"17.2%",
    bettingAngles:[
      "Rebounds over is the primary play — anomalous for his position",
      "PRA over — contributes across all three categories",
      "Elite rebounder for a guard — market often underprices this",
    ],
    note:"Rebounds are the standout prop. Market often underprices his rebounding.",
  },

  "Mikal Bridges": {
    team:"NYK", pos:"F", tier:"SOLID",
    pts:18.2, reb:4.1, ast:3.6,
    props:{
      pts:{floor:13,ceil:28,lean:"NEUTRAL"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      stl:{floor:1,ceil:3,lean:"OVER"},
      pra:{floor:22,ceil:36,lean:"NEUTRAL"},
    },
    usage:"22.4%",
    bettingAngles:[
      "Steals over is the unique differentiating prop — elite on-ball defender",
      "Fade pts — fourth scoring option in Knicks system",
      "Back on 3-pointers made when getting open looks",
    ],
    note:"Defensive stats (steals) are the prop angle. Scoring ceiling is capped.",
  },

  "OG Anunoby": {
    team:"NYK", pos:"F", tier:"SOLID",
    pts:16.8, reb:5.1, ast:2.1,
    props:{
      pts:{floor:12,ceil:26,lean:"NEUTRAL"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      stl:{floor:1,ceil:3,lean:"OVER"},
      pra:{floor:22,ceil:36,lean:"NEUTRAL"},
    },
    usage:"21.6%",
    bettingAngles:[
      "Steals over is the unique differentiating prop",
      "Back when Brunson/Towns are drawing attention",
      "Fade pts — fourth scoring option in Knicks system",
    ],
    note:"Defensive stats (steals) are the prop angle.",
  },

  "Amen Thompson": {
    team:"HOU", pos:"F", tier:"SOLID",
    pts:15.8, reb:7.6, ast:4.9,
    props:{
      pts:{floor:11,ceil:24,lean:"NEUTRAL"},
      reb:{floor:6,ceil:11,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:24,ceil:40,lean:"OVER"},
    },
    usage:"21.4%",
    bettingAngles:[
      "PRA over — contributes across all three categories",
      "Ascending player — props may be undervalued as he develops",
      "Back alongside Sengun",
    ],
    note:"Ascending player. PRA is the reliable market as his role expands.",
  },

  "Jamal Murray": {
    team:"DEN", pos:"G", tier:"SOLID",
    pts:20.8, reb:4.2, ast:6.3,
    props:{
      pts:{floor:14,ceil:34,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:4,ceil:9,lean:"OVER"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"24.6%",
    bettingAngles:[
      "Points over in playoff-important games — elite clutch performer",
      "Health check required — injury history is real",
      "PRA over when healthy alongside Jokic",
    ],
    note:"Elite playoff performer. Health check is mandatory before betting.",
  },

  "Anfernee Simons": {
    team:"POR", pos:"G", tier:"SOLID",
    pts:21.7, reb:3.4, ast:5.4,
    props:{
      pts:{floor:15,ceil:35,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:26,ceil:44,lean:"OVER"},
    },
    usage:"27.8%",
    bettingAngles:[
      "Points over — primary option on rebuilding Portland",
      "3-pointers made: elite from deep with high volume",
      "Back in high game totals",
    ],
    note:"High-volume scorer on a weak team. Game total and defense are the variables.",
  },

  "Lauri Markkanen": {
    team:"UTA", pos:"F", tier:"SOLID",
    pts:23.2, reb:8.2, ast:2.4,
    props:{
      pts:{floor:17,ceil:34,lean:"OVER"},
      reb:{floor:6,ceil:12,lean:"OVER"},
      threes:{floor:2,ceil:5,lean:"OVER"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"26.4%",
    bettingAngles:[
      "PRA over is the consistent play — elite all-around stretch big",
      "3-pointers made: elite shooter from the 4 position",
      "Utah rebuilding — his usage is maximized",
    ],
    note:"Undervalued prop player. PRA and 3-pointers are the reliable markets.",
  },

  "Immanuel Quickley": {
    team:"TOR", pos:"G", tier:"SOLID",
    pts:18.4, reb:4.1, ast:7.2,
    props:{
      pts:{floor:13,ceil:28,lean:"OVER as starter"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:5,ceil:10,lean:"OVER"},
      pra:{floor:26,ceil:42,lean:"OVER"},
    },
    usage:"24.1%",
    bettingAngles:[
      "Assists over is the primary play",
      "PRA over — contributes across all three categories",
      "Toronto rebuilding — usage maximized",
    ],
    note:"Undervalued. PRA and assists are reliable with Toronto's system.",
  },

  "Dejounte Murray": {
    team:"NOP", pos:"G", tier:"SOLID",
    pts:20.4, reb:5.2, ast:7.8,
    props:{
      pts:{floor:14,ceil:30,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:5,ceil:11,lean:"OVER"},
      pra:{floor:30,ceil:46,lean:"OVER"},
    },
    usage:"25.7%",
    bettingAngles:[
      "PRA over is the primary play — elite all-around contributor",
      "Steals prop: elite on-ball defender, averages 1.5+ per game",
      "Back when Zion/Ingram are limited",
    ],
    note:"Reliable all-around player. PRA, assists, and steals are the markets.",
  },

  "Nikola Vucevic": {
    team:"CHI", pos:"C", tier:"SOLID",
    pts:18.2, reb:10.6, ast:3.4,
    props:{
      pts:{floor:13,ceil:26,lean:"NEUTRAL"},
      reb:{floor:8,ceil:14,lean:"OVER"},
      ast:{floor:2,ceil:5,lean:"NEUTRAL"},
      pra:{floor:28,ceil:42,lean:"OVER"},
    },
    usage:"22.7%",
    bettingAngles:[
      "Rebounds over is the primary play",
      "Double-double prop: strong play, hits 65%+ of games",
      "Fade pts vs elite rim protectors",
    ],
    note:"Reliable rebounder. Rebounds and double-double are the markets.",
  },

  "Zach LaVine": {
    team:"CHI", pos:"G", tier:"SOLID",
    pts:22.8, reb:4.7, ast:4.2,
    props:{
      pts:{floor:16,ceil:36,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:26,ceil:42,lean:"OVER"},
    },
    usage:"28.4%",
    bettingAngles:[
      "Points over when Chicago needs scoring",
      "3-pointers made: elite shooter, back when getting volume",
      "Fade in slow games where Chicago's offense stagnates",
    ],
    note:"Scorer first. Points and 3-pointers are the primary markets.",
  },

  "Draymond Green": {
    team:"GSW", pos:"F", tier:"ROLE",
    pts:9.0, reb:7.2, ast:6.8,
    props:{
      pts:{floor:6,ceil:16,lean:"NEUTRAL"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      ast:{floor:4,ceil:9,lean:"OVER"},
      pra:{floor:20,ceil:34,lean:"OVER"},
    },
    usage:"13.8%",
    bettingAngles:[
      "PRA over — contributes across all three categories despite low scoring",
      "Assists over in Golden State's system",
      "Fade pts — scoring is not his role",
    ],
    note:"Scoring props are fades. PRA and assists are the only reliable markets.",
  },

  "Jordan Poole": {
    team:"WAS", pos:"G", tier:"ROLE",
    pts:18.1, reb:2.8, ast:5.3,
    props:{
      pts:{floor:13,ceil:30,lean:"OVER as primary option"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:22,ceil:40,lean:"OVER"},
    },
    usage:"27.1%",
    bettingAngles:[
      "Points over — Washington gives him maximum usage",
      "3-pointers made: high volume from deep",
      "Back in high game totals — Washington games tend to be high-scoring",
    ],
    note:"Primary option on a weak team — usage is maximized.",
  },

  "Michael Porter Jr.": {
    team:"DEN", pos:"F", tier:"ROLE",
    pts:16.4, reb:6.8, ast:1.6,
    props:{
      pts:{floor:11,ceil:28,lean:"NEUTRAL"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      threes:{floor:1,ceil:5,lean:"OVER"},
      pra:{floor:22,ceil:38,lean:"NEUTRAL"},
    },
    usage:"20.4%",
    bettingAngles:[
      "3-pointers made: elite shooter off Jokic gravity",
      "Rebounds over in games where Jokic is playing high usage",
      "Health check required — significant injury history",
    ],
    note:"Injury-prone. 3-pointers made is the prop angle.",
  },

  "Kristaps Porzingis": {
    team:"BOS", pos:"C", tier:"ROLE",
    pts:17.9, reb:6.8, ast:1.8,
    props:{
      pts:{floor:12,ceil:28,lean:"OVER when healthy"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      blk:{floor:1,ceil:3,lean:"OVER"},
      threes:{floor:1,ceil:4,lean:"OVER"},
    },
    usage:"23.4%",
    bettingAngles:[
      "Health check required — significant injury history",
      "Points over when healthy — elite stretch big",
      "Fade on any minutes restriction signal",
    ],
    note:"Health is the overriding variable. Never bet without confirming full health.",
  },

  "Andrew Wiggins": {
    team:"GSW", pos:"F", tier:"ROLE",
    pts:15.8, reb:4.4, ast:2.1,
    props:{
      pts:{floor:11,ceil:24,lean:"NEUTRAL"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      threes:{floor:1,ceil:4,lean:"NEUTRAL"},
      pra:{floor:18,ceil:32,lean:"NEUTRAL"},
    },
    usage:"20.2%",
    bettingAngles:[
      "Back pts when Curry has heavy usage night — opens kick-out threes",
      "Fade in games where Curry is cold",
      "PRA UNDER often value",
    ],
    note:"Role player. Only clear matchup or Curry correlation plays.",
  },

};
