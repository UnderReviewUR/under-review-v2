// api/nfl-rb.js
// NFL Running Back Database for UR TAKE
// Source: PFR rushing stats
// 2025 season = season ending Jan 2026 (current baseline)
// 2024 season = season ending Jan 2025 (trend comparison only)

export const RBs = {

  // -- TIER 1: ELITE (90+ yards/game, true RB1 ceiling) ----------------------

  "James Cook": {
    team: "BUF", tier: "ELITE",
    rush2025: { g: 17, att: 309, yds: 1621, td: 12, ydsPg: 95.4, attPg: 18.2, ypa: 5.2, succPct: 56.6, fmb: 6 },
    rush2024: { ydsPg: 63.1, attPg: 12.9 },
    trend: { ydsPg_delta: +32.3, note: "MASSIVE breakout -- from committee back to true RB1. Volume and efficiency both elite." },
    receiving: { note: "Adds receiving value in Josh Allen offense" },
    props: {
      rushYds: { floor: 65, ceil: 130, lean: "OVER -- 95.4 yds/g is elite volume. Bills scheme feeds him." },
      td: { pg: 0.71, lean: "OVER 0.5 TD in favorable matchups -- 12 TDs in 17 games" },
      best: "Rushing yards OVER. True workhorse now -- 309 attempts confirms volume."
    },
    situation2026: "Locked in as Bills RB1 with Josh Allen as QB. Dual threat offense creates space. Elite volume guaranteed.",
    bettingAngles: ["Rushing yards OVER every week -- 95.4 base is elite", "TD scorer when Bills in red zone", "Fumble concern (6 in 2025) -- fumble prop when available"],
    fantasy: { pprRank: "RB1-3", note: "Elite RB1 with Allen offense. Draft early." }
  },

  "Jonathan Taylor": {
    team: "IND", tier: "ELITE",
    rush2025: { g: 17, att: 323, yds: 1585, td: 18, ydsPg: 93.2, attPg: 19.0, ypa: 4.9, succPct: 51.7, fmb: 2 },
    rush2024: { ydsPg: 102.2, attPg: 21.6 },
    trend: { ydsPg_delta: -9.0, note: "Slight volume dip but TD rate jumped (18 TDs). More efficient scoring." },
    props: {
      rushYds: { floor: 70, ceil: 120, lean: "OVER -- 93.2 yds/g baseline. Colts run-first." },
      td: { pg: 1.06, lean: "OVER 0.5 TD every week -- 18 TDs is elite red zone usage" },
      best: "TD scorer OVER -- 1.06 TDs/game is best rate among pure RBs."
    },
    situation2026: "Colts RB1, red zone king. QB situation (Jones vs Richardson) affects passing game, not Taylor's role.",
    bettingAngles: ["TD scorer prop OVER every week", "Rushing yards OVER in run-heavy game scripts", "Low fumble rate (2) means no fade based on ball security"],
    fantasy: { pprRank: "RB1-3", note: "TD volume makes him elite. Draft as RB1." }
  },

  "Derrick Henry": {
    team: "BAL", tier: "ELITE",
    rush2025: { g: 17, att: 307, yds: 1595, td: 16, ydsPg: 93.8, attPg: 18.1, ypa: 5.2, succPct: 53.1, fmb: 4 },
    rush2024: { ydsPg: 113.0, attPg: 19.1 },
    trend: { ydsPg_delta: -19.2, note: "Natural age-related decline from historic 2024 but still elite. Age 31." },
    props: {
      rushYds: { floor: 65, ceil: 120, lean: "OVER in run-heavy scripts. Watch if Lamar healthy." },
      td: { pg: 0.94, lean: "OVER 0.5 TD -- still the Ravens red zone closer" },
      best: "Rushing yards OVER when Ravens game script favors run."
    },
    situation2026: "Age 31 entering 2026. Henry-Lamar duo is the most dangerous 1-2 rushing punch in football. Lamar health is the key variable.",
    bettingAngles: ["Rushing yards OVER when Lamar healthy (creates space)", "TD scorer OVER every healthy week", "Age watch -- monitor snap counts as season progresses"],
    fantasy: { pprRank: "RB1-5", note: "Elite when healthy. Monitor age-related decline risk." }
  },

  "Bijan Robinson": {
    team: "ATL", tier: "ELITE",
    rush2025: { g: 17, att: 287, yds: 1478, td: 7, ydsPg: 86.9, attPg: 16.9, ypa: 5.1, succPct: 51.6, fmb: 4 },
    rush2024: { ydsPg: 85.6, attPg: 17.9 },
    trend: { ydsPg_delta: +1.3, note: "Flat year-over-year -- remarkably consistent elite producer." },
    props: {
      rushYds: { floor: 65, ceil: 115, lean: "OVER -- 86.9 base, most reliable RB prop in NFC" },
      td: { pg: 0.41, lean: "OVER 0.5 TD in red zone games -- low TD rate relative to volume" },
      best: "Rushing yards OVER. Most consistent RB prop in football -- 85+ yds/g two straight years."
    },
    situation2026: "Falcons RB1. Michael Penix at QB. Elite receiving back adds floor. Most consistent RB prop in the NFC.",
    bettingAngles: ["Rushing yards OVER is the safest weekly prop", "TD rate underperforms volume -- target total yards not TD", "Receiving adds 20-30 extra yards weekly"],
    fantasy: { pprRank: "RB1-4", note: "Elite consistency. Never has a zero week." }
  },

  "De'Von Achane": {
    team: "MIA", tier: "ELITE",
    rush2025: { g: 16, att: 238, yds: 1350, td: 8, ydsPg: 84.4, attPg: 14.9, ypa: 5.7, succPct: 49.2, fmb: 1 },
    rush2024: { ydsPg: 53.4, attPg: 11.9 },
    trend: { ydsPg_delta: +31.0, note: "Massive breakout -- 5.7 YPA is elite efficiency. Injury risk remains (missed 1 game in 2025)." },
    props: {
      rushYds: { floor: 55, ceil: 120, lean: "OVER when healthy -- 5.7 YPA is elite big-play ability" },
      td: { pg: 0.50, lean: "OVER 0.5 in favorable matchups" },
      best: "Rushing yards OVER. 5.7 YPA means every carry is a threat. Market prices him conservatively."
    },
    situation2026: "QB situation volatile (Tua health, Willis situation). Achane's value partly depends on passing game keeping defense honest.",
    bettingAngles: ["Rushing yards OVER when healthy", "Health monitor every week -- missed time each of last 3 seasons", "OVER 60 yards is the sweet spot line"],
    fantasy: { pprRank: "RB1-5 healthy", note: "Elite ceiling, injury risk the only concern." }
  },

  // -- TIER 2: STRONG STARTERS (65-90 yards/game) ----------------------------

  "Jahmyr Gibbs": {
    team: "DET", tier: "STRONG",
    rush2025: { g: 17, att: 243, yds: 1223, td: 13, ydsPg: 71.9, attPg: 14.3, ypa: 5.0, succPct: 48.1, fmb: 2 },
    rush2024: { ydsPg: 83.1, attPg: 14.7 },
    trend: { ydsPg_delta: -11.2, note: "Volume dip but 13 TDs -- elite red zone finisher, shares load with Montgomery." },
    props: {
      td: { pg: 0.76, lean: "TD scorer OVER every week -- 13 TDs most among non-elite RBs" },
      rushYds: { floor: 50, ceil: 95, lean: "OVER in favorable matchups -- volatile due to committee" },
      best: "TD scorer prop OVER. 0.76 TDs/game is elite. The most reliable Gibbs prop."
    },
    situation2026: "Shares touches with David Montgomery. Gibbs is the TD and receiving back, Montgomery is the grinder.",
    bettingAngles: ["TD scorer OVER is the primary angle", "Receiving yards adds floor beyond rushing", "Under total rushes in committee situations"],
    fantasy: { pprRank: "RB1-8", note: "TD and receiving floor make him RB1 despite volume sharing." }
  },

  "Kyren Williams": {
    team: "LAR", tier: "STRONG",
    rush2025: { g: 17, att: 259, yds: 1252, td: 10, ydsPg: 73.6, attPg: 15.2, ypa: 4.8, succPct: 62.9, fmb: 2 },
    rush2024: { ydsPg: 81.2, attPg: 19.8 },
    trend: { ydsPg_delta: -7.6, note: "62.9% success rate is elite -- most efficient runner in NFL. Volume dipped slightly." },
    props: {
      rushYds: { floor: 55, ceil: 100, lean: "OVER -- McVay scheme creates clean lanes, 62.9% success rate elite" },
      td: { pg: 0.59, lean: "OVER 0.5 in home games -- Rams run scheme is TD-efficient" },
      best: "Success rate (62.9%) means he rarely has a truly bad game. Rushing yards OVER is reliable."
    },
    situation2026: "McVay's workhorse. Stafford play-action creates best running lanes in NFL. Most scheme-assisted rushing yards.",
    bettingAngles: ["Rushing yards OVER -- scheme guarantees lanes", "TD scorer when Rams near red zone", "1502 Stafford PA yards (league best) directly benefits run game"],
    fantasy: { pprRank: "RB1-10", note: "Stafford PA scheme makes him more efficient than raw stats show." }
  },

  "Javonte Williams": {
    team: "DAL", tier: "STRONG",
    rush2025: { g: 16, att: 252, yds: 1201, td: 11, ydsPg: 75.1, attPg: 15.8, ypa: 4.8, succPct: 56.3, fmb: 2 },
    rush2024: { ydsPg: 30.2, attPg: 8.2, note: "DEN backup in 2024 -- this is his first full season as RB1" },
    trend: { note: "Breakout as Cowboys RB1. First real featured role -- 2025 is his true baseline." },
    props: {
      rushYds: { floor: 60, ceil: 100, lean: "OVER -- 75.1 yds/g as new Cowboys RB1" },
      td: { pg: 0.69, lean: "OVER 0.5 TD -- 11 TDs shows red zone usage" },
      best: "Rushing yards OVER. First full featured role delivered -- scheme and volume both there."
    },
    situation2026: "Cowboys RB1 with Prescott and Lamb. Dallas offense gives him volume and scoring opportunities.",
    bettingAngles: ["Rushing yards OVER is the primary lean", "TD scorer in Cowboys red zone offense", "Fumble rate manageable (2) -- no fade needed"],
    fantasy: { pprRank: "RB1-12", note: "Established RB1 now. Draft as such." }
  },

  "Travis Etienne": {
    team: "JAX", tier: "STRONG",
    rush2025: { g: 17, att: 260, yds: 1107, td: 7, ydsPg: 65.1, attPg: 15.3, ypa: 4.3, succPct: 46.9, fmb: 1 },
    rush2024: { ydsPg: 37.2, attPg: 10.0, note: "Missed significant time in 2024" },
    trend: { note: "Full healthy season confirmed RB1 status. 65.1 yds/g is the true floor." },
    props: {
      rushYds: { floor: 50, ceil: 90, lean: "OVER in run-heavy scripts when Lawrence healthy" },
      best: "Rushing yards OVER -- full season confirmed he holds up as RB1."
    },
    situation2026: "Jaguars RB1 with Lawrence. Trevor Lawrence rushing adds different dimension. ETN is the featured back.",
    fantasy: { pprRank: "RB2-15", note: "Solid RB2 with weekly upside." }
  },

  "Breece Hall": {
    team: "NYJ", tier: "STRONG",
    rush2025: { g: 16, att: 243, yds: 1065, td: 4, ydsPg: 66.6, attPg: 15.2, ypa: 4.4, succPct: 49.8, fmb: 2 },
    rush2024: { ydsPg: 54.8, attPg: 13.1 },
    trend: { ydsPg_delta: +11.8, note: "Improved as volume increased. Low TD rate (4) is the problem -- Jets offense." },
    props: {
      rushYds: { floor: 50, ceil: 90, lean: "OVER -- 66.6 base when healthy" },
      td: { pg: 0.25, lean: "FADE TD props -- only 4 TDs in 16 games, Jets red zone issues" },
      best: "Rushing yards OVER. Fade his TD props -- Jets offense doesn't score enough."
    },
    situation2026: "Jets RB1. QB situation (Fields, Darnold, whoever) affects his ceiling but floor is volume-protected.",
    bettingAngles: ["Rushing yards OVER is reliable", "FADE TD scorer -- Jets red zone is broken", "Volume carries the prop regardless of offense quality"],
    fantasy: { pprRank: "RB2-15", note: "Volume RB2. TD upside capped by Jets offense." }
  },

  "Josh Jacobs": {
    team: "GNB", tier: "STRONG",
    rush2025: { g: 15, att: 234, yds: 929, td: 13, ydsPg: 61.9, attPg: 15.6, ypa: 4.0, succPct: 49.1, fmb: 3 },
    rush2024: { ydsPg: 78.2, attPg: 17.7 },
    trend: { ydsPg_delta: -16.3, note: "Volume and efficiency both declined. Missed 2 games. 13 TDs keeps him relevant." },
    props: {
      td: { pg: 0.87, lean: "OVER 0.5 TD -- 13 TDs in 15 games is elite red zone usage" },
      rushYds: { floor: 45, ceil: 85, lean: "Neutral -- 61.9 base shows decline from peak" },
      best: "TD scorer OVER. Volume is fading but red zone role keeps TD rate elite."
    },
    situation2026: "Packers RB1 with Jordan Love. Green Bay system protects his role but age (27) and trend are concerns.",
    fantasy: { pprRank: "RB2-20", note: "TD-dependent. Draft as RB2 with TD upside." }
  },

  "Tony Pollard": {
    team: "TEN", tier: "STARTER",
    rush2025: { g: 17, att: 242, yds: 1082, td: 5, ydsPg: 63.6, attPg: 14.2, ypa: 4.5, succPct: 46.7, fmb: 4 },
    rush2024: { ydsPg: 67.4, attPg: 16.3 },
    trend: { ydsPg_delta: -3.8, note: "Flat. Consistent RB2 type, not an elite ceiling." },
    props: {
      rushYds: { floor: 45, ceil: 85, lean: "OVER in favorable matchups" },
      best: "Rushing yards OVER when Titans feeding him 14+ carries."
    },
    situation2026: "Titans RB1 with Cam Ward. Limited ceiling due to team quality.",
    fantasy: { pprRank: "RB2-22", note: "Solid RB2 with volume but limited upside." }
  },

  "D'Andre Swift": {
    team: "CHI", tier: "STRONG",
    rush2025: { g: 16, att: 223, yds: 1087, td: 9, ydsPg: 67.9, attPg: 13.9, ypa: 4.9, succPct: 54.7, fmb: 2 },
    rush2024: { ydsPg: 56.4, attPg: 14.9 },
    trend: { ydsPg_delta: +11.5, note: "Big improvement. 4.9 YPA efficiency improved significantly." },
    props: {
      rushYds: { floor: 55, ceil: 95, lean: "OVER -- improving efficiency + Caleb Williams improving offense" },
      best: "Rushing yards OVER. Caleb Williams' improvement directly benefits Swift's lanes."
    },
    situation2026: "Bears RB1 with Caleb Williams. New weapons for Williams should open run lanes further.",
    fantasy: { pprRank: "RB2-18", note: "OVER on projected use if Bears offense improves." }
  },

  "Kenneth Walker III": {
    team: "SEA", tier: "STARTER",
    rush2025: { g: 17, att: 221, yds: 1027, td: 5, ydsPg: 60.4, attPg: 13.0, ypa: 4.6, succPct: 43.9, fmb: 1 },
    rush2024: { ydsPg: 52.1, attPg: 13.9 },
    trend: { ydsPg_delta: +8.3, note: "Improved efficiency. Seahawks run game finding identity." },
    props: {
      rushYds: { floor: 45, ceil: 85, lean: "OVER in run-heavy scripts" },
      best: "Rushing yards OVER when Seattle leans on ground game."
    },
    situation2026: "Seahawks RB1 with Darnold. Volume-dependent RB2.",
    fantasy: { pprRank: "RB2-22", note: "Solid RB2." }
  },

  "Rico Dowdle": {
    team: "CAR", tier: "STARTER",
    rush2025: { g: 17, att: 236, yds: 1076, td: 6, ydsPg: 63.3, attPg: 13.9, ypa: 4.6, succPct: 47.9, fmb: 2 },
    rush2024: { ydsPg: 67.4, attPg: 14.7 },
    trend: { ydsPg_delta: -4.1, note: "Steady decline. Panthers rebuilding around Bryce Young." },
    props: {
      rushYds: { floor: 50, ceil: 85, lean: "OVER in run-heavy weeks" },
      best: "Volume carrier on rebuilding Panthers. OVER when getting 14+ carries."
    },
    situation2026: "Panthers RB1, now on CAR after 2025. Bryce Young improving with McMillan changes dynamic.",
    fantasy: { pprRank: "RB2-24", note: "Volume RB2. Limited upside." }
  },

  "Saquon Barkley": {
    team: "PHI", tier: "STRONG",
    rush2025: { g: 16, att: 280, yds: 1140, td: 7, ydsPg: 71.3, attPg: 17.5, ypa: 4.1, succPct: 46.1, fmb: 1 },
    rush2024: { ydsPg: 125.3, attPg: 21.6 },
    trend: { ydsPg_delta: -54.0, note: "MASSIVE decline from historic 2024 season. Age 28 + managed workload. NOT a collapse -- regression to normal." },
    props: {
      rushYds: { floor: 55, ceil: 100, lean: "OVER when Eagles feeding him. Managed usage means variance." },
      best: "Rushing yards OVER when Eagles lean on run. Jalen Hurts QB rush adds dimension that benefits Barkley."
    },
    situation2026: "Eagles RB1 with Hurts. Volume managed but scheme guarantees opportunities. 2024 was historically outlier.",
    bettingAngles: ["Rushing yards OVER is the lean -- 71 yds/g base is still strong", "Don't expect 2024 repeat -- that was historically outlier", "Eagle scheme with Hurts designed runs creates lanes"],
    fantasy: { pprRank: "RB1-8", note: "Still elite. 2024 was outlier high, 2025 is the real floor." }
  },

  "Chase Brown": {
    team: "CIN", tier: "STARTER",
    rush2025: { g: 17, att: 232, yds: 1019, td: 6, ydsPg: 59.9, attPg: 13.6, ypa: 4.4, succPct: 52.2, fmb: 2 },
    rush2024: { ydsPg: 61.9, attPg: 14.3 },
    trend: { ydsPg_delta: -2.0, note: "Flat. Consistent starter-level back. Shares with Perine." },
    props: {
      rushYds: { floor: 45, ceil: 80, lean: "OVER when Burrow healthy and spreading ball" },
      best: "Rushing yards OVER in run-heavy scripts."
    },
    situation2026: "Bengals RB1 with healthy Burrow. Perine committee limits ceiling.",
    fantasy: { pprRank: "RB2-25", note: "Committee RB2." }
  },

  // -- KEY BACKUP / HANDCUFF SITUATIONS -------------------------------------

  "Jaylen Warren": {
    team: "PIT", tier: "STARTER",
    rush2025: { g: 16, att: 211, yds: 958, td: 6, ydsPg: 59.9, attPg: 13.2, ypa: 4.5, succPct: 54.5, fmb: 1 },
    props: {
      rushYds: { lean: "OVER in run-heavy scripts when Steelers lean on ground game" },
      best: "High success rate (54.5%) means efficient yards even in limited game scripts."
    },
    situation2026: "Steelers RB1 with Rudolph (or whoever wins QB). Run game will carry offense.",
    fantasy: { pprRank: "RB2-25", note: "Volume RB2 on run-dependent team." }
  },

  "J.K. Dobbins": {
    team: "DEN", tier: "STARTER",
    rush2025: { g: 10, att: 153, yds: 772, td: 4, ydsPg: 77.2, attPg: 15.3, ypa: 5.0, succPct: 53.6, fmb: 0 },
    props: {
      rushYds: { lean: "OVER when healthy -- 77.2 yds/g in 10 games is elite efficiency" },
      best: "Health is everything. When active, OVER is automatic. When Q/D, fade."
    },
    situation2026: "Broncos RB1 when healthy. RJ Harvey shares load. Health risk is extreme.",
    fantasy: { pprRank: "RB2 healthy, RB4 otherwise", note: "Handcuff RJ Harvey. Dobbins injury history is disqualifying as a high pick." }
  },

  "TreVeyon Henderson": {
    team: "NWE", tier: "STARTER",
    rush2025: { g: 17, att: 180, yds: 911, td: 9, ydsPg: 53.6, attPg: 10.6, ypa: 5.1, succPct: 51.7, fmb: 1 },
    props: {
      td: { lean: "OVER 0.5 -- 9 TDs in 17 games is real red zone usage" },
      best: "TD scorer prop OVER. Patriots using him in goal line role."
    },
    situation2026: "Patriots RB1 with Drake Maye. Henderson and Stevenson split. Maye's mobility changes dynamic.",
    fantasy: { pprRank: "RB3 with upside", note: "Drake Maye rushing limits his ceiling but goal line role real." }
  },

  "Ashton Jeanty": {
    team: "LVR", tier: "STRONG",
    rush2025: { g: 17, att: 266, yds: 975, td: 5, ydsPg: 57.4, attPg: 15.6, ypa: 3.7, succPct: 41.0, fmb: 2 },
    props: {
      rushYds: { lean: "OVER in volume -- 266 att shows Raiders committed but 3.7 YPA is below average" },
      best: "Volume OVER props. Efficiency (3.7 YPA, 41% success) is the concern -- market may overrate ceiling."
    },
    situation2026: "Raiders RB1. Heisman finalist from Boise State. First full NFL season. Efficiency must improve.",
    bettingAngles: ["Volume protects rushing yards OVER", "YPA (3.7) below average -- fade explosive game props", "TD upside lower than volume suggests"],
    fantasy: { pprRank: "RB2-18", note: "Volume is real but efficiency below average. Manageable RB2." }
  },

  // -- NOTABLE SITUATIONAL BACKS ---------------------------------------------

  "Christian McCaffrey": {
    team: "SFO", tier: "ELITE",
    rush2025: { g: 17, att: 311, yds: 1202, td: 10, ydsPg: 70.7, attPg: 18.3, ypa: 3.9, succPct: 48.6, fmb: 2 },
    rush2024: { ydsPg: 50.5, attPg: 12.5, note: "4 games only in 2024" },
    trend: { note: "Healthy full season confirmed elite status. 3.9 YPA is below average -- relies on receiving." },
    props: {
      rushYds: { floor: 55, ceil: 95, lean: "OVER when healthy and Purdy playing" },
      best: "Total yards (rush + receive) OVER is the better play. Pure rushing OVER is tighter."
    },
    situation2026: "49ers RB1. Purdy health and Shanahan scheme are the two variables that determine his ceiling.",
    bettingAngles: ["Total yards OVER includes receiving floor", "Rush OVER is moderate lean -- 3.9 YPA limits ceiling", "Health monitor every week -- missed 8+ games each of last 2 seasons"],
    fantasy: { pprRank: "RB1-5 healthy", note: "Elite when healthy. Health risk is real." }
  },

  "Zach Charbonnet": {
    team: "SEA", tier: "STARTER",
    rush2025: { g: 16, att: 184, yds: 730, td: 12, ydsPg: 45.6, attPg: 11.5, ypa: 4.0, succPct: 48.4, fmb: 0 },
    props: {
      td: { lean: "OVER 0.5 -- 12 TDs in 16 games as backup is elite red zone usage" },
      best: "TD scorer prop OVER when touching ball near goal line."
    },
    situation2026: "Walker's backup and goal line finisher. 12 TDs as secondary back is remarkable.",
    fantasy: { pprRank: "RB3 with TD upside", note: "Charbonnet is the Walker handcuff AND a standalone TD prop." }
  },

};

export default RBs;
