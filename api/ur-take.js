export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

import { applyCors } from "./_cors.js";

// ── TODAY string — injected into every prompt ────────────────────────────────
function getTodayStr() {
  return new Date().toLocaleDateString("en-US", {
    weekday:"long", year:"numeric", month:"long", day:"numeric",
    timeZone:"America/New_York",
  });
}

// ── PGA Player Database ───────────────────────────────────────────────────────
const PGA_PLAYERS = {
  "Scottie Scheffler":  { rank:1,  country:"USA", tier:1, sg:{ total:3.12, ott:0.94, app:1.21, arg:0.48, putt:0.49 }, cutMaking:"97%", top10Rate:"52%", winRate:"18%", courseFit:{ parkland:"ELITE", links:"STRONG", bermuda:"STRONG", poa:"ELITE", bentgrass:"ELITE" }, recentForm:["WIN","T4","WIN","T2","WIN","T3"], bestMarkets:["outright","top_5","top_10","frl"], note:"Best player in the world. SG Total 3.12 is elite across every event type. High-floor outright, top-5, and top-10 profile every week." },

  "Rory McIlroy":       { rank:2,  country:"NIR", tier:1, sg:{ total:2.41, ott:1.18, app:0.87, arg:0.12, putt:0.24 }, cutMaking:"89%", top10Rate:"44%", winRate:"12%", courseFit:{ parkland:"ELITE", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["WIN","WIN","T8","T3","T15","T5"], bestMarkets:["outright","top_5","top_10","frl","matchup"], note:"Elite driver with one of the highest ceilings in golf. Best used in outrights, top-5s, and matchup markets when the driver is decisive." },

  "Xander Schauffele":  { rank:3,  country:"USA", tier:1, sg:{ total:2.18, ott:0.71, app:0.89, arg:0.31, putt:0.27 }, cutMaking:"92%", top10Rate:"46%", winRate:"10%", courseFit:{ parkland:"ELITE", links:"STRONG", bermuda:"ELITE", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["WIN","T2","T6","T3","WIN","T11"], bestMarkets:["outright","top_5","top_10","make_cut"], note:"One of the steadiest elite players on the board. High-end iron play and putting make him one of the safest top-10 profiles in the game." },

  "Jon Rahm":           { rank:4,  country:"ESP", tier:1, sg:{ total:2.05, ott:0.68, app:0.91, arg:0.22, putt:0.24 }, cutMaking:"88%", top10Rate:"41%", winRate:"11%", courseFit:{ parkland:"ELITE", links:"ELITE", bermuda:"STRONG", poa:"ELITE", bentgrass:"STRONG" }, recentForm:["T4","WIN","T2","T8","T20","T3"], bestMarkets:["outright","top_5","top_10","matchup"], note:"Major-winning, all-surface star with an elite all-around profile. LIV schedule means field confirmation matters before making any play." },

  "Collin Morikawa":    { rank:5,  country:"USA", tier:1, sg:{ total:1.89, ott:0.42, app:1.08, arg:0.18, putt:0.21 }, cutMaking:"90%", top10Rate:"38%", winRate:"8%",  courseFit:{ parkland:"ELITE", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T3","T7","T2","WIN","T5","T14"], bestMarkets:["top_5","top_10","top_20","matchup"], note:"Best pure iron player in this pool. Elite approach play makes him one of the strongest top-10 and matchup options on precision courses." },

  "Viktor Hovland":     { rank:6,  country:"NOR", tier:1, sg:{ total:1.78, ott:0.82, app:0.71, arg:0.09, putt:0.16 }, cutMaking:"84%", top10Rate:"35%", winRate:"9%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T12","T4","WIN","T8","T3","T22"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Dangerous upside play, especially on links-style or driver-heavy setups. Around-the-green play is still the pressure point." },

  "Patrick Cantlay":    { rank:7,  country:"USA", tier:1, sg:{ total:1.72, ott:0.44, app:0.79, arg:0.28, putt:0.21 }, cutMaking:"91%", top10Rate:"37%", winRate:"7%",  courseFit:{ parkland:"ELITE", links:"NEUTRAL", bermuda:"STRONG", poa:"ELITE", bentgrass:"STRONG" }, recentForm:["T6","T3","T18","T2","T9","T5"], bestMarkets:["top_5","top_10","top_20","make_cut","matchup"], note:"Reliable weekly profile with elite consistency. Strong top-10, top-20, and make-cut option when books price him below the biggest names." },

  "Ludvig Aberg":       { rank:8,  country:"SWE", tier:1, sg:{ total:1.84, ott:0.98, app:0.68, arg:0.10, putt:0.08 }, cutMaking:"85%", top10Rate:"38%", winRate:"6%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T2","T4","T3","WIN","T8","T2"], bestMarkets:["outright","top_5","top_10","matchup"], note:"Explosive ceiling driven by elite ball-striking and power. One of the most dangerous outright and top-5 players whenever the driver matters." },

  "Wyndham Clark":      { rank:9,  country:"USA", tier:1, sg:{ total:1.64, ott:0.89, app:0.61, arg:0.08, putt:0.06 }, cutMaking:"78%", top10Rate:"28%", winRate:"8%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T4","WIN","T22","T8","T30","T5"], bestMarkets:["outright","top_10","frl"], note:"Boom-or-bust power profile. Better for outrights and first-round leader shots than conservative placement markets." },

  "Tommy Fleetwood":    { rank:14, country:"ENG", tier:1, sg:{ total:1.45, ott:0.48, app:0.72, arg:0.14, putt:0.11 }, cutMaking:"86%", top10Rate:"30%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T5","T3","T11","T4","T2","WIN"], bestMarkets:["top_10","top_20","matchup"], note:"Excellent links and wind player with a clean top-10 profile when the course rewards control and patience." },

  "Matt Fitzpatrick":   { rank:15, country:"ENG", tier:1, sg:{ total:1.44, ott:0.38, app:0.72, arg:0.22, putt:0.12 }, cutMaking:"87%", top10Rate:"30%", winRate:"5%",  courseFit:{ parkland:"ELITE", links:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T4","T2","T9","T11","T3","WIN"], bestMarkets:["top_5","top_10","top_20","make_cut","matchup"], note:"Precision-first player with strong placement-market value. Best on courses that reward control more than raw distance." },

  "Sam Burns":          { rank:12, country:"USA", tier:1, sg:{ total:1.51, ott:0.62, app:0.68, arg:0.11, putt:0.10 }, cutMaking:"85%", top10Rate:"29%", winRate:"6%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","WIN","T3","T12","T6","T24"], bestMarkets:["outright","top_10","top_20","make_cut"], note:"Balanced, high-upside player with multiple paths to contend. Strong top-10 and outright value when form is trending up." },

  "Cameron Young":      { rank:30, country:"USA", tier:1, sg:{ total:1.08, ott:0.94, app:0.28, arg:-0.04, putt:-0.10 }, cutMaking:"76%", top10Rate:"18%", winRate:"2%",  courseFit:{ parkland:"NEUTRAL", links:"STRONG", bermuda:"NEUTRAL", poa:"NEUTRAL", bentgrass:"STRONG" }, recentForm:["T14","T4","T18","T9","T28","T3"], bestMarkets:["top_10","top_20","frl"], note:"Massive power gives him ceiling, but the short game and putting make him volatile. Better as a FRL or upside placement target than a safe anchor." },

  "Justin Rose":        { rank:37, country:"ENG", tier:1, sg:{ total:1.18, ott:0.44, app:0.54, arg:0.12, putt:0.08 }, cutMaking:"81%", top10Rate:"20%", winRate:"2%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T3","T19","T6","T11","T25"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Veteran major-caliber profile with solid placement value when the test favors experience and discipline." },

  "Jason Day":          { rank:46, country:"AUS", tier:1, sg:{ total:1.18, ott:0.42, app:0.58, arg:0.12, putt:0.06 }, cutMaking:"81%", top10Rate:"22%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T6","T3","T11","T4","WIN","T8"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Well-rounded veteran who still flashes contending form. Better in top-20 and matchup markets than aggressive outrights." },

  "HaoTong Li":         { rank:47, country:"CHN", tier:1, sg:{ total:1.22, ott:0.54, app:0.58, arg:0.06, putt:0.04 }, cutMaking:"79%", top10Rate:"21%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["WIN","T4","T8","T18","T3","T11"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Live under-the-radar upside profile with enough form to justify aggressive placement or longshot outright exposure." },

  "Patrick Reed":       { rank:48, country:"USA", tier:1, sg:{ total:0.88, ott:0.18, app:0.38, arg:0.18, putt:0.14 }, cutMaking:"78%", top10Rate:"18%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T4","T18","T11","T3","WIN"], bestMarkets:["top_10","top_20","matchup"], note:"Short-game-driven grinder with more value in specific course fits than broad weekly exposure. LIV field confirmation matters." },

  "Hideki Matsuyama":   { rank:20, country:"JPN", tier:1, sg:{ total:1.29, ott:0.51, app:0.64, arg:0.08, putt:0.06 }, cutMaking:"81%", top10Rate:"24%", winRate:"5%",  courseFit:{ parkland:"ELITE", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T2","WIN","T8","T5","T14","T3"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Elite iron-based profile with real upside on demanding ball-striking venues. Strong outright and top-10 candidate in the right setup." },

  "Shane Lowry":        { rank:19, country:"IRE", tier:1, sg:{ total:1.31, ott:0.28, app:0.61, arg:0.22, putt:0.20 }, cutMaking:"84%", top10Rate:"25%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"NEUTRAL", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T4","T8","T2","T22","T11","T5"], bestMarkets:["top_10","top_20","matchup"], note:"Excellent wind and links player whose short game keeps him live in placement markets on tougher setups." },

  "Brian Harman":       { rank:23, country:"USA", tier:1, sg:{ total:1.22, ott:0.04, app:0.62, arg:0.28, putt:0.28 }, cutMaking:"85%", top10Rate:"22%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["T4","T9","WIN","T3","T18","T11"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Short hitter, but elite short game and putting make him a strong make-cut and placement candidate on precision tracks." },

  "Jordan Spieth":      { rank:22, country:"USA", tier:1, sg:{ total:1.22, ott:0.08, app:0.52, arg:0.34, putt:0.28 }, cutMaking:"82%", top10Rate:"23%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T5","T3","T18","T8","T2","T28"], bestMarkets:["top_10","top_20","matchup"], note:"Creative scorer with elite scrambling and putting instincts. Better in placement markets than outrights unless the setup strongly fits him." },

  "Russell Henley":     { rank:11, country:"USA", tier:1, sg:{ total:1.54, ott:0.41, app:0.82, arg:0.18, putt:0.13 }, cutMaking:"87%", top10Rate:"33%", winRate:"5%",  courseFit:{ parkland:"ELITE", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T3","T7","T2","T11","T4","T19"], bestMarkets:["top_5","top_10","top_20","make_cut"], note:"Quietly elite approach player with one of the best top-10 and top-20 profiles in the pool." },

  "Corey Conners":      { rank:36, country:"CAN", tier:1, sg:{ total:1.28, ott:0.42, app:0.72, arg:0.08, putt:0.06 }, cutMaking:"84%", top10Rate:"22%", winRate:"3%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T8","T3","T11","T6","T18","T4"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Ball-striking specialist whose iron play keeps him live on precision courses. Putting is usually the swing factor." },

  "Tom Kim":            { rank:24, country:"KOR", tier:1, sg:{ total:1.06, ott:0.38, app:0.44, arg:0.14, putt:0.10 }, cutMaking:"81%", top10Rate:"22%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"STRONG", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T3","T6","WIN","T11","T4","T18"], bestMarkets:["outright","top_10","top_20","matchup"], note:"Young, versatile profile with strong all-around fit across multiple course types. Better in top-10 and top-20 than reckless outright exposure." },

  "Akshay Bhatia":      { rank:38, country:"USA", tier:1, sg:{ total:1.62, ott:0.78, app:0.68, arg:0.08, putt:0.08 }, cutMaking:"78%", top10Rate:"26%", winRate:"5%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["WIN","T4","T3","T8","T18","T11"], bestMarkets:["outright","top_10","top_20"], note:"Young upside player with enough power and approach quality to matter in outright and top-10 conversations." },

  "Nick Taylor":        { rank:16, country:"CAN", tier:1, sg:{ total:1.44, ott:0.48, app:0.64, arg:0.16, putt:0.16 }, cutMaking:"82%", top10Rate:"24%", winRate:"4%",  courseFit:{ parkland:"STRONG", links:"NEUTRAL", bermuda:"STRONG", poa:"STRONG", bentgrass:"STRONG" }, recentForm:["T6","T2","WIN","T8","T14","T4"], bestMarkets:["top_10","top_20","make_cut","matchup"], note:"Dependable iron-and-putter combination makes him a solid placement-market option in balanced fields." },

  "Cameron Smith":      { rank:17, country:"AUS", tier:1, sg:{ total:1.42, ott:0.38, app:0.61, arg:0.38, putt:0.45 }, cutMaking:"85%", top10Rate:"34%", winRate:"8%",  courseFit:{ parkland:"STRONG", links:"ELITE", bermuda:"STRONG", poa:"STRONG", bentgrass:"ELITE" }, recentForm:["WIN","T4","T3","T7","T18","T2"], bestMarkets:["outright","top_5","top_10","matchup"], note:"Elite putter and short-game closer. LIV field confirmation matters, but his ceiling is real whenever the putter can separate." },

  "Dustin Johnson":     { rank:50, country:"USA", tier:2, sg:{ total:1.44, ott:1.12, app:0.48, arg:0.02, putt:-0.18 }, cutMaking:"82%", top10Rate:"24%", winRate:"4%", recentForm:["T8","T4","T3","T18","WIN","T11"], bestMarkets:["outright","top_10","frl"], note:"Still has power-driven upside, but volatility makes him more of a ceiling play than a dependable weekly option. LIV field confirmation matters." },

  "Brooks Koepka":      { rank:51, country:"USA", tier:2, sg:{ total:1.58, ott:0.84, app:0.62, arg:0.08, putt:0.04 }, cutMaking:"79%", top10Rate:"22%", winRate:"5%", recentForm:["WIN","T3","T18","T4","T28","T8"], bestMarkets:["outright","top_5","top_10"], note:"Big-stage ceiling remains real. LIV field confirmation matters, but he still profiles best in outright and top-10 markets." },

  "Bryson DeChambeau":  { rank:52, country:"USA", tier:2, sg:{ total:1.62, ott:1.44, app:0.48, arg:0.08, putt:-0.38 }, cutMaking:"75%", top10Rate:"20%", winRate:"5%", recentForm:["WIN","T4","T18","T8","T30","WIN"], bestMarkets:["outright","frl","top_10"], note:"Extreme power gives him slate-breaking upside, but the putting volatility makes him a risky weekly click. LIV field confirmation matters." },
};

const PGA_COURSES = {
  "Augusta National": {
    location:"Augusta, GA",
    par:72,
    type:"parkland",
    grass:"bentgrass",
    sgPremium:"app",
    whoWins:"Elite iron players who shape shots well into demanding greens. Power helps on the par 5s.",
    specialists:["Scottie Scheffler","Rory McIlroy","Jon Rahm","Hideki Matsuyama","Jordan Spieth"],
    note:"SG:APP, touch around the greens, and bentgrass putting matter most here. Augusta rewards elite ball-striking and composure."
  },
  "TPC Sawgrass": {
    location:"Ponte Vedra Beach, FL",
    par:72,
    type:"parkland",
    grass:"bermuda",
    sgPremium:"app",
    whoWins:"Complete players who handle pressure and control trajectory well on Bermuda greens.",
    specialists:["Scottie Scheffler","Rory McIlroy","Xander Schauffele","Matt Fitzpatrick"],
    note:"The island green on 17 and constant volatility make this one of the most pressure-heavy tests on Tour."
  },
  "Riviera": {
    location:"Pacific Palisades, CA",
    par:71,
    type:"parkland",
    grass:"poa_annua",
    sgPremium:"app",
    whoWins:"Complete precision players who gain with long irons and can survive poa variance.",
    specialists:["Patrick Cantlay","Collin Morikawa","Russell Henley"],
    note:"Kikuyu rough punishes misses and poa greens add volatility. Precision beats raw power here."
  },
  "Pebble Beach": {
    location:"Pebble Beach, CA",
    par:72,
    type:"links_adjacent",
    grass:"poa_annua",
    sgPremium:"putt",
    whoWins:"Poa specialists and strong wind managers with elite short-game control.",
    specialists:["Patrick Cantlay","Jordan Spieth"],
    note:"Wind off the Pacific is the key variable. Short game and putting matter more than distance."
  },
  "Quail Hollow": {
    location:"Charlotte, NC",
    par:71,
    type:"parkland",
    grass:"bermuda",
    sgPremium:"ott",
    whoWins:"Power players who can survive the Green Mile and keep gaining with the driver.",
    specialists:["Rory McIlroy","Wyndham Clark"],
    note:"The closing stretch is brutal. Long-game strength and late-round nerve matter most."
  },
  "Royal Troon": {
    location:"Ayrshire, Scotland",
    par:71,
    type:"links",
    grass:"links_fescue",
    sgPremium:"ott",
    whoWins:"Links specialists who control flight, handle wind, and stay patient.",
    specialists:["Rory McIlroy","Tommy Fleetwood","Shane Lowry","Brian Harman"],
    note:"This is a true links test. Wind control, trajectory, and short-game creativity decide it."
  },
};

// ── NBA Player Database (with LIVE data override rule) ─────────────────────────
const NBA_PLAYERS = {
  "Nikola Jokic":            { team:"DEN", pos:"C", tier:"ELITE", pts:29.6, reb:12.7, ast:10.2, props:{ pra:{ floor:45,ceil:70,lean:"OVER -- safest bet in NBA" }, pts:{ floor:22,ceil:45,lean:"OVER" }, reb:{ floor:10,ceil:18,lean:"OVER" }, ast:{ floor:7,ceil:15,lean:"OVER" } }, bettingAngles:["PRA over is the safest prop in basketball","Assists over in fast-paced games","Rebounds over when Murray/Porter are out"] },
  "Shai Gilgeous-Alexander": { team:"OKC", pos:"G", tier:"ELITE", pts:32.7, reb:5.1,  ast:6.4,  props:{ pts:{ floor:25,ceil:50,lean:"OVER -- gets to line 8-10x per game" }, pra:{ floor:38,ceil:58,lean:"OVER" } }, bettingAngles:["Points over is the primary play","FT attempts prop: OVER almost every game"] },
  "Luka Doncic":             { team:"DAL", pos:"G", tier:"ELITE", pts:28.1, reb:8.2,  ast:8.0,  props:{ pts:{ floor:20,ceil:45,lean:"OVER" }, pra:{ floor:38,ceil:60,lean:"OVER" } }, bettingAngles:["PRA over safest play","Assists over when teammates limit scoring load"] },
  "Jayson Tatum":            { team:"BOS", pos:"F", tier:"ELITE", pts:26.9, reb:8.1,  ast:4.9,  props:{ pts:{ floor:20,ceil:42,lean:"OVER in playoff spots" }, pra:{ floor:35,ceil:55,lean:"OVER" } }, bettingAngles:["Points floor high -- scores 20+ in 70%+ of games","Fade in blowouts"] },
  "Giannis Antetokounmpo":   { team:"MIL", pos:"F", tier:"ELITE", pts:30.4, reb:11.5, ast:6.5,  props:{ pra:{ floor:44,ceil:65,lean:"OVER" }, pts:{ floor:24,ceil:50,lean:"OVER" } }, bettingAngles:["PRA over elite -- 50+ PRA in 40%+ of games"] },
  "Anthony Edwards":         { team:"MIN", pos:"G", tier:"ELITE", pts:27.8, reb:5.4,  ast:5.1,  props:{ pts:{ floor:20,ceil:44,lean:"OVER" }, pra:{ floor:32,ceil:52,lean:"OVER" } }, bettingAngles:["Points over is primary market","Back in rivalry/national TV games"] },
  "Victor Wembanyama":       { team:"SAS", pos:"C", tier:"ELITE", pts:24.5, reb:10.6, ast:3.9,  props:{ pts:{ floor:18,ceil:40,lean:"OVER" }, blk:{ floor:2,ceil:6,lean:"OVER" } }, bettingAngles:["Blocks over is the unique angle -- 3.5 per game pace","PRA over in pace-up matchups"] },
  "Karl-Anthony Towns":      { team:"NYK", pos:"C", tier:"STAR",  pts:24.3, reb:13.7, ast:3.2,  props:{ reb:{ floor:11,ceil:18,lean:"OVER" }, pra:{ floor:38,ceil:55,lean:"OVER" } }, bettingAngles:["Rebounds over is the primary play","Back in MSG"] },
  "Tyrese Haliburton":       { team:"IND", pos:"G", tier:"STAR",  pts:20.1, reb:3.9,  ast:10.9, props:{ ast:{ floor:8,ceil:16,lean:"OVER" }, pra:{ floor:30,ceil:48,lean:"OVER" } }, bettingAngles:["Assists over is the primary play","Injury history is main risk"] },
  "Donovan Mitchell":        { team:"CLE", pos:"G", tier:"STAR",  pts:26.1, reb:4.4,  ast:5.4,  props:{ pts:{ floor:19,ceil:42,lean:"OVER" }, pra:{ floor:30,ceil:50,lean:"OVER" } }, bettingAngles:["Points over is the primary play"] },
  "LeBron James":            { team:"LAL", pos:"F", tier:"STAR",  pts:23.7, reb:8.0,  ast:8.2,  props:{ pra:{ floor:36,ceil:55,lean:"OVER" } }, bettingAngles:["PRA over safest play","Fade pts on back-to-backs"] },
  "Stephen Curry":           { team:"GSW", pos:"G", tier:"STAR",  pts:26.4, reb:4.5,  ast:6.1,  props:{ threes:{ floor:2,ceil:10,lean:"OVER" } }, bettingAngles:["3-pointers made over is the signature play"] },
  "Kevin Durant":            { team:"PHX", pos:"F", tier:"STAR",  pts:27.1, reb:6.8,  ast:4.2,  props:{ pts:{ floor:22,ceil:45,lean:"OVER" }, pra:{ floor:33,ceil:55,lean:"OVER" } }, bettingAngles:["Points over is primary","Back when Booker is out"] },
  "Devin Booker":            { team:"PHX", pos:"G", tier:"STAR",  pts:25.4, reb:4.3,  ast:6.8,  props:{ pts:{ floor:18,ceil:40,lean:"OVER" }, pra:{ floor:32,ceil:50,lean:"OVER" } }, bettingAngles:["Points over is primary","Assists over when Durant on minutes restriction"] },
  "Ja Morant":               { team:"MEM", pos:"G", tier:"STAR",  pts:24.7, reb:5.1,  ast:8.1,  props:{ pts:{ floor:18,ceil:42,lean:"OVER when healthy" } }, bettingAngles:["Health is the primary risk","Fade on back-to-backs or after any injury concern"] },
  "Zion Williamson":         { team:"NOP", pos:"F", tier:"STAR",  pts:23.8, reb:5.8,  ast:4.1,  props:{ pts:{ floor:18,ceil:38,lean:"OVER when healthy" } }, bettingAngles:["Health check is non-negotiable -- confirm active before any bet"] },
  "Cade Cunningham":         { team:"DET", pos:"G", tier:"STAR",  pts:25.2, reb:6.1,  ast:9.0,  props:{ pra:{ floor:36,ceil:54,lean:"OVER" }, ast:{ floor:7,ceil:13,lean:"OVER" } }, bettingAngles:["PRA over is a strong play","Assists over -- top-5 playmaker in league"] },
  "Paolo Banchero":          { team:"ORL", pos:"F", tier:"STAR",  pts:24.6, reb:7.4,  ast:5.8,  props:{ pra:{ floor:33,ceil:52,lean:"OVER" } }, bettingAngles:["PRA over -- contributing across all three categories"] },
  "Trae Young":              { team:"ATL", pos:"G", tier:"STAR",  pts:23.7, reb:2.8,  ast:11.4, props:{ ast:{ floor:9,ceil:16,lean:"OVER" }, pra:{ floor:32,ceil:52,lean:"OVER" } }, bettingAngles:["Assists over is the primary play"] },
  "Damian Lillard":          { team:"MIL", pos:"G", tier:"STAR",  pts:24.1, reb:4.2,  ast:7.4,  props:{ pts:{ floor:18,ceil:40,lean:"OVER" }, threes:{ floor:2,ceil:7,lean:"OVER" } }, bettingAngles:["Points over when Giannis is limited","3-pointers made: elite from deep"] },
  "LaMelo Ball":             { team:"CHA", pos:"G", tier:"STAR",  pts:22.4, reb:5.2,  ast:8.5,  props:{ ast:{ floor:6,ceil:12,lean:"OVER" }, pra:{ floor:30,ceil:50,lean:"OVER" } }, bettingAngles:["Assists over is primary","Health check required"] },
  "Anthony Davis":           { team:"LAL", pos:"C", tier:"STAR",  pts:24.7, reb:12.1, ast:3.4,  props:{ pra:{ floor:36,ceil:54,lean:"OVER" }, reb:{ floor:9,ceil:16,lean:"OVER" } }, bettingAngles:["PRA over is the primary play","Health check required"] },
  "Jalen Brunson":           { team:"NYK", pos:"G", tier:"STAR",  pts:26.6, reb:3.4,  ast:7.5,  props:{ pts:{ floor:20,ceil:42,lean:"OVER" }, pra:{ floor:30,ceil:50,lean:"OVER" } }, bettingAngles:["Points over is primary","Back at MSG"] },
  "Scottie Barnes":          { team:"TOR", pos:"F", tier:"STAR",  pts:21.8, reb:8.5,  ast:6.2,  props:{ pra:{ floor:32,ceil:48,lean:"OVER" }, reb:{ floor:7,ceil:12,lean:"OVER" } }, bettingAngles:["PRA over is the primary play"] },
  "Franz Wagner":            { team:"ORL", pos:"F", tier:"STAR",  pts:22.4, reb:5.2,  ast:4.8,  props:{ pts:{ floor:16,ceil:35,lean:"OVER" }, pra:{ floor:26,ceil:44,lean:"OVER" } }, bettingAngles:["Points over is primary"] },
  "Alperen Sengun":          { team:"HOU", pos:"C", tier:"STAR",  pts:21.1, reb:9.4,  ast:5.1,  props:{ pra:{ floor:32,ceil:50,lean:"OVER" }, ast:{ floor:3,ceil:8,lean:"OVER" } }, bettingAngles:["PRA over is primary","Assists over -- rare playmaking ability for center"] },
  "Jaylen Brown":            { team:"BOS", pos:"F", tier:"STAR",  pts:23.0, reb:5.5,  ast:3.6,  props:{ pts:{ floor:17,ceil:36,lean:"OVER" }, pra:{ floor:28,ceil:44,lean:"OVER" } }, bettingAngles:["Points over primary","Back in elimination/playoff games"] },
  "Rudy Gobert":             { team:"MIN", pos:"C", tier:"SOLID", pts:13.4, reb:12.0, ast:1.4,  props:{ reb:{ floor:10,ceil:17,lean:"OVER" } }, bettingAngles:["Rebounds over is the primary play","Double-double prop hits 70%+ of games"] },
  "Jaren Jackson Jr.":       { team:"MEM", pos:"C", tier:"SOLID", pts:22.1, reb:6.0,  ast:1.6,  props:{ blk:{ floor:2,ceil:5,lean:"OVER" }, pts:{ floor:16,ceil:34,lean:"OVER" } }, bettingAngles:["Blocks over is the unique angle"] },
  "Evan Mobley":             { team:"CLE", pos:"C", tier:"SOLID", pts:18.6, reb:9.4,  ast:2.9,  props:{ pra:{ floor:28,ceil:44,lean:"OVER" }, reb:{ floor:7,ceil:14,lean:"OVER" } }, bettingAngles:["PRA over is the consistent play"] },
  "Josh Hart":               { team:"NYK", pos:"G", tier:"SOLID", pts:12.4, reb:9.8,  ast:4.6,  props:{ reb:{ floor:8,ceil:14,lean:"OVER" }, pra:{ floor:24,ceil:38,lean:"OVER" } }, bettingAngles:["Rebounds over is the primary play -- anomalous for his position"] },
  "Lauri Markkanen":         { team:"UTA", pos:"F", tier:"SOLID", pts:23.2, reb:8.2,  ast:2.4,  props:{ pra:{ floor:28,ceil:46,lean:"OVER" }, threes:{ floor:2,ceil:5,lean:"OVER" } }, bettingAngles:["PRA over is the consistent play"] },
  "Jalen Williams":          { team:"OKC", pos:"F", tier:"SOLID", pts:22.5, reb:4.5,  ast:5.8,  props:{ pts:{ floor:16,ceil:34,lean:"OVER" }, pra:{ floor:28,ceil:46,lean:"OVER" } }, bettingAngles:["Points over when SGA is limited"] },
};

// ── NFL Databases ─────────────────────────────────────────────────────────────
const NFL_PLAYERS = {
  "James Cook":         { pos:"RB", team:"BUF", tier:"ELITE",  ydsPg:112.3, rec2025:{g:16,yds:1797,td:14,recPg:2.7,ypr:7.6},  props:{recYds:{floor:80,ceil:150,lean:"OVER"},td:{pg:0.88,lean:"OVER -- 14 TDs, elite scorer"}}, situation:"Bills RB1. Every-down back.", bettingAngles:["Rush yards OVER every week","TD scorer OVER"] },
  "Jonathan Taylor":    { pos:"RB", team:"IND", tier:"ELITE",  ydsPg:105.1, rec2025:{g:17,yds:1786,td:14,recPg:3.2,ypr:4.6},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.82,lean:"OVER 0.5"}}, situation:"Colts RB1.", bettingAngles:["Rush yards OVER weekly","TD scorer OVER"] },
  "Derrick Henry":      { pos:"RB", team:"BAL", tier:"ELITE",  ydsPg:103.3, rec2025:{g:16,yds:1653,td:15,recPg:1.1,ypr:5.1},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.94,lean:"OVER -- 15 TDs, most on team"}}, situation:"Ravens RB1 and primary red zone weapon.", bettingAngles:["Rush yards OVER every week","TD scorer -- highest rate in NFL","Fade receiving yards"] },
  "Bijan Robinson":     { pos:"RB", team:"ATL", tier:"ELITE",  ydsPg:100.8, rec2025:{g:17,yds:1713,td:11,recPg:3.8,ypr:5.3},  props:{recYds:{floor:70,ceil:140,lean:"OVER"},td:{pg:0.65,lean:"OVER in favorable matchups"}}, situation:"Falcons RB1. Every-down back with elite receiving role.", bettingAngles:["Rush yards OVER","Receiving yards OVER pass-heavy weeks"] },
  "De'Von Achane":      { pos:"RB", team:"MIA", tier:"ELITE",  ydsPg:93.7,  rec2025:{g:14,yds:1312,td:12,recPg:5.4,ypr:6.3},  props:{recYds:{floor:65,ceil:135,lean:"OVER"},td:{pg:0.86,lean:"OVER"}}, situation:"Dolphins dual-threat RB. Health is the only risk.", bettingAngles:["Rush yards OVER when healthy","Hard fade when injured"] },
  "Puka Nacua":         { pos:"WR", team:"LAR", tier:"ELITE",  ydsPg:107.2, rec2025:{g:16,tgt:166,rec:129,yds:1715,td:0,recPg:8.1,ypr:13.3}, props:{recYds:{floor:75,ceil:140,lean:"OVER"},rec:{floor:6,ceil:11,lean:"OVER -- 8.1/g"},td:{pg:0,lean:"FADE TD scorer -- 0 TDs in 16g"}}, situation:"Rams WR1. Most receptions in NFL 2025. Zero TDs.", bettingAngles:["Receiving yards OVER every week","Catches OVER","FADE TD scorer -- never"] },
  "Ja'Marr Chase":      { pos:"WR", team:"CIN", tier:"ELITE",  ydsPg:88.3,  rec2025:{g:16,tgt:185,rec:125,yds:1412,td:10,recPg:7.8,ypr:11.3}, props:{recYds:{floor:65,ceil:125,lean:"OVER when Burrow healthy"},td:{pg:0.63,lean:"OVER 0.5 favorable matchups"}}, situation:"Bengals WR1. Burrow health is the only variable.", bettingAngles:["Rec yards OVER when Burrow active","Hard fade when Burrow out"] },
  "Jaxon Smith-Njigba": { pos:"WR", team:"SEA", tier:"ELITE",  ydsPg:105.5, rec2025:{g:17,tgt:163,rec:119,yds:1793,td:6,recPg:7.0,ypr:15.1}, props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.35,lean:"Moderate"}}, situation:"Seahawks WR1. Led NFL in receiving yards 2025.", bettingAngles:["Receiving yards OVER","Volume locked regardless of QB"] },
  "George Pickens":     { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:84.1,  rec2025:{g:17,tgt:137,rec:93,yds:1429,td:8,recPg:5.5,ypr:15.4}, props:{recYds:{floor:65,ceil:125,lean:"OVER"},td:{pg:0.47,lean:"OVER 0.5 red zone games"}}, situation:"Cowboys deep threat WR.", bettingAngles:["Receiving yards OVER","TD scorer in red zone"] },
  "Trey McBride":       { pos:"TE", team:"ARI", tier:"ELITE",  ydsPg:72.9,  rec2025:{g:17,tgt:169,rec:126,yds:1239,td:5,recPg:7.4,ypr:9.8}, props:{rec:{floor:5,ceil:10,lean:"OVER -- 7.4/g leads all TEs"},recYds:{floor:55,ceil:100,lean:"OVER"},td:{pg:0.29,lean:"Moderate"}}, situation:"Best TE situation in football.", bettingAngles:["Catches OVER every week","Receiving yards OVER","FADE TD scorer"] },
  "Travis Kelce":       { pos:"TE", team:"KAN", tier:"ELITE",  ydsPg:50.1,  rec2025:{g:17,tgt:108,rec:76,yds:851,td:4,recPg:4.5,ypr:11.2}, props:{rec:{floor:3,ceil:7,lean:"OVER -- Mahomes always finds him"},td:{pg:0.24,lean:"Moderate -- age 37"}}, situation:"Chiefs TE1. Age 37. Declining but Mahomes keeps relevant.", bettingAngles:["Catches OVER when Mahomes healthy","FADE receiving yards -- real floor ~50"] },
  "Brock Bowers":       { pos:"TE", team:"LVR", tier:"ELITE",  ydsPg:56.7,  rec2025:{g:12,tgt:86,rec:64,yds:680,td:3,recPg:5.3,ypr:10.6}, props:{rec:{floor:4,ceil:8,lean:"OVER when healthy"},td:{pg:0.25,lean:"Moderate"}}, situation:"Raiders TE1. Health is major variable.", bettingAngles:["Health monitor every week","OVER when active","Fade when on injury report"] },
};

const NFL_QBS = {
  "Josh Allen":       { team:"BUF", tier:"ELITE",   passing:{ gs:17,cmp:69.3,yds:3668,td:25,int:10,ypa:8.0,rate:102.2 }, rushing:{ attPg:6.6,ydsPg:34.1,tdPg:0.82,ypc:5.2,tier:"ELITE RUSHER" }, note:"79.9% on-target plus elite rushing floor = safest QB1 in football." },
  "Drake Maye":       { team:"NE",  tier:"ELITE",   passing:{ gs:17,cmp:72.0,yds:4394,td:31,int:8,ypa:8.9,rate:113.5 }, rushing:{ attPg:6.1,ydsPg:26.5,tdPg:0.24,tier:"STRONG RUSHER" }, note:"QBR 77.1 as a rookie is historically rare." },
  "Patrick Mahomes":  { team:"KC",  tier:"ELITE",   passing:{ gs:14,cmp:62.7,yds:3587,td:22,int:11,ypa:7.1,rate:89.6 }, rushing:{ attPg:4.6,ydsPg:30.1,tdPg:0.36,ypc:6.6,tier:"ELITE RUSHER" }, note:"30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football." },
  "Lamar Jackson":    { team:"BAL", tier:"ELITE",   passing:{ gs:13,cmp:63.6,yds:2549,td:21,int:7,ypa:8.4,rate:103.8 }, rushing:{ attPg:5.2,ydsPg:26.8,tdPg:0.15,tier:"STRONG RUSHER" }, note:"Rushing floor covers accuracy concerns. Health is the key variable." },
  "Joe Burrow":       { team:"CIN", tier:"ELITE",   passing:{ gs:8,cmp:66.8,yds:1809,td:17,int:5,ypa:7.0,rate:100.7 }, note:"80.3% on-target is the real Burrow. Bet TDs aggressively when healthy." },
  "Matthew Stafford": { team:"LAR", tier:"ELITE",   passing:{ gs:17,cmp:65.0,yds:4707,td:46,int:8,ypa:7.9,rate:109.2 }, props:{ passTd:{ pg:2.71,lean:"OVER 2.5" } }, note:"9.0 IAY/PA highest among all starters. TD prop (2.71/g) most reliable in NFC." },
  "Dak Prescott":     { team:"DAL", tier:"ELITE",   passing:{ gs:17,cmp:67.3,yds:4552,td:30,int:10,ypa:7.6,rate:99.5 }, note:"12.5% bad throw rate is cleanest among ELITE tier QBs." },
  "Jordan Love":      { team:"GB",  tier:"ELITE",   passing:{ gs:15,cmp:66.3,yds:3381,td:23,int:6,ypa:7.7,rate:101.2 }, note:"Most underrated QB in football. QBR 72.7 with only 6 INTs." },
  "Jared Goff":       { team:"DET", tier:"STARTER", passing:{ gs:17,cmp:68.0,yds:4564,td:34,int:8,ypa:7.9,rate:105.5 }, props:{ passTd:{ pg:2.0,lean:"OVER 1.5 every week" } }, note:"FADE in cold outdoor road games." },
  "Brock Purdy":      { team:"SF",  tier:"STARTER", passing:{ gs:9,cmp:69.4,yds:2167,td:20,int:10,ypa:7.6,rate:100.5 }, note:"82.2% on-target highest among all starters." },
  "Jalen Hurts":      { team:"PHI", tier:"STARTER", passing:{ gs:16,cmp:64.8,yds:3224,td:25,int:6,ypa:7.1,rate:98.5 }, rushing:{ attPg:6.6,ydsPg:26.3,tdPg:0.50,tier:"STRONG RUSHER" }, note:"Rushing floor covers any passing variance." },
  "C.J. Stroud":      { team:"HOU", tier:"STARTER", passing:{ gs:14,cmp:64.5,yds:3041,td:19,int:8,ypa:7.2,rate:92.9 }, note:"Year 3 with healthy weapons projects top-8 QB." },
  "Trevor Lawrence":  { team:"JAX", tier:"STARTER", passing:{ gs:17,cmp:60.9,yds:4007,td:29,int:12,ypa:7.2,rate:91.0 }, rushing:{ attPg:4.8,ydsPg:21.1,tdPg:0.53,tier:"STRONG RUSHER" }, note:"Total TD prop most underrated bet on his slate." },
  "Caleb Williams":   { team:"CHI", tier:"STARTER", passing:{ gs:17,cmp:58.1,yds:3942,td:27,int:7,ypa:6.9,rate:90.1 }, rushing:{ attPg:4.5,ydsPg:22.8,tier:"STRONG RUSHER" }, note:"Year 2 with better cast is the buy." },
  "Jayden Daniels":   { team:"WAS", tier:"STARTER", passing:{ gs:7,cmp:60.6,yds:1262,td:8,int:3 }, rushing:{ attPg:8.3,ydsPg:39.7,tdPg:0.29,tier:"ELITE RUSHER" }, note:"39.7 rushing yds/g pace is best in NFC." },
  "Jaxson Dart":      { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12,cmp:63.7,yds:2272,td:15,int:5,ypa:6.7 }, rushing:{ attPg:6.1,ydsPg:34.8,tdPg:0.64,ypc:5.7,tier:"ELITE RUSHER" }, note:"34.8 rushing yds/g is best prop edge in NFC East." },
  "Shedeur Sanders":  { team:"TEN", tier:"ROOKIE",  passing:{ gs:0 }, note:"2026 Draft Pick #1 overall by Tennessee Titans. Fade Titans early-season totals." },
  "Bo Nix":           { team:"DEN", tier:"STARTER", passing:{ gs:17,cmp:63.4,yds:3931,td:25,int:11,ypa:6.4,rate:87.8 }, rushing:{ attPg:4.9,ydsPg:20.9,tier:"STRONG RUSHER" }, note:"RPO scheme generates Denver offense. Fade in shootouts." },
  "Baker Mayfield":   { team:"TB",  tier:"STARTER", passing:{ gs:17,cmp:63.2,yds:3693,td:26,int:11,ypa:6.8,rate:90.6 }, rushing:{ attPg:3.2,ydsPg:22.5,ypc:6.9,tier:"STRONG RUSHER" }, note:"Lowest pressure rate among starters (14.8%). Evans TD scorer OVER." },
};

// ── F1 Data ───────────────────────────────────────────────────────────────────

const LEGACY_F1_STANDINGS_BACKUP = [
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
  if (mcLeague.includes("nfl"))                              return "nfl";
  if (mcLeague.includes("atp") || mcLeague.includes("wta")) return "tennis";
  if (mcLeague.includes("pga") || mcLeague.includes("golf"))return "golf";
  if (mcLeague.includes("f1")  || mcLeague.includes("formula")) return "f1";
  if (mcLeague.includes("nba"))                              return "nba";
  if (mcLeague.includes("mlb"))                              return "mlb";

  const golfPlayers = ["scheffler","mcilroy","rory ","schauffele","xander","morikawa","collin","hovland","viktor","cantlay","rahm","aberg","ludvig","wyndham","finau","russell henley","sam burns","sungjae","fleetwood","fitzpatrick","cameron smith","hatton","lowry","matsuyama","hideki","justin thomas","spieth","brian harman","tom kim","macintyre","theegala","rickie fowler","keegan bradley","adam scott","cameron young","chris kirk","sepp straka","dustin johnson","brooks koepka","bryson","phil mickelson","corey conners","akshay bhatia","min woo lee","nick taylor","jason day","haotong li","hao-tong","justin rose"];
  for (const p of golfPlayers) { if (q.includes(p)) return "golf"; }

  const tennisPlayers = ["alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton","fritz","draper","bublik","mensik","ruud","rublev","sabalenka","rybakina","swiatek","pegula","gauff","andreeva","paolini","keys","osaka","noskova","kostyuk","zheng","kartal"];
  for (const p of tennisPlayers) { if (q.includes(p)) return "tennis"; }

  const f1Drivers = ["antonelli","george russell","leclerc","lewis hamilton","lando norris","oscar piastri","max verstappen","isack hadjar","carlos sainz","albon","fernando alonso","lance stroll","pierre gasly","franco colapinto","hulkenberg","bortoleto","bearman","esteban ocon","liam lawson"];
  for (const d of f1Drivers) { if (q.includes(d)) return "f1"; }

  const nflPlayers = ["mahomes","josh allen","lamar jackson","joe burrow","dak prescott","jalen hurts","brock purdy","jared goff","matthew stafford","cj stroud","trevor lawrence","jordan love","drake maye","jayden daniels","caleb williams","bo nix","baker mayfield","shedeur sanders","derrick henry","james cook","jonathan taylor","puka nacua","ja'marr chase","jaxon smith-njigba","george pickens","ceedee lamb","trey mcbride","brock bowers","travis kelce","tyreek hill"];
  for (const p of nflPlayers) { if (q.includes(p)) return "nfl"; }

  const nbaPlayers = ["jokic","nikola jokic","shai gilgeous","sga","luka doncic","jayson tatum","giannis","wembanyama","jalen brunson","steph curry","kevin durant","devin booker","ja morant","anthony edwards","karl-anthony towns","tyrese haliburton","donovan mitchell","bam adebayo","lebron","lamelo","damian lillard","trae young","anthony davis","rudy gobert","jaren jackson","lauri markkanen","cade cunningham","paolo banchero","scottie barnes","franz wagner","alperen sengun","jaylen brown"];
  for (const p of nbaPlayers) { if (q.includes(p)) return "nba"; }

  const mlbPlayers = ["ohtani","shohei","mike trout","aaron judge","acuna","mookie betts","freddie freeman","pete alonso","lindor","corbin carroll","gunnar henderson","corey seager","bryce harper","guerrero","jose ramirez","julio rodriguez","gerrit cole","paul skenes","zack wheeler","corbin burnes"];
  for (const p of mlbPlayers) { if (q.includes(p)) return "mlb"; }

  const golfTerms = ["pga tour","pga championship","the masters","masters tournament","the open championship","british open","us open golf","ryder cup","strokes gained","sg total","sg app","make cut","missed cut","course fit","bentgrass","poa annua","augusta national","tpc sawgrass","pebble beach","pinehurst","riviera","quail hollow","royal troon","amen corner","green jacket","birdie","bogey","front nine","back nine","hole-in-one"];
  for (const t of golfTerms) { if (q.includes(t)) return "golf"; }

  const tennisTerms = ["roland garros","french open","wimbledon","australian open","miami open","wta tour","atp tour","surface elo","clay court","grass court","tiebreak","ace","double fault","break point"];
  for (const t of tennisTerms) { if (q.includes(t)) return "tennis"; }

  const f1Terms = ["formula 1","formula one","grand prix","f1 race","constructor championship","driver championship","pit stop","drs zone","qualifying"];
  for (const t of f1Terms) { if (q.includes(t)) return "f1"; }

  const nbaTerms = ["nba finals","nba playoffs","triple double","nba prop","pra ","three pointer","usage rate","basketball"];
  for (const t of nbaTerms) { if (q.includes(t)) return "nba"; }

  const mlbTerms = ["world series","starting pitcher","earned run average","strikeout rate","batting average","home run prop","k prop","park factor","barrel rate","statcast","baseball"];
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

function buildNflSkillContext() {
  return Object.entries(NFL_PLAYERS).map(([name, p]) => {
    return [
      `${name} | ${p.pos} | ${p.team} | ${p.tier}`,
      `  Stats: ${p.ydsPg} yds/g | TDs: ${p.rec2025.td} in ${p.rec2025.g}g | Rec/g: ${p.rec2025.recPg || "—"}`,
      `  TD lean: ${p.props.td?.lean || "—"} | Volume lean: ${p.props.recYds?.lean || p.props.rec?.lean || "—"}`,
      `  Situation: ${p.situation}`,
      `  Angles: ${p.bettingAngles.join(" | ")}`,
    ].join("\n");
  }).join("\n\n");
}

// ── Golf System Prompt ────────────────────────────────────────────────────────
function buildGolfSystemPrompt(ctx) {
  const today = getTodayStr();
  const currentEvent = ctx?.currentEvent || null;
  const odds = ctx?.odds || {};
  const question = ctx?.question || "";

  const tournament = ctx?.tournament || null;
  const recentResults = Array.isArray(ctx?.recentResults) ? ctx.recentResults : [];
  const sourceMeta = ctx?.sourceMeta || {};

  const hasLiveLeaderboard = Array.isArray(currentEvent?.leaderboard) && currentEvent.leaderboard.length > 0;
  const eventState = String(currentEvent?.state || "").toLowerCase();
  const roundText = String(currentEvent?.round || "").toLowerCase();
  const isLikelyFinished =
    eventState === "post" ||
    eventState === "final" ||
    roundText.includes("final") ||
    roundText.includes("completed");

  const hasUpcomingTournament =
    !!tournament?.name &&
    !hasLiveLeaderboard &&
    !isLikelyFinished;

  const displayEventName =
    (hasLiveLeaderboard || isLikelyFinished)
      ? (currentEvent?.name || tournament?.name || "PGA Tour Event")
      : (tournament?.name || currentEvent?.name || "PGA Tour Event");

  const displayCourse =
    currentEvent?.course || tournament?.courseName || ctx?.course?.name || "TBD";

  const displayLocation =
    currentEvent?.location || tournament?.location || [ctx?.course?.city, ctx?.course?.state || ctx?.course?.country].filter(Boolean).join(", ");

const upcomingEventLine =
  hasUpcomingTournament
    ? `NEXT TOURNAMENT: ${displayEventName} | COURSE: ${displayCourse} | LOCATION: ${displayLocation || "TBD"} | START: ${tournament?.startDate || currentEvent?.startDate || "TBD"}`
    : "";
  
  const courseNameLower = String(displayCourse || "").toLowerCase();

  let leaderBlock = "";
  if (hasLiveLeaderboard && !isLikelyFinished) {
    leaderBlock = `════════════════════════════════════
LIVE TOURNAMENT DATA -- GROUND TRUTH -- DO NOT CONTRADICT
════════════════════════════════════
EVENT: ${displayEventName}
COURSE: ${displayCourse} | ${displayLocation || ""}
ROUND: ${currentEvent?.round || "In Progress"}

LEADERBOARD (current):
${currentEvent.leaderboard.slice(0, 20).map(p =>
  `${p.position}. ${p.name} (${p.country}) -- ${p.score}` +
  (p.thru && p.thru !== "--" ? ` | Thru ${p.thru}` : "") +
  (p.today && p.today !== "--" ? ` | Today ${p.today}` : "")
).join("\n")}
════════════════════════════════════

`;
  } else if (hasUpcomingTournament) {
    leaderBlock = `════════════════════════════════════
UPCOMING TOURNAMENT
════════════════════════════════════
EVENT: ${displayEventName}
COURSE: ${displayCourse}
LOCATION: ${displayLocation || "TBD"}
STATUS: Upcoming
START DATE: ${tournament?.startDate || currentEvent?.startDate || "TBD"}
════════════════════════════════════

`;
  } else if (displayEventName) {
    leaderBlock = `════════════════════════════════════
EVENT CONTEXT
════════════════════════════════════
EVENT: ${displayEventName}
COURSE: ${displayCourse}
LOCATION: ${displayLocation || "TBD"}
STATUS: ${currentEvent?.round || tournament?.status || "Unknown"}
No reliable live leaderboard is loaded.
════════════════════════════════════

`;
  }

  let courseData = null;
  for (const cKey in PGA_COURSES) {
    if (cKey.toLowerCase().includes(courseNameLower) || courseNameLower.includes(cKey.toLowerCase())) {
      courseData = PGA_COURSES[cKey];
      break;
    }
  }

  const courseSection = courseData
    ? `COURSE PROFILE: ${displayCourse.toUpperCase()} | Type: ${courseData.type} | Grass: ${courseData.grass} | SG premium: ${courseData.sgPremium}
Who wins: ${courseData.whoWins}
Specialists: ${(courseData.specialists || []).join(", ")}
Note: ${courseData.note}
`
    : displayCourse
      ? `COURSE PROFILE: ${displayCourse.toUpperCase()} -- Not in database. Use SG profile, form, and market context as primary signal.
`
      : "";

  let oddsStr = "";
  if (odds?.outrights?.length > 0) {
    oddsStr =
      "MARKET ODDS:\n" +
      odds.outrights.slice(0, 25).map(o => `${o.player}: ${o.odds > 0 ? "+" : ""}${o.odds}`).join("\n") +
      "\n";
  }

  let recentResultsStr = "";
  if (recentResults.length > 0) {
    recentResultsStr =
      "RECENT TOURNAMENT RESULTS:\n" +
      recentResults.slice(0, 10).map(r => `${r.position || "-"} ${r.player} ${r.score != null ? `(${r.score})` : ""}`.trim()).join("\n") +
      "\n";
  }

  const playerStr =
    "PLAYER DATABASE:\n" +
    Object.entries(PGA_PLAYERS)
      .filter(([, p]) => p.tier === 1)
      .slice(0, 30)
      .map(([name, p]) => {
        if (!p?.sg) return "";
        return `${name} | Rank ${p.rank} | SG: Total ${p.sg.total} OTT ${p.sg.ott} APP ${p.sg.app} ARG ${p.sg.arg} PUTT ${p.sg.putt} | Form: ${(p.recentForm || []).join(",")} | Cut:${p.cutMaking} Top10:${p.top10Rate} Win:${p.winRate} | ${p.note || ""}`;
      })
      .filter(Boolean)
      .join("\n");

  return `You are Under Review -- the sharpest golf betting intelligence tool available.

TODAY: ${today}

IDENTITY: Sharp golf analyst. Lead with the lean. Make a call. NEVER ask for more information.
FORMATTING: NEVER use markdown. No ##, no ---, no ** bold. Plain text only.

${upcomingEventLine ? upcomingEventLine + "\n\n" : ""}

CRITICAL FACTUAL RULES:
1. If LIVE TOURNAMENT DATA is present, it is ground truth.
2. If no live leaderboard is loaded, do not invent who is leading, trailing, co-leading, through a round, or at a specific score.
3. If the event is upcoming, answer as a pre-tournament betting analyst. Do not describe any live leaderboard.
4. If the event is complete or stale, do not treat it as current.
5. Player notes are evergreen scouting only, not current-tournament state.
6. Course notes are course-fit context only, not current event news.
7. If the user asks who can win the next tournament, focus on outrights, course fit, recent form, and market price.
8. If odds are not loaded, still answer, but label MARKET as not loaded.

UR FAIR ODDS -- REQUIRED ON EVERY PLAY:
1. Start with player's base win rate or top-10 rate.
2. Adjust for course fit: ELITE=+20%, NEUTRAL=-20%, STRONG=neutral.
3. Adjust for recent form: WIN or T2-T5=+10%, weaker run=-10%.
4. Convert to American odds. Output exactly: UR FAIR ODDS: [number] | MARKET: [line or "not loaded"] | VALUE: [gap]

RESPONSE FORMAT:
[One sharp opening sentence -- the lean]
[2-4 sentences: SG data, course fit, form, and leaderboard context only if actually loaded]
THE PLAY: [Player] -- [Market]
UR FAIR ODDS: [fair odds] | MARKET: [line] | VALUE: [gap]
FADE: [player to avoid + one-line reason]
CONFIDENCE: [High/Medium/Speculative] -- [one sentence]

${leaderBlock}${courseSection ? courseSection + "\n" : ""}${recentResultsStr ? recentResultsStr + "\n" : ""}${oddsStr ? oddsStr + "\n" : ""}${playerStr}

QUESTION: ${question}
SOURCE META: ${JSON.stringify(sourceMeta)}`;
}

// ── F1 System Prompt ──────────────────────────────────────────────────────────
function buildF1SystemPrompt(matchupCtxStr, f1Context) {
  const today = getTodayStr();
  const now = new Date();

  const STREET = ["monaco","baku","singapore","las vegas","miami","jeddah","saudi","saudi arabia"];
  const POWER  = ["monza","spa","silverstone","interlagos","sao paulo","montreal","jeddah"];
  const HDFRC  = ["hungary","hungaroring","barcelona","catalunya","zandvoort","suzuka"];

  const question = String(f1Context?.question || "").toLowerCase();
const usingFallback = !!f1Context?.usingFallback;

const hasReliableSchedule =
  Array.isArray(f1Context?.schedule?.races) &&
  f1Context.schedule.races.length > 0 &&
  !usingFallback;

const liveStandings = Array.isArray(f1Context?.standings) ? f1Context.standings : [];
const standingsSource = liveStandings.length > 0
  ? liveStandings
  : LEGACY_F1_STANDINGS_BACKUP;

const liveRaces = hasReliableSchedule ? f1Context.schedule.races : [];
const useCalendar = liveRaces.map(r => ({
    meeting_name: r.meeting_name || r.name || "Grand Prix",
    location: r.location || r.circuit_short_name || "TBD",
    date_start: r.date_start || null,
    date_end: r.date_end || null,
    completed: !!r.completed || (r.date_end ? new Date(r.date_end) < now : false),
    winner: r.winner || null,
  })).filter(r => r.date_start);

  if (!useCalendar.length) {
    return `You are Under Review -- a sharp F1 betting intelligence tool.

TODAY: ${today}
IDENTITY: Lead with the take. Never hedge. Never open with a limitation.
FORMATTING: NEVER use markdown. Plain text only.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE BET: * [Driver] -- [market] -- [key reason]
FADE: [one line]
CONFIDENCE: [High/Medium/Speculative]
TIMING: [one line]

CRITICAL RULES:
1. Do not invent the next race, session status, or standings.
2. Use only live F1 context passed into this request.
3. If schedule data is missing, say the schedule is not loaded and pivot to driver form, team strength, or futures only.
4. If the user names a specific race or driver, answer that directly without talking about a fake next race.

${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
  }

  const upcoming = useCalendar
    .filter(m => !m.completed && new Date(m.date_start) > now)
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  const current = useCalendar.filter(m => {
    const start = new Date(m.date_start);
    const end = m.date_end ? new Date(m.date_end) : new Date(start.getTime() + 3 * 86400000);
    return start <= now && now <= end;
  });

  const completed = useCalendar
    .filter(r => r.completed && r.winner)
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  const activeRace = current[0] || upcoming[0] || null;

  const standingsStr = standingsSource.map((d, i) =>
    `${d.position || i + 1}. ${d.full_name || d.name} (${d.team_name || d.team}) -- ${d.points ?? 0} pts`
  ).join("\n");

  const standingsNote = liveStandings.length > 0
    ? "LIVE standings from F1 route"
    : "Fallback standings in use";

  const recentStr = completed.length
    ? "RECENT RESULTS:\n" + completed.slice(-3).reverse().map(r => `${r.meeting_name}: Winner -- ${r.winner}`).join("\n")
    : "";

  let nextRaceLine = "NEXT RACE: Not loaded.";
  let circuitType = "mixed";
  let circuitNote = "Championship form is the primary signal.";
  let isRaceWeek = false;

  if (activeRace) {
    const loc = activeRace.location || "TBD";
    const raceName = activeRace.meeting_name || "Grand Prix";
    const start = new Date(activeRace.date_start);
    const dateStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    const isLive = current.length > 0;

    isRaceWeek = isLive || daysUntil <= 7;

    nextRaceLine =
      (isLive ? "ACTIVE RACE WEEKEND: " : (usingFallback ? "NEXT LISTED RACE: " : "NEXT RACE: ")) +
      `${raceName} -- ${loc} (${dateStr})` +
      (daysUntil > 0 ? ` -- ${daysUntil} days away` : " -- THIS WEEKEND");

    const vl = `${loc} ${raceName}`.toLowerCase();
    if (STREET.some(c => vl.includes(c))) {
      circuitType = "STREET CIRCUIT";
      circuitNote = "Qualifying matters most. Clean air and safety car variance matter more than raw long-run pace.";
    } else if (POWER.some(c => vl.includes(c))) {
      circuitType = "POWER CIRCUIT";
      circuitNote = "Straight-line speed and deployment matter. Back teams with top-end PU and overtaking pace.";
    } else if (HDFRC.some(c => vl.includes(c))) {
      circuitType = "HIGH DOWNFORCE";
      circuitNote = "Aero platform and medium-speed grip matter most. Tire life and qualifying balance decide the weekend.";
    }
  }

  const upcomingStr = upcoming.slice(0, 5).map(m => {
    const d = new Date(m.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${m.meeting_name} -- ${m.location} (${d})`;
  }).join("\n");

  return `You are Under Review -- a sharp F1 betting intelligence tool.

TODAY: ${today}
IDENTITY: Lead with the take. Never hedge. Never open with a limitation.
FORMATTING: NEVER use markdown. Plain text only.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE BET: * [Driver] -- [market] -- [key reason]
FADE: [one line]
CONFIDENCE: [High/Medium/Speculative]
TIMING: [one line]

2026 F1 GRID (only these drivers exist):
Kimi Antonelli (Mercedes) | George Russell (Mercedes) | Charles Leclerc (Ferrari) | Lewis Hamilton (Ferrari) | Lando Norris (McLaren) | Oscar Piastri (McLaren) | Max Verstappen (Red Bull) | Isack Hadjar (Red Bull) | Carlos Sainz (Williams) | Alexander Albon (Williams) | Fernando Alonso (Aston Martin) | Lance Stroll (Aston Martin) | Pierre Gasly (Alpine) | Franco Colapinto (Alpine) | Nico Hulkenberg (Audi) | Gabriel Bortoleto (Audi) | Oliver Bearman (Haas) | Esteban Ocon (Haas) | Liam Lawson (Racing Bulls) | Arvid Lindblad (Racing Bulls) | Valtteri Bottas (Cadillac) | Sergio Perez (Cadillac)
CRITICAL: Tsunoda, Magnussen, Zhou, Doohan NOT on 2026 grid.

POWER UNIT ORDER: 1. Mercedes | 2. Ferrari | 3. McLaren | 4. Red Bull
KEY FACTS: Use live schedule/session context first. If fallback schedule is active, do not present race sequencing as certain.

${nextRaceLine}
${isRaceWeek ? "RACE WEEK." : "OFF WEEK -- futures and team-form edges matter more."}
CIRCUIT TYPE: ${circuitType} | BETTING NOTE: ${circuitNote}

${recentStr ? recentStr + "\n\n" : ""}CHAMPIONSHIP STANDINGS (${standingsNote}):
${standingsStr}

${upcomingStr ? "UPCOMING:\n" + upcomingStr + "\n\n" : ""}${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}QUESTION: ${question}`;
}

// ── NBA System Prompt ─────────────────────────────────────────────────────────
function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
  const today = getTodayStr();
  const ctx = nbaContext || {};
  const phase = ctx.seasonContext?.phase || "NBA Season Active";
  const gamesList = ctx.todaysGames || [];

  const gamesStr = gamesList.length > 0
    ? gamesList.map(g => {
        const away = g.awayTeam?.tricode || g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
        const home = g.homeTeam?.tricode || g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
        if (g.statusCode === 3 || g.state === "post") return `${away} ${g.awayTeam?.score} @ ${home} ${g.homeTeam?.score} -- FINAL`;
        if (g.statusCode === 2 || g.state === "in")   return `${away} ${g.awayTeam?.score} @ ${home} ${g.homeTeam?.score} -- LIVE`;
        return `${away} @ ${home} -- ${g.status || "Scheduled"}`;
      }).join("\n")
    : "No games on today's schedule.";

  // Live prop lines from Odds API
  const propLines = ctx.propLines || [];
  let propLinesStr = "No prop lines posted yet.";
  if (propLines.length > 0) {
    const grouped = {};
    for (const pl of propLines) {
      const k = pl.player + "|" + pl.prop;
      if (!grouped[k]) grouped[k] = { player: pl.player, prop: pl.prop, game: pl.game, over: null, under: null };
      if (pl.side === "Over")  grouped[k].over  = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
      if (pl.side === "Under") grouped[k].under = pl.line;
    }
    propLinesStr = Object.values(grouped).slice(0, 80).map(e => {
      let s = e.over ? "OVER " + e.over : "";
      if (e.under) s += (s ? " / UNDER " : "UNDER ") + e.under;
      return `${e.player} -- ${e.prop.toUpperCase()} -- ${s} [${e.game}]`;
    }).join("\n");
  }

  // Live ESPN season averages — these have current teams and reflect trades
  const playerStats = ctx.playerStats || [];
  const seasonAvgsStr = playerStats.length > 0
    ? "LIVE ESPN SEASON AVERAGES (current teams -- use these over database for team info):\n" +
      playerStats.slice(0, 60).map(p => {
        const pra = ((parseFloat(p.pts) || 0) + (parseFloat(p.reb) || 0) + (parseFloat(p.ast) || 0)).toFixed(1);
        return `${p.name} (${p.team}): ${p.pts}pts/${p.reb}reb/${p.ast}ast | PRA avg ${pra}`;
      }).join("\n")
    : "";

  const question = ctx.question || "";
  const q = question.toLowerCase();
  const propSet = new Set(propLines.map(p => p.player && p.player.toLowerCase()).filter(Boolean));
  const entries = Object.entries(NBA_PLAYERS);
  const mentioned = entries.filter(([n]) => { const l = n.toLowerCase(); return q.includes(l) || q.includes(l.split(" ").pop()); });
  const playing   = entries.filter(([n]) => { const l = n.toLowerCase(); return !q.includes(l) && (propSet.has(l) || Array.from(propSet).some(p => p && p.includes(l.split(" ").pop()))); });
  const others    = entries.filter(([n]) => { const l = n.toLowerCase(); return !q.includes(l) && !propSet.has(l); }).slice(0, 10);
  const playerDbStr = [...mentioned, ...playing, ...others].slice(0, 30).map(([name, p]) => {
    const pFloor = p.props?.pra?.floor || p.props?.pts?.floor || "--";
    const pCeil  = p.props?.pra?.ceil  || p.props?.pts?.ceil  || "--";
    const lean   = p.props?.pra?.lean  || p.props?.pts?.lean  || "--";
    return `${name} | ${p.team} | ${p.tier} | PRA ${pFloor}-${pCeil} | ${lean} | ${(p.bettingAngles || []).slice(0, 2).join(" | ")}`;
  }).join("\n");

  return `You are Under Review -- a sharp NBA betting intelligence tool.

TODAY: ${today}
IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.
FORMATTING: NEVER use markdown. Plain text only.

CRITICAL LIVE DATA RULE: The LIVE ESPN SEASON AVERAGES section below shows current team assignments and reflects all trades. If a player's team in the averages differs from the DATABASE section, the averages are correct. Always trust live data over the database.

RULES: Never recommend props for FINAL games. No games? Give best NBA futures angle.
NBA PHASE: ${phase}
NBA PLAYOFFS: Begin April 19, 2026. Top seeds: OKC, CLE. Best futures: SGA MVP, Jokic PRA series props.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] -- [PROP OVER/UNDER LINE] ([ODDS]) -- [key reason]
FADE: [one line] | CONFIDENCE: [High/Medium/Speculative] | TIMING: [one line]

TONIGHT'S GAMES:
${gamesStr}

${propLinesStr !== "No prop lines posted yet." ? "LIVE PROP LINES:\n" + propLinesStr + "\n\n" : "PROP LINES: Not yet posted.\n\n"}${seasonAvgsStr ? seasonAvgsStr + "\n\n" : ""}PLAYER DATABASE (may lag trades -- defer to LIVE ESPN AVERAGES above for team):
${playerDbStr}

${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── MLB System Prompt ─────────────────────────────────────────────────────────
function buildMlbSystemPrompt(mlbContext, matchupCtxStr) {
  const today = getTodayStr();
  const ctx = mlbContext || {};
  const phase = ctx.seasonContext?.phase || "MLB Season Active";
  const games = ctx.games || [];

  const gamesStr = games.length > 0
    ? games.map(g => {
        const away = g.awayTeam || {};
        const home = g.homeTeam || {};
        const awayId = away.abbr || away.name || "AWAY";
        const homeId = home.abbr || home.name || "HOME";
        const awayP  = away.pitcher ? ` [SP: ${away.pitcher}]` : "";
        const homeP  = home.pitcher ? ` [SP: ${home.pitcher}]` : "";
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
      if (!grouped[k]) grouped[k] = { player: pl.player, prop: pl.prop, game: pl.game, over: null, under: null };
      if (pl.side === "Over")  grouped[k].over  = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
      if (pl.side === "Under") grouped[k].under = pl.line;
    }
    propLinesStr = Object.values(grouped).slice(0, 60).map(e => {
      let s = e.over ? "OVER " + e.over : "";
      if (e.under) s += (s ? " / UNDER " : "UNDER ") + e.under;
      return `${e.player} -- ${e.prop.toUpperCase()} -- ${s} [${e.game}]`;
    }).join("\n");
  }

  const gameTotals = ctx.gameTotals || {};
  const totalsStr = Object.keys(gameTotals).length
    ? Object.entries(gameTotals).map(([gk, t]) => {
        const note = t.run_env === "HIGH" ? " -- HIGH run env" : t.run_env === "LOW" ? " -- LOW run env" : "";
        return `${gk}: O/U ${t.total}${note}`;
      }).join("\n")
    : "";

  return `You are Under Review -- a sharp MLB betting intelligence tool.

TODAY: ${today}
IDENTITY: Lead with the take. No hedging. No markdown. Plain text only.
No props for FINAL games. No games? Give best futures or upcoming matchup angle.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] -- [PROP OVER/UNDER LINE] ([ODDS]) -- [key reason]
FADE: [one line] | CONFIDENCE: [High/Medium/Speculative] | TIMING: [one line]

MLB PRINCIPLES:
Strikeout props = primary market. K/9 vs opposing K% is the edge.
Park factors matter. Coors = back OVERs. Petco = fade OVERs.
Platoon splits = most underused edge. Check righty vs lefty splits before posting.

PARK FACTORS:
OVER: Coors ~120, Great American ~108, Globe Life ~106
UNDER: Petco ~93, Oracle ~92, T-Mobile ~91
Neutral: Dodger ~99, Yankee ~101

TODAY: ${today} | MLB PHASE: ${phase}

GAMES:
${gamesStr}

${totalsStr ? "TOTALS:\n" + totalsStr + "\n\n" : ""}${propLinesStr !== "No prop lines posted yet." ? "PROP LINES:\n" + propLinesStr + "\n\n" : "PROP LINES: Not yet posted.\n\n"}${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── NFL System Prompt ─────────────────────────────────────────────────────────
function buildNflSystemPrompt(question, nflContext, matchupCtxStr) {
  const today = getTodayStr();
  const nowMonth = new Date().getMonth() + 1;
  const phase = (nowMonth >= 9 || nowMonth <= 1)
    ? "IN-SEASON (weekly props are live)"
    : "OFFSEASON (futures + directional leans only)";

  const qbData  = JSON.stringify(getRelevantQBs(question), null, 0).slice(0, 9000);
  const skill   = getRelevantSkillPlayers(question, nflContext) || buildNflSkillContext();

  return `You are Under Review -- a sharp NFL betting intelligence tool.

TODAY: ${today}
IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.
FORMATTING: NEVER use markdown. Plain text only.
CURRENT NFL STATUS: ${phase}

CRITICAL TEAM RULE: The databases below reflect 2025 season. Trades and roster moves happen. If the user mentions a player on a different team than listed, believe the user -- they have more current info. Label your response with "team unconfirmed" if uncertain.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] -- [prop type] -- [line or DIRECTIONAL] -- [floor/ceiling] -- [key reason]
FADE: [name specific player or team] | CONFIDENCE: [High/Medium/Speculative] | TIMING: [when to bet]

NFL STAT GLOSSARY: ontgt avg 74.9% (elite 78%+) | badTh avg 16.1% (elite sub-13%) | prss avg 21.9% (liability 25%+)

KEY TD RATES (2025): Derrick Henry 0.94/g | James Cook 0.88/g | De'Von Achane 0.86/g | Jonathan Taylor 0.82/g | Puka Nacua 0/16g -- NEVER bet Nacua as TD scorer

2026 NFL DRAFT: Pick 1 TEN Shedeur Sanders | Pick 2 CLE Mason Graham | Pick 3 NYG Abdul Carter | Pick 4 NE Will Campbell | Pick 5 JAX Travis Hunter

DEFENSE TIERS:
ELITE (fade OVERs): PHI, BAL, MIN, DEN
STRONG (lean fade): KC, SF, GB, BUF, HOU, TB, LAC, PIT
AVERAGE (neutral): NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO
WEAK (lean over): MIA, CIN, NYJ, NYG, ARI
BOTTOM (hard over): TEN, CLE, LVR, CAR

RB/WR/TE DATABASE:
${skill}

QB DATABASE:
${qbData}

${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── Tennis System Prompt ──────────────────────────────────────────────────────
function buildTennisSystemPrompt(question, players, context, liveMatches, matchupCtxStr) {
  const today = getTodayStr();
  const t = context?.currentTournament;
  const tournamentCtx = t
    ? `ACTIVE: ${t.name} -- ${t.surface}, ${t.speed} speed.\n${t.context || ""}\nATP: ${t.atp_favorite || "TBD"} | WTA: ${t.wta_favorite || "TBD"}`
    : "Context not loaded. Answer from player database and surface Elo data.";
  const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable";
  const liveMatchStr  = (Array.isArray(liveMatches) && liveMatches.length)
    ? liveMatches.slice(0, 12).map(m =>
        `${m.raw?.home || "?"} vs ${m.raw?.away || "?"} -- ${m.raw?.round || "Tournament"} -- ${String(m.raw?.live || "0") === "1" ? "LIVE" : (m.raw?.status || "Scheduled")}`
      ).join("\n")
    : "No live matches currently";

  return `You are Under Review -- a sharp tennis betting intelligence tool.

TODAY: ${today}
IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.
FORMATTING: NEVER use markdown. Plain text only.

CRITICAL LIVE DATA RULE: If live match context or user provides current scores, accept them as ground truth. Never contradict live data with database assumptions.

RESPONSE FORMAT:
1. One sharp sentence answering the question.
2. Reasoning -- 2-4 sentences using Elo gaps, surface splits, form.
3. THE PLAY: * [Player] -- [specific bet] -- [key stat]
   TIMING: [when to act] | CONFIDENCE: [High/Medium/Speculative] | FADE: [who to avoid and why]

SURFACE ELO: hElo=hard | cElo=clay | gElo=grass | DR=dominance ratio (1.8+ elite) | Hold%=service hold (85% elite hard)
Gap 150+ pts = significant edge. Gap 300+ = lead with it.

CURRENT FACTS (April 2026):
Sinner won Australian Open 2026. Sinner won Miami Open 2026. Alcaraz is clay swing favorite.
Clay swing is active -- post-Miami, pre-Madrid. Clay specialists are underpriced right now.

CURRENT TOURNAMENT: ${tournamentCtx}
LIVE MATCHES: ${liveMatchStr}
PLAYER DATABASE: ${playerDataStr}
${matchupCtxStr ? "MATCHUP CONTEXT:\n" + matchupCtxStr + "\n\n" : ""}`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const {
    question, players, context, liveMatches, history,
    matchupContext, image, nflContext, nbaContext, mlbContext, golfContext, f1Context, sportHint,
  } = req.body;

  if (!question) return res.status(400).json({ error: "Missing question" });

  const sport = detectSport(question, sportHint, matchupContext);
  const matchupCtxStr = summarizeMatchupContext(matchupContext);
  let systemPrompt;

  if (sport === "f1") {
  systemPrompt = buildF1SystemPrompt(matchupCtxStr, { ...(f1Context || {}), question });
} else if (sport === "mlb") {
  systemPrompt = buildMlbSystemPrompt(mlbContext, matchupCtxStr);
} else if (sport === "golf") {
  systemPrompt = buildGolfSystemPrompt({ ...(golfContext || {}), question });
  } else if (sport === "nba") {
    systemPrompt = buildNbaSystemPrompt(nbaContext, matchupCtxStr);
  } else if (sport === "nfl") {
    systemPrompt = buildNflSystemPrompt(question, nflContext, matchupCtxStr);
  } else {
    // Tennis
    systemPrompt = buildTennisSystemPrompt(question, players, context, liveMatches, matchupCtxStr);
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
    messages.push({
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
        { type: "text", text: question },
      ],
    });
  } else {
    messages.push({ role: "user", content: question });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        temperature: 0.45,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Anthropic error:", data);
      return res.status(500).json({ error: "AI response failed", details: data });
    }

    let text = cleanResponseText(
      data?.content
        ? data.content.filter(i => i.type === "text").map(i => i.text).join("\n").trim()
        : ""
    );

    if (text && responseLooksWrongForSport(text, sport)) {
      const cr = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          temperature: 0.2,
          system: systemPrompt + `\n\nCORRECTION: Answer ONLY as a ${sport.toUpperCase()} analyst.`,
          messages,
        }),
      });
      if (cr.ok) {
        const cd = await cr.json();
        text = cleanResponseText(
          cd?.content ? cd.content.filter(i => i.type === "text").map(i => i.text).join("\n").trim() : ""
        );
      }
    }

    return res.status(200).json({ response: text || "Couldn't get a response. Try again." });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
