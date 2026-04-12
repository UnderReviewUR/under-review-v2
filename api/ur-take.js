export const config = { api: { bodyParser: { sizeLimit: “10mb” } } };

import { applyCors } from “./_cors.js”;
import {
PGA_PLAYERS, PGA_COURSES, COVERED_COURSES,
NBA_PLAYERS, NFL_PLAYERS, NFL_QBS,
F1_CALENDAR, F1_STANDINGS,
} from “./_ur-take-data.js”;

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
.replace(/^without (access to |real-?time |current )[^\n]*/gim, “”)
.replace(/^i don[’’]?t have (access to |real-?time |live |current )[^\n]*/gim, “”)
.replace(/^as of my (knowledge |training )?cutoff[^\n]*/gim, “”)
.trim();
}

function responseLooksWrongForSport(text, sport) {
const t = String(text || “”).toLowerCase();
if (sport === “tennis”) return t.includes(“i don’t cover tennis”) || (t.includes(“quarterback”) && !t.includes(“tennis”));
if (sport === “nfl”)    return t.includes(“grand slam”) && !t.includes(“super bowl”);
return false;
}

// ── Sport Detection ───────────────────────────────────────────────────────────
function detectSport(question, sportHint, matchupContext) {
const q = String(question || “”).toLowerCase();
if (sportHint === “nfl”)    return “nfl”;
if (sportHint === “tennis”) return “tennis”;
if (sportHint === “f1”)     return “f1”;
if (sportHint === “nba”)    return “nba”;
if (sportHint === “mlb”)    return “mlb”;
if (sportHint === “golf”)   return “golf”;

const mcLeague = String((matchupContext && matchupContext.league) || “”).toLowerCase();
if (mcLeague.includes(“nfl”))                                    return “nfl”;
if (mcLeague.includes(“atp”) || mcLeague.includes(“wta”))        return “tennis”;
if (mcLeague.includes(“pga”) || mcLeague.includes(“golf”))       return “golf”;
if (mcLeague.includes(“f1”) || mcLeague.includes(“formula”))     return “f1”;
if (mcLeague.includes(“nba”))                                     return “nba”;
if (mcLeague.includes(“mlb”))                                     return “mlb”;

const golfPlayers = [“scheffler”,“mcilroy”,“rory “,“schauffele”,“xander”,“morikawa”,“collin”,“hovland”,“viktor”,“cantlay”,“rahm”,“aberg”,“ludvig”,“wyndham clark”,“finau”,“russell henley”,“sam burns”,“sungjae”,“fleetwood”,“fitzpatrick”,“cameron smith”,“hatton”,“shane lowry”,“matsuyama”,“hideki”,“justin thomas”,“spieth”,“brian harman”,“tom kim”,“macintyre”,“theegala”,“rickie fowler”,“keegan bradley”,“adam scott”,“cameron young”,“chris kirk”,“sepp straka”,“dustin johnson”,“brooks koepka”,“bryson”,“tiger woods”,“phil mickelson”,“jake knapp”,“nicolai hojgaard”,“rasmus hojgaard”,“corey conners”,“emiliano grillo”,“denny mccarthy”,“max greyserman”,“akshay bhatia”,“min woo lee”,“eric cole”,“taylor moore”,“mackenzie hughes”,“nick taylor”,“jason day”,“haotong li”,“patrick reed”,“hao-tong”,“justin rose”];
for (const p of golfPlayers) { if (q.includes(p)) return “golf”; }

const tennisPlayers = [“alcaraz”,“sinner”,“djokovic”,“zverev”,“medvedev”,“de minaur”,“shelton”,“fritz”,“draper”,“bublik”,“mensik”,“ruud”,“rublev”,“lehecka”,“cerundolo”,“sabalenka”,“rybakina”,“swiatek”,“pegula”,“gauff”,“andreeva”,“paolini”,“keys”,“osaka”,“noskova”,“kostyuk”,“zheng”,“kartal”];
for (const p of tennisPlayers) { if (q.includes(p)) return “tennis”; }

const f1Drivers = [“antonelli”,“george russell”,“leclerc”,“lewis hamilton”,“lando norris”,“oscar piastri”,“max verstappen”,“verstappen”,“isack hadjar”,“carlos sainz”,“alexander albon”,“fernando alonso”,“lance stroll”,“pierre gasly”,“franco colapinto”,“hulkenberg”,“bortoleto”,“oliver bearman”,“esteban ocon”,“liam lawson”,“arvid lindblad”,“bottas”,“sergio perez”];
for (const d of f1Drivers) { if (q.includes(d)) return “f1”; }

const nflPlayers = [“mahomes”,“josh allen”,“lamar jackson”,“joe burrow”,“dak prescott”,“jalen hurts”,“brock purdy”,“jared goff”,“matthew stafford”,“cj stroud”,“trevor lawrence”,“jordan love”,“drake maye”,“jayden daniels”,“caleb williams”,“bo nix”,“baker mayfield”,“kyler murray”,“shedeur sanders”,“derrick henry”,“james cook”,“jonathan taylor”,“de’von achane”,“puka nacua”,“ja’marr chase”,“jaxon smith-njigba”,“george pickens”,“ceedee lamb”,“trey mcbride”,“brock bowers”,“travis kelce”,“tyreek hill”,“davante adams”,“justin jefferson”];
for (const p of nflPlayers) { if (q.includes(p)) return “nfl”; }

const nbaPlayers = [“jokic”,“nikola jokic”,“shai gilgeous”,“sga”,“luka doncic”,“jayson tatum”,“giannis”,“wembanyama”,“jalen brunson”,“steph curry”,“kevin durant”,“devin booker”,“ja morant”,“anthony edwards”,“karl-anthony towns”,“tyrese haliburton”,“donovan mitchell”,“bam adebayo”,“lebron”,“lamelo”,“damian lillard”,“trae young”,“anthony davis”,“rudy gobert”,“jaren jackson”,“lauri markkanen”,“cade cunningham”,“paolo banchero”,“scottie barnes”,“franz wagner”,“alperen sengun”,“jaylen brown”];
for (const p of nbaPlayers) { if (q.includes(p)) return “nba”; }

const mlbPlayers = [“ohtani”,“shohei”,“mike trout”,“aaron judge”,“acuna”,“mookie betts”,“freddie freeman”,“pete alonso”,“lindor”,“corbin carroll”,“gunnar henderson”,“corey seager”,“bryce harper”,“guerrero”,“jose ramirez”,“julio rodriguez”,“gerrit cole”,“paul skenes”,“zack wheeler”,“corbin burnes”];
for (const p of mlbPlayers) { if (q.includes(p)) return “mlb”; }

const golfTerms = [“pga tour”,“pga championship”,“the masters”,“masters tournament”,“the open championship”,“british open”,“us open golf”,“ryder cup”,“strokes gained”,“sg total”,“sg app”,“sg ott”,“sg putt”,“make cut”,“missed cut”,“first round leader”,“course fit”,“parkland course”,“links course”,“bermuda greens”,“poa annua”,“bentgrass”,“augusta national”,“tpc sawgrass”,“pebble beach”,“pinehurst”,“riviera country club”,“quail hollow”,“royal troon”,“genesis invitational”,“wells fargo championship”,“bay hill”,“amen corner”,“green jacket”];
for (const t of golfTerms) { if (q.includes(t)) return “golf”; }

const tennisTerms = [“roland garros”,“french open”,“wimbledon”,“australian open”,“indian wells”,“miami open”,“wta tour”,“atp tour”,“surface elo”,“dominance ratio”,“hold percentage”,“double fault”,“break point”,“tiebreak”,“clay court”,“grass court”];
for (const t of tennisTerms) { if (q.includes(t)) return “tennis”; }

const f1Terms = [“formula 1”,“formula one”,“grand prix”,“f1 race”,“constructor championship”,“driver championship”,“qualifying f1”,“pit stop”,“drs zone”,“safety car f1”];
for (const t of f1Terms) { if (q.includes(t)) return “f1”; }

const nbaTerms = [“nba finals”,“nba playoffs”,“triple double”,“nba prop”,“pra “,“three pointer”,“usage rate”];
for (const t of nbaTerms) { if (q.includes(t)) return “nba”; }

const mlbTerms = [“world series”,“starting pitcher”,“earned run average”,“strikeout rate”,“batting average”,“home run prop”,“k prop”,“park factor”,“barrel rate”,“statcast”,“mlb prop”];
for (const t of mlbTerms) { if (q.includes(t)) return “mlb”; }

if (q.includes(“golf”))       return “golf”;
if (q.includes(“tennis”))     return “tennis”;
if (q.includes(“basketball”)) return “nba”;
if (q.includes(“baseball”))   return “mlb”;
if (q.includes(“football”))   return “nfl”;
if (q.includes(” nfl “) || q.startsWith(“nfl “)) return “nfl”;
if (q.includes(” nba “) || q.startsWith(“nba “)) return “nba”;
if (q.includes(” mlb “) || q.startsWith(“mlb “)) return “mlb”;
if (q.includes(” pga “) || q.startsWith(“pga “)) return “golf”;
if (q.includes(” f1 “)  || q.startsWith(“f1 “))  return “f1”;

const nflTeams = [“bills”,“patriots”,“dolphins”,“jets”,“ravens”,“bengals”,“browns”,“steelers”,“texans”,“colts”,“jaguars”,“titans”,“chiefs”,“raiders”,“chargers”,“broncos”,“cowboys”,“giants”,“eagles”,“commanders”,“bears”,“lions”,“packers”,“vikings”,“falcons”,“panthers”,“saints”,“buccaneers”,“cardinals”,“rams”,“49ers”,“seahawks”];
for (const t of nflTeams) { if (q.includes(t)) return “nfl”; }

const nbaTeams = [“lakers”,“celtics”,“warriors”,“nuggets”,“bucks”,“heat”,“thunder”,“knicks”,“sixers”,“nets”,“bulls”,“cavaliers”,“clippers”,“suns”,“mavericks”,“grizzlies”,“pelicans”,“jazz”,“kings”,“blazers”,“rockets”,“spurs”,“raptors”,“magic”,“pacers”,“hawks”,“hornets”,“pistons”,“timberwolves”,“wizards”];
for (const t of nbaTeams) { if (q.includes(t)) return “nba”; }

const mlbTeams = [“dodgers”,“yankees”,“red sox”,“cubs”,“mets”,“braves”,“astros”,“padres”,“phillies”,“cardinals”,“brewers”,“mariners”,“rangers”,“twins”,“guardians”,“orioles”,“blue jays”,“rays”,“white sox”,“tigers”,“royals”,“athletics”,“angels”,“rockies”,“diamondbacks”,“reds”,“pirates”,“marlins”,“nationals”];
for (const t of mlbTeams) { if (q.includes(t)) return “mlb”; }

return “nfl”;
}

function getRelevantQBs(question) {
const q = question.toLowerCase();
const relevant = {};
for (const name in NFL_QBS) {
const data = NFL_QBS[name];
const parts = name.toLowerCase().split(” “);
if (parts.some(p => p.length > 3 && q.includes(p))) relevant[name] = data;
else if (data.team && q.includes(data.team.toLowerCase())) relevant[name] = data;
}
return Object.keys(relevant).length > 0 ? relevant : NFL_QBS;
}

function getRelevantSkillPlayers(question, nflContext) {
if (!nflContext) return “No skill position data provided.”;
const q = String(question || “”).toLowerCase();
const blocks = String(nflContext).split(”\n\n”);
const matched = blocks.filter(block => {
const tokens = (block.toLowerCase().split(”\n”)[0] || “”).split(”|”).map(s => s.trim());
return tokens.some(token => token && token.length > 2 && q.includes(token));
});
return matched.length > 0 ? matched.slice(0, 10).join(”\n\n”) : blocks.slice(0, 15).join(”\n\n”);
}

// ── F1 System Prompt ──────────────────────────────────────────────────────────
function buildF1SystemPrompt(matchupCtxStr) {
const STREET = [“monaco”,“baku”,“singapore”,“las vegas”,“miami”,“azerbaijan”];
const POWER  = [“monza”,“spa”,“silverstone”,“interlagos”];
const HDFRC  = [“hungary”,“hungaroring”,“singapore”,“barcelona”,“catalunya”];
const now = new Date();
const todayStr = now.toLocaleDateString(“en-US”, { weekday:“long”, year:“numeric”, month:“long”, day:“numeric” });
const upcoming  = F1_CALENDAR.filter(m => new Date(m.date_start) > now);
const current   = F1_CALENDAR.filter(m => new Date(m.date_start) <= now && now <= new Date(m.date_end));
const completed = F1_CALENDAR.filter(r => r.completed && r.winner);
const standingsStr = F1_STANDINGS.slice(0, 10).map((d, i) => `${d.position || i+1}. ${d.full_name} (${d.team_name}) -- ${d.points} pts`).join(”\n”);
const recentStr = completed.length ? “RECENT RESULTS:\n” + completed.slice(-3).reverse().map(r => `${r.meeting_name}: Winner -- ${r.winner}`).join(”\n”) : “”;
const activeRace = current[0] || upcoming[0] || null;
let nextRaceLine = “NEXT RACE: Not yet determined.”;
let circuitType = “mixed”; let circuitNote = “Championship form is the primary signal.”;
let isRaceWeek = false;
if (activeRace) {
const loc = activeRace.location || “TBD”;
const rd = activeRace.date_start ? new Date(activeRace.date_start) : null;
const dateStr = rd ? rd.toLocaleDateString(“en-US”, { month:“short”, day:“numeric” }) : “TBD”;
const daysUntil = rd ? Math.ceil((rd - now) / (1000*60*60*24)) : null;
const isLive = current.length > 0;
nextRaceLine = (isLive ? “ACTIVE RACE WEEKEND: “ : “NEXT RACE: “) + activeRace.meeting_name + “ – “ + loc + “ (” + dateStr + “)” + (daysUntil !== null ? “ – “ + daysUntil + “ days away” : “”);
isRaceWeek = isLive || (daysUntil !== null && daysUntil <= 7);
const vl = (loc + “ “ + activeRace.meeting_name).toLowerCase();
if (STREET.some(c => vl.includes(c))) { circuitType = “STREET CIRCUIT”; circuitNote = “Qualifying position is critical. Safety car near-certain. Antonelli pole-to-win is the primary play.”; }
else if (POWER.some(c => vl.includes(c))) { circuitType = “POWER CIRCUIT”; circuitNote = “Engine advantage is decisive. Mercedes PU edge at maximum. Antonelli and Russell are primary race winner plays.”; }
else if (HDFRC.some(c => vl.includes(c))) { circuitType = “HIGH DOWNFORCE”; circuitNote = “Aero efficiency decides. Ferrari competitive – Leclerc becomes a live race winner.”; }
}
const upcomingStr = upcoming.slice(0, 5).map(m => { const d = m.date_start ? new Date(m.date_start).toLocaleDateString(“en-US”, { month:“short”, day:“numeric” }) : “TBD”; return `${m.meeting_name} -- ${m.location} (${d})`; }).join(”\n”);

return `You are Under Review – a sharp F1 betting intelligence tool.

IDENTITY: Sharp F1 analyst. Lead with the take. Never hedge. Never open with a limitation.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE BET:

- [Driver] – [market] – [key reason]
  FADE: [one line]
  CONFIDENCE: [High/Medium/Speculative]
  TIMING: [one line]

NEVER use markdown. No ##, no —, no ** bold. Plain text only.

COMPLETE 2026 F1 GRID (only these 22 drivers exist):

1. Kimi Antonelli (Mercedes) | 2. George Russell (Mercedes) | 3. Charles Leclerc (Ferrari) | 4. Lewis Hamilton (Ferrari) | 5. Lando Norris (McLaren) | 6. Oscar Piastri (McLaren) | 7. Max Verstappen (Red Bull) | 8. Isack Hadjar (Red Bull) | 9. Carlos Sainz (Williams) | 10. Alexander Albon (Williams) | 11. Fernando Alonso (Aston Martin) | 12. Lance Stroll (Aston Martin) | 13. Pierre Gasly (Alpine) | 14. Franco Colapinto (Alpine) | 15. Nico Hulkenberg (Audi) | 16. Gabriel Bortoleto (Audi) | 17. Oliver Bearman (Haas) | 18. Esteban Ocon (Haas) | 19. Liam Lawson (Racing Bulls) | 20. Arvid Lindblad (Racing Bulls) | 21. Valtteri Bottas (Cadillac) | 22. Sergio Perez (Cadillac)
   CRITICAL: Tsunoda, Magnussen, Zhou, Doohan NOT on 2026 grid. Never mention them.

2026 POWER UNIT ORDER:

1. Mercedes – best PU. 4 of 6 podiums in first 3 races.
1. Ferrari – closes gap at high-downforce circuits.
1. McLaren – competitive but overpriced on 2025 reputation.
1. Red Bull – Honda PU deficit. ZERO podiums in first 3 races.

KEY NARRATIVE: Antonelli leads 2026 championship. 2 wins, 1 second in 3 races. Verstappen in crisis.

TODAY: ${todayStr}
${isRaceWeek ? `RACE WEEK -- ${activeRace?.meeting_name}.` : “OFF WEEK – No race this weekend. Best window for futures.”}

${nextRaceLine}
CIRCUIT TYPE: ${circuitType}
BETTING NOTE: ${circuitNote}

${recentStr ? recentStr + “\n\n” : “”}CHAMPIONSHIP STANDINGS (after 3 rounds):
${standingsStr}

${upcomingStr ? “UPCOMING RACES:\n” + upcomingStr + “\n\n” : “”}${matchupCtxStr ? “MATCHUP CONTEXT:\n” + matchupCtxStr + “\n\n” : “”}`;
}

// ── Golf System Prompt ────────────────────────────────────────────────────────
function buildGolfSystemPrompt(ctx) {
const currentEvent = ctx?.currentEvent || null;
const odds         = ctx?.odds         || {};
const question     = ctx?.question     || “”;
const courseName   = currentEvent ? (currentEvent.course || currentEvent.name || “”) : “”;
const courseNameLower = courseName.toLowerCase();

// ── LIVE LEADERBOARD (pinned first – this is ground truth) ───────────────
let leaderBlock = “”;
if (currentEvent?.leaderboard?.length > 0) {
leaderBlock = `════════════════════════════════════════
LIVE TOURNAMENT DATA – GROUND TRUTH
This data overrides everything else in this prompt.
Never contradict these scores. Never fabricate round scores.
If you don’t know a specific detail, say so rather than inventing it.
════════════════════════════════════════
EVENT: ${currentEvent.name || “Current PGA Tour Event”}
COURSE: ${currentEvent.course || “TBD”} – ${currentEvent.location || “”}
ROUND: ${currentEvent.round || “In Progress”}

CURRENT LEADERBOARD:
${currentEvent.leaderboard.slice(0, 20).map(p =>
`${p.position}. ${p.name} (${p.country}) -- ${p.score}${p.thru && p.thru !== "--" ? " | Thru " + p.thru : ""}${p.today && p.today !== "--" ? " | Today " + p.today : ""}${p.round1 && p.round1 !== "--" ? " | R1:" + p.round1 : ""}${p.round2 && p.round2 !== "--" ? " | R2:" + p.round2 : ""}${p.round3 && p.round3 !== "--" ? " | R3:" + p.round3 : ""}${p.round4 && p.round4 !== "--" ? " | R4:" + p.round4 : ""}`
).join(”\n”)}
════════════════════════════════════════

`; } else if (currentEvent?.name) { leaderBlock = `════════════════════════════════════════
CURRENT EVENT: ${currentEvent.name}
Course: ${currentEvent.course || “TBD”} – ${currentEvent.location || “”}
Round: ${currentEvent.round || “In Progress”}
Leaderboard: Not yet loaded – use player database for form-based leans.
CRITICAL: If the user provides leaderboard data in their question, treat it as ground truth.
════════════════════════════════════════

`;
}

// ── COURSE DATA ───────────────────────────────────────────────────────────
let courseData = null;
for (const cKey in PGA_COURSES) {
if (cKey.toLowerCase().includes(courseNameLower) || courseNameLower.includes(cKey.toLowerCase())) { courseData = PGA_COURSES[cKey]; break; }
}
const courseSection = courseData
? `CURRENT COURSE -- ${courseName.toUpperCase()}:\nType: ${courseData.type} | Grass: ${courseData.grass} | SG premium: ${courseData.sgPremium}\nKey traits: ${(courseData.keyTraits||[]).join(", ")}\nWho wins: ${courseData.whoWins||""}\nSpecialists: ${(courseData.specialists||[]).join(", ")} | Fades: ${(courseData.fades||[]).join(", ")}\nNote: ${courseData.note||""}\n`
: courseName ? `CURRENT COURSE -- ${courseName.toUpperCase()}:\nNot in our database. Use SG profiles -- SG Total gap is still the primary signal.\n` : “”;

// ── ODDS ──────────────────────────────────────────────────────────────────
let oddsStr = “”;
if (odds?.outrights?.length > 0) {
oddsStr = “CURRENT MARKET ODDS (compare to UR FAIR ODDS on every play):\n” +
odds.outrights.slice(0, 25).map(o => `${o.player}: ${o.odds > 0 ? "+" : ""}${o.odds}`).join(”\n”) + “\n”;
}

// ── PLAYER DATABASE ───────────────────────────────────────────────────────
const playerStr = “PLAYER DATABASE (SG = strokes gained vs field per round):\n” +
Object.entries(PGA_PLAYERS).filter(([, p]) => p.tier === 1).slice(0, 32).map(([name, p]) => {
if (!p?.sg) return “”;
return `${name} | Rank ${p.rank} | SG Total: ${p.sg.total} | OTT: ${p.sg.ott} | APP: ${p.sg.app} | ARG: ${p.sg.arg} | PUTT: ${p.sg.putt} Form: ${(p.recentForm || []).join(", ")} | Cut: ${p.cutMaking||"?"} | Top10: ${p.top10Rate||"?"} | Win: ${p.winRate||"?"} Markets: ${(p.bestMarkets||[]).join(", ")} | Note: ${p.note||""}`;
}).filter(Boolean).join(”\n\n”);

return `You are Under Review – the sharpest golf betting intelligence tool available.

IDENTITY: Sharp golf analyst. Lead with the lean. Recommendation first, data second. NEVER ask for more information. Make a call.

CRITICAL FORMATTING: NEVER use markdown. No ##, no —, no ** bold. Plain text only.

CRITICAL FACTUAL RULES:

1. LIVE DATA IS GROUND TRUTH: Any leaderboard, round scores, or tournament results provided in this prompt or by the user override everything else. Never contradict stated facts.
1. NEVER FABRICATE SCORES: If you don’t know a player’s specific round scores, say “I don’t have the specific round-by-round scores” – do not invent numbers.
1. RORY MCILROY WON THE 2025 MASTERS: He is the defending champion at Augusta in 2026. He completed the career Grand Slam. His Masters “curse” is broken. Never say or imply Rory has never won the Masters.
1. SCOTTIE SCHEFFLER 2026 MASTERS: R1=72, R3=65. That is what is confirmed. Do not invent other round scores.
1. CAMERON YOUNG 2026 MASTERS: Co-leader at -11 after R3. Shot 65 on Saturday. He is a real contender – do not dismiss him.
1. If the user tells you something happened in a tournament, believe them. Do not contradict the person you are talking to about live events.

UR FAIR ODDS – REQUIRED ON EVERY PLAY:
Calculate your own implied probability using win rate, course fit, and form. Convert to American odds. Compare to market.

HOW:

1. Base on player’s win rate / top-10 rate from database.
1. Adjust for course fit: ELITE = +20%, NEUTRAL = -20%, STRONG = neutral.
1. Adjust for recent form: recent WIN or T2-T5 = +10%. Recent missed cuts = -15%.
1. Convert probability to American odds (prob < 50%: odds = +((100/prob)-100), round to nearest 25).
1. Output this exact line: UR FAIR ODDS: [number] | MARKET: [actual line or “not loaded”] | VALUE: [description]

VALUE GAP:
Market longer than UR fair = value for bettor. State “X odds in your favor – BET IT”
Market shorter than UR fair = “MARKET IS OVERPRICED – fade or skip”
Within 50 points = “near fair value”

FAIR ODDS BENCHMARKS:
Scheffler outright: fair +300 to +450. Market +500+ = bet it.
McIlroy / Schauffele outright: fair +600 to +900.
Morikawa / Hovland / Cantlay outright: fair +900 to +1400.
Tier 1 top-10: fair -150 to -200. Market -120 or longer = lean bet.
Tier 1 make-cut 85%+: fair -250 to -400. Market -200 or longer = value.
FRL: fair +800 to +2500 depending on field.

RESPONSE FORMAT:
[One sharp opening sentence – the lean]
[2-4 sentences reasoning – SG data, course fit, form, live leaderboard position if relevant]
THE PLAY:
[Player] – [Market]
UR FAIR ODDS: [fair odds] | MARKET: [actual or “not loaded”] | VALUE: [gap assessment]
FADE: [player to avoid + one-line reason]
CONFIDENCE: [High/Medium/Speculative] – [one sentence]

GOLF BETTING INTELLIGENCE:
SG Total = overall. OTT = off tee. APP = approach. ARG = around green. PUTT = putting.
Parkland/bentgrass: SG:APP and SG:PUTT most predictive.
Links: SG:OTT and wind management.
Desert: SG:OTT and SG:APP; distance advantage amplified.
Poa annua: putting variance increases.
Bermuda: favor players who grew up on bermuda.

${leaderBlock}${courseSection ? courseSection + “\n” : “”}${oddsStr ? oddsStr + “\n” : “”}${playerStr}

QUESTION: ${question}`;
}

// ── NBA System Prompt ─────────────────────────────────────────────────────────
function buildNbaSystemPrompt(nbaContext, matchupCtxStr) {
const ctx = nbaContext || {};
const now = new Date();
const todayStr = now.toLocaleDateString(“en-US”, { weekday:“long”, year:“numeric”, month:“long”, day:“numeric” });
const phase = ctx.seasonContext?.phase || “NBA Season Active”;
const gamesList = ctx.todaysGames || [];
const gamesStr = gamesList.length > 0
? gamesList.map(g => {
const away = g.awayTeam?.tricode || g.awayTeam?.name || “AWAY”;
const home = g.homeTeam?.tricode || g.homeTeam?.name || “HOME”;
if (g.statusCode === 3) return `${away} ${g.awayTeam?.score} @ ${home} ${g.homeTeam?.score} -- FINAL`;
if (g.statusCode === 2) return `${away} ${g.awayTeam?.score} @ ${home} ${g.homeTeam?.score} -- LIVE Q${g.period||""}`;
return `${away} @ ${home} -- ${g.status || "Scheduled"}`;
}).join(”\n”)
: “No games on today’s schedule.”;
const propLines = ctx.propLines || [];
let propLinesStr = “No prop lines posted yet.”;
if (propLines.length > 0) {
const grouped = {};
for (const pl of propLines) {
const k = pl.player + “|” + pl.prop;
if (!grouped[k]) grouped[k] = { player:pl.player, prop:pl.prop, game:pl.game, over:null, under:null };
if (pl.side === “Over”)  grouped[k].over  = pl.line + “ (” + (pl.odds > 0 ? “+” : “”) + pl.odds + “)”;
if (pl.side === “Under”) grouped[k].under = pl.line;
}
propLinesStr = Object.values(grouped).slice(0, 80).map(e => { let s = e.over ? “OVER “ + e.over : “”; if (e.under) s += (s ? “ / UNDER “ : “UNDER “) + e.under; return `${e.player} -- ${e.prop.toUpperCase()} -- ${s} [${e.game}]`; }).join(”\n”);
}
const playerStats = ctx.playerStats || [];
const seasonAvgsStr = playerStats.length > 0 ? playerStats.slice(0, 60).map(p => { const pra = ((parseFloat(p.pts)||0)+(parseFloat(p.reb)||0)+(parseFloat(p.ast)||0)).toFixed(1); return `${p.name} (${p.team}): ${p.pts}pts/${p.reb}reb/${p.ast}ast | PRA ${pra}`; }).join(”\n”) : “”;
const question = ctx.question || “”;
const q = question.toLowerCase();
const propSet = new Set(propLines.map(p => p.player && p.player.toLowerCase()).filter(Boolean));
const entries = Object.entries(ctx.playerDb || NBA_PLAYERS);
const mentioned = entries.filter(([n]) => { const l = n.toLowerCase(); return q.includes(l) || q.includes(l.split(” “).pop()); });
const playing   = entries.filter(([n]) => { const l = n.toLowerCase(); return !q.includes(l) && (propSet.has(l) || Array.from(propSet).some(p => p && p.includes(l.split(” “).pop()))); });
const others    = entries.filter(([n]) => { const l = n.toLowerCase(); return !q.includes(l) && !propSet.has(l); }).slice(0, 10);
const playerDbStr = […mentioned, …playing, …others].slice(0, 30).map(([name, p]) => { const pFloor = p.props?.pra?.floor || p.props?.pts?.floor || “–”; const pCeil = p.props?.pra?.ceil || p.props?.pts?.ceil || “–”; const lean = p.props?.pra?.lean || p.props?.pts?.lean || “–”; return `${name} | ${p.tier} | PRA range ${pFloor}-${pCeil} | ${lean} | ${(p.bettingAngles||[]).slice(0,2).join(" | ")}`; }).join(”\n”);

return `You are Under Review – a sharp NBA betting intelligence tool.

IDENTITY: Lead with the take. Never hedge. Never open with a limitation.

RULES:

1. NEVER open with a limitation. ALWAYS lead with the lean.
1. Cite exact prop lines and odds when loaded.
1. NEVER recommend props for FINAL games.
1. NEVER use markdown. Plain text only.
1. No games? Give the best NBA FUTURES angle instead. Name specific player and bet.

NBA PLAYOFF CONTEXT: Playoffs begin April 19, 2026. Top seeds: OKC, CLE. Best futures: SGA MVP, Jokic PRA series props.

TE VOLUME (2025): McBride (ARI) leads all TEs at 7.4 rec/g. Kelce is third at 4.5 rec/g. Lead with McBride when asked about TE volume.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY:

- [Player] – [PROP OVER/UNDER LINE] ([ODDS]) – [key reason]
  FADE: [one line]
  CONFIDENCE: [High/Medium/Speculative]
  TIMING: [one line]

KEY PRINCIPLES:
PRA is the primary vehicle (lower variance).
Game total 228+ = high pace = back OVER props.
Injury replacement = highest-confidence edge.

TODAY: ${todayStr}
NBA PHASE: ${phase}

TONIGHT’S GAMES:
${gamesStr}

${propLinesStr !== “No prop lines posted yet.” ? “LIVE PROP LINES:\n” + propLinesStr + “\n\n” : “PROP LINES: Not yet posted. Use database for directional leans.\n\n”}${seasonAvgsStr ? “SEASON AVERAGES (ESPN – current teams, reflects trades):\n” + seasonAvgsStr + “\n\n” : “”}BETTING PHILOSOPHY DATABASE:
${playerDbStr}

${matchupCtxStr ? “MATCHUP CONTEXT:\n” + matchupCtxStr + “\n\n” : “”}`;
}

// ── MLB System Prompt ─────────────────────────────────────────────────────────
function buildMlbSystemPrompt(mlbContext, matchupCtxStr) {
const ctx = mlbContext || {};
const now = new Date();
const todayStr = now.toLocaleDateString(“en-US”, { weekday:“long”, year:“numeric”, month:“long”, day:“numeric” });
const phase = ctx.seasonContext?.phase || “MLB Season Active”;
const games = ctx.games || [];
const gamesStr = games.length > 0
? games.map(g => {
const away = g.awayTeam || {}; const home = g.homeTeam || {};
const awayId = away.abbr || away.name || “AWAY”; const homeId = home.abbr || home.name || “HOME”;
const awayP = away.pitcher ? ` [SP: ${away.pitcher}]` : “”; const homeP = home.pitcher ? ` [SP: ${home.pitcher}]` : “”;
if (g.state === “post”) return `${awayId}${awayP} ${away.score} @ ${homeId}${homeP} ${home.score} -- FINAL`;
if (g.state === “in”)   return `${awayId}${awayP} ${away.score} @ ${homeId}${homeP} ${home.score} -- LIVE`;
return `${awayId}${awayP} @ ${homeId}${homeP} -- ${g.status || "Scheduled"}`;
}).join(”\n”)
: “No games on today’s schedule.”;
const propLines = ctx.propLines || [];
let propLinesStr = “No prop lines posted yet.”;
if (propLines.length > 0) {
const grouped = {};
for (const pl of propLines) {
const k = pl.player + “|” + pl.prop;
if (!grouped[k]) grouped[k] = { player:pl.player, prop:pl.prop, game:pl.game, over:null, under:null };
if (pl.side === “Over”)  grouped[k].over  = pl.line + “ (” + (pl.odds > 0 ? “+” : “”) + pl.odds + “)”;
if (pl.side === “Under”) grouped[k].under = pl.line;
}
propLinesStr = Object.values(grouped).slice(0, 60).map(e => { let s = e.over ? “OVER “ + e.over : “”; if (e.under) s += (s ? “ / UNDER “ : “UNDER “) + e.under; return `${e.player} -- ${e.prop.toUpperCase()} -- ${s} [${e.game}]`; }).join(”\n”);
}
const gameTotals = ctx.gameTotals || {};
const totalsStr = Object.keys(gameTotals).length ? Object.entries(gameTotals).map(([gk, t]) => { const note = t.run_env === “HIGH” ? “ – HIGH run env” : t.run_env === “LOW” ? “ – LOW run env” : “”; return `${gk}: O/U ${t.total}${note}`; }).join(”\n”) : “”;

return `You are Under Review – a sharp MLB betting intelligence tool.

IDENTITY: Sharp baseball analyst. Lead with the take. No hedging. No markdown.

RULES:

1. NEVER use markdown. Plain text only.
1. NEVER open with a limitation. Lead with the lean.
1. Cite actual prop line numbers.
1. No props for FINAL games.
1. No games today? Give the best MLB futures or upcoming matchup angle.

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY: * [Player] – [PROP OVER/UNDER LINE] ([ODDS]) – [key reason]
FADE: [one line]
CONFIDENCE: [High/Medium/Speculative]
TIMING: [one line]

MLB PRINCIPLES:
Strikeout props = primary market. K/9 vs opposing K% is the edge.
Game total proxy: Over 9 = offenses cooking. Under 7 = pitchers dominate.
Park factors matter. Coors = back OVERs. Petco = fade OVERs.
Platoon splits = most underused edge.

PARK FACTORS:
OVER-friendly: Coors (COL ~120), Great American (CIN ~108), Globe Life (TEX ~107)
UNDER-friendly: Petco (SD ~93), Oracle (SF ~92), T-Mobile (SEA ~91)
Neutral: Dodger Stadium (~99), Yankee Stadium (~101), Wrigley (~100)

TODAY: ${todayStr}
MLB PHASE: ${phase}

TODAY’S GAMES:
${gamesStr}

${totalsStr ? “GAME TOTALS:\n” + totalsStr + “\n\n” : “”}${propLinesStr !== “No prop lines posted yet.” ? “LIVE PROP LINES:\n” + propLinesStr + “\n\n” : “PROP LINES: Not yet posted.\n\n”}${matchupCtxStr ? “MATCHUP CONTEXT:\n” + matchupCtxStr + “\n\n” : “”}`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
if (!applyCors(req, res, { methods: “POST, OPTIONS” })) return;
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: “Missing ANTHROPIC_API_KEY” });

const { question, players, context, liveMatches, history, matchupContext, image, nflContext, nbaContext, mlbContext, golfContext, sportHint } = req.body;
if (!question) return res.status(400).json({ error: “Missing question” });

const sport = detectSport(question, sportHint, matchupContext);
const matchupCtxStr = summarizeMatchupContext(matchupContext);
let systemPrompt;

if (sport === “f1”) {
systemPrompt = buildF1SystemPrompt(matchupCtxStr);
} else if (sport === “mlb”) {
systemPrompt = buildMlbSystemPrompt(mlbContext, matchupCtxStr);
} else if (sport === “golf”) {
systemPrompt = buildGolfSystemPrompt(golfContext);
} else if (sport === “nba”) {
systemPrompt = buildNbaSystemPrompt(nbaContext, matchupCtxStr);
} else if (sport === “nfl”) {
const qbData   = JSON.stringify(getRelevantQBs(question), null, 0).slice(0, 9000);
const skill    = getRelevantSkillPlayers(question, nflContext);
const nowMonth = new Date().getMonth() + 1;
const phase    = (nowMonth >= 9 || nowMonth === 1) ? “IN-SEASON (weekly props are live)” : “OFFSEASON (futures + directional leans only)”;
systemPrompt = `You are Under Review – a sharp NFL betting intelligence tool.

IDENTITY: Sharp analyst. Lead with the take. Never hedge. Never open with a limitation.

CURRENT NFL STATUS: ${phase}

RESPONSE FORMAT:
One sharp opening sentence. Then:
THE PLAY:

- [Player] – [prop type] – [line or DIRECTIONAL] – [floor / ceiling] – [key reason]
  FADE: [name specific player or team to avoid]
  CONFIDENCE: [High / Medium / Speculative] – [one line why]
  TIMING: [when to bet]

NEVER use markdown. No ##, no bold, no bullet dashes. Plain text only.

NFL STAT GLOSSARY:
ontgt: league avg 74.9% – above 78% is elite | badTh: 16.1% avg – below 13% is elite | prss: 21.9% avg – above 25% is a liability | iay/pa: above 8.5 = deep thrower

KEY TD RATES (2025): Derrick Henry 0.94/g | James Cook 0.88/g | De’Von Achane 0.86/g | Jonathan Taylor 0.82/g | Puka Nacua 0/16g – NEVER bet as TD scorer

2026 NFL DRAFT: Pick 1: TEN – Shedeur Sanders (QB) | Pick 2: CLE – Mason Graham (DT) | Pick 3: NYG – Abdul Carter (EDGE) | Pick 4: NE – Will Campbell (OT) | Pick 5: JAX – Travis Hunter (WR/CB)

DEFENSE TIERS:
ELITE (hard fade opposing props): PHI, BAL, MIN, DEN
STRONG (lean fade): KC, SF, GB, BUF, HOU, TB, LAC, PIT
AVERAGE (neutral): NE, ATL, IND, DAL, DET, LAR, JAX, SEA, CHI, WAS, NO
WEAK (lean over): MIA, CIN, NYJ, NYG, ARI
BOTTOM (hard over): TEN, CLE, LVR, CAR

DEPTH FALLBACK: If player not in database, reason from team context + defense tier + role. Label Speculative.

RB/WR/TE DATABASE:
${skill}

QB DATABASE:
${qbData}

${matchupCtxStr ? “MATCHUP CONTEXT:\n” + matchupCtxStr + “\n\n” : “”}`; } else { // Tennis const t = context?.currentTournament; const tournamentCtx = t ? `ACTIVE: ${t.name} – ${t.surface}, ${t.speed} speed.\n${t.context||””}\nATP: ${t.atp_favorite||“TBD”} | WTA: ${t.wta_favorite||“TBD”}`: "Context not loaded. Answer from player database and surface Elo data."; const playerDataStr = players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable"; const liveMatchStr  = (Array.isArray(liveMatches) && liveMatches.length) ? liveMatches.slice(0, 12).map(m =>`${m.raw?.home||”?”} vs ${m.raw?.away||”?”} – ${m.raw?.round||“Tournament”} – ${String(m.raw?.live||“0”)===“1”?“LIVE”:(m.raw?.status||“Scheduled”)}`).join(”\n”)
: “No live matches currently”;

```
systemPrompt = `You are Under Review -- a sharp tennis betting intelligence tool.
```

IDENTITY: Sharp analyst. Lead with the take. Never hedge. Never open with a limitation.

RESPONSE FORMAT:

1. One sharp sentence answering the question directly.
1. Reasoning – 2-4 sentences using Elo gaps, surface splits, form.
1. THE PLAY:
- [Player] – [specific bet] – [key stat]
  TIMING: [when to act]
  CONFIDENCE: [High / Medium / Speculative] – [one sentence why]
  FADE: [who to avoid and why]

NEVER use markdown. No ##, no —, no ** bold. Plain text only.

SURFACE ELO: hElo = hard | cElo = clay | gElo = grass | DR = dominance ratio (1.8+ elite) | Hold% = service hold (85% elite hard, 80% clay)
Gap 150+ pts = significant edge. Gap 300+ = lead with it.

CLAY SWING (April 2026): Post-Miami, pre-Madrid. Clay specialists underpriced. cElo 150+ above hElo = systematic value.

FACTUAL 2026: Sinner won Miami Open 2026 (did NOT win Australian Open). Alcaraz is clay swing favorite.

NO DRAW/MATCHUP DATA? Pivot to player database analysis immediately. Compare Elos on active surface and give the lean.

CURRENT TOURNAMENT:
${tournamentCtx}

LIVE MATCHES:
${liveMatchStr}

PLAYER DATABASE:
${playerDataStr}

${matchupCtxStr ? “MATCHUP CONTEXT:\n” + matchupCtxStr + “\n\n” : “”}`;
}

// Build messages
const messages = [];
if (Array.isArray(history) && history.length > 0) {
for (const msg of history.slice(-8)) {
if (!msg || msg.loading) continue;
const msgText = msg.text || msg.content;
if (!msgText) continue;
messages.push({ role: msg.role === “user” ? “user” : “assistant”, content: msgText });
}
}
if (image?.base64 && image?.mediaType) {
messages.push({ role:“user”, content:[{ type:“image”, source:{ type:“base64”, media_type:image.mediaType, data:image.base64 } }, { type:“text”, text:question }] });
} else {
messages.push({ role:“user”, content:question });
}

try {
const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”:“application/json”, “x-api-key”:ANTHROPIC_API_KEY, “anthropic-version”:“2023-06-01” },
body: JSON.stringify({ model:“claude-haiku-4-5-20251001”, max_tokens:800, temperature:0.45, system:systemPrompt, messages }),
});
const data = await response.json();
if (!response.ok) { console.error(“Anthropic error:”, data); return res.status(500).json({ error:“AI response failed”, details:data }); }
let text = cleanResponseText(data?.content ? data.content.filter(i => i.type === “text”).map(i => i.text).join(”\n”).trim() : “”);
if (text && responseLooksWrongForSport(text, sport)) {
const cr = await fetch(“https://api.anthropic.com/v1/messages”, { method:“POST”, headers:{“Content-Type”:“application/json”,“x-api-key”:ANTHROPIC_API_KEY,“anthropic-version”:“2023-06-01”}, body:JSON.stringify({ model:“claude-haiku-4-5-20251001”, max_tokens:800, temperature:0.2, system:systemPrompt + `\n\nCORRECTION: Answer ONLY as a ${sport.toUpperCase()} analyst.`, messages }) });
if (cr.ok) { const cd = await cr.json(); text = cleanResponseText(cd?.content ? cd.content.filter(i => i.type === “text”).map(i => i.text).join(”\n”).trim() : “”); }
}
return res.status(200).json({ response: text || “Couldn’t get a response. Try again.” });
} catch (err) {
console.error(“UR TAKE error:”, err);
return res.status(500).json({ error:“Request failed”, details:err.message });
}
}