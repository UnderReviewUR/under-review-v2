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

  const explicitNba = ["nba ","nba,","nba.","nba?","basketball","lakers","celtics","warriors","nuggets","bucks","heat","thunder","knicks","sixers","nets","bulls","cavaliers","clippers","suns","mavericks","grizzlies","pelicans","jazz","kings","trail blazers","rockets","spurs","raptors","magic","pacers","hawks","hornets","pistons","timberwolves","jokic","gilgeous-alexander","doncic","tatum","giannis","wembanyama","brunson","steph curry","kevin durant","devin booker","ja morant","pra over","pra under","points prop","rebounds prop","assists prop","nba props","game total nba","nba future"];
  for (let i = 0; i < explicitNba.length; i++) { if (q.includes(explicitNba[i])) return "nba"; }

  const nflSignals = ["quarterback","qb ","touchdown","touchdowns","interception","passing yards","rushing yards","receiving yards","fantasy football","super bowl","afc ","nfc ","wide receiver","running back","tight end","red zone","blitz","pocket","play action","offense","defense","defensive","offensive","cornerback","linebacker","pass rush","edge rusher","sacks","sack rate","draft pick","draft class","first round","win total","team total","season total","game script","skill position","futures","divisional","playoff","bills","patriots","dolphins","jets","ravens","bengals","browns","steelers","texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos","cowboys","giants","eagles","commanders","bears","lions","packers","vikings","falcons","panthers","saints","buccaneers","cardinals","rams","49ers","seahawks","mahomes","lamar","burrow","hurts","prescott","stroud","stafford","purdy","goff","daniels","cook","henry","taylor","robinson","achane","nacua","chase","pickens","lamb","mcbride","bowers","kelce","warren","draft","rookie","rookies"];
  const tennisSignals = ["alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton","fritz","sabalenka","swiatek","rybakina","pegula","gauff","muchova","osaka","keys","draper","fils","ruud","rublev","paolini","andreeva","kartal","zheng","mensik","bublik","tien","lehecka","cerundolo","surface elo","dominance ratio","hold percentage","tiebreak","double faults","ace rate","break point","grand slam","clay court","grass court","hard court","draw path"];

  let nfl = 0;
  let ten = 0;
  for (let i = 0; i < nflSignals.length; i++)    { if (q.includes(nflSignals[i]))    nfl += nflSignals[i].length > 7 ? 3 : nflSignals[i].length > 4 ? 2 : 1; }
  for (let i = 0; i < tennisSignals.length; i++) { if (q.includes(tennisSignals[i])) ten += tennisSignals[i].length > 7 ? 3 : tennisSignals[i].length > 4 ? 2 : 1; }

  if (ten > nfl) return "tennis";
  if (nfl > ten) return "nfl";
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
  const standings  = ctx.standings    || "Live standings unavailable — answer from general 2026 F1 knowledge.";
  const upcoming   = ctx.upcomingRaces || "Race schedule unavailable.";
  const sessionStr = ctx.sessionStr   || "";
  const nextRace   = ctx.nextRace;

  let nextRaceStr = "Next race: TBD";
  if (nextRace) {
    let dateStr = "TBD";
    if (nextRace.date_start) {
      dateStr = new Date(nextRace.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    nextRaceStr = "NEXT RACE: " + (nextRace.meeting_name || "") + " — " + (nextRace.location || "") + " (" + dateStr + ")";
  }

  let prompt = "You are Under Review — a sharp sports betting intelligence tool covering Formula 1.\n\n";
  prompt += "STYLE: Lead with the take. Sharp, specific, confident. No markdown headers. No prefix.\n\n";
  prompt += "F1 BETTING MARKETS\n";
  prompt += "Race winner, podium finish, fastest lap, head-to-head matchups, championship outrights, grid position props.\n\n";
  prompt += "CIRCUIT TYPE BETTING GUIDE\n";
  prompt += "Street circuits (Monaco, Baku, Singapore, Las Vegas, Miami, Jeddah): High variance, safety cars likely, qualifying position critical, hard to overtake — lean pole sitter.\n";
  prompt += "Power circuits (Monza, Spa, Silverstone): Engine advantage decisive — favors Mercedes in 2026.\n";
  prompt += "High downforce (Hungary, Singapore): Aero efficiency matters most.\n";
  prompt += "Mixed (Bahrain, Australia, Japan, Canada): Championship form is the primary signal.\n\n";
  prompt += "2026 KEY NARRATIVES\n";
  prompt += "New 2026 regulations reshaped the entire grid. Mercedes-powered cars have the strongest power unit.\n";
  prompt += "Kimi Antonelli (Mercedes): Rookie leading the championship — extraordinary start.\n";
  prompt += "George Russell (Mercedes): Consistent P2, strong qualifier, proven race manager.\n";
  prompt += "Charles Leclerc (Ferrari): Elite qualifier, strong race pace but Ferrari reliability is a factor.\n";
  prompt += "Lewis Hamilton: Now at Ferrari after 12 years at Mercedes — adapting to new car feel.\n";
  prompt += "Lando Norris: 2025 world champion but McLaren struggling with 2026 regulations.\n";
  prompt += "Max Verstappen: Dominant 2023-2024 but Red Bull power unit significantly off the pace in 2026.\n\n";
  prompt += "CURRENT STANDINGS\n" + standings + "\n\n";
  prompt += nextRaceStr + "\n\n";
  prompt += "UPCOMING RACES\n" + upcoming + "\n\n";
  if (sessionStr) prompt += "LATEST SESSION\n" + sessionStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";
  prompt += "No live betting lines available — directional leans only.";
  return prompt;
}

// ── NBA prompt — pure string concatenation, zero template literals ─────────────
function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
  const ctx = nbaContext || {};

  let gamesStr = "No games today.";
  if (Array.isArray(ctx.todaysGames) && ctx.todaysGames.length > 0) {
    gamesStr = ctx.todaysGames.map(function(g) {
      const away = (g.awayTeam && g.awayTeam.tricode) || "AWAY";
      const home = (g.homeTeam && g.homeTeam.tricode) || "HOME";
      if (g.statusCode === 2) {
        const awayScore = (g.awayTeam && g.awayTeam.score) || 0;
        const homeScore = (g.homeTeam && g.homeTeam.score) || 0;
        return away + " vs " + home + " — LIVE Q" + (g.period || "?") + " " + awayScore + "-" + homeScore;
      }
      return away + " vs " + home + " — " + (g.status || "Tonight");
    }).join("\n");
  }

  let statsStr = "Season averages loaded — see player database.";
  if (Array.isArray(ctx.liveStats) && ctx.liveStats.length > 0) {
    statsStr = ctx.liveStats.map(function(p) {
      return p.name + " (" + p.team + "): " + p.pts + "pts " + p.reb + "reb " + p.ast + "ast " + p.min + "min";
    }).join("\n");
  }

  let playerDbStr = "Player database not loaded.";
  if (ctx.playerDb) {
    const entries = Object.entries(ctx.playerDb).slice(0, 40);
    playerDbStr = entries.map(function(entry) {
      const name = entry[0];
      const p    = entry[1];
      const pra  = ((p.pts || 0) + (p.reb || 0) + (p.ast || 0)).toFixed(1);
      const propFloor = (p.props && p.props.pra && p.props.pra.floor) || "—";
      const propCeil  = (p.props && p.props.pra && p.props.pra.ceil)  || "—";
      const lean      = (p.props && p.props.pra && p.props.pra.lean)  || (p.props && p.props.pts && p.props.pts.lean) || "—";
      return name + " | " + p.team + " | " + p.tier + " | " + p.pts + "pts " + p.reb + "reb " + p.ast + "ast | PRA: " + pra + " (floor " + propFloor + " / ceil " + propCeil + ") | " + lean;
    }).join("\n");
  }

  let prompt = "You are Under Review — a sharp sports betting intelligence tool covering NBA player props.\n\n";
  prompt += "STYLE: Lead with the take. Sharp, specific, confident. No markdown headers. No prefix.\n\n";
  prompt += "NBA PROP FORMAT\n";
  prompt += "For prop questions: Player — OVER/UNDER [line] — floor/ceil — primary reason.\n";
  prompt += "PRA = points + rebounds + assists. It is the most reliable multi-stat prop — lower variance than individual stats.\n\n";
  prompt += "KEY PROP PRINCIPLES\n";
  prompt += "- PRA is the safest multi-stat prop — back it as the primary vehicle\n";
  prompt += "- Injury replacement plays are the highest-confidence edge: when a teammate is out, usage spikes are predictable\n";
  prompt += "- Fade stars in blowout-likely games — garbage time caps stats\n";
  prompt += "- Game total (pace proxy) is the strongest contextual signal — more possessions = more counting stats\n";
  prompt += "- Rebounds are the most predictable individual prop — driven by position and matchup, not luck\n";
  prompt += "- Assists spike in fast-paced games; fade in slow half-court matchups\n\n";
  prompt += "TODAY'S GAMES\n" + gamesStr + "\n\n";
  prompt += "SEASON AVERAGES (top players)\n" + statsStr + "\n\n";
  prompt += "PLAYER DATABASE (with prop floors, ceilings, and betting angles)\n" + playerDbStr + "\n\n";
  if (matchupCtxStr) prompt += "MATCHUP CONTEXT\n" + matchupCtxStr + "\n\n";
  prompt += "No live lines unless provided — directional leans only.";
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

    systemPrompt = `You are Under Review — a sharp sports betting intelligence tool.
You cover NFL, tennis, NBA, and F1. You answer whatever is asked.

STYLE
Lead with the take. Sharp, concise, confident, specific. No markdown headers. No "UR TAKE:" prefix. No self-introduction.

OUTPUT RULES
- Prop questions: "Player — OVER/UNDER — why" format.
- Ranking questions: rank decisively, explain top 1-3.
- Futures questions: best bet, best value, best fade.
- Draft/rookie questions: focus on the 2026 NFL Draft (April 2026). Sanders went #1 to Titans.

NFL STAT GLOSSARY
ontgt = on-target throw % (league avg 74.9%) | badTh = bad throw rate (16.1% avg)
prss = pressure rate (21.9% avg) | iay_pa = intended air yards per attempt
ydsPg = yards per game | recPg = receptions per game

KEY TD RATES:
Derrick Henry (RB, BAL): 0.94 TDs/g, 15 total — HIGHEST
James Cook (RB, BUF): 0.88 TDs/g, 14 total
De'Von Achane (RB, MIA): 0.86 TDs/g, 12 total in 14g
Jonathan Taylor (RB, IND): 0.82 TDs/g, 14 total
Bijan Robinson (RB, ATL): 0.65 TDs/g, 11 total
Ja'Marr Chase (WR, CIN): 0.63 TDs/g, 10 total
Puka Nacua (WR, LAR): 0 TDs/g, 0 total — FADE TD scorer

2026 NFL DRAFT RESULTS (April 2026):
Pick 1: Tennessee Titans — Shedeur Sanders (QB, Colorado). Titans win total 5-7. Bottom-5 supporting cast. Fade early Titans totals.
Pick 2: Cleveland Browns — Mason Graham (DL, Michigan). Pass rush improves but defense alone doesn't win games.
Pick 3: New York Giants — Abdul Carter (EDGE, Penn State). Best pass rush ceiling in class. Giants defense becomes competitive.

DEFENSE TIERS:
ELITE (hard fade opposing props): PHI, BAL, MIN, DEN
STRONG (lean fade): KC, SF, GB, BUF, HOU, TB, LAC, PIT
AVERAGE (neutral): NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO
WEAK (lean over): MIA, CIN, NYJ, NYG, ARI
BOTTOM (hard over): TEN, CLE, LVR, CAR

RB/WR/TE SKILL POSITION DATABASE
${skillData}

QB DATABASE
${qbData}

${matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr + "\n" : ""}${oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx : "No live lines — directional leans only."}`;

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

    systemPrompt = `You are Under Review — a sharp sports betting intelligence tool covering tennis and NFL.

STYLE
Lead with the take. Sharp, confident, natural, specific. No markdown headers. No "UR TAKE:" prefix.
Never say you lack data — pivot to what you know from the player database and surface Elo.

SURFACE ELO GUIDE
hElo = hard court Elo | cElo = clay Elo | gElo = grass Elo
Surface Elo gaps over 150 points are significant betting edges.

PROP ANGLES BY SURFACE
Clay: OVER games almost always, UNDER aces for most players
Grass: UNDER games, OVER aces for big servers, tiebreaks common
Hard: use player baselines from database

FORMAT
Prop questions: bullet format — Player — Prop — one key stat.
Broader questions: prose first, then 1-2 prop bullets if relevant.

CALENDAR CONTEXT (April 2026)
Miami Open 2026 concluded. Upcoming: Madrid Open (clay), Rome (clay), Roland Garros (clay).
Clay swing is the next major betting window — use cElo as primary signal.

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
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
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
