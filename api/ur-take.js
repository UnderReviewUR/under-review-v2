export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

// ── NFL QB Database ───────────────────────────────────────────────────────────
const NFL_QBS = {
  "Josh Allen":      { team:"BUF", tier:"ELITE", passing:{ gs:17, cmp:69.3, yds:3668, td:25, int:10, ypa:8.0, rate:102.2, qbr:65.4 }, advanced:{ ontgt:79.9, badTh:13.0, prss:18.0, pktTime:2.5, iay_pa:7.3 }, trend:{ ontgt_delta:+5.1, note:"On-target jumped 5.1pts YoY — accuracy genuinely elite now" }, rushing:{ attPg:6.6, ydsPg:34.1, tdPg:0.82, ypc:5.2, tier:"ELITE RUSHER" }, props:{ passYds:{ floor:215, ceil:310, lean:"OVER in shootouts" }, rushYds:{ floor:25, ceil:65, lean:"OVER most weeks" }, best:"Rushing yards OVER — most reliable Allen prop" }, futures:{ wins:"12-13", playoff:"95%+", mvp:"Top-5" }, note:"79.9% on-target plus elite rushing floor = safest QB1 in football. Rushing OVER is the lean every week." },
  "Drake Maye":      { team:"NE",  tier:"ELITE", passing:{ gs:17, cmp:72.0, yds:4394, td:31, int:8,  ypa:8.9, rate:113.5, qbr:77.1 }, advanced:{ ontgt:79.0, badTh:13.8, prss:21.8, pktTime:2.4, iay_pa:9.1 }, trend:{ ontgt_delta:+2.8, note:"On-target improved 2.8pts as a rookie. 9.1 IAY/PA is elite deep-ball aggression." }, rushing:{ attPg:6.1, ydsPg:26.5, tdPg:0.24, ypc:4.4, tier:"STRONG RUSHER" }, props:{ passYds:{ floor:230, ceil:320, lean:"OVER — 8.9 Y/A with elite on-target" }, rushYds:{ floor:15, ceil:45, lean:"OVER — market underprices his legs" }, best:"Rushing yards OVER — massively undervalued" }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"QBR 77.1 as a rookie is historically rare. Rushing (26.5 yds/g) adds floor the market ignores." },
  "Patrick Mahomes": { team:"KC",  tier:"ELITE", passing:{ gs:14, cmp:62.7, yds:3587, td:22, int:11, ypa:7.1, rate:89.6,  qbr:68.5 }, advanced:{ ontgt:74.3, badTh:17.9, prss:24.0, pktTime:2.2, iay_pa:7.9 }, trend:{ ontgt_delta:-2.6, note:"Accuracy dropped 2.6pts — weapons-driven regression." }, rushing:{ attPg:4.6, ydsPg:30.1, tdPg:0.36, ypc:6.6, tier:"ELITE RUSHER" }, props:{ rushYds:{ floor:18, ceil:45, lean:"OVER — 30.1 yds/g at 6.6 Y/att is chronically ignored" }, best:"Rushing yards OVER. Chiefs ML in any playoff spot — ALWAYS." }, futures:{ wins:"11-13", playoff:"85%+", mvp:"Top-3" }, note:"30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football." },
  "Lamar Jackson":   { team:"BAL", tier:"ELITE", passing:{ gs:13, cmp:63.6, yds:2549, td:21, int:7,  ypa:8.4, rate:103.8, qbr:62.7 }, advanced:{ ontgt:72.4, badTh:18.3, prss:23.6, pktTime:2.5, iay_pa:8.8 }, trend:{ ontgt_delta:-6.3, note:"ON-TARGET DROPPED 6.3pts — biggest regression in league." }, rushing:{ attPg:5.2, ydsPg:26.8, tdPg:0.15, ypc:5.2, tier:"STRONG RUSHER" }, props:{ rushYds:{ floor:30, ceil:75, lean:"OVER every week" }, best:"Rushing yards OVER + TD scorer OVER" }, futures:{ wins:"11-13 healthy", playoff:"85%+", mvp:"Top-3 if fully healthy" }, note:"72.4% on-target DROPPED 6.3pts is the hidden concern. Rushing floor covers it." },
  "Joe Burrow":      { team:"CIN", tier:"ELITE", passing:{ gs:8,  cmp:66.8, yds:1809, td:17, int:5,  ypa:7.0, rate:100.7, qbr:63.0, note:"8 games only — prior season 80.3% on-target is true baseline" }, advanced:{ ontgt:75.0, badTh:11.3, prss:21.7, pktTime:2.3, iay_pa:7.2 }, rushing:{ attPg:1.75, ydsPg:5.1, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.13, lean:"OVER 1.5 — most reliable TD rate in AFC when healthy" }, best:"TD OVER 1.5 when healthy — 2.13/g is elite" }, futures:{ wins:"11-13 healthy", playoff:"80%+", mvp:"Top-3 if full season" }, note:"Prior season 80.3% on-target is the real Burrow. Bet TDs aggressively when healthy." },
  "Matthew Stafford":{ team:"LAR", tier:"ELITE", passing:{ gs:17, cmp:65.0, yds:4707, td:46, int:8,  ypa:7.9, rate:109.2, qbr:71.2 }, advanced:{ ontgt:73.6, badTh:18.1, prss:18.5, pktTime:2.4, iay_pa:9.0 }, trend:{ prss_delta:-3.8, note:"Pressure rate IMPROVED 3.8pts — Rams line got better." }, props:{ passTd:{ pg:2.71, lean:"OVER 2.5 — 46 TDs in 17 games" }, best:"Passing TDs OVER 2.5 — 2.71/g is best single-player prop in NFC." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-3" }, note:"9.0 IAY/PA highest among all starters. TD prop (OVER 2.5) at 2.71/g is most reliable single-player prop in NFC." },
  "Dak Prescott":    { team:"DAL", tier:"ELITE", passing:{ gs:17, cmp:67.3, yds:4552, td:30, int:10, ypa:7.6, rate:99.5,  qbr:70.2 }, advanced:{ ontgt:74.8, badTh:12.5, prss:21.6, pktTime:2.4, iay_pa:8.0 }, trend:{ ontgt_delta:+3.5, prss_delta:-4.0, note:"On-target improved 3.5pts. Pressure rate dropped 4.0pts." }, props:{ passTd:{ pg:1.76, lean:"OVER 1.5 reliably" }, best:"Lamb receiving props OVER." }, futures:{ wins:"9-11", playoff:"55-65%", mvp:"Top-5 individually" }, note:"QBR 70.2 is elite. 12.5% bad throw rate cleanest among ELITE tier QBs. Always bet Prescott individually." },
  "Jordan Love":     { team:"GB",  tier:"ELITE", passing:{ gs:15, cmp:66.3, yds:3381, td:23, int:6,  ypa:7.7, rate:101.2, qbr:72.7 }, advanced:{ ontgt:77.4, badTh:14.6, prss:22.1, pktTime:2.4, iay_pa:8.7 }, trend:{ ontgt_delta:+4.2, note:"On-target improved 4.2pts — most underreported QB development in NFC." }, props:{ best:"Love is consistently undervalued. QBR 72.7 with only 6 INTs." }, futures:{ wins:"10-12", playoff:"65-75%", mvp:"Dark horse" }, note:"Most underrated QB in football. QBR 72.7 with 6 INTs in 15 games. Buy everywhere at depressed ADP." },
  "Jared Goff":      { team:"DET", tier:"STARTER", passing:{ gs:17, cmp:68.0, yds:4564, td:34, int:8, ypa:7.9, rate:105.5, qbr:57.3 }, advanced:{ ontgt:78.3, badTh:15.8, prss:24.5, pktTime:2.3, iay_pa:6.4 }, trend:{ prss_delta:+3.6, note:"Line regressed." }, props:{ passTd:{ pg:2.0, lean:"OVER 1.5 every week" }, best:"Passing TDs OVER 1.5 every week." }, futures:{ wins:"11-13", playoff:"80-85%" }, note:"1502 PA yards league best. TD prop (2.0/g) most reliable in NFC." },
  "Brock Purdy":     { team:"SF",  tier:"STARTER", passing:{ gs:9,  cmp:69.4, yds:2167, td:20, int:10, ypa:7.6, rate:100.5, qbr:72.8, note:"9 games only" }, advanced:{ ontgt:82.2, badTh:12.3, prss:21.1, pktTime:2.7, iay_pa:7.5 }, props:{ passTd:{ pg:2.22, lean:"OVER 2.0 — scheme generates TDs" }, best:"CMC and Aiyuk receiving props OVER." }, futures:{ wins:"10-12", playoff:"70-80% healthy" }, note:"82.2% on-target highest among all starters. CMC health is the multiplier." },
  "Jalen Hurts":     { team:"PHI", tier:"STARTER", passing:{ gs:16, cmp:64.8, yds:3224, td:25, int:6, ypa:7.1, rate:98.5, qbr:55.2 }, advanced:{ ontgt:74.0, badTh:16.7, prss:20.0, pktTime:2.5, iay_pa:9.0 }, trend:{ ontgt_delta:-5.1, note:"ON-TARGET DROPPED 5.1pts — needs monitoring." }, rushing:{ attPg:6.6, ydsPg:26.3, tdPg:0.50, tier:"STRONG RUSHER" }, props:{ rushYds:{ lean:"OVER every week — designed runs schemed in regardless of game script" }, best:"Rushing yards OVER. Floor guaranteed by scheme design." }, futures:{ wins:"11-13", playoff:"80-85%", mvp:"Top-5" }, note:"Rushing floor (designed runs 6.6/g) covers any passing variance. Never sit." },
  "C.J. Stroud":     { team:"HOU", tier:"STARTER", passing:{ gs:14, cmp:64.5, yds:3041, td:19, int:8, ypa:7.2, rate:92.9, qbr:61.7 }, advanced:{ ontgt:74.6, badTh:17.6, prss:21.4, pktTime:2.4, iay_pa:7.9 }, trend:{ prss_delta:-6.6, note:"PRESSURE RATE DROPPED 6.6pts — biggest protection improvement in league." }, props:{ best:"Collins receiving props OVER" }, futures:{ wins:"10-12", playoff:"75-85%" }, note:"Year 3 with healthy weapons projects top-8 QB." },
  "Trevor Lawrence": { team:"JAX", tier:"STARTER", passing:{ gs:17, cmp:60.9, yds:4007, td:29, int:12, ypa:7.2, rate:91.0, qbr:58.3 }, advanced:{ ontgt:73.7, badTh:14.4, prss:21.8, pktTime:2.4, iay_pa:8.7 }, trend:{ prss_delta:+6.6, note:"Pressure rate jumped 6.6pts — line protection worsened." }, rushing:{ attPg:4.8, ydsPg:21.1, tdPg:0.53, tier:"STRONG RUSHER" }, props:{ best:"Total TDs OVER — rushing TDs (0.53/g) + passing TDs." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"Total TD prop (rushing + passing) is most underrated bet on his slate." },
  "Jayden Daniels":  { team:"WAS", tier:"STARTER", passing:{ gs:7,  cmp:60.6, yds:1262, td:8, int:3, ypa:6.7, rate:88.1, qbr:44.7, note:"7 games only" }, advanced:{ ontgt:76.4, prss:16.7, iay_pa:7.2 }, rushing:{ attPg:8.3, ydsPg:39.7, tdPg:0.29, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER every week — 39.7 yds/g pace is best in NFC" }, best:"Rushing yards OVER. Most undervalued NFC QB prop when healthy." }, futures:{ wins:"9-11", playoff:"50-60%", mvp:"Top-5 if stays healthy" }, note:"39.7 rushing yds/g pace matches Josh Allen's baseline. Health is the only real question." },
  "Caleb Williams":  { team:"CHI", tier:"STARTER", passing:{ gs:17, cmp:58.1, yds:3942, td:27, int:7, ypa:6.9, rate:90.1, qbr:58.2 }, advanced:{ ontgt:69.8, badTh:20.7, prss:25.1, pktTime:2.5, iay_pa:8.5 }, trend:{ ontgt_delta:-2.6, note:"On-target declined further to 69.8%." }, rushing:{ ydsPg:22.8, tier:"STRONG RUSHER" }, props:{ best:"Bears team total OVER — best cast Williams has had. Year 2 breakout expected." }, futures:{ wins:"10-12", playoff:"60-70%" }, note:"69.8% on-target lowest among all starters. Year 2 with better cast is the buy." },
  "Bo Nix":          { team:"DEN", tier:"STARTER", passing:{ gs:17, cmp:63.4, yds:3931, td:25, int:11, ypa:6.4, rate:87.8, qbr:58.3 }, advanced:{ ontgt:77.4, prss:19.1, iay_pa:7.3 }, rushing:{ ydsPg:20.9, tier:"STRONG RUSHER" }, props:{ best:"Broncos UNDER vs elite offenses. Nix rushing OVER." }, futures:{ wins:"10-12", playoff:"55-65%" }, note:"RPO scheme is where Denver generates offense. Bet Broncos in defensive scripts, fade in shootouts." },
  "Baker Mayfield":  { team:"TB",  tier:"STARTER", passing:{ gs:17, cmp:63.2, yds:3693, td:26, int:11, ypa:6.8, rate:90.6, qbr:61.3 }, advanced:{ ontgt:73.7, prss:14.8, iay_pa:8.0 }, trend:{ ontgt_delta:-4.9, note:"ON-TARGET DROPPED 4.9pts." }, rushing:{ ydsPg:22.5, ypc:6.9, tier:"STRONG RUSHER" }, props:{ best:"Evans TD scorer OVER. Mayfield rushing yards OVER." }, futures:{ wins:"8-10", playoff:"50-60%" }, note:"On-target dropped 4.9pts. 8.9 yds/scramble is surprisingly elite." },
  "Kyler Murray":    { team:"MIN", tier:"STARTER", passing:{ gs:5, cmp:68.3, yds:962, td:6, int:3, note:"5 games pre-trade — prior full season (79.1% on-target) is true baseline" }, rushing:{ attPg:5.8, ydsPg:34.6, ypc:6.0, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER when healthy — 34.6 yds/g" }, best:"Vikings team total OVER when Murray confirmed healthy." }, futures:{ wins:"10-13 healthy", playoff:"70-80% healthy", mvp:"Top-5 if healthy" }, note:"O'Connell scheme + Jefferson. Health is the only ceiling." },
  "Jaxson Dart":     { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12, cmp:63.7, yds:2272, td:15, int:5, ypa:6.7, rate:91.7, qbr:57.5 }, advanced:{ ontgt:72.9, prss:23.3, iay_pa:8.1 }, rushing:{ ydsPg:34.8, tdPg:0.64, ypc:5.7, tier:"ELITE RUSHER" }, props:{ rushYds:{ lean:"OVER — market ignores 34.8 yds/g completely" }, best:"Rushing yards OVER every week — most undervalued prop in NFC." }, futures:{ wins:"7-9", playoff:"30-40%" }, note:"34.8 rushing yds/g is the best prop edge in NFC. Market completely ignores it." },
  "Sam Darnold":     { team:"SEA", tier:"STARTER", passing:{ gs:17, cmp:67.7, yds:4048, td:25, int:14, ypa:8.5, rate:99.1, qbr:55.6, note:"MIN under O'Connell — career norms: 73-75% on-target, INT-prone" }, advanced:{ ontgt:79.8, prss:21.0, iay_pa:7.8 }, props:{ best:"Darnold INT OVER 0.5 every week." }, futures:{ wins:"7-10", playoff:"40-50%" }, note:"14-3 was O'Connell scheme. Without it, expect regression. INT OVER 0.5 every week." },
  "Shedeur Sanders": { team:"CLE", tier:"BELOW_AVG", passing:{ gs:7, cmp:56.6, yds:1400, td:7, int:10, ypa:6.6, rate:68.1, qbr:18.9 }, advanced:{ ontgt:69.6, prss:40.3, iay_pa:7.2 }, props:{ best:"Browns team total UNDER. Sacks taken OVER every week." }, futures:{ wins:"4-7", playoff:"5-10%" }, note:"40.3% pressure rate — worst in NFL history. 2026 is the true eval year." },
  "Cam Ward":        { team:"TEN", tier:"BELOW_AVG", passing:{ gs:17, cmp:59.8, yds:3169, td:15, int:7, ypa:5.9, rate:80.2, qbr:33.2 }, advanced:{ ontgt:72.6, badTh:19.0, prss:27.8, iay_pa:7.2 }, props:{ best:"Titans team total UNDER. Sacks taken OVER." }, futures:{ wins:"5-8", playoff:"10-15%" }, note:"27.8% pressure rate on a bad line. 2026 is still development year." },
};

// ── Sport detection ───────────────────────────────────────────────────────────
// sportHint from the frontend is the authoritative source — always trust it.
// detectSport is only called when sportHint is absent (i.e., raw ASK tab queries).
function detectSport(question, sportHint) {
  const q = String(question || "").toLowerCase();

  // Frontend hint overrides everything — tabs always pass their context
  if (sportHint === "nfl")    return "nfl";
  if (sportHint === "tennis") return "tennis";

  // Strong tennis signals — if ANY of these match, it's tennis
  const tennisPrimary = [
    "tennis","atp","wta","grand slam","wimbledon","roland garros","french open",
    "us open","australian open","miami open","indian wells","charleston","madrid open",
    "rome","cincinnati","toronto","montreal","queen's club","halle","eastbourne",
    "serve","aces","double fault","tiebreak","deuce","hold percentage","break point",
    "clay court","grass court","hard court","clay","grass",
    "alcaraz","sinner","djokovic","zverev","medvedev","de minaur","shelton","fritz",
    "draper","bublik","ruud","rublev","musetti","auger","mensik","fils",
    "sabalenka","swiatek","rybakina","pegula","gauff","muchova","osaka","keys",
    "andreeva","paolini","bencic","vondrousova","kostyuk","kalinskaya",
    "surface elo","helo","celo","gelo","dominance ratio",
  ];
  if (tennisPrimary.some(s => q.includes(s))) return "tennis";

  // Strong NFL signals — only unambiguous NFL-specific terms
  const nflPrimary = [
    "nfl","quarterback","qb","super bowl","afc ","nfc ",
    "wide receiver","running back","tight end","red zone","play action","rpo",
    "offensive line","defensive line","linebacker","cornerback","safety ","blitz",
    "bills","patriots","dolphins","jets","ravens","bengals","browns","steelers",
    "texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos",
    "cowboys","giants","eagles","commanders","bears","lions","packers","vikings",
    "falcons","panthers","saints","buccaneers","cardinals","rams ","49ers","seahawks",
    "josh allen","lamar jackson","patrick mahomes","joe burrow","jalen hurts",
    "dak prescott","matthew stafford","jordan love","drake maye","jared goff",
    "caleb williams","brock purdy","trevor lawrence","jayden daniels","kyler murray",
    "sam darnold","c.j. stroud","baker mayfield","bo nix","cam ward","shedeur",
    "james cook","derrick henry","jonathan taylor","bijan robinson","achane",
    "puka nacua","ja'marr chase","smith-njigba","george pickens","ceedee lamb",
    "trey mcbride","brock bowers","travis kelce","tyler warren",
    "rushing yards","receiving yards","passing yards","touchdowns","interceptions",
  ];
  if (nflPrimary.some(s => q.includes(s))) return "nfl";

  // Season total / futures language: check for tennis tournament names
  const tournamentNames = [
    "charleston open","madrid open","rome","italian open","cincinnati open",
    "rogers cup","us open series","laver cup","davis cup","fed cup","billie jean",
    "australian open","french open","wimbledon","us open",
    "indian wells","miami","montreal","toronto","cincinnati","beijing","tokyo",
    "vienna","paris masters","nitto","atp finals","wta finals",
  ];
  if (tournamentNames.some(s => q.includes(s))) return "tennis";

  // Default: tennis (better to answer a tennis question with tennis context than vice versa)
  return "tennis";
}

function getRelevantQBs(question) {
  const q = String(question || "").toLowerCase();
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
  // Try to match specific player names first
  const matched = blocks.filter(block => {
    const lower    = block.toLowerCase();
    const firstLine = lower.split("\n")[0] || "";
    const tokens   = firstLine.split("|").map(s => s.trim());
    return tokens.some(token => token && token.length > 2 && q.includes(token));
  });
  if (matched.length > 0) return matched.slice(0, 10).join("\n\n");
  // Generic skill position / prop / season question — return all blocks
  const generic = ["rb","wr","te","touchdown","td","receiving","rushing","catches","yards","season","2026","future","total","over","under","leader","most","best","top"];
  if (generic.some(n => q.includes(n))) return blocks.join("\n\n");
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

  function buildOddsContext(odds) {
    if (!odds || (!odds.matches?.length && !odds.props?.length)) return null;
    const lines = [];
    if (odds.matches?.length) {
      lines.push("LIVE MATCH ODDS:");
      for (const m of odds.matches) {
        if (m.homeOdds !== null && m.awayOdds !== null)
          lines.push(`  ${m.home} (${m.homeOdds > 0 ? "+" : ""}${m.homeOdds}) vs ${m.away} (${m.awayOdds > 0 ? "+" : ""}${m.awayOdds})`);
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

  const oddsCtx      = buildOddsContext(req.body.oddsData);
  const drawPath     = buildDrawPath(req.body.tournamentResults);
  const matchupCtxStr = summarizeMatchupContext(matchupContext);

  // ── System prompts ────────────────────────────────────────────────────────
  let systemPrompt;

  if (isNFL) {
    const relevantQBs = getRelevantQBs(question);
    const qbData      = JSON.stringify(relevantQBs, null, 0).slice(0, 9000);
    const skillData   = getRelevantSkillPlayers(question, nflContext);

    systemPrompt = [
      "You are Under Review's sports betting answer engine.",
      "",
      "STYLE",
      "Lead with the take. Sharp, confident, specific. No markdown headers. No self-introduction (never say what model or system you are). No meta commentary.",
      "",
      "QUESTION TYPES — match the question to the right mode:",
      "- Single-game prop: 'Player — OVER/UNDER X — why' format, one tight paragraph",
      "- Season total / futures ('Will X go over Y yards in 2026?' / 'Who leads TDs in 2026?'): answer as a PROJECTION using the season-long data. Use the full-season stats (ydsPg × games, total TDs, TD rate) to project forward. Do not treat futures questions as single-game props.",
      "- Ranking: rank decisively, explain top 1-3",
      "- Comparison: pick a side, explain",
      "- Matchup intel: lean + 2-3 specific stats + 1-2 prop bullets",
      "",
      "FUTURES / SEASON TOTAL RULES",
      "When asked 'Will X go over Y in 2026?' or 'Who leads TDs?' treat it as a season projection:",
      "- Use ydsPg × expected games to project season total",
      "- Use TD rate (TDs/g) × expected games to project season TDs",
      "- Flag the real risks: injury history, regression factors, target share shifts",
      "- Give a lean: OVER or UNDER the stated total, or rank 1-2-3 with reasoning",
      "- Never just restate what happened in 2025 — project what happens in 2026",
      "",
      "NFL STAT GLOSSARY",
      "ontgt = on-target throw % (league avg 74.9%)",
      "badTh = bad throw rate % (league avg 16.1%)",
      "prss  = pressure rate % (league avg 21.9% — above is a problem)",
      "iay_pa = intended air yards per attempt (8.5+ = deep, 6.5- = checkdown)",
      "ydsPg = yards per game | td = touchdowns | recPg = receptions per game",
      "TDs/g = touchdown rate — primary signal for TD scorer props and futures",
      "",
      "KEY TD RATES (use for any TD leader or TD futures question):",
      "Derrick Henry (RB, BAL): 0.94 TDs/g, 15 total in 16g — HIGHEST TD RATE",
      "James Cook (RB, BUF): 0.88 TDs/g, 14 total in 16g",
      "De'Von Achane (RB, MIA): 0.86 TDs/g, 12 total in 14g",
      "Jonathan Taylor (RB, IND): 0.82 TDs/g, 14 total in 17g",
      "Bijan Robinson (RB, ATL): 0.65 TDs/g, 11 total in 17g",
      "Ja'Marr Chase (WR, CIN): 0.63 TDs/g, 10 total in 16g",
      "Puka Nacua (WR, LAR): 0 TDs/g, 0 total in 16g — FADE TD scorer, but regression expected",
      "",
      "RB/WR/TE SKILL POSITION DATABASE",
      skillData,
      "",
      "QB DATABASE",
      qbData,
      "",
      matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr + "\n" : "",
      oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx + "\nReference exact numbers." : "No live lines — directional leans only.",
    ].filter(Boolean).join("\n");

  } else {
    // ── Tennis prompt ─────────────────────────────────────────────────────
    const tournamentCtx = (() => {
      const t = context?.currentTournament;
      if (t) {
        return [
          "ACTIVE: " + t.name + " — " + t.surface + ", " + t.speed + " speed.",
          t.context || "",
          "ATP FAVORITE: " + (t.atp_favorite || "TBD"),
          "WTA FAVORITE: " + (t.wta_favorite || "TBD"),
        ].join("\n");
      }
      return "ACTIVE: Miami Open 2026 — Hard court, medium-fast.\nATP FAVORITE: Sinner\nWTA FAVORITE: Sabalenka";
    })();

    const allTournaments = (() => {
      const all = context?.tournaments;
      if (!all) return "Full season schedule unavailable.";
      return Object.values(all)
        .map(t => t.name + " (" + t.surface + ", " + t.speed + ") — Favorites: ATP " + (t.atp_favorite || "TBD") + " / WTA " + (t.wta_favorite || "TBD"))
        .join("\n");
    })();

    const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable";

    const liveMatchStr = Array.isArray(liveMatches) && liveMatches.length
      ? liveMatches.slice(0, 12).map(m => m.home_team + " vs " + m.away_team + " — " + (m.round || "Current Tournament") + " — " + (m.live === "1" ? "LIVE" : m.status || "Scheduled")).join("\n")
      : "No live matches currently";

    const acePropsStr = context?.ace_props
      ? Object.entries(context.ace_props).map(([k, v]) => k + ": hard avg " + v.avg_aces_hard + ", clay avg " + (v.avg_aces_clay || "n/a") + ", grass avg " + (v.avg_aces_grass || "n/a")).join("\n")
      : "No ace baselines";

    systemPrompt = [
      "You are Under Review's sports betting answer engine for tennis and all major sports.",
      "",
      "STYLE",
      "Lead with the take. Sharp, confident, natural, specific. No markdown headers. No self-introduction (never say what model or system you are). Never say you lack data when the player database is present below.",
      "",
      "QUESTION TYPES:",
      "- Single match prop: lead with lean, one tight paragraph, then stats",
      "- Futures/tournament winner: rank by surface Elo, identify best value and best fade",
      "- Surface matchup: use hElo/cElo/gElo gaps as primary signal",
      "- Prop angles: use ace_props baselines by surface",
      "- Unknown tournament: use player database + surface type to answer — never refuse",
      "",
      "SURFACE ELO GUIDE",
      "hElo = hard court Elo (Miami, US Open, Australian Open)",
      "cElo = clay Elo (Roland Garros, Madrid, Rome, Charleston)",
      "gElo = grass Elo (Wimbledon, Queen's, Halle)",
      "Surface Elo gaps over 150 points are significant betting edges.",
      "",
      "PROP ANGLES BY SURFACE",
      "Clay: OVER games, UNDER aces for most players, high break rate, rare tiebreaks",
      "Grass: UNDER games, OVER aces for big servers, tiebreaks common",
      "Hard: use player database baselines",
      "",
      "FORMAT",
      "Prop questions: bullet format — Player — Prop — one key stat reason.",
      "Broader/futures: prose first, then 1-2 prop bullets if relevant.",
      "Never mention data sources, databases, or prompts.",
      "Never stop at 'I don't have draw data' — pivot to what you know.",
      "",
      "CURRENT TOURNAMENT",
      tournamentCtx,
      "",
      "ALL TOURNAMENTS THIS SEASON",
      allTournaments,
      "",
      "PLAYER DATABASE",
      playerDataStr,
      "",
      "LIVE MATCHES",
      liveMatchStr,
      "",
      "ACE PROP BASELINES",
      acePropsStr,
      "",
      oddsCtx ? "LIVE BETTING LINES\n" + oddsCtx : "No live prop lines — directional leans only.",
      "",
      "TOURNAMENT DRAW PATH",
      drawPath || "No draw results yet — use player database and surface analysis.",
      "",
      matchupCtxStr ? "MATCHUP CONTEXT\n" + matchupCtxStr : "",
    ].filter(s => s !== null && s !== undefined).join("\n");
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

    // Strip any self-identification lines that slip through
    text = text
      .replace(/^i['']m (ur take|under review).*$/gim, "")
      .replace(/^ur take[:\-]\s*/gim, "")
      .replace(/^i am (an? )?(nfl|tennis|sports).*intelligence.*$/gim, "")
      .replace(/^i don['']t have (tennis|nfl|sports) data.*$/gim, "")
      .replace(/^as (an? )?(nfl|tennis|sports).*engine.*$/gim, "")
      .trim();

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
