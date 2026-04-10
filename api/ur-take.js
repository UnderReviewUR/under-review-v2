export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const NFL_QBS = {
  "Josh Allen":       { team:"BUF", tier:"ELITE",    passing:{ gs:17, cmp:69.3, yds:3668, td:25, int:10, ypa:8.0,  rate:102.2, qbr:65.4 }, advanced:{ ontgt:79.9, badTh:13.0, prss:18.0, pktTime:2.5, iay_pa:7.3 }, trend:{ ontgt_delta:+5.1 }, rushing:{ attPg:6.6, ydsPg:34.1, tdPg:0.82, ypc:5.2, tier:"ELITE RUSHER" }, props:{ passYds:{ floor:215, ceil:310, lean:"OVER in shootouts" }, rushYds:{ floor:25, ceil:65, lean:"OVER most weeks" }, best:"Rushing yards OVER" }, futures:{ wins:"12-13", playoff:"95%+", mvp:"Top-5" }, note:"79.9% on-target plus elite rushing floor = safest QB1 in football." },
  "Drake Maye":       { team:"NE",  tier:"ELITE",    passing:{ gs:17, cmp:72.0, yds:4394, td:31, int:8,  ypa:8.9,  rate:113.5, qbr:77.1 }, advanced:{ ontgt:79.0, badTh:13.8, prss:21.8, pktTime:2.4, iay_pa:9.1 }, rushing:{ attPg:6.1, ydsPg:26.5, tdPg:0.24, ypc:4.4, tier:"STRONG RUSHER" }, props:{ passYds:{ floor:230, ceil:320, lean:"OVER" }, rushYds:{ floor:15, ceil:45, lean:"OVER — market underprices his legs" }, best:"Rushing yards OVER" }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"QBR 77.1 as a rookie is historically rare." },
  "Patrick Mahomes":  { team:"KC",  tier:"ELITE",    passing:{ gs:14, cmp:62.7, yds:3587, td:22, int:11, ypa:7.1,  rate:89.6,  qbr:68.5 }, advanced:{ ontgt:74.3, badTh:17.9, prss:24.0, pktTime:2.2, iay_pa:7.9 }, rushing:{ attPg:4.6, ydsPg:30.1, tdPg:0.36, ypc:6.6, tier:"ELITE RUSHER" }, props:{ rushYds:{ floor:18, ceil:45, lean:"OVER — 30.1 yds/g at 6.6 Y/att chronically ignored" }, best:"Rushing yards OVER." }, futures:{ wins:"11-13", playoff:"85%+", mvp:"Top-3" }, note:"30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football." },
  "Lamar Jackson":    { team:"BAL", tier:"ELITE",    passing:{ gs:13, cmp:63.6, yds:2549, td:21, int:7,  ypa:8.4,  rate:103.8, qbr:62.7 }, advanced:{ ontgt:72.4, badTh:18.3, prss:23.6, pktTime:2.5, iay_pa:8.8 }, trend:{ ontgt_delta:-6.3 }, rushing:{ attPg:5.2, ydsPg:26.8, tdPg:0.15, ypc:5.2, tier:"STRONG RUSHER" }, props:{ rushYds:{ floor:30, ceil:75, lean:"OVER every week" }, best:"Rushing yards OVER + TD scorer OVER" }, futures:{ wins:"11-13 healthy", playoff:"85%+", mvp:"Top-3 if healthy" }, note:"Rushing floor covers accuracy concerns. Health is the key variable." },
  "Joe Burrow":       { team:"CIN", tier:"ELITE",    passing:{ gs:8,  cmp:66.8, yds:1809, td:17, int:5,  ypa:7.0,  rate:100.7, qbr:63.0 }, advanced:{ ontgt:75.0, badTh:11.3, prss:21.7, pktTime:2.3, iay_pa:7.2 }, props:{ passTd:{ pg:2.13, lean:"OVER 1.5 when healthy" }, best:"TD OVER 1.5 when healthy" }, futures:{ wins:"11-13 healthy", playoff:"80%+" }, note:"80.3% on-target is the real Burrow." },
  "Matthew Stafford": { team:"LAR", tier:"ELITE",    passing:{ gs:17, cmp:65.0, yds:4707, td:46, int:8,  ypa:7.9,  rate:109.2, qbr:71.2 }, advanced:{ ontgt:73.6, badTh:18.1, prss:18.5, pktTime:2.4, iay_pa:9.0 }, props:{ passTd:{ pg:2.71, lean:"OVER 2.5" }, best:"Passing TDs OVER 2.5." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-3" }, note:"9.0 IAY/PA highest among all starters." },
  "Dak Prescott":     { team:"DAL", tier:"ELITE",    passing:{ gs:17, cmp:67.3, yds:4552, td:30, int:10, ypa:7.6,  rate:99.5,  qbr:70.2 }, advanced:{ ontgt:74.8, badTh:12.5, prss:21.6, pktTime:2.4, iay_pa:8.0 }, props:{ passTd:{ pg:1.76, lean:"OVER 1.5 reliably" }, best:"Lamb receiving props OVER." }, futures:{ wins:"9-11", playoff:"55-65%" }, note:"12.5% bad throw rate is cleanest among ELITE tier QBs." },
  "Jordan Love":      { team:"GB",  tier:"ELITE",    passing:{ gs:15, cmp:66.3, yds:3381, td:23, int:6,  ypa:7.7,  rate:101.2, qbr:72.7 }, advanced:{ ontgt:77.4, badTh:14.6, prss:22.1, pktTime:2.4, iay_pa:8.7 }, props:{ best:"Love is consistently undervalued." }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"Most underrated QB in football." },
  "Jared Goff":       { team:"DET", tier:"STARTER",  passing:{ gs:17, cmp:68.0, yds:4564, td:34, int:8,  ypa:7.9,  rate:105.5, qbr:57.3 }, advanced:{ ontgt:78.3, badTh:15.8, prss:24.5, pktTime:2.3, iay_pa:6.4 }, props:{ passTd:{ pg:2.0, lean:"OVER 1.5 every week" }, best:"Passing TDs OVER 1.5." }, futures:{ wins:"11-13", playoff:"80-85%" }, note:"TD prop (2.0/g) most reliable in NFC." },
  "Brock Purdy":      { team:"SF",  tier:"STARTER",  passing:{ gs:9,  cmp:69.4, yds:2167, td:20, int:10, ypa:7.6,  rate:100.5, qbr:72.8 }, advanced:{ ontgt:82.2, badTh:12.3, prss:21.1, pktTime:2.7, iay_pa:7.5 }, props:{ passTd:{ pg:2.22, lean:"OVER 2.0 when healthy" }, best:"Purdy TD OVER 2.0 when healthy." }, futures:{ wins:"10-12", playoff:"70-80% healthy" }, note:"82.2% on-target highest among all starters." },
  "Jalen Hurts":      { team:"PHI", tier:"STARTER",  passing:{ gs:16, cmp:64.8, yds:3224, td:25, int:6,  ypa:7.1,  rate:98.5,  qbr:55.2 }, advanced:{ ontgt:74.0, badTh:16.7, prss:20.0, pktTime:2.5, iay_pa:9.0 }, rushing:{ attPg:6.6, ydsPg:26.3, tdPg:0.50, tier:"STRONG RUSHER" }, props:{ rushYds:{ lean:"OVER every week" }, best:"Rushing yards OVER. Floor guaranteed." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-5" }, note:"Rushing floor (designed runs 6.6/g) covers any passing variance." },
  "C.J. Stroud":      { team:"HOU", tier:"STARTER",  passing:{ gs:14, cmp:64.5, yds:3041, td:19, int:8,  ypa:7.2,  rate:92.9,  qbr:61.7 }, advanced:{ ontgt:74.6, badTh:17.6, prss:21.4, pktTime:2.4, iay_pa:7.9 }, props:{ best:"Collins receiving props OVER" }, futures:{ wins:"10-12", playoff:"75-85%" }, note:"Year 3 with healthy weapons projects top-8 QB." },
  "Trevor Lawrence":  { team:"JAX", tier:"STARTER",  passing:{ gs:17, cmp:60.9, yds:4007, td:29, int:12, ypa:7.2,  rate:91.0,  qbr:58.3 }, advanced:{ ontgt:73.7, badTh:14.4, prss:21.8, pktTime:2.4, iay_pa:8.7 }, rushing:{ attPg:4.8, ydsPg:21.1, tdPg:0.53, tier:"STRONG RUSHER" }, props:{ best:"Total TDs OVER — rushing TDs (0.53/g) + passing TDs." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"Total TD prop is the most underrated bet on his slate." },
  "Jayden Daniels":   { team:"WAS", tier:"STARTER",  passing:{ gs:7,  cmp:60.6, yds:1262, td:8,  int:3,  ypa:6.7,  rate:88.1,  qbr:44.7 }, advanced:{ ontgt:76.4, badTh:14.9, prss:16.7, pktTime:2.3, iay_pa:7.2 }, rushing:{ attPg:8.3, ydsPg:39.7, tdPg:0.29, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER — 39.7 yds/g pace is best in NFC" }, best:"Rushing yards OVER when healthy." }, futures:{ wins:"9-11", playoff:"50-60%" }, note:"Health is the only real question." },
  "Caleb Williams":   { team:"CHI", tier:"STARTER",  passing:{ gs:17, cmp:58.1, yds:3942, td:27, int:7,  ypa:6.9,  rate:90.1,  qbr:58.2 }, advanced:{ ontgt:69.8, badTh:20.7, prss:25.1, pktTime:2.5, iay_pa:8.5 }, rushing:{ attPg:4.5, ydsPg:22.8, tier:"STRONG RUSHER" }, props:{ best:"Bears team total OVER." }, futures:{ wins:"10-12", playoff:"60-70%" }, note:"Year 2 with better cast is the buy." },
  "Bo Nix":           { team:"DEN", tier:"STARTER",  passing:{ gs:17, cmp:63.4, yds:3931, td:25, int:11, ypa:6.4,  rate:87.8,  qbr:58.3 }, advanced:{ ontgt:77.4, badTh:15.9, prss:19.1, pktTime:2.4, iay_pa:7.3 }, rushing:{ attPg:4.9, ydsPg:20.9, tier:"STRONG RUSHER" }, props:{ best:"Broncos team total UNDER vs elite offenses. Nix rushing OVER." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"RPO scheme is where Denver generates offense." },
  "Baker Mayfield":   { team:"TB",  tier:"STARTER",  passing:{ gs:17, cmp:63.2, yds:3693, td:26, int:11, ypa:6.8,  rate:90.6,  qbr:61.3 }, advanced:{ ontgt:73.7, badTh:15.7, prss:14.8, pktTime:2.3, iay_pa:8.0 }, rushing:{ attPg:3.2, ydsPg:22.5, ypc:6.9, tier:"STRONG RUSHER" }, props:{ best:"Evans TD scorer OVER. Mayfield rushing yards OVER." }, futures:{ wins:"8-10", playoff:"50-60%" }, note:"Lowest pressure rate among starters (14.8%)." },
  "Kyler Murray":     { team:"MIN", tier:"STARTER",  passing:{ gs:5,  cmp:68.3, yds:962,  td:6,  int:3 }, rushing:{ attPg:5.8, ydsPg:34.6, ypc:6.0, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER when healthy" }, best:"Vikings team total OVER when Murray healthy." }, futures:{ wins:"10-13 healthy", playoff:"70-80% healthy" }, note:"O'Connell scheme + Jefferson is generational. Health is the only ceiling." },
  "Jaxson Dart":      { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12, cmp:63.7, yds:2272, td:15, int:5,  ypa:6.7,  rate:91.7,  qbr:57.5 }, advanced:{ ontgt:72.9, badTh:15.5, prss:23.3, pktTime:2.4, iay_pa:8.1 }, rushing:{ attPg:6.1, ydsPg:34.8, tdPg:0.64, ypc:5.7, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER — market ignores 34.8 yds/g" }, best:"Rushing yards OVER every week." }, futures:{ wins:"7-9", playoff:"30-40%" }, note:"34.8 rushing yds/g is the best prop edge in the NFC." },
  "Sam Darnold":      { team:"SEA", tier:"STARTER",  passing:{ gs:17, cmp:67.7, yds:4048, td:25, int:14, ypa:8.5,  rate:99.1,  qbr:55.6 }, advanced:{ ontgt:79.8, badTh:14.6, prss:21.0, pktTime:2.4, iay_pa:7.8 }, props:{ best:"Darnold INT OVER 0.5 every week." }, futures:{ wins:"7-10", playoff:"40-50%" }, note:"Numbers were O'Connell scheme and Jefferson. Regression is the base case." },
  "Shedeur Sanders":  { team:"TEN", tier:"ROOKIE",   passing:{ gs:0 }, props:{ best:"Fade Titans early-season totals." }, futures:{ wins:"5-7", playoff:"10-15%" }, note:"Most NFL-ready QB in 2026 class. Titans supporting cast is bottom-5." },
  "Cam Ward":         { team:"TEN", tier:"BELOW_AVG", passing:{ gs:17, cmp:59.8, yds:3169, td:15, int:7,  ypa:5.9,  rate:80.2,  qbr:33.2 }, advanced:{ ontgt:72.6, badTh:19.0, prss:27.8, pktTime:2.4, iay_pa:7.2 }, props:{ best:"Titans team total UNDER regardless of QB." }, futures:{ wins:"5-8", playoff:"10-15%" }, note:"Titans situation is a mess. Sanders drafted #1." },
};

function detectSport(question, sportHint, matchupContext) {
  const q = String(question || "").toLowerCase();
  if (["nfl","tennis","f1","nba","mlb","golf"].includes(sportHint)) return sportHint;

  const mcLeague = String((matchupContext && matchupContext.league) || "").toLowerCase();
  if (mcLeague.includes("nfl")) return "nfl";
  if (mcLeague.includes("atp") || mcLeague.includes("wta") || mcLeague.includes("tennis")) return "tennis";
  if (mcLeague.includes("nba")) return "nba";
  if (mcLeague.includes("mlb")) return "mlb";
  if (mcLeague.includes("f1") || mcLeague.includes("grand prix")) return "f1";

  const explicitTennis = ["tennis","atp ","wta ","atp tour","wta tour","roland garros","french open","wimbledon","us open","australian open","indian wells","miami open","madrid open","rome open","queen's club","halle open","monte carlo","monte-carlo","barcelona open","double fault","double faults","ace count","ace rate","service game","break point","tiebreak","clay court","grass court","hard court","surface elo","hold percentage","dominance ratio","ruud","cobolli","hurkacz","vacherot","alcaraz","sinner","djokovic","zverev","medvedev","tsitsipas","rublev","fritz","de minaur","draper","shelton","mensik","fils","lehecka","cerundolo","sabalenka","swiatek","rybakina","gauff","pegula","keys","osaka","andreeva","paolini","kartal","zheng","muchova"];
  for (let i = 0; i < explicitTennis.length; i++) if (q.includes(explicitTennis[i])) return "tennis";

  if (q.includes("nfl")) return "nfl";

  const explicitF1 = ["formula 1","formula one","f1 race","f1 season","grand prix","verstappen","antonelli","george russell","oscar piastri","ferrari f1","mclaren f1","red bull f1","mercedes f1","pit stop","drs","qualifying f1","constructor championship","driver championship","f1 driver","f1 team","miami grand prix","canadian grand prix","monaco grand prix","monaco gp","suzuka","silverstone f1","monza f1","spa f1"];
  for (let i = 0; i < explicitF1.length; i++) if (q.includes(explicitF1[i])) return "f1";

  const explicitNba = ["nba","basketball","lakers","celtics","warriors","nuggets","bucks","heat","thunder","knicks","sixers","nets","bulls","cavaliers","clippers","suns","mavericks","grizzlies","pelicans","jazz","kings","trail blazers","blazers","rockets","spurs","raptors","magic","pacers","hawks","hornets","pistons","timberwolves","jokic","gilgeous-alexander","shai","doncic","tatum","giannis","wembanyama","brunson","steph curry","stephen curry","kevin durant","devin booker","ja morant","anthony edwards","karl-anthony","tyrese haliburton","donovan mitchell","bam adebayo","lebron","lamelo","damian lillard","trae young","kyrie","anthony davis","rudy gobert","jaren jackson","desmond bane","lauri markkanen","cade cunningham","paolo banchero","scottie barnes","franz wagner","alperen sengun","jaylen brown","mikal bridges","og anunoby","josh hart","evan mobley","jamal murray","anfernee simons","zach lavine","jordan poole","draymond","3 pointer","3-pointer","three pointer","3pm","threes made","pra","pra over","pra under","points prop","rebounds prop","assists prop","nba prop","nba props","player prop","prop bet","prop line","prop pick","game total","points over","points under","rebounds over","assists over","double double","triple double","usage rate","usage spike","minutes prop","steal prop","block prop","fantasy basketball","nba future","nba bet","nba pick","nba parlay","nba playoff","nba finals","nba champion","nba mvp","box score","field goal","free throw","three point","paint points","fast break","half court","second half","first half nba"];
  for (let i = 0; i < explicitNba.length; i++) if (q.includes(explicitNba[i])) return "nba";


  const explicitGolf = ["pga","pga tour","golf","golfer","birdie","bogey","eagle","par 3","par 4","par 5","fairway","green in regulation","driving distance","strokes gained","sg total","sg putting","sg approach","caddy","major championship","the masters","us open golf","the open championship","ryder cup","lpga","augusta","pebble beach","tpc sawgrass","pinehurst","torrey pines","muirfield","riviera country club","memorial tournament","genesis invitational","players championship","make cut","miss cut","top 10 finish","top 20 finish","frl golf","first round leader","scheffler","rory mcilroy","xander schauffele","collin morikawa","viktor hovland","patrick cantlay","wyndham clark","tony finau","sam burns","sungjae im","tommy fleetwood","cameron smith","tyrrell hatton","shane lowry","hideki matsuyama","justin thomas","jordan spieth","rickie fowler","keegan bradley","adam scott","cameron young","tom kim","ludvig aberg","robert macintyre","sahith theegala","nick taylor","matt fitzpatrick","dustin johnson","brooks koepka","bryson dechambeau","phil mickelson","akshay bhatia","sepp straka","brian harman","justin rose"];
  for (let i = 0; i < explicitGolf.length; i++) if (q.includes(explicitGolf[i])) return "golf";

  const explicitMlb = ["mlb","baseball","world series","home run","strikeout","batting average","era ","whip ","starting pitcher","bullpen","slugging","ops ","woba","fip ","park factor","stolen base","no-hitter","spring training","american league","national league","dodgers","yankees","red sox","cubs","mets","braves","astros","padres","phillies","giants","cardinals","brewers","mariners","rangers","twins","guardians","orioles","blue jays","rays","white sox","tigers","royals","athletics","angels","rockies","diamondbacks","reds","pirates","marlins","nationals","statcast","exit velocity","launch angle","spin rate","barrel","hard hit","ohtani","trout","judge","acuna","trea turner","francisco lindor","mookie betts","freddie freeman","pete alonso","corbin carroll","gunnar henderson","corey seager","bryce harper","jose ramirez","julio rodriguez","shohei"];
  for (let i = 0; i < explicitMlb.length; i++) if (q.includes(explicitMlb[i])) return "mlb";

  const nflSignals = ["quarterback","qb ","touchdown","touchdowns","interception","passing yards","rushing yards","receiving yards","fantasy football","super bowl","afc ","nfc ","wide receiver","running back","tight end","red zone","blitz","pocket","play action","offense","defense","defensive","offensive","cornerback","linebacker","pass rush","edge rusher","sacks","sack rate","draft pick","draft class","first round","win total","team total","season total","game script","skill position","divisional","bills","patriots","dolphins","jets","ravens","bengals","browns","steelers","texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos","cowboys","giants","eagles","commanders","bears","lions","packers","vikings","falcons","panthers","saints","buccaneers","cardinals","rams","49ers","seahawks","mahomes","lamar","burrow","hurts","prescott","stroud","stafford","purdy","goff","daniels","cook","henry","taylor","robinson","achane","nacua","chase","pickens","lamb","mcbride","bowers","kelce","warren","draft","rookie","rookies"];
  const tennisSignals = ["alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton","fritz","sabalenka","swiatek","rybakina","pegula","gauff","muchova","osaka","keys","draper","fils","ruud","rublev","paolini","andreeva","kartal","zheng","mensik","bublik","tien","lehecka","cerundolo","cobolli","hurkacz","vacherot","surface elo","dominance ratio","hold percentage","tiebreak","double faults","double fault","ace rate","ace count","break point","clay court","grass court","hard court","draw path","monte carlo","clay swing","clay specialist","serve technique","second serve","first serve"];
  const nbaSignals = ["points per game","rebounds per game","assists per game","per game","scorer","shooting","field goal percentage","three point percentage","playoff basketball","conference finals","nba season"];

  let nfl = 0, ten = 0, nba = 0;
  for (let i = 0; i < nflSignals.length; i++) if (q.includes(nflSignals[i])) nfl += nflSignals[i].length > 7 ? 3 : nflSignals[i].length > 4 ? 2 : 1;
  for (let i = 0; i < tennisSignals.length; i++) if (q.includes(tennisSignals[i])) ten += tennisSignals[i].length > 7 ? 3 : tennisSignals[i].length > 4 ? 2 : 1;
  for (let i = 0; i < nbaSignals.length; i++) if (q.includes(nbaSignals[i])) nba += 3;

  if (nba > nfl && nba > ten) return "nba";
  if (ten > nfl) return "tennis";
  if (nfl > ten) return "nfl";
  if (nfl === 0 && ten === 0) {
    if (q.includes("prop") || q.includes("bet") || q.includes("pick") || q.includes("parlay")) return "nba";
  }
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
    const lower = block.toLowerCase();
    const firstLine = lower.split("\n")[0] || "";
    const tokens = firstLine.split("|").map(s => s.trim());
    return tokens.some(token => token && token.length > 2 && q.includes(token));
  });
  if (matched.length > 0) return matched.slice(0, 10).join("\n\n");
  const generic = ["running back","wide receiver","tight end","touchdown","receiving","rushing","catches","yards","prop"];
  if (generic.some(n => q.includes(n))) return blocks.slice(0, 20).join("\n\n");
  return blocks.slice(0, 10).join("\n\n");
}

function summarizeMatchupContext(mc) {
  if (!mc) return null;
  const parts = [];
  if (mc.title) parts.push("Title: " + mc.title);
  if (mc.league) parts.push("League: " + mc.league);
  if (mc.time) parts.push("Time: " + mc.time);
  if (mc.whatMatters) parts.push("What matters: " + mc.whatMatters);
  if (Array.isArray(mc.quickHitters) && mc.quickHitters.length) parts.push("Quick hitters: " + mc.quickHitters.join(" | "));
  return parts.join("\n");
}

function cleanResponseText(text) {
  return String(text || "")
    .replace(/^i['']?m ur take.*$/gim, "").replace(/^ur take[:-]\s*/gim, "")
    .replace(/^i am an nfl.*$/gim, "").replace(/^i don['']?t have tennis data.*$/gim, "")
    .replace(/^i don['']?t cover tennis.*$/gim, "").replace(/^i only cover nfl.*$/gim, "")
    .replace(/^i['']?m built for nfl betting only.*$/gim, "").replace(/^wrong sport[^\n]*/gim, "")
    .replace(/^i cover nfl[^\n]*/gim, "").replace(/^that['']?s not my area[^\n]*/gim, "")
    .replace(/^i don['']?t cover (nba|basketball)[^\n]*/gim, "")
    .replace(/^if you['']?re asking (nba|basketball)[^\n]*/gim, "")
    .replace(/^without live data[^\n]*/gim, "")
    .replace(/^without (access to |real-?time |current )[^\n]*/gim, "")
    .replace(/^i don['']?t have (access to |real-?time |live |current )[^\n]*/gim, "")
    .replace(/^as of my (knowledge |training )?cutoff[^\n]*/gim, "")
    .replace(/^i can['']?t give you a sharp answer[^\n]*/gim, "")
    .replace(/^i can['']?t (give|provide) a (sharp|specific|direct)[^\n]*/gim, "")
    .replace(/^the (race )?schedule isn['']?t loaded[^\n]*/gim, "")
    .replace(/^i don['']?t know which (race|circuit|grand prix)[^\n]*/gim, "")
    .trim();
}

function responseLooksWrongForSport(text, sport) {
  const t = String(text || "").toLowerCase();
  if (sport === "tennis") return t.includes("i don't cover tennis") || t.includes("built for nfl betting only") || t.includes("i only cover nfl") || (t.includes("quarterback") && !t.includes("tennis"));
  if (sport === "nfl") return t.includes("i don't cover nfl") || (t.includes("grand slam") && !t.includes("super bowl"));
  return false;
}

function buildNbaInjuryContext(ctx) {
  const injuries = Array.isArray(ctx?.injuries) ? ctx.injuries : [];
  if (!injuries.length) return "No current injury feed loaded.";
  return injuries.slice(0, 80).map(i => `${i.player} (${i.team}) — ${i.status || "Status unknown"}${i.detail ? ` — ${i.detail}` : ""}`).join("\n");
}

function buildNbaCurrentRosterContext(ctx) {
  const playerStats = Array.isArray(ctx?.playerStats) ? ctx.playerStats : [];
  if (!playerStats.length) return "No current roster/team feed loaded.";
  return playerStats.slice(0, 120).map(p => `${p.name} (${p.team}) — ${p.pts} pts / ${p.reb} reb / ${p.ast} ast`).join("\n");
}

var F1_FALLBACK_CALENDAR = [
  { meeting_name:"Australian Grand Prix",   location:"Melbourne",  date_start:"2026-03-06T00:00:00", date_end:"2026-03-08T23:59:00", completed:true,  winner:"Russell" },
  { meeting_name:"Chinese Grand Prix",      location:"Shanghai",   date_start:"2026-03-13T00:00:00", date_end:"2026-03-15T23:59:00", completed:true,  winner:"Antonelli" },
  { meeting_name:"Japanese Grand Prix",     location:"Suzuka",     date_start:"2026-03-27T00:00:00", date_end:"2026-03-29T23:59:00", completed:true,  winner:"Antonelli" },
  { meeting_name:"Miami Grand Prix",        location:"Miami",      date_start:"2026-05-01T00:00:00", date_end:"2026-05-03T23:59:00", completed:false, winner:null },
  { meeting_name:"Canadian Grand Prix",     location:"Montreal",   date_start:"2026-05-22T00:00:00", date_end:"2026-05-24T23:59:00", completed:false, winner:null },
  { meeting_name:"Monaco Grand Prix",       location:"Monaco",     date_start:"2026-06-05T00:00:00", date_end:"2026-06-07T23:59:00", completed:false, winner:null },
  { meeting_name:"Spanish Grand Prix",      location:"Barcelona",  date_start:"2026-06-12T00:00:00", date_end:"2026-06-14T23:59:00", completed:false, winner:null },
  { meeting_name:"Austrian Grand Prix",     location:"Spielberg",  date_start:"2026-06-26T00:00:00", date_end:"2026-06-28T23:59:00", completed:false, winner:null },
  { meeting_name:"British Grand Prix",      location:"Silverstone",date_start:"2026-07-03T00:00:00", date_end:"2026-07-05T23:59:00", completed:false, winner:null },
  { meeting_name:"Belgian Grand Prix",      location:"Spa",        date_start:"2026-07-17T00:00:00", date_end:"2026-07-19T23:59:00", completed:false, winner:null },
  { meeting_name:"Hungarian Grand Prix",    location:"Budapest",   date_start:"2026-07-24T00:00:00", date_end:"2026-07-26T23:59:00", completed:false, winner:null },
  { meeting_name:"Dutch Grand Prix",        location:"Zandvoort",  date_start:"2026-08-21T00:00:00", date_end:"2026-08-23T23:59:00", completed:false, winner:null },
  { meeting_name:"Italian Grand Prix",      location:"Monza",      date_start:"2026-09-04T00:00:00", date_end:"2026-09-06T23:59:00", completed:false, winner:null },
  { meeting_name:"Spanish Grand Prix (2)",  location:"Madrid",     date_start:"2026-09-11T00:00:00", date_end:"2026-09-13T23:59:00", completed:false, winner:null },
  { meeting_name:"Azerbaijan Grand Prix",   location:"Baku",       date_start:"2026-09-24T00:00:00", date_end:"2026-09-26T23:59:00", completed:false, winner:null },
  { meeting_name:"Singapore Grand Prix",    location:"Singapore",  date_start:"2026-10-09T00:00:00", date_end:"2026-10-11T23:59:00", completed:false, winner:null },
  { meeting_name:"United States Grand Prix",location:"Austin",     date_start:"2026-10-23T00:00:00", date_end:"2026-10-25T23:59:00", completed:false, winner:null },
  { meeting_name:"Mexico City Grand Prix",  location:"Mexico City",date_start:"2026-10-30T00:00:00", date_end:"2026-11-01T23:59:00", completed:false, winner:null },
  { meeting_name:"Sao Paulo Grand Prix",    location:"Sao Paulo",  date_start:"2026-11-06T00:00:00", date_end:"2026-11-08T23:59:00", completed:false, winner:null },
  { meeting_name:"Las Vegas Grand Prix",    location:"Las Vegas",  date_start:"2026-11-19T00:00:00", date_end:"2026-11-21T23:59:00", completed:false, winner:null },
  { meeting_name:"Qatar Grand Prix",        location:"Lusail",     date_start:"2026-11-27T00:00:00", date_end:"2026-11-29T23:59:00", completed:false, winner:null },
  { meeting_name:"Abu Dhabi Grand Prix",    location:"Abu Dhabi",  date_start:"2026-12-04T00:00:00", date_end:"2026-12-06T23:59:00", completed:false, winner:null },
];

var F1_FALLBACK_STANDINGS = [
  { position:1,  full_name:"Kimi Antonelli",   team_name:"Mercedes",     points:62, driver_number:12 },
  { position:2,  full_name:"George Russell",   team_name:"Mercedes",     points:43, driver_number:63 },
  { position:3,  full_name:"Charles Leclerc",  team_name:"Ferrari",      points:30, driver_number:16 },
  { position:4,  full_name:"Oscar Piastri",    team_name:"McLaren",      points:18, driver_number:81 },
  { position:5,  full_name:"Lewis Hamilton",   team_name:"Ferrari",      points:15, driver_number:44 },
  { position:6,  full_name:"Lando Norris",     team_name:"McLaren",      points:12, driver_number:4  },
  { position:7,  full_name:"Max Verstappen",   team_name:"Red Bull",     points:8,  driver_number:1  },
  { position:8,  full_name:"Carlos Sainz",     team_name:"Williams",     points:6,  driver_number:55 },
  { position:9,  full_name:"Fernando Alonso",  team_name:"Aston Martin", points:4,  driver_number:14 },
  { position:10, full_name:"Isack Hadjar",     team_name:"Red Bull",     points:4,  driver_number:6  },
  { position:11, full_name:"Alexander Albon",  team_name:"Williams",     points:2,  driver_number:23 },
  { position:12, full_name:"Pierre Gasly",     team_name:"Alpine",       points:1,  driver_number:10 },
  { position:13, full_name:"Liam Lawson",      team_name:"Racing Bulls", points:0,  driver_number:30 },
  { position:14, full_name:"Arvid Lindblad",   team_name:"Racing Bulls", points:0,  driver_number:8  },
  { position:15, full_name:"Lance Stroll",     team_name:"Aston Martin", points:0,  driver_number:18 },
  { position:16, full_name:"Franco Colapinto", team_name:"Alpine",       points:0,  driver_number:43 },
  { position:17, full_name:"Nico Hulkenberg",  team_name:"Audi",         points:0,  driver_number:27 },
  { position:18, full_name:"Gabriel Bortoleto",team_name:"Audi",         points:0,  driver_number:5  },
  { position:19, full_name:"Oliver Bearman",   team_name:"Haas",         points:0,  driver_number:87 },
  { position:20, full_name:"Esteban Ocon",     team_name:"Haas",         points:0,  driver_number:31 },
  { position:21, full_name:"Valtteri Bottas",  team_name:"Cadillac",     points:0,  driver_number:77 },
  { position:22, full_name:"Sergio Perez",     team_name:"Cadillac",     points:0,  driver_number:11 },
];

function fetchF1LiveData() {
  var now = new Date();
  var upcoming = F1_FALLBACK_CALENDAR.filter(m => new Date(m.date_start) > now);
  var active   = F1_FALLBACK_CALENDAR.filter(m => new Date(m.date_start) <= now && now <= new Date(m.date_end));
  var past     = F1_FALLBACK_CALENDAR.filter(m => new Date(m.date_end) < now);
  return { schedule:{ upcoming, current:active, past, races:F1_FALLBACK_CALENDAR }, standings:F1_FALLBACK_STANDINGS, session:null };
}

function buildF1SystemPrompt(liveData, matchupCtxStr) {
  var STREET_CIRCUITS = ["monaco","baku","singapore","las vegas","miami","azerbaijan","jeddah"];
  var POWER_CIRCUITS  = ["monza","spa","silverstone","interlagos","baku"];
  var HIGH_DOWNFORCE  = ["hungary","hungaroring","singapore","barcelona","catalunya"];
  var now = new Date();
  var todayStr = now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var standingsStr = "Championship standings not loaded.";
  var nextRaceLine = "NEXT RACE: Not yet determined.";
  var nextRaceName = "the next race";
  var upcomingStr = "";
  var recentStr = "";
  var circuitType = "mixed";
  var circuitNote = "Championship form is the primary signal.";
  var daysUntil = null;
  var isRaceWeek = false;
  var sessionStr = "";

  if (liveData) {
    if (Array.isArray(liveData.standings) && liveData.standings.length) {
      standingsStr = liveData.standings.slice(0,10).map((d,i) => `${d.position||i+1}. ${d.full_name||"Driver"} (${d.team_name||""}) — ${d.points||0} pts`).join("\n");
    }
    var schedule = liveData.schedule || {};
    var allRaces = Array.isArray(schedule.races) ? schedule.races : [];
    var upcoming = Array.isArray(schedule.upcoming) ? schedule.upcoming : [];
    var current  = Array.isArray(schedule.current)  ? schedule.current  : [];
    var completed = allRaces.filter(r => r.completed && r.winner);
    if (completed.length) recentStr = "RECENT RESULTS:\n" + completed.slice(-3).reverse().map(r => `${r.meeting_name}: Winner — ${r.winner}`).join("\n");

    var activeRace = current[0] || upcoming[0] || null;
    if (activeRace) {
      nextRaceName = activeRace.meeting_name || "Next Grand Prix";
      var loc = activeRace.location || "TBD";
      var dateStr = "TBD";
      if (activeRace.date_start) {
        var rd = new Date(activeRace.date_start);
        dateStr = rd.toLocaleDateString("en-US",{month:"short",day:"numeric"});
        daysUntil = Math.ceil((rd - now) / (1000*60*60*24));
      }
      nextRaceLine = (current.length > 0 ? "ACTIVE RACE WEEKEND: " : "NEXT RACE: ") + nextRaceName + " — " + loc + " (" + dateStr + ")" + (daysUntil !== null ? " — " + daysUntil + " days away" : "");
      isRaceWeek = current.length > 0 || (daysUntil !== null && daysUntil <= 7);
      var venueLower = (loc + " " + nextRaceName).toLowerCase();
      if (STREET_CIRCUITS.some(c => venueLower.includes(c))) { circuitType = "STREET CIRCUIT"; circuitNote = "Qualifying position is critical. Safety car near-certain. Antonelli pole-to-win is the primary play."; }
      else if (POWER_CIRCUITS.some(c => venueLower.includes(c))) { circuitType = "POWER CIRCUIT"; circuitNote = "Engine advantage decisive. Mercedes PU edge at maximum. Antonelli and Russell primary plays."; }
      else if (HIGH_DOWNFORCE.some(c => venueLower.includes(c))) { circuitType = "HIGH DOWNFORCE"; circuitNote = "Aero efficiency decides. Ferrari competitive — Leclerc becomes live race winner."; }
    }
    if (upcoming.length) upcomingStr = upcoming.slice(0,5).map(m => `${m.meeting_name||"Race"} — ${m.location||"TBD"} (${m.date_start ? new Date(m.date_start).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "TBD"})`).join("\n");
    var sess = liveData.session;
    if (sess && sess.session_name) sessionStr = "LATEST SESSION: " + sess.session_name + " — " + (sess.meeting_name||"");
  }

  var weekContext = isRaceWeek ? "RACE WEEK — " + nextRaceName + " is this weekend. Focus: circuit edges, qualifying vs race pace, podium props." : "OFF WEEK — Best window for futures. Focus: championship outright value, upcoming circuit edges.";
  var prompt = "You are Under Review — a sharp F1 betting intelligence tool.\n\nIDENTITY: Sharp F1 analyst. Lead with the take. Never hedge. Never open with a limitation.\n\n";
  prompt += "CRITICAL RULES:\n1. ALWAYS lead with the lean.\n2. Antonelli has won 2 of 3 races.\n3. Name the NEXT race correctly.\n4. Always state circuit type and betting angle.\n\n";
  prompt += "RESPONSE FORMAT:\nOne sharp opening sentence. Then:\nTHE BET:\n• [Driver] — [market] — [key reason]\nFADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n";
  prompt += "THE COMPLETE 2026 GRID — USE ONLY THESE 22 DRIVERS:\n1. Kimi Antonelli (Mercedes)\n2. George Russell (Mercedes)\n3. Charles Leclerc (Ferrari)\n4. Lewis Hamilton (Ferrari)\n5. Lando Norris (McLaren)\n6. Oscar Piastri (McLaren)\n7. Max Verstappen (Red Bull)\n8. Isack Hadjar (Red Bull)\n9. Carlos Sainz (Williams)\n10. Alexander Albon (Williams)\n11. Fernando Alonso (Aston Martin)\n12. Lance Stroll (Aston Martin)\n13. Pierre Gasly (Alpine)\n14. Franco Colapinto (Alpine)\n15. Nico Hulkenberg (Audi)\n16. Gabriel Bortoleto (Audi)\n17. Oliver Bearman (Haas)\n18. Esteban Ocon (Haas)\n19. Liam Lawson (Racing Bulls)\n20. Arvid Lindblad (Racing Bulls)\n21. Valtteri Bottas (Cadillac)\n22. Sergio Perez (Cadillac)\nCRITICAL: Yuki Tsunoda is NOT on the 2026 grid. Kevin Magnussen is NOT on the grid.\n\n";
  prompt += "2026 POWER UNIT ORDER:\n1. Mercedes (best PU, 4 of 6 podiums in first 3 races)\n2. Ferrari (closes gap at high-downforce circuits)\n3. McLaren (competitive but overpriced on 2025 reputation)\n4. Red Bull (Honda PU deficit — zero podiums in first 3 races)\n\n";
  prompt += "TODAY: " + todayStr + "\n" + weekContext + "\n\n";
  prompt += nextRaceLine + "\nCIRCUIT TYPE: " + circuitType + "\nBETTING NOTE: " + circuitNote + "\n\n";
  if (recentStr) prompt += recentStr + "\n\n";
  prompt += "CHAMPIONSHIP STANDINGS (after 3 rounds)\n" + standingsStr + "\n\n";
  if (upcomingStr) prompt += "UPCOMING RACES\n" + upcomingStr + "\n\n";
  if (sessionStr)  prompt += sessionStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";
  return prompt;
}

function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
  var ctx = nbaContext || {};
  var now = new Date();
  var todayStr = now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var phase = (ctx.seasonContext && ctx.seasonContext.phase) || "NBA Season Active";

  var gamesList = ctx.todaysGames || [];
  var gamesStr = "No games on today's schedule.";
  if (gamesList.length > 0) {
    gamesStr = gamesList.map(g => {
      var away = (g.awayTeam && (g.awayTeam.tricode||g.awayTeam.abbr||g.awayTeam.name)) || "AWAY";
      var home = (g.homeTeam && (g.homeTeam.tricode||g.homeTeam.abbr||g.homeTeam.name)) || "HOME";
      var code = g.statusCode;
      var awayS = (g.awayTeam && g.awayTeam.score) != null ? g.awayTeam.score : "";
      var homeS = (g.homeTeam && g.homeTeam.score) != null ? g.homeTeam.score : "";
      if (code === 3) return away + " " + awayS + " @ " + home + " " + homeS + " — FINAL";
      if (code === 2) return away + " " + awayS + " @ " + home + " " + homeS + " — LIVE";
      return away + " @ " + home + " — " + (g.status || "Scheduled");
    }).join("\n");
  }

  var totalsStr = "";
  var gameTotals = ctx.gameTotals || {};
  if (Object.keys(gameTotals).length) {
    var tLines = [];
    for (var gk in gameTotals) {
      var t = gameTotals[gk];
      tLines.push(gk + ": " + (t.total != null ? t.total : "Unposted") + (t.pace === "HIGH" ? " — HIGH PACE" : t.pace === "LOW" ? " — LOW PACE" : ""));
    }
    totalsStr = tLines.join("\n");
  }

  var propLinesStr = "";
  var propLines = ctx.propLines || [];
  var hasProps = propLines.length > 0;
  if (hasProps) {
    var grouped = {};
    for (var li = 0; li < propLines.length; li++) {
      var pl = propLines[li];
      var pkey = pl.player + "|" + pl.prop + "|" + pl.game;
      if (!grouped[pkey]) grouped[pkey] = { player:pl.player, prop:pl.prop, game:pl.game, over:null, under:null };
      if (pl.side === "Over")  grouped[pkey].over  = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
      if (pl.side === "Under") grouped[pkey].under = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
    }
    propLinesStr = Object.values(grouped).slice(0,100).map(e => {
      var sides = e.over ? "OVER " + e.over : "";
      if (e.under) sides += (sides ? " / UNDER " : "UNDER ") + e.under;
      return e.player + " — " + String(e.prop||"").toUpperCase() + " — " + sides + " [" + e.game + "]";
    }).join("\n");
  }

  var seasonAvgsStr = "";
  var playerStats = ctx.playerStats || [];
  var hasStats = playerStats.length > 0;
  if (hasStats) {
    seasonAvgsStr = playerStats.slice(0,120).map(p => {
      var pra = ((parseFloat(p.pts)||0) + (parseFloat(p.reb)||0) + (parseFloat(p.ast)||0)).toFixed(1);
      return p.name + " (" + p.team + "): " + p.pts + "pts/" + p.reb + "reb/" + p.ast + "ast | PRA " + pra;
    }).join("\n");
  }

  var recentFormStr = ctx.recentForm || "";
  var injuryStr = buildNbaInjuryContext(ctx);
  var currentRosterStr = buildNbaCurrentRosterContext(ctx);
  var hasInjuries = Array.isArray(ctx.injuries) && ctx.injuries.length > 0;
  var hasReliableCurrentContext = hasStats || hasInjuries;

  var playerDbStr = "";
  if (ctx.playerDb && Object.keys(ctx.playerDb).length > 0) {
    var q = (ctx.question || "").toLowerCase();
    var entries = Object.entries(ctx.playerDb);
    var propSet = new Set(propLines.map(p => p.player && p.player.toLowerCase()).filter(Boolean));
    var mentioned = entries.filter(e => { var ln = e[0].toLowerCase().split(" ").pop(); return q.includes(e[0].toLowerCase()) || q.includes(ln); });
    var playing   = entries.filter(e => { var n = e[0].toLowerCase(), ln = n.split(" ").pop(); return !q.includes(n) && !q.includes(ln) && (propSet.has(n) || Array.from(propSet).some(p => p && p.includes(ln))); });
    var others    = entries.filter(e => { var n = e[0].toLowerCase(), ln = n.split(" ").pop(); return !q.includes(n) && !q.includes(ln) && !propSet.has(n) && !Array.from(propSet).some(p => p && p.includes(ln)); });
    var ordered = mentioned.concat(playing).concat(others.slice(0,10)).slice(0,30);
    playerDbStr = ordered.map(entry => {
      var name = entry[0], p = entry[1];
      var pFloor = (p.props&&p.props.pra&&p.props.pra.floor)||(p.props&&p.props.pts&&p.props.pts.floor)||"—";
      var pCeil  = (p.props&&p.props.pra&&p.props.pra.ceil) ||(p.props&&p.props.pts&&p.props.pts.ceil) ||"—";
      var lean   = (p.props&&p.props.pra&&p.props.pra.lean) ||(p.props&&p.props.pts&&p.props.pts.lean) ||"—";
      var angles = (p.bettingAngles||[]).slice(0,2).join(" | ");
      return name + " | " + p.tier + " | PRA range " + pFloor + "-" + pCeil + " | " + lean + (angles ? " | " + angles : "");
    }).join("\n");
  }

  var prompt = "You are Under Review — a sharp NBA betting intelligence tool.\n\n";
  prompt += "IDENTITY: Sharp betting analyst. Lead with the take. Never hedge.\n\n";
  prompt += "ABSOLUTE RULES:\n";
  prompt += "1. ALWAYS lead with the lean. Never open with a limitation.\n";
  prompt += "2. If prop lines are loaded — cite the exact line and odds.\n";
  prompt += "3. Do not recommend props for a game marked FINAL.\n";
  prompt += "4. Do not assume a player is healthy, active, or starting unless explicitly present in the provided data.\n";
  prompt += "5. Do not assign a player to a current team unless current roster/team data is explicitly present.\n";
  prompt += "6. If current team or injury status is missing, give only a directional lean.\n\n";
  prompt += "CRITICAL ROSTER RULES:\n";
  prompt += "If current team/status data is not explicitly present, do NOT claim a player's current team.\n";
  prompt += "If injury data is not explicitly present, do NOT claim a player is active, out, or facing a specific opponent.\n";
  prompt += "For stars with trades/injuries, avoid matchup-specific claims unless current data confirms them.\n\n";

  if (!hasReliableCurrentContext) {
    prompt += "CURRENT CONTEXT LIMITS:\n";
    prompt += "Current roster and injury data are not loaded.\n";
    prompt += "Do not claim a player's current team, opponent, or active status unless explicitly shown in the provided data.\n";
    prompt += "Use only directional leans in this case.\n\n";
  }

  prompt += "NBA PLAYOFF CONTEXT: Playoffs begin April 19, 2026. Top seeds: OKC, CLE. Best futures: SGA MVP, Jokic PRA series props.\n\n";
  prompt += "TODAY: " + todayStr + "\nNBA PHASE: " + phase + "\n\n";
  prompt += "TONIGHT'S GAMES\n" + gamesStr + "\n\n";
  if (totalsStr) prompt += "GAME TOTALS\n" + totalsStr + "\n\n";
  if (hasProps && propLinesStr) prompt += "LIVE PROP LINES\n" + propLinesStr + "\n\n";
  else prompt += "PROP LINES: Not yet posted for tonight. Use directional leans only.\n\n";
  if (recentFormStr) prompt += "RECENT FORM\n" + recentFormStr + "\n\n";
  if (hasStats && seasonAvgsStr) prompt += "CURRENT PLAYER STATS / CURRENT TEAMS\n" + seasonAvgsStr + "\n\n";
  else prompt += "CURRENT PLAYER STATS: Not loaded. Do not claim current teams.\n\n";
  prompt += "CURRENT INJURY FEED\n" + injuryStr + "\n\n";
  prompt += "CURRENT ROSTER FEED\n" + currentRosterStr + "\n\n";
  if (playerDbStr) prompt += "BETTING PHILOSOPHY DATABASE\n" + playerDbStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";
  return prompt;
}

function buildMlbSystemPrompt(mlbContext, matchupCtxStr) {
  var ctx = mlbContext || {};
  var now = new Date();
  var todayStr = now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var phase = (ctx.seasonContext && ctx.seasonContext.phase) || "MLB Season Active";

  var games = ctx.games || [];
  var gamesStr = games.length > 0
    ? games.map(g => {
        var away = g.awayTeam || {}, home = g.homeTeam || {};
        var awayId = away.abbr||away.name||"AWAY", homeId = home.abbr||home.name||"HOME";
        var awayP = away.pitcher ? " [SP: " + away.pitcher + "]" : "";
        var homeP = home.pitcher ? " [SP: " + home.pitcher + "]" : "";
        if (g.state === "post") return awayId+awayP+" "+(away.score||"")+" @ "+homeId+homeP+" "+(home.score||"")+" — FINAL";
        if (g.state === "in")   return awayId+awayP+" "+(away.score||"")+" @ "+homeId+homeP+" "+(home.score||"")+" — LIVE";
        return awayId+awayP+" @ "+homeId+homeP+" — "+(g.status||"Scheduled");
      }).join("\n")
    : "No games on today's schedule.";

  var totalsStr = "";
  var gameTotals = ctx.gameTotals || {};
  if (Object.keys(gameTotals).length) {
    var tLines = [];
    for (var gk in gameTotals) {
      var t = gameTotals[gk];
      tLines.push(gk + ": O/U " + t.total + (t.run_env === "HIGH" ? " — HIGH run environment" : t.run_env === "LOW" ? " — LOW run environment" : ""));
    }
    totalsStr = tLines.join("\n");
  }

  var propLines = ctx.propLines || [];
  var propLinesStr = "No prop lines posted yet.";
  if (propLines.length > 0) {
    var grouped = {};
    for (var li = 0; li < propLines.length; li++) {
      var pl = propLines[li];
      var k = pl.player + "|" + pl.prop;
      if (!grouped[k]) grouped[k] = { player:pl.player, prop:pl.prop, game:pl.game, over:null, under:null };
      if (pl.side === "Over")  grouped[k].over  = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
      if (pl.side === "Under") grouped[k].under = pl.line + " (" + (pl.odds > 0 ? "+" : "") + pl.odds + ")";
    }
    propLinesStr = Object.values(grouped).slice(0,60).map(e => {
      var sides = e.over ? "OVER " + e.over : "";
      if (e.under) sides += (sides ? " / UNDER " : "UNDER ") + e.under;
      return e.player + " — " + String(e.prop||"").toUpperCase() + " — " + sides + " [" + e.game + "]";
    }).join("\n");
  }

  var prompt = "You are Under Review — a sharp MLB betting intelligence tool.\n\n";
  prompt += "IDENTITY: Sharp baseball analyst. Lead with the take. No hedging. No markdown.\n\n";
  prompt += "CRITICAL RULES:\n1. NEVER use markdown. Plain text only.\n2. NEVER open with a limitation. Lead with the lean.\n3. Always cite prop line numbers when recommending.\n4. Do not recommend props for FINAL games.\n5. NO GAMES TODAY? Give the best futures angle. Always end with an actionable lean.\n\n";
  prompt += "RESPONSE FORMAT:\nOne sharp opening sentence. Then:\nTHE PLAY: • [Player] — [PROP OVER/UNDER LINE] ([ODDS]) — [key reason]\nFADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n";
  prompt += "MLB BETTING PRINCIPLES:\nStarting pitcher strikeouts = primary prop market. K/9 vs opposing K% is the edge.\nGame total is run environment proxy. Over 9 = both offenses cooking. Under 7 = pitchers dominate.\nPark factors matter. Coors Field = back OVERs always. Petco Park = fade OVERs.\nPlatoon splits are underused. Left vs right pitcher splits change lines by 30-40%.\n\n";
  prompt += "PARK FACTOR CHEAT SHEET:\nOVER-friendly: Coors Field (COL ~120), Great American Ball Park (CIN ~108)\nUNDER-friendly: Petco Park (SD ~93), Oracle Park (SF ~92), T-Mobile Park (SEA ~91)\nNeutral: Dodger Stadium (~99), Yankee Stadium (~101)\n\n";
  prompt += "TODAY: " + todayStr + "\nMLB PHASE: " + phase + "\n\n";
  prompt += "TODAY'S GAMES\n" + gamesStr + "\n\n";
  if (totalsStr) prompt += "GAME TOTALS\n" + totalsStr + "\n\n";
  prompt += "LIVE PROP LINES\n" + propLinesStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";
  return prompt;
}

// ── Golf system prompt ────────────────────────────────────────────────────────
function buildGolfSystemPrompt(golfContext, matchupCtxStr) {
  var ctx      = golfContext || {};
  var now      = new Date();
  var todayStr = now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var event    = ctx.currentEvent || null;
  var odds     = ctx.odds || {};
  var players  = ctx.playerDb || {};
  var question = ctx.question || "";
  var q        = question.toLowerCase();

  var eventStr  = "No active tournament loaded this week.";
  var courseStr = "";
  var leaderStr = "";

  if (event) {
    eventStr = event.name + " — " + event.course + ", " + (event.location||"");
    if (event.round) eventStr += " [" + event.round + "]";
    courseStr = "COURSE: " + event.course + " (Par " + (event.par||72) + ")";
    var lb = event.leaderboard || [];
    if (lb.length > 0) {
      leaderStr = "LIVE LEADERBOARD (Top 10)\n" + lb.slice(0,10).map(function(p) {
        return (p.position||"—") + " " + p.name + " — " + p.score + (p.thru&&p.thru!=="—"?" (thru "+p.thru+")":"") + (p.today&&p.today!=="—"?" [today: "+p.today+"]":"");
      }).join("\n");
    }
  }

  var oddsStr = "No current odds loaded — use directional leans only.";
  if (odds.outrights && odds.outrights.length > 0) {
    oddsStr = "OUTRIGHT ODDS (favorites first)\n" + odds.outrights.slice(0,20).map(function(o) {
      return o.player + ": " + (o.odds>0?"+":"") + o.odds;
    }).join("\n");
  }

  var allPlayerKeys = Object.keys(players);
  var relevantPlayers = [];

  for (var i=0; i<allPlayerKeys.length; i++) {
    var pk = allPlayerKeys[i];
    var lastName = pk.split(" ").pop().toLowerCase();
    var firstName = pk.split(" ")[0].toLowerCase();
    if (q.includes(pk.toLowerCase()) || q.includes(lastName) || q.includes(firstName)) {
      relevantPlayers.push(pk);
    }
  }
  if (odds.outrights) {
    for (var oe=0; oe<Math.min(25,odds.outrights.length); oe++) {
      var on = odds.outrights[oe].player.toLowerCase();
      for (var pk2i=0; pk2i<allPlayerKeys.length; pk2i++) {
        var pk2 = allPlayerKeys[pk2i];
        if (!relevantPlayers.includes(pk2) && (pk2.toLowerCase()===on || on.includes(pk2.split(" ").pop().toLowerCase()))) {
          relevantPlayers.push(pk2);
        }
      }
    }
  }
  for (var li=0; li<Math.min(10,(event&&event.leaderboard?event.leaderboard.length:0)); li++) {
    var lbn = ((event.leaderboard[li]||{}).name||"").toLowerCase();
    for (var pk3i=0; pk3i<allPlayerKeys.length; pk3i++) {
      var pk3 = allPlayerKeys[pk3i];
      if (!relevantPlayers.includes(pk3) && lbn.includes(pk3.split(" ").pop().toLowerCase())) {
        relevantPlayers.push(pk3);
      }
    }
  }
  if (relevantPlayers.length < 5) {
    var topTier = allPlayerKeys.filter(function(k){return players[k]&&players[k].tier===1;}).sort(function(a,b){return (players[a].rank||99)-(players[b].rank||99);}).slice(0,12);
    for (var ti=0; ti<topTier.length; ti++) { if (!relevantPlayers.includes(topTier[ti])) relevantPlayers.push(topTier[ti]); }
  }
  relevantPlayers = relevantPlayers.slice(0,18);

  var playerContextStr = "";
  for (var pi=0; pi<relevantPlayers.length; pi++) {
    var pName = relevantPlayers[pi];
    var p = players[pName];
    if (!p) continue;
    var playerOdds = "";
    if (odds.outrights) {
      for (var oi=0; oi<odds.outrights.length; oi++) {
        var om = odds.outrights[oi];
        var omn = om.player.toLowerCase(), pn2 = pName.toLowerCase();
        if (omn===pn2 || omn.includes(pName.split(" ").pop().toLowerCase())) {
          playerOdds = " | OUTRIGHT: " + (om.odds>0?"+":"") + om.odds;
          break;
        }
      }
    }
    if (odds.topFinish && odds.topFinish[pName]) {
      var tf=odds.topFinish[pName];
      if (tf.top_10_finish) playerOdds += " | T10: "+(tf.top_10_finish>0?"+":"")+tf.top_10_finish;
      if (tf.top_20_finish) playerOdds += " | T20: "+(tf.top_20_finish>0?"+":"")+tf.top_20_finish;
    }
    if (odds.makeCut && odds.makeCut[pName]) playerOdds += " | CUT: "+(odds.makeCut[pName]>0?"+":"")+odds.makeCut[pName];
    var sg=p.sg||{};
    var sgStr="SG: Total "+(sg.total||"—")+" | OTT "+(sg.ott||"—")+" | App "+(sg.app||"—")+" | ARG "+(sg.arg||"—")+" | Putt "+(sg.putt||"—");
    playerContextStr += "\n"+pName+" (#"+p.rank+", "+p.country+", Tier "+p.tier+")"+playerOdds+"\n";
    playerContextStr += "  "+sgStr+"\n";
    playerContextStr += "  Cut:"+p.cutMaking+" | T10:"+p.top10Rate+" | T20:"+p.top20Rate+" | Win%:"+p.winRate+"\n";
    playerContextStr += "  Form: "+((p.recentForm||[]).join(","))+"\n";
    playerContextStr += "  Best markets: "+((p.bestMarkets||[]).join(","))+"\n";
    playerContextStr += "  NOTE: "+(p.note||"—")+"\n";
    if (p.tier===2&&p.comps) playerContextStr += "  COMPS: "+p.comps.join(", ")+"\n";
  }

  var rankingsStr = "";
  if (ctx.rankings && ctx.rankings.length>0) {
    rankingsStr = "WORLD RANKINGS (Top 15)\n"+ctx.rankings.slice(0,15).map(function(r){return "#"+r.rank+" "+r.name+" ("+r.country+")";}).join("\n");
  }

  var prompt = "You are Under Review — a sharp PGA Tour betting intelligence tool.\n\n";
  prompt += "IDENTITY: Sharp golf analyst. Lead with the take. Never hedge. Never open with a limitation.\n\n";
  prompt += "ABSOLUTE RULES:\n";
  prompt += "1. ALWAYS lead with the lean — never open with what you don't know.\n";
  prompt += "2. If a player is NOT in your database: say 'I don't have [Player] fully modeled. The closest comps in this market are X and Y.' Then give real angles on those comps.\n";
  prompt += "3. Cite exact odds when available. If no odds loaded, give directional lean with probability language.\n";
  prompt += "4. Never recommend a player for a market that contradicts their profile (don't bet make-cut on a 72% cutter).\n";
  prompt += "5. LIV players (Dustin Johnson, Koepka, DeChambeau, Rahm, Cameron Smith, Tyrrell Hatton, Bubba Watson, Phil Mickelson) — always note VERIFY THEY ARE IN THE FIELD.\n";
  prompt += "6. NEVER use markdown. Plain text only.\n\n";
  prompt += "RESPONSE FORMAT:\nOne sharp opening sentence (the lean). Then:\nTHE PLAY:\n• [Player] — [MARKET] [ODDS] — [key reason]\nFADE: [one clear fade with reason]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n";
  prompt += "GOLF BETTING PRINCIPLES:\n";
  prompt += "Top 10 is the best value market most weeks — wide enough to capture consistent players, narrow enough for real odds.\n";
  prompt += "Outright bets lose 85-90% of the time. Value starts at +800 for true Tier 1 players.\n";
  prompt += "Make-cut is the safest bet — only target players with 82%+ cut-making history.\n";
  prompt += "H2H matchup is the sharpest market — pair consistent iron players vs boom-bust power players.\n";
  prompt += "FRL (First Round Leader) is volatile but high-ROI — power players and morning draws.\n";
  prompt += "SG Total > 2.0 = elite. 1.5-2.0 = very good. 1.0-1.5 = solid. Below 1.0 = journeyman.\n";
  prompt += "Recent form (last 3 events) matters more than season averages.\n\n";
  prompt += "TODAY: "+todayStr+"\n\n";
  prompt += "CURRENT TOURNAMENT\n"+eventStr+"\n\n";
  if (courseStr) prompt += courseStr+"\n\n";
  if (leaderStr) prompt += leaderStr+"\n\n";
  if (rankingsStr) prompt += rankingsStr+"\n\n";
  prompt += oddsStr+"\n\n";
  prompt += "PLAYER DATABASE (relevant to this query)\n"+(playerContextStr||"No specific player data loaded — give general golf betting principles.")+"\n";
  if (matchupCtxStr) prompt += "\nMATCHUP CONTEXT\n"+matchupCtxStr+"\n";
  return prompt;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error:"Missing ANTHROPIC_API_KEY" });

  const { question, players, context, liveMatches, history, matchupContext, image, nflContext, nbaContext, mlbContext, golfContext, sportHint, f1Context:clientF1Context } = req.body;
  if (!question) return res.status(400).json({ error:"Missing question" });

  const sport  = detectSport(question, sportHint, matchupContext);
  const isNFL  = sport === "nfl";
  const isF1   = sport === "f1";
  const isNBA  = sport === "nba";
  const isMLB  = sport === "mlb";
  const isGolf  = sport === "golf";

  function buildOddsContext(odds) {
    if (!odds || (!odds.matches?.length && !odds.props?.length)) return null;
    const lines = [];
    if (odds.matches?.length) {
      lines.push("LIVE MATCH ODDS:");
      for (const m of odds.matches) {
        if (m.homeOdds !== null && m.awayOdds !== null) lines.push("  " + m.home + " (" + (m.homeOdds>0?"+":"") + m.homeOdds + ") vs " + m.away + " (" + (m.awayOdds>0?"+":"") + m.awayOdds + ")");
      }
    }
    return lines.length ? lines.join("\n") : null;
  }

  function buildDrawPath(results) {
    if (!Array.isArray(results) || !results.length) return null;
    const byRound = {};
    for (const r of results) { const round = r.round||"Unknown"; if (!byRound[round]) byRound[round]=[]; byRound[round].push(r); }
    const lines = [];
    for (const round in byRound) { lines.push(round + ":"); for (const m of byRound[round]) lines.push("  " + m.winner + " def. " + m.loser + (m.score ? " (" + m.score + ")" : "")); }
    return lines.join("\n");
  }

  const oddsCtx      = buildOddsContext(req.body.oddsData);
  const drawPath     = buildDrawPath(req.body.tournamentResults);
  const matchupCtxStr = summarizeMatchupContext(matchupContext);

  let systemPrompt;

  if (isGolf) {
    systemPrompt = buildGolfSystemPrompt(golfContext, matchupCtxStr);

  } else if (isF1) {
    systemPrompt = buildF1SystemPrompt(fetchF1LiveData(), matchupCtxStr);

  } else if (isMLB) {
    systemPrompt = buildMlbSystemPrompt(mlbContext, matchupCtxStr);

  } else if (isNBA) {
    systemPrompt = buildNbaSystemPrompt(nbaContext, matchupCtxStr);

  } else if (isNFL) {
    const relevantQBs = getRelevantQBs(question);
    const qbData   = JSON.stringify(relevantQBs, null, 0).slice(0, 9000);
    const skillData = getRelevantSkillPlayers(question, nflContext);
    systemPrompt =
      "You are Under Review — a sharp sports betting intelligence tool covering NFL, NBA, tennis, and F1.\n" +
      "IDENTITY: Sharp betting analyst. Lead every response with the take.\n\n" +
      "CRITICAL RULE: Never open with a limitation. Lead with the lean.\n\n" +
      "NEVER use markdown. No ##, no ---, no ** bold. Plain text only.\n" +
      "RESPONSE FORMAT:\nTHE PLAY:\n• [Player] — [OVER/UNDER line] — [floor/ceil] — [key reason]\nFADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [one line]\n\n" +
      "NFL STAT GLOSSARY\nontgt = on-target throw % (avg 74.9%) — above 78% is elite\nbadTh = bad throw rate (16.1% avg) — below 13% is elite\nprss = pressure rate (21.9% avg) — above 25% is a liability\niay_pa = intended air yards per attempt — above 8.5 = deep thrower\n\n" +
      "KEY TD RATES (2025):\nDerrick Henry (RB, BAL): 0.94 TDs/g\nJames Cook (RB, BUF): 0.88 TDs/g\nDe'Von Achane (RB, MIA): 0.86 TDs/g\nJonathan Taylor (RB, IND): 0.82 TDs/g\nPuka Nacua (WR, LAR): 0 TDs — FADE as TD scorer always\n\n" +
      "DEFENSE TIERS:\nELITE (fade opposing props): PHI, BAL, MIN, DEN\nSTRONG (lean fade): KC, SF, GB, BUF, HOU, TB, LAC, PIT\nWEAK (lean over): MIA, CIN, NYJ, NYG, ARI\nBOTTOM (hard over): TEN, CLE, LVR, CAR\n\n" +
      "RB/WR/TE SKILL POSITION DATABASE\n" + skillData + "\n\n" +
      "QB DATABASE\n" + qbData + "\n\n" +
      (matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n" : "") +
      (oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx : "No live lines — use database floors/ceilings for directional leans.");

  } else {
    // Tennis
    const t = context && context.currentTournament;
    const tournamentCtx = t
      ? "ACTIVE: " + t.name + " — " + t.surface + ", " + t.speed + " speed.\n" + (t.context||"") + "\nATP FAVORITE: " + (t.atp_favorite||"TBD") + "\nWTA FAVORITE: " + (t.wta_favorite||"TBD")
      : "Current tournament context not loaded. Answer from player database and surface Elo data.";
    const allTournaments = context && context.tournaments
      ? Object.values(context.tournaments).map(t2 => t2.name + " (" + t2.surface + ", " + t2.speed + ") — ATP: " + (t2.atp_favorite||"TBD") + " / WTA: " + (t2.wta_favorite||"TBD")).join("\n")
      : "Full season schedule unavailable.";
    const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable";
    const liveMatchStr = Array.isArray(liveMatches) && liveMatches.length
      ? liveMatches.slice(0,12).map(m => { const home=(m.raw&&m.raw.home)||m.home_team||"?", away=(m.raw&&m.raw.away)||m.away_team||"?", round=(m.raw&&m.raw.round)||"Current Tournament", isLive=String((m.raw&&m.raw.live)||m.live||"0")==="1", status=isLive?"LIVE":((m.raw&&m.raw.status)||"Scheduled"); return home+" vs "+away+" — "+round+" — "+status; }).join("\n")
      : "No live matches currently";
    const acePropsStr = context && context.ace_props
      ? Object.entries(context.ace_props).map(([k,v]) => k+": hard avg "+v.avg_aces_hard+", clay avg "+(v.avg_aces_clay||"n/a")+", grass avg "+(v.avg_aces_grass||"n/a")).join("\n")
      : "No ace baselines";

    systemPrompt =
      "You are Under Review — a sharp sports betting intelligence tool covering tennis, NFL, NBA, and F1.\n\n" +
      "IDENTITY: Sharp betting analyst. Lead every response with the take. Never hedge.\n\n" +
      "CRITICAL RULE: Never open with a limitation. Lead with the lean.\n\n" +
      "SURFACE ELO GUIDE\nhElo = hard court | cElo = clay | gElo = grass\nGap over 150 pts = significant edge — always cite the numbers\nGap over 300 pts = massive edge — lead with this\n\n" +
      "PROP ANGLES BY SURFACE\nClay: OVER total games (long rallies), UNDER aces\nGrass: UNDER total games, OVER aces for big servers, tiebreaks common\n\n" +
      "CURRENT TOURNAMENT\n" + tournamentCtx + "\n\nALL TOURNAMENTS\n" + allTournaments + "\n\nLIVE MATCHES\n" + liveMatchStr + "\n\nPLAYER DATABASE\n" + playerDataStr + "\n\nACE PROP BASELINES\n" + acePropsStr + "\n\n" +
      (oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx + "\n" : "No live prop lines — directional leans only.\n") +
      (drawPath ? "TOURNAMENT DRAW PATH\n" + drawPath + "\n" : "") +
      (matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr : "");
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

  if (image && image.base64 && image.mediaType) {
    messages.push({ role:"user", content:[ { type:"image", source:{ type:"base64", media_type:image.mediaType, data:image.base64 } }, { type:"text", text:question } ] });
  } else {
    messages.push({ role:"user", content:question });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:700, temperature:0.45, system:systemPrompt, messages }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({ error:"AI response failed", details:data });
    }

    let text = cleanResponseText(
      (data && data.content ? data.content.filter(i => i.type === "text").map(i => i.text).join("\n").trim() : "") || ""
    );

    if (text && responseLooksWrongForSport(text, sport)) {
      const correctionRes = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
        body: JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1200, temperature:0.2, system: systemPrompt + "\n\nCORRECTION: Your previous response was off-topic. Answer ONLY as a " + sport.toUpperCase() + " analyst. Give a direct answer.", messages }),
      });
      if (correctionRes.ok) {
        const correctionData = await correctionRes.json();
        text = cleanResponseText((correctionData && correctionData.content ? correctionData.content.filter(i => i.type === "text").map(i => i.text).join("\n").trim() : "") || "");
      }
    }

    return res.status(200).json({ response: text || "Couldn't get a response. Try again." });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error:"Request failed", details:err.message });
  }
}
