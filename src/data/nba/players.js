// NBA player database — 2024-25 season
// Used by UR Take for prop analysis context and the NBA player card UI
// tier: ELITE | STAR | STARTER | ROLE
// pts/reb/ast: per-game averages

export const NBA_PLAYERS = {
  // ── MVP-tier / ELITE ───────────────────────────────────────────────────────
  "Shai Gilgeous-Alexander": {
    team: "OKC", tier: "ELITE", pts: 32.7, reb: 5.5, ast: 6.4,
    pos: "G", usg: 33.1,
    propAngles: ["PTS OVER — elite usage, most consistent scorer in NBA", "PRA OVER — floor + rebounds + assists reliable nightly", "Assists OVER in up-tempo OKC offense"],
    situation: "OKC star. MVP frontrunner. Most efficient elite scorer in the league.",
  },
  "Nikola Jokic": {
    team: "DEN", tier: "ELITE", pts: 29.6, reb: 13.0, ast: 10.2,
    pos: "C", usg: 30.2,
    propAngles: ["PRA OVER — triple-double machine, safest PRA in NBA", "Rebounds OVER — elite boarding rate", "Assists OVER — true point center"],
    situation: "Nuggets C. Three-time MVP. PRA is the safest bet in the NBA.",
  },
  "Giannis Antetokounmpo": {
    team: "MIL", tier: "ELITE", pts: 30.4, reb: 11.9, ast: 6.5,
    pos: "F", usg: 33.8,
    propAngles: ["PRA OVER — monster floor nightly", "Points OVER — volume usage locked in", "Rebounds OVER — elite glass-cleaning rate"],
    situation: "Bucks F. Usage and physicality guarantee a high floor every night.",
  },
  "Luka Doncic": {
    team: "DAL", tier: "ELITE", pts: 28.6, reb: 8.7, ast: 8.0,
    pos: "G", usg: 35.2,
    propAngles: ["PRA OVER — highest usage in NBA", "Assists OVER — primary playmaker", "Points OVER in scoring-friendly matchups"],
    situation: "Mavericks star. Elite creator. Highest usage rate in the league.",
  },
  "Jayson Tatum": {
    team: "BOS", tier: "ELITE", pts: 26.9, reb: 8.1, ast: 4.9,
    pos: "F", usg: 30.1,
    propAngles: ["Points OVER — elite scorer in elite offense", "PRA OVER — consistent all-around floor", "Rebounds OVER for a wing"],
    situation: "Celtics F. Primary scorer in the best offense in the NBA.",
  },
  "Donovan Mitchell": {
    team: "CLE", tier: "ELITE", pts: 26.3, reb: 4.7, ast: 6.0,
    pos: "G", usg: 31.4,
    propAngles: ["Points OVER — elite scorer", "Assists OVER — primary playmaker", "Back OVER in fast-paced matchups"],
    situation: "Cavaliers G. Elite isolator. Points and assists both reliable.",
  },
  "Anthony Edwards": {
    team: "MIN", tier: "ELITE", pts: 27.1, reb: 5.4, ast: 5.1,
    pos: "G", usg: 32.2,
    propAngles: ["Points OVER — elite usage", "PRA OVER — consistent all-around producer", "3PM OVER — volume and efficiency elite"],
    situation: "Timberwolves G. Explosive scorer. Most complete young player in the NBA.",
  },
  "Kevin Durant": {
    team: "PHX", tier: "ELITE", pts: 26.8, reb: 6.5, ast: 4.1,
    pos: "F", usg: 30.8,
    propAngles: ["Points OVER — elite mid-range, hard to stop", "PRA OVER — reliable floor", "FT attempts signal usage — back OVER when he's attacking"],
    situation: "Suns F. Unstoppable scorer. Age 36 but still elite efficiency.",
  },
  "LeBron James": {
    team: "LAL", tier: "ELITE", pts: 24.0, reb: 7.3, ast: 8.4,
    pos: "F", usg: 29.5,
    propAngles: ["Assists OVER — primary creator", "PRA OVER — durable floor", "Fade in back-to-backs"],
    situation: "Lakers F. Age 40. Still elite playmaker. Minutes managed in back-to-backs.",
  },
  "Stephen Curry": {
    team: "GSW", tier: "ELITE", pts: 26.4, reb: 4.6, ast: 5.2,
    pos: "G", usg: 30.6,
    propAngles: ["3PM OVER — volume + efficiency unmatched", "Points OVER — elite floor in Warriors system", "PRA OVER — reliable stats every night"],
    situation: "Warriors G. Best shooter ever. 3PM market is consistently beatable.",
  },
  "Joel Embiid": {
    team: "PHI", tier: "ELITE", pts: 34.7, reb: 11.0, ast: 5.6,
    pos: "C", usg: 37.8,
    propAngles: ["Points OVER when healthy — highest usage in NBA", "PRA OVER — elite floor", "FADE when on injury report — monitor daily"],
    situation: "76ers C. Most explosive scorer in NBA when healthy. Injury risk.",
  },

  // ── STAR tier ──────────────────────────────────────────────────────────────
  "Tyrese Haliburton": {
    team: "IND", tier: "STAR", pts: 20.1, reb: 3.9, ast: 10.9,
    pos: "G", usg: 25.3,
    propAngles: ["Assists OVER — most reliable assist prop in the NBA", "3PM OVER — volume shooter", "PRA OVER — assists push it consistently"],
    situation: "Pacers G. Elite facilitator. Assist total is the easiest prop every night.",
  },
  "Trae Young": {
    team: "ATL", tier: "STAR", pts: 23.8, reb: 3.4, ast: 11.3,
    pos: "G", usg: 33.0,
    propAngles: ["Assists OVER — top assist man in NBA", "Points OVER — high volume scorer", "FADE rebounds — not a rebounder"],
    situation: "Hawks G. Elite scorer/passer. Assists are the most exploitable prop.",
  },
  "Devin Booker": {
    team: "PHX", tier: "STAR", pts: 25.7, reb: 4.5, ast: 6.5,
    pos: "G", usg: 30.4,
    propAngles: ["Points OVER — elite scorer in pick-and-roll", "Assists OVER — secondary creator", "PRA OVER — well-rounded stats"],
    situation: "Suns G. Primary scorer. Most consistent offensive player on PHX.",
  },
  "Damian Lillard": {
    team: "MIL", tier: "STAR", pts: 25.2, reb: 4.4, ast: 6.8,
    pos: "G", usg: 31.2,
    propAngles: ["Points OVER — elite off-ball scorer", "3PM OVER — volume and accuracy elite", "Assists OVER — secondary facilitator"],
    situation: "Bucks G. Elite shooter. Points and 3PM are the cleanest markets.",
  },
  "Darius Garland": {
    team: "CLE", tier: "STAR", pts: 20.6, reb: 3.0, ast: 7.8,
    pos: "G", usg: 26.8,
    propAngles: ["Assists OVER — elite facilitator", "Points OVER — efficient scorer", "3PM OVER when healthy"],
    situation: "Cavaliers G. Elite backcourt partner with Mitchell. Assists reliable.",
  },
  "Jalen Brunson": {
    team: "NYK", tier: "STAR", pts: 28.7, reb: 3.6, ast: 7.0,
    pos: "G", usg: 33.5,
    propAngles: ["Points OVER — primary scorer/creator", "Assists OVER — facilitates elite offense", "PRA OVER — reliable all-around"],
    situation: "Knicks G. Team's entire offense runs through him. Elite usage.",
  },
  "Zach LaVine": {
    team: "CHI", tier: "STAR", pts: 24.8, reb: 4.9, ast: 4.6,
    pos: "G", usg: 30.5,
    propAngles: ["Points OVER — elite scorer", "3PM OVER — volume shooter", "Fade in blowouts — usage drops"],
    situation: "Bulls G. Primary scorer. Points market is the best angle.",
  },
  "Bam Adebayo": {
    team: "MIA", tier: "STAR", pts: 19.8, reb: 10.4, ast: 3.3,
    pos: "C", usg: 24.5,
    propAngles: ["Rebounds OVER — elite glass cleaner", "PRA OVER — combines points + boards well", "FADE assists — not a primary passer"],
    situation: "Heat C. Elite two-way big. Rebounds are the most reliable market.",
  },
  "Rudy Gobert": {
    team: "MIN", tier: "STAR", pts: 14.0, reb: 12.9, ast: 1.3,
    pos: "C", usg: 18.2,
    propAngles: ["Rebounds OVER — elite in class", "Blocks OVER — best shot-blocker", "FADE points — low usage"],
    situation: "Timberwolves C. Best rebounder in the league. Boards prop is clean.",
  },
  "Alperen Sengun": {
    team: "HOU", tier: "STAR", pts: 21.1, reb: 9.5, ast: 5.8,
    pos: "C", usg: 24.6,
    propAngles: ["PRA OVER — elite all-around young big", "Rebounds OVER — consistent", "Assists OVER — rare passing big"],
    situation: "Rockets C. Most complete young center in the league. PRA is safest bet.",
  },
  "Cade Cunningham": {
    team: "DET", tier: "STAR", pts: 23.5, reb: 4.4, ast: 9.4,
    pos: "G", usg: 29.7,
    propAngles: ["Assists OVER — primary facilitator", "Points OVER — scoring breakout season", "PRA OVER — well-rounded"],
    situation: "Pistons G. Full breakout season. Assists are extremely reliable.",
  },
  "Evan Mobley": {
    team: "CLE", tier: "STAR", pts: 18.3, reb: 9.0, ast: 2.9,
    pos: "F/C", usg: 22.0,
    propAngles: ["Rebounds OVER — elite big", "PRA OVER — consistent floor", "Blocks OVER — elite shot-blocker"],
    situation: "Cavaliers F/C. Breakout year alongside Mitchell and Garland.",
  },
  "Paolo Banchero": {
    team: "ORL", tier: "STAR", pts: 25.4, reb: 7.1, ast: 5.9,
    pos: "F", usg: 30.7,
    propAngles: ["Points OVER — primary scorer", "PRA OVER — well-rounded", "Assists OVER — elite passer for a big"],
    situation: "Magic F. Elite young star. Breakout with Magic contending.",
  },
  "Franz Wagner": {
    team: "ORL", tier: "STAR", pts: 24.2, reb: 5.0, ast: 4.5,
    pos: "F", usg: 27.3,
    propAngles: ["Points OVER — secondary scorer next to Banchero", "PRA OVER — consistent", "3PM OVER — high volume shooter"],
    situation: "Magic F. Emerging star. Points and PRA are the cleanest markets.",
  },
  "Jaylen Brown": {
    team: "BOS", tier: "STAR", pts: 22.3, reb: 5.5, ast: 3.6,
    pos: "G/F", usg: 27.5,
    propAngles: ["Points OVER — secondary scorer in elite offense", "PRA OVER — consistent floor", "3PM OVER — volume shooter"],
    situation: "Celtics G/F. Tatum's backcourt partner. Consistent usage.",
  },
  "De'Aaron Fox": {
    team: "SAC", tier: "STAR", pts: 25.6, reb: 4.2, ast: 7.5,
    pos: "G", usg: 30.8,
    propAngles: ["Points OVER — elite scorer", "Assists OVER — primary creator", "PRA OVER — reliable all-around"],
    situation: "Kings G. Primary scorer and creator. Elite two-way player.",
  },
  "Jaren Jackson Jr.": {
    team: "MEM", tier: "STAR", pts: 22.4, reb: 6.0, ast: 2.4,
    pos: "F/C", usg: 25.1,
    propAngles: ["Points OVER — elite scorer for a big", "Blocks OVER — perennial Defensive Player of Year candidate", "3PM OVER — elite stretch big"],
    situation: "Grizzlies F/C. Elite two-way big. Blocks and points are both bettable.",
  },
  "Karl-Anthony Towns": {
    team: "NYK", tier: "STAR", pts: 21.5, reb: 8.8, ast: 3.3,
    pos: "C", usg: 27.0,
    propAngles: ["Rebounds OVER — elite rebounder", "Points OVER — elite stretch big", "3PM OVER — best shooting big in NBA"],
    situation: "Knicks C. Elite stretch five. Knicks' second star next to Brunson.",
  },
  "Draymond Green": {
    team: "GSW", tier: "STARTER", pts: 9.0, reb: 7.4, ast: 6.5,
    pos: "F", usg: 17.0,
    propAngles: ["Assists OVER — primary facilitator in Warriors system", "Rebounds OVER — elite IQ rebounder", "FADE points — not a scorer"],
    situation: "Warriors F. Elite IQ. PRA propped low — assists make it playable.",
  },
  "Anthony Davis": {
    team: "LAL", tier: "ELITE", pts: 24.7, reb: 12.6, ast: 3.5,
    pos: "C", usg: 29.0,
    propAngles: ["Rebounds OVER — elite rebounding C", "Points OVER — primary Lakers scorer", "PRA OVER — consistent floor"],
    situation: "Lakers C. Primary scorer when LeBron defers. Injury history.",
  },
  "Victor Wembanyama": {
    team: "SAS", tier: "ELITE", pts: 24.3, reb: 10.6, ast: 3.9,
    pos: "C", usg: 28.0,
    propAngles: ["Blocks OVER — generational shot-blocker", "PRA OVER — elite all-around", "Points OVER — most unique offensive toolkit in NBA"],
    situation: "Spurs C. Generational talent in Year 2. Best DPOY candidate.",
  },
};
