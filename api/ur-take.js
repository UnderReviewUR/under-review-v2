export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

import { applyCors } from "./_cors.js";

// ── PGA Player Database ───────────────────────────────────────────────────────
const PGA_PLAYERS = {
  "Scottie Scheffler":  { rank:1,  country:"USA", tier:1, sg:{ total:3.12, ott:0.94, app:1.21, arg:0.48, putt:0.49 }, cutMaking:"97%", top10Rate:"52%", winRate:"18%", courseFit:{ parkland:"ELITE", links:"STRONG", bermuda:"STRONG", poa:"ELITE", bentgrass:"ELITE" }, recentForm:["WIN","T4","WIN","T2","WIN","T3"], bestMarkets:["outright","top_5","top_10","frl"], note:"Best player in the world. SG Total 3.12 historically elite. 2026 Masters: R1=72 R3=65 sitting at -7 after 54 holes. Top 10 at -120 or better is a near-lock.", comps:["Rory McIlroy","Jon Rahm"] },
  "Rory McIlroy":       { rank:2,  country:"NIR", tier:1, sg:{ total:2.41, ott:1.18, app:0.87, arg:0.12, putt:0.24 }, cutMaking:"89%", top10Rate:"44%", winRate:"12%", courseFit:{ parkland:"ELITE", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["WIN(MASTERS-2025)","WIN","T8","T3","T15","T5"], bestMarkets:["outright","top_5","top_10","frl","matchup"], note:"2025 MASTERS CHAMPION AND DEFENDING CHAMPION AT AUGUSTA 2026. Won by beating Justin Rose in a playoff. Completed the career Grand Slam. Masters curse is broken. Elite driver SG OTT 1.18. Links events are his home.", comps:["Scottie Scheffler","Jon Rahm"] },
  "Xander Schauffele":  { rank:3,  country:"USA", tier:1, sg:{ total:2.18, ott:0.71, app:0.89, arg:0.31, putt:0.27 }, cutMaking:"92%", top10Rate:"46%", winRate:"10%", courseFit:{ parkland:"ELITE", links:"STRONG", bermuda:"ELITE", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["WIN","T2","T6","T3","WIN","T11"], bestMarkets:["outright","top_5","top_10","make_cut"], note:"Two major champion. SG App + Putt combo top 3 on tour. Cleanest top 10 play every week.", comps:["Collin Morikawa","Patrick Cantlay"] },
  "Jon Rahm":           { rank:4,  country:"ESP", tier:1, sg:{ total:2.05, ott:0.68, app:0.91, arg:0.22, putt:0.24 }, cutMaking:"88%", top10Rate:"41%", winRate:"11%", courseFit:{ parkland:"ELITE", links:"ELITE", bermuda:"STRONG", poa:"ELITE", bentgrass:"STRONG" }, recentForm:["T4","WIN","T2","T8","T20","T3"], bestMarkets:["outright","top_5","top_10","matchup"], note:"Masters champion, US Open champion. LIV schedule -- verify field.", comps:["Scottie Scheffler","Rory McIlroy"] },
  "Collin Morikawa":    { rank:5,  country:"USA", tier:1, sg:{ total:1.89, ott:0.42, app:1.08, arg:0.18, putt:0.21 }, cutMaking:"90%", top10Rate:"38%", winRate:"8%",  courseFit:{ parkland:"ELITE", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T3","T7","T2","WIN","T5","T14"], bestMarkets:["top_5","top_10","top_20","matchup"], note:"Best iron player on tour SG App 1.08. Consistent top-10 machine.", comps:["Xander Schauffele","Patrick Cantlay"] },
  "Viktor Hovland":     { rank:6,  country:"NOR", tier:1, sg:{ total:1.78, ott:0.82, app:0.71, arg:0.09, putt:0.16 }, cutMaking:"84%", top10Rate:"35%", winRate:"9%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T12","T4","WIN","T8","T3","T22"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Elite around links-style tracks. ARG and putting are the weaknesses. Fades at Bermuda greens.", comps:["Rory McIlroy","Tommy Fleetwood"] },
  "Patrick Cantlay":    { rank:7,  country:"USA", tier:1, sg:{ total:1.72, ott:0.44, app:0.79, arg:0.28, putt:0.21 }, cutMaking:"91%", top10Rate:"37%", winRate:"7%",  courseFit:{ parkland:"ELITE", links:"NEUTRAL", bermuda:"STRONG", poa:"ELITE", bentgrass:"STRONG" }, recentForm:["T6","T3","T18","T2","T9","T5"], bestMarkets:["top_5","top_10","top_20","make_cut","matchup"], note:"Most consistent player weekly. Elite poa greens putter. 91% cut-making.", comps:["Xander Schauffele","Sam Burns"] },
  "Ludvig Aberg":       { rank:8,  country:"SWE", tier:1, sg:{ total:1.84, ott:0.98, app:0.68, arg:0.10, putt:0.08 }, cutMaking:"85%", top10Rate:"38%", winRate:"6%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T2","T4","T3","WIN","T8","T2"], bestMarkets:["outright","top_5","top_10","matchup"], note:"Fastest-rising player in world. Runner-up 2024 Masters as rookie. Elite driver + approach. Top 5 weekly is now the base case.", comps:["Viktor Hovland","Rory McIlroy"] },
  "Wyndham Clark":      { rank:9,  country:"USA", tier:1, sg:{ total:1.64, ott:0.89, app:0.61, arg:0.08, putt:0.06 }, cutMaking:"78%", top10Rate:"28%", winRate:"8%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T4","WIN","T22","T8","T30","T5"], bestMarkets:["outright","top_10","frl"], note:"US Open champion. 310+ driving avg. Volatile boom or bust. Fade for make-cut (78%).", comps:["Cameron Young","Russell Henley"] },
  "Tony Finau":         { rank:10, country:"USA", tier:1, sg:{ total:1.58, ott:0.78, app:0.61, arg:0.12, putt:0.07 }, cutMaking:"84%", top10Rate:"30%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T11","T5","T4","T18","WIN","T6"], bestMarkets:["top_10","top_20","make_cut"], note:"Incredibly consistent top-10 threat. 30% top-10 rate among highest for his tier.", comps:["Russell Henley","Sungjae Im"] },
  "Russell Henley":     { rank:11, country:"USA", tier:1, sg:{ total:1.54, ott:0.41, app:0.82, arg:0.18, putt:0.13 }, cutMaking:"87%", top10Rate:"33%", winRate:"5%",  courseFit:{ parkland:"ELITE", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T3","T7","T2","T11","T4","T19"], bestMarkets:["top_5","top_10","top_20","make_cut"], note:"Sneaky elite SG App 0.82. Consistent top-10 machine who gets overlooked at inflated odds.", comps:["Collin Morikawa","Sam Burns"] },
  "Sam Burns":          { rank:12, country:"USA", tier:1, sg:{ total:1.51, ott:0.62, app:0.68, arg:0.11, putt:0.10 }, cutMaking:"85%", top10Rate:"29%", winRate:"6%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","WIN","T3","T12","T6","T24"], bestMarkets:["outright","top_10","top_20","make_cut"], note:"Multiple tour wins. Balanced SG profile. 2026 Masters: -10 after 54 holes -- legitimate Sunday contender.", comps:["Russell Henley","Sungjae Im"] },
  "Sungjae Im":         { rank:13, country:"KOR", tier:1, sg:{ total:1.48, ott:0.44, app:0.72, arg:0.18, putt:0.14 }, cutMaking:"90%", top10Rate:"31%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T4","T9","T2","T6","T15","T7"], bestMarkets:["top_10","top_20","make_cut"], note:"Best cut-making machine on tour (90%). Elite iron player. Make cut at 90% is near-lock.", comps:["Patrick Cantlay","Russell Henley"] },
  "Tommy Fleetwood":    { rank:14, country:"ENG", tier:1, sg:{ total:1.45, ott:0.48, app:0.72, arg:0.14, putt:0.11 }, cutMaking:"86%", top10Rate:"30%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T5","T3","T11","T4","T2","WIN"], bestMarkets:["top_10","top_20","matchup"], note:"Links specialist. Elite at The Open and Ryder Cup courses. Fades on Bermuda.", comps:["Viktor Hovland","Shane Lowry"] },
  "Matt Fitzpatrick":   { rank:15, country:"ENG", tier:1, sg:{ total:1.44, ott:0.38, app:0.72, arg:0.22, putt:0.12 }, cutMaking:"87%", top10Rate:"30%", winRate:"5%",  courseFit:{ parkland:"ELITE", links:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T4","T2","T9","T11","T3","WIN"], bestMarkets:["top_5","top_10","top_20","make_cut","matchup"], note:"US Open champion. Elite precision player SG App 0.72. 87% cut-making.", comps:["Collin Morikawa","Russell Henley"] },
  "Cameron Smith":      { rank:17, country:"AUS", tier:1, sg:{ total:1.42, ott:0.38, app:0.61, arg:0.38, putt:0.45 }, cutMaking:"85%", top10Rate:"34%", winRate:"8%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["WIN","T4","T3","T7","T18","T2"], bestMarkets:["outright","top_5","top_10","matchup"], note:"Best putter on tour when on his game SG Putt 0.45. Open champion. LIV player -- verify field.", comps:["Shane Lowry","Tommy Fleetwood"] },
  "Tyrrell Hatton":     { rank:18, country:"ENG", tier:1, sg:{ total:1.38, ott:0.44, app:0.69, arg:0.14, putt:0.11 }, cutMaking:"82%", top10Rate:"28%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T6","T3","WIN","T12","T4","T9"], bestMarkets:["top_10","top_20","matchup"], note:"LIV player -- verify field. Elite links form.", comps:["Tommy Fleetwood","Cameron Smith"] },
  "Shane Lowry":        { rank:19, country:"IRE", tier:1, sg:{ total:1.31, ott:0.28, app:0.61, arg:0.22, putt:0.20 }, cutMaking:"84%", top10Rate:"25%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T4","T8","T2","T22","T11","T5"], bestMarkets:["top_10","top_20","matchup"], note:"Open champion. Elite links specialist. Fades badly at desert and warm-weather courses. Made hole-in-one at 2026 Masters R3.", comps:["Tommy Fleetwood","Justin Rose"] },
  "Hideki Matsuyama":   { rank:20, country:"JPN", tier:1, sg:{ total:1.29, ott:0.51, app:0.64, arg:0.08, putt:0.06 }, cutMaking:"81%", top10Rate:"24%", winRate:"5%",  courseFit:{ parkland:"ELITE", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T2","WIN","T8","T5","T14","T3"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Masters champion. Augusta specialist. Best at parkland and precision iron courses.", comps:["Tony Finau","Adam Scott"] },
  "Justin Thomas":      { rank:21, country:"USA", tier:1, sg:{ total:1.26, ott:0.58, app:0.52, arg:0.08, putt:0.08 }, cutMaking:"80%", top10Rate:"22%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T4","T18","T2","T31","T9","T6"], bestMarkets:["top_10","top_20","matchup"], note:"Two-time PGA champion. Top 10 is the right market not outright.", comps:["Tommy Fleetwood","Sam Burns"] },
  "Jordan Spieth":      { rank:22, country:"USA", tier:1, sg:{ total:1.22, ott:0.08, app:0.52, arg:0.34, putt:0.28 }, cutMaking:"82%", top10Rate:"23%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T5","T3","T18","T8","T2","T28"], bestMarkets:["top_10","top_20","matchup"], note:"Three-time major champion. Short game and putting genius. Best at links and Augusta.", comps:["Shane Lowry","Justin Rose"] },
  "Brian Harman":       { rank:23, country:"USA", tier:1, sg:{ total:1.22, ott:0.04, app:0.62, arg:0.28, putt:0.28 }, cutMaking:"85%", top10Rate:"22%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T4","T9","WIN","T3","T18","T11"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Open champion. Shortest hitter on tour but elite short game. Fade at power courses.", comps:["Shane Lowry","Jordan Spieth"] },
  "Tom Kim":            { rank:24, country:"KOR", tier:1, sg:{ total:1.06, ott:0.38, app:0.44, arg:0.14, putt:0.10 }, cutMaking:"81%", top10Rate:"22%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T3","T6","WIN","T11","T4","T18"], bestMarkets:["outright","top_10","top_20","matchup"], note:"One of the best young players in the world. Multiple wins before 22. SG rising.", comps:["Sungjae Im","Collin Morikawa"] },
  "Robert MacIntyre":   { rank:25, country:"SCO", tier:1, sg:{ total:1.62, ott:0.71, app:0.61, arg:0.18, putt:0.12 }, cutMaking:"82%", top10Rate:"28%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["WIN","T4","T8","T3","T15","T6"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Won on PGA Tour 2024. Born links player. Best at overseas/links-style events.", comps:["Tommy Fleetwood","Shane Lowry"] },
  "Sahith Theegala":    { rank:26, country:"USA", tier:1, sg:{ total:1.58, ott:0.72, app:0.62, arg:0.14, putt:0.10 }, cutMaking:"80%", top10Rate:"26%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T4","T11","T3","WIN","T8","T19"], bestMarkets:["outright","top_10","top_20","frl"], note:"Exciting young player with multiple wins. FRL is a viable market. Volatile closer.", comps:["Cameron Young","Wyndham Clark"] },
  "Rickie Fowler":      { rank:27, country:"USA", tier:1, sg:{ total:1.18, ott:0.48, app:0.51, arg:0.10, putt:0.09 }, cutMaking:"79%", top10Rate:"21%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T20","T3","T44","WIN","T15"], bestMarkets:["top_10","top_20","matchup"], note:"Best at west coast poa events and desert tracks.", comps:["Justin Thomas","Cameron Young"] },
  "Keegan Bradley":     { rank:28, country:"USA", tier:1, sg:{ total:1.14, ott:0.62, app:0.42, arg:0.04, putt:0.06 }, cutMaking:"83%", top10Rate:"20%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T6","T11","T4","T24","T8","T33"], bestMarkets:["top_20","make_cut","matchup"], note:"Consistency play -- 83% cut-making. Best market is top 20 and make-cut.", comps:["Tony Finau","Sepp Straka"] },
  "Adam Scott":         { rank:29, country:"AUS", tier:1, sg:{ total:1.11, ott:0.54, app:0.44, arg:0.08, putt:0.05 }, cutMaking:"82%", top10Rate:"19%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T7","T12","T3","T19","T6","T28"], bestMarkets:["top_20","make_cut","matchup"], note:"Masters champion. Still competes well at 44. 82% cut-making.", comps:["Keegan Bradley","Justin Rose"] },
  "Cameron Young":      { rank:30, country:"USA", tier:1, sg:{ total:1.08, ott:0.94, app:0.28, arg:-0.04, putt:-0.10 }, cutMaking:"76%", top10Rate:"18%", winRate:"2%",  courseFit:{ parkland:"NEUTRAL", links:"STRONG", bermuda:"NEUTRAL", poa:"NEUTRAL", bentgrass:"STRONG" }, recentForm:["T14","T4","T18","T9","T28","T3"], bestMarkets:["top_10","top_20","frl"], note:"Longest hitter on tour 319+ avg. 2026 Masters: co-leader at -11 after R3. Shot 65 Saturday. First-time major contender -- treat as real. His power game suits Augusta par 5s. FRL best market normally.", comps:["Wyndham Clark","Ludvig Aberg"] },
  "Nick Taylor":            { rank:16, country:"CAN", age:35, tier:1, sg:{ total:1.44, ott:0.48, app:0.64, arg:0.16, putt:0.16 }, driving:{ dist:290.2, acc:63.4 }, cutMaking:"82%", top10Rate:"24%", top20Rate:"41%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T6","T2","WIN","T8","T14","T4"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Canadian Open specialist. Consistent iron player. Top 10 is the market weekly.", comps:["Sam Burns","Russell Henley","Keegan Bradley"] },
  "Nicolai Hojgaard":       { rank:34, country:"DEN", age:23, tier:1, sg:{ total:1.38, ott:0.58, app:0.62, arg:0.12, putt:0.06 }, driving:{ dist:301.4, acc:59.8 }, cutMaking:"81%", top10Rate:"24%", top20Rate:"41%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"STRONG", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["WIN","T4","T8","T18","T3","T11"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Ryder Cup hero 2023. Growing SG. Better in European-style events.", comps:["Robert MacIntyre","Tommy Fleetwood","Tom Kim"] },
  "Rasmus Hojgaard":        { rank:35, country:"DEN", age:23, tier:1, sg:{ total:1.32, ott:0.54, app:0.58, arg:0.14, putt:0.06 }, driving:{ dist:299.8, acc:60.4 }, cutMaking:"80%", top10Rate:"22%", top20Rate:"39%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"STRONG", desert:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T6","WIN","T3","T14","T8","T22"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Twin brother of Nicolai. Both elite young European talents. Top 10 consistent market.", comps:["Nicolai Hojgaard","Robert MacIntyre","Tommy Fleetwood"] },
  "Emiliano Grillo":        { rank:40, country:"ARG", age:31, tier:1, sg:{ total:1.22, ott:0.48, app:0.54, arg:0.12, putt:0.08 }, driving:{ dist:293.8, acc:61.4 }, cutMaking:"82%", top10Rate:"20%", top20Rate:"37%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T5","T12","T3","T19","T8","WIN"], bestMarkets:["top_20","make_cut","matchup"], note:"Consistent - makes cuts and sneaks into top 20.", comps:["Sepp Straka","Denny McCarthy","Nick Taylor"] },
  "Denny McCarthy":         { rank:41, country:"USA", age:31, tier:1, sg:{ total:1.02, ott:0.28, app:0.44, arg:0.14, putt:0.16 }, driving:{ dist:283.4, acc:64.8 }, cutMaking:"82%", top10Rate:"15%", top20Rate:"30%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T9","T22","T5","T16","WIN","T11"], bestMarkets:["top_20","make_cut","matchup"], note:"Streaky player - can win or miss cut. Putting is his calling card. Cut-making 82% is the market.", comps:["Brian Harman","Mackenzie Hughes","Taylor Moore"] },
  "Max Greyserman":         { rank:42, country:"USA", age:29, tier:1, sg:{ total:1.18, ott:0.48, app:0.52, arg:0.10, putt:0.08 }, driving:{ dist:296.8, acc:59.8 }, cutMaking:"79%", top10Rate:"19%", top20Rate:"35%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T4","T18","T11","T3","T24"], bestMarkets:["top_20","matchup"], note:"Rising star. Improving SG numbers weekly. Best in moderate fields.", comps:["Eric Cole","Taylor Moore","Sahith Theegala"] },
  "Ben Griffin":            { rank:43, country:"USA", age:28, tier:1, sg:{ total:0.98, ott:0.38, app:0.42, arg:0.10, putt:0.08 }, driving:{ dist:289.8, acc:62.4 }, cutMaking:"80%", top10Rate:"16%", top20Rate:"30%", winRate:"1%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T4","T11","T24","WIN","T8","T19"], bestMarkets:["top_20","make_cut","matchup"], note:"Solid young player finding footing. Top 20 in moderate fields.", comps:["Eric Cole","Taylor Moore","Max Greyserman"] },
  "Taylor Moore":           { rank:44, country:"USA", age:29, tier:1, sg:{ total:0.98, ott:0.28, app:0.44, arg:0.16, putt:0.10 }, driving:{ dist:286.4, acc:63.8 }, cutMaking:"80%", top10Rate:"14%", top20Rate:"29%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T16","T8","T3","T24","T11","WIN"], bestMarkets:["top_20","make_cut"], note:"Reliable consistent player. Make cut 80% good market. Top 20 in weak fields.", comps:["Denny McCarthy","Mackenzie Hughes","Sepp Straka"] },
  "Mackenzie Hughes":       { rank:45, country:"CAN", age:33, tier:1, sg:{ total:1.04, ott:0.32, app:0.48, arg:0.14, putt:0.10 }, driving:{ dist:286.8, acc:63.2 }, cutMaking:"80%", top10Rate:"16%", top20Rate:"31%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T11","T6","T24","T8","T18","T3"], bestMarkets:["top_20","make_cut","matchup"], note:"Solid top-20 threat in weaker fields. Reliable cut-maker 80%.", comps:["Sepp Straka","Chris Kirk","Taylor Moore"] },
  "Patrick Reed":           { rank:48, country:"USA", age:33, tier:1, sg:{ total:0.88, ott:0.18, app:0.38, arg:0.18, putt:0.14 }, driving:{ dist:293.4, acc:61.2 }, cutMaking:"78%", top10Rate:"18%", top20Rate:"34%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", desert:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T4","T18","T11","T3","WIN"], bestMarkets:["top_10","top_20","matchup"], note:"Masters champion. Augusta specialist. LIV player - verify field. 2026 Masters: -6 after 54 holes.", comps:["Adam Scott","Hideki Matsuyama","Jordan Spieth"] },
  "Chris Kirk":         { rank:31, country:"USA", tier:1, sg:{ total:1.38, ott:0.28, app:0.68, arg:0.24, putt:0.18 }, cutMaking:"84%", top10Rate:"22%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T3","T8","WIN","T6","T12","T19"], bestMarkets:["top_10","top_20","make_cut"], note:"Short hitter but elite precision player. SG Approach and ARG beat the field. 84% cut-making.", comps:["Russell Henley","Sungjae Im"] },
  "Sepp Straka":        { rank:32, country:"AUT", tier:1, sg:{ total:1.33, ott:0.42, app:0.64, arg:0.14, putt:0.13 }, cutMaking:"83%", top10Rate:"23%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T9","T4","T11","T22","T3","T7"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Quietly consistent top-20 machine. Best value under the radar in weaker fields.", comps:["Chris Kirk","Sam Burns"] },
  "Min Woo Lee":        { rank:33, country:"AUS", tier:1, sg:{ total:1.24, ott:0.74, app:0.38, arg:0.08, putt:0.04 }, cutMaking:"77%", top10Rate:"20%", winRate:"3%",  courseFit:{ parkland:"NEUTRAL", links:"STRONG", bermuda:"NEUTRAL", poa:"NEUTRAL", bentgrass:"STRONG" }, recentForm:["T3","T18","WIN","T5","T28","T8"], bestMarkets:["outright","top_10","frl","matchup"], note:"Exciting power player. Links specialist. FRL viable.", comps:["Cameron Young","Ludvig Aberg"] },
  "Justin Rose":        { rank:37, country:"ENG", tier:1, sg:{ total:1.18, ott:0.44, app:0.54, arg:0.12, putt:0.08 }, cutMaking:"81%", top10Rate:"20%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T3","T19","T6","T11","T25"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Olympic gold, US Open champion. Lost 2025 Masters to Rory in a playoff -- both finished -12 in regulation. 2026 Masters: -8 after 54 holes.", comps:["Adam Scott","Tommy Fleetwood"] },
  "Akshay Bhatia":      { rank:38, country:"USA", tier:1, sg:{ total:1.62, ott:0.78, app:0.68, arg:0.08, putt:0.08 }, cutMaking:"78%", top10Rate:"26%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["WIN","T4","T3","T8","T18","T11"], bestMarkets:["outright","top_10","top_20"], note:"Exciting 22-year-old with multiple PGA Tour wins. Rising SG. Power + approach elite.", comps:["Ludvig Aberg","Tom Kim"] },
  "Corey Conners":      { rank:36, country:"CAN", tier:1, sg:{ total:1.28, ott:0.42, app:0.72, arg:0.08, putt:0.06 }, cutMaking:"84%", top10Rate:"22%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T3","T11","T6","T18","T4"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Most accurate player in world -- GIR leader. SG App 0.72 elite. Make cut 84% reliable.", comps:["Matt Fitzpatrick","Russell Henley"] },
  "Jason Day":          { rank:46, country:"AUS", tier:1, sg:{ total:1.18, ott:0.42, app:0.58, arg:0.12, putt:0.06 }, cutMaking:"81%", top10Rate:"22%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T6","T3","T11","T4","WIN","T8"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Former world #1. Augusta specialist. 2026 Masters: -8 after 54 holes -- in Sunday contention.", comps:["Adam Scott","Hideki Matsuyama"] },
  "HaoTong Li":         { rank:47, country:"CHN", tier:1, sg:{ total:1.22, ott:0.54, app:0.58, arg:0.06, putt:0.04 }, cutMaking:"79%", top10Rate:"21%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["WIN","T4","T8","T18","T3","T11"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Rising star. 2026 Masters: -7 after 54 holes. Legitimate Sunday contender at Augusta.", comps:["Tom Kim","Sungjae Im"] },
  "Sam Burns":          { rank:12, country:"USA", tier:1, sg:{ total:1.51, ott:0.62, app:0.68, arg:0.11, putt:0.10 }, cutMaking:"85%", top10Rate:"29%", winRate:"6%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","WIN","T3","T12","T6","T24"], bestMarkets:["outright","top_10","top_20","make_cut"], note:"Multiple tour wins. Balanced SG profile. 2026 Masters: -10 after 54 holes -- legitimate Sunday contender.", comps:["Russell Henley","Sungjae Im"] },
  "Dustin Johnson":     { rank:50, country:"USA", tier:2, sg:{ total:1.44, ott:1.12, app:0.48, arg:0.02, putt:-0.18 }, cutMaking:"82%", top10Rate:"24%", winRate:"4%", recentForm:["T8","T4","T3","T18","WIN","T11"], bestMarkets:["outright","top_10","frl"], note:"LIV -- verify field. Elite power, wildly inconsistent putter. Boom or bust.", comps:["Wyndham Clark","Cameron Young"] },
  "Brooks Koepka":      { rank:51, country:"USA", tier:2, sg:{ total:1.58, ott:0.84, app:0.62, arg:0.08, putt:0.04 }, cutMaking:"79%", top10Rate:"22%", winRate:"5%", recentForm:["WIN","T3","T18","T4","T28","T8"], bestMarkets:["outright","top_5","top_10"], note:"Four-time major champion. LIV -- verify field. Major mode is real. Fade at regular-season events.", comps:["Dustin Johnson","Jon Rahm"] },
  "Bryson DeChambeau":  { rank:52, country:"USA", tier:2, sg:{ total:1.62, ott:1.44, app:0.48, arg:0.08, putt:-0.38 }, cutMaking:"75%", top10Rate:"20%", winRate:"5%", recentForm:["WIN","T4","T18","T8","T30","WIN"], bestMarkets:["outright","frl","top_10"], note:"LIV -- verify field. Longest hitter in history. Wildly volatile. Never bet make-cut. Missed cut 2026 Masters.", comps:["Cameron Young","Wyndham Clark"] },
  "Tiger Woods":        { rank:999, country:"USA", tier:2, sg:{ total:0.0, ott:0.0, app:0.0, arg:0.0, putt:0.0 }, cutMaking:"varies", top10Rate:"0%", winRate:"0%", recentForm:["WD","MC","WD","T47","MC","WD"], bestMarkets:[], note:"HEALTH STATUS UNKNOWN -- do NOT make prop recommendations without confirming he is playing.", comps:[] },
  "Phil Mickelson":     { rank:69, country:"USA", tier:2, sg:{ total:0.24, ott:0.18, app:0.12, arg:0.10, putt:-0.16 }, cutMaking:"65%", top10Rate:"4%", winRate:"0%", recentForm:["MC","T28","T44","MC","T31","MC"], bestMarkets:["matchup"], note:"LIV -- playing for glory not ranking. Best used as FADE.", comps:["Dustin Johnson"] },
};

const PGA_COURSES = {
  "Augusta National": { location:"Augusta, GA", par:72, yards:7545, type:"parkland", grass:"bentgrass", sgPremium:"app", keyTraits:["premium iron play to undulating greens","short game around run-off areas","drawing ball flight rewarded","par 5 scoring (13,15) favors bombers","Amen Corner separates the field","bentgrass putting"], whoWins:"Elite iron players who draw the ball. Power helps on par 5s.", specialists:["Scottie Scheffler","Rory McIlroy","Jon Rahm","Hideki Matsuyama","Adam Scott","Jordan Spieth"], fades:["Links-only specialists","Players who struggle with bump-and-run"], note:"Rory McIlroy is the 2025 Masters champion and 2026 defending champion. Masters field is the best in golf. SG:APP from 150-200 yards is most predictive. Bentgrass greens reward European-style putting." },
  "TPC Sawgrass": { location:"Ponte Vedra Beach, FL", par:72, yards:7255, type:"parkland", grass:"bermuda", sgPremium:"app", keyTraits:["17th island green par 3","water on 18","bermuda greens","ocean wind","precision iron play","nerves required"], whoWins:"Complete players who can handle pressure. Bermuda putters.", specialists:["Scottie Scheffler","Rory McIlroy","Xander Schauffele","Matt Fitzpatrick"], fades:["Wild drivers","Players who melt under pressure"], note:"THE PLAYERS Championship. 17th island par 3 is where tournaments are won and lost." },
  "Riviera Country Club": { location:"Pacific Palisades, CA", par:71, yards:7322, type:"parkland", grass:"poa_annua", sgPremium:"app", keyTraits:["kikuyu rough heavily penalizes misses","poa annua greens","precision over power"], whoWins:"Complete precision players. Poa putting specialists.", specialists:["Patrick Cantlay","Collin Morikawa","Xander Schauffele","Russell Henley"], fades:["Pure power players","Players who can't putt poa"], note:"Genesis Invitational. Kikuyu rough is brutal on misses." },
  "Pebble Beach Golf Links": { location:"Pebble Beach, CA", par:72, yards:7075, type:"links_adjacent", grass:"poa_annua", sgPremium:"putt", keyTraits:["wind off the Pacific","poa annua greens","accuracy over power","18th along ocean"], whoWins:"Poa specialists and wind managers.", specialists:["Patrick Cantlay","Tom Kim","Jordan Spieth"], fades:["Wild drivers","Players allergic to poa putting variance"], note:"AT&T Pebble Beach. Wind off the Pacific is the key variable." },
  "Pinehurst No. 2": { location:"Pinehurst, NC", par:70, yards:7689, type:"parkland_hybrid", grass:"bermuda", sgPremium:"app", keyTraits:["domed greens shed errant approaches","bermuda greens","precision iron play decisive"], whoWins:"Iron ball-strikers who hit greens in regulation.", specialists:["Scottie Scheffler","Xander Schauffele","Rory McIlroy"], fades:["Players relying on recovery"], note:"US Open venue. Domed greens are the signature." },
  "Royal Troon": { location:"Ayrshire, Scotland", par:71, yards:7385, type:"links", grass:"links_fescue", sgPremium:"ott", keyTraits:["wind is everything","Postage Stamp par 3 (8th)","fescue rough penalizes offline shots"], whoWins:"Links specialists. Wind managers. Patience wins.", specialists:["Rory McIlroy","Tommy Fleetwood","Shane Lowry","Brian Harman"], fades:["Desert specialists","High ball hitters in wind"], note:"The Open Championship venue. Wind direction changes the course entirely." },
  "Muirfield Village": { location:"Dublin, OH", par:72, yards:7392, type:"parkland", grass:"bentgrass", sgPremium:"app", keyTraits:["bentgrass greens","tree-lined fairways demand accuracy","Nicklaus design rewards complete game"], whoWins:"Complete players. Elite iron play. Bentgrass putting.", specialists:["Scottie Scheffler","Rory McIlroy","Patrick Cantlay","Collin Morikawa"], fades:["One-dimensional power players"], note:"Memorial Tournament. Nicklaus design rewards the complete game." },
  "Quail Hollow Club": { location:"Charlotte, NC", par:71, yards:7600, type:"parkland", grass:"bermuda", sgPremium:"ott", keyTraits:["The Green Mile (16-17-18) brutally difficult","water on closing holes","power course"], whoWins:"Power players who can handle the Green Mile under pressure.", specialists:["Rory McIlroy","Rickie Fowler","Justin Thomas","Wyndham Clark"], fades:["Short hitters","Players who melt under closing pressure"], note:"Wells Fargo. The Green Mile (16-18) decides the tournament." },
};

// ── NBA Player Database ───────────────────────────────────────────────────────
const NBA_PLAYERS = {
  "Nikola Jokic":            { team:"DEN", pos:"C", tier:"ELITE", pts:29.6, reb:12.7, ast:10.2, props:{ pra:{ floor:45,ceil:70,lean:"OVER on PRA -- safest bet in NBA" }, pts:{ floor:22,ceil:45,lean:"OVER" }, reb:{ floor:10,ceil:18,lean:"OVER" }, ast:{ floor:7,ceil:15,lean:"OVER" } }, usage:"37.2%", bettingAngles:["PRA over is the safest prop in basketball -- consistent 50+ nights","Assists over in fast-paced games","Rebounds over when Murray/Porter are out"] },
  "Shai Gilgeous-Alexander": { team:"OKC", pos:"G", tier:"ELITE", pts:32.7, reb:5.1,  ast:6.4,  props:{ pts:{ floor:25,ceil:50,lean:"OVER -- gets to line 8-10 times per game" }, pra:{ floor:38,ceil:58,lean:"OVER" } }, usage:"34.1%", bettingAngles:["Points over is the primary play","Free throw attempts prop: OVER almost every game","PRA safer than pts alone"] },
  "Luka Doncic":             { team:"LAL", pos:"G", tier:"ELITE", pts:28.1, reb:8.2,  ast:8.0,  props:{ pts:{ floor:20,ceil:45,lean:"OVER" }, pra:{ floor:38,ceil:60,lean:"OVER" } }, usage:"36.8%", bettingAngles:["PRA over safest play -- even quiet scoring nights produce big all-around lines","Assists over when LeBron/AD limit scoring"] },
  "Jayson Tatum":            { team:"BOS", pos:"F", tier:"ELITE", pts:26.9, reb:8.1,  ast:4.9,  props:{ pts:{ floor:20,ceil:42,lean:"OVER in playoff spots" }, pra:{ floor:35,ceil:55,lean:"OVER" } }, usage:"32.1%", bettingAngles:["Points floor high -- scores 20+ in 70%+ of games","Fade in blowouts -- Celtics rest starters","Back in elimination/must-win spots"] },
  "Giannis Antetokounmpo":   { team:"MIL", pos:"F", tier:"ELITE", pts:30.4, reb:11.5, ast:6.5,  props:{ pra:{ floor:44,ceil:65,lean:"OVER" }, pts:{ floor:24,ceil:50,lean:"OVER" } }, usage:"35.7%", bettingAngles:["PRA over elite -- 50+ PRA in 40%+ of games","FT volume makes pts props viable on off nights"] },
  "Anthony Edwards":         { team:"MIN", pos:"G", tier:"ELITE", pts:27.8, reb:5.4,  ast:5.1,  props:{ pts:{ floor:20,ceil:44,lean:"OVER -- explosive scorer" }, pra:{ floor:32,ceil:52,lean:"OVER" } }, usage:"33.4%", bettingAngles:["Points over is primary market","Back in rivalry/national TV games"] },
  "Victor Wembanyama":       { team:"SAS", pos:"C", tier:"ELITE", pts:24.5, reb:10.6, ast:3.9,  props:{ pts:{ floor:18,ceil:40,lean:"OVER" }, blk:{ floor:2,ceil:6,lean:"OVER -- elite shot blocker" } }, usage:"30.2%", bettingAngles:["Blocks over is the unique angle -- 3.5 per game pace","PRA over in pace-up matchups"] },
  "Karl-Anthony Towns":      { team:"NYK", pos:"C", tier:"STAR",  pts:24.3, reb:13.7, ast:3.2,  props:{ reb:{ floor:11,ceil:18,lean:"OVER -- elite rebounder" }, pra:{ floor:38,ceil:55,lean:"OVER" } }, usage:"28.7%", bettingAngles:["Rebounds over is the primary play","Back in MSG"] },
  "Tyrese Haliburton":       { team:"IND", pos:"G", tier:"STAR",  pts:20.1, reb:3.9,  ast:10.9, props:{ ast:{ floor:8,ceil:16,lean:"OVER -- elite passer, primary creator" }, pra:{ floor:30,ceil:48,lean:"OVER" } }, usage:"25.4%", bettingAngles:["Assists over is the primary play -- top-3 assist rate in league","Injury history is main risk"] },
  "Donovan Mitchell":        { team:"CLE", pos:"G", tier:"STAR",  pts:26.1, reb:4.4,  ast:5.4,  props:{ pts:{ floor:19,ceil:42,lean:"OVER" }, pra:{ floor:30,ceil:50,lean:"OVER" } }, usage:"30.8%", bettingAngles:["Points over is the primary play","Back in national TV/big market games"] },
  "Bam Adebayo":             { team:"MIA", pos:"C", tier:"STAR",  pts:19.2, reb:10.4, ast:4.4,  props:{ reb:{ floor:8,ceil:14,lean:"OVER" }, pra:{ floor:30,ceil:46,lean:"OVER" } }, usage:"25.1%", bettingAngles:["PRA over is the consistent play","Rebounds over in slow physical games"] },
  "LeBron James":            { team:"LAL", pos:"F", tier:"STAR",  pts:23.7, reb:8.0,  ast:8.2,  props:{ pra:{ floor:36,ceil:55,lean:"OVER" } }, usage:"29.4%", bettingAngles:["PRA over safest play -- contributes across all categories even at 40","Fade pts on back-to-backs"] },
  "Stephen Curry":           { team:"GSW", pos:"G", tier:"STAR",  pts:26.4, reb:4.5,  ast:6.1,  props:{ threes:{ floor:2,ceil:10,lean:"OVER -- best shooter in NBA history" } }, usage:"30.5%", bettingAngles:["3-pointers made over is the signature play -- 5+ three nights are routine"] },
  "Kevin Durant":            { team:"PHX", pos:"F", tier:"STAR",  pts:27.1, reb:6.8,  ast:4.2,  props:{ pts:{ floor:22,ceil:45,lean:"OVER -- most efficient scorer in league" }, pra:{ floor:33,ceil:55,lean:"OVER" } }, usage:"31.8%", bettingAngles:["Points over is primary -- elite efficiency","Back when Booker is out -- usage spikes"] },
  "Devin Booker":            { team:"PHX", pos:"G", tier:"STAR",  pts:25.4, reb:4.3,  ast:6.8,  props:{ pts:{ floor:18,ceil:40,lean:"OVER" }, pra:{ floor:32,ceil:50,lean:"OVER" } }, usage:"30.1%", bettingAngles:["Points over is primary","Assists over when Durant on minutes restriction"] },
  "Ja Morant":               { team:"MEM", pos:"G", tier:"STAR",  pts:24.7, reb:5.1,  ast:8.1,  props:{ pts:{ floor:18,ceil:42,lean:"OVER when healthy" }, pra:{ floor:33,ceil:52,lean:"OVER" } }, usage:"30.9%", bettingAngles:["Health is the primary risk -- monitor reports closely","Fade on back-to-backs or after any injury concern"] },
  "Zion Williamson":         { team:"NOP", pos:"F", tier:"STAR",  pts:23.8, reb:5.8,  ast:4.1,  props:{ pts:{ floor:18,ceil:38,lean:"OVER when healthy" } }, usage:"32.4%", bettingAngles:["Health check is non-negotiable -- confirm active before any bet"] },
  "Cade Cunningham":         { team:"DET", pos:"G", tier:"STAR",  pts:25.2, reb:6.1,  ast:9.0,  props:{ pra:{ floor:36,ceil:54,lean:"OVER" }, ast:{ floor:7,ceil:13,lean:"OVER" } }, usage:"31.5%", bettingAngles:["PRA over is a strong play","Assists over -- top-5 playmaker in league"] },
  "Paolo Banchero":          { team:"ORL", pos:"F", tier:"STAR",  pts:24.6, reb:7.4,  ast:5.8,  props:{ pra:{ floor:33,ceil:52,lean:"OVER" } }, usage:"30.2%", bettingAngles:["PRA over -- contributing across all three categories","Orlando's clear #1 option"] },
  "Trae Young":              { team:"ATL", pos:"G", tier:"STAR",  pts:23.7, reb:2.8,  ast:11.4, props:{ ast:{ floor:9,ceil:16,lean:"OVER -- top-3 assists in league" }, pra:{ floor:32,ceil:52,lean:"OVER" } }, usage:"31.2%", bettingAngles:["Assists over is the primary play","Atlanta rebuilding -- maximum usage"] },
  "Damian Lillard":          { team:"MIL", pos:"G", tier:"STAR",  pts:24.1, reb:4.2,  ast:7.4,  props:{ pts:{ floor:18,ceil:40,lean:"OVER" }, threes:{ floor:2,ceil:7,lean:"OVER" } }, usage:"29.8%", bettingAngles:["Points over when Giannis is limited","3-pointers made: elite from deep including logo range"] },
  "LaMelo Ball":             { team:"CHA", pos:"G", tier:"STAR",  pts:22.4, reb:5.2,  ast:8.5,  props:{ ast:{ floor:6,ceil:12,lean:"OVER" }, pra:{ floor:30,ceil:50,lean:"OVER" } }, usage:"28.6%", bettingAngles:["Assists over is primary","Health check required -- injury history is real"] },
  "Anthony Davis":           { team:"LAL", pos:"C", tier:"STAR",  pts:24.7, reb:12.1, ast:3.4,  props:{ pra:{ floor:36,ceil:54,lean:"OVER" }, reb:{ floor:9,ceil:16,lean:"OVER" } }, usage:"28.9%", bettingAngles:["PRA over is the primary play","Health check required"] },
  "Jalen Brunson":           { team:"NYK", pos:"G", tier:"STAR",  pts:26.6, reb:3.4,  ast:7.5,  props:{ pts:{ floor:20,ceil:42,lean:"OVER" }, pra:{ floor:30,ceil:50,lean:"OVER" } }, usage:"32.6%", bettingAngles:["Points over is primary","Back at MSG"] },
  "Scottie Barnes":          { team:"TOR", pos:"F", tier:"STAR",  pts:21.8, reb:8.5,  ast:6.2,  props:{ pra:{ floor:32,ceil:48,lean:"OVER" }, reb:{ floor:7,ceil:12,lean:"OVER" } }, usage:"27.8%", bettingAngles:["PRA over is the primary play","Rebounds over in physical matchups"] },
  "Franz Wagner":            { team:"ORL", pos:"F", tier:"STAR",  pts:22.4, reb:5.2,  ast:4.8,  props:{ pts:{ floor:16,ceil:35,lean:"OVER" }, pra:{ floor:26,ceil:44,lean:"OVER" } }, usage:"27.1%", bettingAngles:["Points over is primary -- consistent scorer"] },
  "Alperen Sengun":          { team:"HOU", pos:"C", tier:"STAR",  pts:21.1, reb:9.4,  ast:5.1,  props:{ pra:{ floor:32,ceil:50,lean:"OVER" }, ast:{ floor:3,ceil:8,lean:"OVER -- elite passer for center" } }, usage:"26.4%", bettingAngles:["PRA over is primary -- elite all-around big","Assists over -- rare playmaking ability"] },
  "Jaylen Brown":            { team:"BOS", pos:"F", tier:"STAR",  pts:23.0, reb:5.5,  ast:3.6,  props:{ pts:{ floor:17,ceil:36,lean:"OVER" }, pra:{ floor:28,ceil:44,lean:"OVER" } }, usage:"28.1%", bettingAngles:["Points over primary -- elite scorer in Boston system","Back in elimination/playoff games"] },
  "Rudy Gobert":             { team:"MIN", pos:"C", tier:"SOLID", pts:13.4, reb:12.0, ast:1.4,  props:{ reb:{ floor:10,ceil:17,lean:"OVER -- elite rebounder" } }, usage:"17.8%", bettingAngles:["Rebounds over is the primary play -- consistently top-3","Double-double prop: hits it 70%+ of games"] },
  "Jaren Jackson Jr.":       { team:"MEM", pos:"C", tier:"SOLID", pts:22.1, reb:6.0,  ast:1.6,  props:{ blk:{ floor:2,ceil:5,lean:"OVER -- Defensive POY caliber" }, pts:{ floor:16,ceil:34,lean:"OVER" } }, usage:"27.4%", bettingAngles:["Blocks over is the unique angle","Points over in games alongside Ja"] },
  "Jamal Murray":            { team:"DEN", pos:"G", tier:"SOLID", pts:20.8, reb:4.2,  ast:6.3,  props:{ pts:{ floor:14,ceil:34,lean:"OVER" }, pra:{ floor:28,ceil:46,lean:"OVER" } }, usage:"24.6%", bettingAngles:["Points over in playoff-important games","Health check required"] },
  "Evan Mobley":             { team:"CLE", pos:"C", tier:"SOLID", pts:18.6, reb:9.4,  ast:2.9,  props:{ pra:{ floor:28,ceil:44,lean:"OVER" }, reb:{ floor:7,ceil:14,lean:"OVER" } }, usage:"23.8%", bettingAngles:["PRA over is the consistent play","Rebounds over in physical interior matchups"] },
  "Josh Hart":               { team:"NYK", pos:"G", tier:"SOLID", pts:12.4, reb:9.8,  ast:4.6,  props:{ reb:{ floor:8,ceil:14,lean:"OVER -- elite rebounder for a guard" }, pra:{ floor:24,ceil:38,lean:"OVER" } }, usage:"17.2%", bettingAngles:["Rebounds over is the primary play -- anomalous for his position"] },
  "Lauri Markkanen":         { team:"UTA", pos:"F", tier:"SOLID", pts:23.2, reb:8.2,  ast:2.4,  props:{ pra:{ floor:28,ceil:46,lean:"OVER" }, threes:{ floor:2,ceil:5,lean:"OVER" } }, usage:"26.4%", bettingAngles:["PRA over is the consistent play","Utah rebuilding -- usage maximized"] },
  "Jalen Williams":          { team:"OKC", pos:"F", tier:"SOLID", pts:22.5, reb:4.5,  ast:5.8,  props:{ pts:{ floor:16,ceil:34,lean:"OVER" }, pra:{ floor:28,ceil:46,lean:"OVER" } }, usage:"26.8%", bettingAngles:["Points over when SGA is limited","PRA over -- elite all-around second option"] },
};

// ── NFL Databases ─────────────────────────────────────────────────────────────
const NFL_PLAYERS = {
  "James Cook":         { pos:"RB", team:"BUF", tier:"ELITE",  ydsPg:112.3, rec2025:{g:16,yds:1797,td:14,recPg:2.7,ypr:7.6},  props:{recYds:{floor:80,ceil:150,lean:"OVER"},td:{pg:0.88,lean:"OVER -- 14 TDs, elite scorer"}}, situation:"Bills RB1. Every-down back.", bettingAngles:["Rush yards OVER every week","TD scorer OVER -- primary play"] },
  "Jonathan Taylor":    { pos:"RB", team:"IND", tier:"ELITE",  ydsPg:105.1, rec2025:{g:17,yds:1786,td:14,recPg:3.2,ypr:4.6},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.82,lean:"OVER 0.5 -- elite red zone back"}}, situation:"Colts RB1.", bettingAngles:["Rush yards OVER weekly","TD scorer OVER"] },
  "Derrick Henry":      { pos:"RB", team:"BAL", tier:"ELITE",  ydsPg:103.3, rec2025:{g:16,yds:1653,td:15,recPg:1.1,ypr:5.1},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.94,lean:"OVER -- 15 TDs, most on team"}}, situation:"Ravens RB1 and primary red zone weapon.", bettingAngles:["Rush yards OVER every week","TD scorer -- highest rate in NFL","Fade receiving yards"] },
  "Bijan Robinson":     { pos:"RB", team:"ATL", tier:"ELITE",  ydsPg:100.8, rec2025:{g:17,yds:1713,td:11,recPg:3.8,ypr:5.3},  props:{recYds:{floor:70,ceil:140,lean:"OVER"},td:{pg:0.65,lean:"OVER in favorable matchups"}}, situation:"Falcons RB1. Every-down back with elite receiving role.", bettingAngles:["Rush yards OVER","Receiving yards OVER pass-heavy weeks"] },
  "De'Von Achane":      { pos:"RB", team:"MIA", tier:"ELITE",  ydsPg:93.7,  rec2025:{g:14,yds:1312,td:12,recPg:5.4,ypr:6.3},  props:{recYds:{floor:65,ceil:135,lean:"OVER"},td:{pg:0.86,lean:"OVER -- 12 TDs in 14g"}}, situation:"Dolphins dual-threat RB. Health is the only risk.", bettingAngles:["Rush yards OVER when healthy","Hard fade when injured"] },
  "Puka Nacua":         { pos:"WR", team:"LAR", tier:"ELITE",  ydsPg:107.2, rec2025:{g:16,tgt:166,rec:129,yds:1715,td:0,recPg:8.1,ypr:13.3}, props:{recYds:{floor:75,ceil:140,lean:"OVER"},rec:{floor:6,ceil:11,lean:"OVER -- 8.1/g"},td:{pg:0,lean:"FADE TD scorer -- 0 TDs in 16g"}}, situation:"Rams WR1. Most receptions in NFL 2025. Zero TDs.", bettingAngles:["Receiving yards OVER every week","Catches OVER -- elite volume","FADE TD scorer -- never"] },
  "Ja'Marr Chase":      { pos:"WR", team:"CIN", tier:"ELITE",  ydsPg:88.3,  rec2025:{g:16,tgt:185,rec:125,yds:1412,td:10,recPg:7.8,ypr:11.3}, props:{recYds:{floor:65,ceil:125,lean:"OVER when Burrow healthy"},td:{pg:0.63,lean:"OVER 0.5 favorable matchups"}}, situation:"Bengals WR1. Burrow health is the only variable.", bettingAngles:["Rec yards OVER when Burrow active","Hard fade when Burrow out"] },
  "Jaxon Smith-Njigba": { pos:"WR", team:"SEA", tier:"ELITE",  ydsPg:105.5, rec2025:{g:17,tgt:163,rec:119,yds:1793,td:6,recPg:7.0,ypr:15.1}, props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.35,lean:"Moderate"}}, situation:"Seahawks WR1. Led NFL in receiving yards 2025.", bettingAngles:["Receiving yards OVER","Volume locked regardless of QB"] },
  "Trey McBride":       { pos:"TE", team:"ARI", tier:"ELITE",  ydsPg:72.9,  rec2025:{g:17,tgt:169,rec:126,yds:1239,td:5,recPg:7.4,ypr:9.8}, props:{rec:{floor:5,ceil:10,lean:"OVER -- 7.4/g leads all TEs"},recYds:{floor:55,ceil:100,lean:"OVER"},td:{pg:0.29,lean:"Moderate -- 5 TDs only"}}, situation:"Best TE situation in football.", bettingAngles:["Catches OVER every week","Receiving yards OVER","FADE TD scorer"] },
  "Travis Kelce":       { pos:"TE", team:"KAN", tier:"ELITE",  ydsPg:50.1,  rec2025:{g:17,tgt:108,rec:76,yds:851,td:4,recPg:4.5,ypr:11.2}, props:{rec:{floor:3,ceil:7,lean:"OVER -- Mahomes always finds him"},td:{pg:0.24,lean:"Moderate -- age 37"}}, situation:"Chiefs TE1. Age 37. Declining but Mahomes keeps relevant.", bettingAngles:["Catches OVER when Mahomes healthy","FADE receiving yards -- real floor ~50"] },
};

const NFL_QBS = {
  "Josh Allen":       { team:"BUF", tier:"ELITE",   passing:{ gs:17,cmp:69.3,yds:3668,td:25,int:10,ypa:8.0,rate:102.2,qbr:65.4 }, advanced:{ ontgt:79.9,badTh:13.0,prss:18.0,pktTime:2.5,iay_pa:7.3 }, rushing:{ attPg:6.6,ydsPg:34.1,tdPg:0.82,ypc:5.2,tier:"ELITE RUSHER" }, note:"79.9% on-target plus elite rushing floor = safest QB1 in football." },
  "Drake Maye":       { team:"NE",  tier:"ELITE",   passing:{ gs:17,cmp:72.0,yds:4394,td:31,int:8,ypa:8.9,rate:113.5,qbr:77.1 }, advanced:{ ontgt:79.0,badTh:13.8,prss:21.8,pktTime:2.4,iay_pa:9.1 }, rushing:{ attPg:6.1,ydsPg:26.5,tdPg:0.24,ypc:4.4,tier:"STRONG RUSHER" }, note:"QBR 77.1 as a rookie is historically rare." },
  "Patrick Mahomes":  { team:"KC",  tier:"ELITE",   passing:{ gs:14,cmp:62.7,yds:3587,td:22,int:11,ypa:7.1,rate:89.6,qbr:68.5 }, advanced:{ ontgt:74.3,badTh:17.9,prss:24.0,pktTime:2.2,iay_pa:7.9 }, rushing:{ attPg:4.6,ydsPg:30.1,tdPg:0.36,ypc:6.6,tier:"ELITE RUSHER" }, note:"30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football." },
  "Lamar Jackson":    { team:"BAL", tier:"ELITE",   passing:{ gs:13,cmp:63.6,yds:2549,td:21,int:7,ypa:8.4,rate:103.8,qbr:62.7 }, advanced:{ ontgt:72.4,badTh:18.3,prss:23.6,pktTime:2.5,iay_pa:8.8 }, rushing:{ attPg:5.2,ydsPg:26.8,tdPg:0.15,ypc:5.2,tier:"STRONG RUSHER" }, note:"Rushing floor covers accuracy concerns. Health is the key variable." },
  "Joe Burrow":       { team:"CIN", tier:"ELITE",   passing:{ gs:8,cmp:66.8,yds:1809,td:17,int:5,ypa:7.0,rate:100.7,qbr:63.0 }, note:"80.3% on-target is the real Burrow. Bet TDs aggressively when healthy." },
  "Matthew Stafford": { team:"LAR", tier:"ELITE",   passing:{ gs:17,cmp:65.0,yds:4707,td:46,int:8,ypa:7.9,rate:109.2,qbr:71.2 }, advanced:{ ontgt:73.6,badTh:18.1,prss:18.5,pktTime:2.4,iay_pa:9.0 }, props:{ passTd:{ pg:2.71,lean:"OVER 2.5" } }, note:"9.0 IAY/PA highest among all starters. TD prop (2.71/g) most reliable in NFC." },
  "Dak Prescott":     { team:"DAL", tier:"ELITE",   passing:{ gs:17,cmp:67.3,yds:4552,td:30,int:10,ypa:7.6,rate:99.5,qbr:70.2 }, advanced:{ ontgt:74.8,badTh:12.5,prss:21.6,pktTime:2.4,iay_pa:8.0 }, note:"12.5% bad throw rate is cleanest among ELITE tier QBs." },
  "Jordan Love":      { team:"GB",  tier:"ELITE",   passing:{ gs:15,cmp:66.3,yds:3381,td:23,int:6,ypa:7.7,rate:101.2,qbr:72.7 }, advanced:{ ontgt:77.4,badTh:14.6,prss:22.1,pktTime:2.4,iay_pa:8.7 }, note:"Most underrated QB in football. QBR 72.7 with only 6 INTs." },
  "Jared Goff":       { team:"DET", tier:"STARTER", passing:{ gs:17,cmp:68.0,yds:4564,td:34,int:8,ypa:7.9,rate:105.5,qbr:57.3 }, advanced:{ ontgt:78.3,badTh:15.8,prss:24.5,pktTime:2.3,iay_pa:6.4 }, props:{ passTd:{ pg:2.0,lean:"OVER 1.5 every week" } }, note:"FADE in cold outdoor road games." },
  "Brock Purdy":      { team:"SF",  tier:"STARTER", passing:{ gs:9,cmp:69.4,yds:2167,td:20,int:10,ypa:7.6,rate:100.5,qbr:72.8 }, advanced:{ ontgt:82.2,badTh:12.3,prss:21.1,pktTime:2.7,iay_pa:7.5 }, note:"82.2% on-target highest among all starters." },
  "Jalen Hurts":      { team:"PHI", tier:"STARTER", passing:{ gs:16,cmp:64.8,yds:3224,td:25,int:6,ypa:7.1,rate:98.5,qbr:55.2 }, advanced:{ ontgt:74.0,badTh:16.7,prss:20.0,pktTime:2.5,iay_pa:9.0 }, rushing:{ attPg:6.6,ydsPg:26.3,tdPg:0.50,tier:"STRONG RUSHER" }, note:"Rushing floor (designed runs 6.6/g) covers any passing variance." },
  "C.J. Stroud":      { team:"HOU", tier:"STARTER", passing:{ gs:14,cmp:64.5,yds:3041,td:19,int:8,ypa:7.2,rate:92.9,qbr:61.7 }, advanced:{ ontgt:74.6,badTh:17.6,prss:21.4,pktTime:2.4,iay_pa:7.9 }, note:"Year 3 with healthy weapons projects top-8 QB." },
  "Trevor Lawrence":  { team:"JAX", tier:"STARTER", passing:{ gs:17,cmp:60.9,yds:4007,td:29,int:12,ypa:7.2,rate:91.0,qbr:58.3 }, advanced:{ ontgt:73.7,badTh:14.4,prss:21.8,pktTime:2.4,iay_pa:8.7 }, rushing:{ attPg:4.8,ydsPg:21.1,tdPg:0.53,tier:"STRONG RUSHER" }, note:"Total TD prop (rushing + passing) most underrated bet on his slate." },
  "Caleb Williams":   { team:"CHI", tier:"STARTER", passing:{ gs:17,cmp:58.1,yds:3942,td:27,int:7,ypa:6.9,rate:90.1,qbr:58.2 }, advanced:{ ontgt:69.8,badTh:20.7,prss:25.1,pktTime:2.5,iay_pa:8.5 }, rushing:{ attPg:4.5,ydsPg:22.8,tier:"STRONG RUSHER" }, note:"Year 2 with better cast is the buy. Bears team total OVER is the play." },
  "Bo Nix":           { team:"DEN", tier:"STARTER", passing:{ gs:17,cmp:63.4,yds:3931,td:25,int:11,ypa:6.4,rate:87.8,qbr:58.3 }, advanced:{ ontgt:77.4,badTh:15.9,prss:19.1,pktTime:2.4,iay_pa:7.3 }, rushing:{ attPg:4.9,ydsPg:20.9,tier:"STRONG RUSHER" }, note:"RPO scheme generates Denver offense. Fade in shootouts." },
  "Baker Mayfield":   { team:"TB",  tier:"STARTER", passing:{ gs:17,cmp:63.2,yds:3693,td:26,int:11,ypa:6.8,rate:90.6,qbr:61.3 }, advanced:{ ontgt:73.7,badTh:15.7,prss:14.8,pktTime:2.3,iay_pa:8.0 }, rushing:{ attPg:3.2,ydsPg:22.5,ypc:6.9,tier:"STRONG RUSHER" }, note:"Lowest pressure rate among starters (14.8%). Evans TD scorer OVER." },
  "Jayden Daniels":   { team:"WAS", tier:"STARTER", passing:{ gs:7,cmp:60.6,yds:1262,td:8,int:3 }, rushing:{ attPg:8.3,ydsPg:39.7,tdPg:0.29,tier:"ELITE RUSHER" }, note:"Health is the only real question. 39.7 rushing yds/g pace is best in NFC." },
  "Kyler Murray":     { team:"MIN", tier:"STARTER", passing:{ gs:5 }, rushing:{ attPg:5.8,ydsPg:34.6,ypc:6.0,tier:"ELITE RUSHER" }, note:"Health is the only ceiling. O'Connell scheme + Jefferson is generational." },
  "Jaxson Dart":      { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12,cmp:63.7,yds:2272,td:15,int:5,ypa:6.7,rate:91.7,qbr:57.5 }, advanced:{ ontgt:72.9,badTh:15.5,prss:23.3,pktTime:2.4,iay_pa:8.1 }, rushing:{ attPg:6.1,ydsPg:34.8,tdPg:0.64,ypc:5.7,tier:"ELITE RUSHER" }, note:"34.8 rushing yds/g is best prop edge in the NFC East. Market ignores it." },
  "Shedeur Sanders":  { team:"TEN", tier:"ROOKIE",  passing:{ gs:0 }, note:"2026 Draft Pick #1 overall by Tennessee Titans. Titans supporting cast is bottom-5. Fade Titans early-season totals." },
};

// ── F1 Data ───────────────────────────────────────────────────────────────────
const F1_CALENDAR = [
  { meeting_name:"Australian Grand Prix",    location:"Melbourne",   date_start:"2026-03-06T00:00:00", date_end:"2026-03-08T23:59:00", completed:true,  winner:"Russell"   },
  { meeting_name:"Chinese Grand Prix",       location:"Shanghai",    date_start:"2026-03-13T00:00:00", date_end:"2026-03-15T23:59:00", completed:true,  winner:"Antonelli" },
  { meeting_name:"Japanese Grand Prix",      location:"Suzuka",      date_start:"2026-03-27T00:00:00", date_end:"2026-03-29T23:59:00", completed:true,  winner:"Antonelli" },
  { meeting_name:"Miami Grand Prix",         location:"Miami",       date_start:"2026-05-01T00:00:00", date_end:"2026-05-03T23:59:00", completed:false, winner:null        },
  { meeting_name:"Canadian Grand Prix",      location:"Montreal",    date_start:"2026-05-22T00:00:00", date_end:"2026-05-24T23:59:00", completed:false, winner:null        },
  { meeting_name:"Monaco Grand Prix",        location:"Monaco",      date_start:"2026-06-05T00:00:00", date_end:"2026-06-07T23:59:00", completed:false, winner:null        },
  { meeting_name:"Spanish Grand Prix",       location:"Barcelona",   date_start:"2026-06-12T00:00:00", date_end:"2026-06-14T23:59:00", completed:false, winner:null        },
  { meeting_name:"Austrian Grand Prix",      location:"Spielberg",   date_start:"2026-06-26T00:00:00", date_end:"2026-06-28T23:59:00", completed:false, winner:null        },
  { meeting_name:"British Grand Prix",       location:"Silverstone", date_start:"2026-07-03T00:00:00", date_end:"2026-07-05T23:59:00", completed:false, winner:null        },
  { meeting_name:"Belgian Grand Prix",       location:"Spa",         date_start:"2026-07-17T00:00:00", date_end:"2026-07-19T23:59:00", completed:false, winner:null        },
  { meeting_name:"Hungarian Grand Prix",     location:"Budapest",    date_start:"2026-07-24T00:00:00", date_end:"2026-07-26T23:59:00", completed:false, winner:null        },
  { meeting_name:"Dutch Grand Prix",         location:"Zandvoort",   date_start:"2026-08-21T00:00:00", date_end:"2026-08-23T23:59:00", completed:false, winner:null        },
  { meeting_name:"Italian Grand Prix",       location:"Monza",       date_start:"2026-09-04T00:00:00", date_end:"2026-09-06T23:59:00", completed:false, winner:null        },
  { meeting_name:"Azerbaijan Grand Prix",    location:"Baku",        date_start:"2026-09-24T00:00:00", date_end:"2026-09-26T23:59:00", completed:false, winner:null        },
  { meeting_name:"Singapore Grand Prix",     location:"Singapore",   date_start:"2026-10-09T00:00:00", date_end:"2026-10-11T23:59:00", completed:false, winner:null        },
  { meeting_name:"United States Grand Prix", location:"Austin",      date_start:"2026-10-23T00:00:00", date_end:"2026-10-25T23:59:00", completed:false, winner:null        },
  { meeting_name:"Mexico City Grand Prix",   location:"Mexico City", date_start:"2026-10-30T00:00:00", date_end:"2026-11-01T23:59:00", completed:false, winner:null        },
  { meeting_name:"Sao Paulo Grand Prix",     location:"Sao Paulo",   date_start:"2026-11-06T00:00:00", date_end:"2026-11-08T23:59:00", completed:false, winner:null        },
  { meeting_name:"Las Vegas Grand Prix",     location:"Las Vegas",   date_start:"2026-11-19T00:00:00", date_end:"2026-11-21T23:59:00", completed:false, winner:null        },
  { meeting_name:"Abu Dhabi Grand Prix",     location:"Abu Dhabi",   date_start:"2026-12-04T00:00:00", date_end:"2026-12-06T23:59:00", completed:false, winner:null        },
];

const F1_STANDINGS = [
  { position:1,  full_name:"Kimi Antonelli",    team_name:"Mercedes",     points:62 },
  { position:2,  full_name:"George Russell",    team_name:"Mercedes",     points:43 },
  { position:3,  full_name:"Charles Leclerc",   team_name:"Ferrari",      points:30 },
  { position:4,  full_name:"Oscar Piastri",     team_name:"McLaren",      points:18 },
  { position:5,  full_name:"Lewis Hamilton",    team_name:"Ferrari",      points:15 },
  { position:6,  full_name:"Lando Norris",      team_name:"McLaren",      points:12 },
  { position:7,  full_name:"Max Verstappen",    team_name:"Red Bull",     points:8  },
  { position:8,  full_name:"Carlos Sainz",      team_name:"Williams",     points:6  },
  { position:9,  full_name:"Fernando Alonso",   team_name:"Aston Martin", points:4  },
  { position:10, full_name:"Isack Hadjar",      team_name:"Red Bull",     points:4  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function summarizeMatchupContext(mc) {
  if (!mc) return null;
  const parts = [];
  if (mc.title)       parts.push("Title: " + mc.title);
  if (mc.league)      parts.push("League: " + mc.league);
  if (mc.time)        parts.push("Time: " + mc.time);
  if (mc.whatMatters) parts.push("What matters: " + mc.whatMatters);
  if (Array.isArray(mc.quickHitters) && mc.quickHitters.length) parts.push("Quick hitters: " + mc.quickHitters.join(" | "));
  return parts.join("\n");
}

function cleanResponseText(text) {
  return String(text || "")
    .replace(/^i['']?m ur take.*$/gim, "")
    .replace(/^ur take[:-]\s*/gim, "")
    .replace(/^without (access to |real-?time |current )[^\n]*/gim, "")
    .replace(/^i don['']?t have (access to |real-?time |live |current )[^\n]*/gim, "")
    .replace(/^as of my (knowledge |training )?cutoff[^\n]*/gim, "")
    .trim();
}

function responseLooksWrongForSport(text, sport) {
  const t = String(text || "").toLowerCase();
  if (sport === "tennis") return t.includes("i don't cover tennis") || (t.includes("quarterback") && !t.includes("tennis"));
  if (sport === "nfl")    return t.includes("grand slam") && !t.includes("super bowl");
  return false;
}

function detectSport(question, sportHint, matchupContext) {
  const q = String(question || "").toLowerCase();
  if (sportHint === "nfl")    return "nfl";
  if (sportHint === "tennis") return "tennis";
  if (sportHint === "f1")     return "f1";
  if (sportHint === "nba")    return "nba";
  if (sportHint === "mlb")    return "mlb";
  if (sportHint === "golf")   return "golf";

  const mcLeague = String((matchupContext && matchupContext.league) || "").toLowerCase();
  if (mcLeague.includes("nfl"))                                return "nfl";
  if (mcLeague.includes("atp")||mcLeague.includes("wta"))      return "tennis";
  if (mcLeague.includes("pga")||mcLeague.includes("golf"))     return "golf";
  if (mcLeague.includes("f1")||mcLeague.includes("formula"))   return "f1";
  if (mcLeague.includes("nba"))                                return "nba";
  if (mcLeague.includes("mlb"))                                return "mlb";

  const golfPlayers = ["scheffler","mcilroy","rory ","schauffele","xander","morikawa","collin","hovland","viktor","cantlay","rahm","aberg","ludvig","wyndham clark","finau","russell henley","sam burns","sungjae","fleetwood","fitzpatrick","cameron smith","hatton","shane lowry","matsuyama","hideki","justin thomas","spieth","brian harman","tom kim","macintyre","theegala","rickie fowler","keegan bradley","adam scott","cameron young","chris kirk","sepp straka","dustin johnson","brooks koepka","bryson","tiger woods","phil mickelson","jake knapp","corey conners","emiliano grillo","denny mccarthy","akshay bhatia","min woo lee","eric cole","taylor moore","mackenzie hughes","nick taylor","jason day","haotong li","hao-tong","justin rose"];
  for (const p of golfPlayers) { if (q.includes(p)) return "golf"; }

  const tennisPlayers = ["alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton","fritz","draper","bublik","mensik","ruud","rublev","sabalenka","rybakina","swiatek","pegula","gauff","andreeva","paolini","keys","osaka","noskova","kostyuk","zheng","kartal"];
  for (const p of tennisPlayers) { if (q.includes(p)) return "tennis"; }

  const f1Drivers = ["antonelli","george russell","leclerc","lewis hamilton","lando norris","oscar piastri","max verstappen","verstappen","isack hadjar","carlos sainz","alexander albon","fernando alonso","lance stroll","pierre gasly","franco colapinto","hulkenberg","bortoleto","oliver bearman","esteban ocon","liam lawson","bottas","sergio perez"];
  for (const d of f1Drivers) { if (q.includes(d)) return "f1"; }

  const nflPlayers = ["mahomes","josh allen","lamar jackson","joe burrow","dak prescott","jalen hurts","brock purdy","jared goff","matthew stafford","cj stroud","trevor lawrence","jordan love","drake maye","jayden daniels","caleb williams","bo nix","baker mayfield","kyler murray","shedeur sanders","derrick henry","james cook","jonathan taylor","de'von achane","puka nacua","ja'marr chase","jaxon smith-njigba","george pickens","ceedee lamb","trey mcbride","brock bowers","travis kelce","tyreek hill","davante adams"];
  for (const p of nflPlayers) { if (q.includes(p)) return "nfl"; }

  const nbaPlayers = ["jokic","nikola jokic","shai gilgeous","sga","luka doncic","jayson tatum","giannis","wembanyama","jalen brunson","steph curry","kevin durant","devin booker","ja morant","anthony edwards","karl-anthony towns","tyrese haliburton","donovan mitchell","bam adebayo","lebron","lamelo","damian lillard","trae young","anthony davis","rudy gobert","jaren jackson","lauri markkanen","cade cunningham","paolo banchero","scottie barnes","franz wagner","alperen sengun","jaylen brown"];
  for (const p of nbaPlayers) { if (q.includes(p)) return "nba"; }

  const mlbPlayers = ["ohtani","shohei","mike trout","aaron judge","acuna","mookie betts","freddie freeman","pete alonso","lindor","corbin carroll","gunnar henderson","corey seager","bryce harper","guerrero","jose ramirez","julio rodriguez","gerrit cole","paul skenes","zack wheeler","corbin burnes"];
  for (const p of mlbPlayers) { if (q.includes(p)) return "mlb"; }

  const golfTerms = ["pga tour","pga championship","the masters","masters tournament","the open championship","british open","us open golf","ryder cup","strokes gained","sg total","sg app","make cut","missed cut","course fit","bentgrass","poa annua","augusta national","tpc sawgrass","pebble beach","pinehurst","riviera","quail hollow","royal troon","amen corner","green jacket"];
  for (const t of golfTerms) { if (q.includes(t)) return "golf"; }

  const tennisTerms = ["roland garros","french open","wimbledon","australian open","miami open","wta tour","atp tour","surface elo","clay court","grass court","tiebreak"];
  for (const t of tennisTerms) { if (q.includes(t)) return "tennis"; }

  const f1Terms = ["formula 1","formula one","grand prix","f1 race","constructor championship","driver championship","pit stop","drs zone"];
  for (const t of f1Terms) { if (q.includes(t)) return "f1"; }

  const nbaTerms = ["nba finals","nba playoffs","triple double","nba prop","pra ","three pointer","usage rate"];
  for (const t of nbaTerms) { if (q.includes(t)) return "nba"; }

  const mlbTerms = ["world series","starting pitcher","earned run average","strikeout rate","batting average","home run prop","k prop","park factor","barrel rate","statcast"];
  for (const t of mlbTerms) { if (q.includes(t)) return "mlb"; }

  if (q.includes("golf"))       return "golf";
  if (q.includes("tennis"))     return "tennis";
  if (q.includes("basketball")) return "nba";
  if (q.includes("baseball"))   return "mlb";
  if (q.includes("football"))   return "nfl";

  const nflTeams = ["bills","patriots","dolphins","jets","ravens","bengals","browns","steelers","texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos","cowboys","giants","eagles","commanders","bears","lions","packers","vikings","falcons","panthers","saints","buccaneers","cardinals","rams","49ers","seahawks"];
  for (const t of nflTeams) { if (q.includes(t)) return "nfl"; }

  const nbaTeams = ["lakers","celtics","warriors","nuggets","bucks","heat","thunder","knicks","sixers","nets","bulls","cavaliers","clippers","suns","mavericks","grizzlies","pelicans","jazz","kings","blazers","rockets","spurs","raptors","magic","pacers","hawks","hornets","pistons","timberwolves","wizards"];
  for (const t of nbaTeams) { if (q.includes(t)) return "nba"; }

  return "nfl";
}

function getRelevantQBs(question) {
  const q = question.toLowerCase();
  const relevant = {};
  for (const name in NFL_QBS) {
    const data = NFL_QBS[name];
    const parts = name.toLowerCase().split(" ");
    if (parts.some(p => p.length > 3 && q.includes(p))) relevant[name] = data;
    else if (data.team && q.includes(data.team.toLowerCase())) relevant[name] = data;
  }
  return Object.keys(relevant).length > 0 ? relevant : NFL_QBS;
}

function getRelevantSkillPlayers(question, nflContext) {
  if (!nflContext) return "No skill position data provided.";
  const q = String(question || "").toLowerCase();
  const blocks = String(nflContext).split("\n\n");
  const matched = blocks.filter(block => {
    const tokens = (block.toLowerCase().split("\n")[0] || "").split("|").map(s => s.trim());
    return tokens.some(token => token && token.length > 2 && q.includes(token));
  });
  return matched.length > 0 ? matched.slice(0, 10).join("\n\n") : blocks.slice(0, 15).join("\n\n");
}

function buildNflContext() {
  return Object.entries(NFL_PLAYERS).map(([name, p]) => {
    return [
      `${name} | ${p.pos} | ${p.team} | ${p.tier}`,
      `  Stats: ${p.ydsPg} yds/g | TDs: ${p.rec2025.td} in ${p.rec2025.g}g | Rec/g: ${p.rec2025.recPg||"—"}`,
      `  TD lean: ${p.props.td?.lean||"—"} | Volume lean: ${p.props.recYds?.lean||p.props.rec?.lean||"—"}`,
      `  Situation: ${p.situation}`,
      `  Angles: ${p.bettingAngles.join(" | ")}`,
    ].join("\n");
  }).join("\n\n");
}

// ── Golf System Prompt ────────────────────────────────────────────────────────
function buildGolfSystemPrompt(ctx) {
  const currentEvent = ctx?.currentEvent || null;
  const odds         = ctx?.odds         || {};
  const question     = ctx?.question     || "";
  const courseName   = currentEvent ? (currentEvent.course || currentEvent.name || "") : "";
  const courseNameLower = courseName.toLowerCase();

  // Live leaderboard pinned at the very top
  let leaderBlock = "";
  if (currentEvent?.leaderboard?.length > 0) {
    leaderBlock = `════════════════════════════════════
LIVE TOURNAMENT DATA -- THIS IS GROUND TRUTH
Never contradict these scores. Never fabricate round numbers not listed here.
════════════════════════════════════
EVENT: ${currentEvent.name || "Current PGA Tour Event"}
COURSE: ${currentEvent.course || "TBD"} | ${currentEvent.location || ""}
ROUND: ${currentEvent.round || "In Progress"}

LEADERBOARD:
${currentEvent.leaderboard.slice(0, 20).map(p =>
  `${p.position}. ${p.name} (${p.country}) -- ${p.score}` +
  (p.thru && p.thru !== "--" ? ` | Thru ${p.thru}` : "") +
  (p.today && p.today !== "--" ? ` | Today ${p.today}` : "") +
  (p.round1 && p.round1 !== "--" ? ` | R1:${p.round1}` : "") +
  (p.round2 && p.round2 !== "--" ? ` | R2:${p.round2}` : "") +
  (p.round3 && p.round3 !== "--" ? ` | R3:${p.round3}` : "") +
  (p.round4 && p.round4 !== "--" ? ` | R4:${p.round4}` : "")
).join("\n")}
════════════════════════════════════

`;
  } else if (currentEvent?.name) {
    leaderBlock = `════════════════════════════════════
CURRENT EVENT: ${currentEvent.name}
Course: ${currentEvent.course || "TBD"} | ${currentEvent.location || ""}
Round: ${currentEvent.round || "In Progress"}
Leaderboard: Not yet loaded. If the user provides scores, treat them as ground truth.
════════════════════════════════════

`;
  }

  let courseData = null;
  for (const cKey in PGA_COURSES) {
    if (cKey.toLowerCase().includes(courseNameLower) || courseNameLower.includes(cKey.toLowerCase())) { courseData = PGA_COURSES[cKey]; break; }
  }
  const courseSection = courseData
    ? `COURSE: ${courseName.toUpperCase()} | Type: ${courseData.type} | Grass: ${courseData.grass} | SG premium: ${courseData.sgPremium}\nWho wins: ${courseData.whoWins}\nSpecialists: ${(courseData.specialists||[]).join(", ")} | Fades: ${(courseData.fades||[]).join(", ")}\nNote: ${courseData.note}\n`
    : courseName ? `COURSE: ${courseName.toUpperCase()} -- Not in database. Use SG profiles -- SG Total gap is the primary signal.\n` : "";

  let oddsStr = "";
  if (odds?.outrights?.length > 0) {
    oddsStr = "MARKET ODDS (compare to UR FAIR ODDS):\n" +
      odds.outrights.slice(0, 25).map(o => `${o.player}: ${o.odds > 0 ? "+" : ""}${o.odds}`).join("\n") + "\n";
  }

  const playerStr = "PLAYER DATABASE:\n" +
    Object.entries(PGA_PLAYERS).filter(([, p]) => p.tier === 1).slice(0, 32).map(([name, p]) => {
      if (!p?.sg) return "";
      return `${name} | Rank ${p.rank} | SG: Total ${p.sg.total} OTT ${p.sg.ott} APP ${p.sg.app} ARG ${p.sg.arg} PUTT ${p.sg.putt} | Form: ${(p.recentForm||[]).join(",")} | Cut:${p.cutMaking} Top10:${p.top10Rate} Win:${p.winRate} | ${p.note||""}`;
    }).filter(Boolean).join("\n");

  return `You are Under Review -- the sharpest golf betting intelligence tool available.

IDENTITY: Sharp golf analyst. Lead with the lean. Make a call. NEVER ask for more information.

FORMATTING: NEVER use markdown. No ##, no ---, no ** bold. Plain text only.

CRITICAL FACTUAL RULES -- READ THESE FIRST:
1. RORY MCILROY WON THE 2025 MASTERS. He is the DEFENDING CHAMPION at Augusta in 2026. He beat Justin Rose in a playoff. He completed the career Grand Slam. NEVER say or imply Rory has never won the Masters -- that was true before 2025, it is false now.
2. SCOTTIE SCHEFFLER 2026 MASTERS: His confirmed rounds are R1=72 and R3=65. Do not invent other round scores.
3. CAMERON YOUNG 2026 MASTERS: He is co-leader at -11 entering Sunday. He shot 65 in R3. He is a real contender. Do not dismiss him.
4. LIVE DATA BEATS DATABASE: If the leaderboard above or the user's message contains current scores or results, that is ground truth. Never contradict it. Never fabricate round scores -- if you don't know them, say so.
5. BELIEVE THE USER: If the user tells you something happened in a live tournament, accept it. Do not argue.

UR FAIR ODDS -- REQUIRED ON EVERY PLAY:
1. Start with player's base win rate / top-10 rate.
2. Adjust for course fit: ELITE=+20%, NEUTRAL=-20%, STRONG=neutral.
3. Adjust for recent form: WIN or T2-T5=+10%, missed cuts=-15%.
4. Convert to American odds: prob < 50%: +((100/prob)-100), round to nearest 25.
5. Output: UR FAIR ODDS: [number] | MARKET: [line or "not loaded"] | VALUE: [gap]

VALUE GAP: Market longer than UR fair = BET IT. Market shorter = OVERPRICED. Within 50 pts = near fair.

BENCHMARKS: Scheffler outright fair +300-+450. McIlroy/Schauffele fair +600-+900. Tier 1 top-10 fair -150 to -200. Make cut 85%+ fair -250 to -400.

RESPONSE FORMAT:
[One sharp opening sentence -- the lean]
[2-4 sentences: SG data, course fit, form, leaderboard position if relevant]
THE PLAY:
[Player] -- [Market]
UR FAIR ODDS: [fair odds] | MARKET: [line or "not loaded"] | VALUE: [gap]
FADE: [player to avoid + one-line reason]
CONFIDENCE: [High/Medium/Speculative] -- [one sentence]

${leaderBlock}${courseSection ? courseSection + "\n" : ""}${oddsStr ? oddsStr + "\n" : ""}${playerStr}

QUESTION: ${question}`;
}

// ── F1 System Prompt ──────────────────────────────────────────────────────────
function buildF1SystemPrompt(matchupCtxStr) {
  const STREET = ["monaco","baku","singapore","las vegas","miami","azerbaijan"];
  const POWER  = ["monza","spa","silverstone","interlagos"];
  const HDFRC  = ["hungary","hungaroring","barcelona","catalunya"];
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const upcoming  = F1_CALENDAR.filter(m => new Date(m.date_start) > now);
  const current   = F1_CALENDAR.filter(m => new Date(m.date_start) <= now && now <= new Date(m.date_end));
  const completed = F1_CALENDAR.filter(r => r.completed && r.winner);
  const standingsStr = F1_STANDINGS.map((d,i) => `${d.position||i+1}. ${d.full_name} (${d.team_name}) -- ${d.points} pts`).join("\n");
  const recentStr = completed.length ? "RECENT RESULTS:\n" + completed.slice(-3).reverse().map(r => `${r.meeting_name}: Winner -- ${r.winner}`).join("\n") : "";
  const activeRace = current[0] || upcoming[0] || null;
  let nextRaceLine = "NEXT RACE: Not yet determined.";
  let circuitType = "mixed"; let circuitNote = "Championship form is the primary signal.";
  let isRaceWeek = false;
  if (activeRace) {
    const loc = activeRace.location || "TBD";
    const rd = activeRace.date_start ? new Date(activeRace.date_start) : null;
    const dateStr = rd ? rd.toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "TBD";
    const daysUntil = rd ? Math.ceil((rd - now) / (1000*60*60*24)) : null;
    const isLive = current.length > 0;
    nextRaceLine = (isLive ? "ACTIVE RACE WEEKEND: " : "NEXT RACE: ") + activeRace.meeting_name + " -- " + loc + " (" + dateStr + ")" + (daysUntil !== null ? " -- " + daysUntil + " days away" : "");
    isRaceWeek = isLive || (daysUntil !== null && daysUntil <= 7);
    const vl = (loc + " " + activeRace.meeting_name).toLowerCase();
    if (STREET.some(c => vl.includes(c))) { circuitType = "STREET CIRCUIT"; circuitNote = "Qualifying position is critical. Safety car near-certain. Antonelli pole-to-win is the primary play."; }
    else if (POWER.some(c => vl.includes(c))) { circuitType = "POWER CIRCUIT"; circuitNote = "Engine advantage is decisive. Mercedes PU edge at maximum."; }
    else if (HDFRC.some(c => vl.includes(c))) { circuitType = "HIGH DOWNFORCE"; circuitNote = "Aero efficiency decides. Ferrari competitive -- Leclerc becomes a live race winner."; }
  }
  const upcomingStr = upcoming.slice(0, 5).map(m => { const d = m.date_start ? new Date(m.date_start).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "TBD"; return `${m.meeting_name} -- ${m.location} (${d})`; }).join("\n");

  return `You are Under Review -- a sharp F1 betting intelligence tool.

IDENTITY: Lead with the take. Never hedge. Never open with a limitation.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE BET: * [Driver] -- [market] -- [key reason]
FADE: [one line]
CONFIDENCE: [High/Medium/Speculative]
TIMING: [one line]

NEVER use markdown. Plain text only.

2026 F1 GRID (only these 22 drivers exist):
Kimi Antonelli (Mercedes) | George Russell (Mercedes) | Charles Leclerc (Ferrari) | Lewis Hamilton (Ferrari) | Lando Norris (McLaren) | Oscar Piastri (McLaren) | Max Verstappen (Red Bull) | Isack Hadjar (Red Bull) | Carlos Sainz (Williams) | Alexander Albon (Williams) | Fernando Alonso (Aston Martin) | Lance Stroll (Aston Martin) | Pierre Gasly (Alpine) | Franco Colapinto (Alpine) | Nico Hulkenberg (Audi) | Gabriel Bortoleto (Audi) | Oliver Bearman (Haas) | Esteban Ocon (Haas) | Liam Lawson (Racing Bulls) | Arvid Lindblad (Racing Bulls) | Valtteri Bottas (Cadillac) | Sergio Perez (Cadillac)
CRITICAL: Tsunoda, Magnussen, Zhou, Doohan NOT on 2026 grid.

POWER UNIT ORDER: 1. Mercedes (best) | 2. Ferrari (high-downforce) | 3. McLaren | 4. Red Bull (zero podiums in first 3 races)
KEY: Antonelli leads championship. 2 wins, 1 P2 in 3 races. Verstappen in crisis.

TODAY: ${todayStr}
${isRaceWeek ? `RACE WEEK -- ${activeRace?.meeting_name}.` : "OFF WEEK -- best window for futures."}
${nextRaceLine}
CIRCUIT TYPE: ${circuitType} | BETTING NOTE: ${circuitNote}

${recentStr ? recentStr + "\n\n" : ""}STANDINGS:
${standingsStr}

${upcomingStr ? "UPCOMING:\n" + upcomingStr + "\n\n" : ""}${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── NBA System Prompt ─────────────────────────────────────────────────────────
function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
  const ctx = nbaContext || {};
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const phase = ctx.seasonContext?.phase || "NBA Season Active";
  const gamesList = ctx.todaysGames || [];
  const gamesStr = gamesList.length > 0
    ? gamesList.map(g => {
        const away = g.awayTeam?.tricode || g.awayTeam?.name || "AWAY";
        const home = g.homeTeam?.tricode || g.homeTeam?.name || "HOME";
        if (g.statusCode === 3) return `${away} ${g.awayTeam?.score} @ ${home} ${g.homeTeam?.score} -- FINAL`;
        if (g.statusCode === 2) return `${away} ${g.awayTeam?.score} @ ${home} ${g.homeTeam?.score} -- LIVE Q${g.period||""}`;
        return `${away} @ ${home} -- ${g.status || "Scheduled"}`;
      }).join("\n")
    : "No games on today's schedule.";
  const propLines = ctx.propLines || [];
  let propLinesStr = "No prop lines posted yet.";
  if (propLines.length > 0) {
    const grouped = {};
    for (const pl of propLines) {
      const k = pl.player + "|" + pl.prop;
      if (!grouped[k]) grouped[k] = { player:pl.player, prop:pl.prop, game:pl.game, over:null, under:null };
      if (pl.side === "Over")  grouped[k].over  = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
      if (pl.side === "Under") grouped[k].under = pl.line;
    }
    propLinesStr = Object.values(grouped).slice(0, 80).map(e => { let s = e.over ? "OVER " + e.over : ""; if (e.under) s += (s ? " / UNDER " : "UNDER ") + e.under; return `${e.player} -- ${e.prop.toUpperCase()} -- ${s} [${e.game}]`; }).join("\n");
  }
  const playerStats = ctx.playerStats || [];
  const seasonAvgsStr = playerStats.length > 0 ? playerStats.slice(0, 60).map(p => { const pra = ((parseFloat(p.pts)||0)+(parseFloat(p.reb)||0)+(parseFloat(p.ast)||0)).toFixed(1); return `${p.name} (${p.team}): ${p.pts}pts/${p.reb}reb/${p.ast}ast | PRA ${pra}`; }).join("\n") : "";
  const question = ctx.question || "";
  const q = question.toLowerCase();
  const propSet = new Set(propLines.map(p => p.player && p.player.toLowerCase()).filter(Boolean));
  const entries = Object.entries(NBA_PLAYERS);
  const mentioned = entries.filter(([n]) => { const l = n.toLowerCase(); return q.includes(l) || q.includes(l.split(" ").pop()); });
  const playing   = entries.filter(([n]) => { const l = n.toLowerCase(); return !q.includes(l) && (propSet.has(l) || Array.from(propSet).some(p => p && p.includes(l.split(" ").pop()))); });
  const others    = entries.filter(([n]) => { const l = n.toLowerCase(); return !q.includes(l) && !propSet.has(l); }).slice(0, 10);
  const playerDbStr = [...mentioned, ...playing, ...others].slice(0, 30).map(([name, p]) => { const pFloor = p.props?.pra?.floor || p.props?.pts?.floor || "--"; const pCeil = p.props?.pra?.ceil || p.props?.pts?.ceil || "--"; const lean = p.props?.pra?.lean || p.props?.pts?.lean || "--"; return `${name} | ${p.tier} | PRA ${pFloor}-${pCeil} | ${lean} | ${(p.bettingAngles||[]).slice(0,2).join(" | ")}`; }).join("\n");

  return `You are Under Review -- a sharp NBA betting intelligence tool.

IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.

RULES: Never recommend props for FINAL games. No games? Give best NBA FUTURES angle.
NBA PLAYOFF CONTEXT: Playoffs begin April 19, 2026. Top seeds: OKC, CLE. Best futures: SGA MVP, Jokic PRA series props.
TE VOLUME: McBride (ARI) leads all TEs at 7.4 rec/g. Kelce is third at 4.5 rec/g.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] -- [PROP OVER/UNDER LINE] ([ODDS]) -- [key reason]
FADE: [one line] | CONFIDENCE: [High/Medium/Speculative] | TIMING: [one line]

TODAY: ${todayStr} | NBA PHASE: ${phase}

TONIGHT'S GAMES:
${gamesStr}

${propLinesStr !== "No prop lines posted yet." ? "LIVE PROP LINES:\n" + propLinesStr + "\n\n" : "PROP LINES: Not yet posted.\n\n"}${seasonAvgsStr ? "SEASON AVERAGES:\n" + seasonAvgsStr + "\n\n" : ""}DATABASE:
${playerDbStr}

${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── MLB System Prompt ─────────────────────────────────────────────────────────
function buildMlbSystemPrompt(mlbContext, matchupCtxStr) {
  const ctx = mlbContext || {};
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const phase = ctx.seasonContext?.phase || "MLB Season Active";
  const games = ctx.games || [];
  const gamesStr = games.length > 0
    ? games.map(g => {
        const away = g.awayTeam || {}; const home = g.homeTeam || {};
        const awayId = away.abbr || away.name || "AWAY"; const homeId = home.abbr || home.name || "HOME";
        const awayP = away.pitcher ? ` [SP: ${away.pitcher}]` : ""; const homeP = home.pitcher ? ` [SP: ${home.pitcher}]` : "";
        if (g.state === "post") return `${awayId}${awayP} ${away.score} @ ${homeId}${homeP} ${home.score} -- FINAL`;
        if (g.state === "in")   return `${awayId}${awayP} ${away.score} @ ${homeId}${homeP} ${home.score} -- LIVE`;
        return `${awayId}${awayP} @ ${homeId}${homeP} -- ${g.status || "Scheduled"}`;
      }).join("\n")
    : "No games on today's schedule.";
  const propLines = ctx.propLines || [];
  let propLinesStr = "No prop lines posted yet.";
  if (propLines.length > 0) {
    const grouped = {};
    for (const pl of propLines) {
      const k = pl.player + "|" + pl.prop;
      if (!grouped[k]) grouped[k] = { player:pl.player, prop:pl.prop, game:pl.game, over:null, under:null };
      if (pl.side === "Over")  grouped[k].over  = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
      if (pl.side === "Under") grouped[k].under = pl.line;
    }
    propLinesStr = Object.values(grouped).slice(0, 60).map(e => { let s = e.over ? "OVER " + e.over : ""; if (e.under) s += (s ? " / UNDER " : "UNDER ") + e.under; return `${e.player} -- ${e.prop.toUpperCase()} -- ${s} [${e.game}]`; }).join("\n");
  }
  const gameTotals = ctx.gameTotals || {};
  const totalsStr = Object.keys(gameTotals).length ? Object.entries(gameTotals).map(([gk, t]) => { const note = t.run_env === "HIGH" ? " -- HIGH run env" : t.run_env === "LOW" ? " -- LOW run env" : ""; return `${gk}: O/U ${t.total}${note}`; }).join("\n") : "";

  return `You are Under Review -- a sharp MLB betting intelligence tool.

IDENTITY: Lead with the take. No hedging. No markdown. Plain text only.
No props for FINAL games. No games? Give best futures or upcoming matchup angle.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] -- [PROP OVER/UNDER LINE] ([ODDS]) -- [key reason]
FADE: [one line] | CONFIDENCE: [High/Medium/Speculative] | TIMING: [one line]

PRINCIPLES: Strikeout props = primary market. K/9 vs opposing K% is the edge. Park factors matter. Coors = back OVERs. Petco = fade OVERs. Platoon splits = most underused edge.
PARKS: OVER: Coors ~120, Great American ~108 | UNDER: Petco ~93, Oracle ~92, T-Mobile ~91 | Neutral: Dodger ~99, Yankee ~101

TODAY: ${todayStr} | MLB PHASE: ${phase}

GAMES: ${gamesStr}

${totalsStr ? "TOTALS:\n" + totalsStr + "\n\n" : ""}${propLinesStr !== "No prop lines posted yet." ? "PROP LINES:\n" + propLinesStr + "\n\n" : "PROP LINES: Not yet posted.\n\n"}${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { question, players, context, liveMatches, history, matchupContext, image, nflContext, nbaContext, mlbContext, golfContext, sportHint } = req.body;
  if (!question) return res.status(400).json({ error: "Missing question" });

  const sport = detectSport(question, sportHint, matchupContext);
  const matchupCtxStr = summarizeMatchupContext(matchupContext);
  let systemPrompt;

  if (sport === "f1") {
    systemPrompt = buildF1SystemPrompt(matchupCtxStr);
  } else if (sport === "mlb") {
    systemPrompt = buildMlbSystemPrompt(mlbContext, matchupCtxStr);
  } else if (sport === "golf") {
    systemPrompt = buildGolfSystemPrompt(golfContext);
  } else if (sport === "nba") {
    systemPrompt = buildNbaSystemPrompt(nbaContext, matchupCtxStr);
  } else if (sport === "nfl") {
    const qbData = JSON.stringify(getRelevantQBs(question), null, 0).slice(0, 9000);
    const skill  = getRelevantSkillPlayers(question, nflContext) || buildNflContext();
    const nowMonth = new Date().getMonth() + 1;
    const phase    = (nowMonth >= 9 || nowMonth === 1) ? "IN-SEASON (weekly props are live)" : "OFFSEASON (futures + directional leans only)";
    systemPrompt = `You are Under Review -- a sharp NFL betting intelligence tool.

IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.
CURRENT NFL STATUS: ${phase}

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] -- [prop type] -- [line or DIRECTIONAL] -- [floor/ceiling] -- [key reason]
FADE: [name specific player or team] | CONFIDENCE: [High/Medium/Speculative] | TIMING: [when to bet]

NFL STAT GLOSSARY: ontgt avg 74.9% (elite 78%+) | badTh avg 16.1% (elite sub-13%) | prss avg 21.9% (liability 25%+) | iay/pa above 8.5 = deep thrower

KEY TD RATES (2025): Derrick Henry 0.94/g | James Cook 0.88/g | De'Von Achane 0.86/g | Jonathan Taylor 0.82/g | Puka Nacua 0/16g -- NEVER bet as TD scorer

2026 NFL DRAFT: Pick 1 TEN Shedeur Sanders | Pick 2 CLE Mason Graham | Pick 3 NYG Abdul Carter | Pick 4 NE Will Campbell | Pick 5 JAX Travis Hunter

DEFENSE TIERS:
ELITE (hard fade): PHI, BAL, MIN, DEN | STRONG (lean fade): KC, SF, GB, BUF, HOU, TB, LAC, PIT
AVERAGE (neutral): NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO
WEAK (lean over): MIA, CIN, NYJ, NYG, ARI | BOTTOM (hard over): TEN, CLE, LVR, CAR

DEPTH FALLBACK: If player not in database, reason from team context + defense tier + role. Label Speculative.

RB/WR/TE DATABASE:
${skill}

QB DATABASE:
${qbData}

${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
  } else {
    // Tennis
    const t = context?.currentTournament;
    const tournamentCtx = t ? `ACTIVE: ${t.name} -- ${t.surface}, ${t.speed} speed.\n${t.context||""}\nATP: ${t.atp_favorite||"TBD"} | WTA: ${t.wta_favorite||"TBD"}` : "Context not loaded. Answer from player database and surface Elo data.";
    const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable";
    const liveMatchStr  = (Array.isArray(liveMatches) && liveMatches.length)
      ? liveMatches.slice(0, 12).map(m => `${m.raw?.home||"?"} vs ${m.raw?.away||"?"} -- ${m.raw?.round||"Tournament"} -- ${String(m.raw?.live||"0")==="1"?"LIVE":(m.raw?.status||"Scheduled")}`).join("\n")
      : "No live matches currently";

    systemPrompt = `You are Under Review -- a sharp tennis betting intelligence tool.

IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.

RESPONSE FORMAT:
1. One sharp sentence answering the question.
2. Reasoning -- 2-4 sentences using Elo gaps, surface splits, form.
3. THE PLAY: * [Player] -- [specific bet] -- [key stat]
   TIMING: [when to act] | CONFIDENCE: [High/Medium/Speculative] | FADE: [who to avoid and why]

SURFACE ELO: hElo=hard | cElo=clay | gElo=grass | DR=dominance ratio (1.8+ elite) | Hold%=service hold (85% elite hard)
Gap 150+ pts = significant edge. Gap 300+ = lead with it.

CLAY SWING (April 2026): Post-Miami, pre-Madrid. Clay specialists underpriced.
FACTUAL 2026: Sinner won Miami Open 2026. Alcaraz is clay swing favorite.

CURRENT TOURNAMENT: ${tournamentCtx}
LIVE MATCHES: ${liveMatchStr}
PLAYER DATABASE: ${playerDataStr}
${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
  }

  const messages = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-8)) {
      if (!msg || msg.loading) continue;
      const msgText = msg.text || msg.content;
      if (!msgText) continue;
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msgText });
    }
  }
  if (image?.base64 && image?.mediaType) {
    messages.push({ role:"user", content:[{ type:"image", source:{ type:"base64", media_type:image.mediaType, data:image.base64 } }, { type:"text", text:question }] });
  } else {
    messages.push({ role:"user", content:question });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:800, temperature:0.45, system:systemPrompt, messages }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("Anthropic error:", data); return res.status(500).json({ error:"AI response failed", details:data }); }
    let text = cleanResponseText(data?.content ? data.content.filter(i => i.type === "text").map(i => i.text).join("\n").trim() : "");
    if (text && responseLooksWrongForSport(text, sport)) {
      const cr = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"}, body:JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:800, temperature:0.2, system:systemPrompt + `\n\nCORRECTION: Answer ONLY as a ${sport.toUpperCase()} analyst.`, messages }) });
      if (cr.ok) { const cd = await cr.json(); text = cleanResponseText(cd?.content ? cd.content.filter(i => i.type === "text").map(i => i.text).join("\n").trim() : ""); }
    }
    return res.status(200).json({ response: text || "Couldn't get a response. Try again." });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error:"Request failed", details:err.message });
  }
}
