export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

// ── NFL QB Database ───────────────────────────────────────────────────────────
const NFL_QBS = {
  "Josh Allen":      { team:"BUF", tier:"ELITE", passing:{ gs:17, cmp:69.3, yds:3668, td:25, int:10, ypa:8.0, rate:102.2, qbr:65.4 }, advanced:{ ontgt:79.9, badTh:13.0, prss:18.0, pktTime:2.5, iay_pa:7.3 }, trend:{ ontgt_delta:+5.1, note:"On-target jumped 5.1pts YoY — accuracy genuinely elite now" }, rushing:{ attPg:6.6, ydsPg:34.1, tdPg:0.82, ypc:5.2, tier:"ELITE RUSHER" }, props:{ passYds:{ floor:215, ceil:310, lean:"OVER in shootouts" }, rushYds:{ floor:25, ceil:65, lean:"OVER most weeks" }, best:"Rushing yards OVER — most reliable Allen prop" }, futures:{ wins:"12-13", playoff:"95%+", mvp:"Top-5" }, note:"79.9% on-target plus elite rushing floor = safest QB1 in football. Rushing OVER is the lean every week." },
  "Drake Maye":      { team:"NE",  tier:"ELITE", passing:{ gs:17, cmp:72.0, yds:4394, td:31, int:8,  ypa:8.9, rate:113.5, qbr:77.1 }, advanced:{ ontgt:79.0, badTh:13.8, prss:21.8, pktTime:2.4, iay_pa:9.1 }, trend:{ ontgt_delta:+2.8, note:"On-target improved 2.8pts as a rookie. 9.1 IAY/PA is elite deep-ball aggression." }, rushing:{ attPg:6.1, ydsPg:26.5, tdPg:0.24, ypc:4.4, tier:"STRONG RUSHER" }, props:{ passYds:{ floor:230, ceil:320, lean:"OVER — 8.9 Y/A with elite on-target" }, rushYds:{ floor:15, ceil:45, lean:"OVER — market underprices his legs" }, best:"Rushing yards OVER — massively undervalued" }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"QBR 77.1 as a rookie is historically rare. 9.1 IAY/PA attacks downfield. Rushing (26.5 yds/g) adds floor the market ignores." },
  "Patrick Mahomes": { team:"KC",  tier:"ELITE", passing:{ gs:14, cmp:62.7, yds:3587, td:22, int:11, ypa:7.1, rate:89.6,  qbr:68.5 }, advanced:{ ontgt:74.3, badTh:17.9, prss:24.0, pktTime:2.2, iay_pa:7.9 }, trend:{ ontgt_delta:-2.6, note:"Accuracy dropped 2.6pts — weapons-driven regression. Expect return to 76-77% with better receivers." }, rushing:{ attPg:4.6, ydsPg:30.1, tdPg:0.36, ypc:6.6, tier:"ELITE RUSHER" }, props:{ rushYds:{ floor:18, ceil:45, lean:"OVER — 30.1 yds/g at 6.6 Y/att is chronically ignored" }, best:"Rushing yards OVER. Chiefs ML in any playoff spot — ALWAYS." }, futures:{ wins:"11-13", playoff:"85%+", mvp:"Top-3" }, note:"2.2 pocket time — quickest release among elite QBs. 30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football." },
  "Lamar Jackson":   { team:"BAL", tier:"ELITE", passing:{ gs:13, cmp:63.6, yds:2549, td:21, int:7,  ypa:8.4, rate:103.8, qbr:62.7 }, advanced:{ ontgt:72.4, badTh:18.3, prss:23.6, pktTime:2.5, iay_pa:8.8 }, trend:{ ontgt_delta:-6.3, note:"ON-TARGET DROPPED 6.3pts — biggest regression in league. Most alarming hidden AFC development." }, rushing:{ attPg:5.2, ydsPg:26.8, tdPg:0.15, ypc:5.2, tier:"STRONG RUSHER" }, props:{ rushYds:{ floor:30, ceil:75, lean:"OVER every week" }, best:"Rushing yards OVER + TD scorer OVER" }, futures:{ wins:"11-13 healthy", playoff:"85%+", mvp:"Top-3 if fully healthy" }, note:"72.4% on-target DROPPED 6.3pts is the hidden concern. Rushing floor covers it. Sack rate (10.65%) is the real risk." },
  "Joe Burrow":      { team:"CIN", tier:"ELITE", passing:{ gs:8,  cmp:66.8, yds:1809, td:17, int:5,  ypa:7.0, rate:100.7, qbr:63.0, note:"8 games only — prior season 80.3% on-target is true baseline" }, advanced:{ ontgt:75.0, badTh:11.3, prss:21.7, pktTime:2.3, iay_pa:7.2 }, rushing:{ attPg:1.75, ydsPg:5.1, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.13, lean:"OVER 1.5 — most reliable TD rate in AFC when healthy" }, best:"TD OVER 1.5 when healthy — 2.13/g is elite" }, futures:{ wins:"11-13 healthy", playoff:"80%+", mvp:"Top-3 if full season" }, note:"Prior season 80.3% on-target is the real Burrow. 11.3% bad throw rate is cleanest in league. Bet TDs aggressively when healthy." },
  "Matthew Stafford":{ team:"LAR", tier:"ELITE", passing:{ gs:17, cmp:65.0, yds:4707, td:46, int:8,  ypa:7.9, rate:109.2, qbr:71.2 }, advanced:{ ontgt:73.6, badTh:18.1, prss:18.5, pktTime:2.4, iay_pa:9.0 }, trend:{ ontgt_delta:-0.7, prss_delta:-3.8, note:"Pressure rate IMPROVED 3.8pts — Rams line got better." }, rushing:{ attPg:1.7, ydsPg:0.1, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.71, lean:"OVER 2.5 — 46 TDs in 17 games is best TD rate in football" }, best:"Passing TDs OVER 2.5 — 2.71/g is best single-player prop in NFC." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-3" }, note:"9.0 IAY/PA highest among all starters. 3.71% sack rate lowest in league. TD prop (OVER 2.5) at 2.71/g is most reliable single-player prop in the NFC." },
  "Dak Prescott":    { team:"DAL", tier:"ELITE", passing:{ gs:17, cmp:67.3, yds:4552, td:30, int:10, ypa:7.6, rate:99.5,  qbr:70.2 }, advanced:{ ontgt:74.8, badTh:12.5, prss:21.6, pktTime:2.4, iay_pa:8.0 }, trend:{ ontgt_delta:+3.5, prss_delta:-4.0, note:"On-target improved 3.5pts. Pressure rate dropped 4.0pts — genuine two-way improvement." }, rushing:{ attPg:3.1, ydsPg:10.4, tier:"OCCASIONAL" }, props:{ passTd:{ pg:1.76, lean:"OVER 1.5 reliably" }, best:"Lamb receiving props OVER. PA yards OVER when available." }, futures:{ wins:"9-11", playoff:"55-65%", mvp:"Top-5 individually" }, note:"QBR 70.2 is elite. 12.5% bad throw rate is cleanest among ELITE tier QBs. Always bet Prescott individually. Always fade Cowboys in team futures." },
  "Jordan Love":     { team:"GB",  tier:"ELITE", passing:{ gs:15, cmp:66.3, yds:3381, td:23, int:6,  ypa:7.7, rate:101.2, qbr:72.7 }, advanced:{ ontgt:77.4, badTh:14.6, prss:22.1, pktTime:2.4, iay_pa:8.7 }, trend:{ ontgt_delta:+4.2, note:"On-target improved 4.2pts — most underreported QB development in NFC. Real improvement, not noise." }, rushing:{ attPg:3.1, ydsPg:13.3, tier:"USEFUL RUSHER" }, props:{ best:"Love is consistently undervalued. QBR 72.7 with only 6 INTs." }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"Most underrated QB in football. QBR 72.7 with 6 INTs in 15 games. On-target jumped 4.2pts. Buy everywhere at depressed ADP." },
  "Jared Goff":      { team:"DET", tier:"STARTER", passing:{ gs:17, cmp:68.0, yds:4564, td:34, int:8, ypa:7.9, rate:105.5, qbr:57.3 }, advanced:{ ontgt:78.3, badTh:15.8, prss:24.5, pktTime:2.3, iay_pa:6.4 }, trend:{ ontgt_delta:-2.2, prss_delta:+3.6, note:"On-target dropped slightly. QB hits jumped to 76 — line regressed." }, rushing:{ attPg:1.1, ydsPg:2.6, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.0, lean:"OVER 1.5 every week — 34 TDs (2.0/g) most reliable TD rate in NFC" }, best:"Passing TDs OVER 1.5 every week." }, futures:{ wins:"11-13", playoff:"80-85%" }, note:"1502 PA yards league best. McVay pre-snap motion scheme beats every zone. TD prop (2.0/g) most reliable in NFC. FADE in cold outdoor road games." },
  "Brock Purdy":     { team:"SF",  tier:"STARTER", passing:{ gs:9,  cmp:69.4, yds:2167, td:20, int:10, ypa:7.6, rate:100.5, qbr:72.8, note:"9 games only" }, advanced:{ ontgt:82.2, badTh:12.3, prss:21.1, pktTime:2.7, iay_pa:7.5 }, rushing:{ attPg:3.7, ydsPg:16.3, tier:"USEFUL RUSHER" }, props:{ passTd:{ pg:2.22, lean:"OVER 2.0 — scheme generates TDs efficiently" }, best:"CMC and Aiyuk receiving props OVER. Purdy TD OVER 2.0 when healthy." }, futures:{ wins:"10-12", playoff:"70-80% healthy", mvp:"Top-5 if healthy" }, note:"82.2% on-target highest among all starters. CMC health is the multiplier for everything." },
  "Jalen Hurts":     { team:"PHI", tier:"STARTER", passing:{ gs:16, cmp:64.8, yds:3224, td:25, int:6, ypa:7.1, rate:98.5, qbr:55.2 }, advanced:{ ontgt:74.0, badTh:16.7, prss:20.0, pktTime:2.5, iay_pa:9.0 }, trend:{ ontgt_delta:-5.1, note:"ON-TARGET DROPPED 5.1pts (79.1 to 74.0) — needs monitoring." }, rushing:{ attPg:6.6, ydsPg:26.3, tdPg:0.50, tier:"STRONG RUSHER" }, props:{ rushYds:{ lean:"OVER every week — designed runs schemed regardless of game script" }, best:"Rushing yards OVER. Floor guaranteed by scheme design." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-5" }, note:"On-target dropped 5.1pts — the hidden concern. Rushing floor (designed runs 6.6/g) covers any passing variance. Start every week, never sit." },
  "C.J. Stroud":     { team:"HOU", tier:"STARTER", passing:{ gs:14, cmp:64.5, yds:3041, td:19, int:8, ypa:7.2, rate:92.9, qbr:61.7 }, advanced:{ ontgt:74.6, badTh:17.6, prss:21.4, pktTime:2.4, iay_pa:7.9 }, trend:{ ontgt_delta:+1.3, prss_delta:-6.6, note:"PRESSURE RATE DROPPED 6.6pts — biggest protection improvement in league." }, rushing:{ attPg:3.4, ydsPg:14.9, tier:"USEFUL RUSHER" }, props:{ best:"Collins receiving props OVER — primary connection" }, futures:{ wins:"10-12", playoff:"75-85%", mvp:"Top-8 if full year" }, note:"Pressure rate dropping 6.6pts YoY is the key development. Year 3 with healthy weapons projects top-8 QB." },
  "Trevor Lawrence": { team:"JAX", tier:"STARTER", passing:{ gs:17, cmp:60.9, yds:4007, td:29, int:12, ypa:7.2, rate:91.0, qbr:58.3 }, advanced:{ ontgt:73.7, badTh:14.4, prss:21.8, pktTime:2.4, iay_pa:8.7 }, trend:{ ontgt_delta:0, prss_delta:+6.6, note:"On-target flat two straight seasons. Pressure rate jumped 6.6pts — line protection worsened." }, rushing:{ attPg:4.8, ydsPg:21.1, tdPg:0.53, tier:"STRONG RUSHER" }, props:{ best:"Total TDs OVER — rushing TDs (0.53/g) + passing TDs is the most underrated bet on his slate." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"73.7% on-target flat for two straight seasons is a confirmed pattern. Total TD prop (rushing + passing) is the most underrated bet." },
  "Jayden Daniels":  { team:"WAS", tier:"STARTER", passing:{ gs:7,  cmp:60.6, yds:1262, td:8, int:3, ypa:6.7, rate:88.1, qbr:44.7, note:"7 games only" }, advanced:{ ontgt:76.4, badTh:14.9, prss:16.7, pktTime:2.3, iay_pa:7.2 }, rushing:{ attPg:8.3, ydsPg:39.7, tdPg:0.29, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER every week — 39.7 yds/g pace is best in NFC" }, best:"Rushing yards OVER. Most undervalued NFC QB prop when healthy." }, futures:{ wins:"9-11", playoff:"50-60%", mvp:"Top-5 if stays healthy" }, note:"39.7 rushing yds/g pace in 7 games matches Josh Allen's baseline. Health is the only real question." },
  "Caleb Williams":  { team:"CHI", tier:"STARTER", passing:{ gs:17, cmp:58.1, yds:3942, td:27, int:7, ypa:6.9, rate:90.1, qbr:58.2 }, advanced:{ ontgt:69.8, badTh:20.7, prss:25.1, pktTime:2.5, iay_pa:8.5 }, trend:{ ontgt_delta:-2.6, note:"On-target declined further to 69.8% — two straight seasons below 73%." }, rushing:{ attPg:4.5, ydsPg:22.8, tier:"STRONG RUSHER" }, props:{ best:"Bears team total OVER — best cast Williams has had. Year 2 breakout expected." }, futures:{ wins:"10-12", playoff:"60-70%", mvp:"Top-8 if accuracy improves" }, note:"69.8% on-target lowest among all starters. 20.7% bad throw rate second highest. Year 2 with better cast is the buy." },
  "Bo Nix":          { team:"DEN", tier:"STARTER", passing:{ gs:17, cmp:63.4, yds:3931, td:25, int:11, ypa:6.4, rate:87.8, qbr:58.3 }, advanced:{ ontgt:77.4, badTh:15.9, prss:19.1, pktTime:2.4, iay_pa:7.3 }, rushing:{ attPg:4.9, ydsPg:20.9, tier:"STRONG RUSHER" }, props:{ best:"Broncos team total UNDER vs elite offenses. Nix rushing OVER — 8.8 yds/scramble." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"RPO scheme is where Denver generates offense. 6.4 Y/A ceiling by design. Bet Broncos in defensive scripts, fade in shootouts." },
  "Baker Mayfield":  { team:"TB",  tier:"STARTER", passing:{ gs:17, cmp:63.2, yds:3693, td:26, int:11, ypa:6.8, rate:90.6, qbr:61.3 }, advanced:{ ontgt:73.7, badTh:15.7, prss:14.8, pktTime:2.3, iay_pa:8.0 }, trend:{ ontgt_delta:-4.9, note:"ON-TARGET DROPPED 4.9pts — most concerning regression among mid-tier starters." }, rushing:{ attPg:3.2, ydsPg:22.5, ypc:6.9, tier:"STRONG RUSHER" }, props:{ best:"Evans TD scorer OVER. Mayfield rushing yards OVER — 8.9 yds/scramble is elite." }, futures:{ wins:"8-10", playoff:"50-60%" }, note:"On-target dropped 4.9pts. Evans health drove it. 8.9 yds/scramble is surprisingly elite." },
  "Kyler Murray":    { team:"MIN", tier:"STARTER", passing:{ gs:5, cmp:68.3, yds:962, td:6, int:3, note:"5 games pre-trade — prior full season (79.1% on-target, 16.3% pressure) is true baseline" }, rushing:{ attPg:5.8, ydsPg:34.6, ypc:6.0, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER when healthy — 34.6 yds/g with cleanest fumble rate among mobile QBs" }, best:"Vikings team total OVER when Murray confirmed healthy." }, futures:{ wins:"10-13 healthy", playoff:"70-80% healthy", mvp:"Top-5 if healthy full season" }, note:"O'Connell turned Darnold into 14-3 QB — what does it do with the most athletically gifted QB? Jefferson is generational. Health is the only ceiling." },
  "Jaxson Dart":     { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12, cmp:63.7, yds:2272, td:15, int:5, ypa:6.7, rate:91.7, qbr:57.5 }, advanced:{ ontgt:72.9, badTh:15.5, prss:23.3, pktTime:2.4, iay_pa:8.1 }, rushing:{ attPg:6.1, ydsPg:34.8, tdPg:0.64, ypc:5.7, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER — wildly undervalued. Market ignores 34.8 yds/g completely." }, best:"Rushing yards OVER every week — most undervalued prop in the NFC." }, futures:{ wins:"7-9", playoff:"30-40%" }, note:"34.8 rushing yds/g at 5.7 Y/att as a pocket passer is the best prop edge in the NFC. Market completely ignores it." },
  "Sam Darnold":     { team:"SEA", tier:"STARTER", passing:{ gs:17, cmp:67.7, yds:4048, td:25, int:14, ypa:8.5, rate:99.1, qbr:55.6, note:"With MIN under O'Connell — career norms outside that system: 73-75% on-target, INT-prone" }, advanced:{ ontgt:79.8, badTh:14.6, prss:21.0, pktTime:2.4, iay_pa:7.8 }, rushing:{ attPg:2.1, ydsPg:5.6, tier:"POCKET ONLY" }, props:{ best:"Darnold INT OVER 0.5 every week. Scheme regression from MIN to SEA." }, futures:{ wins:"7-10", playoff:"40-50%" }, note:"14-3 and 79.8% on-target was O'Connell scheme and Jefferson. Without either, expect regression. INT OVER 0.5 every week." },
  "Shedeur Sanders": { team:"CLE", tier:"BELOW_AVG", passing:{ gs:7, cmp:56.6, yds:1400, td:7, int:10, ypa:6.6, rate:68.1, qbr:18.9 }, advanced:{ ontgt:69.6, badTh:18.0, prss:40.3, pktTime:2.6, iay_pa:7.2 }, rushing:{ attPg:2.6, ydsPg:21.1, ypc:8.0, tier:"STRONG RUSHER" }, props:{ best:"Browns team total UNDER. Sacks taken OVER every week." }, futures:{ wins:"4-7", playoff:"5-10%" }, note:"40.3% PRESSURE RATE — worst in NFL history. League average is 21.9%. Stats are meaningless without context. 2026 is the true eval year." },
  "Cam Ward":        { team:"TEN", tier:"BELOW_AVG", passing:{ gs:17, cmp:59.8, yds:3169, td:15, int:7, ypa:5.9, rate:80.2, qbr:33.2 }, advanced:{ ontgt:72.6, badTh:19.0, prss:27.8, pktTime:2.4, iay_pa:7.2 }, rushing:{ attPg:2.3, ydsPg:9.4, tier:"OCCASIONAL" }, props:{ best:"Titans team total UNDER. Sacks taken OVER." }, futures:{ wins:"5-8", playoff:"10-15%" }, note:"27.8% pressure rate on a bad line. 19.0% bad throw rate. Arm talent is real but weapons and line must improve before investing. 2026 is still development year." },
};

// ── Sport detection ───────────────────────────────────────────────────────────
function detectSport(question, sportHint) {
  const q = String(question || "").toLowerCase();
  if (sportHint === "nfl" || sportHint === "tennis") return sportHint;

  // Hard-check: the word "nfl" alone settles it immediately.
  if (q.includes("nfl")) return "nfl";

  const nflSignals = [
    // Core positions & football concepts
    "quarterback","qb","touchdown","touchdowns","interception","interceptions",
    "passing yards","rushing yards","receiving yards","fantasy football","super bowl",
    "afc","nfc","wide receiver","running back","tight end","red zone","scramble",
    "blitz","pocket","play action","rpo","offense","defense","defenses","defensive",
    "offensive","secondary","cornerback","linebacker","safety","pass rush",
    "pass rusher","edge rusher","interior lineman","sacks","sack","pressure rate",
    "draft pick","draft class","first round","win total","team total","season total",
    "week","game script","rb","wr","te","receiver","futures","divisional","playoff",
    // Teams
    "bills","patriots","dolphins","jets","ravens","bengals","browns","steelers",
    "texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos",
    "cowboys","giants","eagles","commanders","bears","lions","packers","vikings",
    "falcons","panthers","saints","buccaneers","cardinals","rams","49ers","seahawks",
    // Players
    "allen","mahomes","lamar","burrow","hurts","prescott","stroud","herbert",
    "maye","love","darnold","stafford","purdy","goff","daniels","caleb williams",
    "cam ward","bo nix","lawrence","dart","bryce young","mayfield","penix","jackson",
    "shough","brissett","cook","henry","taylor","robinson","achane","nacua","chase",
    "pickens","lamb","mcbride","bowers","kelce","warren","surtain","watt","bosa",
    "parsons","micah","myles garrett","tj watt","nick bosa","von miller",
    // Draft & roster language
    "draft","rookie","rookies","incoming","prospect","prospects","mock draft",
    "first overall","top pick",
  ];

  const tennisSignals = [
    "tennis","atp","wta","miami open","roland garros","french open","wimbledon",
    "us open","australian open","indian wells","clay court","grass court",
    "hard court","serve","aces","ace rate","double faults","break point",
    "hold percentage","tiebreak","tiebreaks","surface elo","dominance ratio",
    "alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton",
    "fritz","sabalenka","swiatek","rybakina","pegula","gauff","muchova",
    "osaka","keys","draper","fils","ruud","rublev","paolini","andreeva",
    "draw path","grand slam","tour","match play",
  ];

  let nfl = 0, tennis = 0;
  for (const s of nflSignals)    { if (q.includes(s)) nfl    += s.length > 6 ? 2 : 1; }
  for (const s of tennisSignals) { if (q.includes(s)) tennis += s.length > 6 ? 2 : 1; }

  if (tennis > nfl) return "tennis";
  if (nfl > tennis) return "nfl";
  // Tie / no signals: default to NFL (most ambiguous betting questions are football)
  return "nfl";
}

function getRelevantQBs(question) {
  const q = question.toLowerCase();
  const relevant = {};
  for (const [name, data] of Object.entries(NFL_QBS)) {
    const parts = name.toLowerCase().split(" ");
    if (parts.some(p => p.length > 3 && q.includes(p))) relevant[name] = data;
    if (data.team && q.includes(data.team.toLowerCase())) relevant[name] = data;
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
  const generic = ["rb","wr","te","touchdown","td","receiving","rushing","catches","yards","prop"];
  if (generic.some(n => q.includes(n))) return blocks.slice(0, 20).join("\n\n");
  return blocks.slice(0, 10).join("\n\n");
}

function summarizeMatchupContext(mc) {
  if (!mc) return null;
  const parts = [];
  if (mc.title)       parts.push(`Title: ${mc.title}`);
  if (mc.league)      parts.push(`League: ${mc.league}`);
  if (mc.time)        parts.push(`Time: ${mc.time}`);
  if (mc.whatMatters) parts.push(`What matters: ${mc.whatMatters}`);
  if (Array.isArray(mc.quickHitters) && mc.quickHitters.length) parts.push(`Quick hitters: ${mc.quickHitters.join(" | ")}`);
  return parts.join("\n");
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

  const { question, players, context, liveMatches, tour, history, matchupContext, image, nflContext, sportHint } = req.body;
  if (!question) return res.status(400).json({ error: "Missing question" });

  const sport = detectSport(question, sportHint);
  const isNFL = sport === "nfl";

  // ── Prompt builders ───────────────────────────────────────────────────────
  function buildOddsContext(odds) {
    if (!odds || (!odds.matches?.length && !odds.props?.length)) return null;
    const lines = [];
    if (odds.matches?.length) {
      lines.push("LIVE MATCH ODDS:");
      for (const m of odds.matches) {
        if (m.homeOdds !== null && m.awayOdds !== null) {
          lines.push(`  ${m.home} (${m.homeOdds > 0 ? "+" : ""}${m.homeOdds}) vs ${m.away} (${m.awayOdds > 0 ? "+" : ""}${m.awayOdds})`);
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
    for (const [round, matches] of Object.entries(byRound)) {
      lines.push(`${round}:`);
      for (const m of matches) lines.push(`  ${m.winner} def. ${m.loser}${m.score ? ` (${m.score})` : ""}`);
    }
    return lines.join("\n");
  }

  const oddsCtx  = buildOddsContext(req.body.oddsData);
  const drawPath = buildDrawPath(req.body.tournamentResults);
  const matchupCtxStr = summarizeMatchupContext(matchupContext);

  // ── NFL system prompt ─────────────────────────────────────────────────────
  let systemPrompt;

  if (isNFL) {
    const relevantQBs = getRelevantQBs(question);
    const qbData      = JSON.stringify(relevantQBs, null, 0).slice(0, 9000);
    const skillData   = getRelevantSkillPlayers(question, nflContext);

    systemPrompt = `You are Under Review's sports betting answer engine for the NFL.

STYLE
Lead with the take. Be sharp, concise, confident, specific. No markdown headers. No "UR TAKE:" prefix. No self-introduction. No meta commentary.

OUTPUT RULES
- Prop questions: "Player — OVER/UNDER — why" format.
- Ranking questions: rank decisively, explain top 1-3.
- Comparison questions: pick a side, then explain.
- Futures questions: best bet, best value, best fade.
- Draft/rookie questions: focus on the UPCOMING 2026 NFL Draft (April 2026), not the 2025 class.
- If data clearly supports a conclusion, do not hedge.

NFL STAT GLOSSARY
ontgt = on-target throw % (league avg 74.9%)
badTh = bad throw rate % (league avg 16.1%)
prss  = pressure rate % (league avg 21.9% — above is a problem)
iay_pa = intended air yards per attempt (8.5+ = deep, 6.5- = checkdown)
ydsPg = yards per game | td = touchdowns | recPg = receptions per game

KEY TD RATES (for TD leader questions):
Derrick Henry (RB, BAL): 0.94 TDs/g, 15 total — HIGHEST TD RATE
James Cook (RB, BUF): 0.88 TDs/g, 14 total
De'Von Achane (RB, MIA): 0.86 TDs/g, 12 total in 14g
Jonathan Taylor (RB, IND): 0.82 TDs/g, 14 total
Bijan Robinson (RB, ATL): 0.65 TDs/g, 11 total
Ja'Marr Chase (WR, CIN): 0.63 TDs/g, 10 total
Puka Nacua (WR, LAR): 0 TDs/g, 0 total — FADE TD scorer

2026 NFL DRAFT CONTEXT (April 2026 — UPCOMING)
When asked about "the draft", "incoming rookies", "this year's draft class" — answer about the April 2026 NFL Draft, not the 2025 class.
Top prospects entering the 2026 season:
- Shedeur Sanders (QB, Colorado) — projected top-5 pick. Most NFL-ready QB in the class. Pro-style offense, 74% completion rate. Giants (pick 3) and Titans (pick 1) are primary destinations. Whichever team drafts him sees win total jump 1.5-2 games immediately. His landing spot is the single biggest betting market mover in the draft.
- Travis Hunter (CB/WR, Colorado) — best athlete in the draft. Two-way player but betting impact limited by usage uncertainty. Heisman winner, elite talent. Team buying him as a WR or CB changes how to price him.
- Mason Graham (DL, Michigan) — drafted #2 by Cleveland Browns. Elite interior pass rusher, immediate impact on Browns pass rush. Improves Cleveland from bottom-tier to average defense.
- Abdul Carter (EDGE, Penn State) — drafted #3 by New York Giants. Highest pass rush ceiling in class, 2025 Big Ten Defensive Player of Year. Immediately improves Giants' defense from weak to competitive.
- Shedeur Sanders (QB, Colorado) — drafted by Tennessee Titans #1 overall. Most NFL-ready QB, 74% completion rate. Titans win total jumps 1.5-2 games immediately. Biggest single market mover.
- Travis Hunter (CB/WR, Colorado) — Heisman winner with two-way versatility. Betting impact depends on usage designation at landing team.
- Tetairoa McMillan (WR, Arizona) — best WR in the class. Already drafted by Giants (note: in database). Nabers-level talent — whoever QBs with him sees the WR1 role immediately.
2026 DRAFT RESULTS (April 2026 — now confirmed):
Pick 1: Tennessee Titans — Shedeur Sanders (QB, Colorado) — Titans win total up 1.5-2 games
Pick 2: Cleveland Browns — Mason Graham (DL, Michigan) — Browns pass rush improves immediately  
Pick 3: New York Giants — Abdul Carter (EDGE, Penn State) — Giants defense improves to competitive
Shedeur Sanders is the primary single betting market mover. QBs change win totals faster than any other position.

DEFENSE TIERS (for matchup-adjusted prop leans):
ELITE (hard fade all props): PHI, BAL, MIN, DEN
STRONG (lean fade props): KC, SF, GB, BUF, HOU, TB, LAC, PIT
AVERAGE (neutral): NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO
WEAK (lean over props): MIA, CIN, NYJ, NYG, ARI
BOTTOM (hard over props): TEN, CLE, LVR, CAR

KEY MATCHUP RULES:
- ELITE pass rush teams (PHI, BAL, PIT, DEN) = fade QB passing yards, fade WR1 props
- Pat Surtain II (DEN) = hard fade every WR1 matchup — best cover corner in NFL
- PHI secondary = fade WR1 props — Eagles pass rush (Sweat, Carter) is elite even with CB changes
- T.J. Watt (PIT) = most dominant edge in AFC — fade opposing QB passing props
- Antoine Winfield Jr. (TB) = hard fade TE receiving yards — best coverage safety in NFC
- BOTTOM defenses (TEN, CLE, LVR, CAR) = OVER on every opposing skill position prop
- NOTE ON PERSONNEL: Rosters change in offseason. 2025 stats are the baseline.
  When asked about specific defensive players or coordinators, state 2025 data clearly
  and acknowledge roster/staff changes may have occurred since the 2025 season ended.

RB/WR/TE SKILL POSITION DATABASE
${skillData}

QB DATABASE
${qbData}

${matchupCtxStr ? `MATCHUP CONTEXT\n${matchupCtxStr}\n` : ""}
${oddsCtx ? `LIVE BETTING LINES\n${oddsCtx}\nReference exact numbers. State if sharp/soft/fair.` : "No live lines — directional leans only."}`;


  } else {
    // ── Tennis system prompt ───────────────────────────────────────────────
    const tournamentCtx = (() => {
      const t = context?.currentTournament;
      if (t) {
        return [
          `ACTIVE: ${t.name} — ${t.surface}, ${t.speed} speed.`,
          t.context || "",
          `ATP FAVORITE: ${t.atp_favorite || "TBD"}`,
          `WTA FAVORITE: ${t.wta_favorite || "TBD"}`,
        ].join("\n");
      }
      return "ACTIVE: Miami Open 2026 — Hard court, medium-fast.\nATP FAVORITE: Sinner\nWTA FAVORITE: Sabalenka";
    })();

    const allTournaments = (() => {
      const all = context?.tournaments;
      if (!all) return "Full season schedule unavailable.";
      return Object.values(all).map(t =>
        `${t.name} (${t.surface}, ${t.speed}) — Favorites: ATP ${t.atp_favorite || "TBD"} / WTA ${t.wta_favorite || "TBD"}`
      ).join("\n");
    })();

    const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable";

    const liveMatchStr = Array.isArray(liveMatches) && liveMatches.length
      ? liveMatches.slice(0, 12).map(m => `${m.home_team} vs ${m.away_team} — ${m.round || "Current Tournament"} — ${m.live === "1" ? "LIVE" : m.status || "Scheduled"}`).join("\n")
      : "No live matches currently";

    const acePropsStr = context?.ace_props
      ? Object.entries(context.ace_props).map(([k, v]) => `${k}: hard avg ${v.avg_aces_hard}, clay avg ${v.avg_aces_clay || "n/a"}, grass avg ${v.avg_aces_grass || "n/a"}`).join("\n")
      : "No ace baselines";

    systemPrompt = `You are Under Review's sports betting answer engine for tennis.

STYLE
Lead with the take. Sharp, confident, natural, specific. No markdown headers. No "UR TAKE:" prefix. No meta commentary. Never say you lack data when player database is present.

SURFACE ELO GUIDE
hElo = hard court Elo (Miami, US Open, Australian Open)
cElo = clay Elo (Roland Garros, Madrid, Rome)
gElo = grass Elo (Wimbledon, Queen's, Halle)
Surface Elo gaps over 150 points are significant betting edges.

PROP ANGLES BY SURFACE
Clay: OVER games almost always, UNDER aces for most players
Grass: UNDER games, OVER aces for big servers, tiebreaks common
Hard: use player baselines from database

FORMAT
Prop questions: bullet format — Player — Prop — one key stat reason.
Broader questions: prose first, then 1-2 prop bullets if relevant.
Never mention data sources or prompts.

CURRENT TOURNAMENT
${tournamentCtx}

ALL TOURNAMENTS THIS SEASON
${allTournaments}

PLAYER DATABASE
${playerDataStr}

LIVE MATCHES
${liveMatchStr}

ACE PROP BASELINES
${acePropsStr}

${oddsCtx ? `LIVE BETTING LINES\n${oddsCtx}` : "No live prop lines — directional leans only."}

TOURNAMENT DRAW PATH
${drawPath || "No draw results yet — use player database and surface analysis to answer."}

${matchupCtxStr ? `MATCHUP CONTEXT\n${matchupCtxStr}` : ""}

Never stop at "I don't have draw data" — pivot to what you know. The player database and surface Elo are always available.`;
  }

  // ── Build messages ────────────────────────────────────────────────────────
  const messages = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-4)) {
      if (!msg || msg.loading) continue;
      const text = msg.text || msg.content;
      if (!text) continue;
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: text });
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

    let text = data?.content
      ?.filter(i => i.type === "text")
      ?.map(i => i.text)
      ?.join("\n")
      ?.trim() || "Couldn't get a response. Try again.";

    text = text
      .replace(/^i['']m ur take.*$/gim, "")
      .replace(/^ur take[:\-]\s*/gim, "")
      .replace(/^i am an nfl.*$/gim, "")
      .replace(/^i don['']t have tennis data.*$/gim, "")
      .trim();

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
