export const config = {
api: { bodyParser: { sizeLimit: “10mb” } },
};

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
function detectSport(question, sportHint, matchupContext) {
const q = String(question || “”).toLowerCase();

if (sportHint === “nfl” || sportHint === “tennis” || sportHint === “f1” || sportHint === “nba”) return sportHint;

const mcLeague = String((matchupContext && matchupContext.league) || “”).toLowerCase();
if (mcLeague.includes(“nfl”)) return “nfl”;
if (mcLeague.includes(“atp”) || mcLeague.includes(“wta”) || mcLeague.includes(“tennis”)) return “tennis”;

const explicitTennis = [“tennis”,“atp “,“wta “,“atp tour”,“wta tour”,“roland garros”,“french open”,“wimbledon”,“us open”,“australian open”,“indian wells”,“miami open”,“madrid open”,“rome open”,“queen’s club”,“halle open”,“monte carlo”,“monte-carlo”,“barcelona open”,“estoril”,“munich open”,“lyon open”,“geneva open”,“stuttgart open”,“eastbourne”,“birmingham”,“nottingham”,“s’hertogenbosch”,“hertogenbosch”,“toronto masters”,“montreal masters”,“cincinnati masters”,“miami masters”,“double fault”,“double faults”,“ace count”,“ace rate”,“service game”,“break point”,“tiebreak”,“clay court”,“grass court”,“hard court”,“surface elo”,“hold percentage”,“dominance ratio”,“ruud”,“cobolli”,“hurkacz”,“vacherot”,“alcaraz”,“sinner”,“djokovic”,“zverev”,“medvedev”,“tsitsipas”,“rublev”,“fritz”,“de minaur”,“draper”,“shelton”,“mensik”,“fils”,“lehecka”,“cerundolo”,“sabalenka”,“swiatek”,“rybakina”,“gauff”,“pegula”,“keys”,“osaka”,“andreeva”,“paolini”,“kartal”,“zheng”,“muchova”];
for (let i = 0; i < explicitTennis.length; i++) { if (q.includes(explicitTennis[i])) return “tennis”; }

if (q.includes(“nfl”)) return “nfl”;

const explicitF1 = [“formula 1”,“formula one”,“f1 race”,“f1 season”,“grand prix”,“verstappen”,“antonelli”,“george russell”,“oscar piastri”,“ferrari f1”,“mclaren f1”,“red bull f1”,“mercedes f1”,“pit stop”,“drs”,“qualifying f1”,“free practice f1”,“sprint race f1”,“constructor championship”,“driver championship”,“f1 driver”,“f1 team”,“miami grand prix”,“canadian grand prix”,“monaco grand prix”,“monaco gp”,“las vegas gp”,“abu dhabi gp”,“suzuka”,“silverstone f1”,“monza f1”,“spa f1”];
for (let i = 0; i < explicitF1.length; i++) { if (q.includes(explicitF1[i])) return “f1”; }

const explicitNba = [
“nba”,“basketball”,“lakers”,“celtics”,“warriors”,“nuggets”,“bucks”,“heat”,
“thunder”,“knicks”,“sixers”,“nets”,“bulls”,“cavaliers”,“clippers”,“suns”,
“mavericks”,“grizzlies”,“pelicans”,“jazz”,“kings”,“trail blazers”,“blazers”,
“rockets”,“spurs”,“raptors”,“magic”,“pacers”,“hawks”,“hornets”,“pistons”,“timberwolves”,
“jokic”,“gilgeous-alexander”,“shai”,“doncic”,“tatum”,“giannis”,“wembanyama”,
“brunson”,“steph curry”,“stephen curry”,“kevin durant”,“devin booker”,“ja morant”,
“anthony edwards”,“karl-anthony”,“tyrese haliburton”,“donovan mitchell”,
“bam adebayo”,“lebron”,“lamelo”,“damian lillard”,“trae young”,“kyrie”,
“anthony davis”,“rudy gobert”,“jaren jackson”,“desmond bane”,“lauri markkanen”,
“cade cunningham”,“paolo banchero”,“scottie barnes”,“franz wagner”,“alperen sengun”,
“jaylen brown”,“mikal bridges”,“og anunoby”,“josh hart”,“evan mobley”,
“jamal murray”,“anfernee simons”,“zach lavine”,“jordan poole”,“draymond”,
“3 pointer”,“3-pointer”,“three pointer”,“3pm”,“threes made”,“three pointers”,
“pra”,“pra over”,“pra under”,“points prop”,“rebounds prop”,“assists prop”,
“nba prop”,“nba props”,“player prop”,“prop bet”,“prop line”,“prop pick”,
“game total”,“points over”,“points under”,“rebounds over”,
“assists over”,“double double”,“triple double”,“usage rate”,“usage spike”,
“minutes prop”,“steal prop”,“block prop”,“fantasy basketball”,
“nba future”,“nba bet”,“nba pick”,“nba parlay”,“nba same game parlay”,
“nba playoff”,“nba finals”,“nba champion”,“nba mvp”,“defensive player”,
“box score”,“field goal”,“free throw”,“three point”,“paint points”,
“fast break”,“half court”,“second half”,“first half nba”,
];
for (let i = 0; i < explicitNba.length; i++) { if (q.includes(explicitNba[i])) return “nba”; }

const nflSignals = [“quarterback”,“qb “,“touchdown”,“touchdowns”,“interception”,“passing yards”,“rushing yards”,“receiving yards”,“fantasy football”,“super bowl”,“afc “,“nfc “,“wide receiver”,“running back”,“tight end”,“red zone”,“blitz”,“pocket”,“play action”,“offense”,“defense”,“defensive”,“offensive”,“cornerback”,“linebacker”,“pass rush”,“edge rusher”,“sacks”,“sack rate”,“draft pick”,“draft class”,“first round”,“win total”,“team total”,“season total”,“game script”,“skill position”,“divisional”,“bills”,“patriots”,“dolphins”,“jets”,“ravens”,“bengals”,“browns”,“steelers”,“texans”,“colts”,“jaguars”,“titans”,“chiefs”,“raiders”,“chargers”,“broncos”,“cowboys”,“giants”,“eagles”,“commanders”,“bears”,“lions”,“packers”,“vikings”,“falcons”,“panthers”,“saints”,“buccaneers”,“cardinals”,“rams”,“49ers”,“seahawks”,“mahomes”,“lamar”,“burrow”,“hurts”,“prescott”,“stroud”,“stafford”,“purdy”,“goff”,“daniels”,“cook”,“henry”,“taylor”,“robinson”,“achane”,“nacua”,“chase”,“pickens”,“lamb”,“mcbride”,“bowers”,“kelce”,“warren”,“draft”,“rookie”,“rookies”];
const tennisSignals = [“alcaraz”,“sinner”,“djokovic”,“zverev”,“medvedev”,“de minaur”,“shelton”,“fritz”,“sabalenka”,“swiatek”,“rybakina”,“pegula”,“gauff”,“muchova”,“osaka”,“keys”,“draper”,“fils”,“ruud”,“rublev”,“paolini”,“andreeva”,“kartal”,“zheng”,“mensik”,“bublik”,“tien”,“lehecka”,“cerundolo”,“cobolli”,“hurkacz”,“vacherot”,“surface elo”,“dominance ratio”,“hold percentage”,“tiebreak”,“double faults”,“double fault”,“ace rate”,“ace count”,“break point”,“clay court”,“grass court”,“hard court”,“draw path”,“monte carlo”,“clay swing”,“clay specialist”,“clay form”,“serve technique”,“second serve”,“first serve”];

let nfl = 0; let ten = 0; let nba = 0;
for (let i = 0; i < nflSignals.length; i++)    { if (q.includes(nflSignals[i]))    nfl += nflSignals[i].length > 7 ? 3 : nflSignals[i].length > 4 ? 2 : 1; }
for (let i = 0; i < tennisSignals.length; i++) { if (q.includes(tennisSignals[i])) ten += tennisSignals[i].length > 7 ? 3 : tennisSignals[i].length > 4 ? 2 : 1; }
const nbaSignals = [“points per game”,“rebounds per game”,“assists per game”,“per game”,“scorer”,“shooting”,“field goal percentage”,“three point percentage”,“playoff basketball”,“conference finals”,“nba season”];
for (let i = 0; i < nbaSignals.length; i++) { if (q.includes(nbaSignals[i])) nba += 3; }

if (nba > nfl && nba > ten) return “nba”;
if (ten > nfl) return “tennis”;
if (nfl > ten) return “nfl”;
if (nfl === 0 && ten === 0) {
if (q.includes(“prop”) || q.includes(“bet”) || q.includes(“pick”) || q.includes(“parlay”)) return “nba”;
}
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

prompt += “WHAT TO DO WHEN DATA IS MISSING:\n”;
prompt += “No prop lines? Use PRA floor/ceiling from the philosophy database. Say ‘directional lean’ not ‘I can’t answer’.\n”;
prompt += “No season averages? Use the curated database for player context. Omit team abbreviations.\n”;
prompt += “No game logs? Skip streak context. Still give the take.\n”;
prompt += “No games? Say it’s an off-night and give the best futures or next-game angle.\n\n”;

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
matchupContext, image, nflContext, nbaContext, sportHint,
// f1Context from client is accepted as fallback but we prefer server-fetched
f1Context: clientF1Context,
} = req.body;

if (!question) return res.status(400).json({ error: “Missing question” });

const sport = detectSport(question, sportHint, matchupContext);
const isNFL = sport === “nfl”;
const isF1  = sport === “f1”;
const isNBA = sport === “nba”;

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
// Always try to fetch live F1 data server-side first
// Fall back to client-provided context if fetch fails
const liveF1Data = fetchF1LiveData();
systemPrompt = buildF1SystemPrompt(liveF1Data, matchupCtxStr);

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