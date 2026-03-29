// api/nfl-wr-te.js
// NFL Wide Receiver + Tight End Database for UR TAKE
// Source: PFR receiving stats
// 2025 season = season ending Jan 2026 (current baseline)
// 2024 season = season ending Jan 2025 (trend comparison only)

export const WRsAndTEs = {

  // ============================================================
  // WIDE RECEIVERS
  // ============================================================

  // -- TIER 1: ELITE WR (100+ rec or 1400+ yds, true WR1 ceiling) ----------

  "Puka Nacua": {
    team: "LAR", pos: "WR", tier: "ELITE",
    rec2025: { g: 16, tgt: 166, rec: 129, yds: 1715, td: 0, recPg: 8.1, ydsPg: 107.2, ypr: 13.3, adot: 9.3, ctchPct: 77.7, drop: 4 },
    rec2024: { rec: 79, yds: 990, ydsPg: 90.0 },
    trend: { note: "MASSIVE leap -- 107 yds/g is elite volume. Led all WRs in receptions. Zero TDs is the concern -- market will underprice him when TD props appear." },
    props: {
      recYds: { floor: 75, ceil: 140, lean: "OVER -- 107.2 yds/g leads WRs. McVay scheme feeds him every week." },
      rec: { floor: 6, ceil: 11, lean: "OVER on catches -- 8.06 rec/g is elite volume" },
      td: { pg: 0.00, lean: "FADE TD scorer -- zero TDs in 16 games is historically anomalous. Regression coming but unpredictable." },
      best: "Receiving yards OVER. Most targets in the NFL (166). Volume is the entire story."
    },
    situation2026: "Rams WR1 with Stafford. Play-action offense creates elite separation. TD regression is the wildcard -- he should score more.",
    bettingAngles: ["Receiving yards OVER every week -- 107 base is elite", "FADE TD scorer until proven otherwise", "Catches OVER is reliable -- 8+ rec/g is consistent"],
    fantasy: { pprRank: "WR1-5", note: "Elite PPR back. TD regression will come. Draft as WR1." }
  },

  "Ja'Marr Chase": {
    team: "CIN", pos: "WR", tier: "ELITE",
    rec2025: { g: 16, tgt: 185, rec: 125, yds: 1412, td: 10, recPg: 7.8, ydsPg: 88.3, ypr: 11.3, adot: 8.5, ctchPct: 67.6, drop: 4 },
    rec2024: { rec: 127, yds: 1708, ydsPg: 100.5 },
    trend: { note: "Slight decline from historic 2024 but still elite. Burrow health the key variable -- Chase is only as good as his QB." },
    props: {
      recYds: { floor: 65, ceil: 125, lean: "OVER when Burrow healthy -- 88.3 base is elite" },
      rec: { floor: 5, ceil: 10, lean: "OVER -- 7.8 rec/g with elite target share" },
      td: { pg: 0.63, lean: "OVER 0.5 TD in favorable matchups -- 10 TDs in 16 games" },
      best: "Receiving yards OVER when Burrow plays. He's the most talented WR in football."
    },
    situation2026: "Bengals WR1 locked in. Burrow health is the only variable. When Burrow plays, Chase is a WR1 every week.",
    bettingAngles: ["Receiving yards OVER when Burrow active", "TD scorer OVER in red zone games", "Monitor Burrow health weekly -- Chase props tank without him"],
    fantasy: { pprRank: "WR1-3", note: "Elite ceiling. Burrow health is the only risk." }
  },

  "Jaxon Smith-Njigba": {
    team: "SEA", pos: "WR", tier: "ELITE",
    rec2025: { g: 17, tgt: 163, rec: 119, yds: 1793, td: 6, recPg: 7.0, ydsPg: 105.5, ypr: 15.1, adot: 11.2, ctchPct: 73.0, drop: 5 },
    rec2024: { rec: 100, yds: 1130, ydsPg: 66.5 },
    trend: { note: "BREAKOUT -- 105.5 yds/g is elite. Led all WRs in total yards. Leap from solid to truly elite." },
    props: {
      recYds: { floor: 75, ceil: 145, lean: "OVER -- 105.5 yds/g base. Led NFL in receiving yards." },
      rec: { floor: 5, ceil: 10, lean: "OVER -- 7.0 rec/g on 163 targets" },
      td: { pg: 0.35, lean: "Moderate -- 6 TDs, not a TD dependent play" },
      best: "Receiving yards OVER. Most receiving yards in the NFL in 2025. Full WR1 ascension confirmed."
    },
    situation2026: "Seahawks WR1 with Darnold. JSN is the offense. Volume is locked in regardless of QB.",
    bettingAngles: ["Receiving yards OVER is the primary lean every week", "Total yards led the NFL -- market may still underrate him", "Catches OVER is reliable secondary prop"],
    fantasy: { pprRank: "WR1-4", note: "Top-3 WR in football now. Draft accordingly." }
  },

  "Amon-Ra St. Brown": {
    team: "DET", pos: "WR", tier: "ELITE",
    rec2025: { g: 17, tgt: 172, rec: 117, yds: 1401, td: 12, recPg: 6.9, ydsPg: 82.4, ypr: 12.0, adot: 7.9, ctchPct: 68.0, drop: 10 },
    rec2024: { rec: 115, yds: 1263, ydsPg: 74.3 },
    trend: { note: "Improved from 2024 -- 12 TDs is elite. Drop rate (10) is the only concern. Goff offense feeds him constantly." },
    props: {
      recYds: { floor: 60, ceil: 110, lean: "OVER -- 82.4 base in Goff's scheme" },
      rec: { floor: 5, ceil: 10, lean: "OVER -- 6.9 rec/g on massive target share" },
      td: { pg: 0.71, lean: "OVER 0.5 TD -- 12 TDs, elite red zone WR" },
      best: "TD scorer OVER. 0.71 TDs/game combined with volume makes him the safest weekly prop."
    },
    situation2026: "Lions WR1 with Goff. Gibbs and Montgomery in backfield create play-action that benefits ARSB. Most reliable Detroit prop.",
    bettingAngles: ["TD scorer OVER every week -- 12 TDs is elite", "Receiving yards OVER is consistent", "Drop rate (10) is the fade angle in tough matchups"],
    fantasy: { pprRank: "WR1-5", note: "Volume + TDs = elite WR1. Never misses." }
  },

  // -- TIER 2: STRONG WR1 (75-100 rec or 1000+ yds) -----------------------

  "CeeDee Lamb": {
    team: "DAL", pos: "WR", tier: "STRONG",
    rec2025: { g: 14, tgt: 117, rec: 75, yds: 1077, td: 6, recPg: 5.4, ydsPg: 76.9, ypr: 14.4, adot: 11.7, ctchPct: 64.1, drop: 8 },
    rec2024: { rec: 101, yds: 1194, ydsPg: 79.6 },
    trend: { note: "Missed 3 games. Per-game numbers basically flat. Health is the question mark entering 2026." },
    props: {
      recYds: { floor: 60, ceil: 115, lean: "OVER when healthy -- 77 yds/g base" },
      td: { pg: 0.43, lean: "OVER 0.5 in favorable matchups" },
      best: "Receiving yards OVER when healthy. Elite talent, health is the variable."
    },
    situation2026: "Cowboys WR1 with Prescott and Pickens. Top-3 WR talent but injury history is real concern.",
    bettingAngles: ["Health monitor every week", "OVER when active -- talent guarantees production", "FADE in short weeks or injury reports"],
    fantasy: { pprRank: "WR1-6", note: "Elite when healthy. ADP risk due to injury history." }
  },

  "Justin Jefferson": {
    team: "MIN", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 141, rec: 84, yds: 1048, td: 5, recPg: 4.9, ydsPg: 61.6, ypr: 12.5, adot: 10.2, ctchPct: 59.6, drop: 3 },
    rec2024: { rec: 103, yds: 1533, ydsPg: 90.2 },
    trend: { note: "DECLINE -- 62 yds/g vs 90 in 2024. Darnold situation limited ceiling. 10 INTs thrown to his side is brutal context." },
    props: {
      recYds: { floor: 50, ceil: 95, lean: "OVER in favorable matchups -- production floor is lower than 2024" },
      td: { pg: 0.29, lean: "FADE TD scorer -- only 5 TDs, Vikings red zone not efficient for him" },
      best: "Receiving yards OVER when Vikings game script is pass-heavy."
    },
    situation2026: "Vikings WR1 but QB situation (Darnold) caps ceiling. Jefferson's talent is unquestioned but context limits him.",
    bettingAngles: ["Receiving yards OVER when Vikings trailing (pass-heavy script)", "FADE in run-heavy game scripts", "Monitor QB situation -- key variable"],
    fantasy: { pprRank: "WR1-8", note: "Elite talent, scheme-limited. Draft with caution." }
  },

  "George Pickens": {
    team: "DAL", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 137, rec: 93, yds: 1429, td: 8, recPg: 5.5, ydsPg: 84.1, ypr: 15.4, adot: 11.3, ctchPct: 67.9, drop: 4 },
    rec2024: { rec: 59, yds: 900, ydsPg: 64.3 },
    trend: { note: "HUGE leap joining Dallas. 84 yds/g with Prescott is elite production. New home unlocked his full potential." },
    props: {
      recYds: { floor: 65, ceil: 125, lean: "OVER -- 84 base is real, Dallas scheme feeds big-play WRs" },
      td: { pg: 0.47, lean: "OVER 0.5 in red zone games -- 8 TDs confirms usage" },
      best: "Receiving yards OVER. Deep threat efficiency (15.4 YPR) means every catch is a big gain."
    },
    situation2026: "Cowboys WR2/1 depending on Lamb health. Prescott targets him downfield. Elite big-play prop every week.",
    bettingAngles: ["Receiving yards OVER -- big-play ability inflates totals", "TD scorer when Dallas in red zone", "OVER 80 yards is the sweet spot line"],
    fantasy: { pprRank: "WR1-9", note: "Elite in standard scoring. Big-play machine." }
  },

  "A.J. Brown": {
    team: "PHI", pos: "WR", tier: "STRONG",
    rec2025: { g: 15, tgt: 121, rec: 78, yds: 1003, td: 7, recPg: 5.2, ydsPg: 66.9, ypr: 12.9, adot: 11.8, ctchPct: 64.5, drop: 1 },
    rec2024: { rec: 67, yds: 1079, ydsPg: 83.0 },
    trend: { note: "Slight decline in volume but maintained elite efficiency. Lowest drop rate (1) among elite WRs. Missed 2 games." },
    props: {
      recYds: { floor: 55, ceil: 100, lean: "OVER when healthy -- 67 base, elite efficiency" },
      td: { pg: 0.47, lean: "OVER 0.5 TD -- 7 TDs shows consistent red zone usage" },
      best: "Receiving yards OVER. Near-zero drop rate means every target counts."
    },
    situation2026: "Eagles WR1 with Hurts. Barkley rushing opens lanes. AJB is the primary vertical threat.",
    bettingAngles: ["Receiving yards OVER is the lean", "Health monitor -- missed games in 2025", "Zero drops makes him hyper-reliable when active"],
    fantasy: { pprRank: "WR1-10", note: "Elite efficiency. Health is the only risk." }
  },

  "Chris Olave": {
    team: "NOR", pos: "WR", tier: "STRONG",
    rec2025: { g: 16, tgt: 156, rec: 100, yds: 1163, td: 3, recPg: 6.3, ydsPg: 72.7, ypr: 11.6, adot: 11.8, ctchPct: 64.1, drop: 5 },
    rec2024: { rec: 32, yds: 400, ydsPg: 50.0 },
    trend: { note: "Full healthy season delivered elite volume. 4 missed games in 2024 were the outlier. When healthy, he's a true WR1." },
    props: {
      recYds: { floor: 55, ceil: 100, lean: "OVER -- 72.7 base on 156 targets" },
      td: { pg: 0.19, lean: "FADE TD scorer -- only 3 TDs despite volume" },
      best: "Receiving yards OVER. Volume (156 tgt) is elite even if TD rate is low."
    },
    situation2026: "Saints WR1. Rattler situation is the QB variable. Olave's role is locked in regardless.",
    bettingAngles: ["Receiving yards OVER is reliable", "FADE TD scorer -- Saints red zone doesn't use him enough", "Catches OVER is strong -- 6.3 rec/g"],
    fantasy: { pprRank: "WR2-14", note: "Volume WR2 with WR1 ceiling. TD-limited." }
  },

  "Zay Flowers": {
    team: "BAL", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 118, rec: 86, yds: 1211, td: 4, recPg: 5.1, ydsPg: 71.2, ypr: 14.1, adot: 10.2, ctchPct: 72.9, drop: 7 },
    rec2024: { rec: 74, yds: 1059, ydsPg: 62.3 },
    trend: { note: "Improved from 2024. Lamar Jackson connection is real. Drop rate (7) is the concern." },
    props: {
      recYds: { floor: 55, ceil: 105, lean: "OVER -- 71 base with Lamar's playmaking" },
      td: { pg: 0.24, lean: "FADE -- only 4 TDs despite volume. Lamar and Derrick Henry eat red zone TDs." },
      best: "Receiving yards OVER when Lamar healthy. The big-play threat in Baltimore's offense."
    },
    situation2026: "Ravens WR1 with Lamar. Henry and Andrews share targets but Flowers is the downfield threat.",
    bettingAngles: ["Receiving yards OVER when Lamar active", "FADE TD scorer -- Henry and Andrews own red zone", "Drop rate (7) is a fade angle in crucial game situations"],
    fantasy: { pprRank: "WR2-16", note: "Good WR2 but TD rate caps ceiling." }
  },

  "Stefon Diggs": {
    team: "NWE", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 102, rec: 85, yds: 1013, td: 3, recPg: 5.0, ydsPg: 59.6, ypr: 11.9, adot: 8.5, ctchPct: 83.3, drop: 3 },
    rec2024: { rec: 47, yds: 496, ydsPg: 62.0 },
    trend: { note: "Healthy full season. Elite catch rate (83%) shows he's still precise. Age 32 -- Drake Maye connection is the key variable." },
    props: {
      recYds: { floor: 45, ceil: 85, lean: "OVER in pass-heavy scripts" },
      td: { pg: 0.18, lean: "FADE TD scorer -- Patriots offense not efficient in red zone" },
      best: "Catches OVER. 5.0 rec/g with elite catch rate -- the floor prop."
    },
    situation2026: "Patriots WR1 with Drake Maye. Maye's improvement directly correlates with Diggs' ceiling.",
    bettingAngles: ["Catches OVER is the safest prop", "Receiving yards moderate lean OVER", "TD fade -- Patriots red zone is broken"],
    fantasy: { pprRank: "WR2-20", note: "Age concern but still reliable. PPR floor back." }
  },

  "Nico Collins": {
    team: "HOU", pos: "WR", tier: "STRONG",
    rec2025: { g: 15, tgt: 120, rec: 71, yds: 1117, td: 5, recPg: 4.7, ydsPg: 74.5, ypr: 15.7, adot: 12.7, ctchPct: 59.2, drop: 1 },
    rec2024: { rec: 68, yds: 1006, ydsPg: 83.8 },
    trend: { note: "Missed 2 games. Per-game numbers slightly down but still elite efficiency. Stroud connection is real." },
    props: {
      recYds: { floor: 60, ceil: 115, lean: "OVER when healthy -- 74.5 base, elite 15.7 YPR" },
      td: { pg: 0.33, lean: "OVER 0.5 in favorable matchups" },
      best: "Receiving yards OVER. Elite YPR (15.7) means fewer catches can still hit big yardage totals."
    },
    situation2026: "Texans WR1 with Stroud. Health is the only risk -- missed time in both 2024 and 2025.",
    bettingAngles: ["Receiving yards OVER -- YPR inflates totals", "Health monitor every week", "OVER 70 yards is the reliable line"],
    fantasy: { pprRank: "WR1-11", note: "Elite when healthy. ADP risk due to injury history." }
  },

  "Tetairoa McMillan": {
    team: "CAR", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 122, rec: 70, yds: 1014, td: 8, recPg: 4.1, ydsPg: 59.6, ypr: 14.5, adot: 11.6, ctchPct: 57.4, drop: 8 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Rookie. 1,000 yards and 8 TDs as a first-year player on a rebuilding team is elite. AP Offensive Rookie of the Year." },
    props: {
      recYds: { floor: 50, ceil: 95, lean: "OVER -- developing WR1 with real usage" },
      td: { pg: 0.47, lean: "OVER 0.5 TD -- 8 TDs shows red zone role already established" },
      best: "TD scorer OVER. 8 TDs as a rookie is real red zone usage. This will only grow."
    },
    situation2026: "Panthers WR1. Bryce Young improving. McMillan's role locked in and growing.",
    bettingAngles: ["TD scorer OVER -- red zone role real", "Receiving yards OVER in pass-heavy scripts", "Drop rate (8) is the fade concern"],
    fantasy: { pprRank: "WR1-12", note: "Year 2 breakout candidate. Draft as WR1." }
  },

  "Terry McLaurin": {
    team: "WAS", pos: "WR", tier: "STRONG",
    rec2025: { g: 10, tgt: 60, rec: 38, yds: 582, td: 8, recPg: 3.8, ydsPg: 58.2, ypr: 15.3, adot: 13.9, ctchPct: 63.3, drop: 1 },
    rec2024: { rec: 82, yds: 1096, ydsPg: 64.5 },
    trend: { note: "Missed 7 games. When healthy, TD rate (0.8/g) is elite -- 8 TDs in 10 games. Daniels connection is real." },
    props: {
      recYds: { floor: 45, ceil: 95, lean: "OVER when healthy" },
      td: { pg: 0.80, lean: "OVER 0.5 TD -- elite red zone usage when active" },
      best: "TD scorer OVER when healthy. 0.8 TDs/game is among the best rates at the position."
    },
    situation2026: "Commanders WR1 with Daniels. Health is the question -- missed 7 games in 2025.",
    bettingAngles: ["TD scorer OVER when active", "Health monitor is the weekly priority", "FADE when injury report shows anything"],
    fantasy: { pprRank: "WR1-13 healthy", note: "Elite TD upside but injury risk is real." }
  },

  "Courtland Sutton": {
    team: "DEN", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 124, rec: 74, yds: 1017, td: 8, recPg: 4.4, ydsPg: 59.8, ypr: 13.7, adot: 12.4, ctchPct: 59.7, drop: 8 },
    rec2024: { rec: 81, yds: 1081, ydsPg: 63.6 },
    trend: { note: "Consistent two-year WR1 production. Drop rate (8) is the concern. Nix improving makes him more reliable." },
    props: {
      recYds: { floor: 50, ceil: 95, lean: "OVER -- 60 yds/g base with Bo Nix" },
      td: { pg: 0.47, lean: "OVER 0.5 TD in favorable matchups -- 8 TDs is real red zone role" },
      best: "TD scorer OVER. Red zone role is established and Nix targets him there."
    },
    situation2026: "Broncos WR1 with Nix. Nix year-2 leap directly benefits Sutton.",
    bettingAngles: ["TD scorer OVER is the best angle", "Receiving yards OVER in pass-heavy scripts", "Drop rate fade in crucial game situations"],
    fantasy: { pprRank: "WR2-15", note: "Reliable WR2 with TD upside." }
  },

  "Wan'Dale Robinson": {
    team: "NYG", pos: "WR", tier: "STRONG",
    rec2025: { g: 16, tgt: 140, rec: 92, yds: 1014, td: 3, recPg: 5.8, ydsPg: 63.4, ypr: 11.0, adot: 8.5, ctchPct: 65.7, drop: 4 },
    rec2024: { rec: 93, yds: 699, ydsPg: 41.1 },
    trend: { note: "HUGE efficiency jump -- 63 vs 41 yds/g. Volume machine on the Giants. Low TD rate (3) is the cap." },
    props: {
      recYds: { floor: 50, ceil: 95, lean: "OVER -- 63 base is reliable" },
      rec: { floor: 4, ceil: 9, lean: "OVER catches -- 5.8 rec/g is elite" },
      td: { pg: 0.19, lean: "FADE TD -- only 3 TDs on 92 catches" },
      best: "Catches OVER. 5.8 rec/g makes him a top PPR prop target."
    },
    situation2026: "Giants WR1 by default. Volume is guaranteed regardless of QB situation.",
    bettingAngles: ["Catches OVER is the most reliable prop", "Receiving yards OVER is consistent", "FADE TD scorer completely"],
    fantasy: { pprRank: "WR2-16", note: "Elite PPR value. TD-capped." }
  },

  "Michael Pittman Jr.": {
    team: "IND", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 111, rec: 80, yds: 784, td: 3, recPg: 4.7, ydsPg: 46.1, ypr: 9.8, adot: 8.2, ctchPct: 72.1, drop: 6 },
    rec2024: { rec: 69, yds: 808, ydsPg: 50.5 },
    trend: { note: "Consistent but uninspiring. Low YPR (9.8) and low TDs. Volume is the only prop angle." },
    props: {
      rec: { floor: 4, ceil: 8, lean: "OVER catches -- 4.7 rec/g is reliable" },
      recYds: { floor: 35, ceil: 70, lean: "Neutral -- 46 base is modest" },
      best: "Catches OVER. He's a volume slot receiver. Total yards are the better prop than receiving yards alone."
    },
    situation2026: "Colts WR1 with Richardson or Jones. Role is secure but ceiling is capped.",
    bettingAngles: ["Catches OVER is the only real angle", "FADE receiving yards OVER -- 46 base is too low", "No TD prop value"],
    fantasy: { pprRank: "WR3-25", note: "PPR floor back only. Low upside." }
  },

  "Khalil Shakir": {
    team: "BUF", pos: "WR", tier: "STRONG",
    rec2025: { g: 16, tgt: 95, rec: 72, yds: 719, td: 3, recPg: 4.5, ydsPg: 44.9, ypr: 10.0, adot: 3.7, ctchPct: 75.7, drop: 3 },
    rec2024: { rec: 76, yds: 821, ydsPg: 54.7 },
    trend: { note: "Consistent slot receiver in Josh Allen offense. YAC machine -- elite after-catch ability." },
    props: {
      rec: { floor: 3, ceil: 7, lean: "OVER -- 4.5 rec/g is reliable" },
      recYds: { floor: 30, ceil: 70, lean: "Neutral -- low base but Allen can pop him anytime" },
      best: "Catches OVER. Allen short game feeds him weekly."
    },
    situation2026: "Bills slot WR with Josh Allen. Cook's usage limits his ceiling but floor is always there.",
    bettingAngles: ["Catches OVER when Bills pass-heavy", "Receiving yards are volatile -- low ADOT means big games are random", "PPR floor back"],
    fantasy: { pprRank: "WR3-28", note: "PPR value only. Low upside." }
  },

  "DeVonta Smith": {
    team: "PHI", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 113, rec: 77, yds: 1008, td: 3, recPg: 4.5, ydsPg: 59.3, ypr: 13.1, adot: 11.9, ctchPct: 68.1, drop: 3 },
    rec2024: { rec: 68, yds: 833, ydsPg: 64.1 },
    trend: { note: "Consistent WR2 in Eagles offense. Low TDs (3) despite volume is the TD prop fade." },
    props: {
      recYds: { floor: 45, ceil: 90, lean: "OVER in pass-heavy scripts" },
      td: { pg: 0.18, lean: "FADE TD scorer completely -- only 3 TDs" },
      best: "Receiving yards OVER when Eagles pass-heavy. AJB and Smith split targets evenly."
    },
    situation2026: "Eagles WR2 with Hurts. Shares targets with AJB. Volume is there but TDs go elsewhere.",
    bettingAngles: ["Receiving yards OVER when Hurts is passing", "FADE TD props completely", "Reliable WR2 prop overall"],
    fantasy: { pprRank: "WR2-18", note: "Solid WR2. TD-capped by scheme." }
  },

  "Jameson Williams": {
    team: "DET", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 102, rec: 65, yds: 1117, td: 7, recPg: 3.8, ydsPg: 65.7, ypr: 17.2, adot: 12.6, ctchPct: 63.7, drop: 12 },
    rec2024: { rec: 58, yds: 1001, ydsPg: 66.7 },
    trend: { note: "Consistent 65+ yds/g two straight years. Elite YPR (17.2) but drop rate (12) is concerning. Big-play machine." },
    props: {
      recYds: { floor: 45, ceil: 110, lean: "OVER -- 17.2 YPR means variance is huge but ceiling is elite" },
      td: { pg: 0.41, lean: "OVER 0.5 in favorable matchups" },
      best: "Receiving yards OVER. High variance prop -- when he connects it's always a big game."
    },
    situation2026: "Lions WR2 with Goff. ARSB gets the volume but Williams gets the splash plays.",
    bettingAngles: ["Receiving yards OVER -- explosion ability makes OVER more likely than base suggests", "Drop rate (12) is the fade angle", "TD scorer OVER in favorable matchups"],
    fantasy: { pprRank: "WR2-19", note: "Big-play WR2. Volatile but ceiling is real." }
  },

  "Ladd McConkey": {
    team: "LAC", pos: "WR", tier: "STRONG",
    rec2025: { g: 16, tgt: 106, rec: 66, yds: 789, td: 5, recPg: 4.1, ydsPg: 49.3, ypr: 11.9, adot: 9.9, ctchPct: 62.3, drop: 6 },
    rec2024: { rec: 82, yds: 1149, ydsPg: 71.8 },
    trend: { note: "Decline from breakout 2024. Herbert health is the key variable -- when Herbert plays Ladd produces." },
    props: {
      recYds: { floor: 40, ceil: 85, lean: "OVER when Herbert healthy" },
      td: { pg: 0.31, lean: "OVER 0.5 in favorable matchups" },
      best: "Receiving yards OVER when Herbert plays. Fade props when Herbert is out."
    },
    situation2026: "Chargers WR1 with Herbert. Herbert health is everything for this prop.",
    bettingAngles: ["Monitor Herbert health weekly -- hard fade when out", "OVER when Herbert active", "2024 was the ceiling, 2025 is the floor"],
    fantasy: { pprRank: "WR2-20", note: "Herbert-dependent. Draft as WR2 with WR1 upside." }
  },

  "Jaylen Waddle": {
    team: "MIA", pos: "WR", tier: "STRONG",
    rec2025: { g: 16, tgt: 100, rec: 64, yds: 910, td: 2, recPg: 4.0, ydsPg: 56.9, ypr: 14.2, adot: 13.1, ctchPct: 64.0, drop: 4 },
    rec2024: { rec: 58, yds: 744, ydsPg: 49.6 },
    trend: { note: "Improvement from 2024 but TD rate (2) is very low. Achane and Tyreek eat Miami's red zone targets." },
    props: {
      recYds: { floor: 45, ceil: 90, lean: "OVER in pass-heavy scripts" },
      td: { pg: 0.13, lean: "FADE TD scorer -- only 2 TDs in 16 games" },
      best: "Receiving yards OVER when Miami is passing."
    },
    situation2026: "Dolphins WR2 behind Hill/Achane in target priority. Tua health is the QB variable.",
    bettingAngles: ["FADE TD props completely", "Receiving yards OVER in games where Miami passes a lot", "Reliable WR2 volume when healthy"],
    fantasy: { pprRank: "WR3-26", note: "Volume WR2 but zero TD upside. PPR only." }
  },

  "D.J. Moore": {
    team: "CHI", pos: "WR", tier: "STRONG",
    rec2025: { g: 17, tgt: 85, rec: 50, yds: 682, td: 4, recPg: 2.9, ydsPg: 40.1, ypr: 13.6, adot: 11.5, ctchPct: 58.8, drop: 3 },
    rec2024: { rec: 98, yds: 966, ydsPg: 56.8 },
    trend: { note: "DECLINE -- dropped from 57 to 40 yds/g as Caleb Williams struggled. Luther Burden emergence ate into his share." },
    props: {
      recYds: { floor: 30, ceil: 70, lean: "Neutral -- 40 base is too low for reliable OVER" },
      td: { pg: 0.24, lean: "Slight lean OVER 0.5 in favorable matchups" },
      best: "No strong lean. Caleb Williams improvement is the key variable for his 2026 props."
    },
    situation2026: "Bears WR1 but role is now contested with Burden and Odunze. Caleb Williams year 2 is the X-factor.",
    bettingAngles: ["Monitor target share -- Burden emergence is real", "Receiving yards lean OVER if Caleb Williams improves", "No reliable prop angle currently"],
    fantasy: { pprRank: "WR3-28", note: "Target share at risk. Downgrade until role clarified." }
  },

  // -- TIER 3: STARTER WR (reliable weekly production) ---------------------

  "Tee Higgins": {
    team: "CIN", pos: "WR", tier: "STARTER",
    rec2025: { g: 15, tgt: 98, rec: 59, yds: 846, td: 5, recPg: 3.9, ydsPg: 56.4, ypr: 14.3, adot: 13.1, ctchPct: 60.2, drop: 2 },
    rec2024: { rec: 73, yds: 911, ydsPg: 75.9 },
    trend: { note: "Missed 2 games. Per-game decline from 2024. Chase dominates targets when Burrow healthy." },
    props: {
      recYds: { floor: 45, ceil: 90, lean: "OVER in favorable matchups" },
      td: { pg: 0.33, lean: "OVER 0.5 when Burrow in rhythm" },
      best: "Receiving yards OVER. Efficient WR2 in Bengals offense when active."
    },
    situation2026: "Bengals WR2 behind Chase. Chase/Higgins is still one of the best WR duos when Burrow healthy.",
    fantasy: { pprRank: "WR2-22", note: "Reliable WR2 but Chase-dependent for target share." }
  },

  "D.K. Metcalf": {
    team: "PIT", pos: "WR", tier: "STARTER",
    rec2025: { g: 15, tgt: 99, rec: 59, yds: 850, td: 3, recPg: 3.9, ydsPg: 56.7, ypr: 14.4, adot: 10.5, ctchPct: 59.6, drop: 5 },
    rec2024: { rec: 66, yds: 992, ydsPg: 66.1 },
    trend: { note: "Steelers QB situation limits his ceiling. Rodgers/Russell Wilson era wasn't ideal. Kaleb Johnson emergence helps run game." },
    props: {
      recYds: { floor: 45, ceil: 90, lean: "OVER when Steelers pass-heavy" },
      td: { pg: 0.20, lean: "Low -- only 3 TDs in 15 games" },
      best: "Receiving yards OVER. Physical talent is elite but QB situation caps production."
    },
    situation2026: "Steelers WR1. QB situation improvement is the key variable for his 2026 numbers.",
    fantasy: { pprRank: "WR2-24", note: "Talent WR2 but QB-limited." }
  },

  "Mike Evans": {
    team: "TAM", pos: "WR", tier: "STARTER",
    rec2025: { g: 8, tgt: 62, rec: 30, yds: 368, td: 4, recPg: 3.8, ydsPg: 46.0, ypr: 12.3, adot: 13.3, ctchPct: 48.4, drop: 2 },
    rec2024: { rec: 74, yds: 1004, ydsPg: 71.7 },
    trend: { note: "Age 32, missed 9 games. When healthy the per-game numbers are fine but availability is now a major concern." },
    props: {
      recYds: { floor: 40, ceil: 85, lean: "OVER when active" },
      td: { pg: 0.50, lean: "OVER 0.5 -- 4 TDs in 8 games is elite rate when healthy" },
      best: "TD scorer OVER when healthy. Half-game rate of 0.5 TDs/game is still elite."
    },
    situation2026: "Buccaneers WR1 but age/health make him unreliable. Egbuka emergence adds pressure.",
    bettingAngles: ["TD scorer OVER when active", "Hard fade when any injury report designation", "Age 33 in 2026 -- treat as game-to-game"],
    fantasy: { pprRank: "WR3 healthy", note: "Age and health make him undraftable in high ADP spots." }
  },

  "Emeka Egbuka": {
    team: "TAM", pos: "WR", tier: "STARTER",
    rec2025: { g: 17, tgt: 127, rec: 63, yds: 938, td: 9, recPg: 3.7, ydsPg: 55.2, ypr: 14.9, adot: 12.1, ctchPct: 49.6, drop: 9 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Rookie WR1 role with 9 TDs. Drop rate (9) is alarming but TD production is real. AP Offensive Rookie of Year candidate." },
    props: {
      recYds: { floor: 40, ceil: 90, lean: "OVER in pass-heavy games" },
      td: { pg: 0.53, lean: "OVER 0.5 TD -- 9 TDs as a rookie is the real story" },
      best: "TD scorer OVER. 9 TDs as a rookie with Evans declining is the trend to follow."
    },
    situation2026: "Buccaneers WR1 as Evans ages. TD role will only grow.",
    fantasy: { pprRank: "WR2-20", note: "Year 2 TD regression risk but talent is real." }
  },

  "Davante Adams": {
    team: "LAR", pos: "WR", tier: "STARTER",
    rec2025: { g: 14, tgt: 114, rec: 60, yds: 789, td: 8, recPg: 4.3, ydsPg: 56.4, ypr: 13.2, adot: 12.6, ctchPct: 52.6, drop: 5 },
    rec2024: { rec: 85, yds: 1063, ydsPg: 75.9 },
    trend: { note: "Age 33. Moved to LAR joining Nacua. Per-game production held up but catch rate decline is concerning. Missed 3 games." },
    props: {
      recYds: { floor: 45, ceil: 90, lean: "OVER when healthy" },
      td: { pg: 0.57, lean: "OVER 0.5 TD -- 8 TDs in 14 games is elite rate" },
      best: "TD scorer OVER. Red zone role is established and Stafford trusts him there."
    },
    situation2026: "Rams WR2 behind Nacua. TD specialist role likely continues.",
    fantasy: { pprRank: "WR2-22", note: "Age concern but TD rate keeps him relevant." }
  },

  "Jordan Addison": {
    team: "MIN", pos: "WR", tier: "STARTER",
    rec2025: { g: 14, tgt: 79, rec: 42, yds: 610, td: 6, recPg: 3.0, ydsPg: 43.6, ypr: 14.5, adot: 13.7, ctchPct: 53.2, drop: 6 },
    rec2024: { rec: 63, yds: 875, ydsPg: 58.3 },
    trend: { note: "Missed 3 games. Volume down but TD rate held. Jefferson dominates targets." },
    props: {
      td: { pg: 0.43, lean: "OVER 0.5 in favorable matchups -- 6 TDs is real usage" },
      recYds: { floor: 35, ceil: 75, lean: "Neutral" },
      best: "TD scorer OVER. Red zone role is his best prop angle."
    },
    situation2026: "Vikings WR2 behind Jefferson. TD prop is the only reliable play.",
    fantasy: { pprRank: "WR3-28", note: "TD-dependent WR3." }
  },

  "Marvin Harrison Jr.": {
    team: "ARI", pos: "WR", tier: "STARTER",
    rec2025: { g: 12, tgt: 73, rec: 41, yds: 608, td: 6, recPg: 3.4, ydsPg: 50.7, ypr: 14.8, adot: 12.9, ctchPct: 56.2, drop: 4 },
    rec2024: { rec: 62, yds: 885, ydsPg: 52.1 },
    trend: { note: "Missed 5 games. Consistent per-game numbers but health is a concern two straight years. Murray connection developing." },
    props: {
      recYds: { floor: 40, ceil: 85, lean: "OVER when healthy" },
      td: { pg: 0.50, lean: "OVER 0.5 -- 6 TDs in 12 games is elite rate" },
      best: "TD scorer OVER when active. 0.5 TDs/game is elite when he plays."
    },
    situation2026: "Cardinals WR1 with Murray. Health is the primary concern -- missed 5+ games each of first 2 seasons.",
    fantasy: { pprRank: "WR2 healthy", note: "Injury risk is real. Draft with caution." }
  },

  "Brian Thomas Jr.": {
    team: "JAX", pos: "WR", tier: "STARTER",
    rec2025: { g: 14, tgt: 91, rec: 48, yds: 707, td: 5, recPg: 3.4, ydsPg: 50.5, ypr: 14.7, adot: 14.5, ctchPct: 52.7, drop: 10 },
    rec2024: { rec: 87, yds: 1282, ydsPg: 75.4 },
    trend: { note: "DECLINE from elite rookie season. Missed 3 games. Drop rate (10) is alarming. Lawrence health is key." },
    props: {
      recYds: { floor: 40, ceil: 85, lean: "OVER when Lawrence healthy" },
      td: { pg: 0.36, lean: "OVER 0.5 in favorable matchups" },
      best: "Receiving yards OVER when Lawrence plays. Drop rate fade in crucial moments."
    },
    situation2026: "Jaguars WR1 with Lawrence. 2024 was the ceiling, 2025 is the floor.",
    fantasy: { pprRank: "WR2-24", note: "Regression from rookie year. WR2 with upside." }
  },

  "Cooper Kupp": {
    team: "SEA", pos: "WR", tier: "STARTER",
    rec2025: { g: 16, tgt: 70, rec: 47, yds: 593, td: 2, recPg: 2.9, ydsPg: 37.1, ypr: 12.6, adot: 7.4, ctchPct: 67.1, drop: 3 },
    rec2024: { rec: 67, yds: 710, ydsPg: 59.2 },
    trend: { note: "Moved to SEA, joined JSN. Age 32 and role is now secondary. JSN's dominance limits his ceiling." },
    props: {
      recYds: { floor: 25, ceil: 65, lean: "Neutral -- 37 base is too low for reliable OVER" },
      best: "No strong prop angle. Role is limited behind JSN."
    },
    situation2026: "Seahawks WR2 behind JSN. Limited ceiling.",
    fantasy: { pprRank: "WR4", note: "Role and age limit him. Avoid." }
  },

  "Drake London": {
    team: "ATL", pos: "WR", tier: "STRONG",
    rec2025: { g: 12, tgt: 112, rec: 68, yds: 919, td: 6, recPg: 5.7, ydsPg: 76.6, ypr: 13.5, adot: 10.9, ctchPct: 60.7, drop: 1 },
    rec2024: { rec: 100, yds: 1271, ydsPg: 74.8 },
    trend: { note: "Missed 5 games but per-game numbers held. When healthy he's a true WR1. Zero drops is elite." },
    props: {
      recYds: { floor: 60, ceil: 110, lean: "OVER when healthy -- 76.6 pg is strong" },
      td: { pg: 0.50, lean: "OVER 0.5 TD -- 6 TDs in 12 games" },
      best: "Receiving yards OVER when active. Health is the only concern."
    },
    situation2026: "Falcons WR1 with Penix. Health record (missed 5+ games) is the risk.",
    bettingAngles: ["Health monitor every week", "OVER when active -- elite per-game numbers", "Zero drops means every target counts"],
    fantasy: { pprRank: "WR1-12 healthy", note: "Elite when healthy. Health is the ADP risk." }
  },

  // -- NOTABLE SITUATIONAL WRs ---------------------------------------------

  "Luther Burden": {
    team: "CHI", pos: "WR", tier: "STARTER",
    rec2025: { g: 15, tgt: 60, rec: 47, yds: 652, td: 4, recPg: 3.1, ydsPg: 43.5, ypr: 13.9, adot: 7.7, ctchPct: 78.3, drop: 4 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Rookie slot. Elite catch rate (78.3%) immediately. Bears WR of the future." },
    props: {
      rec: { lean: "OVER catches -- elite catch rate makes him reliable in slot" },
      best: "Catches OVER. Year 2 breakout candidate with Caleb Williams improving."
    },
    situation2026: "Bears emerging WR2/1. Role growing as Caleb Williams develops.",
    fantasy: { pprRank: "WR3 with WR2 upside", note: "Year 2 breakout watch. Buy low." }
  },

  "Rome Odunze": {
    team: "CHI", pos: "WR", tier: "STARTER",
    rec2025: { g: 12, tgt: 90, rec: 44, yds: 661, td: 3, recPg: 3.7, ydsPg: 55.1, ypr: 15.0, adot: 13.9, ctchPct: 48.9, drop: 2 },
    rec2024: { rec: 54, yds: 734, ydsPg: 43.2 },
    trend: { note: "Improved per-game but missed 5 games. Caleb Williams' accuracy issues hurt his catch rate." },
    props: {
      recYds: { lean: "OVER when Williams is accurate and Chicago is passing" },
      best: "Receiving yards OVER in pass-heavy scripts. High variance prop."
    },
    situation2026: "Bears WR1 by design but Moore and Burden create crowded room.",
    fantasy: { pprRank: "WR3", note: "Year 3 with better QB could unlock him." }
  },

  "Rashee Rice": {
    team: "KAN", pos: "WR", tier: "STARTER",
    rec2025: { g: 8, tgt: 78, rec: 53, yds: 571, td: 5, recPg: 6.6, ydsPg: 71.4, ypr: 10.8, adot: 4.3, ctchPct: 67.9, drop: 5 },
    rec2024: { rec: 24, yds: 288, ydsPg: 72.0 },
    trend: { note: "Missed 9 games (injury). When healthy, 6.6 rec/g and 71 yds/g is WR1 production in Mahomes offense." },
    props: {
      rec: { lean: "OVER catches when active -- 6.6/g is elite" },
      recYds: { lean: "OVER when healthy -- 71 base" },
      best: "Catches OVER when active. Health is everything."
    },
    situation2026: "Chiefs WR1 when healthy. Mahomes makes any healthy WR a WR1 prop.",
    bettingAngles: ["Hard fade when any injury designation", "OVER immediately when active", "Health is the entire prop"],
    fantasy: { pprRank: "WR1-8 healthy", note: "Elite when healthy. Injury risk is severe." }
  },

  "Xavier Worthy": {
    team: "KAN", pos: "WR", tier: "STARTER",
    rec2025: { g: 14, tgt: 73, rec: 42, yds: 532, td: 6, recPg: 3.0, ydsPg: 38.0, ypr: 12.7, adot: 12.1, ctchPct: 57.5, drop: 1 },
    rec2024: { rec: 59, yds: 638, ydsPg: 37.5 },
    trend: { note: "Consistent role in KC offense but low volume. TD rate (6 in 14g) is his best angle." },
    props: {
      td: { pg: 0.43, lean: "OVER 0.5 in favorable matchups -- 6 TDs shows Mahomes trusts him in red zone" },
      best: "TD scorer OVER. Low volume but red zone role is real."
    },
    situation2026: "Chiefs WR2/3 behind Rice. TD prop is the only reliable play.",
    fantasy: { pprRank: "WR3", note: "TD prop play only. Low volume limits PPR value." }
  },

  "Alec Pierce": {
    team: "IND", pos: "WR", tier: "STARTER",
    rec2025: { g: 15, tgt: 84, rec: 47, yds: 1003, td: 7, recPg: 3.1, ydsPg: 66.9, ypr: 21.3, adot: 18.9, ctchPct: 56.0, drop: 1 },
    rec2024: { rec: 37, yds: 824, ydsPg: 51.5 },
    trend: { note: "ELITE efficiency -- 21.3 YPR leads the NFL. Deep threat specialist. 1,000 yards on only 47 catches is remarkable." },
    props: {
      recYds: { lean: "OVER -- 21.3 YPR means every catch is a big gain. High floor despite low volume." },
      td: { pg: 0.47, lean: "OVER 0.5 in favorable matchups -- 7 TDs shows red zone role" },
      best: "Receiving yards OVER. Highest YPR in the NFL makes him uniquely reliable even with low catches."
    },
    situation2026: "Colts WR1 with Richardson. Deep threat role is elite when Richardson is healthy.",
    bettingAngles: ["Receiving yards OVER -- YPR inflates totals dramatically", "TD scorer OVER in favorable matchups", "Monitor Richardson health -- key dependency"],
    fantasy: { pprRank: "WR2-20", note: "Standard league elite, PPR limited. Best in 0.5 PPR." }
  },

  // ============================================================
  // TIGHT ENDS
  // ============================================================

  // -- TIER 1: ELITE TE (true positional advantage) ------------------------

  "Trey McBride": {
    team: "ARI", pos: "TE", tier: "ELITE",
    rec2025: { g: 17, tgt: 169, rec: 126, yds: 1239, td: 5, recPg: 7.4, ydsPg: 72.9, ypr: 9.8, adot: 6.8, ctchPct: 74.6, drop: 2 },
    rec2024: { rec: 111, yds: 1146, ydsPg: 71.6 },
    trend: { note: "Consistent elite TE two straight years. Most receptions in NFL (126). Murray/McBride is the best QB-TE connection in the league." },
    props: {
      rec: { floor: 5, ceil: 10, lean: "OVER -- 7.4 rec/g leads all TEs by a wide margin" },
      recYds: { floor: 55, ceil: 100, lean: "OVER -- 72.9 base is elite TE production" },
      td: { pg: 0.29, lean: "Moderate -- 5 TDs, Cardinals don't use him as primary TD scorer" },
      best: "Catches OVER. 7.4 rec/g is historically elite for a TE. Most reliable TE prop in the NFL."
    },
    situation2026: "Cardinals TE1 with Murray. This is the best TE situation in football. 150+ targets likely again.",
    bettingAngles: ["Catches OVER every week -- 7.4/g is the floor", "Receiving yards OVER is reliable", "TD scorer is the only weak prop angle"],
    fantasy: { pprRank: "TE1-1", note: "Best TE in football. Draft as top-5 overall pick in PPR." }
  },

  "Brock Bowers": {
    team: "LVR", pos: "TE", tier: "ELITE",
    rec2025: { g: 12, tgt: 86, rec: 64, yds: 680, td: 3, recPg: 5.3, ydsPg: 56.7, ypr: 10.6, adot: 6.5, ctchPct: 74.4, drop: 4 },
    rec2024: { rec: 112, yds: 1194, ydsPg: 70.2 },
    trend: { note: "Missed 5 games. When healthy the per-game numbers are still elite. 2024 was historic for a rookie TE." },
    props: {
      rec: { lean: "OVER when healthy -- 5.3 rec/g is elite" },
      recYds: { lean: "OVER when healthy" },
      best: "Catches OVER when active. Health is everything."
    },
    situation2026: "Raiders TE1. QB situation is the concern but Bowers gets targets regardless.",
    bettingAngles: ["Health monitor -- missed 5 games in 2025", "OVER immediately when active", "Fade when injury report lists him"],
    fantasy: { pprRank: "TE1-2", note: "Elite talent. Health is the only risk." }
  },

  "George Kittle": {
    team: "SFO", pos: "TE", tier: "ELITE",
    rec2025: { g: 11, tgt: 69, rec: 57, yds: 628, td: 3, recPg: 5.2, ydsPg: 57.1, ypr: 11.0, adot: 6.7, ctchPct: 82.6, drop: 1 },
    rec2024: { rec: 78, yds: 1106, ydsPg: 73.7 },
    trend: { note: "Missed 6 games. When healthy the efficiency is elite (83% catch rate). Health has been an issue two straight years." },
    props: {
      recYds: { lean: "OVER when healthy -- 57 pg is real" },
      td: { lean: "Moderate -- Shanahan scheme uses him well in red zone" },
      best: "Catches OVER when active. Elite catch rate means almost every target converts."
    },
    situation2026: "49ers TE1 with Purdy. Shanahan scheme is tailor-made for Kittle. Health is the entire question.",
    bettingAngles: ["Hard fade when any injury designation", "OVER immediately when active", "Age 32 in 2026 -- monitor snap counts"],
    fantasy: { pprRank: "TE1-3 healthy", note: "Elite when healthy. Injury history is severe." }
  },

  "Travis Kelce": {
    team: "KAN", pos: "TE", tier: "ELITE",
    rec2025: { g: 17, tgt: 108, rec: 76, yds: 851, td: 4, recPg: 4.5, ydsPg: 50.1, ypr: 11.2, adot: 6.8, ctchPct: 70.4, drop: 7 },
    rec2024: { rec: 97, yds: 823, ydsPg: 51.4 },
    trend: { note: "Age-related decline continuing. 50 yds/g is still solid but far from peak. Drop rate (7) concerning. Age 37 in 2026." },
    props: {
      rec: { lean: "OVER 4 catches -- Mahomes always finds him" },
      recYds: { lean: "Neutral -- 50 base is the real floor now" },
      td: { lean: "Moderate -- red zone role maintained despite age" },
      best: "Catches OVER. Mahomes connection keeps volume alive even as efficiency declines."
    },
    situation2026: "Chiefs TE1 but age 37. Declining production is real. May be his last season.",
    bettingAngles: ["Catches OVER when Mahomes is playing well", "FADE receiving yards -- 50 base is too modest", "Monitor usage as season progresses"],
    fantasy: { pprRank: "TE1-5", note: "Still elite by TE standards but decline is real." }
  },

  "Tyler Warren": {
    team: "IND", pos: "TE", tier: "ELITE",
    rec2025: { g: 17, tgt: 112, rec: 76, yds: 817, td: 5, recPg: 4.5, ydsPg: 48.1, ypr: 10.7, adot: 5.4, ctchPct: 67.9, drop: 2 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Elite rookie season. 76 catches for a rookie TE is top-10 all time. Pro Bowl in year 1. Richardson connection is real." },
    props: {
      rec: { lean: "OVER catches -- 4.5/g is elite for a TE" },
      recYds: { lean: "OVER -- 48 base will grow as Richardson improves" },
      td: { lean: "OVER 0.5 in favorable matchups" },
      best: "Catches OVER. Year 2 with Richardson should be a full WR1-level TE season."
    },
    situation2026: "Colts TE1. Richardson health is the key variable. When healthy, Warren is TE1-2.",
    bettingAngles: ["Catches OVER every week -- target share is elite", "Receiving yards OVER as Richardson improves", "Richardson health monitor"],
    fantasy: { pprRank: "TE1-3", note: "Year 2 breakout. Draft as TE1." }
  },

  "Sam LaPorta": {
    team: "DET", pos: "TE", tier: "STRONG",
    rec2025: { g: 9, tgt: 49, rec: 40, yds: 489, td: 3, recPg: 4.4, ydsPg: 54.3, ypr: 12.2, adot: 5.7, ctchPct: 81.6, drop: 0 },
    rec2024: { rec: 60, yds: 726, ydsPg: 45.4 },
    trend: { note: "Missed 8 games. When healthy, per-game numbers are elite. ZERO drops in 2025 is remarkable." },
    props: {
      rec: { lean: "OVER when healthy -- 4.4/g is elite" },
      best: "Catches OVER when active. Zero drops + Goff = extremely reliable target."
    },
    situation2026: "Lions TE1. Health record (missed 8 games) is the significant concern.",
    fantasy: { pprRank: "TE1-5 healthy", note: "Elite when healthy. Huge injury risk." }
  },

  "Kyle Pitts": {
    team: "ATL", pos: "TE", tier: "STRONG",
    rec2025: { g: 17, tgt: 118, rec: 88, yds: 928, td: 4, recPg: 5.2, ydsPg: 54.6, ypr: 10.5, adot: 7.4, ctchPct: 74.6, drop: 2 },
    rec2024: { rec: 47, yds: 602, ydsPg: 35.4 },
    trend: { note: "HUGE bounce-back -- 55 yds/g vs 35 in 2024. First healthy full season. Penix developing makes this better." },
    props: {
      rec: { floor: 4, ceil: 8, lean: "OVER -- 5.2 rec/g is TE1 level" },
      recYds: { floor: 40, ceil: 80, lean: "OVER -- 54.6 base" },
      td: { lean: "Moderate -- 4 TDs, Falcons don't use him as primary TD scorer" },
      best: "Catches OVER. Volume (118 targets) is elite for a TE."
    },
    situation2026: "Falcons TE1 with Penix. Full health makes him a TE1 every week.",
    bettingAngles: ["Catches OVER is the primary angle", "Receiving yards OVER in pass-heavy scripts", "FADE TD scorer"],
    fantasy: { pprRank: "TE1-6", note: "TE1 finally healthy. Draft as such." }
  },

  "Mark Andrews": {
    team: "BAL", pos: "TE", tier: "STRONG",
    rec2025: { g: 17, tgt: 70, rec: 48, yds: 422, td: 3, recPg: 2.8, ydsPg: 24.8, ypr: 8.8, adot: 7.4, ctchPct: 68.6, drop: 3 },
    rec2024: { rec: 55, yds: 673, ydsPg: 39.6 },
    trend: { note: "DECLINE -- 25 yds/g is not TE1 production. Lamar running, Henry rushing, Flowers receiving all eat into his role." },
    props: {
      rec: { lean: "Neutral -- 2.8/g is low" },
      td: { lean: "Moderate -- still the red zone presence when healthy" },
      best: "No reliable prop angle. Role has been significantly reduced."
    },
    situation2026: "Ravens TE1 but role is diminished. Age 30 and reduced targets make him a TE2.",
    fantasy: { pprRank: "TE2-15", note: "Role significantly reduced. Downgrade from peak." }
  },

  "T.J. Hockenson": {
    team: "MIN", pos: "TE", tier: "STARTER",
    rec2025: { g: 15, tgt: 66, rec: 51, yds: 438, td: 2, recPg: 3.4, ydsPg: 29.2, ypr: 8.6, adot: 5.2, ctchPct: 77.3, drop: 3 },
    rec2024: { rec: 41, yds: 455, ydsPg: 45.5 },
    trend: { note: "Health improving but production down in 2025. Jefferson dominates targets leaving less for Hockenson." },
    props: {
      rec: { lean: "OVER 3 catches -- catch rate is elite" },
      best: "Catches OVER. Reliable but modest production."
    },
    situation2026: "Vikings TE1. Role is secondary to Jefferson in target priority.",
    fantasy: { pprRank: "TE2-18", note: "Reliable TE2 but ceiling is capped by Jefferson." }
  },

  "Dalton Schultz": {
    team: "HOU", pos: "TE", tier: "STARTER",
    rec2025: { g: 17, tgt: 106, rec: 82, yds: 777, td: 2, recPg: 4.8, ydsPg: 45.7, ypr: 9.5, adot: 6.2, ctchPct: 77.4, drop: 2 },
    rec2024: { rec: 53, yds: 532, ydsPg: 31.3 },
    trend: { note: "HUGE improvement -- 46 vs 31 yds/g. Volume machine with Stroud. Low TDs (2) is the only weakness." },
    props: {
      rec: { floor: 4, ceil: 8, lean: "OVER -- 4.8 rec/g is TE1 level volume" },
      recYds: { lean: "OVER -- 45.7 base is reliable" },
      td: { lean: "FADE -- only 2 TDs despite huge volume" },
      best: "Catches OVER. Most receptions for a non-McBride TE."
    },
    situation2026: "Texans TE1 with Stroud. Volume is locked in. TD is the only missing piece.",
    bettingAngles: ["Catches OVER is the primary prop", "FADE TD scorer completely", "Receiving yards OVER is reliable secondary"],
    fantasy: { pprRank: "TE1-7", note: "Elite volume but TD-capped. PPR league monster." }
  },

  "Pat Freiermuth": {
    team: "PIT", pos: "TE", tier: "STARTER",
    rec2025: { g: 17, tgt: 54, rec: 41, yds: 486, td: 3, recPg: 2.4, ydsPg: 28.6, ypr: 11.9, adot: 6.0, ctchPct: 75.9, drop: 0 },
    rec2024: { rec: 65, yds: 653, ydsPg: 38.4 },
    trend: { note: "Decline from 2024. Zero drops in 2025. Steelers QB situation limited everyone." },
    props: {
      rec: { lean: "OVER 2 catches -- reliable floor" },
      best: "No strong prop angle. Limited ceiling."
    },
    situation2026: "Steelers TE1. QB situation improvement could unlock him.",
    fantasy: { pprRank: "TE2-20", note: "Modest TE2. QB-dependent upside." }
  },

  "Evan Engram": {
    team: "DEN", pos: "TE", tier: "STARTER",
    rec2025: { g: 16, tgt: 76, rec: 50, yds: 461, td: 2, recPg: 3.1, ydsPg: 28.8, ypr: 9.2, adot: 4.4, ctchPct: 65.8, drop: 8 },
    rec2024: { rec: 47, yds: 365, ydsPg: 40.6 },
    trend: { note: "Moved to DEN. Drop rate (8) is alarming. Limited production." },
    props: {
      best: "No reliable prop angle. Too many drops, too low volume."
    },
    situation2026: "Broncos TE1 with Nix. Drop rate makes him unreliable.",
    fantasy: { pprRank: "TE3", note: "Avoid. Drop rate and low production." }
  },

  "Dallas Goedert": {
    team: "PHI", pos: "TE", tier: "STRONG",
    rec2025: { g: 15, tgt: 82, rec: 60, yds: 591, td: 4, recPg: 4.0, ydsPg: 39.4, ypr: 9.9, adot: 7.1, ctchPct: 73.2, drop: 4 },
    rec2024: { rec: 42, yds: 496, ydsPg: 49.6 },
    trend: { note: "Volume improved but yardage down. Eagles scheme spreads targets. Reliable but not a top TE1." },
    props: {
      rec: { lean: "OVER 3 catches -- 4.0/g is reliable" },
      best: "Catches OVER. Reliable floor in Eagles offense."
    },
    situation2026: "Eagles TE1 with Hurts. AJB and Smith share targets but Goedert gets his.",
    fantasy: { pprRank: "TE1-8", note: "Reliable TE1 but ceiling is limited by Eagles target distribution." }
  },

  "Tucker Kraft": {
    team: "GNB", pos: "TE", tier: "STRONG",
    rec2025: { g: 8, tgt: 44, rec: 32, yds: 489, td: 7, recPg: 4.0, ydsPg: 61.1, ypr: 15.3, adot: 4.7, ctchPct: 72.7, drop: 3 },
    rec2024: { rec: 50, yds: 707, ydsPg: 41.6 },
    trend: { note: "Missed 9 games. When healthy: 7 TDs in 8 games is historically elite for a TE. 0.875 TDs/game." },
    props: {
      td: { lean: "OVER 0.5 TD when healthy -- nearly 1 TD/game when active" },
      recYds: { lean: "OVER when active -- 61 pg is strong" },
      best: "TD scorer OVER when active. Most dominant TD prop angle at TE."
    },
    situation2026: "Packers TE1 with Jordan Love. Health is everything -- missed more than half of 2025.",
    bettingAngles: ["TD scorer OVER when active -- elite rate", "Hard fade when any injury designation", "Health monitor is weekly priority"],
    fantasy: { pprRank: "TE1-4 healthy", note: "Elite TD rate but injury risk is severe." }
  },

  "Harold Fannin Jr.": {
    team: "CLE", pos: "TE", tier: "STRONG",
    rec2025: { g: 16, tgt: 107, rec: 72, yds: 731, td: 2, recPg: 4.5, ydsPg: 45.7, ypr: 10.2, adot: 6.0, ctchPct: 67.3, drop: 4 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Elite rookie season. 72 catches is exceptional for a first-year TE. Browns QB situation limits TD ceiling." },
    props: {
      rec: { lean: "OVER catches -- 4.5/g is elite" },
      recYds: { lean: "OVER -- 45.7 base is real" },
      td: { lean: "FADE -- Browns offense doesn't score enough" },
      best: "Catches OVER. Volume is real regardless of QB situation."
    },
    situation2026: "Browns TE1. Year 2 with better QB could make him a true TE1.",
    fantasy: { pprRank: "TE1-7", note: "Volume TE1 but TD-capped by Browns offense." }
  },

  "Colston Loveland": {
    team: "CHI", pos: "TE", tier: "STARTER",
    rec2025: { g: 16, tgt: 82, rec: 58, yds: 713, td: 2, recPg: 3.6, ydsPg: 44.6, ypr: 12.3, adot: 9.0, ctchPct: 70.7, drop: 1 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Elite rookie. Zero drops. 713 yards for a rookie TE on a bad offense is impressive. Caleb Williams connection developing." },
    props: {
      rec: { lean: "OVER catches -- 3.6/g with near-zero drops" },
      recYds: { lean: "OVER in pass-heavy scripts" },
      best: "Catches OVER. Year 2 breakout if Caleb Williams improves."
    },
    situation2026: "Bears TE1 with Williams. Elite sleeper if Chicago offense develops.",
    fantasy: { pprRank: "TE1-9 with upside", note: "Year 2 breakout candidate. Buy low." }
  },

  "Zach Ertz": {
    team: "WAS", pos: "TE", tier: "STARTER",
    rec2025: { g: 13, tgt: 72, rec: 50, yds: 504, td: 5, recPg: 3.8, ydsPg: 38.8, ypr: 10.1, adot: 9.0, ctchPct: 69.4, drop: 5 },
    rec2024: { rec: 66, yds: 654, ydsPg: 38.5 },
    trend: { note: "Consistent two years in Washington. Age 35 -- Daniels connection keeps him relevant." },
    props: {
      rec: { lean: "OVER 3 catches -- reliable floor" },
      td: { lean: "OVER 0.5 in favorable matchups" },
      best: "Catches OVER. Reliable TE2 in Washington's emerging offense."
    },
    situation2026: "Commanders TE1 with Daniels. Age 35 but Daniels keeps him viable.",
    fantasy: { pprRank: "TE2-14", note: "Reliable TE2 with TD upside." }
  },

  "Isaiah Likely": {
    team: "BAL", pos: "TE", tier: "STARTER",
    rec2025: { g: 14, tgt: 36, rec: 27, yds: 307, td: 2, recPg: 1.9, ydsPg: 21.9, ypr: 11.4, adot: 8.0, ctchPct: 75.0, drop: 1 },
    rec2024: { rec: 42, yds: 477, ydsPg: 29.8 },
    trend: { note: "Andrews' return limited his role. When Andrews is out, Likely's value spikes." },
    props: {
      best: "Monitor Andrews health -- Likely is the handcuff play."
    },
    situation2026: "Ravens TE2. Best prop only when Andrews is out.",
    fantasy: { pprRank: "TE2 when Andrews out", note: "Handcuff Andrews. Has standalone upside if Andrews misses time." }
  },

  "Mason Taylor": {
    team: "NYJ", pos: "TE", tier: "STARTER",
    rec2025: { g: 13, tgt: 65, rec: 44, yds: 369, td: 3, recPg: 3.4, ydsPg: 28.4, ypr: 8.4, adot: 5.9, ctchPct: 67.7, drop: 8 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Rookie. High drop rate (8) is the concern. Jets QB situation limited everyone." },
    props: {
      best: "No reliable prop angle. Drop rate and QB situation make him unpredictable."
    },
    situation2026: "Jets TE1. Better QB situation in 2026 could unlock him.",
    fantasy: { pprRank: "TE2-20", note: "Year 2 with better QB is the upside scenario." }
  },

  "Juwan Johnson": {
    team: "NOR", pos: "TE", tier: "STARTER",
    rec2025: { g: 17, tgt: 102, rec: 77, yds: 889, td: 4, recPg: 4.5, ydsPg: 52.3, ypr: 11.5, adot: 7.5, ctchPct: 75.5, drop: 6 },
    rec2024: { rec: 50, yds: 548, ydsPg: 32.2 },
    trend: { note: "HUGE improvement -- 52 vs 32 yds/g. 77 catches is elite TE volume. Saints made him their primary receiving option." },
    props: {
      rec: { lean: "OVER catches -- 4.5/g is TE1 level" },
      recYds: { lean: "OVER -- 52.3 base is strong" },
      best: "Catches OVER. Volume in Saints offense is elite."
    },
    situation2026: "Saints TE1. Rattler situation is the QB variable. Volume protected regardless.",
    fantasy: { pprRank: "TE1-9", note: "Under-the-radar TE1 with elite volume." }
  },

  "Oronde Gadsden II": {
    team: "LAC", pos: "TE", tier: "STARTER",
    rec2025: { g: 15, tgt: 69, rec: 49, yds: 664, td: 5, recPg: 3.3, ydsPg: 44.3, ypr: 13.5, adot: 9.0, ctchPct: 71.0, drop: 5 },
    rec2024: { rec: 0, yds: 0, ydsPg: 0 },
    trend: { note: "Strong rookie season in Chargers offense. Herbert connection developing. Breakout candidate in Year 2." },
    props: {
      recYds: { lean: "OVER when Herbert healthy" },
      td: { lean: "OVER 0.5 in favorable matchups" },
      best: "Receiving yards OVER when Herbert active. Year 2 upside is real."
    },
    situation2026: "Chargers TE1 with Herbert. Herbert health is everything.",
    fantasy: { pprRank: "TE1-10 with upside", note: "Year 2 breakout if Herbert stays healthy." }
  },

  "Brenton Strange": {
    team: "JAX", pos: "TE", tier: "STARTER",
    rec2025: { g: 12, tgt: 60, rec: 46, yds: 540, td: 3, recPg: 3.8, ydsPg: 45.0, ypr: 11.7, adot: 6.9, ctchPct: 76.7, drop: 4 },
    rec2024: { rec: 40, yds: 411, ydsPg: 24.2 },
    trend: { note: "Improvement from 2024. Missed 5 games. Reliable when healthy." },
    props: {
      rec: { lean: "OVER catches when active" },
      best: "Catches OVER when healthy and Lawrence active."
    },
    situation2026: "Jaguars TE1. Lawrence health is the key variable.",
    fantasy: { pprRank: "TE2-18", note: "Reliable TE2 when healthy." }
  },

  "Dawson Knox": {
    team: "BUF", pos: "TE", tier: "STARTER",
    rec2025: { g: 17, tgt: 49, rec: 36, yds: 417, td: 3, recPg: 2.1, ydsPg: 24.5, ypr: 11.6, adot: 6.7, ctchPct: 73.5, drop: 2 },
    rec2024: { rec: 22, yds: 311, ydsPg: 19.4 },
    trend: { note: "Volume improvement from 2024 but still modest. Allen and Cook eat most of the targets." },
    props: {
      best: "No reliable prop angle. Too low volume."
    },
    situation2026: "Bills TE1 but secondary role behind Cook. Limited prop value.",
    fantasy: { pprRank: "TE2-22", note: "Streaming TE2 at best." }
  },

  "Dalton Kincaid": {
    team: "BUF", pos: "TE", tier: "STARTER",
    rec2025: { g: 12, tgt: 49, rec: 39, yds: 571, td: 2, recPg: 3.3, ydsPg: 47.6, ypr: 14.6, adot: 9.5, ctchPct: 79.6, drop: 1 },
    rec2024: { rec: 44, yds: 448, ydsPg: 34.5 },
    trend: { note: "Per-game improvement when healthy. Missed 5 games. Elite catch rate and YPR when active." },
    props: {
      recYds: { lean: "OVER when healthy -- 47.6 pg is strong" },
      best: "Receiving yards OVER when active. High efficiency makes him a solid spot play."
    },
    situation2026: "Bills TE2 behind Knox but role could expand. Health is the concern.",
    fantasy: { pprRank: "TE2-19", note: "Streaming option with upside when healthy." }
  },

};

export default WRsAndTEs;
