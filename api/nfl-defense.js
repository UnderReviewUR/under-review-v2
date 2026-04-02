export const config = {
  api: { bodyParser: false },
};

// ── STAT KEY ─────────────────────────────────────────────────────────────────
// tier         = ELITE / STRONG / AVERAGE / WEAK / BOTTOM
// ptsAllowed   = points allowed per game
// ydsAllowed   = total yards allowed per game
// passYdsAllowed = passing yards allowed per game
// rushYdsAllowed = rushing yards allowed per game
// sacks        = sacks per game
// pressurePct  = QB pressure rate generated
// intPg        = interceptions per game
// dvoa         = defense DVOA % (negative = better, league avg ~0)
// passDvoa     = pass defense DVOA
// rushDvoa     = rush defense DVOA
// propImpact   = how this D affects opposing player props
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const defenses = {

    // ═══════════════════════════════════════
    // ELITE DEFENSES — 2025 SEASON
    // ═══════════════════════════════════════

    "PHI": {
      team: "Philadelphia Eagles", abbr: "PHI", conf: "NFC",
      season: 2025,
      tier: "ELITE",
      overall: { rank: 1, ptsAllowed: 17.1, ydsAllowed: 278.2, dvoa: -22.4 },
      pass: { rank: 2, ydsAllowed: 168.3, sacks: 3.4, pressurePct: 32.1, intPg: 1.2, dvoa: -24.1 },
      rush: { rank: 3, ydsAllowed: 109.9, dvoa: -18.6 },
      keyPlayers: ["Jalen Carter", "Nolan Smith", "Darius Slay", "C.J. Gardner-Johnson"],
      propImpact: {
        qb: "FADE passing yards — Hurts aside, opposing QBs average 198 yards vs Eagles. Sack rate (3.4/g) is top-2 in NFL.",
        rb: "FADE rushing props — 109.9 rush yds allowed is top-5. Stack rushing props require 25+ carries to overcome Eagles front.",
        wr: "FADE receiver props — Slay limits WR1 consistently. Opposing WR1 averages just 51 yards.",
        te: "FADE TE props — Gardner-Johnson covers TE1 with minimal help needed."
      },
      bettingAngles: [
        "Eagles games go UNDER at the highest rate in the NFC — 68% in 2025",
        "Opponent team totals: set line at 17 or lower when Eagles are home",
        "FADE every opposing skill position prop when Eagles defense is healthy"
      ],
      note: "Best defense in the NFC. Jalen Carter is the best interior pass rusher in football. Elite in every phase — coverage, pass rush, and run defense all top-5."
    },

    "BAL": {
      team: "Baltimore Ravens", abbr: "BAL", conf: "AFC",
      season: 2025,
      tier: "ELITE",
      overall: { rank: 2, ptsAllowed: 17.8, ydsAllowed: 289.4, dvoa: -20.1 },
      pass: { rank: 3, ydsAllowed: 172.1, sacks: 3.1, pressurePct: 29.8, intPg: 1.1, dvoa: -21.3 },
      rush: { rank: 1, ydsAllowed: 117.3, dvoa: -18.9 },
      keyPlayers: ["Roquan Smith", "Marlon Humphrey", "Kyle Hamilton", "Odafe Oweh"],
      propImpact: {
        qb: "FADE passing — 172 pass yds allowed is top-3. But Lamar's rushing floor survives — team total is still playable.",
        rb: "FADE rushing — Best rush D in NFL. Opposing RBs average 3.2 YPC. Henry benefits from running lanes inside but opponents don't.",
        wr: "FADE WR1 — Humphrey limits outside WRs. Slot is more vulnerable — target slot receivers.",
        te: "MODERATE — Hamilton is elite but Ravens can overload coverage, leaving TE2 open."
      },
      bettingAngles: [
        "Ravens defense independently carries spread covers even when Lamar is limited",
        "Opponent rushing props: hard FADE — 3.2 YPC allowed is lowest in NFL",
        "Total games UNDER when Ravens are home — their offense is run-first, which eats clock"
      ],
      note: "Roquan Smith is the best linebacker in football. Run defense is historically dominant. Pass defense improved dramatically with Odafe Oweh pass rush development."
    },

    "MIN": {
      team: "Minnesota Vikings", abbr: "MIN", conf: "NFC",
      season: 2025,
      tier: "ELITE",
      overall: { rank: 3, ptsAllowed: 18.2, ydsAllowed: 293.1, dvoa: -18.7 },
      pass: { rank: 4, ydsAllowed: 176.4, sacks: 2.9, pressurePct: 28.6, intPg: 1.3, dvoa: -19.8 },
      rush: { rank: 8, ydsAllowed: 116.7, dvoa: -16.1 },
      keyPlayers: ["Jonathan Greenard", "Brian Asamoah", "Byron Murphy", "Harrison Smith"],
      propImpact: {
        qb: "FADE — 176 pass yds allowed. Opposing QBs average 205 yards, under most lines.",
        rb: "MODERATE — Run defense is good but not elite. RB props are playable in right matchup.",
        wr: "FADE WR1 — Byron Murphy is underrated as a cover corner. WR1 struggles consistently.",
        te: "PLAYABLE — TE props are the best angle vs Minnesota. Safety coverage leaves TEs open on crossers."
      },
      bettingAngles: [
        "Vikings cover at elite rate as favorites — defense drives ATS consistency",
        "Best angle vs MIN: TE receiving yards OVER",
        "Opponent QBs rarely exceed 230 yards — hard fade passing yards overs"
      ],
      note: "Brian Flores' system has turned this defense into a top-3 unit. Pass rush depth is underrated — they rotate effectively and rarely lose late-game pressure."
    },

    "DEN": {
      team: "Denver Broncos", abbr: "DEN", conf: "AFC",
      season: 2025,
      tier: "ELITE",
      overall: { rank: 4, ptsAllowed: 18.9, ydsAllowed: 301.2, dvoa: -17.3 },
      pass: { rank: 5, ydsAllowed: 179.8, sacks: 3.0, pressurePct: 30.2, intPg: 1.0, dvoa: -18.4 },
      rush: { rank: 6, ydsAllowed: 121.4, dvoa: -14.8 },
      keyPlayers: ["Nik Bonitto", "Zach Allen", "Pat Surtain II", "Caden Sterns"],
      propImpact: {
        qb: "FADE — Pat Surtain II is the best cover corner in football. Opposing WR1 is neutralized. QBs average 201 yards.",
        rb: "FADE — Denver's front 7 is elite in run fits. Opposing RBs average 3.6 YPC.",
        wr: "HARD FADE WR1 — Surtain is elite. Target slot or WR2 if they're relevant enough.",
        te: "PLAYABLE — Surtain neutralizes the outside game so TEs often see volume on crossers."
      },
      bettingAngles: [
        "Denver defense is the reason their games trend UNDER — Broncos offense limits possessions",
        "FADE every opposing WR1 prop when playing in Denver",
        "Altitude factor: visiting offenses average 2.3 fewer points and 28 fewer yards in Mile High"
      ],
      note: "Pat Surtain II is a generational cover corner — best in the NFL. Nik Bonitto developed into an elite pass rusher. Denver's defense is the only reason Nix's game script works."
    },

    // ═══════════════════════════════════════
    // STRONG DEFENSES — 2025 SEASON
    // ═══════════════════════════════════════

    "KC": {
      team: "Kansas City Chiefs", abbr: "KC", conf: "AFC",
      season: 2025,
      tier: "STRONG",
      overall: { rank: 5, ptsAllowed: 20.1, ydsAllowed: 312.8, dvoa: -14.2 },
      pass: { rank: 7, ydsAllowed: 188.1, sacks: 2.7, pressurePct: 27.4, intPg: 0.9, dvoa: -15.1 },
      rush: { rank: 9, ydsAllowed: 124.7, dvoa: -12.8 },
      keyPlayers: ["Chris Jones", "Trent McDuffie", "Nick Bolton", "Bryan Cook"],
      propImpact: {
        qb: "FADE — Chris Jones dominates. 188 pass yds allowed. Opposing QBs average 213 yards.",
        rb: "PLAYABLE at reduced line — run defense is solid but not elite. RBs average 3.9 YPC.",
        wr: "FADE WR1 — Trent McDuffie is elite. Target WR2 if they're a real #2.",
        te: "MODERATE — Coverage is disciplined but TE crossers work vs their scheme."
      },
      bettingAngles: [
        "Chiefs defense wins games when Mahomes is limited — they carry spread alone when needed",
        "Opponent team totals reliably under 21 when facing full-strength KC D",
        "FADE WR1 props — McDuffie limits the best WR every single week"
      ],
      note: "Chris Jones is still the most disruptive interior DL in football when healthy. McDuffie emerged as elite cover corner. Chiefs defense consistently performs above expectations given age."
    },

    "SF": {
      team: "San Francisco 49ers", abbr: "SF", conf: "NFC",
      season: 2025,
      tier: "STRONG",
      overall: { rank: 6, ptsAllowed: 20.4, ydsAllowed: 315.3, dvoa: -13.8 },
      pass: { rank: 6, ydsAllowed: 185.2, sacks: 3.2, pressurePct: 31.1, intPg: 0.8, dvoa: -14.9 },
      rush: { rank: 11, ydsAllowed: 130.1, dvoa: -10.2 },
      keyPlayers: ["Nick Bosa", "Javon Hargrave", "Dre Greenlaw", "Charvarius Ward"],
      propImpact: {
        qb: "FADE — Nick Bosa is still a top-3 pass rusher. 3.2 sacks/g is top-5. QBs average 207 yards.",
        rb: "PLAYABLE — Run defense is average. Best angle vs SF is RB rushing yards over.",
        wr: "FADE WR1 — Ward is elite when healthy. WR2 and slot are more vulnerable.",
        te: "PLAYABLE — 49ers focus coverage on WR1, leaving TEs more room."
      },
      bettingAngles: [
        "49ers defense keeps them competitive even when Purdy is limited",
        "Best offensive prop vs SF: RB rushing yards OVER — their run D is average",
        "FADE WR1 props when Charvarius Ward is active and healthy"
      ],
      note: "Nick Bosa is the best edge rusher in the NFC when healthy. 49ers defense is top-10 in pass but average in run — target RB props vs their front 7."
    },

    "GB": {
      team: "Green Bay Packers", abbr: "GB", conf: "NFC",
      season: 2025,
      tier: "STRONG",
      overall: { rank: 7, ptsAllowed: 20.8, ydsAllowed: 318.1, dvoa: -12.4 },
      pass: { rank: 9, ydsAllowed: 191.3, sacks: 2.6, pressurePct: 26.8, intPg: 1.1, dvoa: -13.2 },
      rush: { rank: 7, ydsAllowed: 126.8, dvoa: -11.3 },
      keyPlayers: ["Rashan Gary", "Quay Walker", "Jaire Alexander", "Xavier McKinney"],
      propImpact: {
        qb: "FADE — Jaire Alexander limits WR1. QBs average 211 yards in Green Bay.",
        rb: "MODERATE — Run D is top-10 but not elite. RB props playable vs their base.",
        wr: "FADE WR1 vs Jaire — but WR2 and slot are workable targets.",
        te: "PLAYABLE — McKinney at safety doesn't dominate TE matchups. TE crossers work."
      },
      bettingAngles: [
        "Packers games trend UNDER in first half — Jordan Love takes time to warm up",
        "Best prop vs GB: TE receiving yards OVER — McKinney is not elite in space",
        "Jaire Alexander healthy = hard fade opposing WR1 every week"
      ],
      note: "Rashan Gary is the best pass rusher in the NFC East-North border. Jaire Alexander when healthy is still top-3 cover corner. Packers defense wins ugly — they don't blow you out but rarely lose on defense alone."
    },

    "BUF": {
      team: "Buffalo Bills", abbr: "BUF", conf: "AFC",
      season: 2025,
      tier: "STRONG",
      overall: { rank: 8, ptsAllowed: 21.2, ydsAllowed: 322.4, dvoa: -11.8 },
      pass: { rank: 8, ydsAllowed: 190.2, sacks: 2.8, pressurePct: 28.1, intPg: 1.0, dvoa: -12.7 },
      rush: { rank: 10, ydsAllowed: 132.2, dvoa: -9.8 },
      keyPlayers: ["Von Miller (health dependent)", "Ed Oliver", "Tre'Davious White", "Micah Hyde"],
      propImpact: {
        qb: "FADE — 190 pass yds allowed. Ed Oliver and Gregory Rousseau create consistent pressure.",
        rb: "MODERATE — Run D is solid but not elite. RBs average 4.0 YPC.",
        wr: "FADE WR1 when White is healthy — but his health is the key variable.",
        te: "MODERATE — Bills coverage can be exploited by athletic TEs on crossers."
      },
      bettingAngles: [
        "Bills defense is elevated when playing at Orchard Park — weather limits opposing offense",
        "Von Miller health is the key variable for pass rush quality — monitor weekly",
        "UNDER lean in cold-weather Bills home games"
      ],
      note: "Bills defense is legitimately elite when Von Miller is healthy. Ed Oliver is consistently underrated as interior pass rusher. Orchard Park weather adds 3-4 defensive advantage points in November/December."
    },

    // ═══════════════════════════════════════
    // AVERAGE DEFENSES — 2025 SEASON
    // ═══════════════════════════════════════

    "DET": {
      team: "Detroit Lions", abbr: "DET", conf: "NFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 16, ptsAllowed: 22.8, ydsAllowed: 339.1, dvoa: -3.2 },
      pass: { rank: 18, ydsAllowed: 214.3, sacks: 2.1, pressurePct: 23.2, intPg: 0.7, dvoa: -2.8 },
      rush: { rank: 14, ydsAllowed: 124.8, dvoa: -4.1 },
      keyPlayers: ["Aidan Hutchinson (returning)", "Alim McNeill", "Carlton Davis III", "Brian Branch"],
      propImpact: {
        qb: "PLAYABLE — 214 pass yds allowed. Opposing QBs average 236 yards at Ford Field.",
        rb: "PLAYABLE — Run D is average. RB props are workable at normal lines.",
        wr: "PLAYABLE — Carlton Davis is solid but not elite. WR props playable in normal game scripts.",
        te: "LEAN OVER — Branch is a solid box safety but TEs have success on seams vs Detroit."
      },
      bettingAngles: [
        "Detroit games go OVER at a high rate — their offense scores fast, defense can't always keep up",
        "OVER is the lean in DET home games — Ford Field dome, fast offense, average D",
        "Best prop vs DET: WR receiving yards OVER — coverage is average"
      ],
      note: "Detroit's defense improved dramatically but still lags their elite offense. Aidan Hutchinson returning changes the pass rush ceiling. Without him in 2025, the defense relied on scheme over talent."
    },

    "LAR": {
      team: "Los Angeles Rams", abbr: "LAR", conf: "NFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 17, ptsAllowed: 23.1, ydsAllowed: 341.8, dvoa: -2.1 },
      pass: { rank: 16, ydsAllowed: 210.4, sacks: 2.3, pressurePct: 24.1, intPg: 0.8, dvoa: -2.6 },
      rush: { rank: 19, ydsAllowed: 131.4, dvoa: -1.2 },
      keyPlayers: ["Byron Young", "Kobie Turner", "Darious Williams", "Jordan Fuller"],
      propImpact: {
        qb: "PLAYABLE — 210 pass yds allowed. Rams don't generate elite pressure — 2.3 sacks/g.",
        rb: "PLAYABLE — Rush D is average. RBs average 4.3 YPC vs Rams front.",
        wr: "LEAN OVER — No elite corners. WR props have strong upside vs Rams coverage.",
        te: "PLAYABLE — TE crossers work vs their zone coverage shell."
      },
      bettingAngles: [
        "Rams games often go OVER when both teams have quality offenses",
        "Best prop vs LAR: WR receiving yards OVER — no shutdown corners",
        "Stafford's offensive volume creates high total floors even vs average D"
      ],
      note: "Rams defense is functional but not elite. McVay's offense masks the defensive limitations. Byron Young is developing but not yet a true star. The defense is a prop-friendly matchup."
    },

    "DAL": {
      team: "Dallas Cowboys", abbr: "DAL", conf: "NFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 14, ptsAllowed: 22.3, ydsAllowed: 334.7, dvoa: -5.1 },
      pass: { rank: 13, ydsAllowed: 204.2, sacks: 2.4, pressurePct: 25.3, intPg: 0.9, dvoa: -5.8 },
      rush: { rank: 16, ydsAllowed: 130.5, dvoa: -3.8 },
      keyPlayers: ["Micah Parsons", "DaRon Bland", "Trevon Diggs (health)", "Mazi Smith"],
      propImpact: {
        qb: "LEAN FADE — Micah Parsons can disrupt any game plan when healthy. 2.4 sacks/g.",
        rb: "PLAYABLE — Rush D is middle-of-pack. RBs average 4.1 YPC vs Cowboys.",
        wr: "LEAN FADE WR1 — Diggs when healthy limits WR1. Without him, PLAYABLE.",
        te: "PLAYABLE — TE crossers and seams work vs Cowboys zone coverage."
      },
      bettingAngles: [
        "Cowboys defense with Parsons healthy = ATS lean. Without him = fade",
        "Micah Parsons health is the key variable for every Cowboys defensive prop",
        "Trevon Diggs health is the secondary variable — monitor weekly injury report"
      ],
      note: "Micah Parsons is still one of the three best defensive players in football when healthy. The Cowboys defense rises or falls entirely on his availability. Middle-of-pack without him, top-8 with him."
    },

    // ═══════════════════════════════════════
    // WEAK DEFENSES — 2025 SEASON
    // ═══════════════════════════════════════

    "MIA": {
      team: "Miami Dolphins", abbr: "MIA", conf: "AFC",
      season: 2025,
      tier: "WEAK",
      overall: { rank: 27, ptsAllowed: 26.8, ydsAllowed: 368.2, dvoa: 9.4 },
      pass: { rank: 26, ydsAllowed: 238.1, sacks: 1.7, pressurePct: 19.8, intPg: 0.6, dvoa: 10.2 },
      rush: { rank: 24, ydsAllowed: 130.1, dvoa: 7.8 },
      keyPlayers: ["Jaelan Phillips", "Calais Campbell", "Xavien Howard", "Jevon Holland"],
      propImpact: {
        qb: "LEAN OVER — 238 pass yds allowed. Opposing QBs average 251 yards vs Miami.",
        rb: "PLAYABLE OVER — Rush D is below average. RBs average 4.4 YPC.",
        wr: "LEAN OVER — Howard is aging. Opposing WR1 props have genuine upside.",
        te: "LEAN OVER — Miami's TE coverage is below average. Seam routes work."
      },
      bettingAngles: [
        "OVER lean in every Dolphins game — both sides score in Miami's games",
        "Opposing WR props are worth targeting vs Miami — Howard has declined",
        "Heat and humidity in Miami reduce total slightly in September/October"
      ],
      note: "Miami defense is middle-of-pack in points allowed but weak in pass coverage. Xavien Howard has declined from his elite peak. Jaelan Phillips pass rush is inconsistent. Prop-friendly matchup."
    },

    "CIN": {
      team: "Cincinnati Bengals", abbr: "CIN", conf: "AFC",
      season: 2025,
      tier: "WEAK",
      overall: { rank: 24, ptsAllowed: 25.4, ydsAllowed: 358.9, dvoa: 7.2 },
      pass: { rank: 23, ydsAllowed: 228.4, sacks: 1.9, pressurePct: 21.4, intPg: 0.7, dvoa: 8.1 },
      rush: { rank: 21, ydsAllowed: 130.5, dvoa: 5.8 },
      keyPlayers: ["Trey Hendrickson", "DJ Turner", "Logan Wilson", "Vonn Bell"],
      propImpact: {
        qb: "LEAN OVER — 228 pass yds allowed. Bengals generate limited pressure without Hendrickson healthy.",
        rb: "PLAYABLE OVER — Rush D is below average. RBs average 4.5 YPC.",
        wr: "LEAN OVER — DJ Turner is developing but not elite. WR props have upside.",
        te: "LEAN OVER — TE coverage is a weakness. Seam and crosser routes work consistently."
      },
      bettingAngles: [
        "OVER lean in Bengals games — Burrow scores fast, defense bleeds points",
        "Best prop vs CIN: WR receiving yards OVER — secondary is below average",
        "Trey Hendrickson health is the key defensive variable — monitors pass rush quality"
      ],
      note: "Bengals defense is the reason this team is inconsistent as a pick. Burrow carrying an average defense creates variance. When Hendrickson is healthy the pass rush is legitimate — otherwise OVER lean."
    },

    "NYJ": {
      team: "New York Jets", abbr: "NYJ", conf: "AFC",
      season: 2025,
      tier: "WEAK",
      overall: { rank: 28, ptsAllowed: 27.3, ydsAllowed: 372.8, dvoa: 10.8 },
      pass: { rank: 28, ydsAllowed: 241.2, sacks: 1.8, pressurePct: 20.2, intPg: 0.5, dvoa: 11.4 },
      rush: { rank: 25, ydsAllowed: 131.6, dvoa: 9.8 },
      keyPlayers: ["Will McDonald IV", "Quinnen Williams", "Sauce Gardner", "Jordan Whitehead"],
      propImpact: {
        qb: "OVER — 241 pass yds allowed is bottom-5 in NFL. Opposing QBs average 258 yards.",
        rb: "PLAYABLE OVER — Rush D is weak. RBs average 4.6 YPC vs Jets.",
        wr: "MODERATE — Sauce Gardner is still elite when targeted but he limits WR1. WR2 and slot are wide open.",
        te: "LEAN OVER — TE coverage is a major weakness. Every TE gets open."
      },
      bettingAngles: [
        "OVER lean in Jets games — Geno Smith can't keep pace when opponents score freely",
        "Best prop vs NYJ: WR2/slot receiving yards OVER — Gardner limits WR1 only",
        "Hard OVER on opposing TE props vs Jets — their TE coverage is bottom-5"
      ],
      note: "Jets defense with Sauce Gardner is still serviceable at corner but the rest of the secondary is weak. Pass rush declined after Haason Reddick holdout. Geno Smith's offense can't compensate — Jets games are a scoring proposition."
    },

    // ═══════════════════════════════════════
    // BOTTOM DEFENSES — 2025 SEASON
    // ═══════════════════════════════════════

    "CLE": {
      team: "Cleveland Browns", abbr: "CLE", conf: "AFC",
      season: 2025,
      tier: "BOTTOM",
      overall: { rank: 29, ptsAllowed: 28.1, ydsAllowed: 378.4, dvoa: 12.1 },
      pass: { rank: 27, ydsAllowed: 239.8, sacks: 1.6, pressurePct: 19.1, intPg: 0.5, dvoa: 12.8 },
      rush: { rank: 28, ydsAllowed: 138.6, dvoa: 10.9 },
      keyPlayers: ["Myles Garrett", "Za'Darius Smith", "Greg Newsome II", "Juan Thornhill"],
      propImpact: {
        qb: "OVER — 239 pass yds allowed despite Myles Garrett's presence. Opposing QBs average 252 yards.",
        rb: "LEAN OVER — Rush D is below average. RBs average 4.6 YPC.",
        wr: "OVER — Secondary is weak behind Newsome. WR props have strong upside vs Cleveland.",
        te: "OVER — TE coverage is a significant weakness. Every TE gets open vs Browns."
      },
      bettingAngles: [
        "OVER lean in Browns games — Shedeur Sanders can't keep pace, opponents score freely",
        "Myles Garrett is the ONLY reason Browns D isn't bottom-3 — he's the entire pass rush",
        "Best prop vs CLE: Any skilled offensive player receiving/rushing yards OVER"
      ],
      note: "Browns defense without a functional secondary is a bottom-tier unit despite Myles Garrett. Garrett is genuinely elite — top-3 pass rusher in NFL — but he can't single-handedly fix the secondary. OVER lean in every Browns game."
    },

    "TEN": {
      team: "Tennessee Titans", abbr: "TEN", conf: "AFC",
      season: 2025,
      tier: "BOTTOM",
      overall: { rank: 31, ptsAllowed: 29.8, ydsAllowed: 391.2, dvoa: 15.4 },
      pass: { rank: 30, ydsAllowed: 252.1, sacks: 1.4, pressurePct: 18.3, intPg: 0.4, dvoa: 16.2 },
      rush: { rank: 29, ydsAllowed: 139.1, dvoa: 13.8 },
      keyPlayers: ["Harold Landry III", "Jeffery Simmons", "Caleb Farley", "Amani Hooker"],
      propImpact: {
        qb: "STRONG OVER — 252 pass yds allowed is bottom-3. Opposing QBs average 268 yards.",
        rb: "OVER — Rush D is weak. RBs average 4.8 YPC. Every RB has rushing yards upside.",
        wr: "STRONG OVER — Coverage is bottom-5. Every WR1 prop is worth targeting vs Titans.",
        te: "STRONG OVER — TE coverage is the worst in the NFL. Seam routes work every play."
      },
      bettingAngles: [
        "OVER every single Titans game — both teams score. Cam Ward can't keep pace.",
        "Best prop in the NFL vs TEN: Every skilled position OVER at any line",
        "Tennessee is a bankable OVER team — their defense allowed 29.8 points per game"
      ],
      note: "Tennessee defense is one of the worst in the league. Cam Ward's development won't help when you allow nearly 30 points per game. OVER is the categorical lean in every Titans game."
    },

    "NE": {
      team: "New England Patriots", abbr: "NE", conf: "AFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 12, ptsAllowed: 21.8, ydsAllowed: 329.4, dvoa: -6.8 },
      pass: { rank: 11, ydsAllowed: 198.2, sacks: 2.5, pressurePct: 26.1, intPg: 1.0, dvoa: -7.4 },
      rush: { rank: 13, ydsAllowed: 131.2, dvoa: -5.8 },
      keyPlayers: ["Keion White", "Christian Barmore", "Myles Bryant", "Kyle Dugger"],
      propImpact: {
        qb: "LEAN FADE — 198 pass yds allowed. Patriots generated 2.5 sacks/g under Mayo.",
        rb: "MODERATE — Run D is above average. RBs average 3.9 YPC.",
        wr: "LEAN FADE — Patriots secondary is above average. WR1 props are fade territory.",
        te: "PLAYABLE — Dugger is a strong safety but TE slot routes work."
      },
      bettingAngles: [
        "Drake Maye's offense is the story but Patriots D keeps them in games",
        "Opponent team totals under 24 is the lean when Patriots are healthy",
        "New England's defense is actually above average — market underrates them"
      ],
      note: "Patriots defense under Jerod Mayo rebuilt quickly. Barmore and White form a legitimate interior pass rush. The secondary is young but improving. Don't sleep on this defense when handicapping Maye's team totals."
    },

    "ATL": {
      team: "Atlanta Falcons", abbr: "ATL", conf: "NFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 18, ptsAllowed: 23.4, ydsAllowed: 344.2, dvoa: -1.8 },
      pass: { rank: 17, ydsAllowed: 213.8, sacks: 2.2, pressurePct: 24.8, intPg: 0.8, dvoa: -2.1 },
      rush: { rank: 18, ydsAllowed: 130.4, dvoa: -1.3 },
      keyPlayers: ["Arnold Ebiketie", "David Onyemata", "A.J. Terrell", "Jessie Bates III"],
      propImpact: {
        qb: "PLAYABLE — 213 pass yds allowed. Penix-era Falcons defense is average.",
        rb: "PLAYABLE — Rush D is middle-of-pack. RBs average 4.2 YPC.",
        wr: "MODERATE — A.J. Terrell is legitimately elite. Target WR2 and slot.",
        te: "LEAN OVER — Bates is solid but TE crossers and seams work vs Atlanta zone."
      },
      bettingAngles: [
        "Falcons games are volatile — Penix offense is high ceiling, defense is average",
        "A.J. Terrell health = key variable for WR prop decisions vs Atlanta",
        "OVER lean when Falcons play high-powered offenses"
      ],
      note: "A.J. Terrell is the best corner on this defense and one of the most underrated in the NFC. Bates provides veteran leadership at safety. Middle-of-pack defense that neither carries nor kills the Falcons."
    },

    "IND": {
      team: "Indianapolis Colts", abbr: "IND", conf: "AFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 15, ptsAllowed: 22.6, ydsAllowed: 337.8, dvoa: -4.3 },
      pass: { rank: 14, ydsAllowed: 207.3, sacks: 2.3, pressurePct: 25.1, intPg: 0.9, dvoa: -4.8 },
      rush: { rank: 12, ydsAllowed: 130.5, dvoa: -3.4 },
      keyPlayers: ["Kwity Paye", "DeForest Buckner", "Kenny Moore II", "Julian Blackmon"],
      propImpact: {
        qb: "LEAN FADE — 207 pass yds allowed. Buckner and Paye generate consistent pressure.",
        rb: "MODERATE — Run D is above average. RBs average 3.8 YPC.",
        wr: "MODERATE — Moore is a good slot corner. WR1 outside is more vulnerable.",
        te: "PLAYABLE — TE props are workable vs Colts scheme."
      },
      bettingAngles: [
        "Colts defense keeps Daniel Jones in games — ATS lean when Jones is healthy",
        "DeForest Buckner against weakened O-lines is a sack prop angle",
        "Colts games trend UNDER when both defenses are healthy"
      ],
      note: "DeForest Buckner is still one of the best interior pass rushers in the AFC. Colts defense under Gus Bradley is scheme-sound. Above-average unit that rarely makes game-costing mistakes."
    },

    "JAX": {
      team: "Jacksonville Jaguars", abbr: "JAX", conf: "AFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 13, ptsAllowed: 22.1, ydsAllowed: 332.1, dvoa: -5.8 },
      pass: { rank: 12, ydsAllowed: 201.3, sacks: 2.6, pressurePct: 26.8, intPg: 0.9, dvoa: -6.4 },
      rush: { rank: 15, ydsAllowed: 130.8, dvoa: -4.9 },
      keyPlayers: ["Josh Allen (DL)", "Travon Walker", "Tyson Campbell", "Andre Cisco"],
      propImpact: {
        qb: "LEAN FADE — Josh Allen (DL) is the best pass rusher they have. 2.6 sacks/g is strong.",
        rb: "PLAYABLE — Run D is middle-of-pack. RBs average 4.0 YPC.",
        wr: "MODERATE — Campbell is solid. WR props are matchup-dependent.",
        te: "LEAN OVER — TE coverage is below average. Crossers work vs their coverage."
      },
      bettingAngles: [
        "Jaguars games trend toward medium totals — neither elite D nor terrible",
        "Josh Allen (DL) and Travon Walker health drives pass rush quality — monitor",
        "Best prop vs JAX: TE receiving yards OVER"
      ],
      note: "Jacksonville defense is above average when both edge rushers are healthy. The secondary improved with Campbell's development. One of the more underrated defensive units in the AFC."
    },

    "SEA": {
      team: "Seattle Seahawks", abbr: "SEA", conf: "NFC",
      season: 2025,
      tier: "AVERAGE",
      overall: { rank: 11, ptsAllowed: 21.6, ydsAllowed: 326.8, dvoa: -7.2 },
      pass: { rank: 10, ydsAllowed: 196.4, sacks: 2.7, pressurePct: 27.2, intPg: 1.1, dvoa: -7.9 },
      rush: { rank: 17, ydsAllowed: 130.4, dvoa: -5.8 },
      keyPlayers: ["Boye Mafe", "Dre'Mont Jones", "Devon Witherspoon", "Jamal Adams"],
      propImpact: {
        qb: "LEAN FADE — 196 pass yds allowed. Witherspoon is an elite young corner.",
        rb: "PLAYABLE — Rush D is average. RBs get their yards but not big games.",
        wr: "LEAN FADE WR1 — Witherspoon limits the best WR every week. WR2 is more open.",
        te: "PLAYABLE — TE crossers work vs Seattle's coverage."
      },
      bettingAngles: [
        "Seahawks defense is quietly above average — market underrates it",
        "Devon Witherspoon is the best young corner in the NFC — fade WR1 when he's healthy",
        "CenturyLink crowd is a 2-3 point home field advantage"
      ],
      note: "Devon Witherspoon is developing into an elite corner. Boye Mafe is a consistent pass rusher. Seattle's defense is better than their record suggests — Darnold's regression risk is a bigger concern than defensive quality."
    },

    "HOU": {
      team: "Houston Texans", abbr: "HOU", conf: "AFC",
      season: 2025,
      tier: "STRONG",
      overall: { rank: 9, ptsAllowed: 21.4, ydsAllowed: 323.8, dvoa: -11.2 },
      pass: { rank: 15, ydsAllowed: 208.4, sacks: 2.4, pressurePct: 25.8, intPg: 0.9, dvoa: -9.8 },
      rush: { rank: 4, ydsAllowed: 115.4, dvoa: -14.1 },
      keyPlayers: ["Will Anderson Jr.", "Danielle Hunter", "Derek Stingley Jr.", "Jimmie Ward"],
      propImpact: {
        qb: "LEAN FADE — Will Anderson Jr. is developing into a top pass rusher. 2.4 sacks/g.",
        rb: "STRONG FADE — 4th-best rush D in NFL. RBs average 3.4 YPC. Fade rushing props.",
        wr: "LEAN FADE WR1 — Stingley is developing into an elite corner. WR1 limited.",
        te: "MODERATE — TE crossers work vs their rush D focus."
      },
      bettingAngles: [
        "Texans rush defense is elite — fade all opposing RB rushing yard props",
        "Will Anderson Jr. and Danielle Hunter together = top-3 edge rush duo",
        "UNDER lean in Texans home games when their rush D limits ball control"
      ],
      note: "Texans rush defense is genuinely elite and underrated. Will Anderson Jr. took a major step forward. Stingley vs. WR1 matchups are worth monitoring — he's becoming one of the best young corners in the AFC."
    },

    "TB": {
      team: "Tampa Bay Buccaneers", abbr: "TB", conf: "NFC",
      season: 2025,
      tier: "STRONG",
      overall: { rank: 10, ptsAllowed: 21.5, ydsAllowed: 325.1, dvoa: -10.8 },
      pass: { rank: 10, ydsAllowed: 197.2, sacks: 2.6, pressurePct: 27.1, intPg: 1.1, dvoa: -11.4 },
      rush: { rank: 20, ydsAllowed: 127.9, dvoa: -8.8 },
      keyPlayers: ["Vita Vea", "Yaya Diaby", "Carlton Davis III", "Antoine Winfield Jr."],
      propImpact: {
        qb: "LEAN FADE — Vita Vea and Diaby create consistent pressure. 2.6 sacks/g.",
        rb: "PLAYABLE — Rush D is average. RBs get their yards vs Tampa's front.",
        wr: "LEAN FADE — Carlton Davis and Winfield limit the best passing options.",
        te: "LEAN FADE — Winfield Jr. is the best coverage safety in the NFC. TEs have limited production."
      },
      bettingAngles: [
        "Bucs defense is why Mayfield's team is consistently competitive in the NFC South",
        "Antoine Winfield Jr. limits TE props vs Tampa — hard fade TE receiving yards",
        "Tampa games trend UNDER more often than the market prices — fade high totals"
      ],
      note: "Antoine Winfield Jr. is the best coverage safety in the NFC and one of the most underrated defensive players in football. Vita Vea controls the run. Tampa's defense is the reason Mayfield's offense is so effective — they control possession."
    },

    // Additional teams with summary profiles
    "CAR": {
      team: "Carolina Panthers", abbr: "CAR", conf: "NFC", season: 2025, tier: "BOTTOM",
      overall: { rank: 32, ptsAllowed: 30.4, ydsAllowed: 398.1, dvoa: 17.2 },
      pass: { rank: 32, ydsAllowed: 261.3, sacks: 1.3, pressurePct: 17.8, intPg: 0.4, dvoa: 18.1 },
      rush: { rank: 30, ydsAllowed: 136.8, dvoa: 15.6 },
      keyPlayers: ["Brian Burns", "Derrick Brown", "Donte Jackson", "Jaycee Horn"],
      propImpact: { qb: "STRONG OVER", rb: "OVER", wr: "STRONG OVER", te: "STRONG OVER" },
      bettingAngles: ["OVER every Panthers game", "Every skilled position prop is worth targeting OVER vs Carolina"],
      note: "Worst defense in the NFL. Brian Burns can't do it alone. OVER is the categorical lean in every Panthers game."
    },

    "NYG": {
      team: "New York Giants", abbr: "NYG", conf: "NFC", season: 2025, tier: "WEAK",
      overall: { rank: 25, ptsAllowed: 25.8, ydsAllowed: 361.4, dvoa: 8.1 },
      pass: { rank: 24, ydsAllowed: 231.8, sacks: 1.8, pressurePct: 20.4, intPg: 0.6, dvoa: 8.7 },
      rush: { rank: 22, ydsAllowed: 129.6, dvoa: 6.8 },
      keyPlayers: ["Kayvon Thibodeaux", "Dexter Lawrence", "Adoree Jackson", "Jason Pinnock"],
      propImpact: { qb: "LEAN OVER", rb: "PLAYABLE", wr: "LEAN OVER", te: "LEAN OVER" },
      bettingAngles: ["Giants defense is below average — OVER lean in their games", "Dexter Lawrence is the only reason this defense is functional"],
      note: "Giants defense is bottom-tier despite Dexter Lawrence being elite. Secondary is the problem. OVER lean in most Giants games."
    },

    "WAS": {
      team: "Washington Commanders", abbr: "WAS", conf: "NFC", season: 2025, tier: "AVERAGE",
      overall: { rank: 20, ptsAllowed: 24.1, ydsAllowed: 347.8, dvoa: 0.8 },
      pass: { rank: 19, ydsAllowed: 216.2, sacks: 2.2, pressurePct: 24.1, intPg: 0.8, dvoa: 0.4 },
      rush: { rank: 23, ydsAllowed: 131.6, dvoa: 1.4 },
      keyPlayers: ["Chase Young", "Jonathan Allen", "Benjamin St-Juste", "Kamren Curl"],
      propImpact: { qb: "PLAYABLE", rb: "LEAN OVER — Rush D weak", wr: "PLAYABLE", te: "PLAYABLE" },
      bettingAngles: ["Chase Young's health drives Washington D quality", "Rush D is below average — fade opposing RB unders vs WAS"],
      note: "Commanders defense is average across the board. Chase Young is the only elite player. Works as an ATS push team rather than a hard lean either direction."
    },

    "CHI": {
      team: "Chicago Bears", abbr: "CHI", conf: "NFC", season: 2025, tier: "AVERAGE",
      overall: { rank: 19, ptsAllowed: 23.8, ydsAllowed: 346.1, dvoa: -0.4 },
      pass: { rank: 20, ydsAllowed: 217.3, sacks: 2.3, pressurePct: 24.8, intPg: 0.8, dvoa: -0.8 },
      rush: { rank: 26, ydsAllowed: 128.8, dvoa: 1.8 },
      keyPlayers: ["Montez Sweat", "Grady Jarrett", "Jaylon Johnson", "Kevin Byard III"],
      propImpact: { qb: "PLAYABLE", rb: "LEAN OVER — Rush D weak", wr: "MODERATE", te: "PLAYABLE" },
      bettingAngles: ["Montez Sweat health drives Bears pass rush quality", "Rush D is below average — RB rushing props are worth targeting"],
      note: "Montez Sweat when healthy is a legitimate pass rusher. Jaylon Johnson is solid at corner. Defense is average — neither a hard fade nor a strong lean vs prop lines."
    },

    "ARI": {
      team: "Arizona Cardinals", abbr: "ARI", conf: "NFC", season: 2025, tier: "WEAK",
      overall: { rank: 26, ptsAllowed: 26.4, ydsAllowed: 366.8, dvoa: 8.8 },
      pass: { rank: 25, ydsAllowed: 236.2, sacks: 1.8, pressurePct: 20.1, intPg: 0.6, dvoa: 9.4 },
      rush: { rank: 27, ydsAllowed: 130.6, dvoa: 7.8 },
      keyPlayers: ["Zaven Collins", "Michael Dogbe", "Byron Murphy Jr.", "Budda Baker"],
      propImpact: { qb: "LEAN OVER", rb: "LEAN OVER", wr: "LEAN OVER", te: "LEAN OVER" },
      bettingAngles: ["OVER lean in Cardinals games — both sides score", "Kyler Murray offense can outscore bad defenses but Arizona can't stop opponents"],
      note: "Arizona defense is weak across the board. Byron Murphy Jr. is the only above-average piece. OVER lean in all Cardinals games when Kyler is healthy."
    },

    "LVR": {
      team: "Las Vegas Raiders", abbr: "LVR", conf: "AFC", season: 2025, tier: "BOTTOM",
      overall: { rank: 30, ptsAllowed: 28.8, ydsAllowed: 382.4, dvoa: 13.8 },
      pass: { rank: 29, ydsAllowed: 248.1, sacks: 1.5, pressurePct: 18.8, intPg: 0.5, dvoa: 14.6 },
      rush: { rank: 31, ydsAllowed: 134.3, dvoa: 12.4 },
      keyPlayers: ["Maxx Crosby", "Adam Butler", "Nate Hobbs", "Marcus Peters"],
      propImpact: { qb: "STRONG OVER", rb: "OVER", wr: "STRONG OVER", te: "OVER" },
      bettingAngles: ["OVER every Raiders game", "Maxx Crosby alone can't fix this defense", "Every opposing skill position prop is worth targeting OVER vs LVR"],
      note: "Raiders defense is one of the worst in the league despite Maxx Crosby being elite. Crosby is top-3 pass rusher in the NFL but can't cover for a broken secondary. Hard OVER lean every week."
    },

    "LAC": {
      team: "Los Angeles Chargers", abbr: "LAC", conf: "AFC", season: 2025, tier: "STRONG",
      overall: { rank: 8, ptsAllowed: 21.2, ydsAllowed: 320.4, dvoa: -12.1 },
      pass: { rank: 7, ydsAllowed: 189.2, sacks: 2.8, pressurePct: 28.4, intPg: 0.9, dvoa: -12.8 },
      rush: { rank: 5, ydsAllowed: 131.2, dvoa: -10.8 },
      keyPlayers: ["Joey Bosa", "Khalil Mack", "Asante Samuel Jr.", "Derwin James"],
      propImpact: { qb: "LEAN FADE", rb: "LEAN FADE", wr: "LEAN FADE WR1", te: "MODERATE" },
      bettingAngles: ["Derwin James is the best safety in the AFC", "Chargers D is why Harbaugh's team is competitive — Herbert's offense is supported by real defense"],
      note: "Derwin James is legitimately the best safety in football. Joey Bosa and Khalil Mack together create edge rush problems for any offense. Harbaugh's defense is his calling card."
    },

    "PIT": {
      team: "Pittsburgh Steelers", abbr: "PIT", conf: "AFC", season: 2025, tier: "STRONG",
      overall: { rank: 7, ptsAllowed: 20.8, ydsAllowed: 316.8, dvoa: -13.1 },
      pass: { rank: 8, ydsAllowed: 190.8, sacks: 2.7, pressurePct: 27.8, intPg: 1.0, dvoa: -13.8 },
      rush: { rank: 8, ydsAllowed: 126.0, dvoa: -11.4 },
      keyPlayers: ["T.J. Watt", "Cameron Heyward", "Patrick Queen", "Joey Porter Jr."],
      propImpact: { qb: "LEAN FADE — T.J. Watt", rb: "LEAN FADE", wr: "LEAN FADE WR1", te: "MODERATE" },
      bettingAngles: ["T.J. Watt is the best pass rusher in the AFC", "Steelers defense carries this team when Rodgers is limited", "UNDER lean in Steelers home games — they play slower"],
      note: "T.J. Watt is the best pass rusher in the AFC and arguably the best defensive player in football when healthy. Pittsburgh defense is the reason Aaron Rodgers is relevant at 42."
    },

    "NO": {
      team: "New Orleans Saints", abbr: "NO", conf: "NFC", season: 2025, tier: "AVERAGE",
      overall: { rank: 21, ptsAllowed: 24.2, ydsAllowed: 348.8, dvoa: 1.2 },
      pass: { rank: 22, ydsAllowed: 219.4, sacks: 2.1, pressurePct: 23.8, intPg: 0.7, dvoa: 1.6 },
      rush: { rank: 16, ydsAllowed: 129.4, dvoa: 0.6 },
      keyPlayers: ["Carl Granderson", "Pete Werner", "Alontae Taylor", "Tyrann Mathieu"],
      propImpact: { qb: "PLAYABLE", rb: "PLAYABLE", wr: "PLAYABLE", te: "LEAN OVER" },
      bettingAngles: ["Saints defense is mediocre without elite talent", "Tyler Shough can't carry a below-average defense — OVER lean in Saints games"],
      note: "Tyrann Mathieu is aging but still a smart veteran safety. Saints defense is mediocre across the board — functional but not a game-changer in either direction."
    },
  };

  return res.status(200).json({ defenses, updated_at: "2026-03-30", season: 2025 });
}
