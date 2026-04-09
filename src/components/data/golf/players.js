// ── PGA Tour Player Database ──────────────────────────────────────────────────
// Schema: sg = strokes gained (2024 season avg vs field, per round)
// recentForm: last 6 events, most recent first
// bestMarkets: which prop types are highest value for this player
// tier 1 = deep coverage, tier 2 = solid coverage + comp redirect

export const PGA_PLAYERS = {

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — TOP 45 (deep coverage, every market supported)
  // ═══════════════════════════════════════════════════════════════

  "Scottie Scheffler": {
    rank:1, country:"USA", age:27, tier:1,
    sg:{ total:3.12, ott:0.94, app:1.21, arg:0.48, putt:0.49 },
    driving:{ dist:303.2, acc:58.3 },
    cutMaking:"97%", top10Rate:"52%", top20Rate:"68%", winRate:"18%",
    courseFit:{ parkland:"ELITE", links:"STRONG", desert:"STRONG", bermuda:"STRONG", poa:"ELITE", bentgrass:"ELITE" },
    recentForm:["WIN","T4","WIN","T2","WIN","T3"],
    bestMarkets:["outright","top_5","top_10","frl"],
    note:"Best player in the world. Buy in any field — SG Total 3.12 is historically elite. 18% win rate means outright at anything under +500 is value. Top 10 at -120 or better is a lock play. FRL viable — leads more rounds than anyone. Fade only on minor events or heavy schedule fatigue.",
    comps:["Rory McIlroy","Jon Rahm","Viktor Hovland"],
  },

  "Rory McIlroy": {
    rank:2, country:"NIR", age:35, tier:1,
    sg:{ total:2.41, ott:1.18, app:0.87, arg:0.12, putt:0.24 },
    driving:{ dist:320.1, acc:55.1 },
    cutMaking:"89%", top10Rate:"44%", top20Rate:"61%", winRate:"12%",
    courseFit:{ parkland:"ELITE", links:"ELITE", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["WIN","T8","T3","T15","T5","WIN"],
    bestMarkets:["outright","top_5","top_10","frl","matchup"],
    note:"Elite driver of the ball — SG OTT 1.18 leads the field most weeks. Putting is the lever: when he's rolling it, bet the outright. When putting stats look flat, step down to top 10. Augusta specialist — Masters outright always has value. Links events (The Open) are his home. Best H2H matchup play in the field most weeks.",
    comps:["Scottie Scheffler","Jon Rahm","Viktor Hovland"],
  },

  "Xander Schauffele": {
    rank:3, country:"USA", age:30, tier:1,
    sg:{ total:2.18, ott:0.71, app:0.89, arg:0.31, putt:0.27 },
    driving:{ dist:298.4, acc:62.1 },
    cutMaking:"92%", top10Rate:"46%", top20Rate:"64%", winRate:"10%",
    courseFit:{ parkland:"ELITE", links:"STRONG", desert:"STRONG", bermuda:"ELITE", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["WIN","T2","T6","T3","WIN","T11"],
    bestMarkets:["outright","top_5","top_10","make_cut"],
    note:"Two major champion (2024 PGA + The Open). Elite iron player and putter — SG App + SG Putt combo is top 3 on tour. One of the cleanest top 10 plays in the field every week. Major championship pedigree makes him value in any major. FRL less consistent — target outright and top 5.",
    comps:["Collin Morikawa","Patrick Cantlay","Wyndham Clark"],
  },

  "Jon Rahm": {
    rank:4, country:"ESP", age:30, tier:1,
    sg:{ total:2.05, ott:0.68, app:0.91, arg:0.22, putt:0.24 },
    driving:{ dist:305.8, acc:59.2 },
    cutMaking:"88%", top10Rate:"41%", top20Rate:"58%", winRate:"11%",
    courseFit:{ parkland:"ELITE", links:"ELITE", desert:"STRONG", bermuda:"STRONG", poa:"ELITE", bentgrass:"STRONG" },
    recentForm:["T4","WIN","T2","T8","T20","T3"],
    bestMarkets:["outright","top_5","top_10","matchup"],
    note:"Masters champion, US Open champion. Elite in every SG category — most complete player not named Scheffler. LIV schedule means fewer PGA Tour starts in 2024 — verify he's in the field. Bermuda greens suit his aggressive putting. Best value when the field has significant weak spots.",
    comps:["Scottie Scheffler","Rory McIlroy","Tyrrell Hatton"],
  },

  "Collin Morikawa": {
    rank:5, country:"USA", age:27, tier:1,
    sg:{ total:1.89, ott:0.42, app:1.08, arg:0.18, putt:0.21 },
    driving:{ dist:289.3, acc:67.4 },
    cutMaking:"90%", top10Rate:"38%", top20Rate:"57%", winRate:"8%",
    courseFit:{ parkland:"ELITE", links:"ELITE", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T3","T7","T2","WIN","T5","T14"],
    bestMarkets:["top_5","top_10","top_20","matchup"],
    note:"Best iron player on tour — SG Approach 1.08 is elite. Two-time major winner (The Open, PGA). Puts himself in contention every week with his irons. Not a long hitter — fades at courses where OTT is decisive. Best value in smaller field events with premium iron courses. Consistent top-10 machine.",
    comps:["Xander Schauffele","Patrick Cantlay","Sam Burns"],
  },

  "Viktor Hovland": {
    rank:6, country:"NOR", age:26, tier:1,
    sg:{ total:1.78, ott:0.82, app:0.71, arg:0.09, putt:0.16 },
    driving:{ dist:304.7, acc:57.8 },
    cutMaking:"84%", top10Rate:"35%", top20Rate:"52%", winRate:"9%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T12","T4","WIN","T8","T3","T22"],
    bestMarkets:["outright","top_10","top_20","matchup"],
    note:"World Golf Championships winner, The Open contender. Elite around links-style tracks. ARG and putting are the weaknesses — when both are clicking, bet the outright. Fades at Bermuda greens courses. Best value at elevated events where he's locked in. Top 20 is the consistent market if not playing his best.",
    comps:["Rory McIlroy","Tommy Fleetwood","Patrick Cantlay"],
  },

  "Patrick Cantlay": {
    rank:7, country:"USA", age:32, tier:1,
    sg:{ total:1.72, ott:0.44, app:0.79, arg:0.28, putt:0.21 },
    driving:{ dist:292.1, acc:63.8 },
    cutMaking:"91%", top10Rate:"37%", top20Rate:"55%", winRate:"7%",
    courseFit:{ parkland:"ELITE", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"ELITE", bentgrass:"STRONG" },
    recentForm:["T6","T3","T18","T2","T9","T5"],
    bestMarkets:["top_5","top_10","top_20","make_cut","matchup"],
    note:"One of the most consistent players in the field every week. Elite poa greens putter — best at west coast events (Pebble Beach, Riviera, Torrey Pines). Fades at links and weak on Bermuda greens. Near-perfect cut-making profile (91%). Best value: top 10 weekly, or make-cut play when odds stretch to -115 or worse.",
    comps:["Xander Schauffele","Wyndham Clark","Sam Burns"],
  },

  "Wyndham Clark": {
    rank:8, country:"USA", age:30, tier:1,
    sg:{ total:1.64, ott:0.89, app:0.61, arg:0.08, putt:0.06 },
    driving:{ dist:310.4, acc:54.2 },
    cutMaking:"78%", top10Rate:"28%", top20Rate:"44%", winRate:"8%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T4","WIN","T22","T8","T30","T5"],
    bestMarkets:["outright","top_10","frl"],
    note:"US Open champion — proven major winner. Boomer off the tee (310+ avg). Volatile — boom or bust profile. High ceiling, inconsistent floor. Not a reliable top 10 every week. Best bet is outright or FRL at elevated events when he's locked in. Fade for make-cut props — 78% is too low for a reliable fade/lay.",
    comps:["Keegan Bradley","Russell Henley","Cameron Young"],
  },

  "Tony Finau": {
    rank:9, country:"USA", age:34, tier:1,
    sg:{ total:1.58, ott:0.78, app:0.61, arg:0.12, putt:0.07 },
    driving:{ dist:309.8, acc:56.4 },
    cutMaking:"84%", top10Rate:"30%", top20Rate:"48%", winRate:"5%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T11","T5","T4","T18","WIN","T6"],
    bestMarkets:["top_10","top_20","make_cut"],
    note:"Incredibly consistent top-10 threat every week. SG numbers underrate how often he contends. Elite in desert and parkland. 30% top-10 rate is among the highest for his tier. Best markets: top 10 weekly, top 20 as a safer play, make cut at weak fields. Not a reliable outright unless he's shown recent win momentum.",
    comps:["Russell Henley","Sungjae Im","Adam Scott"],
  },

  "Russell Henley": {
    rank:10, country:"USA", age:35, tier:1,
    sg:{ total:1.54, ott:0.41, app:0.82, arg:0.18, putt:0.13 },
    driving:{ dist:287.4, acc:64.2 },
    cutMaking:"87%", top10Rate:"33%", top20Rate:"51%", winRate:"5%",
    courseFit:{ parkland:"ELITE", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T3","T7","T2","T11","T4","T19"],
    bestMarkets:["top_5","top_10","top_20","make_cut"],
    note:"Sneaky elite approach play — SG App 0.82 is top 15 on tour. Consistent top 10 machine who gets overlooked at inflated odds. Best value when he's priced as a top-20 but his SG form suggests top 10. Bermuda and poa putter. Shorter hitter — fades when OTT is decisive. Cut-making at 87% is a reliable make-cut bet.",
    comps:["Collin Morikawa","Patrick Cantlay","Sam Burns"],
  },

  "Sam Burns": {
    rank:11, country:"USA", age:27, tier:1,
    sg:{ total:1.51, ott:0.62, app:0.68, arg:0.11, putt:0.10 },
    driving:{ dist:298.8, acc:60.1 },
    cutMaking:"85%", top10Rate:"29%", top20Rate:"47%", winRate:"6%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T8","WIN","T3","T12","T6","T24"],
    bestMarkets:["outright","top_10","top_20","make_cut"],
    note:"Multiple tour wins, Ryder Cup player. Balanced SG profile — no glaring weakness. Most consistent when fully committed for a week. Top 10 weekly is the best market. Can win at elevated events when in form. Make cut at 85% is reliable enough for a bet.",
    comps:["Russell Henley","Sungjae Im","Taylor Moore"],
  },

  "Sungjae Im": {
    rank:12, country:"KOR", age:26, tier:1,
    sg:{ total:1.48, ott:0.44, app:0.72, arg:0.18, putt:0.14 },
    driving:{ dist:291.2, acc:65.4 },
    cutMaking:"90%", top10Rate:"31%", top20Rate:"50%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T4","T9","T2","T6","T15","T7"],
    bestMarkets:["top_10","top_20","make_cut"],
    note:"One of the best cut-making machines on tour (90%). Elite iron player, consistent SG App. No power off the tee — fades at OTT-heavy courses. Top 10 every week is the play — he rarely flames out. Make cut at 90% makes this the most reliable fade market in the field. Best at courses where accuracy beats distance.",
    comps:["Patrick Cantlay","Russell Henley","Tom Kim"],
  },

  "Tommy Fleetwood": {
    rank:13, country:"ENG", age:33, tier:1,
    sg:{ total:1.45, ott:0.48, app:0.72, arg:0.14, putt:0.11 },
    driving:{ dist:293.4, acc:61.8 },
    cutMaking:"86%", top10Rate:"30%", top20Rate:"49%", winRate:"5%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T5","T3","T11","T4","T2","WIN"],
    bestMarkets:["top_10","top_20","matchup"],
    note:"Links specialist — elite at The Open and Ryder Cup courses. Poa/bentgrass putter, fades on Bermuda. Consistent top 10 threat at European-style tracks. Best value: top 10 at links or parkland events. H2H matchups are strong — his consistency is underpriced against boom-bust opponents. Fade at desert events.",
    comps:["Viktor Hovland","Tyrrell Hatton","Shane Lowry"],
  },

  "Cameron Smith": {
    rank:14, country:"AUS", age:30, tier:1,
    sg:{ total:1.42, ott:0.38, app:0.61, arg:0.38, putt:0.45 },
    driving:{ dist:286.2, acc:64.1 },
    cutMaking:"85%", top10Rate:"34%", top20Rate:"52%", winRate:"8%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["WIN","T4","T3","T7","T18","T2"],
    bestMarkets:["outright","top_5","top_10","matchup"],
    note:"Best putter on tour when on his game — SG Putt 0.45 is elite. Open champion. LIV player — verify he's in the field. When he's putting, bet the outright. Short hitter but short-game specialist. Top 5 at links and parkland events is a strong market. Fade at desert courses where power matters.",
    comps:["Shane Lowry","Tommy Fleetwood","Tyrrell Hatton"],
  },

  "Tyrrell Hatton": {
    rank:15, country:"ENG", age:32, tier:1,
    sg:{ total:1.38, ott:0.44, app:0.69, arg:0.14, putt:0.11 },
    driving:{ dist:291.8, acc:62.4 },
    cutMaking:"82%", top10Rate:"28%", top20Rate:"45%", winRate:"5%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T6","T3","WIN","T12","T4","T9"],
    bestMarkets:["top_10","top_20","matchup"],
    note:"LIV player — verify field inclusion. Elite links form — top 5 at The Open type. Inconsistent temperament but dangerous when clicking. Best in smaller, elevated fields. H2H matchups are value when his opponent is a boom-bust power player. Fade at weak fields where he mentally checks out.",
    comps:["Tommy Fleetwood","Cameron Smith","Shane Lowry"],
  },

  "Shane Lowry": {
    rank:16, country:"IRE", age:37, tier:1,
    sg:{ total:1.31, ott:0.28, app:0.61, arg:0.22, putt:0.20 },
    driving:{ dist:284.3, acc:63.2 },
    cutMaking:"84%", top10Rate:"25%", top20Rate:"43%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T4","T8","T2","T22","T11","T5"],
    bestMarkets:["top_10","top_20","matchup"],
    note:"The Open champion — elite links specialist. SG numbers underrate his major form. Fades badly at desert and warm-weather courses. Best markets are top 10 at links/parkland and matchup props against power hitters. Major championship venue is always worth targeting. Skip non-major events unless form is obvious.",
    comps:["Tommy Fleetwood","Tyrrell Hatton","Justin Rose"],
  },

  "Hideki Matsuyama": {
    rank:17, country:"JPN", age:32, tier:1,
    sg:{ total:1.29, ott:0.51, app:0.64, arg:0.08, putt:0.06 },
    driving:{ dist:296.4, acc:59.7 },
    cutMaking:"81%", top10Rate:"24%", top20Rate:"40%", winRate:"5%",
    courseFit:{ parkland:"ELITE", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T2","WIN","T8","T5","T14","T3"],
    bestMarkets:["outright","top_10","top_20","matchup"],
    note:"Masters champion — Augusta specialist. Best results at parkland and precision iron courses. When SG approach is peaking, bet the outright. Putting is the liability — boom or bust on the greens. Best value at Augusta and parkland tour stops. Top 10 weekly is reliable when approach stats are strong.",
    comps:["Tony Finau","Tom Kim","Keegan Bradley"],
  },

  "Justin Thomas": {
    rank:18, country:"USA", age:31, tier:1,
    sg:{ total:1.26, ott:0.58, app:0.52, arg:0.08, putt:0.08 },
    driving:{ dist:299.4, acc:58.1 },
    cutMaking:"80%", top10Rate:"22%", top20Rate:"38%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T4","T18","T2","T31","T9","T6"],
    bestMarkets:["top_10","top_20","matchup"],
    note:"Two-time PGA champion. In form resurgence but SG numbers dipped from peak. When his iron play clicks, he's a top-5 threat. Volatile — top 10 is the right market, not outright. Best at elevated events where he elevates mentally. H2H matchups are value when opponent is a short hitter he can outpower.",
    comps:["Rickie Fowler","Tommy Fleetwood","Sam Burns"],
  },

  "Jordan Spieth": {
    rank:19, country:"USA", age:30, tier:1,
    sg:{ total:1.22, ott:0.08, app:0.52, arg:0.34, putt:0.28 },
    driving:{ dist:284.1, acc:60.4 },
    cutMaking:"82%", top10Rate:"23%", top20Rate:"40%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T5","T3","T18","T8","T2","T28"],
    bestMarkets:["top_10","top_20","matchup"],
    note:"Three-time major champion. SG OTT is the liability — one of the shortest on tour. Wins via short game and putting genius. Best at links and Augusta. Volatile — look for bounce-back signals after missed cuts. Top 10 at links events is the market. H2H against long hitters fades him. Matchup vs. iron players is value.",
    comps:["Shane Lowry","Tommy Fleetwood","Justin Rose"],
  },

  "Rickie Fowler": {
    rank:20, country:"USA", age:35, tier:1,
    sg:{ total:1.18, ott:0.48, app:0.51, arg:0.10, putt:0.09 },
    driving:{ dist:294.8, acc:60.8 },
    cutMaking:"79%", top10Rate:"21%", top20Rate:"37%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T8","T20","T3","T44","WIN","T15"],
    bestMarkets:["top_10","top_20","matchup"],
    note:"US Open contender 2023 (Torrey Pines). Win rate slightly inflated by peak form — fades in lower ceiling periods. Best at west coast events (Poa greens) and desert tracks. Top 10 is the market at these venues. Inconsistent enough to fade for make-cut props. Best value: matchup H2H where he's underdogs at home courses.",
    comps:["Justin Thomas","Cameron Young","Tom Kim"],
  },

  "Keegan Bradley": {
    rank:21, country:"USA", age:37, tier:1,
    sg:{ total:1.14, ott:0.62, app:0.42, arg:0.04, putt:0.06 },
    driving:{ dist:298.2, acc:57.8 },
    cutMaking:"83%", top10Rate:"20%", top20Rate:"38%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T6","T11","T4","T24","T8","T33"],
    bestMarkets:["top_20","make_cut","matchup"],
    note:"Ryder Cup captain 2025. Consistency play — 83% cut-making is reliable. Not a top-5 threat most weeks but rarely misses. Best market is top 20 and make-cut at good odds. SG driver is the asset; approach is the limiter. Value when opponents in H2H are boom-bust players.",
    comps:["Tony Finau","Wyndham Clark","Sepp Straka"],
  },

  "Adam Scott": {
    rank:22, country:"AUS", age:44, tier:1,
    sg:{ total:1.11, ott:0.54, app:0.44, arg:0.08, putt:0.05 },
    driving:{ dist:291.4, acc:62.1 },
    cutMaking:"82%", top10Rate:"19%", top20Rate:"35%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T7","T12","T3","T19","T6","T28"],
    bestMarkets:["top_20","make_cut","matchup"],
    note:"Masters champion. Still competes at high level at 44. Extremely consistent — 82% cut-making. Best value at Augusta and parkland where his long-game mastery still plays. Top 20 weekly with make-cut hedge is the right market. Not a top-5 threat unless in rare peak form.",
    comps:["Keegan Bradley","Justin Rose","Tony Finau"],
  },

  "Cameron Young": {
    rank:23, country:"USA", age:26, tier:1,
    sg:{ total:1.08, ott:0.94, app:0.28, arg:-0.04, putt:-0.10 },
    driving:{ dist:319.8, acc:52.4 },
    cutMaking:"76%", top10Rate:"18%", top20Rate:"34%", winRate:"2%",
    courseFit:{ parkland:"NEUTRAL", links:"STRONG", desert:"STRONG", bermuda:"NEUTRAL", poa:"NEUTRAL", bentgrass:"STRONG" },
    recentForm:["T14","T4","T18","T9","T28","T3"],
    bestMarkets:["top_10","top_20","frl"],
    note:"Longest hitter on tour — 319+ driving distance. Approach and short game lag badly. Elite at power courses (wide fairways, long holes). Volatile — boom or bust every week. FRL is his best market (can dominate a round with the driver). Cut-making 76% means fade for make-cut. Target when course rewards big hitting.",
    comps:["Wyndham Clark","Ludvig Aberg","Min Woo Lee"],
  },

  "Tom Kim": {
    rank:24, country:"KOR", age:22, tier:1,
    sg:{ total:1.06, ott:0.38, app:0.44, arg:0.14, putt:0.10 },
    driving:{ dist:291.8, acc:63.4 },
    cutMaking:"81%", top10Rate:"22%", top20Rate:"39%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T3","T6","WIN","T11","T4","T18"],
    bestMarkets:["outright","top_10","top_20","matchup"],
    note:"One of the best young players in the world. Already won multiple times on tour before 22. SG numbers are rising — future elite trajectory clear. Well-rounded game — no major liability. Top 10 weekly is the consistent market. Outright is value when field has no dominant Tier 1 player. Watch for Ryder Cup elevation.",
    comps:["Sungjae Im","Collin Morikawa","Min Woo Lee"],
  },

  "Ludvig Aberg": {
    rank:25, country:"SWE", age:24, tier:1,
    sg:{ total:1.84, ott:0.98, app:0.68, arg:0.10, putt:0.08 },
    driving:{ dist:314.8, acc:58.9 },
    cutMaking:"85%", top10Rate:"38%", top20Rate:"56%", winRate:"6%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T2","T4","T3","WIN","T8","T2"],
    bestMarkets:["outright","top_5","top_10","matchup"],
    note:"Fastest-rising player in the world — 24 years old with SG Total approaching Scheffler territory. Runner-up at 2024 Masters in his first start there. Elite driver + elite approach. Putting is only minor liability. Top 5 weekly is now the base case. Outright at anything over +800 starts to have value in most fields.",
    comps:["Viktor Hovland","Rory McIlroy","Cameron Young"],
  },

  "Robert MacIntyre": {
    rank:26, country:"SCO", age:27, tier:1,
    sg:{ total:1.62, ott:0.71, app:0.61, arg:0.18, putt:0.12 },
    driving:{ dist:302.4, acc:60.8 },
    cutMaking:"82%", top10Rate:"28%", top20Rate:"46%", winRate:"5%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["WIN","T4","T8","T3","T15","T6"],
    bestMarkets:["outright","top_10","top_20","matchup"],
    note:"Won on PGA Tour in 2024. Born links player — elite at The Open and Scottish/Irish events. Bermuda greens are the weakness. Best value at overseas/links-style events or when field is moderate. Top 10 is the reliable market. H2H matchups on home tracks (links) are a strong play.",
    comps:["Tommy Fleetwood","Shane Lowry","Tyrrell Hatton"],
  },

  "Sahith Theegala": {
    rank:27, country:"USA", age:26, tier:1,
    sg:{ total:1.58, ott:0.72, app:0.62, arg:0.14, putt:0.10 },
    driving:{ dist:306.1, acc:57.2 },
    cutMaking:"80%", top10Rate:"26%", top20Rate:"43%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T4","T11","T3","WIN","T8","T19"],
    bestMarkets:["outright","top_10","top_20","frl"],
    note:"Exciting young player with multiple wins. Power off the tee + decent irons. Top 10 is consistent when he's mentally engaged. FRL is a viable market — can go low early in rounds. Volatile closer — fade for top 5 outright unless form is obvious. Best in non-major elevated events with moderate fields.",
    comps:["Cameron Young","Wyndham Clark","Nick Taylor"],
  },

  "Nick Taylor": {
    rank:28, country:"CAN", age:35, tier:1,
    sg:{ total:1.44, ott:0.48, app:0.64, arg:0.16, putt:0.16 },
    driving:{ dist:290.2, acc:63.4 },
    cutMaking:"82%", top10Rate:"24%", top20Rate:"41%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T6","T2","WIN","T8","T14","T4"],
    bestMarkets:["top_10","top_20","make_cut","matchup"],
    note:"Canadian Open specialist — won it in dramatic fashion. Consistent iron player who rewards longer looks. Top 10 is the market weekly. Make cut at 82% is reliable. Best value when he's under the radar in a strong field — books undervalue his consistency.",
    comps:["Sam Burns","Russell Henley","Keegan Bradley"],
  },

  "Chris Kirk": {
    rank:29, country:"USA", age:38, tier:1,
    sg:{ total:1.38, ott:0.28, app:0.68, arg:0.24, putt:0.18 },
    driving:{ dist:283.8, acc:65.4 },
    cutMaking:"84%", top10Rate:"22%", top20Rate:"40%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T3","T8","WIN","T6","T12","T19"],
    bestMarkets:["top_10","top_20","make_cut"],
    note:"Short hitter but elite precision player. SG Approach and ARG are where he beats the field. One of the most reliable cut-making plays at 84%. Top 10 when course rewards accuracy over distance. Fade at power courses. Make cut is the highest-confidence market weekly.",
    comps:["Russell Henley","Sungjae Im","Sepp Straka"],
  },

  "Sepp Straka": {
    rank:30, country:"AUT", age:30, tier:1,
    sg:{ total:1.33, ott:0.42, app:0.64, arg:0.14, putt:0.13 },
    driving:{ dist:291.8, acc:61.4 },
    cutMaking:"83%", top10Rate:"23%", top20Rate:"41%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T9","T4","T11","T22","T3","T7"],
    bestMarkets:["top_10","top_20","make_cut","matchup"],
    note:"Quietly consistent top-20 machine. SG App and Putt combo is reliable. Best value when he's under the radar in weaker fields. Make cut at 83% is a target market. H2H matchups against boom-bust opponents are strong. No major victory but a consistent FedEx Cup points earner.",
    comps:["Chris Kirk","Sungjae Im","Sam Burns"],
  },

  "Eric Cole": {
    rank:31, country:"USA", age:33, tier:1,
    sg:{ total:1.29, ott:0.44, app:0.61, arg:0.14, putt:0.10 },
    driving:{ dist:290.8, acc:62.8 },
    cutMaking:"82%", top10Rate:"21%", top20Rate:"39%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T7","T14","T3","T8","T22","T5"],
    bestMarkets:["top_10","top_20","make_cut"],
    note:"Breakthrough PGA Tour player. Consistent SG profile with no major weakness. Best value as a top-20 play in weaker fields. Make cut reliably. Not yet proven at elite fields — fade for top 5 unless recent form is exceptional.",
    comps:["Sepp Straka","Keegan Bradley","Nick Taylor"],
  },

  "Min Woo Lee": {
    rank:32, country:"AUS", age:25, tier:1,
    sg:{ total:1.24, ott:0.74, app:0.38, arg:0.08, putt:0.04 },
    driving:{ dist:308.4, acc:55.8 },
    cutMaking:"77%", top10Rate:"20%", top20Rate:"36%", winRate:"3%",
    courseFit:{ parkland:"NEUTRAL", links:"STRONG", desert:"STRONG", bermuda:"NEUTRAL", poa:"NEUTRAL", bentgrass:"STRONG" },
    recentForm:["T3","T18","WIN","T5","T28","T8"],
    bestMarkets:["outright","top_10","frl","matchup"],
    note:"Exciting power player with growing SG numbers. Sister Hannah is also a tour pro. Links specialist — thrives at The Open. Approach and short game are work in progress. FRL is a viable market — can dominate rounds with the driver. Fade for make cut (77%). Best at power-friendly courses where OTT dominates.",
    comps:["Cameron Young","Ludvig Aberg","Sahith Theegala"],
  },

  "Brian Harman": {
    rank:33, country:"USA", age:37, tier:1,
    sg:{ total:1.22, ott:0.04, app:0.62, arg:0.28, putt:0.28 },
    driving:{ dist:278.4, acc:66.8 },
    cutMaking:"85%", top10Rate:"22%", top20Rate:"41%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"ELITE", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T4","T9","WIN","T3","T18","T11"],
    bestMarkets:["top_10","top_20","make_cut","matchup"],
    note:"The Open champion — elite links player. Shortest hitter on tour but compensates with elite short game and putting. SG Putt 0.28 is elite. Cut-making at 85% is extremely reliable. Make cut is the highest-confidence market. Top 10 at links events is strong. Fade at power courses — distance deficit too large.",
    comps:["Shane Lowry","Jordan Spieth","Chris Kirk"],
  },

  "Justin Rose": {
    rank:34, country:"ENG", age:43, tier:1,
    sg:{ total:1.18, ott:0.44, app:0.54, arg:0.12, putt:0.08 },
    driving:{ dist:290.8, acc:63.4 },
    cutMaking:"81%", top10Rate:"20%", top20Rate:"37%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T8","T3","T19","T6","T11","T25"],
    bestMarkets:["top_10","top_20","make_cut","matchup"],
    note:"Olympic gold medalist, US Open champion. Still competes well at 43 — SG numbers hold. Best at major championship venues. Top 20 is the reliable weekly market. Make cut at 81% is solid. H2H matchups against younger boom-bust players are value when he's healthy.",
    comps:["Adam Scott","Tommy Fleetwood","Shane Lowry"],
  },

  "Mackenzie Hughes": {
    rank:35, country:"CAN", age:33, tier:1,
    sg:{ total:1.04, ott:0.32, app:0.48, arg:0.14, putt:0.10 },
    driving:{ dist:286.8, acc:63.2 },
    cutMaking:"80%", top10Rate:"16%", top20Rate:"31%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T11","T6","T24","T8","T18","T3"],
    bestMarkets:["top_20","make_cut","matchup"],
    note:"Solid top-20 threat in weaker fields. Reliable cut-maker at 80%. Best value as a make-cut bet or top-20 play in non-elevated events. Not a top-5 threat at major fields. H2H matchups against similarly-ranked opponents are the best use.",
    comps:["Sepp Straka","Chris Kirk","Taylor Moore"],
  },

  "Denny McCarthy": {
    rank:36, country:"USA", age:31, tier:1,
    sg:{ total:1.02, ott:0.28, app:0.44, arg:0.14, putt:0.16 },
    driving:{ dist:283.4, acc:64.8 },
    cutMaking:"82%", top10Rate:"15%", top20Rate:"30%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T9","T22","T5","T16","WIN","T11"],
    bestMarkets:["top_20","make_cut","matchup"],
    note:"Streaky player — can WIN or miss cut. Best value in smaller fields where his putting heats up. Putting is his calling card — SG Putt 0.16 reliable. Cut-making at 82% is the market. Top 20 in weak fields. Fade at major fields — ceiling is limited.",
    comps:["Brian Harman","Mackenzie Hughes","Taylor Moore"],
  },

  "Kurt Kitayama": {
    rank:37, country:"USA", age:31, tier:1,
    sg:{ total:1.01, ott:0.48, app:0.38, arg:0.08, putt:0.07 },
    driving:{ dist:294.8, acc:60.1 },
    cutMaking:"79%", top10Rate:"16%", top20Rate:"32%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"NEUTRAL", bentgrass:"STRONG" },
    recentForm:["T4","T18","T8","WIN","T22","T11"],
    bestMarkets:["top_20","matchup"],
    note:"Won at Bay Hill. Driver + approach are solid but short game limits the ceiling. Best in moderate fields. H2H matchup is the value market. Not reliable enough for consistent top 10 bets.",
    comps:["Cameron Young","Sahith Theegala","Taylor Moore"],
  },

  "Taylor Moore": {
    rank:38, country:"USA", age:29, tier:1,
    sg:{ total:0.98, ott:0.28, app:0.44, arg:0.16, putt:0.10 },
    driving:{ dist:286.4, acc:63.8 },
    cutMaking:"80%", top10Rate:"14%", top20Rate:"29%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T16","T8","T3","T24","T11","WIN"],
    bestMarkets:["top_20","make_cut"],
    note:"Reliable consistent player with no major SG weakness but no elite ceiling either. Make cut 80% is a good market. Top 20 in weak fields. Not a top-10 bet in strong fields.",
    comps:["Denny McCarthy","Mackenzie Hughes","Sepp Straka"],
  },

  "Harris English": {
    rank:39, country:"USA", age:34, tier:1,
    sg:{ total:0.96, ott:0.44, app:0.38, arg:0.08, putt:0.06 },
    driving:{ dist:295.8, acc:60.4 },
    cutMaking:"78%", top10Rate:"14%", top20Rate:"28%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"NEUTRAL", bentgrass:"STRONG" },
    recentForm:["T12","T6","T28","T9","T18","T4"],
    bestMarkets:["top_20","matchup"],
    note:"Talented but injury-limited. When healthy, top 20 is realistic. Best in moderate fields. Matchup H2H against players with similar profiles is the value market. Fade when on any injury report.",
    comps:["Kurt Kitayama","Tony Finau","Keegan Bradley"],
  },

  "Matt Fitzpatrick": {
    rank:40, country:"ENG", age:29, tier:1,
    sg:{ total:1.44, ott:0.38, app:0.72, arg:0.22, putt:0.12 },
    driving:{ dist:289.8, acc:65.1 },
    cutMaking:"87%", top10Rate:"30%", top20Rate:"48%", winRate:"5%",
    courseFit:{ parkland:"ELITE", links:"STRONG", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" },
    recentForm:["T4","T2","T9","T11","T3","WIN"],
    bestMarkets:["top_5","top_10","top_20","make_cut","matchup"],
    note:"US Open champion — elite precision player. One of the best iron players on tour (SG App 0.72). Shorter but compensates with incredible accuracy. Cut-making 87% is one of the best on tour. Top 10 weekly is the consistent market. Parkland and bentgrass specialist. Best value when field has power bias and books undervalue precision.",
    comps:["Collin Morikawa","Russell Henley","Sungjae Im"],
  },

  "Nicolai Hojgaard": {
    rank:41, country:"DEN", age:23, tier:1,
    sg:{ total:1.38, ott:0.58, app:0.62, arg:0.12, putt:0.06 },
    driving:{ dist:301.4, acc:59.8 },
    cutMaking:"81%", top10Rate:"24%", top20Rate:"41%", winRate:"4%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["WIN","T4","T8","T18","T3","T11"],
    bestMarkets:["outright","top_10","top_20","matchup"],
    note:"Ryder Cup hero 2023 — won the point that clinched it. Strong young player with growing SG. Better in European-style events. Top 10 is the market. Outright value in non-major elevated fields.",
    comps:["Robert MacIntyre","Tommy Fleetwood","Tom Kim"],
  },

  "Rasmus Hojgaard": {
    rank:42, country:"DEN", age:23, tier:1,
    sg:{ total:1.32, ott:0.54, app:0.58, arg:0.14, putt:0.06 },
    driving:{ dist:299.8, acc:60.4 },
    cutMaking:"80%", top10Rate:"22%", top20Rate:"39%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"STRONG", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T6","WIN","T3","T14","T8","T22"],
    bestMarkets:["outright","top_10","top_20","matchup"],
    note:"Twin brother of Nicolai. Both are elite young European talents. Similar profile — links strength, parkland solid, Bermuda neutral. Top 10 is the consistent market. Outright value in smaller elevated fields. H2H matchup vs brother is always interesting (and usually offered).",
    comps:["Nicolai Hojgaard","Robert MacIntyre","Tommy Fleetwood"],
  },

  "Corey Conners": {
    rank:43, country:"CAN", age:32, tier:1,
    sg:{ total:1.28, ott:0.42, app:0.72, arg:0.08, putt:0.06 },
    driving:{ dist:293.4, acc:62.8 },
    cutMaking:"84%", top10Rate:"22%", top20Rate:"39%", winRate:"3%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T8","T3","T11","T6","T18","T4"],
    bestMarkets:["top_10","top_20","make_cut","matchup"],
    note:"One of the most accurate players in the world — GIR leader. SG Approach is elite (0.72). Putting is the limiter. Best value: top 10 when course rewards accuracy. Make cut at 84% is reliable. H2H matchups against longer but less accurate hitters are strong.",
    comps:["Matt Fitzpatrick","Russell Henley","Sungjae Im"],
  },

  "Emiliano Grillo": {
    rank:44, country:"ARG", age:31, tier:1,
    sg:{ total:1.22, ott:0.48, app:0.54, arg:0.12, putt:0.08 },
    driving:{ dist:293.8, acc:61.4 },
    cutMaking:"82%", top10Rate:"20%", top20Rate:"37%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T5","T12","T3","T19","T8","WIN"],
    bestMarkets:["top_20","make_cut","matchup"],
    note:"Consistent player who makes cuts and sneaks into top 20. Not a weekly top-10 contender but reliable for 20th-or-better in moderate fields. Make cut 82% is a reliable market. H2H matchups are solid against similar-tier players.",
    comps:["Sepp Straka","Denny McCarthy","Nick Taylor"],
  },

  "Max Greyserman": {
    rank:45, country:"USA", age:29, tier:1,
    sg:{ total:1.18, ott:0.48, app:0.52, arg:0.10, putt:0.08 },
    driving:{ dist:296.8, acc:59.8 },
    cutMaking:"79%", top10Rate:"19%", top20Rate:"35%", winRate:"2%",
    courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" },
    recentForm:["T8","T4","T18","T11","T3","T24"],
    bestMarkets:["top_20","matchup"],
    note:"Rising star — improving SG numbers weekly. Best in moderate fields. Not yet consistent at elevated events. Top 20 and H2H matchup are the markets to target.",
    comps:["Eric Cole","Taylor Moore","Sahith Theegala"],
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — NEXT 30 (solid coverage + comp-based redirects)
  // ═══════════════════════════════════════════════════════════════

  "Dustin Johnson":     { rank:46, country:"USA", age:39, tier:2, sg:{ total:1.44, ott:1.12, app:0.48, arg:0.02, putt:-0.18 }, driving:{ dist:308.4, acc:56.8 }, cutMaking:"82%", top10Rate:"24%", top20Rate:"41%", winRate:"4%", recentForm:["T8","T4","T3","T18","WIN","T11"], bestMarkets:["outright","top_10","frl"], note:"LIV player — verify field. Elite power game, wildly inconsistent putter. Boom or bust. Top 10 when putting heats up. FRL is his best market — can dominate with driver.", comps:["Wyndham Clark","Cameron Young","Brooks Koepka"] },

  "Brooks Koepka":      { rank:47, country:"USA", age:33, tier:2, sg:{ total:1.58, ott:0.84, app:0.62, arg:0.08, putt:0.04 }, driving:{ dist:307.8, acc:56.2 }, cutMaking:"79%", top10Rate:"22%", top20Rate:"36%", winRate:"5%", recentForm:["WIN","T3","T18","T4","T28","T8"], bestMarkets:["outright","top_5","top_10"], note:"Four-time major champion. LIV player — verify field. Major championship mode is real — he elevates for the biggest stages. Fade at regular-season events. Bet outright only at majors. Putting and ARG inconsistency is the limiter.", comps:["Dustin Johnson","Tyrrell Hatton","Jon Rahm"] },

  "Bryson DeChambeau": { rank:48, country:"USA", age:30, tier:2, sg:{ total:1.62, ott:1.44, app:0.48, arg:0.08, putt:-0.38 }, driving:{ dist:338.4, acc:48.4 }, cutMaking:"75%", top10Rate:"20%", top20Rate:"34%", winRate:"5%", recentForm:["WIN","T4","T18","T8","T30","WIN"], bestMarkets:["outright","frl","top_10"], note:"LIV player — verify field. Longest hitter in history when locked in. Wildly volatile — win or miss cut profile. Putting is catastrophically bad. Outright only bet at power courses where length is decisive. FRL is viable when he's dialing in. Never bet make-cut.", comps:["Cameron Young","Wyndham Clark","Dustin Johnson"] },

  "Phil Mickelson":     { rank:49, country:"USA", age:53, tier:2, sg:{ total:0.24, ott:0.18, app:0.12, arg:0.10, putt:-0.16 }, driving:{ dist:282.4, acc:58.4 }, cutMaking:"65%", top10Rate:"4%", top20Rate:"12%", winRate:"0%", recentForm:["MC","T28","T44","MC","T31","MC"], bestMarkets:["matchup","make_cut"], note:"LIV player — playing for glory not ranking. Best used as FADE. Top 10 prop is a fade at current form levels. Matchup value when opponent is similarly faded. Historical greatness is irrelevant to current betting.", comps:["Dustin Johnson","Brooks Koepka","Bubba Watson"] },

  "Tony Romo":          { rank:50, country:"USA", age:44, tier:2, sg:{ total:-1.2, ott:-0.8, app:-0.9, arg:-0.4, putt:-0.3 }, driving:{ dist:271.4, acc:52.4 }, cutMaking:"30%", top10Rate:"0%", top20Rate:"0%", winRate:"0%", recentForm:["MC","MC","MC","T52","MC","MC"], bestMarkets:[], note:"Celebrity golfer — not a competitive PGA Tour player. If asked about a Tony Romo prop, redirect immediately to his professional comps in the same market.", comps:["Harris English","Keegan Bradley","Wyndham Clark"] },

  "Akshay Bhatia":      { rank:51, country:"USA", age:22, tier:2, sg:{ total:1.62, ott:0.78, app:0.68, arg:0.08, putt:0.08 }, driving:{ dist:308.8, acc:56.2 }, cutMaking:"78%", top10Rate:"26%", top20Rate:"42%", winRate:"5%", recentForm:["WIN","T4","T3","T8","T18","T11"], bestMarkets:["outright","top_10","top_20"], note:"Exciting 22-year-old who already has PGA Tour wins. Rising SG — one of the fastest-rising young players. Power + approach combo is elite. Putting still developing. Outright value in non-major fields.", comps:["Ludvig Aberg","Tom Kim","Sahith Theegala"] },

  "Jake Knapp":         { rank:52, country:"USA", age:29, tier:2, sg:{ total:1.18, ott:0.74, app:0.38, arg:0.04, putt:0.02 }, driving:{ dist:312.8, acc:54.2 }, cutMaking:"74%", top10Rate:"16%", top20Rate:"29%", winRate:"3%", recentForm:["WIN","T14","T8","T22","T4","T31"], bestMarkets:["outright","top_10","frl"], note:"Power bomber who can go low on any given day. Win at Mexico Open proved it. Boom-bust profile. FRL is the best market — can torch a course with the driver in round 1. Fade for make-cut.", comps:["Cameron Young","Jake Knapp","Wyndham Clark"] },

  "Andrew Novak":       { rank:53, country:"USA", age:30, tier:2, sg:{ total:0.94, ott:0.38, app:0.42, arg:0.08, putt:0.06 }, driving:{ dist:287.4, acc:63.8 }, cutMaking:"78%", top10Rate:"14%", top20Rate:"28%", winRate:"2%", recentForm:["T8","T18","WIN","T11","T4","T24"], bestMarkets:["top_20","make_cut"], note:"Reliable journeyman. Make cut 78% with top-20 potential in weak fields. Not a top-10 bet at elevated events.", comps:["Taylor Moore","Denny McCarthy","Mackenzie Hughes"] },

  "Beau Hossler":       { rank:54, country:"USA", age:29, tier:2, sg:{ total:0.88, ott:0.32, app:0.38, arg:0.12, putt:0.06 }, driving:{ dist:285.4, acc:63.2 }, cutMaking:"79%", top10Rate:"13%", top20Rate:"27%", winRate:"1%", recentForm:["T14","T7","T19","T22","T8","T34"], bestMarkets:["top_20","make_cut"], note:"Consistent but ceiling-limited. Make cut and top 20 in weaker fields are the markets.", comps:["Eric Cole","Andrew Novak","Taylor Moore"] },

  "Mark Hubbard":       { rank:55, country:"USA", age:34, tier:2, sg:{ total:0.84, ott:0.28, app:0.38, arg:0.10, putt:0.08 }, driving:{ dist:282.8, acc:64.1 }, cutMaking:"79%", top10Rate:"11%", top20Rate:"24%", winRate:"1%", recentForm:["T9","T24","T11","T18","T34","T6"], bestMarkets:["top_20","make_cut"], note:"Reliable cut-maker in weak fields. Not a top-10 target at elevated events.", comps:["Beau Hossler","Taylor Moore","Andrew Novak"] },

  "Sungrae Noh":        { rank:56, country:"KOR", age:36, tier:2, sg:{ total:0.68, ott:0.18, app:0.28, arg:0.12, putt:0.10 }, driving:{ dist:280.4, acc:64.8 }, cutMaking:"76%", top10Rate:"10%", top20Rate:"22%", winRate:"1%", recentForm:["T18","T11","T28","T9","T22","T14"], bestMarkets:["make_cut","matchup"], note:"Fringy player — best for make-cut only bets in weak fields.", comps:["Beau Hossler","Mark Hubbard","Andrew Novak"] },

  "Michael Kim":        { rank:57, country:"USA", age:31, tier:2, sg:{ total:0.64, ott:0.22, app:0.28, arg:0.08, putt:0.06 }, driving:{ dist:283.8, acc:63.4 }, cutMaking:"74%", top10Rate:"8%", top20Rate:"19%", winRate:"0%", recentForm:["T22","MC","T14","T9","T28","T18"], bestMarkets:["make_cut","matchup"], note:"Journeyman — make-cut bet only in non-elevated events.", comps:["Beau Hossler","Sungrae Noh","Mark Hubbard"] },

  "Ben Griffin":        { rank:58, country:"USA", age:28, tier:2, sg:{ total:0.98, ott:0.38, app:0.42, arg:0.10, putt:0.08 }, driving:{ dist:289.8, acc:62.4 }, cutMaking:"80%", top10Rate:"16%", top20Rate:"30%", winRate:"1%", recentForm:["T4","T11","T24","WIN","T8","T19"], bestMarkets:["top_20","make_cut","matchup"], note:"Solid young player finding his footing on tour. Top 20 in moderate fields is the market.", comps:["Eric Cole","Taylor Moore","Max Greyserman"] },

  "Hayden Buckley":     { rank:59, country:"USA", age:30, tier:2, sg:{ total:0.78, ott:0.24, app:0.34, arg:0.12, putt:0.08 }, driving:{ dist:284.4, acc:62.8 }, cutMaking:"77%", top10Rate:"11%", top20Rate:"23%", winRate:"1%", recentForm:["T18","T9","T28","T11","T4","T32"], bestMarkets:["make_cut","matchup"], note:"Journeyman — make-cut or matchup only.", comps:["Ben Griffin","Andrew Novak","Beau Hossler"] },

  "Brendan Steele":     { rank:60, country:"USA", age:40, tier:2, sg:{ total:0.68, ott:0.22, app:0.28, arg:0.10, putt:0.08 }, driving:{ dist:283.2, acc:63.8 }, cutMaking:"74%", top10Rate:"8%", top20Rate:"18%", winRate:"0%", recentForm:["T24","MC","T18","T11","T28","T9"], bestMarkets:["make_cut"], note:"Veteran journeyman — make-cut only bet.", comps:["Mark Hubbard","Sungrae Noh","Michael Kim"] },

  // International stars
  "Romain Langasque":   { rank:61, country:"FRA", age:27, tier:2, sg:{ total:0.84, ott:0.38, app:0.34, arg:0.08, putt:0.04 }, driving:{ dist:291.2, acc:61.4 }, cutMaking:"76%", top10Rate:"12%", top20Rate:"26%", winRate:"2%", recentForm:["T11","T4","T18","T8","T24","T12"], bestMarkets:["top_20","matchup"], note:"European Tour regular. Best on European-style parkland.", comps:["Tommy Fleetwood","Nicolas Colsaerts","Nicolai Hojgaard"] },

  "Adrian Meronk":      { rank:62, country:"POL", age:30, tier:2, sg:{ total:0.92, ott:0.44, app:0.38, arg:0.04, putt:0.06 }, driving:{ dist:296.8, acc:59.8 }, cutMaking:"78%", top10Rate:"14%", top20Rate:"28%", winRate:"2%", recentForm:["T8","WIN","T14","T11","T22","T4"], bestMarkets:["top_20","matchup"], note:"Strong European player. Best at parkland and moderate-field events.", comps:["Sepp Straka","Corey Conners","Nicolai Hojgaard"] },

  "Victor Perez":       { rank:63, country:"FRA", age:30, tier:2, sg:{ total:0.88, ott:0.38, app:0.38, arg:0.08, putt:0.04 }, driving:{ dist:289.4, acc:62.4 }, cutMaking:"77%", top10Rate:"13%", top20Rate:"26%", winRate:"2%", recentForm:["T14","T8","T22","T4","T18","T11"], bestMarkets:["top_20","matchup"], note:"European Tour regular. Best in moderate European fields.", comps:["Adrian Meronk","Romain Langasque","Emiliano Grillo"] },

  "Bubba Watson":       { rank:64, country:"USA", age:45, tier:2, sg:{ total:0.44, ott:0.68, app:0.08, arg:-0.12, putt:-0.20 }, driving:{ dist:304.8, acc:52.8 }, cutMaking:"67%", top10Rate:"6%", top20Rate:"15%", winRate:"0%", recentForm:["MC","T28","MC","T34","T18","MC"], bestMarkets:["matchup"], note:"LIV player, fading career. Matchup fade only at current form. Two Masters titles are history.", comps:["Phil Mickelson","Dustin Johnson","Brooks Koepka"] },

  "Billy Horschel":     { rank:65, country:"USA", age:37, tier:2, sg:{ total:1.04, ott:0.32, app:0.48, arg:0.14, putt:0.10 }, driving:{ dist:285.4, acc:63.8 }, cutMaking:"82%", top10Rate:"18%", top20Rate:"34%", winRate:"2%", recentForm:["T6","T18","T4","T11","T28","T8"], bestMarkets:["top_20","make_cut","matchup"], note:"Reliable veteran. Make cut 82% is trustworthy. Best value as top-20 in weaker fields. European Tour success as well — value in Ryder Cup year.", comps:["Chris Kirk","Sepp Straka","Keegan Bradley"] },

  "Davis Riley":        { rank:66, country:"USA", age:27, tier:2, sg:{ total:0.94, ott:0.42, app:0.38, arg:0.08, putt:0.06 }, driving:{ dist:292.8, acc:61.4 }, cutMaking:"79%", top10Rate:"14%", top20Rate:"28%", winRate:"1%", recentForm:["T14","T8","T22","T11","T4","T28"], bestMarkets:["top_20","make_cut"], note:"Young player finding his level. Make cut and top 20 are the markets.", comps:["Ben Griffin","Eric Cole","Andrew Novak"] },

  "Nate Lashley":       { rank:67, country:"USA", age:41, tier:2, sg:{ total:0.74, ott:0.34, app:0.28, arg:0.06, putt:0.06 }, driving:{ dist:289.8, acc:61.8 }, cutMaking:"74%", top10Rate:"9%", top20Rate:"20%", winRate:"1%", recentForm:["T22","T11","T28","T8","MC","T18"], bestMarkets:["make_cut","matchup"], note:"Journeyman. Make-cut bet in weak fields only.", comps:["Brendan Steele","Michael Kim","Mark Hubbard"] },

  "Adam Hadwin":        { rank:68, country:"CAN", age:36, tier:2, sg:{ total:0.88, ott:0.28, app:0.38, arg:0.12, putt:0.10 }, driving:{ dist:284.8, acc:63.4 }, cutMaking:"80%", top10Rate:"13%", top20Rate:"26%", winRate:"1%", recentForm:["T9","T18","T4","T22","T11","T28"], bestMarkets:["top_20","make_cut","matchup"], note:"Reliable veteran Canadian. Make cut 80% is consistent. Best at courses where accuracy matters over distance.", comps:["Nick Taylor","Mackenzie Hughes","Chris Kirk"] },

  "Matti Schmid":       { rank:69, country:"GER", age:27, tier:2, sg:{ total:0.84, ott:0.44, app:0.32, arg:0.04, putt:0.04 }, driving:{ dist:296.4, acc:60.8 }, cutMaking:"76%", top10Rate:"11%", top20Rate:"24%", winRate:"1%", recentForm:["T11","T18","T4","T28","T8","T22"], bestMarkets:["top_20","matchup"], note:"Emerging German talent. Best in moderate fields. Top 20 is the market.", comps:["Adrian Meronk","Victor Perez","Ben Griffin"] },

  "Garrick Higgo":      { rank:70, country:"RSA", age:26, tier:2, sg:{ total:0.78, ott:0.48, app:0.24, arg:0.04, putt:0.02 }, driving:{ dist:299.8, acc:57.8 }, cutMaking:"72%", top10Rate:"10%", top20Rate:"21%", winRate:"2%", recentForm:["WIN","MC","T18","T8","T28","MC"], bestMarkets:["outright","matchup"], note:"Boom-bust South African. Has won on tour. Fade for make-cut (72%). Outright is viable in weak non-elevated fields when he's hot.", comps:["Jake Knapp","Sahith Theegala","Andrew Novak"] },

  // Major-relevant names bettors ask about
  "Tiger Woods":        { rank:999, country:"USA", age:48, tier:2, sg:{ total:0.0, ott:0.0, app:0.0, arg:0.0, putt:0.0 }, driving:{ dist:278.4, acc:57.4 }, cutMaking:"varies", top10Rate:"0%", top20Rate:"5%", winRate:"0%", recentForm:["WD","MC","WD","T47","MC","WD"], bestMarkets:[], note:"HEALTH STATUS UNKNOWN — do NOT make prop recommendations without confirming he is actually playing. Current form (2024-25) makes any bet except extreme longshot outright speculative. If he is confirmed in the field at Augusta, a small speculative outright play has historical-story value only.", comps:["Phil Mickelson","Rickie Fowler","Adam Scott"] },

  "Xander Schauffele (alt)": { rank:3, country:"USA", age:30, tier:1, sg:{ total:2.18, ott:0.71, app:0.89, arg:0.31, putt:0.27 }, driving:{ dist:298.4, acc:62.1 }, cutMaking:"92%", top10Rate:"46%", top20Rate:"64%", winRate:"10%", recentForm:["WIN","T2","T6","T3","WIN","T11"], bestMarkets:["outright","top_5","top_10","make_cut"], note:"See Xander Schauffele above.", comps:["Collin Morikawa","Patrick Cantlay","Wyndham Clark"] },
};

// ── Course database ───────────────────────────────────────────────────────────
export const PGA_COURSES = {
  "Augusta National": {
    location: "Augusta, GA", par:72, yards:7545,
    type: "parkland", grass: "bentgrass",
    key_traits: ["premium iron play", "approach shot precision", "putting on bentgrass", "mental fortitude", "long par 5s reward big hitters"],
    who_wins: "Elite iron players + elite putters. Power helps on par 5s. Best of the best.",
    sg_premium: "app", // which SG category is most predictive here
    note: "The Masters — field is the best in golf. Approach shots from 150-200 yards are decisive. Amen Corner (11-13) changes everything. Long par 5s (13, 15) favor bombers. Bentgrass greens favor European-style putters.",
    course_specialists: ["Scottie Scheffler","Rory McIlroy","Jon Rahm","Hideki Matsuyama","Adam Scott"],
  },
  "Pebble Beach": {
    location: "Pebble Beach, CA", par:72, yards:7075,
    type: "links-adjacent", grass: "poa_annua",
    key_traits: ["wind management", "poa annua putting", "ocean-side holes", "precision over power", "iconic coastal layout"],
    who_wins: "Poa specialists and wind managers. Distance less important. Short game wins.",
    sg_premium: "putt",
    note: "AT&T Pebble Beach Pro-Am. Poa annua greens can be bumpy — putting variance is high. Wind off the Pacific is the key variable. Hole 18 along the ocean is one of golf's most iconic. Accuracy > distance here.",
    course_specialists: ["Patrick Cantlay","Tom Kim","Jordan Spieth","Collin Morikawa"],
  },
  "TPC Sawgrass": {
    location: "Ponte Vedra Beach, FL", par:72, yards:7255,
    type: "parkland", grass: "bermuda",
    key_traits: ["island green par 3 (17)", "water on 18", "bermuda greens", "wind", "pressure putting"],
    who_wins: "Accurate iron players who handle pressure. Putting on Bermuda. 17th island green decides many events.",
    sg_premium: "app",
    note: "THE PLAYERS Championship — the 5th major. TPC Sawgrass is one of the most demanding courses in golf. 17th island par 3 is where tournaments are won and lost. Wind from the ocean changes daily. Bermuda greens favor players who grew up on them.",
    course_specialists: ["Scottie Scheffler","Rory McIlroy","Xander Schauffele","Matt Fitzpatrick"],
  },
  "Riviera Country Club": {
    location: "Pacific Palisades, CA", par:71, yards:7322,
    type: "parkland", grass: "poa_annua",
    key_traits: ["bermuda rough", "poa greens", "kikuyu rough", "elite field", "no weakness tolerated"],
    who_wins: "Complete players. No weakness in this field. Poa putting + iron play wins.",
    sg_premium: "app",
    note: "Genesis Invitational. Riviera is 'The Riviera of the West.' Famous kikuyu rough penalizes missing fairways heavily. Poa annua greens. Bermuda rough. Need a complete game to compete.",
    course_specialists: ["Patrick Cantlay","Collin Morikawa","Xander Schauffele","Scottie Scheffler"],
  },
  "Royal Troon": {
    location: "Ayrshire, Scotland", par:71, yards:7385,
    type: "links", grass: "links_fescue",
    key_traits: ["wind is everything", "postage stamp par 3", "fescue rough", "bump and run", "scoring off-limits in bad wind"],
    who_wins: "Links specialists. Wind management. Bump-and-run short game. Patience wins.",
    sg_premium: "ott",
    note: "The Open Championship venue. Postage Stamp (8th) is one of golf's most famous holes. Wind direction changes the course entirely — morning vs afternoon draws matter. Links specialists (Rory, Fleetwood, Lowry) thrive.",
    course_specialists: ["Rory McIlroy","Tommy Fleetwood","Shane Lowry","Brian Harman","Cameron Smith"],
  },
  "Pinehurst No. 2": {
    location: "Pinehurst, NC", par:70, yards:7689,
    type: "parkland_links_hybrid", grass: "bermuda",
    key_traits: ["domed greens shed shots off", "precision approach", "bermuda greens", "sand and scrub rough", "no water"],
    who_wins: "Iron ball-strikers who hit greens. Domed greens mean approaches must be precise — off the green = 40-foot chips. Bermuda putting.",
    sg_premium: "app",
    note: "US Open venue. Domed greens are the signature feature — errant approaches roll off dramatically. Sand-and-scrub rough is not penal but recovery is tricky. Bermuda greens. Precision > power.",
    course_specialists: ["Scottie Scheffler","Xander Schauffele","Bryson DeChambeau","Rory McIlroy"],
  },
  "Muirfield Village": {
    location: "Dublin, OH", par:72, yards:7392,
    type: "parkland", grass: "bentgrass",
    key_traits: ["bentgrass greens", "tree-lined fairways", "accurate iron play", "Nicklaus design", "challenging rough"],
    who_wins: "Precise iron players on bentgrass. All-around game required.",
    sg_premium: "app",
    note: "Memorial Tournament. Jack Nicklaus design rewards the complete game. Bentgrass greens are pristine. Tree-lined fairways demand accuracy off the tee.",
    course_specialists: ["Scottie Scheffler","Rory McIlroy","Patrick Cantlay","Collin Morikawa"],
  },
  "Torrey Pines (South)": {
    location: "La Jolla, CA", par:72, yards:7765,
    type: "parkland", grass: "poa_annua",
    key_traits: ["ocean breeze", "poa greens", "length matters", "cliffside holes", "morning/afternoon draw variance"],
    who_wins: "Long hitters who can putt poa. Morning draw usually better in calm conditions.",
    sg_premium: "ott",
    note: "Farmers Insurance Open. One of the longest courses on tour. Ocean breeze is the key variable. Poa annua greens mean putting variance is high. Morning draw vs afternoon often determines who's in contention.",
    course_specialists: ["Scottie Scheffler","Patrick Cantlay","Rickie Fowler","Rory McIlroy"],
  },
};

// ── Market definitions for the model ─────────────────────────────────────────
export const GOLF_MARKETS = {
  outright:   { label:"Tournament Winner",       note:"Hardest to hit. Best for elite players or massive longshots only. Value starts at +800 for Tier 1." },
  top_5:      { label:"Top 5 Finish",            note:"4-6x more likely than outright. Best play for elite consistent players." },
  top_10:     { label:"Top 10 Finish",           note:"Best overall value market. Wide range of viable players every week." },
  top_20:     { label:"Top 20 Finish",           note:"High-percentage play for consistent mid-tier players. Target Tier 1 players at value odds." },
  make_cut:   { label:"Make the Cut",            note:"Two-day cut market. High confidence for players with 82%+ cut-making history." },
  miss_cut:   { label:"Miss the Cut",            note:"Fade play. Best for boom-bust players at difficult courses." },
  frl:        { label:"First Round Leader",      note:"Volatile but high-upside. Best for power players and good morning draws." },
  matchup:    { label:"Head-to-Head Matchup",    note:"Two-ball or three-ball matchup. Most skill-based market with best edge." },
  top_20_ng:  { label:"Top 20 Nationalities/Groups", note:"Tournament-specific props. Verify availability." },
};
