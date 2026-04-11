export const config = {
api: { bodyParser: { sizeLimit: “10mb” } },
};

// ── Golf Player Database (server-side — not sent over wire) ─────────────────
const PGA_PLAYERS = {

// ═══════════════════════════════════════════════════════════════
// TIER 1 — TOP 45 (deep coverage, every market supported)
// ═══════════════════════════════════════════════════════════════

“Scottie Scheffler”: {
rank:1, country:“USA”, age:27, tier:1,
sg:{ total:3.12, ott:0.94, app:1.21, arg:0.48, putt:0.49 },
driving:{ dist:303.2, acc:58.3 },
cutMaking:“97%”, top10Rate:“52%”, top20Rate:“68%”, winRate:“18%”,
courseFit:{ parkland:“ELITE”, links:“STRONG”, desert:“STRONG”, bermuda:“STRONG”, poa:“ELITE”, bentgrass:“ELITE” },
recentForm:[“WIN”,“T4”,“WIN”,“T2”,“WIN”,“T3”],
bestMarkets:[“outright”,“top_5”,“top_10”,“frl”],
note:“Best player in the world. Buy in any field — SG Total 3.12 is historically elite. 18% win rate means outright at anything under +500 is value. Top 10 at -120 or better is a lock play. FRL viable — leads more rounds than anyone. Fade only on minor events or heavy schedule fatigue.”,
comps:[“Rory McIlroy”,“Jon Rahm”,“Viktor Hovland”],
},

“Rory McIlroy”: {
rank:2, country:“NIR”, age:35, tier:1,
sg:{ total:2.41, ott:1.18, app:0.87, arg:0.12, putt:0.24 },
driving:{ dist:320.1, acc:55.1 },
cutMaking:“89%”, top10Rate:“44%”, top20Rate:“61%”, winRate:“12%”,
courseFit:{ parkland:“ELITE”, links:“ELITE”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“WIN”,“T8”,“T3”,“T15”,“T5”,“WIN”],
bestMarkets:[“outright”,“top_5”,“top_10”,“frl”,“matchup”],
note:“Elite driver of the ball — SG OTT 1.18 leads the field most weeks. Putting is the lever: when he’s rolling it, bet the outright. When putting stats look flat, step down to top 10. Augusta specialist — Masters outright always has value. Links events (The Open) are his home. Best H2H matchup play in the field most weeks.”,
comps:[“Scottie Scheffler”,“Jon Rahm”,“Viktor Hovland”],
},

“Xander Schauffele”: {
rank:3, country:“USA”, age:30, tier:1,
sg:{ total:2.18, ott:0.71, app:0.89, arg:0.31, putt:0.27 },
driving:{ dist:298.4, acc:62.1 },
cutMaking:“92%”, top10Rate:“46%”, top20Rate:“64%”, winRate:“10%”,
courseFit:{ parkland:“ELITE”, links:“STRONG”, desert:“STRONG”, bermuda:“ELITE”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“WIN”,“T2”,“T6”,“T3”,“WIN”,“T11”],
bestMarkets:[“outright”,“top_5”,“top_10”,“make_cut”],
note:“Two major champion (2024 PGA + The Open). Elite iron player and putter — SG App + SG Putt combo is top 3 on tour. One of the cleanest top 10 plays in the field every week. Major championship pedigree makes him value in any major. FRL less consistent — target outright and top 5.”,
comps:[“Collin Morikawa”,“Patrick Cantlay”,“Wyndham Clark”],
},

“Jon Rahm”: {
rank:4, country:“ESP”, age:30, tier:1,
sg:{ total:2.05, ott:0.68, app:0.91, arg:0.22, putt:0.24 },
driving:{ dist:305.8, acc:59.2 },
cutMaking:“88%”, top10Rate:“41%”, top20Rate:“58%”, winRate:“11%”,
courseFit:{ parkland:“ELITE”, links:“ELITE”, desert:“STRONG”, bermuda:“STRONG”, poa:“ELITE”, bentgrass:“STRONG” },
recentForm:[“T4”,“WIN”,“T2”,“T8”,“T20”,“T3”],
bestMarkets:[“outright”,“top_5”,“top_10”,“matchup”],
note:“Masters champion, US Open champion. Elite in every SG category — most complete player not named Scheffler. LIV schedule means fewer PGA Tour starts — verify he’s in the field. Bermuda greens suit his aggressive putting. Best value when the field has significant weak spots.”,
comps:[“Scottie Scheffler”,“Rory McIlroy”,“Tyrrell Hatton”],
},

“Collin Morikawa”: {
rank:5, country:“USA”, age:27, tier:1,
sg:{ total:1.89, ott:0.42, app:1.08, arg:0.18, putt:0.21 },
driving:{ dist:289.3, acc:67.4 },
cutMaking:“90%”, top10Rate:“38%”, top20Rate:“57%”, winRate:“8%”,
courseFit:{ parkland:“ELITE”, links:“ELITE”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T3”,“T7”,“T2”,“WIN”,“T5”,“T14”],
bestMarkets:[“top_5”,“top_10”,“top_20”,“matchup”],
note:“Best iron player on tour — SG Approach 1.08 is elite. Two-time major winner (The Open, PGA). Puts himself in contention every week with his irons. Not a long hitter — fades at courses where OTT is decisive. Best value in smaller field events with premium iron courses. Consistent top-10 machine.”,
comps:[“Xander Schauffele”,“Patrick Cantlay”,“Sam Burns”],
},

“Viktor Hovland”: {
rank:6, country:“NOR”, age:26, tier:1,
sg:{ total:1.78, ott:0.82, app:0.71, arg:0.09, putt:0.16 },
driving:{ dist:304.7, acc:57.8 },
cutMaking:“84%”, top10Rate:“35%”, top20Rate:“52%”, winRate:“9%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T12”,“T4”,“WIN”,“T8”,“T3”,“T22”],
bestMarkets:[“outright”,“top_10”,“top_20”,“matchup”],
note:“World Golf Championships winner, The Open contender. Elite around links-style tracks. ARG and putting are the weaknesses — when both are clicking, bet the outright. Fades at Bermuda greens courses. Best value at elevated events where he’s locked in. Top 20 is the consistent market if not playing his best.”,
comps:[“Rory McIlroy”,“Tommy Fleetwood”,“Patrick Cantlay”],
},

“Patrick Cantlay”: {
rank:7, country:“USA”, age:32, tier:1,
sg:{ total:1.72, ott:0.44, app:0.79, arg:0.28, putt:0.21 },
driving:{ dist:292.1, acc:63.8 },
cutMaking:“91%”, top10Rate:“37%”, top20Rate:“55%”, winRate:“7%”,
courseFit:{ parkland:“ELITE”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“ELITE”, bentgrass:“STRONG” },
recentForm:[“T6”,“T3”,“T18”,“T2”,“T9”,“T5”],
bestMarkets:[“top_5”,“top_10”,“top_20”,“make_cut”,“matchup”],
note:“One of the most consistent players in the field every week. Elite poa greens putter — best at west coast events (Pebble Beach, Riviera, Torrey Pines). Fades at links and weak on Bermuda greens. Near-perfect cut-making profile (91%). Best value: top 10 weekly, or make-cut play when odds stretch to -115 or worse.”,
comps:[“Xander Schauffele”,“Wyndham Clark”,“Sam Burns”],
},

“Ludvig Aberg”: {
rank:8, country:“SWE”, age:24, tier:1,
sg:{ total:1.84, ott:0.98, app:0.68, arg:0.10, putt:0.08 },
driving:{ dist:314.8, acc:58.9 },
cutMaking:“85%”, top10Rate:“38%”, top20Rate:“56%”, winRate:“6%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T2”,“T4”,“T3”,“WIN”,“T8”,“T2”],
bestMarkets:[“outright”,“top_5”,“top_10”,“matchup”],
note:“Fastest-rising player in the world — 24 years old with SG Total approaching Scheffler territory. Runner-up at 2024 Masters in his first start there. Elite driver + elite approach. Putting is only minor liability. Top 5 weekly is now the base case. Outright at anything over +800 starts to have value in most fields.”,
comps:[“Viktor Hovland”,“Rory McIlroy”,“Cameron Young”],
},

“Wyndham Clark”: {
rank:9, country:“USA”, age:30, tier:1,
sg:{ total:1.64, ott:0.89, app:0.61, arg:0.08, putt:0.06 },
driving:{ dist:310.4, acc:54.2 },
cutMaking:“78%”, top10Rate:“28%”, top20Rate:“44%”, winRate:“8%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T4”,“WIN”,“T22”,“T8”,“T30”,“T5”],
bestMarkets:[“outright”,“top_10”,“frl”],
note:“US Open champion — proven major winner. Boomer off the tee (310+ avg). Volatile — boom or bust profile. High ceiling, inconsistent floor. Not a reliable top 10 every week. Best bet is outright or FRL at elevated events when he’s locked in. Fade for make-cut props — 78% is too low.”,
comps:[“Keegan Bradley”,“Russell Henley”,“Cameron Young”],
},

“Tony Finau”: {
rank:10, country:“USA”, age:34, tier:1,
sg:{ total:1.58, ott:0.78, app:0.61, arg:0.12, putt:0.07 },
driving:{ dist:309.8, acc:56.4 },
cutMaking:“84%”, top10Rate:“30%”, top20Rate:“48%”, winRate:“5%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T11”,“T5”,“T4”,“T18”,“WIN”,“T6”],
bestMarkets:[“top_10”,“top_20”,“make_cut”],
note:“Incredibly consistent top-10 threat every week. Elite in desert and parkland. 30% top-10 rate is among the highest for his tier. Best markets: top 10 weekly, top 20 as a safer play. Not a reliable outright unless he’s shown recent win momentum.”,
comps:[“Russell Henley”,“Sungjae Im”,“Adam Scott”],
},

“Russell Henley”: {
rank:11, country:“USA”, age:35, tier:1,
sg:{ total:1.54, ott:0.41, app:0.82, arg:0.18, putt:0.13 },
driving:{ dist:287.4, acc:64.2 },
cutMaking:“87%”, top10Rate:“33%”, top20Rate:“51%”, winRate:“5%”,
courseFit:{ parkland:“ELITE”, links:“NEUTRAL”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T3”,“T7”,“T2”,“T11”,“T4”,“T19”],
bestMarkets:[“top_5”,“top_10”,“top_20”,“make_cut”],
note:“Sneaky elite approach play — SG App 0.82 is top 15 on tour. Consistent top 10 machine who gets overlooked at inflated odds. Best value when he’s priced as a top-20 but his SG form suggests top 10. Bermuda and poa putter. Shorter hitter — fades when OTT is decisive. Cut-making at 87% is a reliable make-cut bet.”,
comps:[“Collin Morikawa”,“Patrick Cantlay”,“Sam Burns”],
},

“Sam Burns”: {
rank:12, country:“USA”, age:27, tier:1,
sg:{ total:1.51, ott:0.62, app:0.68, arg:0.11, putt:0.10 },
driving:{ dist:298.8, acc:60.1 },
cutMaking:“85%”, top10Rate:“29%”, top20Rate:“47%”, winRate:“6%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T8”,“WIN”,“T3”,“T12”,“T6”,“T24”],
bestMarkets:[“outright”,“top_10”,“top_20”,“make_cut”],
note:“Multiple tour wins, Ryder Cup player. Balanced SG profile — no glaring weakness. Most consistent when fully committed for a week. Top 10 weekly is the best market. Can win at elevated events when in form. Make cut at 85% is reliable enough for a bet.”,
comps:[“Russell Henley”,“Sungjae Im”,“Taylor Moore”],
},

“Sungjae Im”: {
rank:13, country:“KOR”, age:26, tier:1,
sg:{ total:1.48, ott:0.44, app:0.72, arg:0.18, putt:0.14 },
driving:{ dist:291.2, acc:65.4 },
cutMaking:“90%”, top10Rate:“31%”, top20Rate:“50%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T4”,“T9”,“T2”,“T6”,“T15”,“T7”],
bestMarkets:[“top_10”,“top_20”,“make_cut”],
note:“One of the best cut-making machines on tour (90%). Elite iron player. No power off the tee — fades at OTT-heavy courses. Top 10 every week is the play. Make cut at 90% makes this the most reliable fade market in the field.”,
comps:[“Patrick Cantlay”,“Russell Henley”,“Tom Kim”],
},

“Tommy Fleetwood”: {
rank:14, country:“ENG”, age:33, tier:1,
sg:{ total:1.45, ott:0.48, app:0.72, arg:0.14, putt:0.11 },
driving:{ dist:293.4, acc:61.8 },
cutMaking:“86%”, top10Rate:“30%”, top20Rate:“49%”, winRate:“5%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T5”,“T3”,“T11”,“T4”,“T2”,“WIN”],
bestMarkets:[“top_10”,“top_20”,“matchup”],
note:“Links specialist — elite at The Open and Ryder Cup courses. Poa/bentgrass putter, fades on Bermuda. Consistent top 10 threat at European-style tracks. Best value: top 10 at links or parkland events. H2H matchups are strong — his consistency is underpriced against boom-bust opponents.”,
comps:[“Viktor Hovland”,“Tyrrell Hatton”,“Shane Lowry”],
},

“Matt Fitzpatrick”: {
rank:15, country:“ENG”, age:29, tier:1,
sg:{ total:1.44, ott:0.38, app:0.72, arg:0.22, putt:0.12 },
driving:{ dist:289.8, acc:65.1 },
cutMaking:“87%”, top10Rate:“30%”, top20Rate:“48%”, winRate:“5%”,
courseFit:{ parkland:“ELITE”, links:“STRONG”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T4”,“T2”,“T9”,“T11”,“T3”,“WIN”],
bestMarkets:[“top_5”,“top_10”,“top_20”,“make_cut”,“matchup”],
note:“US Open champion — elite precision player. SG App 0.72 is elite. Shorter but compensates with incredible accuracy. Cut-making 87% is one of the best on tour. Top 10 weekly is the consistent market. Parkland and bentgrass specialist. Best value when field has power bias and books undervalue precision.”,
comps:[“Collin Morikawa”,“Russell Henley”,“Sungjae Im”],
},

“Nick Taylor”: {
rank:16, country:“CAN”, age:35, tier:1,
sg:{ total:1.44, ott:0.48, app:0.64, arg:0.16, putt:0.16 },
driving:{ dist:290.2, acc:63.4 },
cutMaking:“82%”, top10Rate:“24%”, top20Rate:“41%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T6”,“T2”,“WIN”,“T8”,“T14”,“T4”],
bestMarkets:[“top_10”,“top_20”,“make_cut”,“matchup”],
note:“Canadian Open specialist — won it dramatically. Consistent iron player. Top 10 is the market weekly. Make cut at 82% is reliable. Best value when he’s under the radar in a strong field.”,
comps:[“Sam Burns”,“Russell Henley”,“Keegan Bradley”],
},

“Cameron Smith”: {
rank:17, country:“AUS”, age:30, tier:1,
sg:{ total:1.42, ott:0.38, app:0.61, arg:0.38, putt:0.45 },
driving:{ dist:286.2, acc:64.1 },
cutMaking:“85%”, top10Rate:“34%”, top20Rate:“52%”, winRate:“8%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“WIN”,“T4”,“T3”,“T7”,“T18”,“T2”],
bestMarkets:[“outright”,“top_5”,“top_10”,“matchup”],
note:“Best putter on tour when on his game — SG Putt 0.45 is elite. Open champion. LIV player — verify he’s in the field. When he’s putting, bet the outright. Short hitter but short-game specialist. Top 5 at links and parkland events is a strong market.”,
comps:[“Shane Lowry”,“Tommy Fleetwood”,“Tyrrell Hatton”],
},

“Tyrrell Hatton”: {
rank:18, country:“ENG”, age:32, tier:1,
sg:{ total:1.38, ott:0.44, app:0.69, arg:0.14, putt:0.11 },
driving:{ dist:291.8, acc:62.4 },
cutMaking:“82%”, top10Rate:“28%”, top20Rate:“45%”, winRate:“5%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“NEUTRAL”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T6”,“T3”,“WIN”,“T12”,“T4”,“T9”],
bestMarkets:[“top_10”,“top_20”,“matchup”],
note:“LIV player — verify field inclusion. Elite links form. Inconsistent temperament but dangerous when clicking. Best in smaller, elevated fields. H2H matchups are value when his opponent is a boom-bust power player.”,
comps:[“Tommy Fleetwood”,“Cameron Smith”,“Shane Lowry”],
},

“Shane Lowry”: {
rank:19, country:“IRE”, age:37, tier:1,
sg:{ total:1.31, ott:0.28, app:0.61, arg:0.22, putt:0.20 },
driving:{ dist:284.3, acc:63.2 },
cutMaking:“84%”, top10Rate:“25%”, top20Rate:“43%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“NEUTRAL”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T4”,“T8”,“T2”,“T22”,“T11”,“T5”],
bestMarkets:[“top_10”,“top_20”,“matchup”],
note:“The Open champion — elite links specialist. SG numbers underrate his major form. Fades badly at desert and warm-weather courses. Best markets are top 10 at links/parkland and matchup props against power hitters. Skip non-major events unless form is obvious.”,
comps:[“Tommy Fleetwood”,“Tyrrell Hatton”,“Justin Rose”],
},

“Hideki Matsuyama”: {
rank:20, country:“JPN”, age:32, tier:1,
sg:{ total:1.29, ott:0.51, app:0.64, arg:0.08, putt:0.06 },
driving:{ dist:296.4, acc:59.7 },
cutMaking:“81%”, top10Rate:“24%”, top20Rate:“40%”, winRate:“5%”,
courseFit:{ parkland:“ELITE”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T2”,“WIN”,“T8”,“T5”,“T14”,“T3”],
bestMarkets:[“outright”,“top_10”,“top_20”,“matchup”],
note:“Masters champion — Augusta specialist. Best results at parkland and precision iron courses. When SG approach is peaking, bet the outright. Putting is the liability. Best value at Augusta and parkland tour stops.”,
comps:[“Tony Finau”,“Tom Kim”,“Keegan Bradley”],
},

“Justin Thomas”: {
rank:21, country:“USA”, age:31, tier:1,
sg:{ total:1.26, ott:0.58, app:0.52, arg:0.08, putt:0.08 },
driving:{ dist:299.4, acc:58.1 },
cutMaking:“80%”, top10Rate:“22%”, top20Rate:“38%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T4”,“T18”,“T2”,“T31”,“T9”,“T6”],
bestMarkets:[“top_10”,“top_20”,“matchup”],
note:“Two-time PGA champion. In form resurgence but SG numbers dipped from peak. When his iron play clicks, he’s a top-5 threat. Volatile — top 10 is the right market, not outright. Best at elevated events where he elevates mentally.”,
comps:[“Rickie Fowler”,“Tommy Fleetwood”,“Sam Burns”],
},

“Jordan Spieth”: {
rank:22, country:“USA”, age:30, tier:1,
sg:{ total:1.22, ott:0.08, app:0.52, arg:0.34, putt:0.28 },
driving:{ dist:284.1, acc:60.4 },
cutMaking:“82%”, top10Rate:“23%”, top20Rate:“40%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T5”,“T3”,“T18”,“T8”,“T2”,“T28”],
bestMarkets:[“top_10”,“top_20”,“matchup”],
note:“Three-time major champion. SG OTT is the liability — one of the shortest on tour. Wins via short game and putting genius. Best at links and Augusta. Volatile — look for bounce-back signals after missed cuts. Top 10 at links events is the market.”,
comps:[“Shane Lowry”,“Tommy Fleetwood”,“Justin Rose”],
},

“Brian Harman”: {
rank:23, country:“USA”, age:37, tier:1,
sg:{ total:1.22, ott:0.04, app:0.62, arg:0.28, putt:0.28 },
driving:{ dist:278.4, acc:66.8 },
cutMaking:“85%”, top10Rate:“22%”, top20Rate:“41%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“ELITE” },
recentForm:[“T4”,“T9”,“WIN”,“T3”,“T18”,“T11”],
bestMarkets:[“top_10”,“top_20”,“make_cut”,“matchup”],
note:“The Open champion — elite links player. Shortest hitter on tour but compensates with elite short game and putting. SG Putt 0.28 is elite. Cut-making at 85% extremely reliable. Make cut is the highest-confidence market. Top 10 at links events is strong. Fade at power courses — distance deficit too large.”,
comps:[“Shane Lowry”,“Jordan Spieth”,“Chris Kirk”],
},

“Tom Kim”: {
rank:24, country:“KOR”, age:22, tier:1,
sg:{ total:1.06, ott:0.38, app:0.44, arg:0.14, putt:0.10 },
driving:{ dist:291.8, acc:63.4 },
cutMaking:“81%”, top10Rate:“22%”, top20Rate:“39%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T3”,“T6”,“WIN”,“T11”,“T4”,“T18”],
bestMarkets:[“outright”,“top_10”,“top_20”,“matchup”],
note:“One of the best young players in the world. Already won multiple times before 22. SG rising — elite trajectory clear. Top 10 weekly is the consistent market. Outright is value when field has no dominant Tier 1 player.”,
comps:[“Sungjae Im”,“Collin Morikawa”,“Min Woo Lee”],
},

“Robert MacIntyre”: {
rank:25, country:“SCO”, age:27, tier:1,
sg:{ total:1.62, ott:0.71, app:0.61, arg:0.18, putt:0.12 },
driving:{ dist:302.4, acc:60.8 },
cutMaking:“82%”, top10Rate:“28%”, top20Rate:“46%”, winRate:“5%”,
courseFit:{ parkland:“STRONG”, links:“ELITE”, desert:“NEUTRAL”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“WIN”,“T4”,“T8”,“T3”,“T15”,“T6”],
bestMarkets:[“outright”,“top_10”,“top_20”,“matchup”],
note:“Won on PGA Tour in 2024. Born links player — elite at The Open and Scottish/Irish events. Bermuda greens are the weakness. Best value at overseas/links-style events or when field is moderate.”,
comps:[“Tommy Fleetwood”,“Shane Lowry”,“Tyrrell Hatton”],
},

“Sahith Theegala”: {
rank:26, country:“USA”, age:26, tier:1,
sg:{ total:1.58, ott:0.72, app:0.62, arg:0.14, putt:0.10 },
driving:{ dist:306.1, acc:57.2 },
cutMaking:“80%”, top10Rate:“26%”, top20Rate:“43%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T4”,“T11”,“T3”,“WIN”,“T8”,“T19”],
bestMarkets:[“outright”,“top_10”,“top_20”,“frl”],
note:“Exciting young player with multiple wins. Power off the tee + decent irons. Top 10 is consistent when he’s mentally engaged. FRL is a viable market. Volatile closer — fade for top 5 outright unless form is obvious.”,
comps:[“Cameron Young”,“Wyndham Clark”,“Nick Taylor”],
},

“Rickie Fowler”: {
rank:27, country:“USA”, age:35, tier:1,
sg:{ total:1.18, ott:0.48, app:0.51, arg:0.10, putt:0.09 },
driving:{ dist:294.8, acc:60.8 },
cutMaking:“79%”, top10Rate:“21%”, top20Rate:“37%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T8”,“T20”,“T3”,“T44”,“WIN”,“T15”],
bestMarkets:[“top_10”,“top_20”,“matchup”],
note:“US Open contender 2023. Best at west coast events (Poa greens) and desert tracks. Top 10 is the market at these venues. Inconsistent enough to fade for make-cut props. Best value: matchup H2H at home courses.”,
comps:[“Justin Thomas”,“Cameron Young”,“Tom Kim”],
},

“Keegan Bradley”: {
rank:28, country:“USA”, age:37, tier:1,
sg:{ total:1.14, ott:0.62, app:0.42, arg:0.04, putt:0.06 },
driving:{ dist:298.2, acc:57.8 },
cutMaking:“83%”, top10Rate:“20%”, top20Rate:“38%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T6”,“T11”,“T4”,“T24”,“T8”,“T33”],
bestMarkets:[“top_20”,“make_cut”,“matchup”],
note:“Ryder Cup captain 2025. Consistency play — 83% cut-making is reliable. Not a top-5 threat most weeks but rarely misses. Best market is top 20 and make-cut. SG driver is the asset; approach is the limiter.”,
comps:[“Tony Finau”,“Wyndham Clark”,“Sepp Straka”],
},

“Adam Scott”: {
rank:29, country:“AUS”, age:44, tier:1,
sg:{ total:1.11, ott:0.54, app:0.44, arg:0.08, putt:0.05 },
driving:{ dist:291.4, acc:62.1 },
cutMaking:“82%”, top10Rate:“19%”, top20Rate:“35%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T7”,“T12”,“T3”,“T19”,“T6”,“T28”],
bestMarkets:[“top_20”,“make_cut”,“matchup”],
note:“Masters champion. Still competes at high level at 44. Extremely consistent — 82% cut-making. Best value at Augusta and parkland where his long-game mastery still plays. Top 20 weekly with make-cut hedge is the right market.”,
comps:[“Keegan Bradley”,“Justin Rose”,“Tony Finau”],
},

“Cameron Young”: {
rank:30, country:“USA”, age:26, tier:1,
sg:{ total:1.08, ott:0.94, app:0.28, arg:-0.04, putt:-0.10 },
driving:{ dist:319.8, acc:52.4 },
cutMaking:“76%”, top10Rate:“18%”, top20Rate:“34%”, winRate:“2%”,
courseFit:{ parkland:“NEUTRAL”, links:“STRONG”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“NEUTRAL”, bentgrass:“STRONG” },
recentForm:[“T14”,“T4”,“T18”,“T9”,“T28”,“T3”],
bestMarkets:[“top_10”,“top_20”,“frl”],
note:“Longest hitter on tour — 319+ driving distance. Approach and short game lag badly. Elite at power courses. Volatile — boom or bust every week. FRL is his best market — can dominate a round with the driver. Fade for make cut (76%). Target when course rewards big hitting.”,
comps:[“Wyndham Clark”,“Ludvig Aberg”,“Min Woo Lee”],
},

“Chris Kirk”: {
rank:31, country:“USA”, age:38, tier:1,
sg:{ total:1.38, ott:0.28, app:0.68, arg:0.24, putt:0.18 },
driving:{ dist:283.8, acc:65.4 },
cutMaking:“84%”, top10Rate:“22%”, top20Rate:“40%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T3”,“T8”,“WIN”,“T6”,“T12”,“T19”],
bestMarkets:[“top_10”,“top_20”,“make_cut”],
note:“Short hitter but elite precision player. SG Approach and ARG are where he beats the field. One of the most reliable cut-making plays at 84%. Top 10 when course rewards accuracy. Fade at power courses.”,
comps:[“Russell Henley”,“Sungjae Im”,“Sepp Straka”],
},

“Sepp Straka”: {
rank:32, country:“AUT”, age:30, tier:1,
sg:{ total:1.33, ott:0.42, app:0.64, arg:0.14, putt:0.13 },
driving:{ dist:291.8, acc:61.4 },
cutMaking:“83%”, top10Rate:“23%”, top20Rate:“41%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T9”,“T4”,“T11”,“T22”,“T3”,“T7”],
bestMarkets:[“top_10”,“top_20”,“make_cut”,“matchup”],
note:“Quietly consistent top-20 machine. SG App and Putt combo is reliable. Best value when he’s under the radar in weaker fields. Make cut at 83% is a target market. H2H matchups against boom-bust opponents are strong.”,
comps:[“Chris Kirk”,“Sungjae Im”,“Sam Burns”],
},

“Min Woo Lee”: {
rank:33, country:“AUS”, age:25, tier:1,
sg:{ total:1.24, ott:0.74, app:0.38, arg:0.08, putt:0.04 },
driving:{ dist:308.4, acc:55.8 },
cutMaking:“77%”, top10Rate:“20%”, top20Rate:“36%”, winRate:“3%”,
courseFit:{ parkland:“NEUTRAL”, links:“STRONG”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“NEUTRAL”, bentgrass:“STRONG” },
recentForm:[“T3”,“T18”,“WIN”,“T5”,“T28”,“T8”],
bestMarkets:[“outright”,“top_10”,“frl”,“matchup”],
note:“Exciting power player. Links specialist — thrives at The Open. Approach and short game are work in progress. FRL is a viable market. Fade for make cut (77%). Best at power-friendly courses.”,
comps:[“Cameron Young”,“Ludvig Aberg”,“Sahith Theegala”],
},

“Nicolai Hojgaard”: {
rank:34, country:“DEN”, age:23, tier:1,
sg:{ total:1.38, ott:0.58, app:0.62, arg:0.12, putt:0.06 },
driving:{ dist:301.4, acc:59.8 },
cutMaking:“81%”, top10Rate:“24%”, top20Rate:“41%”, winRate:“4%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“NEUTRAL”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“WIN”,“T4”,“T8”,“T18”,“T3”,“T11”],
bestMarkets:[“outright”,“top_10”,“top_20”,“matchup”],
note:“Ryder Cup hero 2023. Strong young player with growing SG. Better in European-style events. Top 10 is the market. Outright value in non-major elevated fields.”,
comps:[“Robert MacIntyre”,“Tommy Fleetwood”,“Tom Kim”],
},

“Rasmus Hojgaard”: {
rank:35, country:“DEN”, age:23, tier:1,
sg:{ total:1.32, ott:0.54, app:0.58, arg:0.14, putt:0.06 },
driving:{ dist:299.8, acc:60.4 },
cutMaking:“80%”, top10Rate:“22%”, top20Rate:“39%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“NEUTRAL”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T6”,“WIN”,“T3”,“T14”,“T8”,“T22”],
bestMarkets:[“outright”,“top_10”,“top_20”,“matchup”],
note:“Twin brother of Nicolai. Both are elite young European talents. Top 10 is the consistent market. Outright value in smaller elevated fields. Links strength, parkland solid, Bermuda neutral.”,
comps:[“Nicolai Hojgaard”,“Robert MacIntyre”,“Tommy Fleetwood”],
},

“Corey Conners”: {
rank:36, country:“CAN”, age:32, tier:1,
sg:{ total:1.28, ott:0.42, app:0.72, arg:0.08, putt:0.06 },
driving:{ dist:293.4, acc:62.8 },
cutMaking:“84%”, top10Rate:“22%”, top20Rate:“39%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T8”,“T3”,“T11”,“T6”,“T18”,“T4”],
bestMarkets:[“top_10”,“top_20”,“make_cut”,“matchup”],
note:“One of the most accurate players in the world — GIR leader. SG Approach is elite (0.72). Putting is the limiter. Best value: top 10 when course rewards accuracy. Make cut at 84% is reliable.”,
comps:[“Matt Fitzpatrick”,“Russell Henley”,“Sungjae Im”],
},

“Justin Rose”: {
rank:37, country:“ENG”, age:43, tier:1,
sg:{ total:1.18, ott:0.44, app:0.54, arg:0.12, putt:0.08 },
driving:{ dist:290.8, acc:63.4 },
cutMaking:“81%”, top10Rate:“20%”, top20Rate:“37%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“STRONG”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T8”,“T3”,“T19”,“T6”,“T11”,“T25”],
bestMarkets:[“top_10”,“top_20”,“make_cut”,“matchup”],
note:“Olympic gold medalist, US Open champion. Still competes well at 43. Best at major championship venues. Top 20 is the reliable weekly market. H2H matchups against younger boom-bust players are value when he’s healthy.”,
comps:[“Adam Scott”,“Tommy Fleetwood”,“Shane Lowry”],
},

“Akshay Bhatia”: {
rank:38, country:“USA”, age:22, tier:1,
sg:{ total:1.62, ott:0.78, app:0.68, arg:0.08, putt:0.08 },
driving:{ dist:308.8, acc:56.2 },
cutMaking:“78%”, top10Rate:“26%”, top20Rate:“42%”, winRate:“5%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“WIN”,“T4”,“T3”,“T8”,“T18”,“T11”],
bestMarkets:[“outright”,“top_10”,“top_20”],
note:“Exciting 22-year-old who already has PGA Tour wins. Rising SG. Power + approach combo is elite. Putting still developing. Outright value in non-major fields.”,
comps:[“Ludvig Aberg”,“Tom Kim”,“Sahith Theegala”],
},

“Eric Cole”: {
rank:39, country:“USA”, age:33, tier:1,
sg:{ total:1.29, ott:0.44, app:0.61, arg:0.14, putt:0.10 },
driving:{ dist:290.8, acc:62.8 },
cutMaking:“82%”, top10Rate:“21%”, top20Rate:“39%”, winRate:“3%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T7”,“T14”,“T3”,“T8”,“T22”,“T5”],
bestMarkets:[“top_10”,“top_20”,“make_cut”],
note:“Breakthrough PGA Tour player. Consistent SG profile with no major weakness. Best value as a top-20 play in weaker fields. Make cut reliably.”,
comps:[“Sepp Straka”,“Keegan Bradley”,“Nick Taylor”],
},

“Emiliano Grillo”: {
rank:40, country:“ARG”, age:31, tier:1,
sg:{ total:1.22, ott:0.48, app:0.54, arg:0.12, putt:0.08 },
driving:{ dist:293.8, acc:61.4 },
cutMaking:“82%”, top10Rate:“20%”, top20Rate:“37%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T5”,“T12”,“T3”,“T19”,“T8”,“WIN”],
bestMarkets:[“top_20”,“make_cut”,“matchup”],
note:“Consistent player who makes cuts and sneaks into top 20. Make cut 82% is a reliable market. H2H matchups solid against similar-tier players.”,
comps:[“Sepp Straka”,“Denny McCarthy”,“Nick Taylor”],
},

“Denny McCarthy”: {
rank:41, country:“USA”, age:31, tier:1,
sg:{ total:1.02, ott:0.28, app:0.44, arg:0.14, putt:0.16 },
driving:{ dist:283.4, acc:64.8 },
cutMaking:“82%”, top10Rate:“15%”, top20Rate:“30%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T9”,“T22”,“T5”,“T16”,“WIN”,“T11”],
bestMarkets:[“top_20”,“make_cut”,“matchup”],
note:“Streaky player — can win or miss cut. Putting is his calling card. Cut-making at 82% is the market. Top 20 in weak fields. Fade at major fields.”,
comps:[“Brian Harman”,“Mackenzie Hughes”,“Taylor Moore”],
},

“Max Greyserman”: {
rank:42, country:“USA”, age:29, tier:1,
sg:{ total:1.18, ott:0.48, app:0.52, arg:0.10, putt:0.08 },
driving:{ dist:296.8, acc:59.8 },
cutMaking:“79%”, top10Rate:“19%”, top20Rate:“35%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“NEUTRAL”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T8”,“T4”,“T18”,“T11”,“T3”,“T24”],
bestMarkets:[“top_20”,“matchup”],
note:“Rising star — improving SG numbers weekly. Best in moderate fields. Top 20 and H2H matchup are the markets.”,
comps:[“Eric Cole”,“Taylor Moore”,“Sahith Theegala”],
},

“Ben Griffin”: {
rank:43, country:“USA”, age:28, tier:1,
sg:{ total:0.98, ott:0.38, app:0.42, arg:0.10, putt:0.08 },
driving:{ dist:289.8, acc:62.4 },
cutMaking:“80%”, top10Rate:“16%”, top20Rate:“30%”, winRate:“1%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“STRONG”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T4”,“T11”,“T24”,“WIN”,“T8”,“T19”],
bestMarkets:[“top_20”,“make_cut”,“matchup”],
note:“Solid young player finding his footing. Top 20 in moderate fields is the market.”,
comps:[“Eric Cole”,“Taylor Moore”,“Max Greyserman”],
},

“Taylor Moore”: {
rank:44, country:“USA”, age:29, tier:1,
sg:{ total:0.98, ott:0.28, app:0.44, arg:0.16, putt:0.10 },
driving:{ dist:286.4, acc:63.8 },
cutMaking:“80%”, top10Rate:“14%”, top20Rate:“29%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T16”,“T8”,“T3”,“T24”,“T11”,“WIN”],
bestMarkets:[“top_20”,“make_cut”],
note:“Reliable consistent player with no major SG weakness but no elite ceiling. Make cut 80% is a good market. Top 20 in weak fields.”,
comps:[“Denny McCarthy”,“Mackenzie Hughes”,“Sepp Straka”],
},

“Mackenzie Hughes”: {
rank:45, country:“CAN”, age:33, tier:1,
sg:{ total:1.04, ott:0.32, app:0.48, arg:0.14, putt:0.10 },
driving:{ dist:286.8, acc:63.2 },
cutMaking:“80%”, top10Rate:“16%”, top20Rate:“31%”, winRate:“2%”,
courseFit:{ parkland:“STRONG”, links:“NEUTRAL”, desert:“NEUTRAL”, bermuda:“STRONG”, poa:“STRONG”, bentgrass:“STRONG” },
recentForm:[“T11”,“T6”,“T24”,“T8”,“T18”,“T3”],
bestMarkets:[“top_20”,“make_cut”,“matchup”],
note:“Solid top-20 threat in weaker fields. Reliable cut-maker at 80%. Best value as a make-cut bet in non-elevated events.”,
comps:[“Sepp Straka”,“Chris Kirk”,“Taylor Moore”],
},

// ═══════════════════════════════════════════════════════════════
// TIER 2 — NEXT 30 (solid coverage + comp-based redirects)
// ═══════════════════════════════════════════════════════════════

“Dustin Johnson”:    { rank:46, country:“USA”, age:39, tier:2, sg:{ total:1.44, ott:1.12, app:0.48, arg:0.02, putt:-0.18 }, driving:{ dist:308.4, acc:56.8 }, cutMaking:“82%”, top10Rate:“24%”, top20Rate:“41%”, winRate:“4%”, recentForm:[“T8”,“T4”,“T3”,“T18”,“WIN”,“T11”], bestMarkets:[“outright”,“top_10”,“frl”], note:“LIV player — verify field. Elite power game, wildly inconsistent putter. Boom or bust. Top 10 when putting heats up. FRL is his best market.”, comps:[“Wyndham Clark”,“Cameron Young”,“Brooks Koepka”] },
“Brooks Koepka”:     { rank:47, country:“USA”, age:33, tier:2, sg:{ total:1.58, ott:0.84, app:0.62, arg:0.08, putt:0.04 }, driving:{ dist:307.8, acc:56.2 }, cutMaking:“79%”, top10Rate:“22%”, top20Rate:“36%”, winRate:“5%”, recentForm:[“WIN”,“T3”,“T18”,“T4”,“T28”,“T8”], bestMarkets:[“outright”,“top_5”,“top_10”], note:“Four-time major champion. LIV player — verify field. Major mode is real — he elevates for the biggest stages. Fade at regular-season events. Bet outright only at majors.”, comps:[“Dustin Johnson”,“Tyrrell Hatton”,“Jon Rahm”] },
“Bryson DeChambeau”: { rank:48, country:“USA”, age:30, tier:2, sg:{ total:1.62, ott:1.44, app:0.48, arg:0.08, putt:-0.38 }, driving:{ dist:338.4, acc:48.4 }, cutMaking:“75%”, top10Rate:“20%”, top20Rate:“34%”, winRate:“5%”, recentForm:[“WIN”,“T4”,“T18”,“T8”,“T30”,“WIN”], bestMarkets:[“outright”,“frl”,“top_10”], note:“LIV player — verify field. Longest hitter in history. Wildly volatile — win or miss cut. Putting is catastrophically bad. Outright only at power courses. FRL viable. Never bet make-cut.”, comps:[“Cameron Young”,“Wyndham Clark”,“Dustin Johnson”] },
“Akshay Bhatia”:     { rank:49, country:“USA”, age:22, tier:2, sg:{ total:1.62, ott:0.78, app:0.68, arg:0.08, putt:0.08 }, driving:{ dist:308.8, acc:56.2 }, cutMaking:“78%”, top10Rate:“26%”, top20Rate:“42%”, winRate:“5%”, recentForm:[“WIN”,“T4”,“T3”,“T8”,“T18”,“T11”], bestMarkets:[“outright”,“top_10”,“top_20”], note:“See Tier 1 entry — this player has full data above.”, comps:[“Ludvig Aberg”,“Tom Kim”,“Sahith Theegala”] },
“Jake Knapp”:        { rank:50, country:“USA”, age:29, tier:2, sg:{ total:1.18, ott:0.74, app:0.38, arg:0.04, putt:0.02 }, driving:{ dist:312.8, acc:54.2 }, cutMaking:“74%”, top10Rate:“16%”, top20Rate:“29%”, winRate:“3%”, recentForm:[“WIN”,“T14”,“T8”,“T22”,“T4”,“T31”], bestMarkets:[“outright”,“top_10”,“frl”], note:“Power bomber who can go low on any given day. Boom-bust profile. FRL is the best market. Fade for make-cut.”, comps:[“Cameron Young”,“Wyndham Clark”,“Garrick Higgo”] },
“Billy Horschel”:    { rank:51, country:“USA”, age:37, tier:2, sg:{ total:1.04, ott:0.32, app:0.48, arg:0.14, putt:0.10 }, driving:{ dist:285.4, acc:63.8 }, cutMaking:“82%”, top10Rate:“18%”, top20Rate:“34%”, winRate:“2%”, recentForm:[“T6”,“T18”,“T4”,“T11”,“T28”,“T8”], bestMarkets:[“top_20”,“make_cut”,“matchup”], note:“Reliable veteran. Make cut 82% is trustworthy. Best value as top-20 in weaker fields.”, comps:[“Chris Kirk”,“Sepp Straka”,“Keegan Bradley”] },
“Davis Riley”:       { rank:52, country:“USA”, age:27, tier:2, sg:{ total:0.94, ott:0.42, app:0.38, arg:0.08, putt:0.06 }, driving:{ dist:292.8, acc:61.4 }, cutMaking:“79%”, top10Rate:“14%”, top20Rate:“28%”, winRate:“1%”, recentForm:[“T14”,“T8”,“T22”,“T11”,“T4”,“T28”], bestMarkets:[“top_20”,“make_cut”], note:“Young player finding his level. Make cut and top 20 are the markets.”, comps:[“Ben Griffin”,“Eric Cole”,“Andrew Novak”] },
“Andrew Novak”:      { rank:53, country:“USA”, age:30, tier:2, sg:{ total:0.94, ott:0.38, app:0.42, arg:0.08, putt:0.06 }, driving:{ dist:287.4, acc:63.8 }, cutMaking:“78%”, top10Rate:“14%”, top20Rate:“28%”, winRate:“2%”, recentForm:[“T8”,“T18”,“WIN”,“T11”,“T4”,“T24”], bestMarkets:[“top_20”,“make_cut”], note:“Reliable journeyman. Make cut 78% with top-20 potential in weak fields.”, comps:[“Taylor Moore”,“Denny McCarthy”,“Mackenzie Hughes”] },
“Adam Hadwin”:       { rank:54, country:“CAN”, age:36, tier:2, sg:{ total:0.88, ott:0.28, app:0.38, arg:0.12, putt:0.10 }, driving:{ dist:284.8, acc:63.4 }, cutMaking:“80%”, top10Rate:“13%”, top20Rate:“26%”, winRate:“1%”, recentForm:[“T9”,“T18”,“T4”,“T22”,“T11”,“T28”], bestMarkets:[“top_20”,“make_cut”,“matchup”], note:“Reliable veteran Canadian. Make cut 80% is consistent. Best at courses where accuracy matters over distance.”, comps:[“Nick Taylor”,“Mackenzie Hughes”,“Chris Kirk”] },
“Beau Hossler”:      { rank:55, country:“USA”, age:29, tier:2, sg:{ total:0.88, ott:0.32, app:0.38, arg:0.12, putt:0.06 }, driving:{ dist:285.4, acc:63.2 }, cutMaking:“79%”, top10Rate:“13%”, top20Rate:“27%”, winRate:“1%”, recentForm:[“T14”,“T7”,“T19”,“T22”,“T8”,“T34”], bestMarkets:[“top_20”,“make_cut”], note:“Consistent but ceiling-limited. Make cut and top 20 in weaker fields are the markets.”, comps:[“Eric Cole”,“Andrew Novak”,“Taylor Moore”] },
“Mark Hubbard”:      { rank:56, country:“USA”, age:34, tier:2, sg:{ total:0.84, ott:0.28, app:0.38, arg:0.10, putt:0.08 }, driving:{ dist:282.8, acc:64.1 }, cutMaking:“79%”, top10Rate:“11%”, top20Rate:“24%”, winRate:“1%”, recentForm:[“T9”,“T24”,“T11”,“T18”,“T34”,“T6”], bestMarkets:[“top_20”,“make_cut”], note:“Reliable cut-maker in weak fields. Not a top-10 target.”, comps:[“Beau Hossler”,“Taylor Moore”,“Andrew Novak”] },
“Hayden Buckley”:    { rank:57, country:“USA”, age:30, tier:2, sg:{ total:0.78, ott:0.24, app:0.34, arg:0.12, putt:0.08 }, driving:{ dist:284.4, acc:62.8 }, cutMaking:“77%”, top10Rate:“11%”, top20Rate:“23%”, winRate:“1%”, recentForm:[“T18”,“T9”,“T28”,“T11”,“T4”,“T32”], bestMarkets:[“make_cut”,“matchup”], note:“Journeyman — make-cut or matchup only.”, comps:[“Ben Griffin”,“Andrew Novak”,“Beau Hossler”] },
“Kurt Kitayama”:     { rank:58, country:“USA”, age:31, tier:2, sg:{ total:1.01, ott:0.48, app:0.38, arg:0.08, putt:0.07 }, driving:{ dist:294.8, acc:60.1 }, cutMaking:“79%”, top10Rate:“16%”, top20Rate:“32%”, winRate:“2%”, recentForm:[“T4”,“T18”,“T8”,“WIN”,“T22”,“T11”], bestMarkets:[“top_20”,“matchup”], note:“Won at Bay Hill. Driver + approach solid but short game limits ceiling. Best in moderate fields.”, comps:[“Cameron Young”,“Sahith Theegala”,“Taylor Moore”] },
“Garrick Higgo”:     { rank:59, country:“RSA”, age:26, tier:2, sg:{ total:0.78, ott:0.48, app:0.24, arg:0.04, putt:0.02 }, driving:{ dist:299.8, acc:57.8 }, cutMaking:“72%”, top10Rate:“10%”, top20Rate:“21%”, winRate:“2%”, recentForm:[“WIN”,“MC”,“T18”,“T8”,“T28”,“MC”], bestMarkets:[“outright”,“matchup”], note:“Boom-bust. Has won on tour. Fade for make-cut (72%). Outright viable in weak non-elevated fields when hot.”, comps:[“Jake Knapp”,“Sahith Theegala”,“Andrew Novak”] },
“Victor Perez”:      { rank:60, country:“FRA”, age:30, tier:2, sg:{ total:0.88, ott:0.38, app:0.38, arg:0.08, putt:0.04 }, driving:{ dist:289.4, acc:62.4 }, cutMaking:“77%”, top10Rate:“13%”, top20Rate:“26%”, winRate:“2%”, recentForm:[“T14”,“T8”,“T22”,“T4”,“T18”,“T11”], bestMarkets:[“top_20”,“matchup”], note:“European Tour regular. Best in moderate European fields.”, comps:[“Adrian Meronk”,“Romain Langasque”,“Emiliano Grillo”] },
“Adrian Meronk”:     { rank:61, country:“POL”, age:30, tier:2, sg:{ total:0.92, ott:0.44, app:0.38, arg:0.04, putt:0.06 }, driving:{ dist:296.8, acc:59.8 }, cutMaking:“78%”, top10Rate:“14%”, top20Rate:“28%”, winRate:“2%”, recentForm:[“T8”,“WIN”,“T14”,“T11”,“T22”,“T4”], bestMarkets:[“top_20”,“matchup”], note:“Strong European player. Best at parkland and moderate-field events.”, comps:[“Sepp Straka”,“Corey Conners”,“Nicolai Hojgaard”] },
“Matti Schmid”:      { rank:62, country:“GER”, age:27, tier:2, sg:{ total:0.84, ott:0.44, app:0.32, arg:0.04, putt:0.04 }, driving:{ dist:296.4, acc:60.8 }, cutMaking:“76%”, top10Rate:“11%”, top20Rate:“24%”, winRate:“1%”, recentForm:[“T11”,“T18”,“T4”,“T28”,“T8”,“T22”], bestMarkets:[“top_20”,“matchup”], note:“Emerging German talent. Best in moderate fields.”, comps:[“Adrian Meronk”,“Victor Perez”,“Ben Griffin”] },
“Harris English”:    { rank:63, country:“USA”, age:34, tier:2, sg:{ total:0.96, ott:0.44, app:0.38, arg:0.08, putt:0.06 }, driving:{ dist:295.8, acc:60.4 }, cutMaking:“78%”, top10Rate:“14%”, top20Rate:“28%”, winRate:“2%”, recentForm:[“T12”,“T6”,“T28”,“T9”,“T18”,“T4”], bestMarkets:[“top_20”,“matchup”], note:“Talented but injury-limited. When healthy, top 20 is realistic. Fade when on any injury report.”, comps:[“Kurt Kitayama”,“Tony Finau”,“Keegan Bradley”] },
“Brendan Steele”:    { rank:64, country:“USA”, age:40, tier:2, sg:{ total:0.68, ott:0.22, app:0.28, arg:0.10, putt:0.08 }, driving:{ dist:283.2, acc:63.8 }, cutMaking:“74%”, top10Rate:“8%”, top20Rate:“18%”, winRate:“0%”, recentForm:[“T24”,“MC”,“T18”,“T11”,“T28”,“T9”], bestMarkets:[“make_cut”], note:“Veteran journeyman — make-cut only bet.”, comps:[“Mark Hubbard”,“Beau Hossler”,“Andrew Novak”] },
“Nate Lashley”:      { rank:65, country:“USA”, age:41, tier:2, sg:{ total:0.74, ott:0.34, app:0.28, arg:0.06, putt:0.06 }, driving:{ dist:289.8, acc:61.8 }, cutMaking:“74%”, top10Rate:“9%”, top20Rate:“20%”, winRate:“1%”, recentForm:[“T22”,“T11”,“T28”,“T8”,“MC”,“T18”], bestMarkets:[“make_cut”,“matchup”], note:“Journeyman. Make-cut bet in weak fields only.”, comps:[“Brendan Steele”,“Mark Hubbard”,“Hayden Buckley”] },
“Michael Kim”:       { rank:66, country:“USA”, age:31, tier:2, sg:{ total:0.64, ott:0.22, app:0.28, arg:0.08, putt:0.06 }, driving:{ dist:283.8, acc:63.4 }, cutMaking:“74%”, top10Rate:“8%”, top20Rate:“19%”, winRate:“0%”, recentForm:[“T22”,“MC”,“T14”,“T9”,“T28”,“T18”], bestMarkets:[“make_cut”,“matchup”], note:“Journeyman — make-cut bet only in non-elevated events.”, comps:[“Beau Hossler”,“Nate Lashley”,“Mark Hubbard”] },
“Sungrae Noh”:       { rank:67, country:“KOR”, age:36, tier:2, sg:{ total:0.68, ott:0.18, app:0.28, arg:0.12, putt:0.10 }, driving:{ dist:280.4, acc:64.8 }, cutMaking:“76%”, top10Rate:“10%”, top20Rate:“22%”, winRate:“1%”, recentForm:[“T18”,“T11”,“T28”,“T9”,“T22”,“T14”], bestMarkets:[“make_cut”,“matchup”], note:“Fringy player — best for make-cut only bets in weak fields.”, comps:[“Beau Hossler”,“Mark Hubbard”,“Hayden Buckley”] },
“Bubba Watson”:      { rank:68, country:“USA”, age:45, tier:2, sg:{ total:0.44, ott:0.68, app:0.08, arg:-0.12, putt:-0.20 }, driving:{ dist:304.8, acc:52.8 }, cutMaking:“67%”, top10Rate:“6%”, top20Rate:“15%”, winRate:“0%”, recentForm:[“MC”,“T28”,“MC”,“T34”,“T18”,“MC”], bestMarkets:[“matchup”], note:“LIV player, fading career. Matchup fade only at current form. Two Masters titles are history.”, comps:[“Phil Mickelson”,“Dustin Johnson”,“Brooks Koepka”] },
“Phil Mickelson”:    { rank:69, country:“USA”, age:53, tier:2, sg:{ total:0.24, ott:0.18, app:0.12, arg:0.10, putt:-0.16 }, driving:{ dist:282.4, acc:58.4 }, cutMaking:“65%”, top10Rate:“4%”, top20Rate:“12%”, winRate:“0%”, recentForm:[“MC”,“T28”,“T44”,“MC”,“T31”,“MC”], bestMarkets:[“matchup”], note:“LIV player — playing for glory not ranking. Best used as FADE. Historical greatness is irrelevant to current betting.”, comps:[“Dustin Johnson”,“Brooks Koepka”,“Bubba Watson”] },
“Billy Horschel”:    { rank:70, country:“USA”, age:37, tier:2, sg:{ total:1.04, ott:0.32, app:0.48, arg:0.14, putt:0.10 }, driving:{ dist:285.4, acc:63.8 }, cutMaking:“82%”, top10Rate:“18%”, top20Rate:“34%”, winRate:“2%”, recentForm:[“T6”,“T18”,“T4”,“T11”,“T28”,“T8”], bestMarkets:[“top_20”,“make_cut”,“matchup”], note:“Reliable veteran. Make cut 82% is trustworthy. Best as top-20 in weaker fields.”, comps:[“Chris Kirk”,“Sepp Straka”,“Keegan Bradley”] },
“Justin Rose (alt)”: { rank:71, country:“ENG”, age:43, tier:2, sg:{ total:1.18, ott:0.44, app:0.54, arg:0.12, putt:0.08 }, driving:{ dist:290.8, acc:63.4 }, cutMaking:“81%”, top10Rate:“20%”, top20Rate:“37%”, winRate:“2%”, recentForm:[“T8”,“T3”,“T19”,“T6”,“T11”,“T25”], bestMarkets:[“top_10”,“top_20”,“make_cut”,“matchup”], note:“See Justin Rose entry above.”, comps:[“Adam Scott”,“Tommy Fleetwood”,“Shane Lowry”] },
“Tiger Woods”:       { rank:999, country:“USA”, age:48, tier:2, sg:{ total:0.0, ott:0.0, app:0.0, arg:0.0, putt:0.0 }, driving:{ dist:278.4, acc:57.4 }, cutMaking:“varies”, top10Rate:“0%”, top20Rate:“5%”, winRate:“0%”, recentForm:[“WD”,“MC”,“WD”,“T47”,“MC”,“WD”], bestMarkets:[], note:“HEALTH STATUS UNKNOWN — do NOT make prop recommendations without confirming he is actually playing. Current form (2024-25) makes any bet except extreme longshot outright speculative.”, comps:[“Phil Mickelson”,“Rickie Fowler”,“Adam Scott”] },
};

// ═══════════════════════════════════════════════════════════════
// COURSE DATABASE — 10 venues (elite analysis + who wins)
// ═══════════════════════════════════════════════════════════════

const PGA_COURSES = {

“Augusta National”: {
location:“Augusta, GA”, par:72, yards:7545,
type:“parkland”, grass:“bentgrass”,
sgPremium:“app”,
keyTraits:[“premium iron play to undulating greens”,“short game around run-off areas”,“drawing ball flight rewarded”,“par 5 scoring (13, 15) favors bombers”,“Amen Corner (11-13) separates the field”,“bentgrass putting”],
whoWins:“Elite iron players who draw the ball. Power helps on par 5s. Must handle pressure and sloppy approaches off the greens.”,
specialists:[“Scottie Scheffler”,“Rory McIlroy”,“Jon Rahm”,“Hideki Matsuyama”,“Adam Scott”,“Jordan Spieth”],
fades:[“Links-only specialists on Bermuda”,“Players who struggle with bump-and-run around greens”],
note:“The Masters field is the best in golf. SG:APP from 150-200 yards is the most predictive stat. Amen Corner changes everything on Sunday. Bentgrass greens reward European-style putting.”,
},

“TPC Sawgrass”: {
location:“Ponte Vedra Beach, FL”, par:72, yards:7255,
type:“parkland”, grass:“bermuda”,
sgPremium:“app”,
keyTraits:[“17th island green par 3”,“water on 18”,“bermuda greens”,“ocean wind”,“precision iron play”,“nerves required”],
whoWins:“Complete players who can handle pressure. Bermuda putters. 17th island green decides many events.”,
specialists:[“Scottie Scheffler”,“Rory McIlroy”,“Xander Schauffele”,“Matt Fitzpatrick”,“Collin Morikawa”],
fades:[“Wild drivers — OOB and water everywhere”,“Players who melt under pressure”],
note:“THE PLAYERS Championship — the 5th major. 17th island par 3 is where tournaments are won and lost. Wind from the ocean changes daily. Best all-around players win here.”,
},

“Riviera Country Club”: {
location:“Pacific Palisades, CA”, par:71, yards:7322,
type:“parkland”, grass:“poa_annua”,
sgPremium:“app”,
keyTraits:[“kikuyu rough heavily penalizes misses”,“poa annua greens”,“iconic par 4 10th (bunker in middle of fairway)”,“precision over power”,“elite field every year”],
whoWins:“Complete precision players. Poa putting specialists. Patrick Cantlay’s home course — he’s won here multiple times.”,
specialists:[“Patrick Cantlay”,“Collin Morikawa”,“Xander Schauffele”,“Russell Henley”,“Matt Fitzpatrick”],
fades:[“Pure power players — length not decisive here”,“Players who can’t putt poa”],
note:“Genesis Invitational. Riviera is ‘The Riviera of the West.’ Kikuyu rough is brutal on misses. Course knowledge matters — experience here is an edge.”,
},

“Augusta National (Masters)”: {
location:“Augusta, GA”, par:72, yards:7545,
type:“parkland”, grass:“bentgrass”,
sgPremium:“app”,
keyTraits:[“same as Augusta National”],
whoWins:“Same as Augusta National entry.”,
specialists:[“Scottie Scheffler”,“Rory McIlroy”,“Jon Rahm”,“Hideki Matsuyama”,“Jordan Spieth”],
fades:[“Links-only specialists”],
note:“This is the Masters entry — same course as Augusta National above.”,
},

“Pebble Beach Golf Links”: {
location:“Pebble Beach, CA”, par:72, yards:7075,
type:“links_adjacent”, grass:“poa_annua”,
sgPremium:“putt”,
keyTraits:[“wind off the Pacific”,“poa annua greens (high variance putting)”,“ocean-side holes (6-10 spectacular but treacherous)”,“18th along the ocean”,“accuracy over power”,“iconic setting”],
whoWins:“Poa specialists and wind managers. Short-game artists. Distance less important than accuracy.”,
specialists:[“Patrick Cantlay”,“Tom Kim”,“Jordan Spieth”,“Collin Morikawa”],
fades:[“Wild drivers”,“Players allergic to poa putting variance”],
note:“AT&T Pebble Beach Pro-Am. Poa annua greens can be bumpy — putting variance is high. Wind off the Pacific is the key variable. Hole 18 along the ocean is one of golf’s most iconic.”,
},

“Pinehurst No. 2”: {
location:“Pinehurst, NC”, par:70, yards:7689,
type:“parkland_hybrid”, grass:“bermuda”,
sgPremium:“app”,
keyTraits:[“domed greens shed errant approaches”,“sand-and-scrub rough (not penal but tricky)”,“bermuda greens”,“precision iron play decisive”,“no water — course is about placement”],
whoWins:“Iron ball-strikers who hit greens in regulation. Domed greens mean anything off the green = difficult up-and-down. Bermuda putting.”,
specialists:[“Scottie Scheffler”,“Xander Schauffele”,“Rory McIlroy”,“Matt Fitzpatrick”],
fades:[“Players relying on recovery — domed greens kill chipping angles”,“Wild drivers into scrub”],
note:“US Open venue. Domed greens are the signature — errant approaches roll off dramatically. Precision > power. Best iron players in the world win US Opens.”,
},

“Royal Troon”: {
location:“Ayrshire, Scotland”, par:71, yards:7385,
type:“links”, grass:“links_fescue”,
sgPremium:“ott”,
keyTraits:[“wind is everything — changes course direction entirely”,“Postage Stamp par 3 (8th) is iconic”,“fescue rough penalizes offline shots”,“bump-and-run short game”,“morning/afternoon draw variance decisive”],
whoWins:“Links specialists. Wind managers. Bump-and-run artists. Patience wins.”,
specialists:[“Rory McIlroy”,“Tommy Fleetwood”,“Shane Lowry”,“Brian Harman”,“Cameron Smith”],
fades:[“Desert specialists”,“Players who can’t flight the ball low”,“High ball hitters in wind”],
note:“The Open Championship venue. Wind direction changes the course entirely — morning vs afternoon draws matter significantly. Links specialists (Rory, Fleetwood, Lowry) thrive. Postage Stamp (8th) is one of golf’s most famous holes.”,
},

“Muirfield Village”: {
location:“Dublin, OH”, par:72, yards:7392,
type:“parkland”, grass:“bentgrass”,
sgPremium:“app”,
keyTraits:[“bentgrass greens”,“tree-lined fairways demand accuracy”,“Jack Nicklaus design rewards complete game”,“challenging rough”,“no weakness tolerated”],
whoWins:“Complete players. Elite iron play. Bentgrass putting. All-around game required — no weak spot tolerated.”,
specialists:[“Scottie Scheffler”,“Rory McIlroy”,“Patrick Cantlay”,“Collin Morikawa”],
fades:[“One-dimensional power players”,“Players with weak approach game”],
note:“Memorial Tournament — Jack’s event. Nicklaus design rewards the complete game. Bentgrass greens are pristine. Tree-lined fairways demand accuracy off the tee.”,
},

“Torrey Pines South”: {
location:“La Jolla, CA”, par:72, yards:7765,
type:“parkland”, grass:“poa_annua”,
sgPremium:“ott”,
keyTraits:[“one of the longest courses on tour”,“ocean breeze key variable”,“poa annua greens”,“cliffside holes”,“morning/afternoon draw variance”],
whoWins:“Long hitters who can putt poa. Morning draw usually better in calm conditions.”,
specialists:[“Scottie Scheffler”,“Patrick Cantlay”,“Rickie Fowler”,“Rory McIlroy”],
fades:[“Short hitters — length is a significant advantage here”,“Bermuda-only putters”],
note:“Farmers Insurance Open. One of the longest courses on tour. Ocean breeze is the key variable. Poa annua greens mean putting variance is high. Morning draw vs afternoon often determines who contends.”,
},

“Quail Hollow Club”: {
location:“Charlotte, NC”, par:71, yards:7600,
type:“parkland”, grass:“bermuda”,
sgPremium:“ott”,
keyTraits:[“The Green Mile (16-17-18) is brutally difficult closer”,“water on three of last four holes”,“bermuda greens”,“power course — long par 4s and 5s”,“approach shots under pressure on back nine”],
whoWins:“Power players who can handle the Green Mile under pressure. Bermuda putters. Rory’s home course on tour.”,
specialists:[“Rory McIlroy”,“Rickie Fowler”,“Justin Thomas”,“Wyndham Clark”],
fades:[“Short hitters — can’t reach par 5s in two”,“Players who melt under closing pressure”],
note:“Wells Fargo Championship. The Green Mile (16-18) decides the tournament every year. Water is everywhere on the closing stretch. Rory McIlroy has won here multiple times — it suits his power game perfectly.”,
},
};

// ── Market definitions ────────────────────────────────────────────────────────
const GOLF_MARKETS = {
outright:   { label:“Tournament Winner”,    note:“Hardest to hit. Best for elite players or massive longshots only. Value starts at +800 for Tier 1.” },
top_5:      { label:“Top 5 Finish”,         note:“4-6x more likely than outright. Best play for elite consistent players like Scheffler, Schauffele.” },
top_10:     { label:“Top 10 Finish”,        note:“Best overall value market. Wide range of viable players every week. Most bankroll-efficient bet.” },
top_20:     { label:“Top 20 Finish”,        note:“High-percentage play for consistent mid-tier players. Target Tier 1 at value odds.” },
make_cut:   { label:“Make the Cut”,         note:“Two-day cut market. High confidence for players with 82%+ cut-making history.” },
miss_cut:   { label:“Miss the Cut”,         note:“Fade play. Best for boom-bust players at difficult courses.” },
frl:        { label:“First Round Leader”,   note:“Volatile but high-upside. Best for power players with good morning draws.” },
matchup:    { label:“Head-to-Head Matchup”, note:“Two-ball or three-ball matchup. Most skill-based market with best edge for sharp bettors.” },
};

// ── Covered course list (for pivot logic) ────────────────────────────────────
// When the current event’s course is NOT in this list, UR Take should:
// 1. Briefly acknowledge the course isn’t in our database
// 2. Pivot IMMEDIATELY to player form + what the data says anyway
// 3. Use the player SG profiles to still give a sharp opinion
// e.g. “We don’t have [course] profiled, but the data still points to Scheffler —
// his SG Total (3.12) is +1.5 over the next man. When in doubt, back the best player.”
const COVERED_COURSES = [
“Augusta National”,“Augusta”,“The Masters”,
“TPC Sawgrass”,“THE PLAYERS”,“Players Championship”,
“Riviera”,“Riviera Country Club”,“Genesis Invitational”,
“Pebble Beach”,“Pebble Beach Golf Links”,“AT&T Pebble Beach”,
“Pinehurst”,“Pinehurst No. 2”,“US Open”,
“Royal Troon”,“The Open”,“The Open Championship”,
“Muirfield Village”,“Memorial”,“Memorial Tournament”,
“Torrey Pines”,“Torrey Pines South”,“Farmers Insurance”,
“Quail Hollow”,“Wells Fargo”,“Wells Fargo Championship”,
];

// ── NFL QB Database ───────────────────────────────────────────────────────────
const NFL_QBS = {
“Josh Allen”:       { team:“BUF”, tier:“ELITE”,    passing:{ gs:17, cmp:69.3, yds:3668, td:25, int:10, ypa:8.0,  rate:102.2, qbr:65.4 }, advanced:{ ontgt:79.9, badTh:13.0, prss:18.0, pktTime:2.5, iay_pa:7.3 }, trend:{ ontgt_delta:+5.1, note:“On-target jumped 5.1pts YoY” }, rushing:{ attPg:6.6, ydsPg:34.1, tdPg:0.82, ypc:5.2, tier:“ELITE RUSHER” }, props:{ passYds:{ floor:215, ceil:310, lean:“OVER in shootouts” }, rushYds:{ floor:25, ceil:65, lean:“OVER most weeks” }, best:“Rushing yards OVER — most reliable Allen prop” }, futures:{ wins:“12-13”, playoff:“95%+”, mvp:“Top-5” }, note:“79.9% on-target plus elite rushing floor = safest QB1 in football.” },
“Drake Maye”:       { team:“NE”,  tier:“ELITE”,    passing:{ gs:17, cmp:72.0, yds:4394, td:31, int:8,  ypa:8.9,  rate:113.5, qbr:77.1 }, advanced:{ ontgt:79.0, badTh:13.8, prss:21.8, pktTime:2.4, iay_pa:9.1 }, rushing:{ attPg:6.1, ydsPg:26.5, tdPg:0.24, ypc:4.4, tier:“STRONG RUSHER” }, props:{ passYds:{ floor:230, ceil:320, lean:“OVER” }, rushYds:{ floor:15, ceil:45, lean:“OVER — market underprices his legs” }, best:“Rushing yards OVER” }, futures:{ wins:“10-12”, playoff:“65-75%”, mvp:“Dark horse” }, note:“QBR 77.1 as a rookie is historically rare.” },
“Patrick Mahomes”:  { team:“KC”,  tier:“ELITE”,    passing:{ gs:14, cmp:62.7, yds:3587, td:22, int:11, ypa:7.1,  rate:89.6,  qbr:68.5 }, advanced:{ ontgt:74.3, badTh:17.9, prss:24.0, pktTime:2.2, iay_pa:7.9 }, rushing:{ attPg:4.6, ydsPg:30.1, tdPg:0.36, ypc:6.6, tier:“ELITE RUSHER” }, props:{ rushYds:{ floor:18, ceil:45, lean:“OVER — 30.1 yds/g at 6.6 Y/att chronically ignored” }, best:“Rushing yards OVER.” }, futures:{ wins:“11-13”, playoff:“85%+”, mvp:“Top-3” }, note:“30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football.” },
“Lamar Jackson”:    { team:“BAL”, tier:“ELITE”,    passing:{ gs:13, cmp:63.6, yds:2549, td:21, int:7,  ypa:8.4,  rate:103.8, qbr:62.7 }, advanced:{ ontgt:72.4, badTh:18.3, prss:23.6, pktTime:2.5, iay_pa:8.8 }, trend:{ ontgt_delta:-6.3, note:“ON-TARGET DROPPED 6.3pts — biggest regression in league.” }, rushing:{ attPg:5.2, ydsPg:26.8, tdPg:0.15, ypc:5.2, tier:“STRONG RUSHER” }, props:{ rushYds:{ floor:30, ceil:75, lean:“OVER every week” }, best:“Rushing yards OVER + TD scorer OVER” }, futures:{ wins:“11-13 healthy”, playoff:“85%+”, mvp:“Top-3 if healthy” }, note:“Rushing floor covers accuracy concerns. Health is the key variable.” },
“Joe Burrow”:       { team:“CIN”, tier:“ELITE”,    passing:{ gs:8,  cmp:66.8, yds:1809, td:17, int:5,  ypa:7.0,  rate:100.7, qbr:63.0, note:“8 games only” }, advanced:{ ontgt:75.0, badTh:11.3, prss:21.7, pktTime:2.3, iay_pa:7.2 }, props:{ passTd:{ pg:2.13, lean:“OVER 1.5 when healthy” }, best:“TD OVER 1.5 when healthy” }, futures:{ wins:“11-13 healthy”, playoff:“80%+” }, note:“80.3% on-target is the real Burrow. Bet TDs aggressively when healthy.” },
“Matthew Stafford”: { team:“LAR”, tier:“ELITE”,    passing:{ gs:17, cmp:65.0, yds:4707, td:46, int:8,  ypa:7.9,  rate:109.2, qbr:71.2 }, advanced:{ ontgt:73.6, badTh:18.1, prss:18.5, pktTime:2.4, iay_pa:9.0 }, props:{ passTd:{ pg:2.71, lean:“OVER 2.5” }, best:“Passing TDs OVER 2.5 — best single-player prop in NFC.” }, futures:{ wins:“11-13”, playoff:“80-85%”, mvp:“Top-3” }, note:“9.0 IAY/PA highest among all starters. TD prop (OVER 2.5) at 2.71/g is most reliable in NFC.” },
“Dak Prescott”:     { team:“DAL”, tier:“ELITE”,    passing:{ gs:17, cmp:67.3, yds:4552, td:30, int:10, ypa:7.6,  rate:99.5,  qbr:70.2 }, advanced:{ ontgt:74.8, badTh:12.5, prss:21.6, pktTime:2.4, iay_pa:8.0 }, props:{ passTd:{ pg:1.76, lean:“OVER 1.5 reliably” }, best:“Lamb receiving props OVER.” }, futures:{ wins:“9-11”, playoff:“55-65%”, mvp:“Top-5 individually” }, note:“12.5% bad throw rate is cleanest among ELITE tier QBs.” },
“Jordan Love”:      { team:“GB”,  tier:“ELITE”,    passing:{ gs:15, cmp:66.3, yds:3381, td:23, int:6,  ypa:7.7,  rate:101.2, qbr:72.7 }, advanced:{ ontgt:77.4, badTh:14.6, prss:22.1, pktTime:2.4, iay_pa:8.7 }, props:{ best:“Love is consistently undervalued.” }, futures:{ wins:“10-12”, playoff:“65-75%”, mvp:“Dark horse” }, note:“Most underrated QB in football. QBR 72.7 with 6 INTs.” },
“Jared Goff”:       { team:“DET”, tier:“STARTER”,  passing:{ gs:17, cmp:68.0, yds:4564, td:34, int:8,  ypa:7.9,  rate:105.5, qbr:57.3 }, advanced:{ ontgt:78.3, badTh:15.8, prss:24.5, pktTime:2.3, iay_pa:6.4 }, props:{ passTd:{ pg:2.0, lean:“OVER 1.5 every week” }, best:“Passing TDs OVER 1.5.” }, futures:{ wins:“11-13”, playoff:“80-85%” }, note:“TD prop (2.0/g) most reliable in NFC. FADE in cold outdoor road games.” },
“Brock Purdy”:      { team:“SF”,  tier:“STARTER”,  passing:{ gs:9,  cmp:69.4, yds:2167, td:20, int:10, ypa:7.6,  rate:100.5, qbr:72.8, note:“9 games only” }, advanced:{ ontgt:82.2, badTh:12.3, prss:21.1, pktTime:2.7, iay_pa:7.5 }, props:{ passTd:{ pg:2.22, lean:“OVER 2.0 when healthy” }, best:“Purdy TD OVER 2.0 when healthy.” }, futures:{ wins:“10-12”, playoff:“70-80% healthy” }, note:“82.2% on-target highest among all starters.” },
“Jalen Hurts”:      { team:“PHI”, tier:“STARTER”,  passing:{ gs:16, cmp:64.8, yds:3224, td:25, int:6,  ypa:7.1,  rate:98.5,  qbr:55.2 }, advanced:{ ontgt:74.0, badTh:16.7, prss:20.0, pktTime:2.5, iay_pa:9.0 }, rushing:{ attPg:6.6, ydsPg:26.3, tdPg:0.50, tier:“STRONG RUSHER” }, props:{ rushYds:{ lean:“OVER every week — designed runs every game” }, best:“Rushing yards OVER. Floor guaranteed.” }, futures:{ wins:“11-13”, playoff:“80-85%”, mvp:“Top-5” }, note:“Rushing floor (designed runs 6.6/g) covers any passing variance.” },
“C.J. Stroud”:      { team:“HOU”, tier:“STARTER”,  passing:{ gs:14, cmp:64.5, yds:3041, td:19, int:8,  ypa:7.2,  rate:92.9,  qbr:61.7 }, advanced:{ ontgt:74.6, badTh:17.6, prss:21.4, pktTime:2.4, iay_pa:7.9 }, props:{ best:“Collins receiving props OVER” }, futures:{ wins:“10-12”, playoff:“75-85%” }, note:“Year 3 with healthy weapons projects top-8 QB.” },
“Trevor Lawrence”:  { team:“JAX”, tier:“STARTER”,  passing:{ gs:17, cmp:60.9, yds:4007, td:29, int:12, ypa:7.2,  rate:91.0,  qbr:58.3 }, advanced:{ ontgt:73.7, badTh:14.4, prss:21.8, pktTime:2.4, iay_pa:8.7 }, rushing:{ attPg:4.8, ydsPg:21.1, tdPg:0.53, tier:“STRONG RUSHER” }, props:{ best:“Total TDs OVER — rushing TDs (0.53/g) + passing TDs.” }, futures:{ wins:“10-12”, playoff:“55-65%” }, note:“Total TD prop (rushing + passing) is the most underrated bet on his slate.” },
“Jayden Daniels”:   { team:“WAS”, tier:“STARTER”,  passing:{ gs:7,  cmp:60.6, yds:1262, td:8,  int:3,  ypa:6.7,  rate:88.1,  qbr:44.7, note:“7 games only” }, advanced:{ ontgt:76.4, badTh:14.9, prss:16.7, pktTime:2.3, iay_pa:7.2 }, rushing:{ attPg:8.3, ydsPg:39.7, tdPg:0.29, tier:“ELITE RUSHER” }, props:{ rushYds:{ lean:“OVER — 39.7 yds/g pace is best in NFC” }, best:“Rushing yards OVER when healthy.” }, futures:{ wins:“9-11”, playoff:“50-60%” }, note:“Health is the only real question.” },
“Caleb Williams”:   { team:“CHI”, tier:“STARTER”,  passing:{ gs:17, cmp:58.1, yds:3942, td:27, int:7,  ypa:6.9,  rate:90.1,  qbr:58.2 }, advanced:{ ontgt:69.8, badTh:20.7, prss:25.1, pktTime:2.5, iay_pa:8.5 }, rushing:{ attPg:4.5, ydsPg:22.8, tier:“STRONG RUSHER” }, props:{ best:“Bears team total OVER — best cast Williams has had.” }, futures:{ wins:“10-12”, playoff:“60-70%” }, note:“Year 2 with better cast is the buy.” },
“Bo Nix”:           { team:“DEN”, tier:“STARTER”,  passing:{ gs:17, cmp:63.4, yds:3931, td:25, int:11, ypa:6.4,  rate:87.8,  qbr:58.3 }, advanced:{ ontgt:77.4, badTh:15.9, prss:19.1, pktTime:2.4, iay_pa:7.3 }, rushing:{ attPg:4.9, ydsPg:20.9, tier:“STRONG RUSHER” }, props:{ best:“Broncos team total UNDER vs elite offenses. Nix rushing OVER.” }, futures:{ wins:“10-12”, playoff:“55-65%” }, note:“RPO scheme is where Denver generates offense. Fade in shootouts.” },
“Baker Mayfield”:   { team:“TB”,  tier:“STARTER”,  passing:{ gs:17, cmp:63.2, yds:3693, td:26, int:11, ypa:6.8,  rate:90.6,  qbr:61.3 }, advanced:{ ontgt:73.7, badTh:15.7, prss:14.8, pktTime:2.3, iay_pa:8.0 }, rushing:{ attPg:3.2, ydsPg:22.5, ypc:6.9, tier:“STRONG RUSHER” }, props:{ best:“Evans TD scorer OVER. Mayfield rushing yards OVER.” }, futures:{ wins:“8-10”, playoff:“50-60%” }, note:“Lowest pressure rate among starters (14.8%). Books underrate Tampa.” },
“Kyler Murray”:     { team:“MIN”, tier:“STARTER”,  passing:{ gs:5,  cmp:68.3, yds:962,  td:6,  int:3,  note:“5 games pre-trade” }, rushing:{ attPg:5.8, ydsPg:34.6, ypc:6.0, tier:“ELITE RUSHER” }, props:{ rushYds:{ lean:“OVER when healthy” }, best:“Vikings team total OVER when Murray healthy.” }, futures:{ wins:“10-13 healthy”, playoff:“70-80% healthy” }, note:“O’Connell scheme + Jefferson is generational. Health is the only ceiling.” },
“Jaxson Dart”:      { team:“NYG”, tier:“BELOW_AVG”, passing:{ gs:12, cmp:63.7, yds:2272, td:15, int:5,  ypa:6.7,  rate:91.7,  qbr:57.5 }, advanced:{ ontgt:72.9, badTh:15.5, prss:23.3, pktTime:2.4, iay_pa:8.1 }, rushing:{ attPg:6.1, ydsPg:34.8, tdPg:0.64, ypc:5.7, tier:“ELITE RUSHER” }, props:{ rushYds:{ lean:“OVER — market ignores 34.8 yds/g” }, best:“Rushing yards OVER every week.” }, futures:{ wins:“7-9”, playoff:“30-40%” }, note:“34.8 rushing yds/g is the best prop edge in the NFC. Market ignores it.” },
“Sam Darnold”:      { team:“SEA”, tier:“STARTER”,  passing:{ gs:17, cmp:67.7, yds:4048, td:25, int:14, ypa:8.5,  rate:99.1,  qbr:55.6, note:“MIN under O’Connell — regression is the base case” }, advanced:{ ontgt:79.8, badTh:14.6, prss:21.0, pktTime:2.4, iay_pa:7.8 }, props:{ best:“Darnold INT OVER 0.5 every week.” }, futures:{ wins:“7-10”, playoff:“40-50%” }, note:“Numbers were O’Connell scheme and Jefferson. Regression is the base case.” },
“Shedeur Sanders”:  { team:“TEN”, tier:“ROOKIE”,   passing:{ gs:0,  note:“2026 DRAFT PICK — Drafted #1 overall by Tennessee Titans (April 2026).” }, advanced:{ ontgt:69.6, badTh:18.0, prss:40.3, note:“College stats from Colorado 2025” }, props:{ best:“Fade Titans early-season totals — market overvalues rookie QBs.” }, futures:{ wins:“5-7”, playoff:“10-15%” }, note:“Most NFL-ready QB in 2026 class. Titans supporting cast is bottom-5.” },
“Cam Ward”:         { team:“TEN”, tier:“BELOW_AVG”, passing:{ gs:17, cmp:59.8, yds:3169, td:15, int:7,  ypa:5.9,  rate:80.2,  qbr:33.2, note:“Was Titans starter before Sanders drafted” }, advanced:{ ontgt:72.6, badTh:19.0, prss:27.8, pktTime:2.4, iay_pa:7.2 }, props:{ best:“Titans team total UNDER regardless of QB.” }, futures:{ wins:“5-8”, playoff:“10-15%” }, note:“Titans situation is a mess. Sanders drafted #1 — Ward is either traded or backup.” },
};

// ── Sport detection ───────────────────────────────────────────────────────────
// ── Sport Detection — Priority Waterfall ─────────────────────────────────────
//
// Architecture: explicit wins over scored. Player names are the highest-confidence
// signal — if a named athlete from a known sport appears, that IS the sport.
// No scoring, no ambiguous weighting. Each tier either fires or falls through.
//
// Tier 1: Direct sportHint from client (tab context) — always trust
// Tier 2: matchupContext.league (structured data from matchup cards)
// Tier 3: Explicit multi-word tournament/league names (unambiguous strings)
// Tier 4: Named athlete lookup (golf players, tennis players, F1 drivers, NFL QBs)
// Tier 5: Strong single-word league identifiers
// Tier 6: Betting-specific vocabulary that only belongs to one sport
// Tier 7: Team names
// Tier 8: Generic fallback (default NFL)
//
// The key principle: a player name is MORE reliable than any keyword score.
// “Scheffler top 10” should never route to NFL regardless of what other words appear.

function detectSport(question, sportHint, matchupContext) {
const q = String(question || “”).toLowerCase();

// ── Tier 1: Client-side sport hint (user is on a specific tab) ──────────────
// This is the most reliable signal — the frontend knows exactly what tab the
// user is on when they ask. Always trust it.
if (sportHint === “nfl”)    return “nfl”;
if (sportHint === “tennis”) return “tennis”;
if (sportHint === “f1”)     return “f1”;
if (sportHint === “nba”)    return “nba”;
if (sportHint === “mlb”)    return “mlb”;
if (sportHint === “golf”)   return “golf”;

// ── Tier 2: Structured matchup context league ───────────────────────────────
const mcLeague = String((matchupContext && matchupContext.league) || “”).toLowerCase();
if (mcLeague.includes(“nfl”))                                         return “nfl”;
if (mcLeague.includes(“atp”) || mcLeague.includes(“wta”) ||
mcLeague.includes(“tennis”))                                      return “tennis”;
if (mcLeague.includes(“pga”) || mcLeague.includes(“golf”))           return “golf”;
if (mcLeague.includes(“f1”) || mcLeague.includes(“formula”))         return “f1”;
if (mcLeague.includes(“nba”) || mcLeague.includes(“basketball”))     return “nba”;
if (mcLeague.includes(“mlb”) || mcLeague.includes(“baseball”))       return “mlb”;

// ── Tier 3: Unambiguous multi-word identifiers ──────────────────────────────
// These strings cannot belong to any other sport — match them first before
// anything that could be misread as a generic word.

// Golf — explicit tournament and terminology
const explicitGolf = [
“pga tour”,“pga championship”,“the masters”,“masters tournament”,“the open championship”,
“british open”,“us open golf”,“ryder cup”,“presidents cup”,“fedex cup”,
“strokes gained”,“sg total”,“sg app”,“sg ott”,“sg putt”,“sg arg”,
“driving distance”,“greens in regulation”,“scrambling percentage”,
“make the cut”,“make cut”,“missed cut”,“first round leader golf”,
“top 10 golf”,“top 5 golf”,“top 20 golf”,“outright golf”,
“hole in one”,“eagle on”,“birdie on”,“par 5”,“par 4”,“par 3”,
“back nine”,“front nine”,“amen corner”,“island green”,
“augusta national”,“tpc sawgrass”,“pebble beach”,“pinehurst”,
“riviera country club”,“muirfield village”,“torrey pines”,“quail hollow”,
“royal troon”,“genesis invitational”,“farmers insurance”,“wells fargo championship”,
“at&t pebble”,“memorial tournament”,“arnold palmer invitational”,“bay hill”,
“waste management open”,“phoenix open”,“tournament of champions”,
“iron play”,“approach shot”,“short game”,“bump and run”,
“parkland course”,“links course”,“bermuda greens”,“poa annua greens”,“bentgrass greens”,
];
for (let i = 0; i < explicitGolf.length; i++) {
if (q.includes(explicitGolf[i])) return “golf”;
}

// Tennis — explicit tournament and terminology
const explicitTennis = [
“roland garros”,“french open”,“wimbledon”,“australian open”,
“indian wells”,“miami open”,“madrid open”,“rome open”,“monte carlo”,
“monte-carlo”,“barcelona open”,“queen’s club”,“halle open”,
“toronto masters”,“montreal masters”,“cincinnati masters”,
“wta tour”,“atp tour”,“atp finals”,“wta finals”,
“surface elo”,“dominance ratio”,“hold percentage”,
“double fault”,“double faults”,“ace count”,“ace rate”,
“break point”,“tiebreak”,“clay court”,“grass court”,
“clay specialist”,“serve and volley”,“second serve”,
“draw path”,“h2h tennis”,“head to head tennis”,
];
for (let i = 0; i < explicitTennis.length; i++) {
if (q.includes(explicitTennis[i])) return “tennis”;
}

// F1 — explicit terminology
const explicitF1 = [
“formula 1”,“formula one”,“grand prix”,“f1 race”,“f1 season”,
“constructor championship”,“driver championship”,
“free practice”,“qualifying f1”,“sprint race f1”,
“pit stop strategy”,“drs zone”,“safety car f1”,
“miami grand prix”,“monaco grand prix”,“canadian grand prix”,
“monaco gp”,“las vegas gp”,“abu dhabi gp”,“bahrain gp”,
“suzuka circuit”,“silverstone f1”,“monza f1”,“spa f1”,
“paul ricard”,“interlagos”,“yas marina”,
“pole position f1”,“fastest lap f1”,
];
for (let i = 0; i < explicitF1.length; i++) {
if (q.includes(explicitF1[i])) return “f1”;
}

// NBA — explicit terminology
const explicitNba = [
“nba finals”,“nba playoffs”,“nba mvp”,“nba champion”,
“eastern conference”,“western conference finals”,
“triple double”,“double double nba”,
“three point percentage”,“field goal percentage nba”,
“fantasy basketball”,“nba prop”,“nba same game parlay”,
];
for (let i = 0; i < explicitNba.length; i++) {
if (q.includes(explicitNba[i])) return “nba”;
}

// MLB — explicit terminology
const explicitMlb = [
“world series”,“american league”,“national league”,
“starting pitcher”,“earned run average”,“strikeout rate”,
“batting average”,“on base percentage”,“slugging percentage”,
“home run prop”,“k prop”,“strikeout prop”,
“park factor”,“statcast”,“exit velocity”,“launch angle”,“spin rate”,
“barrel rate”,“hard hit rate”,“whip “,“fip “,“woba”,“xfip”,
“spring training”,“mlb prop”,“mlb bet”,
];
for (let i = 0; i < explicitMlb.length; i++) {
if (q.includes(explicitMlb[i])) return “mlb”;
}

// ── Tier 4: Named athlete lookup ────────────────────────────────────────────
// This is the most reliable per-question signal. If the user names a specific
// player, we know the sport. A player name overrides any keyword noise.
// “Scheffler top 10 or Mahomes rushing” — first named player wins.
// These lists are exhaustive for each sport’s knowledge base.

// Golf player names — all 75 from PGA_PLAYERS + common references
const golfPlayers = [
“scheffler”,“scottie”,“mcilroy”,“rory”,“schauffele”,“xander”,
“morikawa”,“collin”,“hovland”,“viktor”,“cantlay”,“patrick”,
“rahm”,“jon rahm”,“aberg”,“ludvig”,“clark wyndham”,“wyndham clark”,
“finau”,“tony finau”,“henley”,“russell henley”,“burns sam”,“sam burns”,
“sungjae”,“im sungjae”,“fleetwood”,“tommy fleetwood”,
“fitzpatrick”,“matt fitzpatrick”,“taylor nick”,“nick taylor”,
“cameron smith”,“hatton”,“tyrrell”,“lowry shane”,“shane lowry”,
“matsuyama”,“hideki”,“thomas justin”,“justin thomas”,
“spieth”,“jordan spieth”,“harman”,“brian harman”,
“tom kim”,“macintyre”,“robert macintyre”,“theegala”,“sahith”,
“fowler rickie”,“rickie fowler”,“bradley keegan”,“keegan bradley”,
“adam scott”,“cameron young”,“chris kirk”,“sepp straka”,
“min woo lee”,“nicolai hojgaard”,“rasmus hojgaard”,
“corey conners”,“justin rose”,“akshay bhatia”,“eric cole”,
“emiliano grillo”,“denny mccarthy”,“max greyserman”,“ben griffin”,
“taylor moore”,“mackenzie hughes”,“dustin johnson”,
“brooks koepka”,“bryson dechambeau”,“bryson”,“jake knapp”,
“billy horschel”,“davis riley”,“andrew novak”,“adam hadwin”,
“kurt kitayama”,“garrick higgo”,“harris english”,
“tiger woods”,“phil mickelson”,“bubba watson”,
// common first-name-only references that are unambiguous in golf context
“rory “,“scottie “,“xander “,“collin “,“viktor “,“ludvig “,“hideki “,
];
for (let i = 0; i < golfPlayers.length; i++) {
if (q.includes(golfPlayers[i])) return “golf”;
}

// Tennis player names — ATP + WTA from knowledge base
const tennisPlayers = [
“alcaraz”,“sinner”,“djokovic”,“zverev”,“medvedev”,“tsitsipas”,
“rublev”,“fritz”,“de minaur”,“shelton”,“draper”,“fils”,
“ruud”,“mensik”,“bublik”,“tien”,“lehecka”,“cerundolo”,
“cobolli”,“hurkacz”,“vacherot”,“berrettini”,“musetti”,
“sabalenka”,“swiatek”,“rybakina”,“gauff”,“pegula”,“keys”,
“osaka”,“andreeva”,“paolini”,“kartal”,“zheng”,“muchova”,
“wozniacki”,“halep”,“kvitova”,“kontaveit”,“badosa”,
“jabeur”,“tauson”,“potapova”,“fruhvirtova”,
];
for (let i = 0; i < tennisPlayers.length; i++) {
if (q.includes(tennisPlayers[i])) return “tennis”;
}

// F1 driver names — full 2026 grid
const f1Drivers = [
“antonelli”,“kimi antonelli”,“george russell”,“leclerc”,“charles leclerc”,
“lewis hamilton”,“lando norris”,“oscar piastri”,“max verstappen”,“verstappen”,
“isack hadjar”,“hadjar”,“carlos sainz”,“alexander albon”,“albon”,
“fernando alonso”,“lance stroll”,“pierre gasly”,“franco colapinto”,
“nico hulkenberg”,“hulkenberg”,“gabriel bortoleto”,“bortoleto”,
“oliver bearman”,“bearman”,“esteban ocon”,“liam lawson”,
“arvid lindblad”,“valtteri bottas”,“sergio perez”,
];
for (let i = 0; i < f1Drivers.length; i++) {
if (q.includes(f1Drivers[i])) return “f1”;
}

// NFL player names — QBs + key skill players
const nflPlayers = [
“mahomes”,“josh allen”,“lamar jackson”,“joe burrow”,“dak prescott”,
“jalen hurts”,“brock purdy”,“jared goff”,“matthew stafford”,
“cj stroud”,“c.j. stroud”,“trevor lawrence”,“jordan love”,
“drake maye”,“jayden daniels”,“caleb williams”,“bo nix”,
“baker mayfield”,“kyler murray”,“jaxson dart”,“shedeur sanders”,
“derrick henry”,“james cook”,“jonathan taylor”,“de’von achane”,
“saquon barkley”,“raheem mostert”,“tony pollard”,“kenneth walker”,
“jahmyr gibbs”,“isaiah pacheco”,“breece hall”,“zack moss”,
“tyreek hill”,“stefon diggs”,“davante adams”,“ceedee lamb”,
“justin jefferson”,“puka nacua”,“amon-ra st. brown”,“amr”,
“travis kelce”,“sam laporta”,“tee higgins”,“deebo samuel”,
“nico collins”,“tank dell”,“mike evans”,“chris godwin”,
“cooper kupp”,“deandre hopkins”,“gabe davis”,“keenan allen”,
];
for (let i = 0; i < nflPlayers.length; i++) {
if (q.includes(nflPlayers[i])) return “nfl”;
}

// NBA player names
const nbaPlayers = [
“jokic”,“nikola jokic”,“shai gilgeous-alexander”,“shai”,“sga”,
“luka doncic”,“luka”,“jayson tatum”,“giannis”,“wembanyama”,
“brunson”,“jalen brunson”,“steph curry”,“stephen curry”,
“kevin durant”,“devin booker”,“ja morant”,“anthony edwards”,
“karl-anthony towns”,“tyrese haliburton”,“donovan mitchell”,
“bam adebayo”,“lebron”,“lamelo”,“damian lillard”,“trae young”,
“kyrie irving”,“kyrie”,“anthony davis”,“rudy gobert”,
“jaren jackson”,“lauri markkanen”,“cade cunningham”,
“paolo banchero”,“scottie barnes”,“franz wagner”,“alperen sengun”,
“jaylen brown”,“mikal bridges”,“og anunoby”,“josh hart”,
“evan mobley”,“jamal murray”,“anfernee simons”,“zach lavine”,
“draymond green”,“draymond”,“jordan poole”,
];
for (let i = 0; i < nbaPlayers.length; i++) {
if (q.includes(nbaPlayers[i])) return “nba”;
}

// MLB player names
const mlbPlayers = [
“ohtani”,“shohei”,“mike trout”,“trout”,“aaron judge”,“judge”,
“acuna”,“ronald acuna”,“trea turner”,“francisco lindor”,“lindor”,
“mookie betts”,“freddie freeman”,“pete alonso”,“corbin carroll”,
“gunnar henderson”,“corey seager”,“bryce harper”,“vladmir guerrero”,
“bo bichette”,“jose ramirez”,“julio rodriguez”,“gerrit cole”,
“spencer strider”,“paul skenes”,“blake snell”,“zack wheeler”,
“sandy alcantara”,“corbin burnes”,“logan webb”,“max scherzer”,
];
for (let i = 0; i < mlbPlayers.length; i++) {
if (q.includes(mlbPlayers[i])) return “mlb”;
}

// ── Tier 5: Single-word league identifiers ──────────────────────────────────
if (q.includes(” nfl “) || q.startsWith(“nfl “) || q.endsWith(” nfl”)) return “nfl”;
if (q.includes(” nba “) || q.startsWith(“nba “) || q.endsWith(” nba”)) return “nba”;
if (q.includes(” mlb “) || q.startsWith(“mlb “) || q.endsWith(” mlb”)) return “mlb”;
if (q.includes(” pga “) || q.startsWith(“pga “) || q.endsWith(” pga”)) return “golf”;
if (q.includes(” f1 “)  || q.startsWith(“f1 “)  || q.endsWith(” f1”))  return “f1”;
if (q.includes(“golf”))       return “golf”;
if (q.includes(“tennis”))     return “tennis”;
if (q.includes(“baseball”))   return “baseball”;
if (q.includes(“basketball”)) return “nba”;
if (q.includes(“football”))   return “nfl”;

// ── Tier 6: Sport-specific betting vocabulary ───────────────────────────────
// These words appear almost exclusively in one sport’s betting context.

// Golf-specific betting words
if (q.includes(“make cut”) || q.includes(“missed cut”) ||
q.includes(“top 10 finish”) || q.includes(“top 5 finish”) ||
q.includes(“outright winner golf”) || q.includes(“finishing position”) ||
q.includes(“course fit”) || q.includes(“iron player”) ||
q.includes(“birdie average”) || q.includes(“eagle rate”)) return “golf”;

// Tennis-specific
if (q.includes(“hard court”) || q.includes(“clay court”) ||
q.includes(“grass court”) || q.includes(“service hold”) ||
q.includes(“break of serve”) || q.includes(“bagel set”) ||
q.includes(“wta “) || q.includes(“atp “)) return “tennis”;

// F1-specific
if (q.includes(“pole position”) || q.includes(“pit stop”) ||
q.includes(“fastest lap”) || q.includes(“drs”) ||
q.includes(“power unit”) || q.includes(“chassis”)) return “f1”;

// NBA-specific
if (q.includes(“three pointer”) || q.includes(“3 pointer”) ||
q.includes(“paint points”) || q.includes(“fast break points”) ||
q.includes(“usage rate”) || q.includes(“per 36”) ||
q.includes(“pra “) || q.includes(” pra”)) return “nba”;

// MLB-specific
if (q.includes(“strikeout”) || q.includes(“home run”) ||
q.includes(“batting “) || q.includes(“earned run”) ||
q.includes(“stolen base”) || q.includes(“no-hitter”) ||
q.includes(“bullpen”) || q.includes(“rotation”)) return “mlb”;

// NFL-specific
if (q.includes(“quarterback”) || q.includes(“touchdown pass”) ||
q.includes(“rushing yards”) || q.includes(“passing yards”) ||
q.includes(“receiving yards”) || q.includes(“red zone”) ||
q.includes(“fantasy football”) || q.includes(“super bowl”) ||
q.includes(“tight end”) || q.includes(“wide receiver”) ||
q.includes(“running back”) || q.includes(“win total nfl”) ||
q.includes(“draft pick nfl”) || q.includes(“afc “) ||
q.includes(“nfc “)) return “nfl”;

// ── Tier 7: Team names ──────────────────────────────────────────────────────
const nflTeams = [
“bills”,“patriots”,“dolphins”,“jets”,“ravens”,“bengals”,“browns”,“steelers”,
“texans”,“colts”,“jaguars”,“titans”,“chiefs”,“raiders”,“chargers”,“broncos”,
“cowboys”,“giants”,“eagles”,“commanders”,“bears”,“lions”,“packers”,“vikings”,
“falcons”,“panthers”,“saints”,“buccaneers”,“cardinals”,“rams”,“49ers”,“seahawks”,
];
for (let i = 0; i < nflTeams.length; i++) {
if (q.includes(nflTeams[i])) return “nfl”;
}

const nbaTeams = [
“lakers”,“celtics”,“warriors”,“nuggets”,“bucks”,“heat”,“thunder”,“knicks”,
“sixers”,“nets”,“bulls”,“cavaliers”,“clippers”,“suns”,“mavericks”,“grizzlies”,
“pelicans”,“jazz”,“kings”,“blazers”,“rockets”,“spurs”,“raptors”,“magic”,
“pacers”,“hawks”,“hornets”,“pistons”,“timberwolves”,“wizards”,“cavaliers”,
];
for (let i = 0; i < nbaTeams.length; i++) {
if (q.includes(nbaTeams[i])) return “nba”;
}

const mlbTeams = [
“dodgers”,“yankees”,“red sox”,“cubs”,“mets”,“braves”,“astros”,“padres”,
“phillies”,“giants”,“cardinals”,“brewers”,“mariners”,“rangers”,“twins”,
“guardians”,“orioles”,“blue jays”,“rays”,“white sox”,“tigers”,“royals”,
“athletics”,“angels”,“rockies”,“diamondbacks”,“reds”,“pirates”,“marlins”,“nationals”,
];
for (let i = 0; i < mlbTeams.length; i++) {
if (q.includes(mlbTeams[i])) return “mlb”;
}

// ── Tier 8: Generic fallback ────────────────────────────────────────────────
// If we get here with a prop/bet/parlay keyword and no sport identified,
// default to NFL — it’s the most common general betting sport.
return “nfl”;
}

function getRelevantQBs(question) {
const q = question.toLowerCase();
const relevant = {};
for (const name in NFL_QBS) {
const data = NFL_QBS[name];
const parts = name.toLowerCase().split(” “);
if (parts.some(function(p) { return p.length > 3 && q.includes(p); })) relevant[name] = data;
else if (data.team && q.includes(data.team.toLowerCase())) relevant[name] = data;
}
return Object.keys(relevant).length > 0 ? relevant : NFL_QBS;
}

function getRelevantSkillPlayers(question, nflContext) {
if (!nflContext) return “No skill position data provided.”;
const q = String(question || “”).toLowerCase();
const blocks = String(nflContext).split(”\n\n”);
const matched = blocks.filter(function(block) {
const lower = block.toLowerCase();
const firstLine = lower.split(”\n”)[0] || “”;
const tokens = firstLine.split(”|”).map(function(s) { return s.trim(); });
return tokens.some(function(token) { return token && token.length > 2 && q.includes(token); });
});
if (matched.length > 0) return matched.slice(0, 10).join(”\n\n”);
const generic = [“running back”,“wide receiver”,“tight end”,“touchdown”,“receiving”,“rushing”,“catches”,“yards”,“prop”];
if (generic.some(function(n) { return q.includes(n); })) return blocks.slice(0, 20).join(”\n\n”);
return blocks.slice(0, 10).join(”\n\n”);
}

function summarizeMatchupContext(mc) {
if (!mc) return null;
const parts = [];
if (mc.title)       parts.push(“Title: “ + mc.title);
if (mc.league)      parts.push(“League: “ + mc.league);
if (mc.time)        parts.push(“Time: “ + mc.time);
if (mc.whatMatters) parts.push(“What matters: “ + mc.whatMatters);
if (Array.isArray(mc.quickHitters) && mc.quickHitters.length) parts.push(“Quick hitters: “ + mc.quickHitters.join(” | “));
return parts.join(”\n”);
}

function cleanResponseText(text) {
return String(text || “”)
.replace(/^i[’’]?m ur take.*$/gim, “”)
.replace(/^ur take[:-]\s*/gim, “”)
.replace(/^i am an nfl.*$/gim, “”)
.replace(/^i don[’’]?t have tennis data.*$/gim, “”)
.replace(/^i don[’’]?t cover tennis.*$/gim, “”)
.replace(/^i only cover nfl.*$/gim, “”)
.replace(/^i[’’]?m built for nfl betting only.*$/gim, “”)
.replace(/^wrong sport[^\n]*/gim, “”)
.replace(/^i cover nfl[^\n]*/gim, “”)
.replace(/^that[’’]?s not my area[^\n]*/gim, “”)
.replace(/^i don[’’]?t cover (nba|basketball)[^\n]*/gim, “”)
.replace(/^if you[’’]?re asking (nba|basketball)[^\n]*/gim, “”)
.replace(/^without live data[^\n]*/gim, “”)
.replace(/^without (access to |real-?time |current )[^\n]*/gim, “”)
.replace(/^i don[’’]?t have (access to |real-?time |live |current )[^\n]*/gim, “”)
.replace(/^as of my (knowledge |training )?cutoff[^\n]*/gim, “”)
.replace(/^i can[’’]?t give you a sharp answer[^\n]*/gim, “”)
.replace(/^i can[’’]?t (give|provide) a (sharp|specific|direct)[^\n]*/gim, “”)
.replace(/^the (race )?schedule isn[’’]?t loaded[^\n]*/gim, “”)
.replace(/^i don[’’]?t know which (race|circuit|grand prix)[^\n]*/gim, “”)
.trim();
}

function responseLooksWrongForSport(text, sport) {
const t = String(text || “”).toLowerCase();
if (sport === “tennis”) {
return (
t.includes(“i don’t cover tennis”) ||
t.includes(“built for nfl betting only”) ||
t.includes(“i only cover nfl”) ||
(t.includes(“quarterback”) && !t.includes(“tennis”))
);
}
if (sport === “nfl”) {
return t.includes(“i don’t cover nfl”) || (t.includes(“grand slam”) && !t.includes(“super bowl”));
}
return false;
}

// ── F1 static fallback data ───────────────────────────────────────────────────
// Vercel serverless functions cannot reliably call their own endpoints.
// We embed the 2026 calendar and driver grid directly so F1 questions
// always have context regardless of OpenF1 availability.
// ── 2026 F1 Calendar — verified from formula1.com ────────────────────────────
// Rounds 1-3 complete. Next: Miami May 1-3.
// Results: R1 Russell, R2 Antonelli, R3 Antonelli
var F1_FALLBACK_CALENDAR = [
{ meeting_name: “Australian Grand Prix”,     location: “Melbourne”,   date_start: “2026-03-06T00:00:00”, date_end: “2026-03-08T23:59:00”,  completed: true,  winner: “Russell”   },
{ meeting_name: “Chinese Grand Prix”,        location: “Shanghai”,    date_start: “2026-03-13T00:00:00”, date_end: “2026-03-15T23:59:00”,  completed: true,  winner: “Antonelli” },
{ meeting_name: “Japanese Grand Prix”,       location: “Suzuka”,      date_start: “2026-03-27T00:00:00”, date_end: “2026-03-29T23:59:00”,  completed: true,  winner: “Antonelli” },
{ meeting_name: “Miami Grand Prix”,          location: “Miami”,       date_start: “2026-05-01T00:00:00”, date_end: “2026-05-03T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Canadian Grand Prix”,       location: “Montreal”,    date_start: “2026-05-22T00:00:00”, date_end: “2026-05-24T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Monaco Grand Prix”,         location: “Monaco”,      date_start: “2026-06-05T00:00:00”, date_end: “2026-06-07T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Spanish Grand Prix”,        location: “Barcelona”,   date_start: “2026-06-12T00:00:00”, date_end: “2026-06-14T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Austrian Grand Prix”,       location: “Spielberg”,   date_start: “2026-06-26T00:00:00”, date_end: “2026-06-28T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “British Grand Prix”,        location: “Silverstone”, date_start: “2026-07-03T00:00:00”, date_end: “2026-07-05T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Belgian Grand Prix”,        location: “Spa”,         date_start: “2026-07-17T00:00:00”, date_end: “2026-07-19T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Hungarian Grand Prix”,      location: “Budapest”,    date_start: “2026-07-24T00:00:00”, date_end: “2026-07-26T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Dutch Grand Prix”,          location: “Zandvoort”,   date_start: “2026-08-21T00:00:00”, date_end: “2026-08-23T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Italian Grand Prix”,        location: “Monza”,       date_start: “2026-09-04T00:00:00”, date_end: “2026-09-06T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Spanish Grand Prix (2)”,    location: “Madrid”,      date_start: “2026-09-11T00:00:00”, date_end: “2026-09-13T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Azerbaijan Grand Prix”,     location: “Baku”,        date_start: “2026-09-24T00:00:00”, date_end: “2026-09-26T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Singapore Grand Prix”,      location: “Singapore”,   date_start: “2026-10-09T00:00:00”, date_end: “2026-10-11T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “United States Grand Prix”,  location: “Austin”,      date_start: “2026-10-23T00:00:00”, date_end: “2026-10-25T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Mexico City Grand Prix”,    location: “Mexico City”, date_start: “2026-10-30T00:00:00”, date_end: “2026-11-01T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Sao Paulo Grand Prix”,      location: “Sao Paulo”,   date_start: “2026-11-06T00:00:00”, date_end: “2026-11-08T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Las Vegas Grand Prix”,      location: “Las Vegas”,   date_start: “2026-11-19T00:00:00”, date_end: “2026-11-21T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Qatar Grand Prix”,          location: “Lusail”,      date_start: “2026-11-27T00:00:00”, date_end: “2026-11-29T23:59:00”,  completed: false, winner: null        },
{ meeting_name: “Abu Dhabi Grand Prix”,      location: “Abu Dhabi”,   date_start: “2026-12-04T00:00:00”, date_end: “2026-12-06T23:59:00”,  completed: false, winner: null        },
];

// ── 2026 Championship standings after 3 rounds ───────────────────────────────
// R1 AUS: Russell 1st, Antonelli 2nd, Leclerc 3rd
// R2 CHN: Antonelli 1st, Russell 2nd, Hamilton 3rd
// R3 JPN: Antonelli 1st, Piastri 2nd, Leclerc 3rd
// Mercedes dominant — 4 of 6 podiums. Red Bull/Verstappen yet to podium.
// Full 2026 grid — 11 teams, 22 drivers. Norris is reigning WDC.
// Hadjar at Red Bull, Lindblad at Racing Bulls (rookie). Cadillac new entry.
var F1_FALLBACK_STANDINGS = [
{ position: 1,  full_name: “Kimi Antonelli”,    team_name: “Mercedes”,      points: 62, driver_number: 12 },
{ position: 2,  full_name: “George Russell”,    team_name: “Mercedes”,      points: 43, driver_number: 63 },
{ position: 3,  full_name: “Charles Leclerc”,   team_name: “Ferrari”,       points: 30, driver_number: 16 },
{ position: 4,  full_name: “Oscar Piastri”,     team_name: “McLaren”,       points: 18, driver_number: 81 },
{ position: 5,  full_name: “Lewis Hamilton”,    team_name: “Ferrari”,       points: 15, driver_number: 44 },
{ position: 6,  full_name: “Lando Norris”,      team_name: “McLaren”,       points: 12, driver_number: 4  },
{ position: 7,  full_name: “Max Verstappen”,    team_name: “Red Bull”,      points: 8,  driver_number: 1  },
{ position: 8,  full_name: “Carlos Sainz”,      team_name: “Williams”,      points: 6,  driver_number: 55 },
{ position: 9,  full_name: “Fernando Alonso”,   team_name: “Aston Martin”,  points: 4,  driver_number: 14 },
{ position: 10, full_name: “Isack Hadjar”,      team_name: “Red Bull”,      points: 4,  driver_number: 6  },
{ position: 11, full_name: “Alexander Albon”,   team_name: “Williams”,      points: 2,  driver_number: 23 },
{ position: 12, full_name: “Pierre Gasly”,      team_name: “Alpine”,        points: 1,  driver_number: 10 },
{ position: 13, full_name: “Liam Lawson”,       team_name: “Racing Bulls”,  points: 0,  driver_number: 30 },
{ position: 14, full_name: “Arvid Lindblad”,    team_name: “Racing Bulls”,  points: 0,  driver_number: 8  },
{ position: 15, full_name: “Lance Stroll”,      team_name: “Aston Martin”,  points: 0,  driver_number: 18 },
{ position: 16, full_name: “Franco Colapinto”,  team_name: “Alpine”,        points: 0,  driver_number: 43 },
{ position: 17, full_name: “Nico Hulkenberg”,   team_name: “Audi”,          points: 0,  driver_number: 27 },
{ position: 18, full_name: “Gabriel Bortoleto”, team_name: “Audi”,          points: 0,  driver_number: 5  },
{ position: 19, full_name: “Oliver Bearman”,    team_name: “Haas”,          points: 0,  driver_number: 87 },
{ position: 20, full_name: “Esteban Ocon”,      team_name: “Haas”,          points: 0,  driver_number: 31 },
{ position: 21, full_name: “Valtteri Bottas”,   team_name: “Cadillac”,      points: 0,  driver_number: 77 },
{ position: 22, full_name: “Sergio Perez”,      team_name: “Cadillac”,      points: 0,  driver_number: 11 },
];

function fetchF1LiveData() {
var now      = new Date();
var upcoming = F1_FALLBACK_CALENDAR.filter(function(m) { return new Date(m.date_start) > now; });
var current  = F1_FALLBACK_CALENDAR.filter(function(m) {
return new Date(m.date_start) <= now && now <= new Date(m.date_end);
});
var past     = F1_FALLBACK_CALENDAR.filter(function(m) { return new Date(m.date_end) < now; });
return {
schedule:  { upcoming: upcoming, current: current, past: past, races: F1_FALLBACK_CALENDAR },
standings: F1_FALLBACK_STANDINGS,
session:   null,
};
}

// ── F1 system prompt builder ───────────────────────────────────────────────────
function buildF1SystemPrompt(liveData, matchupCtxStr) {

var STREET_CIRCUITS = [“monaco”,“baku”,“singapore”,“las vegas”,“miami”,“azerbaijan”,“jeddah”];
var POWER_CIRCUITS  = [“monza”,“spa”,“silverstone”,“interlagos”,“baku”];
var HIGH_DOWNFORCE  = [“hungary”,“hungaroring”,“singapore”,“barcelona”,“catalunya”];

var now      = new Date();
var todayStr = now.toLocaleDateString(“en-US”, { weekday:“long”, year:“numeric”, month:“long”, day:“numeric” });

var standingsStr = “Championship standings not loaded.”;
var nextRaceLine = “NEXT RACE: Not yet determined.”;
var nextRaceName = “the next race”;
var upcomingStr  = “”;
var recentStr    = “”;
var circuitType  = “mixed”;
var circuitNote  = “Championship form is the primary signal.”;
var daysUntil    = null;
var isRaceWeek   = false;
var sessionStr   = “”;

if (liveData) {
// Standings
if (Array.isArray(liveData.standings) && liveData.standings.length) {
standingsStr = liveData.standings.slice(0, 10).map(function(d, i) {
var pos  = d.position || (i + 1);
var name = d.full_name || “Driver”;
var team = d.team_name || “”;
var pts  = d.points   || 0;
return pos + “. “ + name + “ (” + team + “) — “ + pts + “ pts”;
}).join(”\n”);
}

var schedule = liveData.schedule || {};
var allRaces = Array.isArray(schedule.races) ? schedule.races : [];
var upcoming = Array.isArray(schedule.upcoming) ? schedule.upcoming : [];
var current  = Array.isArray(schedule.current)  ? schedule.current  : [];

// Recent completed races — last 3
var completed = allRaces.filter(function(r) { return r.completed && r.winner; });
if (completed.length) {
recentStr = “RECENT RESULTS:\n” + completed.slice(-3).reverse().map(function(r) {
return r.meeting_name + “: Winner — “ + r.winner;
}).join(”\n”);
}

var activeRace = current[0] || upcoming[0] || null;
if (activeRace) {
nextRaceName = activeRace.meeting_name || “Next Grand Prix”;
var loc = activeRace.location || “TBD”;
var dateStr = “TBD”;
if (activeRace.date_start) {
var rd = new Date(activeRace.date_start);
dateStr   = rd.toLocaleDateString(“en-US”, { month:“short”, day:“numeric” });
daysUntil = Math.ceil((rd - now) / (1000 * 60 * 60 * 24));
}
var isLive = current.length > 0;
nextRaceLine = (isLive ? “ACTIVE RACE WEEKEND: “ : “NEXT RACE: “) +
nextRaceName + “ — “ + loc + “ (” + dateStr + “)” +
(daysUntil !== null ? “ — “ + daysUntil + “ days away” : “”);
isRaceWeek = isLive || (daysUntil !== null && daysUntil <= 7);

```
// Circuit classification
var venueLower = (loc + " " + nextRaceName).toLowerCase();
if (STREET_CIRCUITS.some(function(c) { return venueLower.includes(c); })) {
  circuitType = "STREET CIRCUIT";
  circuitNote = "Miami is a semi-street/street-adjacent circuit. Qualifying position is critical — track position is nearly everything. Safety car near-certain. Antonelli pole-to-win is the primary play. Mercedes PU advantage holds in the straights.";
} else if (POWER_CIRCUITS.some(function(c) { return venueLower.includes(c); })) {
  circuitType = "POWER CIRCUIT";
  circuitNote = "Engine advantage is decisive. Mercedes PU edge is at maximum here. Antonelli and Russell are the primary race winner plays. Norris and Verstappen are fades.";
} else if (HIGH_DOWNFORCE.some(function(c) { return venueLower.includes(c); })) {
  circuitType = "HIGH DOWNFORCE";
  circuitNote = "Aero efficiency decides the race. Ferrari competitive here — Leclerc becomes a live race winner. Mercedes still leads constructor battle.";
} else {
  circuitNote = "Championship form is the primary signal. Mercedes structural edge holds at mixed-type circuits.";
}
```

}

if (upcoming.length) {
upcomingStr = upcoming.slice(0, 5).map(function(m) {
var d = m.date_start ? new Date(m.date_start).toLocaleDateString(“en-US”, { month:“short”, day:“numeric” }) : “TBD”;
return (m.meeting_name || “Race”) + “ — “ + (m.location || “TBD”) + “ (” + d + “)”;
}).join(”\n”);
}

var sess = liveData.session;
if (sess && sess.session_name) {
sessionStr = “LATEST SESSION: “ + sess.session_name + “ — “ + (sess.meeting_name || “”) + (sess.location ? “ at “ + sess.location : “”);
}
}

var weekContext = isRaceWeek
? “RACE WEEK — “ + nextRaceName + (daysUntil !== null ? “ is “ + daysUntil + “ days away” : “ is this weekend”) + “. Focus: circuit-specific advantages, qualifying vs race pace, podium props.”
: “OFF WEEK — No race this weekend. Best window for futures. Focus: championship outright value, upcoming circuit edges.”;

var prompt = “You are Under Review — a sharp F1 betting intelligence tool.\n\n”;
prompt += “IDENTITY: Sharp F1 analyst. Lead with the take. Never hedge. Never open with a limitation.\n\n”;

prompt += “CRITICAL RULES:\n”;
prompt += “1. NEVER open with a limitation or data gap. ALWAYS lead with the lean.\n”;
prompt += “2. Use recent results (below) to inform momentum — Antonelli has won 2 of 3 races.\n”;
prompt += “3. Name the NEXT race correctly — do not reference completed races as upcoming.\n”;
prompt += “4. Always state the circuit type and what it means for the betting angle.\n\n”;

prompt += “RESPONSE FORMAT:\n”;
prompt += “One sharp opening sentence (the lean). Then:\n”;
prompt += “THE BET:\n• [Driver] — [market] — [key reason]\n”;
prompt += “FADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n”;

prompt += “CRITICAL FORMATTING RULES:\n”;
prompt += “NEVER use markdown — no ##, no —, no | table pipes, no ** bold markers.\n”;
prompt += “For finishing order predictions, use plain numbered list only:\n”;
prompt += “1. Driver Name (Team) — one-line reason\n”;
prompt += “2. Driver Name (Team) — one-line reason\n”;
prompt += “No tables. No headers with ##. No horizontal rules. Plain text only.\n\n”;

prompt += “THE COMPLETE 2026 F1 GRID — MEMORIZE THIS. USE ONLY THESE 22 DRIVERS. NO OTHERS EXIST:\n”;
prompt += “1. Kimi Antonelli (Mercedes)\n”;
prompt += “2. George Russell (Mercedes)\n”;
prompt += “3. Charles Leclerc (Ferrari)\n”;
prompt += “4. Lewis Hamilton (Ferrari)\n”;
prompt += “5. Lando Norris (McLaren)\n”;
prompt += “6. Oscar Piastri (McLaren)\n”;
prompt += “7. Max Verstappen (Red Bull)\n”;
prompt += “8. Isack Hadjar (Red Bull)\n”;
prompt += “9. Carlos Sainz (Williams)\n”;
prompt += “10. Alexander Albon (Williams)\n”;
prompt += “11. Fernando Alonso (Aston Martin)\n”;
prompt += “12. Lance Stroll (Aston Martin)\n”;
prompt += “13. Pierre Gasly (Alpine)\n”;
prompt += “14. Franco Colapinto (Alpine)\n”;
prompt += “15. Nico Hulkenberg (Audi)\n”;
prompt += “16. Gabriel Bortoleto (Audi)\n”;
prompt += “17. Oliver Bearman (Haas)\n”;
prompt += “18. Esteban Ocon (Haas)\n”;
prompt += “19. Liam Lawson (Racing Bulls)\n”;
prompt += “20. Arvid Lindblad (Racing Bulls)\n”;
prompt += “21. Valtteri Bottas (Cadillac)\n”;
prompt += “22. Sergio Perez (Cadillac)\n”;
prompt += “CRITICAL: Yuki Tsunoda is NOT on the 2026 grid — do not mention him. Kevin Magnussen is NOT on the grid. Zhou Guanyu is NOT on the grid. Jack Doohan is NOT on the grid. These drivers do not exist in 2026. If you include any of them you are wrong.\n\n”;

prompt += “2026 POWER UNIT ORDER (most important F1 signal):\n”;
prompt += “1. Mercedes (Antonelli, Russell) — best PU on grid. 4 of 6 podiums in first 3 races.\n”;
prompt += “2. Ferrari (Leclerc, Hamilton) — closes gap at high-downforce circuits\n”;
prompt += “3. McLaren (Norris, Piastri) — competitive but overpriced on 2025 reputation\n”;
prompt += “4. Red Bull (Verstappen, Hadjar) — Honda PU deficit. Zero podiums in first 3 races.\n\n”;

prompt += “PREDICTED FINISHING RANGE FOR TOP 15 (use this as a guide):\n”;
prompt += “P1-2: Antonelli, Russell (Mercedes dominance)\n”;
prompt += “P3-4: Leclerc, Hamilton (Ferrari closes at street circuits)\n”;
prompt += “P5-6: Piastri, Norris (McLaren midfield, still ahead of Red Bull)\n”;
prompt += “P7-8: Sainz, Alonso (Williams and Aston Martin solid midfield)\n”;
prompt += “P9-10: Verstappen, Hadjar (Red Bull — ALWAYS include Verstappen ahead of Albon/Gasly/Stroll regardless of PU deficit. He is a 4x champion — he always extracts maximum from the car)\n”;
prompt += “P11-15: Albon, Gasly, Colapinto, Stroll, Hulkenberg/Bortoleto/Bearman/Ocon/Lawson/Lindblad/Bottas/Perez\n”;
prompt += “RULE: Verstappen and Hadjar MUST appear in every top 15 prediction. Red Bull is midfield, not backmarker.\n\n”;

prompt += “KEY NARRATIVE: Antonelli is the 2026 championship leader. 2 wins, 1 second place in 3 races. \n”;
prompt += “Russell won Australia. Mercedes is dominant. Verstappen is in crisis — zero podiums.\n”;
prompt += “Norris/Piastri are the fade — overpriced on 2025 reputation, McLaren is midfield in 2026.\n\n”;

prompt += “CIRCUIT CHEAT SHEET:\n”;
prompt += “Street/semi-street = qualifying is everything. Pole sitter wins. Safety car near-certain.\n”;
prompt += “Power circuit = Mercedes wins. Back Antonelli/Russell hard.\n”;
prompt += “High downforce = Ferrari competitive. Leclerc race winner is live.\n\n”;

prompt += “TODAY: “ + todayStr + “\n”;
prompt += weekContext + “\n\n”;

prompt += nextRaceLine + “\n”;
prompt += “CIRCUIT TYPE: “ + circuitType + “\n”;
prompt += “BETTING NOTE: “ + circuitNote + “\n\n”;

if (recentStr) prompt += recentStr + “\n\n”;

prompt += “CHAMPIONSHIP STANDINGS (after 3 rounds)\n” + standingsStr + “\n\n”;

if (upcomingStr) prompt += “UPCOMING RACES\n” + upcomingStr + “\n\n”;
if (sessionStr)  prompt += sessionStr + “\n\n”;

if (matchupCtxStr) prompt += “MATCHUP CONTEXT\n” + matchupCtxStr + “\n\n”;

return prompt;
}

// ── NBA system prompt builder ─────────────────────────────────────────────────
function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
var ctx = nbaContext || {};

var now      = new Date();
var todayStr = now.toLocaleDateString(“en-US”, { weekday:“long”, year:“numeric”, month:“long”, day:“numeric” });
var phase    = (ctx.seasonContext && ctx.seasonContext.phase) || “NBA Season Active”;

// ── Live scoreboard ───────────────────────────────────────────────────────────
var gamesList = ctx.todaysGames || [];
var gamesStr  = “No games on today’s schedule.”;
var hasGames  = gamesList.length > 0;

if (hasGames) {
gamesStr = gamesList.map(function(g) {
var away = (g.awayTeam && g.awayTeam.tricode) || (g.awayTeam && g.awayTeam.name) || “AWAY”;
var home = (g.homeTeam && g.homeTeam.tricode) || (g.homeTeam && g.homeTeam.name) || “HOME”;
var code = g.statusCode;
var awayS = (g.awayTeam && g.awayTeam.score) != null ? g.awayTeam.score : “”;
var homeS = (g.homeTeam && g.homeTeam.score) != null ? g.homeTeam.score : “”;
if (code === 3) return away + “ “ + awayS + “ @ “ + home + “ “ + homeS + “ — FINAL”;
if (code === 2) return away + “ “ + awayS + “ @ “ + home + “ “ + homeS + “ — LIVE Q” + (g.period||””);
return away + “ @ “ + home + “ — “ + (g.status || “Scheduled”);
}).join(”\n”);
}

// ── Game totals — pace proxy ──────────────────────────────────────────────────
var totalsStr = “”;
var gameTotals = ctx.gameTotals || {};
if (Object.keys(gameTotals).length) {
var tLines = [];
for (var gk in gameTotals) {
var t = gameTotals[gk];
var paceNote = t.pace === “HIGH” ? “ — HIGH PACE (elevated counting stats, back OVER props)” :
t.pace === “LOW”  ? “ — LOW PACE (fade counting stat overs)” : “”;
tLines.push(gk + “: “ + t.total + paceNote);
}
totalsStr = tLines.join(”\n”);
}

// ── Prop lines ────────────────────────────────────────────────────────────────
var propLinesStr = “”;
var propLines = ctx.propLines || [];
var hasProps = propLines.length > 0;

if (hasProps) {
var grouped = {};
for (var li = 0; li < propLines.length; li++) {
var pl = propLines[li];
var k  = pl.player + “|” + pl.prop;
if (!grouped[k]) grouped[k] = { player: pl.player, prop: pl.prop, game: pl.game, over: null, under: null };
if (pl.side === “Over”)  grouped[k].over  = pl.line + “ (” + (pl.odds > 0 ? “+” : “”) + pl.odds + “)”;
if (pl.side === “Under”) grouped[k].under = pl.line;
}
var pEntries = Object.values(grouped).slice(0, 80);
propLinesStr = pEntries.map(function(e) {
var sides = e.over ? “OVER “ + e.over : “”;
if (e.under) sides += (sides ? “ / UNDER “ : “UNDER “) + e.under;
return e.player + “ — “ + e.prop.toUpperCase() + “ — “ + sides + “ [” + e.game + “]”;
}).join(”\n”);
}

// ── Season averages (ESPN — current teams) ────────────────────────────────────
var seasonAvgsStr = “”;
var playerStats = ctx.playerStats || [];
var hasStats = playerStats.length > 0;

if (hasStats) {
seasonAvgsStr = playerStats.slice(0, 60).map(function(p) {
var pra = ((parseFloat(p.pts)||0)+(parseFloat(p.reb)||0)+(parseFloat(p.ast)||0)).toFixed(1);
return p.name + “ (” + p.team + “): “ + p.pts + “pts/” + p.reb + “reb/” + p.ast + “ast | PRA “ + pra;
}).join(”\n”);
}

// ── Recent form (NBA Stats game logs) ────────────────────────────────────────
var recentFormStr = ctx.recentForm || “”;

// ── Curated betting philosophy ────────────────────────────────────────────────
var playerDbStr = “”;
if (ctx.playerDb && Object.keys(ctx.playerDb).length > 0) {
var q       = (ctx.question || “”).toLowerCase();
var entries = Object.entries(ctx.playerDb);
var propSet = new Set(propLines.map(function(p) { return p.player && p.player.toLowerCase(); }).filter(Boolean));

var mentioned = entries.filter(function(e) {
var ln = e[0].toLowerCase().split(” “).pop();
return q.includes(e[0].toLowerCase()) || q.includes(ln);
});
var playing = entries.filter(function(e) {
var n = e[0].toLowerCase(); var ln = n.split(” “).pop();
return !q.includes(n) && !q.includes(ln) &&
(propSet.has(n) || Array.from(propSet).some(function(p){return p&&p.includes(ln);}));
});
var others = entries.filter(function(e) {
var n = e[0].toLowerCase(); var ln = n.split(” “).pop();
return !q.includes(n) && !q.includes(ln) &&
!propSet.has(n) && !Array.from(propSet).some(function(p){return p&&p.includes(ln);});
});

var ordered = mentioned.concat(playing).concat(others.slice(0,10)).slice(0, 30);
playerDbStr = ordered.map(function(entry) {
var name = entry[0]; var p = entry[1];
var pFloor = (p.props&&p.props.pra&&p.props.pra.floor)||(p.props&&p.props.pts&&p.props.pts.floor)||”—”;
var pCeil  = (p.props&&p.props.pra&&p.props.pra.ceil) ||(p.props&&p.props.pts&&p.props.pts.ceil) ||”—”;
var lean   = (p.props&&p.props.pra&&p.props.pra.lean) ||(p.props&&p.props.pts&&p.props.pts.lean) ||”—”;
var angles = (p.bettingAngles||[]).slice(0,2).join(” | “);
return name + “ | “ + p.tier + “ | PRA range “ + pFloor + “-” + pCeil + “ | “ + lean + (angles ? “ | “+angles : “”);
}).join(”\n”);
}

var prompt = “You are Under Review — a sharp sports betting intelligence tool covering NBA, NFL, tennis, and F1.\n\n”;

prompt += “IDENTITY: Sharp betting analyst. Lead with the take. Never hedge. Never open with what you don’t have.\n\n”;

prompt += “ABSOLUTE RULES:\n”;
prompt += “1. NEVER open with a limitation, a data gap, or what you are missing. ALWAYS lead with the lean.\n”;
prompt += “2. If prop lines are loaded — cite the exact line and odds. If not loaded — use the philosophy database to give directional leans.\n”;
prompt += “3. If season averages are loaded — use them for team assignments (they reflect all trades). If not — use only player names, not teams.\n”;
prompt += “4. NEVER recommend props for a game marked FINAL.\n”;
prompt += “5. NEVER ask the user to confirm data availability. You work with what you have and give the best answer possible.\n”;
prompt += “6. A player appearing in tonight’s prop lines is healthy and active. Recommend freely.\n\n”;
prompt += “TE VOLUME HIERARCHY — 2025 ACTUALS (use this, not training data):\n”;
prompt += “1. Trey McBride (ARI): 126 rec, 1239 yds, 7.4 rec/g — leads ALL TEs in volume\n”;
prompt += “2. Brock Bowers (LVR): Elite when healthy — 5.3 rec/g\n”;
prompt += “3. Travis Kelce (KC): 76 rec, 851 yds, 4.5 rec/g, 3 TDs — THIRD in volume, age-37 decline real\n”;
prompt += “When asked ‘top TE by volume’ lead with McBride. Kelce is relevant for Mahomes target share but is NOT the volume king — that is factually wrong.\n\n”;

prompt += “WHAT TO DO WHEN DATA IS MISSING:\n”;
prompt += “No prop lines? Use PRA floor/ceiling from the philosophy database. Say ‘directional lean’ not ‘I can’t answer’.\n”;
prompt += “No season averages? Use the curated database for player context. Omit team abbreviations.\n”;
prompt += “No game logs? Skip streak context. Still give the take.\n”;
prompt += “No games? Do NOT just say the schedule is dark. Instead:\n”;
prompt += “1. Acknowledge briefly (one sentence max).\n”;
prompt += “2. Give the best FUTURES angle — championship odds, series props, player awards.\n”;
prompt += “3. Name a specific player and specific futures bet that has value RIGHT NOW.\n”;
prompt += “NBA PLAYOFF CONTEXT: NBA Playoffs begin April 19, 2026. Top seeds: OKC, CLE (West/East leaders). Best futures plays: SGA MVP, Jokic PRA series props, Celtics/Cavs Finals futures.\n\n”;

prompt += “CRITICAL FORMATTING RULES — NON-NEGOTIABLE:\n”;
prompt += “NEVER use markdown. No ##, no —, no ** bold, no - bullet points, no numbered lists with explanations.\n”;
prompt += “Write in plain sentences and short paragraphs only.\n”;
prompt += “Never explain how you work or what your format is. Just give the answer.\n\n”;

prompt += “RESPONSE FORMAT:\n”;
prompt += “One sharp opening sentence (the lean). Then:\n”;
prompt += “THE PLAY:\n• [Player] — [PROP OVER/UNDER LINE] ([ODDS if known]) — [key reason]\n”;
prompt += “FADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n”;

prompt += “KEY PRINCIPLES:\n”;
prompt += “PRA = primary vehicle (pts+reb+ast combined — lower variance than any single stat).\n”;
prompt += “Game total 228+ = high pace = back OVER props across the board.\n”;
prompt += “Elite rebounders vs undersized frontcourts = OVER. Always.\n”;
prompt += “Injury replacement = highest-confidence edge. Name who benefits explicitly.\n\n”;

prompt += “TODAY: “ + todayStr + “\n”;
prompt += “NBA PHASE: “ + phase + “\n\n”;

// Always include games — this always works (NBA CDN)
prompt += “TONIGHT’S GAMES\n” + gamesStr + “\n\n”;

// Game totals if available
if (totalsStr) {
prompt += “GAME TOTALS (pace proxy)\n” + totalsStr + “\n\n”;
}

// Prop lines if available
if (hasProps && propLinesStr) {
prompt += “LIVE PROP LINES — cite these exact numbers\n” + propLinesStr + “\n\n”;
} else {
prompt += “PROP LINES: Not yet posted for tonight. Use curated database for directional leans.\n\n”;
}

// Recent form if available
if (recentFormStr) {
prompt += “RECENT FORM — cite these in your response\n” + recentFormStr + “\n\n”;
}

// Season averages if available (ESPN — reflects trades)
if (hasStats && seasonAvgsStr) {
prompt += “SEASON AVERAGES (ESPN — teams are current, reflects all trades)\n” + seasonAvgsStr + “\n\n”;
} else {
prompt += “SEASON AVERAGES: Not loaded this request. Use curated database. Do not assign teams.\n\n”;
}

// Always include philosophy database
if (playerDbStr) {
prompt += “BETTING PHILOSOPHY DATABASE\n”;
if (hasStats) {
prompt += “Note: Use Season Averages above for team assignments, not this database.\n”;
}
prompt += playerDbStr + “\n\n”;
}

if (matchupCtxStr) prompt += “MATCHUP CONTEXT\n” + matchupCtxStr + “\n\n”;

return prompt;
}

// ── MLB system prompt builder ─────────────────────────────────────────────────

// ── Golf System Prompt ────────────────────────────────────────────────────────
function buildGolfSystemPrompt(ctx) {
var currentEvent   = (ctx && ctx.currentEvent) || null;
var odds           = (ctx && ctx.odds)         || {};
var question       = (ctx && ctx.question)     || “”;
// Player DB lives in this file — no payload needed
var playerDb       = typeof PGA_PLAYERS !== “undefined” ? PGA_PLAYERS : {};
var courseDb       = typeof PGA_COURSES !== “undefined” ? PGA_COURSES : {};
var coveredCourses = typeof COVERED_COURSES !== “undefined” ? COVERED_COURSES : [];

// Detect if current course is in our database
var courseName = currentEvent ? (currentEvent.course || currentEvent.name || “”) : “”;
var courseNameLower = courseName.toLowerCase();
var courseIsCovered = coveredCourses.some(function(c) {
return courseNameLower.includes(c.toLowerCase()) || c.toLowerCase().includes(courseNameLower);
});

// Find course data if covered
var courseData = null;
if (courseDb) {
for (var cKey in courseDb) {
if (cKey.toLowerCase().includes(courseNameLower) || courseNameLower.includes(cKey.toLowerCase())) {
courseData = courseDb[cKey];
break;
}
}
}

// Build leaderboard string
var leaderStr = “”;
if (currentEvent && currentEvent.leaderboard && currentEvent.leaderboard.length > 0) {
leaderStr = “CURRENT LEADERBOARD (” + currentEvent.round + “):\n”;
leaderStr += currentEvent.leaderboard.slice(0, 15).map(function(p) {
return p.position + “. “ + p.name + “ (” + p.country + “) — “ + p.score + (p.thru && p.thru !== “—” ? “ | Thru “ + p.thru : “”);
}).join(”\n”);
}

// Build outright odds string
var oddsStr = “”;
if (odds && odds.outrights && odds.outrights.length > 0) {
oddsStr = “CURRENT OUTRIGHT ODDS:\n”;
oddsStr += odds.outrights.slice(0, 20).map(function(o) {
return o.player + “: “ + (o.odds > 0 ? “+” : “”) + o.odds;
}).join(”\n”);
}

// Build elite player profiles string — include top 25 most relevant
var playerStr = “”;
var playerKeys = Object.keys(playerDb).filter(function(k) { return playerDb[k].tier === 1; }).slice(0, 25);
if (playerKeys.length > 0) {
playerStr = “PLAYER DATABASE (SG = strokes gained vs field per round):\n”;
playerStr += playerKeys.map(function(name) {
var p = playerDb[name];
if (!p || !p.sg) return “”;
var form = (p.recentForm || []).join(”, “);
var markets_list = (p.bestMarkets || []).join(”, “);
return name + “ | Rank “ + p.rank + “ | SG Total: “ + p.sg.total + “ | OTT: “ + p.sg.ott + “ | APP: “ + p.sg.app + “ | ARG: “ + p.sg.arg + “ | PUTT: “ + p.sg.putt +
“\n  Form (last 6): “ + form +
“\n  Cut: “ + (p.cutMaking||”?”) + “ | Top10: “ + (p.top10Rate||”?”) + “ | Win: “ + (p.winRate||”?”) +
“\n  Best markets: “ + markets_list +
“\n  Note: “ + (p.note||””);
}).filter(Boolean).join(”\n\n”);
}

var courseSection = “”;
if (courseData) {
courseSection = “\nCURRENT COURSE — “ + courseName.toUpperCase() + “:\n” +
“Type: “ + courseData.type + “ | Grass: “ + courseData.grass + “ | SG premium: “ + courseData.sgPremium + “\n” +
“Key traits: “ + (courseData.keyTraits || []).join(”, “) + “\n” +
“Who wins: “ + (courseData.whoWins || “”) + “\n” +
“Course specialists: “ + (courseData.specialists || []).join(”, “) + “\n” +
“Fades: “ + (courseData.fades || []).join(”, “) + “\n” +
“Note: “ + (courseData.note || “”);
} else if (courseName) {
courseSection = “\nCURRENT COURSE — “ + courseName.toUpperCase() + “:\n” +
“This specific course is not in our database yet. However, use the player SG profiles to still give a sharp, confident opinion. “ +
“When the course isn’t covered, lead with player form and SG data — the best player by SG Total is still the best bet. “ +
“Mention the gap in coverage briefly, then immediately pivot to the sharpest play using available data.”;
}

var eventSection = “”;
if (currentEvent) {
eventSection = “\nCURRENT EVENT: “ + currentEvent.name +
“\nCourse: “ + currentEvent.course +
“\nLocation: “ + currentEvent.location +
“\nRound: “ + currentEvent.round + “\n”;
}

// Build the event anchor FIRST so the model can’t ignore it
var eventAnchor = “”;
if (currentEvent && currentEvent.name) {
eventAnchor = “THIS WEEK’S EVENT: “ + currentEvent.name + “\n” +
“Course: “ + currentEvent.course + “ — “ + currentEvent.location + “\n” +
“Round: “ + currentEvent.round + “\n” +
“CRITICAL: All analysis must be anchored to THIS event and THIS course. “ +
“Do not reference other events or use highlights from past tournaments as your primary angle. “ +
“If the current event IS the Masters at Augusta National, then Augusta analysis is correct and required.\n\n”;
} else {
eventAnchor = “CURRENT EVENT: Not loaded — use player SG profiles to give best available lean.\n\n”;
}

var prompt = “You are Under Review — the sharpest golf betting intelligence tool available.\n\n” +
eventAnchor +

“IDENTITY AND VOICE:\n” +
“Sharp golf betting analyst — not a generic chatbot. Lead every response with the lean. Give the recommendation first, data second.\n” +
“Your voice: confident, specific, data-driven. Never hedge when you have data. Never say ‘it depends’ without immediately picking a side.\n” +
“CRITICAL RULE: NEVER ask the user for more information. NEVER say ‘I need the course name’ or ‘tell me the event.’ You already have the player database. Use it. Make a call.\n” +
“If the current event is unknown, use the player SG profiles to give a confident answer anyway. The best player by SG Total is always a defensible recommendation.\n” +
“Format: Lead with the play. Back it with SG data. Call out the fade explicitly. End with the market recommendation.\n\n” +

“GOLF BETTING INTELLIGENCE:\n” +
“Strokes Gained (SG) is the core metric. SG Total = overall vs field. OTT = off the tee. APP = approach. ARG = around green. PUTT = putting.\n” +
“Course type determines which SG category matters most:\n” +
“  • Parkland / bentgrass → SG:APP and SG:PUTT are most predictive\n” +
“  • Links → SG:OTT and wind management; SG:ARG matters for bump-and-run\n” +
“  • Desert → SG:OTT and SG:APP; distance advantage amplified on wide layouts\n” +
“  • Poa annua greens → putting variance increases; SG:PUTT less predictive\n” +
“  • Bermuda greens → favor players who grew up on bermuda\n\n” +

“MARKET GUIDANCE:\n” +
“Outright: Only for elite players or genuine longshots. Scheffler below +400 is juice, not value.\n” +
“Top 5: Best market for Tier 1 consistency plays (Scheffler, Schauffele, Morikawa). Target 7/2 or better.\n” +
“Top 10: Best overall bankroll market. Wide range of viable players. Target -120 or better.\n” +
“Make Cut: Only recommend for players with 82%+ cut rate. 90%+ makes it a near-lock.\n” +
“FRL: High variance but high value. Best for power players with morning draws.\n” +
“Matchup H2H: Most skill-based market. Best edge for sharp bettors.\n\n” +

“PIVOT RULE — UNCOVERED COURSE OR UNKNOWN EVENT:\n” +
“If the current event or course is unknown, make a call anyway. NEVER ask the user for more info.\n” +
“Use player SG profiles and recent form to give a confident lean regardless of course data.\n” +
“Example: Without a specific course loaded, Scheffler is the play — SG Total 3.12, won 3 of his last 6. That gap does not disappear based on venue. Top 5 is the market. The fade is Cameron Young — 319 driving distance but SG:APP 0.28 means he misses greens. That profile leaks on anything not a pure power track.\n” +
“You may add at the end, after the pick: Drop the course name and I can sharpen the fit angle. That line comes AFTER the play. Never instead of it.\n\n” +

“RESPONSE FORMAT:\n” +
“1. The play (name the player and market immediately)\n” +
“2. Why — SG data, course fit, recent form (last 6 results)\n” +
“3. The fade — name who to avoid and exactly why (overpriced, wrong course type, SG weakness)\n” +
“4. Odds context — what price makes it value vs juice\n\n” +

“Never bold text. Never use colons after headers. No ALL CAPS labels. Write like a sharp analyst talking to another sharp bettor.\n\n”;

// Live event data already in eventAnchor at top — append course detail + leaderboard + odds + players
if (courseSection) prompt += courseSection + “\n”;
if (leaderStr) prompt += “\n” + leaderStr + “\n”;
if (oddsStr) prompt += “\n” + oddsStr + “\n”;
if (playerStr) prompt += “\n” + playerStr + “\n”;

prompt += “\nQUESTION: “ + question;
return prompt;
}

function buildMlbSystemPrompt(mlbContext, matchupCtxStr) {
var ctx = mlbContext || {};
var now = new Date();
var todayStr = now.toLocaleDateString(“en-US”, { weekday:“long”, year:“numeric”, month:“long”, day:“numeric” });
var phase = (ctx.seasonContext && ctx.seasonContext.phase) || “MLB Season Active”;

// Games — handle both ESPN format (abbr only) and MLB Stats API format (pitcher data)
var gamesStr = “No games on today’s schedule.”;
var games = ctx.games || [];
if (games.length > 0) {
gamesStr = games.map(function(g) {
var away = g.awayTeam || {};
var home = g.homeTeam || {};
var awayId = away.abbr || away.name || away.tricode || “AWAY”;
var homeId = home.abbr || home.name || home.tricode || “HOME”;
var awayPitcher = away.pitcher ? “ [SP: “ + away.pitcher + “]” : “”;
var homePitcher = home.pitcher ? “ [SP: “ + home.pitcher + “]” : “”;
var awayStr = awayId + awayPitcher;
var homeStr = homeId + homePitcher;
var awayScore = away.score != null ? away.score : “”;
var homeScore = home.score != null ? home.score : “”;
if (g.state === “post”) return awayStr + “ “ + awayScore + “ @ “ + homeStr + “ “ + homeScore + “ — FINAL”;
if (g.state === “in”) {
var inn = g.inning ? “ (” + (g.inningHalf === “Bottom” ? “Bot” : “Top”) + “ “ + g.inning + “)” : “ (Live)”;
return awayStr + “ “ + awayScore + “ @ “ + homeStr + “ “ + homeScore + “ —” + inn;
}
return awayStr + “ @ “ + homeStr + “ — “ + (g.status || “Scheduled”);
}).join(”\n”);
}

// Totals
var totalsStr = “”;
var gameTotals = ctx.gameTotals || {};
if (Object.keys(gameTotals).length) {
var tLines = [];
for (var gk in gameTotals) {
var t = gameTotals[gk];
var runNote = t.run_env === “HIGH” ? “ — HIGH run environment (back OVERs, K unders)” :
t.run_env === “LOW”  ? “ — LOW run environment (back UNDERs, K overs)” : “”;
tLines.push(gk + “: O/U “ + t.total + runNote);
}
totalsStr = tLines.join(”\n”);
}

// Prop lines
var propLinesStr = “No prop lines posted yet.”;
var propLines = ctx.propLines || [];
if (propLines.length > 0) {
var grouped = {};
for (var li = 0; li < propLines.length; li++) {
var pl = propLines[li];
var k = pl.player + “|” + pl.prop;
if (!grouped[k]) grouped[k] = { player: pl.player, prop: pl.prop, game: pl.game, over: null, under: null };
if (pl.side === “Over”)  grouped[k].over  = pl.line + “ (” + (pl.odds > 0 ? “+” : “”) + pl.odds + “)”;
if (pl.side === “Under”) grouped[k].under = pl.line;
}
var entries = Object.values(grouped).slice(0, 60);
propLinesStr = entries.map(function(e) {
var sides = e.over ? “OVER “ + e.over : “”;
if (e.under) sides += (sides ? “ / UNDER “ : “UNDER “) + e.under;
return e.player + “ — “ + e.prop.toUpperCase() + “ — “ + sides + “ [” + e.game + “]”;
}).join(”\n”);
}

var prompt = “You are Under Review — a sharp MLB betting intelligence tool.\n\n”;
prompt += “IDENTITY: Sharp baseball analyst. Lead with the take. No hedging. No markdown.\n\n”;

prompt += “CRITICAL RULES:\n”;
prompt += “1. NEVER use markdown. No ##, no —, no ** bold. Plain text only.\n”;
prompt += “2. NEVER open with a limitation. Lead with the lean.\n”;
prompt += “3. Always cite the actual prop line number when recommending.\n”;
prompt += “4. Do not recommend props for FINAL games.\n\n”;

prompt += “RESPONSE FORMAT:\n”;
prompt += “One sharp opening sentence. Then:\n”;
prompt += “THE PLAY: • [Player] — [PROP OVER/UNDER LINE] ([ODDS]) — [key reason]\n”;
prompt += “FADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n”;

prompt += “NO GAMES TODAY? Do NOT just say there are no games. Give the best MLB futures or early-week angle instead. Name a specific pitcher matchup coming up, a team total, or a player prop to target when lines post. Always end with an actionable lean.\n\n”;
prompt += “MLB BETTING PRINCIPLES:\n”;
prompt += “Starting pitcher strikeouts = primary MLB prop market. K/9 vs opposing K% is the edge.\n”;
prompt += “Game total is run environment proxy. Over 9 = both offenses cooking. Under 7 = pitchers dominate.\n”;
prompt += “Park factors matter enormously. Coors Field = back OVERs always. Petco Park = fade OVERs.\n”;
prompt += “Platoon splits = the most underused edge. Left vs right pitcher splits change lines by 30-40%.\n”;
prompt += “Batter hits props: .300+ hitter vs weak starter = OVER. Elite pitcher at home = UNDER.\n”;
prompt += “Home run props: barrel rate + launch angle vs pitcher HR/FB rate. Not just slugging average.\n\n”;

prompt += “PARK FACTOR CHEAT SHEET (run environment — 100 = neutral):\n”;
prompt += “OVER-friendly: Coors Field (COL, ~120), Great American Ball Park (CIN, ~108), Globe Life Field (TEX, ~107)\n”;
prompt += “UNDER-friendly: Petco Park (SD, ~93), Oracle Park (SF, ~92), T-Mobile Park (SEA, ~91)\n”;
prompt += “Neutral: Dodger Stadium (~99), Yankee Stadium (~101), Wrigley Field (~100)\n\n”;

prompt += “TODAY: “ + todayStr + “\n”;
prompt += “MLB PHASE: “ + phase + “\n\n”;
prompt += “TODAY’S GAMES (probable starters listed)\n” + gamesStr + “\n\n”;
if (totalsStr) prompt += “GAME TOTALS (run environment signal)\n” + totalsStr + “\n\n”;
prompt += “LIVE PROP LINES\n” + propLinesStr + “\n\n”;
if (matchupCtxStr) prompt += “MATCHUP CONTEXT\n” + matchupCtxStr + “\n\n”;

return prompt;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);
if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”)   return res.status(405).json({ error: “Method not allowed” });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: “Missing ANTHROPIC_API_KEY” });

const {
question, players, context, liveMatches, history,
matchupContext, image, nflContext, nbaContext, mlbContext, golfContext, sportHint,
// f1Context from client is accepted as fallback but we prefer server-fetched
f1Context: clientF1Context,
} = req.body;

if (!question) return res.status(400).json({ error: “Missing question” });

const sport = detectSport(question, sportHint, matchupContext);
const isNFL  = sport === “nfl”;
const isF1   = sport === “f1”;
const isNBA  = sport === “nba”;
const isMLB  = sport === “mlb”;
const isGolf = sport === “golf”;

function buildOddsContext(odds) {
if (!odds || (!odds.matches?.length && !odds.props?.length)) return null;
const lines = [];
if (odds.matches?.length) {
lines.push(“LIVE MATCH ODDS:”);
for (const m of odds.matches) {
if (m.homeOdds !== null && m.awayOdds !== null) {
lines.push(”  “ + m.home + “ (” + (m.homeOdds > 0 ? “+” : “”) + m.homeOdds + “) vs “ + m.away + “ (” + (m.awayOdds > 0 ? “+” : “”) + m.awayOdds + “)”);
}
}
}
return lines.length ? lines.join(”\n”) : null;
}

function buildDrawPath(results) {
if (!Array.isArray(results) || !results.length) return null;
const byRound = {};
for (const r of results) {
const round = r.round || “Unknown”;
if (!byRound[round]) byRound[round] = [];
byRound[round].push(r);
}
const lines = [];
for (const round in byRound) {
lines.push(round + “:”);
for (const m of byRound[round]) lines.push(”  “ + m.winner + “ def. “ + m.loser + (m.score ? “ (” + m.score + “)” : “”));
}
return lines.join(”\n”);
}

const oddsCtx       = buildOddsContext(req.body.oddsData);
const drawPath      = buildDrawPath(req.body.tournamentResults);
const matchupCtxStr = summarizeMatchupContext(matchupContext);

let systemPrompt;

if (isF1) {
const liveF1Data = fetchF1LiveData();
systemPrompt = buildF1SystemPrompt(liveF1Data, matchupCtxStr);

} else if (isMLB) {
systemPrompt = buildMlbSystemPrompt(mlbContext, matchupCtxStr);

} else if (isGolf) {
systemPrompt = buildGolfSystemPrompt(golfContext);

} else if (isNBA) {
systemPrompt = buildNbaSystemPrompt(nbaContext, matchupCtxStr);

} else if (isNFL) {
const relevantQBs = getRelevantQBs(question);
const qbData      = JSON.stringify(relevantQBs, null, 0).slice(0, 9000);
const skillData   = getRelevantSkillPlayers(question, nflContext);

systemPrompt = “You are Under Review — a sharp sports betting intelligence tool covering NFL, NBA, tennis, and F1.\n” +
“You answer whatever is asked. Never deflect. Never say ‘wrong sport.’\n\n” +

“IDENTITY\n” +
“Sharp betting analyst — not a chatbot. Lead every response with the take. Give the recommendation first, the reasoning second.\n\n” +

“CRITICAL RULE: Never open with a limitation or data gap. Lead with the lean.\n\n” +

“STYLE\n” +
“One sharp opening sentence. Then bullets. No walls of text.\n\n” +

“NEVER use markdown. No ##, no —, no ** bold, no - bullet lists. Plain text only.\n” +
“Never explain how you work or describe your format. Just answer the question.\n\n” +
“RESPONSE FORMAT:\n” +
“THE PLAY:\n” +
“• [Player] — [OVER/UNDER line] — [floor/ceil] — [key reason in one line]\n” +
“FADE: [one line]\n” +
“CONFIDENCE: [High / Medium / Speculative] — [one line why]\n” +
“TIMING: [one line]\n\n” +

“NFL STAT GLOSSARY\n” +
“ontgt = on-target throw % (league avg 74.9%) — above 78% is elite\n” +
“badTh = bad throw rate (16.1% avg) — below 13% is elite\n” +
“prss = pressure rate (21.9% avg) — above 25% is a liability\n” +
“iay_pa = intended air yards per attempt — above 8.5 = deep thrower\n\n” +

“KEY TD RATES (2025 season):\n” +
“Derrick Henry (RB, BAL): 0.94 TDs/g\n” +
“James Cook (RB, BUF): 0.88 TDs/g\n” +
“De’Von Achane (RB, MIA): 0.86 TDs/g\n” +
“Jonathan Taylor (RB, IND): 0.82 TDs/g\n” +
“Puka Nacua (WR, LAR): 0 TDs — FADE as TD scorer always\n\n” +

“2026 NFL DRAFT:\n” +
“Pick 1: Tennessee — Shedeur Sanders (QB). Win total 5-7. Fade Titans early totals.\n” +
“Pick 2: Cleveland — Mason Graham (DL). Defense improves, offense unchanged.\n” +
“Pick 3: NY Giants — Abdul Carter (EDGE). Giants defense now competitive.\n\n” +

“DEFENSE TIERS:\n” +
“ELITE (fade opposing props): PHI, BAL, MIN, DEN\n” +
“STRONG (lean fade): KC, SF, GB, BUF, HOU, TB, LAC, PIT\n” +
“AVERAGE: NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO\n” +
“WEAK (lean over): MIA, CIN, NYJ, NYG, ARI\n” +
“BOTTOM (hard over): TEN, CLE, LVR, CAR\n\n” +

“KEY MATCHUP NOTES:\n” +
“Pat Surtain II (DEN) = hard fade any WR1 he shadows\n” +
“T.J. Watt (PIT) = fade opposing QB passing stats\n” +
“Antoine Winfield Jr. (TB) = hard fade TE receiving yards\n\n” +

“RB/WR/TE SKILL POSITION DATABASE\n” + skillData + “\n\n” +

“QB DATABASE\n” + qbData + “\n\n” +

(matchupCtxStr ? “MATCHUP CONTEXT\n” + matchupCtxStr + “\n\n” : “”) +
(oddsCtx ? “LIVE BETTING LINES\n” + oddsCtx : “No live lines — use database floors/ceilings for directional leans.”);

} else {
// ── Tennis ───────────────────────────────────────────────────────────────
const t = context && context.currentTournament;
const tournamentCtx = t
? “ACTIVE: “ + t.name + “ — “ + t.surface + “, “ + t.speed + “ speed.\n” + (t.context || “”) + “\nATP FAVORITE: “ + (t.atp_favorite || “TBD”) + “\nWTA FAVORITE: “ + (t.wta_favorite || “TBD”)
: “Current tournament context not loaded. Answer from player database and surface Elo data.”;

const allTournaments = (context && context.tournaments)
? Object.values(context.tournaments).map(function(t2) {
return t2.name + “ (” + t2.surface + “, “ + t2.speed + “) — ATP: “ + (t2.atp_favorite || “TBD”) + “ / WTA: “ + (t2.wta_favorite || “TBD”);
}).join(”\n”)
: “Full season schedule unavailable.”;

const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : “Player data unavailable”;

const liveMatchStr = (Array.isArray(liveMatches) && liveMatches.length)
? liveMatches.slice(0, 12).map(function(m) {
const home   = (m.raw && m.raw.home) || m.home_team || “?”;
const away   = (m.raw && m.raw.away) || m.away_team || “?”;
const round  = (m.raw && m.raw.round) || “Current Tournament”;
const isLive = String((m.raw && m.raw.live) || m.live || “0”) === “1”;
const status = isLive ? “LIVE” : ((m.raw && m.raw.status) || “Scheduled”);
return home + “ vs “ + away + “ — “ + round + “ — “ + status;
}).join(”\n”)
: “No live matches currently”;

const acePropsStr = (context && context.ace_props)
? Object.entries(context.ace_props).map(function(entry) {
const k = entry[0]; const v = entry[1];
return k + “: hard avg “ + v.avg_aces_hard + “, clay avg “ + (v.avg_aces_clay || “n/a”) + “, grass avg “ + (v.avg_aces_grass || “n/a”);
}).join(”\n”)
: “No ace baselines”;

systemPrompt =
“You are Under Review — a sharp sports betting intelligence tool covering tennis, NFL, NBA, and F1.\n\n” +

“IDENTITY\n” +
“Sharp betting analyst — not a chatbot. Lead every response with the take. Never hedge. No ‘it depends.’\n\n” +

“CRITICAL RULE: Never open with a limitation. Lead with the lean. Mention data gaps at the END if at all.\n\n” +

“STYLE\n” +
“Short punchy paragraphs. Specific data. One sharp opening sentence that answers the question directly.\n\n” +

“NEVER use markdown. No ##, no —, no ** bold, no - bullet lists. Plain text only.\n” +
“Never explain how you work. Just answer.\n\n” +
“RESPONSE STRUCTURE:\n” +
“1. The take — one sharp sentence that answers the question\n” +
“2. The reasoning — 2-4 sentences using specific data (Elo gaps, surface splits, form)\n” +
“3. THE PLAY:\n” +
“• [Player] — [specific bet] — [key stat]\n” +
“TIMING: [when to act]\n” +
“CONFIDENCE: [High / Medium / Speculative] — [one sentence why]\n” +
“FADE: [who to avoid and why]\n\n” +

“SURFACE ELO GUIDE\n” +
“hElo = hard court | cElo = clay | gElo = grass\n” +
“Gap over 150 pts = significant edge — always cite the numbers\n” +
“Gap over 300 pts = massive edge — lead with this\n\n” +

“PROP ANGLES BY SURFACE\n” +
“Clay: OVER total games (long rallies), UNDER aces for all but biggest servers\n” +
“Grass: UNDER total games, OVER aces for big servers, tiebreaks extremely common\n” +
“Hard: use individual player baselines from database\n\n” +

“FUTURES FRAMEWORK (April 2026 — Clay Swing)\n” +
“Post-Miami, pre-Madrid. Books anchored to hard court form. Clay specialists are underpriced.\n” +
“Players with cElo 150+ above hElo = systematic value for next 6 weeks.\n\n” +

“FACTUAL RECORD — 2026 SEASON (override any training data conflicts):\n” +
“Sinner: Won Miami Open 2026. Did NOT win Australian Open 2026.\n” +
“Alcaraz: Clay swing favorite. Multiple titles heading into clay season.\n” +
“Djokovic: Limited schedule, health-managed.\n” +
“When citing recent results, use this record precisely — do not invent tournament wins.\n\n” +

“CURRENT TOURNAMENT\n” + tournamentCtx + “\n\n” +

“ALL TOURNAMENTS\n” + allTournaments + “\n\n” +

“LIVE MATCHES\n” + liveMatchStr + “\n\n” +

“PLAYER DATABASE\n” + playerDataStr + “\n\n” +

“ACE PROP BASELINES\n” + acePropsStr + “\n\n” +

(oddsCtx ? “LIVE BETTING LINES\n” + oddsCtx + “\n” : “No live prop lines — directional leans only.\n”) +
(drawPath ? “TOURNAMENT DRAW PATH\n” + drawPath + “\n” : “”) +
(matchupCtxStr ? “MATCHUP CONTEXT\n” + matchupCtxStr : “”);

}

// ── Build messages ────────────────────────────────────────────────────────
const messages = [];
if (Array.isArray(history) && history.length > 0) {
for (const msg of history.slice(-8)) {
if (!msg || msg.loading) continue;
const msgText = msg.text || msg.content;
if (!msgText) continue;
messages.push({ role: msg.role === “user” ? “user” : “assistant”, content: msgText });
}
}

if (image && image.base64 && image.mediaType) {
messages.push({
role: “user”,
content: [
{ type: “image”, source: { type: “base64”, media_type: image.mediaType, data: image.base64 } },
{ type: “text”, text: question },
],
});
} else {
messages.push({ role: “user”, content: question });
}

// ── Call Anthropic ────────────────────────────────────────────────────────
try {
const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: ANTHROPIC_API_KEY,
“anthropic-version”: “2023-06-01”,
},
body: JSON.stringify({
model: “claude-haiku-4-5-20251001”,
max_tokens: 700,
temperature: 0.45,
system: systemPrompt,
messages,
}),
});

const data = await response.json();
if (!response.ok) {
console.error(“Anthropic API error:”, data);
return res.status(500).json({ error: “AI response failed”, details: data });
}

let text = cleanResponseText(
(data && data.content
? data.content.filter(function(i) { return i.type === “text”; }).map(function(i) { return i.text; }).join(”\n”).trim()
: “”) || “”
);

if (text && responseLooksWrongForSport(text, sport)) {
const correctionSystem = systemPrompt +
“\n\nCORRECTION: Your previous response was off-topic. Answer ONLY as a “ + sport.toUpperCase() +
“ analyst. Do not apologize. Do not mention another sport. Give a direct answer.”;
const correctionRes = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json”, “x-api-key”: ANTHROPIC_API_KEY, “anthropic-version”: “2023-06-01” },
body: JSON.stringify({ model: “claude-sonnet-4-5”, max_tokens: 1200, temperature: 0.2, system: correctionSystem, messages }),
});
if (correctionRes.ok) {
const correctionData = await correctionRes.json();
text = cleanResponseText(
(correctionData && correctionData.content
? correctionData.content.filter(function(i) { return i.type === “text”; }).map(function(i) { return i.text; }).join(”\n”).trim()
: “”) || “”
);
}
}

return res.status(200).json({ response: text || “Couldn’t get a response. Try again.” });

} catch (err) {
console.error(“UR TAKE error:”, err);
return res.status(500).json({ error: “Request failed”, details: err.message });
}
}