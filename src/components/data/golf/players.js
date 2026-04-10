// src/components/data/golf/players.js
// Elite PGA Tour player database — strokes gained profiles, course fit, betting angles
// Updated through 2024-25 season. Used by UR Take golf context.

export const PGA_PLAYERS = {

  // ── TIER 1: WORLD TOP 5 ──────────────────────────────────────────────────

  "Scottie Scheffler": {
    tier: "ELITE", rank: 1, country: "USA",
    sg: { total: 4.1, ott: 1.1, app: 1.6, arg: 0.6, putt: 0.8 },
    stats: { drivingDist: 308, fairwayPct: 62, girPct: 74, scrambling: 68, top10Rate: 0.62, cutRate: 0.89, winRate: 0.18 },
    courseTypes: { links: "A", parkland: "A+", desert: "A", coastal: "A", treelined: "A+" },
    markets: { outright: "Always overpriced — bet top-5/top-10 instead", top5: "Best market — 62% top-10 rate", top10: "Strong value when 6/1 or better", makecut: "Near-lock — only fade extreme links courses" },
    form: "Best player in the world by a significant margin. Iron play is generational. Putting elevated in 2024.",
    bestAt: ["Augusta National", "TPC Sawgrass", "Riviera", "Bay Hill", "East Lake"],
    fade: ["Links courses — lower on the list vs US parkland"],
    note: "Don't bet outright — the juice is never there. Top-5 at 7/2 or better is the play every week.",
    comps: ["Tiger Woods 2000-era dominance in consistency metrics"],
  },

  "Rory McIlroy": {
    tier: "ELITE", rank: 2, country: "NIR",
    sg: { total: 2.8, ott: 1.4, app: 0.9, arg: 0.2, putt: 0.3 },
    stats: { drivingDist: 326, fairwayPct: 58, girPct: 71, scrambling: 60, top10Rate: 0.48, cutRate: 0.82, winRate: 0.11 },
    courseTypes: { links: "A+", parkland: "A", desert: "B+", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 12/1 or better", top5: "Solid market — elite ball-striker", top10: "Strong value at 5/1 or better", makecut: "Reliable — fade desert only" },
    form: "Elevated after 2024 Masters. Finally closed at Augusta. Driver is a weapon on wide-open courses.",
    bestAt: ["Augusta National", "TPC Sawgrass", "Quail Hollow", "Valhalla", "Royal Portrush"],
    fade: ["Accurate, tight driving layouts — his miss rate is too high"],
    note: "Best value in majors when the course suits his power. Don't fade him on links — grew up on them.",
    comps: ["Dustin Johnson in prime on power-friendly setups"],
  },

  "Xander Schauffele": {
    tier: "ELITE", rank: 3, country: "USA",
    sg: { total: 2.4, ott: 0.8, app: 1.0, arg: 0.3, putt: 0.3 },
    stats: { drivingDist: 315, fairwayPct: 64, girPct: 72, scrambling: 63, top10Rate: 0.51, cutRate: 0.85, winRate: 0.10 },
    courseTypes: { links: "A", parkland: "A", desert: "A-", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 14/1 or better", top5: "Best market — elite consistency", top10: "Strong any week", makecut: "Near-lock" },
    form: "Won PGA Championship and The Open 2024. Clutch performer. One of the most consistent players on tour.",
    bestAt: ["Oakmont", "Augusta National", "Royal Troon", "TPC Sawgrass"],
    fade: ["Extremely tight driving corridors — accuracy is above-average but not elite"],
    note: "His SG:APP is elite — approach play wins at premium courses. Top-5 is the money market.",
    comps: ["Justin Thomas in consistency and all-around SG profile"],
  },

  "Collin Morikawa": {
    tier: "ELITE", rank: 4, country: "USA",
    sg: { total: 2.1, ott: 0.3, app: 1.5, arg: 0.1, putt: 0.2 },
    stats: { drivingDist: 299, fairwayPct: 72, girPct: 76, scrambling: 64, top10Rate: 0.44, cutRate: 0.87, winRate: 0.09 },
    courseTypes: { links: "A+", parkland: "A", desert: "A", coastal: "A+", treelined: "A" },
    markets: { outright: "Value at 16/1 or better", top5: "Strong — elite GIR percentage", top10: "Best market every week", makecut: "Near-lock" },
    form: "Iron play is best on tour. Multiple major winner. Rebounding in 2025 after inconsistent 2024.",
    bestAt: ["Augusta National", "Royal Birkdale", "Wentworth"],
    fade: ["Par-5 heavy courses — not a power player"],
    note: "SG:APP leader most seasons. Premium on approach-heavy setups. The most reliable iron player in the world.",
    comps: ["Luke Donald in iron precision — but more athletic"],
  },

  "Viktor Hovland": {
    tier: "ELITE", rank: 5, country: "NOR",
    sg: { total: 1.9, ott: 0.7, app: 0.8, arg: 0.2, putt: 0.2 },
    stats: { drivingDist: 318, fairwayPct: 60, girPct: 69, scrambling: 58, top10Rate: 0.42, cutRate: 0.78, winRate: 0.08 },
    courseTypes: { links: "A", parkland: "A-", desert: "B+", coastal: "A", treelined: "B+" },
    markets: { outright: "Value at 18/1 or better", top5: "Strong on power/links setups", top10: "Reliable", makecut: "Good — fade if cold putter" },
    form: "Elite ball-striker with sometimes-volatile putting. When putter is hot, top-5 caliber any week.",
    bestAt: ["East Lake", "DP World venues", "The Open Championship"],
    fade: ["When putter is cold — his SG:P can dip negative easily"],
    note: "Track his putting stats week to week. Top-10 on pure ball-striking setups is solid every time.",
    comps: ["Justin Rose in ball-striking profile"],
  },

  // ── TIER 2: TOUR ELITE ────────────────────────────────────────────────────

  "Patrick Cantlay": {
    tier: "TOUR_ELITE", rank: 7, country: "USA",
    sg: { total: 1.8, ott: 0.4, app: 0.8, arg: 0.4, putt: 0.6 },
    stats: { drivingDist: 302, fairwayPct: 66, girPct: 70, scrambling: 66, top10Rate: 0.44, cutRate: 0.84, winRate: 0.07 },
    courseTypes: { links: "B+", parkland: "A", desert: "A", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 20/1 or better", top5: "Strong on patient, shot-making setups", top10: "Reliable", makecut: "Strong" },
    form: "Methodical, precision-based player. Elite at courses rewarding positioning over power.",
    bestAt: ["Riviera", "TPC Summerlin", "Olympia Fields"],
    fade: ["Wide-open bombers' paradise — he can't out-drive the field"],
    note: "Premium on difficult, precision setups. Riviera is his best venue on tour.",
    comps: ["Bryson DeChambeau without the power — pure precision"],
  },

  "Jon Rahm": {
    tier: "TOUR_ELITE", rank: 8, country: "ESP",
    sg: { total: 2.0, ott: 0.7, app: 0.9, arg: 0.3, putt: 0.5 },
    stats: { drivingDist: 312, fairwayPct: 61, girPct: 69, scrambling: 64, top10Rate: 0.50, cutRate: 0.82, winRate: 0.09 },
    courseTypes: { links: "A+", parkland: "A", desert: "A", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 14/1 or better on LIV eligible events", top5: "Strong on any setup", top10: "Reliable", makecut: "Strong" },
    form: "On LIV Golf 2024-25 — limited PGA/major access. Elite when eligible. Clay-specialist comp doesn't apply — he's an all-surface A+ player.",
    bestAt: ["Augusta National", "US Open setups", "Spanish/Mediterranean courses"],
    fade: ["Limited PGA Tour schedule — eligibility check required"],
    note: "When eligible, top-5 caliber at majors. His LIV schedule means fewer data points.",
    comps: ["Seve Ballesteros in fight and imagination around the green"],
  },

  "Ludvig Aberg": {
    tier: "TOUR_ELITE", rank: 9, country: "SWE",
    sg: { total: 1.7, ott: 0.9, app: 0.7, arg: 0.1, putt: 0.0 },
    stats: { drivingDist: 319, fairwayPct: 60, girPct: 68, scrambling: 60, top10Rate: 0.38, cutRate: 0.76, winRate: 0.05 },
    courseTypes: { links: "A", parkland: "A-", desert: "B+", coastal: "A", treelined: "A-" },
    markets: { outright: "Value at 25/1 or better", top5: "Strong when driver is clicking", top10: "Solid any week", makecut: "Good" },
    form: "Rapid ascent. Top-5 at 2024 Masters as a rookie. Elite ball-striker, short game developing.",
    bestAt: ["Augusta National", "Power-friendly setups"],
    fade: ["Tight driving corridors — miss rate needs to improve"],
    note: "Elite ceiling. Short game is the only limiting factor. If it clicks, top-5 any major.",
    comps: ["Young Rory McIlroy in trajectory and power profile"],
  },

  "Tom Kim": {
    tier: "TOUR_ELITE", rank: 12, country: "KOR",
    sg: { total: 1.4, ott: 0.5, app: 0.6, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 305, fairwayPct: 62, girPct: 67, scrambling: 62, top10Rate: 0.35, cutRate: 0.78, winRate: 0.06 },
    courseTypes: { links: "B+", parkland: "A-", desert: "B+", coastal: "A-", treelined: "A-" },
    markets: { outright: "Value at 30/1 or better", top5: "Streaky — strong when hot", top10: "Best market", makecut: "Good" },
    form: "Multiple PGA wins before age 23. Volatile but elite ceiling.",
    bestAt: ["Shriners Children's Open", "Bermuda Open setups"],
    fade: ["Tough precision setups — drives it well but not consistent enough"],
    note: "Age 22-23 — best value is top-10/top-20. His floor is lower than his ceiling suggests.",
    comps: ["Young Jordan Spieth in raw ability"],
  },

  "Jordan Spieth": {
    tier: "TOUR_ELITE", rank: 14, country: "USA",
    sg: { total: 1.2, ott: -0.1, app: 0.6, arg: 0.5, putt: 0.6 },
    stats: { drivingDist: 296, fairwayPct: 60, girPct: 65, scrambling: 68, top10Rate: 0.40, cutRate: 0.80, winRate: 0.07 },
    courseTypes: { links: "A+", parkland: "A", desert: "A-", coastal: "A+", treelined: "A" },
    markets: { outright: "Value at 20/1 or better on major/links setups", top5: "Strong at premium venues", top10: "Reliable", makecut: "Strong" },
    form: "Clutch putter and scrambler. Short game is top-3 on tour. Driver is the liability.",
    bestAt: ["Augusta National", "Royal Birkdale", "TPC San Antonio", "Pebble Beach"],
    fade: ["Wide-open, power-heavy setups — can't keep up off the tee"],
    note: "His ARG + putting combo wins at premium venues. Top-5 at Augusta and links majors is the play.",
    comps: ["Phil Mickelson in short game creativity"],
  },

  "Justin Thomas": {
    tier: "TOUR_ELITE", rank: 16, country: "USA",
    sg: { total: 1.5, ott: 0.5, app: 0.7, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 312, fairwayPct: 62, girPct: 70, scrambling: 63, top10Rate: 0.38, cutRate: 0.79, winRate: 0.07 },
    courseTypes: { links: "A-", parkland: "A", desert: "A", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 22/1 or better", top5: "Streaky — strong when clicking", top10: "Best market", makecut: "Good" },
    form: "Elite when healthy and hot. Multiple major winner. Inconsistent 2024 but returning to form.",
    bestAt: ["Quail Hollow", "Kapalua", "TPC Sawgrass"],
    fade: ["When putting is cold — top-15 ceiling only"],
    note: "His driver + iron combo is elite. Watch his SG:P stats in the lead-up week.",
    comps: ["Rory McIlroy with more precision, less power"],
  },

  "Max Homa": {
    tier: "TOUR_ELITE", rank: 17, country: "USA",
    sg: { total: 1.3, ott: 0.3, app: 0.7, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 303, fairwayPct: 65, girPct: 68, scrambling: 62, top10Rate: 0.36, cutRate: 0.80, winRate: 0.06 },
    courseTypes: { links: "B+", parkland: "A", desert: "A", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 28/1 or better", top5: "Best on his best courses", top10: "Reliable", makecut: "Strong" },
    form: "Riviera specialist. Multiple wins at Riviera Country Club. Smart, positioning-based player.",
    bestAt: ["Riviera", "Nicklaus-designed courses"],
    fade: ["Links and coastal — not his best surface"],
    note: "Riviera is one of the best course-player angle in golf. Back him there aggressively.",
    comps: ["Patrick Cantlay in patient course management approach"],
  },

  "Matt Fitzpatrick": {
    tier: "TOUR_ELITE", rank: 18, country: "ENG",
    sg: { total: 1.3, ott: 0.1, app: 0.7, arg: 0.3, putt: 0.2 },
    stats: { drivingDist: 295, fairwayPct: 70, girPct: 70, scrambling: 64, top10Rate: 0.38, cutRate: 0.82, winRate: 0.06 },
    courseTypes: { links: "A", parkland: "A", desert: "A-", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 25/1 or better at precision setups", top5: "Strong at US Open-style courses", top10: "Reliable", makecut: "Strong" },
    form: "US Open champion 2022. Precision-based, elite iron player. Short hitter who maximizes every yard.",
    bestAt: ["US Open setups", "Brookline", "tight parkland"],
    fade: ["Power-heavy setups — 295 avg distance is a liability on bombers tracks"],
    note: "Premium at narrow, demanding setups that punish inaccuracy. Fade at wide-open tracks.",
    comps: ["Luke Donald in precision and course management"],
  },

  "Tommy Fleetwood": {
    tier: "TOUR_ELITE", rank: 19, country: "ENG",
    sg: { total: 1.4, ott: 0.4, app: 0.8, arg: 0.1, putt: 0.1 },
    stats: { drivingDist: 305, fairwayPct: 63, girPct: 70, scrambling: 60, top10Rate: 0.40, cutRate: 0.81, winRate: 0.06 },
    courseTypes: { links: "A+", parkland: "A", desert: "A-", coastal: "A+", treelined: "A-" },
    markets: { outright: "Value at 22/1 or better at links/major setups", top5: "Strong at The Open", top10: "Reliable", makecut: "Strong" },
    form: "Elite links player. Multiple top-5 finishes at The Open Championship. Elite in European conditions.",
    bestAt: ["The Open Championship", "European Tour venues", "Scottish courses"],
    fade: ["Desert courses — not his best conditions"],
    note: "Best value at The Open or links-style US Open setups. Underpriced every time.",
    comps: ["Ian Poulter in European conditions mastery"],
  },

  "Shane Lowry": {
    tier: "TOUR_ELITE", rank: 20, country: "IRL",
    sg: { total: 1.2, ott: 0.2, app: 0.6, arg: 0.3, putt: 0.1 },
    stats: { drivingDist: 298, fairwayPct: 63, girPct: 68, scrambling: 63, top10Rate: 0.36, cutRate: 0.79, winRate: 0.06 },
    courseTypes: { links: "A+", parkland: "A-", desert: "B", coastal: "A+", treelined: "B+" },
    markets: { outright: "Value at 25/1 or better at links", top5: "Strong at The Open", top10: "Reliable at links setups", makecut: "Good" },
    form: "Open Championship winner. Bred for links golf. Great in wind and tough conditions.",
    bestAt: ["Royal Portrush", "The Open Championship venues", "tough-weather events"],
    fade: ["Desert / warm-weather US Tour events — not his element"],
    note: "If it's windy and links-style, back Shane Lowry. He's made for it.",
    comps: ["Padraig Harrington in grit and links mastery"],
  },

  "Hideki Matsuyama": {
    tier: "TOUR_ELITE", rank: 21, country: "JPN",
    sg: { total: 1.5, ott: 0.4, app: 0.8, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 308, fairwayPct: 59, girPct: 70, scrambling: 62, top10Rate: 0.40, cutRate: 0.79, winRate: 0.07 },
    courseTypes: { links: "A-", parkland: "A", desert: "A", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 20/1 or better", top5: "Strong — especially Augusta", top10: "Reliable", makecut: "Good" },
    form: "Masters champion. Methodical ball-striker. Driver can be wild but iron play saves him.",
    bestAt: ["Augusta National", "Zozo Championship"],
    fade: ["Putting-dependent fast greens — his SG:P is inconsistent"],
    note: "Augusta specialist — the draw suits Masters perfectly. Back him there every year.",
    comps: ["Tiger Woods in patience and course management strategy"],
  },

  "Brian Harman": {
    tier: "SOLID", rank: 28, country: "USA",
    sg: { total: 0.9, ott: 0.0, app: 0.4, arg: 0.3, putt: 0.2 },
    stats: { drivingDist: 287, fairwayPct: 70, girPct: 65, scrambling: 65, top10Rate: 0.28, cutRate: 0.78, winRate: 0.04 },
    courseTypes: { links: "A+", parkland: "A-", desert: "B+", coastal: "A", treelined: "B+" },
    markets: { outright: "Value at 40/1 or better at links", top5: "Strong at The Open", top10: "Good at precision setups", makecut: "Reliable" },
    form: "Open Championship winner 2023. Won by 6 shots. Elite links player despite short drives.",
    bestAt: ["Hoylake", "Links venues", "tough-conditions events"],
    fade: ["Power-heavy setups — shortest driver in elite tier"],
    note: "Don't fade him at links just because he's short. He's won The Open. Accuracy > distance there.",
    comps: ["Zach Johnson in grinding out results from nowhere"],
  },

  "Cameron Young": {
    tier: "SOLID", rank: 30, country: "USA",
    sg: { total: 0.9, ott: 0.8, arg: 0.1, app: 0.2, putt: -0.2 },
    stats: { drivingDist: 326, fairwayPct: 54, girPct: 65, scrambling: 60, top10Rate: 0.28, cutRate: 0.73, winRate: 0.03 },
    courseTypes: { links: "B", parkland: "A-", desert: "A-", coastal: "B+", treelined: "B+" },
    markets: { outright: "Value at 45/1 or better on bombers tracks", top5: "Power setups only", top10: "Best market", makecut: "Volatile" },
    form: "Elite distance off the tee — top-5 on tour. Putting and scrambling are liabilities.",
    bestAt: ["Kapalua", "wide-open bombers tracks"],
    fade: ["Precision courses — his miss rate is too high without putter saving him"],
    note: "Top-10 on power tracks is the play. Fade on tight, demanding setups.",
    comps: ["Dustin Johnson without the consistency"],
  },

  "Wyndham Clark": {
    tier: "SOLID", rank: 22, country: "USA",
    sg: { total: 1.1, ott: 0.5, app: 0.4, arg: 0.1, putt: 0.1 },
    stats: { drivingDist: 314, fairwayPct: 60, girPct: 67, scrambling: 61, top10Rate: 0.32, cutRate: 0.76, winRate: 0.06 },
    courseTypes: { links: "B+", parkland: "A-", desert: "A-", coastal: "B+", treelined: "A-" },
    markets: { outright: "Value at 30/1 or better", top5: "Streaky", top10: "Reliable", makecut: "Good" },
    form: "US Open champion 2023. Power player with improving course management.",
    bestAt: ["Los Angeles Country Club", "power-friendly setups"],
    fade: ["Traditional links — not his best surface"],
    note: "Value at US Open setups — his power + accuracy combo suits them well.",
    comps: ["Dustin Johnson in power and inconsistency pattern"],
  },

  "Patrick Reed": {
    tier: "SOLID", rank: 35, country: "USA",
    sg: { total: 0.8, ott: 0.1, app: 0.3, arg: 0.3, putt: 0.3 },
    stats: { drivingDist: 298, fairwayPct: 62, girPct: 65, scrambling: 65, top10Rate: 0.25, cutRate: 0.74, winRate: 0.04 },
    courseTypes: { links: "A-", parkland: "A", desert: "A", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 50/1 or better", top5: "Best at Augusta-style setups", top10: "Reliable", makecut: "Good" },
    form: "On LIV Golf. Masters champion. Clutch, combative style. Short game is elite.",
    bestAt: ["Augusta National", "Ryder Cup/team formats"],
    fade: ["Power-dependent setups"],
    note: "When eligible at majors, Augusta is always a top-10 angle. Elite putter and scrambler.",
    comps: ["Seve Ballesteros in short game and combativeness"],
  },

  "Russell Henley": {
    tier: "SOLID", rank: 26, country: "USA",
    sg: { total: 1.0, ott: 0.2, app: 0.5, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 296, fairwayPct: 66, girPct: 68, scrambling: 63, top10Rate: 0.30, cutRate: 0.80, winRate: 0.04 },
    courseTypes: { links: "B+", parkland: "A", desert: "A-", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 45/1 or better", top5: "Best market", top10: "Reliable", makecut: "Strong" },
    form: "Quiet but consistent. Elite iron player who shows up at premium venues.",
    bestAt: ["Augusta National", "US Open setups"],
    fade: ["Power courses — can't bomb it"],
    note: "Underrated at precision setups. Watch for top-20/top-10 value at major venues.",
    comps: ["Matt Fitzpatrick in precision and quietness"],
  },

  "Akshay Bhatia": {
    tier: "SOLID", rank: 29, country: "USA",
    sg: { total: 0.9, ott: 0.5, arg: 0.2, app: 0.3, putt: -0.1 },
    stats: { drivingDist: 316, fairwayPct: 57, girPct: 64, scrambling: 60, top10Rate: 0.28, cutRate: 0.70, winRate: 0.05 },
    courseTypes: { links: "B", parkland: "A-", desert: "A-", coastal: "B", treelined: "B+" },
    markets: { outright: "Value at 45/1 or better", top5: "Upside plays only", top10: "Best market", makecut: "Volatile" },
    form: "Young gun. Big hitter with high ceiling. Short game still developing.",
    bestAt: ["Power-friendly setups", "Valero Texas Open"],
    fade: ["Precision courses — his miss rate is high"],
    note: "Top-20 value every week. Back him on power tracks at 40/1 or better for outright value.",
    comps: ["Young Dustin Johnson in power with inconsistency"],
  },

  "Chris Kirk": {
    tier: "SOLID", rank: 32, country: "USA",
    sg: { total: 0.8, ott: 0.2, app: 0.4, arg: 0.1, putt: 0.1 },
    stats: { drivingDist: 295, fairwayPct: 66, girPct: 66, scrambling: 62, top10Rate: 0.25, cutRate: 0.78, winRate: 0.04 },
    courseTypes: { links: "B+", parkland: "A-", desert: "A-", coastal: "B+", treelined: "A-" },
    markets: { outright: "Value at 60/1 or better", top5: "Low percentage", top10: "Best market", makecut: "Reliable" },
    form: "Reliable, veteran presence. Best value in top-10 markets at weaker events.",
    bestAt: ["Honda Classic", "Bermuda setups"],
    fade: ["Majors — ceiling not high enough"],
    note: "Value play at non-majors. Look for top-20 or make-cut markets.",
    comps: ["Kevin Kisner in grit without the personality"],
  },

  "Sahith Theegala": {
    tier: "SOLID", rank: 27, country: "USA",
    sg: { total: 1.0, ott: 0.5, app: 0.4, arg: 0.1, putt: 0.0 },
    stats: { drivingDist: 314, fairwayPct: 58, girPct: 66, scrambling: 61, top10Rate: 0.32, cutRate: 0.76, winRate: 0.04 },
    courseTypes: { links: "B", parkland: "A-", desert: "A-", coastal: "B+", treelined: "A-" },
    markets: { outright: "Value at 50/1 or better", top5: "Upside plays", top10: "Best market", makecut: "Good" },
    form: "Power player. Short game is developing. Elite ceiling in right conditions.",
    bestAt: ["Power-friendly setups", "warm-weather California swing"],
    fade: ["Links — not his game"],
    note: "FedEx Cup points player. Top-10 every week at softer events.",
    comps: ["Cameron Young in power/inconsistency profile"],
  },
};

// ── Course Database ───────────────────────────────────────────────────────────
export const PGA_COURSES = {

  "Augusta National": {
    location: "Augusta, GA", type: "parkland",
    premiums: ["driver accuracy", "iron precision", "lag putting", "course management"],
    penalizes: ["short hitters in places", "poor iron play", "bad chipping around greens"],
    advantages: ["Right-to-left ball flight (draw)", "premium approach play", "patience"],
    history: "Scheffler, Morikawa, Spieth, Matsuyama all elite here. Bombers with draws win.",
    note: "Best draw players win Augusta. Approach play to undulating greens is the separator.",
  },

  "Pebble Beach": {
    location: "Pebble Beach, CA", type: "coastal links-style",
    premiums: ["driver accuracy (small fairways)", "wind management", "iron from rough"],
    penalizes: ["wild drivers — out of bounds everywhere"],
    advantages: ["Links-style experience helps", "precision over power"],
    note: "Small fairways penalize big hitters. Accurate, smart players win here.",
  },

  "TPC Sawgrass": {
    location: "Ponte Vedra Beach, FL", type: "parkland, water everywhere",
    premiums: ["iron precision", "composure under pressure", "accurate tee shots"],
    penalizes: ["aggressive play near water", "wild drivers"],
    advantages: ["17th Island Green separates pretenders — back clutch putters"],
    note: "Players' Championship venue. All-around skill required. Best players win.",
  },

  "Riviera": {
    location: "Pacific Palisades, CA", type: "classic parkland",
    premiums: ["accurate driving", "iron play to Poa annua greens", "scrambling"],
    penalizes: ["power over accuracy", "poor putting on slow Poa greens"],
    advantages: ["Course knowledge huge — experience here matters"],
    note: "Max Homa venue. Patrick Cantlay. Precision specialists win.",
  },

  "Quail Hollow": {
    location: "Charlotte, NC", type: "parkland",
    premiums: ["distance (challenging long holes)", "iron play", "putting"],
    penalizes: ["short hitters — the final stretch (Green Mile) is brutal"],
    advantages: ["Power players have edge on back nine"],
    note: "Rory McIlroy venue. Power + iron play required. The Green Mile finishes 16-18.",
  },

  "Torrey Pines South": {
    location: "La Jolla, CA", type: "coastal",
    premiums: ["accuracy", "iron play", "rough recovery"],
    penalizes: ["wild drivers into thick rough"],
    advantages: ["California coastal conditions favor ball-strikers"],
    note: "Farmers Insurance host. Classic US Open setup — accuracy and iron play.",
  },

  "East Lake": {
    location: "Atlanta, GA", type: "parkland",
    premiums: ["all-around game", "putting on difficult greens", "consistency"],
    penalizes: ["flawed parts of the game — no place to hide at Tour Championship"],
    advantages: ["Top-30 players only — best field in golf"],
    note: "Tour Championship. FedEx Cup points matter for starting scores. Season-long data most predictive.",
  },

  "Royal Portrush": {
    location: "N. Ireland", type: "links",
    premiums: ["wind management", "bump-and-run", "patience", "flight the ball"],
    penalizes: ["high ball flight", "aggressive target golf"],
    advantages: ["Northern European players have links-DNA advantage"],
    note: "Rory's home course. Tommy Fleetwood, Shane Lowry elite here.",
  },
};

// ── Golf Markets Reference ────────────────────────────────────────────────────
export const GOLF_MARKETS = {
  outright: {
    description: "Win the tournament outright",
    bestUse: "Elite players at home courses. Value above 20/1.",
    avoid: "Scheffler outright — always juiced. Short prices in weak fields.",
  },
  top5: {
    description: "Finish top 5",
    bestUse: "Elite players any week. Scheffler top-5 is the best recurring play.",
    avoid: "Volatile players — Cameron Young types",
  },
  top10: {
    description: "Finish top 10",
    bestUse: "Best default market. Solid players in good form any week.",
    avoid: "Majors for tier-2 players — field quality kills the percentage",
  },
  top20: {
    description: "Finish top 20",
    bestUse: "Best value market for mid-tier plays. Consistent players at soft events.",
    avoid: "Overpriced favorites",
  },
  makecut: {
    description: "Make the 36-hole cut",
    bestUse: "Elite players, especially when form is strong. Near-certainty for top-10 players.",
    avoid: "Volatile drivers — anyone with >45% miss fairway rate",
  },
  matchup: {
    description: "Head-to-head matchup bet",
    bestUse: "Course-specialist vs similar-priced generic player. Use SG splits.",
    avoid: "Volatile players against consistent ones when priced even",
  },
  firstRoundLeader: {
    description: "Lead after round 1",
    bestUse: "Morning draw + power player + hot putter. Low probability but high value.",
    avoid: "Afternoon draw in wind",
  },
};
