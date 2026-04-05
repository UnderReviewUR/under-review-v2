export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

// ── NFL QB Database ───────────────────────────────────────────────────────────
const NFL_QBS = {
  "Josh Allen":       { team:"BUF", tier:"ELITE",    passing:{ gs:17, cmp:69.3, yds:3668, td:25, int:10, ypa:8.0,  rate:102.2, qbr:65.4 }, advanced:{ ontgt:79.9, badTh:13.0, prss:18.0, pktTime:2.5, iay_pa:7.3 }, trend:{ ontgt_delta:+5.1, note:"On-target jumped 5.1pts YoY" }, rushing:{ attPg:6.6, ydsPg:34.1, tdPg:0.82, ypc:5.2, tier:"ELITE RUSHER" }, props:{ passYds:{ floor:215, ceil:310, lean:"OVER in shootouts" }, rushYds:{ floor:25, ceil:65, lean:"OVER most weeks" }, best:"Rushing yards OVER — most reliable Allen prop" }, futures:{ wins:"12-13", playoff:"95%+", mvp:"Top-5" }, note:"79.9% on-target plus elite rushing floor = safest QB1 in football." },
  "Drake Maye":       { team:"NE",  tier:"ELITE",    passing:{ gs:17, cmp:72.0, yds:4394, td:31, int:8,  ypa:8.9,  rate:113.5, qbr:77.1 }, advanced:{ ontgt:79.0, badTh:13.8, prss:21.8, pktTime:2.4, iay_pa:9.1 }, rushing:{ attPg:6.1, ydsPg:26.5, tdPg:0.24, ypc:4.4, tier:"STRONG RUSHER" }, props:{ passYds:{ floor:230, ceil:320, lean:"OVER" }, rushYds:{ floor:15, ceil:45, lean:"OVER — market underprices his legs" }, best:"Rushing yards OVER" }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"QBR 77.1 as a rookie is historically rare." },
  "Patrick Mahomes":  { team:"KC",  tier:"ELITE",    passing:{ gs:14, cmp:62.7, yds:3587, td:22, int:11, ypa:7.1,  rate:89.6,  qbr:68.5 }, advanced:{ ontgt:74.3, badTh:17.9, prss:24.0, pktTime:2.2, iay_pa:7.9 }, rushing:{ attPg:4.6, ydsPg:30.1, tdPg:0.36, ypc:6.6, tier:"ELITE RUSHER" }, props:{ rushYds:{ floor:18, ceil:45, lean:"OVER — 30.1 yds/g at 6.6 Y/att chronically ignored" }, best:"Rushing yards OVER." }, futures:{ wins:"11-13", playoff:"85%+", mvp:"Top-3" }, note:"30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football." },
  "Lamar Jackson":    { team:"BAL", tier:"ELITE",    passing:{ gs:13, cmp:63.6, yds:2549, td:21, int:7,  ypa:8.4,  rate:103.8, qbr:62.7 }, advanced:{ ontgt:72.4, badTh:18.3, prss:23.6, pktTime:2.5, iay_pa:8.8 }, trend:{ ontgt_delta:-6.3, note:"ON-TARGET DROPPED 6.3pts — biggest regression in league." }, rushing:{ attPg:5.2, ydsPg:26.8, tdPg:0.15, ypc:5.2, tier:"STRONG RUSHER" }, props:{ rushYds:{ floor:30, ceil:75, lean:"OVER every week" }, best:"Rushing yards OVER + TD scorer OVER" }, futures:{ wins:"11-13 healthy", playoff:"85%+", mvp:"Top-3 if healthy" }, note:"Rushing floor covers accuracy concerns. Health is the key variable." },
  "Joe Burrow":       { team:"CIN", tier:"ELITE",    passing:{ gs:8,  cmp:66.8, yds:1809, td:17, int:5,  ypa:7.0,  rate:100.7, qbr:63.0, note:"8 games only" }, advanced:{ ontgt:75.0, badTh:11.3, prss:21.7, pktTime:2.3, iay_pa:7.2 }, props:{ passTd:{ pg:2.13, lean:"OVER 1.5 when healthy" }, best:"TD OVER 1.5 when healthy" }, futures:{ wins:"11-13 healthy", playoff:"80%+" }, note:"80.3% on-target is the real Burrow. Bet TDs aggressively when healthy." },
  "Matthew Stafford": { team:"LAR", tier:"ELITE",    passing:{ gs:17, cmp:65.0, yds:4707, td:46, int:8,  ypa:7.9,  rate:109.2, qbr:71.2 }, advanced:{ ontgt:73.6, badTh:18.1, prss:18.5, pktTime:2.4, iay_pa:9.0 }, props:{ passTd:{ pg:2.71, lean:"OVER 2.5" }, best:"Passing TDs OVER 2.5 — best single-player prop in NFC." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-3" }, note:"9.0 IAY/PA highest among all starters. TD prop (OVER 2.5) at 2.71/g is most reliable in NFC." },
  "Dak Prescott":     { team:"DAL", tier:"ELITE",    passing:{ gs:17, cmp:67.3, yds:4552, td:30, int:10, ypa:7.6,  rate:99.5,  qbr:70.2 }, advanced:{ ontgt:74.8, badTh:12.5, prss:21.6, pktTime:2.4, iay_pa:8.0 }, props:{ passTd:{ pg:1.76, lean:"OVER 1.5 reliably" }, best:"Lamb receiving props OVER." }, futures:{ wins:"9-11", playoff:"55-65%", mvp:"Top-5 individually" }, note:"12.5% bad throw rate is cleanest among ELITE tier QBs." },
  "Jordan Love":      { team:"GB",  tier:"ELITE",    passing:{ gs:15, cmp:66.3, yds:3381, td:23, int:6,  ypa:7.7,  rate:101.2, qbr:72.7 }, advanced:{ ontgt:77.4, badTh:14.6, prss:22.1, pktTime:2.4, iay_pa:8.7 }, props:{ best:"Love is consistently undervalued." }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"Most underrated QB in football. QBR 72.7 with 6 INTs." },
  "Jared Goff":       { team:"DET", tier:"STARTER",  passing:{ gs:17, cmp:68.0, yds:4564, td:34, int:8,  ypa:7.9,  rate:105.5, qbr:57.3 }, advanced:{ ontgt:78.3, badTh:15.8, prss:24.5, pktTime:2.3, iay_pa:6.4 }, props:{ passTd:{ pg:2.0, lean:"OVER 1.5 every week" }, best:"Passing TDs OVER 1.5." }, futures:{ wins:"11-13", playoff:"80-85%" }, note:"TD prop (2.0/g) most reliable in NFC. FADE in cold outdoor road games." },
  "Brock Purdy":      { team:"SF",  tier:"STARTER",  passing:{ gs:9,  cmp:69.4, yds:2167, td:20, int:10, ypa:7.6,  rate:100.5, qbr:72.8, note:"9 games only" }, advanced:{ ontgt:82.2, badTh:12.3, prss:21.1, pktTime:2.7, iay_pa:7.5 }, props:{ passTd:{ pg:2.22, lean:"OVER 2.0 when healthy" }, best:"Purdy TD OVER 2.0 when healthy." }, futures:{ wins:"10-12", playoff:"70-80% healthy" }, note:"82.2% on-target highest among all starters." },
  "Jalen Hurts":      { team:"PHI", tier:"STARTER",  passing:{ gs:16, cmp:64.8, yds:3224, td:25, int:6,  ypa:7.1,  rate:98.5,  qbr:55.2 }, advanced:{ ontgt:74.0, badTh:16.7, prss:20.0, pktTime:2.5, iay_pa:9.0 }, rushing:{ attPg:6.6, ydsPg:26.3, tdPg:0.50, tier:"STRONG RUSHER" }, props:{ rushYds:{ lean:"OVER every week — designed runs every game" }, best:"Rushing yards OVER. Floor guaranteed." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-5" }, note:"Rushing floor (designed runs 6.6/g) covers any passing variance." },
  "C.J. Stroud":      { team:"HOU", tier:"STARTER",  passing:{ gs:14, cmp:64.5, yds:3041, td:19, int:8,  ypa:7.2,  rate:92.9,  qbr:61.7 }, advanced:{ ontgt:74.6, badTh:17.6, prss:21.4, pktTime:2.4, iay_pa:7.9 }, props:{ best:"Collins receiving props OVER" }, futures:{ wins:"10-12", playoff:"75-85%" }, note:"Year 3 with healthy weapons projects top-8 QB." },
  "Trevor Lawrence":  { team:"JAX", tier:"STARTER",  passing:{ gs:17, cmp:60.9, yds:4007, td:29, int:12, ypa:7.2,  rate:91.0,  qbr:58.3 }, advanced:{ ontgt:73.7, badTh:14.4, prss:21.8, pktTime:2.4, iay_pa:8.7 }, rushing:{ attPg:4.8, ydsPg:21.1, tdPg:0.53, tier:"STRONG RUSHER" }, props:{ best:"Total TDs OVER — rushing TDs (0.53/g) + passing TDs." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"Total TD prop (rushing + passing) is the most underrated bet on his slate." },
  "Jayden Daniels":   { team:"WAS", tier:"STARTER",  passing:{ gs:7,  cmp:60.6, yds:1262, td:8,  int:3,  ypa:6.7,  rate:88.1,  qbr:44.7, note:"7 games only" }, advanced:{ ontgt:76.4, badTh:14.9, prss:16.7, pktTime:2.3, iay_pa:7.2 }, rushing:{ attPg:8.3, ydsPg:39.7, tdPg:0.29, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER — 39.7 yds/g pace is best in NFC" }, best:"Rushing yards OVER when healthy." }, futures:{ wins:"9-11", playoff:"50-60%" }, note:"Health is the only real question." },
  "Caleb Williams":   { team:"CHI", tier:"STARTER",  passing:{ gs:17, cmp:58.1, yds:3942, td:27, int:7,  ypa:6.9,  rate:90.1,  qbr:58.2 }, advanced:{ ontgt:69.8, badTh:20.7, prss:25.1, pktTime:2.5, iay_pa:8.5 }, rushing:{ attPg:4.5, ydsPg:22.8, tier:"STRONG RUSHER" }, props:{ best:"Bears team total OVER — best cast Williams has had." }, futures:{ wins:"10-12", playoff:"60-70%" }, note:"Year 2 with better cast is the buy." },
  "Bo Nix":           { team:"DEN", tier:"STARTER",  passing:{ gs:17, cmp:63.4, yds:3931, td:25, int:11, ypa:6.4,  rate:87.8,  qbr:58.3 }, advanced:{ ontgt:77.4, badTh:15.9, prss:19.1, pktTime:2.4, iay_pa:7.3 }, rushing:{ attPg:4.9, ydsPg:20.9, tier:"STRONG RUSHER" }, props:{ best:"Broncos team total UNDER vs elite offenses. Nix rushing OVER." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"RPO scheme is where Denver generates offense. Fade in shootouts." },
  "Baker Mayfield":   { team:"TB",  tier:"STARTER",  passing:{ gs:17, cmp:63.2, yds:3693, td:26, int:11, ypa:6.8,  rate:90.6,  qbr:61.3 }, advanced:{ ontgt:73.7, badTh:15.7, prss:14.8, pktTime:2.3, iay_pa:8.0 }, rushing:{ attPg:3.2, ydsPg:22.5, ypc:6.9, tier:"STRONG RUSHER" }, props:{ best:"Evans TD scorer OVER. Mayfield rushing yards OVER." }, futures:{ wins:"8-10", playoff:"50-60%" }, note:"Lowest pressure rate among starters (14.8%). Books underrate Tampa." },
  "Kyler Murray":     { team:"MIN", tier:"STARTER",  passing:{ gs:5,  cmp:68.3, yds:962,  td:6,  int:3,  note:"5 games pre-trade" }, rushing:{ attPg:5.8, ydsPg:34.6, ypc:6.0, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER when healthy" }, best:"Vikings team total OVER when Murray healthy." }, futures:{ wins:"10-13 healthy", playoff:"70-80% healthy" }, note:"O'Connell scheme + Jefferson is generational. Health is the only ceiling." },
  "Jaxson Dart":      { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12, cmp:63.7, yds:2272, td:15, int:5,  ypa:6.7,  rate:91.7,  qbr:57.5 }, advanced:{ ontgt:72.9, badTh:15.5, prss:23.3, pktTime:2.4, iay_pa:8.1 }, rushing:{ attPg:6.1, ydsPg:34.8, tdPg:0.64, ypc:5.7, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER — market ignores 34.8 yds/g" }, best:"Rushing yards OVER every week." }, futures:{ wins:"7-9", playoff:"30-40%" }, note:"34.8 rushing yds/g is the best prop edge in the NFC. Market ignores it." },
  "Sam Darnold":      { team:"SEA", tier:"STARTER",  passing:{ gs:17, cmp:67.7, yds:4048, td:25, int:14, ypa:8.5,  rate:99.1,  qbr:55.6, note:"MIN under O'Connell — regression is the base case" }, advanced:{ ontgt:79.8, badTh:14.6, prss:21.0, pktTime:2.4, iay_pa:7.8 }, props:{ best:"Darnold INT OVER 0.5 every week." }, futures:{ wins:"7-10", playoff:"40-50%" }, note:"Numbers were O'Connell scheme and Jefferson. Regression is the base case." },
  "Shedeur Sanders":  { team:"TEN", tier:"ROOKIE",   passing:{ gs:0,  note:"2026 DRAFT PICK — Drafted #1 overall by Tennessee Titans (April 2026)." }, advanced:{ ontgt:69.6, badTh:18.0, prss:40.3, note:"College stats from Colorado 2025" }, props:{ best:"Fade Titans early-season totals — market overvalues rookie QBs." }, futures:{ wins:"5-7", playoff:"10-15%" }, note:"Most NFL-ready QB in 2026 class. Titans supporting cast is bottom-5." },
  "Cam Ward":         { team:"TEN", tier:"BELOW_AVG", passing:{ gs:17, cmp:59.8, yds:3169, td:15, int:7,  ypa:5.9,  rate:80.2,  qbr:33.2, note:"Was Titans starter before Sanders drafted" }, advanced:{ ontgt:72.6, badTh:19.0, prss:27.8, pktTime:2.4, iay_pa:7.2 }, props:{ best:"Titans team total UNDER regardless of QB." }, futures:{ wins:"5-8", playoff:"10-15%" }, note:"Titans situation is a mess. Sanders drafted #1 — Ward is either traded or backup." },
};

// ── Sport detection ───────────────────────────────────────────────────────────
function detectSport(question, sportHint, matchupContext) {
  const q = String(question || "").toLowerCase();

  if (sportHint === "nfl" || sportHint === "tennis" || sportHint === "f1" || sportHint === "nba") return sportHint;

  const mcLeague = String((matchupContext && matchupContext.league) || "").toLowerCase();
  if (mcLeague.includes("nfl")) return "nfl";
  if (mcLeague.includes("atp") || mcLeague.includes("wta") || mcLeague.includes("tennis")) return "tennis";

  const explicitTennis = ["tennis","atp ","wta ","atp tour","wta tour","roland garros","french open","wimbledon","us open","australian open","indian wells","miami open","madrid open","rome open","queen's club","halle open"];
  for (let i = 0; i < explicitTennis.length; i++) { if (q.includes(explicitTennis[i])) return "tennis"; }

  if (q.includes("nfl")) return "nfl";

  const explicitF1 = ["formula 1","formula one","f1 race","f1 season","grand prix","verstappen","leclerc","antonelli","george russell","oscar piastri","lando norris","ferrari f1","mclaren f1","red bull f1","mercedes f1","pit stop","drs","pole position","qualifying f1","free practice f1","sprint race f1","constructor championship","driver championship"];
  for (let i = 0; i < explicitF1.length; i++) { if (q.includes(explicitF1[i])) return "f1"; }

  // NBA — broad keyword net including prop betting language
  const explicitNba = [
    // League + teams
    "nba","basketball","lakers","celtics","warriors","nuggets","bucks","heat",
    "thunder","knicks","sixers","nets","bulls","cavaliers","clippers","suns",
    "mavericks","grizzlies","pelicans","jazz","kings","trail blazers","blazers",
    "rockets","spurs","raptors","magic","pacers","hawks","hornets","pistons","timberwolves",
    // Star players — first OR last name
    "jokic","gilgeous-alexander","shai","doncic","tatum","giannis","wembanyama",
    "brunson","steph curry","stephen curry","kevin durant","devin booker","ja morant",
    "anthony edwards","karl-anthony","tyrese haliburton","donovan mitchell",
    "bam adebayo","lebron","lamelo","damian lillard","trae young","kyrie",
    "anthony davis","rudy gobert","jaren jackson","desmond bane","lauri markkanen",
    "cade cunningham","paolo banchero","scottie barnes","franz wagner","alperen sengun",
    "jaylen brown","mikal bridges","og anunoby","josh hart","evan mobley",
    "jamal murray","anfernee simons","zach lavine","jordan poole","draymond",
    // Prop betting terms — the key fix
    "3 pointer","3-pointer","three pointer","3pm","threes made","three pointers",
    "pra","pra over","pra under","points prop","rebounds prop","assists prop",
    "nba prop","nba props","player prop","prop bet","prop line","prop pick",
    "game total","over under","points over","points under","rebounds over",
    "assists over","double double","triple double","usage rate","usage spike",
    "minutes prop","steal prop","block prop","fantasy basketball",
    "nba future","nba bet","nba pick","nba parlay","nba same game parlay",
    "nba playoff","nba finals","nba champion","nba mvp","defensive player",
    "box score","field goal","free throw","three point","paint points",
    "fast break","half court","second half","first half nba",
  ];
  for (let i = 0; i < explicitNba.length; i++) { if (q.includes(explicitNba[i])) return "nba"; }

  const nflSignals = ["quarterback","qb ","touchdown","touchdowns","interception","passing yards","rushing yards","receiving yards","fantasy football","super bowl","afc ","nfc ","wide receiver","running back","tight end","red zone","blitz","pocket","play action","offense","defense","defensive","offensive","cornerback","linebacker","pass rush","edge rusher","sacks","sack rate","draft pick","draft class","first round","win total","team total","season total","game script","skill position","divisional","bills","patriots","dolphins","jets","ravens","bengals","browns","steelers","texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos","cowboys","giants","eagles","commanders","bears","lions","packers","vikings","falcons","panthers","saints","buccaneers","cardinals","rams","49ers","seahawks","mahomes","lamar","burrow","hurts","prescott","stroud","stafford","purdy","goff","daniels","cook","henry","taylor","robinson","achane","nacua","chase","pickens","lamb","mcbride","bowers","kelce","warren","draft","rookie","rookies"];
  const tennisSignals = ["alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton","fritz","sabalenka","swiatek","rybakina","pegula","gauff","muchova","osaka","keys","draper","fils","ruud","rublev","paolini","andreeva","kartal","zheng","mensik","bublik","tien","lehecka","cerundolo","surface elo","dominance ratio","hold percentage","tiebreak","double faults","ace rate","break point","clay court","grass court","hard court","draw path"];

  let nfl = 0;
  let ten = 0;
  let nba = 0;
  for (let i = 0; i < nflSignals.length; i++)    { if (q.includes(nflSignals[i]))    nfl += nflSignals[i].length > 7 ? 3 : nflSignals[i].length > 4 ? 2 : 1; }
  for (let i = 0; i < tennisSignals.length; i++) { if (q.includes(tennisSignals[i])) ten += tennisSignals[i].length > 7 ? 3 : tennisSignals[i].length > 4 ? 2 : 1; }

  // Additional NBA signals for scoring
  const nbaSignals = ["points per game","rebounds per game","assists per game","per game","scorer","shooting","field goal percentage","three point percentage","playoff basketball","conference finals","nba season"];
  for (let i = 0; i < nbaSignals.length; i++) { if (q.includes(nbaSignals[i])) nba += 3; }

  if (nba > nfl && nba > ten) return "nba";
  if (ten > nfl) return "tennis";
  if (nfl > ten) return "nfl";
  // Only default to NBA for prop/betting language if there are zero tennis or NFL signals
  if (nfl === 0 && ten === 0) {
    if (q.includes("prop") || q.includes("bet") || q.includes("pick") || q.includes("parlay")) return "nba";
    // "over" and "under" alone are too ambiguous — default to NFL not NBA
  }
  return "nfl";
}

function getRelevantQBs(question) {
  const q = question.toLowerCase();
  const relevant = {};
  for (const name in NFL_QBS) {
    const data = NFL_QBS[name];
    const parts = name.toLowerCase().split(" ");
    if (parts.some(function(p) { return p.length > 3 && q.includes(p); })) relevant[name] = data;
    else if (data.team && q.includes(data.team.toLowerCase())) relevant[name] = data;
  }
  return Object.keys(relevant).length > 0 ? relevant : NFL_QBS;
}

function getRelevantSkillPlayers(question, nflContext) {
  if (!nflContext) return "No skill position data provided.";
  const q = String(question || "").toLowerCase();
  const blocks = String(nflContext).split("\n\n");
  const matched = blocks.filter(function(block) {
    const lower = block.toLowerCase();
    const firstLine = lower.split("\n")[0] || "";
    const tokens = firstLine.split("|").map(function(s) { return s.trim(); });
    return tokens.some(function(token) { return token && token.length > 2 && q.includes(token); });
  });
  if (matched.length > 0) return matched.slice(0, 10).join("\n\n");
  const generic = ["running back","wide receiver","tight end","touchdown","receiving","rushing","catches","yards","prop"];
  if (generic.some(function(n) { return q.includes(n); })) return blocks.slice(0, 20).join("\n\n");
  return blocks.slice(0, 10).join("\n\n");
}

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
    .replace(/^ur take[:\-]\s*/gim, "")
    .replace(/^i am an nfl.*$/gim, "")
    .replace(/^i don['']?t have tennis data.*$/gim, "")
    .replace(/^i don['']?t cover tennis.*$/gim, "")
    .replace(/^i only cover nfl.*$/gim, "")
    .replace(/^i['']?m built for nfl betting only.*$/gim, "")
    .replace(/^wrong sport[^\n]*/gim, "")
    .replace(/^i cover nfl[^\n]*/gim, "")
    .replace(/^that['']?s not my area[^\n]*/gim, "")
    .replace(/^i don['']?t cover (nba|basketball)[^\n]*/gim, "")
    .replace(/^if you['']?re asking (nba|basketball)[^\n]*/gim, "")
    .replace(/^without live data[^\n]*/gim, "")
    .replace(/^without (access to |real-?time |current )[^\n]*/gim, "")
    .replace(/^i don['']?t have (access to |real-?time |live |current )[^\n]*/gim, "")
    .replace(/^as of my (knowledge |training )?cutoff[^\n]*/gim, "")
    .trim();
}

function responseLooksWrongForSport(text, sport) {
  const t = String(text || "").toLowerCase();
  if (sport === "tennis") {
    return (
      t.includes("i don't cover tennis") ||
      t.includes("built for nfl betting only") ||
      t.includes("i only cover nfl") ||
      (t.includes("quarterback") && !t.includes("tennis"))
    );
  }
  if (sport === "nfl") {
    return t.includes("i don't cover nfl") || (t.includes("grand slam") && !t.includes("super bowl"));
  }
  return false;
}

// ── F1 prompt — pure string concatenation, zero template literals ─────────────
function buildF1SystemPrompt(f1Context, matchupCtxStr) {
  const ctx = f1Context || {};
  const standings  = ctx.standings    || "Live standings unavailable.";
  const upcoming   = ctx.upcomingRaces || "Race schedule unavailable.";
  const sessionStr = ctx.sessionStr   || "";
  const nextRace   = ctx.nextRace;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  let nextRaceStr = "NEXT RACE: Not yet determined";
  let nextRaceName = "the next race";
  let nextRaceCircuit = "unknown";
  let daysUntilRace = null;

  if (nextRace) {
    let dateStr = "TBD";
    if (nextRace.date_start) {
      const raceDate = new Date(nextRace.date_start);
      dateStr = raceDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysUntilRace = Math.ceil((raceDate - now) / (1000 * 60 * 60 * 24));
    }
    nextRaceName = nextRace.meeting_name || "Next Grand Prix";
    nextRaceCircuit = nextRace.location || "TBD";
    nextRaceStr = "NEXT RACE: " + nextRaceName + " — " + nextRaceCircuit + " (" + dateStr + ")" +
      (daysUntilRace !== null ? " — " + daysUntilRace + " days away" : "");
  }

  // ── Classify next circuit type ─────────────────────────────────────────────
  const STREET_CIRCUITS   = ["monaco","baku","singapore","las vegas","jeddah","miami","sao paulo"];
  const POWER_CIRCUITS    = ["monza","spa","silverstone","baku","interlagos"];
  const HIGH_DOWNFORCE    = ["hungary","hungaroring","singapore","barcelona","catalunya"];

  let circuitType = "mixed";
  let circuitBettingNote = "Championship form is the primary signal at this circuit type.";

  if (nextRace) {
    const venue = ((nextRace.location || "") + " " + (nextRace.circuit_short_name || "") + " " + (nextRace.meeting_name || "")).toLowerCase();
    if (STREET_CIRCUITS.some(c => venue.includes(c))) {
      circuitType = "STREET CIRCUIT";
      circuitBettingNote = "Qualifying position is 80% of the race result. Overtaking nearly impossible. Always lean pole sitter for race winner. Safety car is near-certain — factor in restart ability.";
    } else if (POWER_CIRCUITS.some(c => venue.includes(c))) {
      circuitType = "POWER CIRCUIT";
      circuitBettingNote = "Engine advantage is decisive here. Mercedes power unit structural edge is at its maximum. Antonelli and Russell are the primary race winner plays. Norris and Verstappen are fades.";
    } else if (HIGH_DOWNFORCE.some(c => venue.includes(c))) {
      circuitType = "HIGH DOWNFORCE";
      circuitBettingNote = "Aero efficiency decides the race. Ferrari's package competes here — Leclerc becomes a live race winner. Mercedes still leads constructor battle.";
    }
  }


  const isRaceWeek = daysUntilRace !== null && daysUntilRace <= 7;
  const isOffWeek  = daysUntilRace === null || daysUntilRace > 7;

  const weekContext = isRaceWeek
    ? "RACE WEEK — " + nextRaceName + " is " + daysUntilRace + " days away. Focus on: circuit-specific advantages, qualifying vs race pace split, head-to-head props, podium props."
    : "OFF WEEK — No race this weekend. This is the highest-value time for futures betting. Focus on: championship outright value, team trajectory, circuit-specific upcoming edges, driver head-to-head season props.";

  let prompt = "You are Under Review — a sharp sports betting intelligence tool covering Formula 1, NBA, tennis, and NFL.\n\n";

  prompt += "IDENTITY: Sharp F1 betting analyst. Lead with conviction. One direct recommendation — not conditional scenarios.\n\n";
  prompt += "STYLE: 2-3 short paragraphs then THE BET. No hedging.\n\n";
  prompt += "END WITH:\nTHE BET:\n• [Driver] — [market] — [reason]\nFADE: [one line]\nCONFIDENCE: [High/Medium/Speculative]\nTIMING: [bet now / wait for qualifying / futures window]\n\n";
  prompt += "TODAY: " + todayStr + "\n" + weekContext + "\n\n";
  prompt += "2026 POWER UNIT: 1.Mercedes(Antonelli,Russell) 2.Ferrari(Leclerc,Hamilton) 3.McLaren(Norris,Piastri) 4.RedBull(Verstappen) — this order decides most races.\n";
  prompt += "KEY FADES: Norris overpriced(2025 rep, 2026 car is midfield). Verstappen overpriced(Honda PU deficit). Hamilton fade vs Leclerc H2H.\n";
  prompt += "KEY BACKS: Antonelli/Russell at any circuit. Leclerc qualifying props. Mercedes constructor.\n\n";
  prompt += "CIRCUIT NOTES: Street=qualify position is everything. Power=Mercedes wins. High-downforce=Ferrari competitive. Mixed=standings form.\n";
  prompt += "NEXT CIRCUIT: " + circuitType + " — " + circuitBettingNote + "\n\n";

  prompt += "CURRENT CHAMPIONSHIP STANDINGS\n" + standings + "\n\n";
  prompt += nextRaceStr + "\n";
  prompt += "NEXT CIRCUIT TYPE: " + circuitType + "\n";
  prompt += "CIRCUIT BETTING NOTE: " + circuitBettingNote + "\n\n";
  prompt += "UPCOMING RACES\n" + upcoming + "\n\n";
  if (sessionStr) prompt += "LATEST SESSION DATA\n" + sessionStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";
  prompt += "No live betting lines available — directional leans only based on structural analysis.";
  return prompt;
}

// ── NBA prompt — pure string concatenation, zero template literals ─────────────
function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
  const ctx = nbaContext || {};

  // ── Build injuredNames Set FIRST — used throughout entire function ─────────
  const injuredNames = new Set();
  if (Array.isArray(ctx.injuries)) {
    ctx.injuries.forEach(function(i) {
      if (i.player) injuredNames.add(i.player.toLowerCase());
    });
  }

  // ── Date + season grounding — always accurate ─────────────────────────────
  const now        = new Date();
  const todayStr   = now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const seasonCtx  = ctx.seasonContext || {};
  const phase      = seasonCtx.phase || "NBA Season Active";

  // ── Today's games ─────────────────────────────────────────────────────────
  // Build date-aware fallback — if API fails we still know what day it is
  const todayNow = new Date();
  const todayDay = todayNow.getDay(); // 0=Sun, 1=Mon...6=Sat
  const todayHour = todayNow.getHours();
  const nbaTypicalGameDays = [0,1,2,3,4,5,6]; // NBA plays every day in season
  const likelyHasGames = nbaTypicalGameDays.includes(todayDay);

  let gamesStr = likelyHasGames
    ? "Game schedule not loaded from API — but NBA plays nearly every day in the regular season. There are likely games today. Do NOT say the league is dark or there are no games unless you are certain it is a confirmed rest day. Check the injury report and give prop analysis for the slate."
    : "No games on today's schedule.";

  if (Array.isArray(ctx.todaysGames) && ctx.todaysGames.length > 0) {
    gamesStr = ctx.todaysGames.map(function(g) {
      const away  = (g.awayTeam && (g.awayTeam.abbr || g.awayTeam.name)) || "AWAY";
      const home  = (g.homeTeam && (g.homeTeam.abbr || g.homeTeam.name)) || "HOME";
      const awayS = (g.awayTeam && g.awayTeam.score) != null ? g.awayTeam.score : "";
      const homeS = (g.homeTeam && g.homeTeam.score) != null ? g.homeTeam.score : "";
      const isLive = g.state === "in" || (g.status && g.status === "Live");
      const isFinal = g.state === "post" || g.status === "Final";
      if (isLive && awayS !== "") {
        return away + " " + awayS + " @ " + home + " " + homeS + " — LIVE";
      }
      if (isFinal && awayS !== "") {
        return away + " " + awayS + " @ " + home + " " + homeS + " — FINAL";
      }
      return away + " @ " + home + " — " + (g.status || "Scheduled");
    }).join("\n");
  }

  // ── Last night's results ──────────────────────────────────────────────────
  let lastNightStr = "No results from last night.";
  if (Array.isArray(ctx.lastNight) && ctx.lastNight.length > 0) {
    lastNightStr = ctx.lastNight.map(function(g) {
      const away = (g.awayTeam && g.awayTeam.abbr) || "AWAY";
      const home = (g.homeTeam && g.homeTeam.abbr) || "HOME";
      return away + " " + (g.awayTeam && g.awayTeam.score) + " @ " + home + " " + (g.homeTeam && g.homeTeam.score) + " — FINAL";
    }).join("\n");
  }

  // ── Last night's top performers ───────────────────────────────────────────
  let lastNightStatsStr = "";
  if (Array.isArray(ctx.lastNightStats) && ctx.lastNightStats.length > 0) {
    lastNightStatsStr = "TOP PERFORMERS LAST NIGHT:\n" + ctx.lastNightStats.slice(0, 15).map(function(s) {
      const pra = (s.pts || 0) + (s.reb || 0) + (s.ast || 0);
      return s.player + " (" + s.team + "): " + s.pts + "pts " + s.reb + "reb " + s.ast + "ast — PRA " + pra;
    }).join("\n");
  }

  // ── Live stats if games in progress ──────────────────────────────────────
  let liveStatsStr = "";
  if (Array.isArray(ctx.liveStats) && ctx.liveStats.length > 0) {
    liveStatsStr = "LIVE STATS (in-game):\n" + ctx.liveStats.slice(0, 15).map(function(s) {
      return s.player + " (" + s.team + "): " + s.pts + "pts " + s.reb + "reb " + s.ast + "ast in " + s.min + "min";
    }).join("\n");
  }

  // ── Season averages from BallDontLie — flag injured players ──────────────
  let seasonAvgsStr = "Season averages not loaded.";
  if (Array.isArray(ctx.playerStats) && ctx.playerStats.length > 0) {
    seasonAvgsStr = ctx.playerStats.slice(0, 25).map(function(p) {
      const pra      = ((p.pts || 0) + (p.reb || 0) + (p.ast || 0)).toFixed(1);
      const pName    = p.name || "Unknown";
      const isHurt   = injuredNames.has(pName.toLowerCase());
      const hurtFlag = isHurt ? " ⚠️ INJURED — DO NOT RECOMMEND" : "";
      return pName + " (" + (p.team||"?") + "): " + (p.pts||0) + "pts " + (p.reb||0) + "reb " + (p.ast||0) + "ast | PRA avg " + pra + " | " + (p.gp||0) + "gp" + hurtFlag;
    }).join("\n");
  }

  // ── Actual prop lines from Odds API ──────────────────────────────────────
  let propLinesStr = "No live prop lines available — use season averages and curated floors/ceilings for directional leans.";
  if (Array.isArray(ctx.propLines) && ctx.propLines.length > 0) {
    const grouped = {};
    for (const line of ctx.propLines) {
      const k = line.player + "|" + line.prop;
      if (!grouped[k]) grouped[k] = { player: line.player, prop: line.prop, game: line.game, lines: [] };
      grouped[k].lines.push(line.side + " " + line.line + " (" + (line.odds > 0 ? "+" : "") + line.odds + ")");
    }
    const propEntries = Object.values(grouped).slice(0, 25);
    if (propEntries.length > 0) {
      propLinesStr = "LIVE PROP LINES (" + (ctx.propLines[0] && ctx.propLines[0].book ? ctx.propLines[0].book : "books") + "):\n" +
        propEntries.map(function(e) {
          return e.player + " — " + e.prop.toUpperCase() + " — " + e.lines.join(" / ") + " [" + e.game + "]";
        }).join("\n");
    }
  }

  // ── Curated player database — injured players flagged and sorted last ─────
  let playerDbStr = "Curated database not loaded.";
  if (ctx.playerDb && Object.keys(ctx.playerDb).length > 0) {
    const q        = (ctx.question || "").toLowerCase();
    const entries  = Object.entries(ctx.playerDb);

    // Mark each entry as injured or healthy
    const withStatus = entries.map(function(e) {
      const name    = e[0];
      const isHurt  = injuredNames.has(name.toLowerCase());
      // Also check last name match
      const lastName = name.toLowerCase().split(" ").pop();
      const hurtByLastName = Array.from(injuredNames).some(function(n) { return n.includes(lastName); });
      return { name: name, p: e[1], isHurt: isHurt || hurtByLastName };
    });

    // Sort: mentioned first, then healthy, then injured
    const mentioned = withStatus.filter(function(e) {
      const ln = e.name.toLowerCase().split(" ").pop();
      return q.includes(e.name.toLowerCase()) || q.includes(ln);
    });
    const healthyRest  = withStatus.filter(function(e) {
      const ln = e.name.toLowerCase().split(" ").pop();
      return !e.isHurt && !q.includes(e.name.toLowerCase()) && !q.includes(ln);
    });
    const injuredRest  = withStatus.filter(function(e) {
      const ln = e.name.toLowerCase().split(" ").pop();
      return e.isHurt && !q.includes(e.name.toLowerCase()) && !q.includes(ln);
    });

    const ordered = mentioned.concat(healthyRest).concat(injuredRest).slice(0, 35);

    playerDbStr = ordered.map(function(entry) {
      const name    = entry.name;
      const p       = entry.p;
      const pra     = ((p.pts || 0) + (p.reb || 0) + (p.ast || 0)).toFixed(1);
      const pFloor  = (p.props && p.props.pra && p.props.pra.floor) || (p.props && p.props.pts && p.props.pts.floor) || "—";
      const pCeil   = (p.props && p.props.pra && p.props.pra.ceil)  || (p.props && p.props.pts && p.props.pts.ceil)  || "—";
      const lean    = (p.props && p.props.pra && p.props.pra.lean)  || (p.props && p.props.pts && p.props.pts.lean)  || "—";
      const angles  = (p.bettingAngles || []).slice(0, 2).join(" | ");
      const hurtTag = entry.isHurt ? " | ⚠️ CURRENTLY INJURED — SKIP THIS PLAYER" : "";
      return name + " | " + p.team + " | " + p.tier + " | " + p.pts + "pts/" + p.reb + "reb/" + p.ast + "ast | PRA avg " + pra + " | floor/ceil " + pFloor + "/" + pCeil + " | " + lean + (angles ? " | " + angles : "") + hurtTag;
    }).join("\n");
  }


  // ── Injury report — CRITICAL ──────────────────────────────────────────────
  let injuryStr = "No current injury data loaded.";
  if (Array.isArray(ctx.injuries) && ctx.injuries.length > 0) {
    injuryStr = ctx.injuries.map(function(i) {
      const ret = i.returnDate ? " (est. return: " + i.returnDate + ")" : "";
      return i.player + " (" + i.team + ") — " + i.status + ret + (i.description ? " — " + i.description : "");
    }).join("\n");
  }


  let prompt = "You are Under Review — a sharp sports betting intelligence tool covering NBA, NFL, tennis, and F1.\n\n";

  prompt += "IDENTITY\n";
  prompt += "You are a sharp betting analyst — not a chatbot. Every response should read like it came from someone who has done the work, pulled the box scores, checked the injury report, and is giving you their actual take with conviction. Never hedge. Never say 'it depends' without following up with the actual answer.\n\n";

  prompt += "STYLE: Lead with the take. Sharp, specific, confident. No markdown headers. No prefix. Never deflect. Never say 'wrong sport.'\n\n";

  prompt += "RESPONSE FORMAT — STRICT:\n";
  prompt += "1-2 sentences max of context. Then bullets. No walls of text. No lengthy reasoning.\n";
  prompt += "Example format:\n";
  prompt += "Cade Cunningham is the only clean pre-game prop left tonight. Detroit runs everything through him against a leaky Philly defense.\n\n";
  prompt += "THE PLAY:\n";
  prompt += "• Cade Cunningham — PRA OVER 39.5 — floor 36 / ceil 54 — elite usage, top-5 playmaker\n";
  prompt += "• KAT — Rebounds OVER 12.5 — floor 11 / ceil 16 — elite rebounder, favorable matchup\n";
  prompt += "FADE: Role players mid-game — variance too high\n";
  prompt += "CONFIDENCE: High (Cade) / Medium (KAT — check injury report)\n";
  prompt += "TIMING: Act now on Cade. Confirm KAT active first.\n\n";

  prompt += "TODAY: " + todayStr + "\n";
  prompt += "NBA SEASON PHASE: " + phase + "\n\n";

  prompt += "GAME STATUS RULES — NON-NEGOTIABLE:\n";
  prompt += "- FINAL means the game is OVER. Do not reference it as live. Do not recommend props for it.\n";
  prompt += "- LIVE means the game is currently in progress. Flag as live betting only.\n";
  prompt += "- A time like '7:00 PM ET' means the game has NOT started yet. This is your primary prop target.\n";
  prompt += "- If the user asks for the best prop and all games are FINAL, say so clearly and give tomorrow's best plays instead.\n";
  prompt += "- NEVER say a game is live or in overtime if its status says FINAL. The score shown is the final score.\n\n";
  prompt += "- Never mention All-Star break unless it is currently February and the schedule confirms it\n";
  prompt += "- Never say the league is dark unless today's game schedule is empty AND the season phase is offseason\n";
  prompt += "- If today's schedule shows no games, say it is a rest day within the season — not a break\n";
  prompt += "- Use the actual date above for all temporal reasoning\n\n";

  prompt += "KEY PROP PRINCIPLES\n";
  prompt += "- Injury replacement is the HIGHEST-confidence edge — usage spikes are predictable. Name the beneficiary.\n";
  prompt += "- PRA (pts+reb+ast) is the primary vehicle — lower variance than any individual stat\n";
  prompt += "- When live lines exist: reference exact line and odds, give OVER or UNDER with conviction\n";
  prompt += "- When no live lines: use curated floor/ceil as directional framework\n";
  prompt += "- Game total = pace proxy — high totals mean more possessions = more counting stats\n";
  prompt += "- Rebounds most predictable individual prop — position and matchup, not luck\n";
  prompt += "- Assists spike in fast pace; fade in slow half-court defensive games\n";
  prompt += "- Fade stars in blowout-likely games — garbage time kills props\n";
  prompt += "- Playoffs: minutes increase, role compression matters — fade role players, back stars hard\n\n";

  prompt += "WHAT MAKES A GREAT NBA TAKE:\n";
  prompt += "- Specific numbers (not 'high usage' — say '34.1% usage rate, 8.1 field goal attempts from 3')\n";
  prompt += "- Injury replacement named explicitly ('With Curry out, Wiggins gets 4+ extra 3PA per game')\n";
  prompt += "- Pace context ('Game total 228.5 = high pace = assists and PRA both elevated')\n";
  prompt += "- Matchup angle ('Facing bottom-5 rebounding team = KAT rebounds over is the play')\n\n";

  prompt += "INJURY REPORT (LIVE — from BallDontLie)\n" + injuryStr + "\n\n";
  prompt += "INJURY RULES — NON-NEGOTIABLE:\n";
  prompt += "- NEVER recommend a prop on a player listed Out without flagging it\n";
  prompt += "- If user asks about an injured player: acknowledge injury FIRST, pivot to replacement\n";
  prompt += "- Players marked ⚠️ INJURED in database below — skip them entirely for prop recommendations\n";
  prompt += "- When recommending 3-pointers made: check injury report first — if top shooters are out, say so and give healthy alternatives\n\n";

  prompt += "TODAY'S SCHEDULE\n" + gamesStr + "\n\n";
  prompt += "LAST NIGHT'S RESULTS\n" + lastNightStr + "\n\n";
  if (lastNightStatsStr) prompt += lastNightStatsStr + "\n\n";
  if (liveStatsStr) prompt += liveStatsStr + "\n\n";
  prompt += "LIVE SEASON AVERAGES (BallDontLie — 2024-25 season)\n" + seasonAvgsStr + "\n\n";
  prompt += propLinesStr + "\n\n";
  prompt += "CURATED PROP DATABASE (betting angles, floors, ceilings — injured players marked)\n" + playerDbStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";

  return prompt;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { question, players, context, liveMatches, history, matchupContext, image, nflContext, f1Context, nbaContext, sportHint } = req.body;
  if (!question) return res.status(400).json({ error: "Missing question" });

  const sport  = detectSport(question, sportHint, matchupContext);
  const isNFL  = sport === "nfl";
  const isF1   = sport === "f1";
  const isNBA  = sport === "nba";

  function buildOddsContext(odds) {
    if (!odds || (!odds.matches?.length && !odds.props?.length)) return null;
    const lines = [];
    if (odds.matches?.length) {
      lines.push("LIVE MATCH ODDS:");
      for (const m of odds.matches) {
        if (m.homeOdds !== null && m.awayOdds !== null) {
          lines.push("  " + m.home + " (" + (m.homeOdds > 0 ? "+" : "") + m.homeOdds + ") vs " + m.away + " (" + (m.awayOdds > 0 ? "+" : "") + m.awayOdds + ")");
        }
      }
    }
    return lines.length ? lines.join("\n") : null;
  }

  function buildDrawPath(results) {
    if (!Array.isArray(results) || !results.length) return null;
    const byRound = {};
    for (const r of results) {
      const round = r.round || "Unknown";
      if (!byRound[round]) byRound[round] = [];
      byRound[round].push(r);
    }
    const lines = [];
    for (const round in byRound) {
      lines.push(round + ":");
      for (const m of byRound[round]) lines.push("  " + m.winner + " def. " + m.loser + (m.score ? " (" + m.score + ")" : ""));
    }
    return lines.join("\n");
  }

  const oddsCtx       = buildOddsContext(req.body.oddsData);
  const drawPath      = buildDrawPath(req.body.tournamentResults);
  const matchupCtxStr = summarizeMatchupContext(matchupContext);

  let systemPrompt;

  if (isF1) {
    // Uses string concatenation — no template literals — safe in all Node ESM versions
    systemPrompt = buildF1SystemPrompt(f1Context, matchupCtxStr);

  } else if (isNBA) {
    // Uses string concatenation — no template literals — safe in all Node ESM versions
    systemPrompt = buildNbaSystemPrompt(nbaContext, matchupCtxStr);

  } else if (isNFL) {
    const relevantQBs = getRelevantQBs(question);
    const qbData      = JSON.stringify(relevantQBs, null, 0).slice(0, 9000);
    const skillData   = getRelevantSkillPlayers(question, nflContext);

    systemPrompt = `You are Under Review — a sharp sports betting intelligence tool covering NFL, NBA, tennis, and F1.
You answer whatever is asked. Never deflect. Never say "wrong sport."

IDENTITY
You are a sharp betting analyst — not a chatbot. Every response should read like it came from someone who has done the work, pulled the numbers, and is giving you their actual take with conviction.

STYLE
1-2 sentences of context max, then bullets. No walls of text. Lead with the answer, not the reasoning.

RESPONSE FORMAT — STRICT:
One sharp opening sentence. Then:
THE PLAY:
• [Player] — [OVER/UNDER line] — [floor/ceil] — [key reason in one line]
• [Second play if relevant]
FADE: [one line]
CONFIDENCE: [High / Medium / Speculative] — [one line why]
TIMING: [one line]

WHAT MAKES A GREAT NFL TAKE:
- Specific usage numbers (not "high volume" — say "8.1 rec/g, 166 targets")
- Role clarity (RB1 every down vs committee, WR1 vs slot)
- Matchup context (defense tier + specific player matchup)
- Injury replacement value (when starter is out, name the beneficiary and quantify the usage spike)
- Game script lean (if one team is likely trailing, pass volume increases)

NFL STAT GLOSSARY
ontgt = on-target throw % (league avg 74.9%) — above 78% is elite
badTh = bad throw rate (16.1% avg) — below 13% is elite
prss = pressure rate (21.9% avg) — above 25% is a liability
iay_pa = intended air yards per attempt — above 8.5 = deep thrower, below 6.5 = checkdown artist
ydsPg = yards per game | recPg = receptions per game | tgt = targets

KEY TD RATES (2025 season):
Derrick Henry (RB, BAL): 0.94 TDs/g — HIGHEST on tour
James Cook (RB, BUF): 0.88 TDs/g
De'Von Achane (RB, MIA): 0.86 TDs/g in 14g
Jonathan Taylor (RB, IND): 0.82 TDs/g
Puka Nacua (WR, LAR): 0 TDs — FADE as TD scorer always

2026 NFL DRAFT RESULTS (April 2026):
Pick 1: Tennessee Titans — Shedeur Sanders (QB). Win total 5-7. Fade early Titans totals — market overvalues rookie QBs.
Pick 2: Cleveland Browns — Mason Graham (DL). Defense improves but offense unchanged. Fade Browns win totals.
Pick 3: New York Giants — Abdul Carter (EDGE). Best pass rush ceiling in class. Giants defense now competitive.
Betting implication: Market overvalues rookie QB picks (Titans), undervalues EDGE picks (Giants).

DEFENSE TIERS (prop impact):
ELITE — hard fade opposing skill props: PHI, BAL, MIN, DEN
STRONG — lean fade: KC, SF, GB, BUF, HOU, TB, LAC, PIT
AVERAGE — neutral: NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO
WEAK — lean over: MIA, CIN, NYJ, NYG, ARI
BOTTOM — hard over on opposing props: TEN, CLE, LVR, CAR

KEY MATCHUP NOTES:
Pat Surtain II (DEN) = hard fade any WR1 he shadows
T.J. Watt (PIT) = fade opposing QB passing stats
Antoine Winfield Jr. (TB) = hard fade TE receiving yards

RB/WR/TE SKILL POSITION DATABASE
${skillData}

QB DATABASE
${qbData}

${matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr + "\n" : ""}${oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx : "No live lines — use database floors/ceilings for directional leans."}`;

  } else {
    // ── Tennis system prompt ─────────────────────────────────────────────────
    const t = context && context.currentTournament;
    const tournamentCtx = t
      ? "ACTIVE: " + t.name + " — " + t.surface + ", " + t.speed + " speed.\n" + (t.context || "") + "\nATP FAVORITE: " + (t.atp_favorite || "TBD") + "\nWTA FAVORITE: " + (t.wta_favorite || "TBD")
      : "Current tournament context not loaded. Answer from player database and surface Elo data.";

    const allTournaments = (context && context.tournaments)
      ? Object.values(context.tournaments).map(function(t2) {
          return t2.name + " (" + t2.surface + ", " + t2.speed + ") — ATP: " + (t2.atp_favorite || "TBD") + " / WTA: " + (t2.wta_favorite || "TBD");
        }).join("\n")
      : "Full season schedule unavailable.";

    const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable";

    const liveMatchStr = (Array.isArray(liveMatches) && liveMatches.length)
      ? liveMatches.slice(0, 12).map(function(m) {
          const home   = (m.raw && m.raw.home) || m.home_team || "?";
          const away   = (m.raw && m.raw.away) || m.away_team || "?";
          const round  = (m.raw && m.raw.round) || "Current Tournament";
          const isLive = String((m.raw && m.raw.live) || m.live || "0") === "1";
          const status = isLive ? "LIVE" : ((m.raw && m.raw.status) || "Scheduled");
          return home + " vs " + away + " — " + round + " — " + status;
        }).join("\n")
      : "No live matches currently";

    const acePropsStr = (context && context.ace_props)
      ? Object.entries(context.ace_props).map(function(entry) {
          const k = entry[0]; const v = entry[1];
          return k + ": hard avg " + v.avg_aces_hard + ", clay avg " + (v.avg_aces_clay || "n/a") + ", grass avg " + (v.avg_aces_grass || "n/a");
        }).join("\n")
      : "No ace baselines";

    systemPrompt = `You are Under Review — a sharp sports betting intelligence tool covering tennis, NFL, NBA, and F1.

IDENTITY
You are not a chatbot. You are a sharp betting analyst who happens to use an AI interface. Every response should read like it came from someone with real skin in the game — someone who has done the work, pulled the data, and is giving you their actual take.

STYLE
Lead with the take. Sharp, confident, direct. No hedging. No "it depends." No "UR TAKE:" prefix. No self-introduction. Write in short punchy paragraphs, not walls of text. Use plain English — no jargon unless it's explaining an edge.

RESPONSE STRUCTURE — ALWAYS FOLLOW THIS:
1. The take — one sharp opening sentence that answers the question directly
2. The reasoning — 2-4 sentences max explaining WHY using specific data (Elo gaps, surface splits, recent form)
3. The play — always end with a concrete actionable section formatted exactly like this:

THE PLAY:
• [Player name] — [specific bet type] — [key number or stat that supports it]
• [Second play if relevant] — [bet type] — [key stat]
TIMING: [when to act — before odds shift, before qualifying, now vs wait]
CONFIDENCE: [High / Medium / Speculative] — [one sentence why]

For match questions add: FADE: [who to avoid and why in one line]

WHAT MAKES A GREAT TENNIS TAKE:
- Specific surface Elo gaps (not just "good on clay" — give the cElo number vs hElo)
- Recency bias identification (market pricing hard court form into a clay tournament)
- Draw path analysis when available (who they have to beat to win)
- Serve/return matchup specifics (e.g. "his 68.2% tiebreak rate vs her 41.9% = fade the set spread")
- Timing context (futures now vs wait, live angle vs prematch)

SURFACE ELO GUIDE
hElo = hard court | cElo = clay | gElo = grass
Gap over 150 points = significant betting edge — always cite the specific numbers
Gap over 300 points = massive edge — lead with this

PROP ANGLES BY SURFACE
Clay: OVER total games almost always (long baseline rallies), UNDER aces for all but biggest servers
Grass: UNDER total games, OVER aces for big servers (Medvedev, Fritz, Bublik), tiebreaks extremely common
Hard: use individual player baselines from database

FUTURES FRAMEWORK (April 2026 — Clay Swing Window)
Miami Open just concluded. Upcoming: Madrid Open (clay, fast), Rome (clay, slow), Roland Garros (red clay, slowest).
Right now is the highest-value window for clay futures — books are still anchored to hard court form from Miami.
Players with cElo 150+ above their hElo are systematically underpriced for the next 6 weeks.
This window closes by Madrid semifinals when results start correcting the prices.
When asked about futures value: always identify the specific cElo vs hElo gap and name the player.

CALENDAR CONTEXT (April 2026)
Current: Post-Miami, pre-Madrid. Clay swing begins imminently.
Madrid: Clay, medium-fast. Outdoor. Favors power baseliners who can adapt.
Rome: Clay, slow. Outdoor. Pure clay specialists thrive.
Roland Garros: Red clay, slowest major. Ultimate clay specialist event.

CURRENT TOURNAMENT CONTEXT
${tournamentCtx}

ALL TOURNAMENTS THIS SEASON
${allTournaments}

LIVE MATCHES RIGHT NOW
${liveMatchStr}

PLAYER DATABASE
${playerDataStr}

ACE PROP BASELINES
${acePropsStr}

${oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx : "No live prop lines — directional leans only."}
${drawPath ? "TOURNAMENT DRAW PATH\n" + drawPath : ""}
${matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr : ""}`;
  }

  // ── Build messages ────────────────────────────────────────────────────────
  const messages = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-4)) {
      if (!msg || msg.loading) continue;
      const msgText = msg.text || msg.content;
      if (!msgText) continue;
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msgText });
    }
  }

  if (image && image.base64 && image.mediaType) {
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

  // ── Call Anthropic ────────────────────────────────────────────────────────
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
        max_tokens: 900,
        temperature: 0.45,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({ error: "AI response failed", details: data });
    }

    let text = cleanResponseText(
      (data && data.content ? data.content.filter(function(i) { return i.type === "text"; }).map(function(i) { return i.text; }).join("\n").trim() : "") || ""
    );

    if (text && responseLooksWrongForSport(text, sport)) {
      const correctionSystem = systemPrompt + "\n\nCORRECTION: Your previous response was off-topic. Answer ONLY as a " + sport.toUpperCase() + " analyst. Do not apologize. Do not mention another sport. Give a direct answer.";
      const correctionRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1200, temperature: 0.2, system: correctionSystem, messages }),
      });
      if (correctionRes.ok) {
        const correctionData = await correctionRes.json();
        text = cleanResponseText(
          (correctionData && correctionData.content ? correctionData.content.filter(function(i) { return i.type === "text"; }).map(function(i) { return i.text; }).join("\n").trim() : "") || ""
        );
      }
    }

    return res.status(200).json({ response: text || "Couldn't get a response. Try again." });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
