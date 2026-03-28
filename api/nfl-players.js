// api/nfl-players.js
// NFL Player Database for UR TAKE
// QB data: 2024 PFR stats as baseline, 2025/2026 roster situations from Ourlads (March 2026)
// Auto-updated weekly via api/nfl-sync.js

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ qb: QBs, rb: RBs, wr: WRs, te: TEs, coaches: Coaches });
}

const QBs = {

  // AFC EAST
  "Josh Allen": {
    team: "BUF", backup: "Kyle Allen", age: 29, tier: "ELITE",
    style: ["dual threat", "power runner", "fourth quarter closer", "improviser"],
    stats2024: { games: 17, record: "12-5", cmp: 69.3, yds: 3668, td: 25, int: 10, ypa: 8.0, aya: 8.1, rate: 102.2, qbr: 65.4, skPct: 8.0 },
    situation2025: "Locked in as Bills franchise QB. DJ Moore added (traded from CHI). Full health expected. Line intact.",
    strengths: ["QBR 65.4 — elite by any measure", "Rushing floor (500+ yards annually) creates weekly fantasy floor", "4 fourth-quarter comebacks in 2024", "69.3% completion — career accuracy peak"],
    weaknesses: ["Sack rate 8.0% — takes hits, durability concern long-term", "10 INTs in 2024", "DJ Moore upgrade needed to test — new chemistry"],
    bettingAngles: ["Bills team total OVER in domes — Allen ceiling is real", "Allen rushing yards OVER every week — 40+ yards is baseline", "Lean Bills in late-season games — clutch factor is proven"],
    fantasyProfile: { pprRank: "QB1-2", nonPprRank: "QB1-2", upside: "QB1 overall — rushing floor is unmatched at the position", risk: "Contact injury from rushing style", note: "Draft him, roster a backup. His floor in a bad passing game is still 25+ rushing yards." }
  },

  "Malik Willis": {
    team: "MIA", backup: "Quinn Ewers", age: 26, tier: "UNKNOWN",
    style: ["dual threat", "improviser", "big arm", "raw passer"],
    stats2024: { games: 4, record: "0-1", cmp: 85.7, yds: 422, td: 3, int: 0, ypa: 12.1, aya: 13.8, rate: 145.5, qbr: 93.1, skPct: 7.89 },
    situation2025: "Tua Tagovailoa cut — Willis inherits the job. Tiny NFL sample (35 career attempts) but flashed elite metrics. Tyreek Hill and Jaylen Waddle are elite weapons if he can access them.",
    strengths: ["145.5 passer rating in 4-game sample — elite small sample", "Rushing upside is massive — 400+ yards possible", "Arm talent is legitimate deep ball threat", "Hill and Waddle are top-5 WRs when healthy"],
    weaknesses: ["35 career NFL passing attempts — essentially no sample", "Accuracy history in college/preseason is concerning", "No proven ability to sustain drives against NFL defenses", "Could lose job by Week 6 if accuracy doesn't show"],
    bettingAngles: ["Fade Dolphins team total in early season until we see real sample", "Willis rushing yards OVER — build in 30-50 per game", "Lean UNDER on Dolphins passing yards props — major uncertainty"],
    fantasyProfile: { pprRank: "QB22-28 until proven", nonPprRank: "QB22-28", upside: "Lamar-lite if it clicks — rushing floor makes ceiling real", risk: "Extreme — could lose job by Week 4 if accuracy fails", note: "Streaming only. Monitor camp and preseason completion rate heavily." }
  },

  "Drake Maye": {
    team: "NE", backup: "Joshua Dobbs", age: 23, tier: "ELITE",
    style: ["dual threat", "big arm", "pocket mover", "improvisational"],
    stats2024: { games: 17, record: "14-3", cmp: 72.0, yds: 4394, td: 31, int: 8, ypa: 8.9, aya: 9.5, rate: 113.5, qbr: 77.1, skPct: 8.72 },
    situation2025: "Locked in as Patriots franchise QB. Full offseason to address 8.72% sack rate. Weapons still developing around him.",
    strengths: ["QBR 77.1 — highest among all starters in 2024", "AY/A 9.5 — most efficient passer in the league", "72.0% completion at volume — historically rare rookie accuracy", "14-3 record as a rookie"],
    weaknesses: ["Sack rate 8.72% — holds ball too long", "Weapons still developing around him", "Second-year regression always possible"],
    bettingAngles: ["Patriots team total OVER — Maye's efficiency creates real scoring", "Maye sacks OVER vs elite pass rushes — holds ball waiting for big plays", "Lean Patriots ML as underdogs — he wins games he shouldn't"],
    fantasyProfile: { pprRank: "QB3-5", nonPprRank: "QB3-5", upside: "QB1 ceiling — metrics say he's already there", risk: "Sack exposure, weapon development pace", note: "Year 2 leap with improved line could push him to QB1 overall." }
  },

  "Geno Smith": {
    team: "NYJ", backup: "Brady Cook", age: 35, tier: "BELOW_AVG",
    style: ["game manager", "rhythm thrower", "veteran presence"],
    stats2024: { games: 15, record: "2-13", cmp: 67.4, yds: 3025, td: 19, int: 17, ypa: 6.8, aya: 5.9, rate: 84.7, qbr: 34.1, skPct: 10.93 },
    situation2025: "Released by Las Vegas, signed by NYJ. Jets in full rebuild. 17 INTs and 10.93% sack rate in 2024 are alarming at age 35.",
    strengths: ["Veteran presence", "67.4% completion when protected", "Experience in late-game situations"],
    weaknesses: ["17 INTs in 2024 — worst in the league", "10.93% sack rate — worst among starters by wide margin", "QBR 34.1 — below replacement level", "Age 35, declining trajectory"],
    bettingAngles: ["Jets team total UNDER — turnover rate kills drives", "Geno INT prop OVER — 17 in 2024, Jets situation no better", "Fade Jets as favorites — Geno cannot protect leads"],
    fantasyProfile: { pprRank: "QB28-32", nonPprRank: "QB28-32", upside: "Streamable only in desperation", risk: "Extreme", note: "Do not roster in any format." }
  },

  // AFC NORTH
  "Lamar Jackson": {
    team: "BAL", backup: "Tyler Huntley", age: 28, tier: "ELITE",
    style: ["dual threat elite", "zone buster", "improviser", "run-pass threat"],
    stats2024: { games: 13, record: "6-7", cmp: 63.6, yds: 2549, td: 21, int: 7, ypa: 8.4, aya: 8.8, rate: 103.8, qbr: 62.7, skPct: 10.65 },
    situation2025: "Fully healthy entering 2025. Derrick Henry retained. Trey Hendrickson added at ROLB — defense elite again. Mark Andrews healthy returning. Supporting cast is among the best in the AFC.",
    strengths: ["8.8 AY/A and 103.8 rate — elite when passing", "Rushing production incomparable — 600-800 yards on ground annually", "21 TDs in only 13 games — scoring rate exceptional", "Mark Andrews healthy returning"],
    weaknesses: ["10.65% sack rate — highest among starters, takes dangerous hits", "Missed 4 games in 2024 — durability concern", "6-7 record when he played — defense had issues in spots"],
    bettingAngles: ["Lamar rushing yards OVER every game — 50+ yards is baseline", "Ravens team total OVER when Lamar confirmed starting", "Lamar anytime TD scorer — scores 20+ TDs almost every season"],
    fantasyProfile: { pprRank: "QB1-3 when healthy", nonPprRank: "QB1-3 when healthy", upside: "QB1 overall when healthy — rushing floor is unique in the game", risk: "Durability — rushing style guarantees some missed games", note: "The highest upside QB in fantasy. Draft him, roster a handcuff." }
  },

  "Joe Burrow": {
    team: "CIN", backup: "Josh Johnson", age: 29, tier: "ELITE",
    style: ["pocket passer", "play-action", "rhythm thrower", "pressure poise"],
    stats2024: { games: 8, record: "5-3", cmp: 66.8, yds: 1809, td: 17, int: 5, ypa: 7.0, aya: 7.4, rate: 100.7, qbr: 63.0, skPct: 6.16 },
    situation2025: "Fully healthy after wrist injury. Ja'Marr Chase re-signed on massive extension. Tee Higgins retained. Orlando Brown Jr. signed at LT — line finally upgraded. This is a top-3 offense when healthy.",
    strengths: ["17 TDs in 8 games — 30+ TD pace over full season", "Ja'Marr Chase is arguably the best WR in football", "QBR 63.0 in limited sample", "Orlando Brown Jr. at LT is a significant line upgrade"],
    weaknesses: ["Missed games in 3 of last 4 seasons — injury history is real", "Bengals line still below elite despite upgrades", "Needs full season sample to confirm trajectory"],
    bettingAngles: ["Bengals team total OVER — Chase + Higgins + healthy Burrow is top-3 offense", "Burrow passing yards OVER — volume is real with this receiving corps", "Chase receiving yards OVER — primary connection"],
    fantasyProfile: { pprRank: "QB4-6 if healthy", nonPprRank: "QB4-6", upside: "QB1 ceiling — talent and weapons both top-3", risk: "Injury history — has missed significant time in multiple seasons", note: "Full healthy season projects to 4500+ yards, 35+ TDs. Draft him in rounds 4-5." }
  },

  "Shedeur Sanders": {
    team: "CLE", backup: "Dillon Gabriel", age: 23, tier: "BELOW_AVG",
    style: ["pocket passer", "accuracy-first", "improviser", "football IQ"],
    stats2024: { games: 8, record: "3-4", cmp: 56.6, yds: 1400, td: 7, int: 10, ypa: 6.6, aya: 5.1, rate: 68.1, qbr: 18.9, skPct: 9.79 },
    situation2025: "Drafted 5th overall by Cleveland. Deshaun Watson also listed but effectively done. Shedeur is the franchise QB. Numbers were generated behind one of the worst OLs in NFL history — context matters.",
    strengths: ["Football IQ and pre-snap reads are advanced for his age", "Accuracy in clean pockets confirmed by college tape", "Leadership and composure are proven traits", "Dillon Gabriel as backup signals youth-first rebuild"],
    weaknesses: ["10 INTs in 8 games — alarming even with context", "QBR 18.9 — historically poor start", "Cleveland OL not fixed overnight", "Sack rate 9.79% — took brutal punishment"],
    bettingAngles: ["Browns team total UNDER until OL and weapons materially improve", "Sanders sack taken OVER — Cleveland line is still a problem", "Fade Browns vs top-10 pass rushes — rookie QB behind bad line is exploitable"],
    fantasyProfile: { pprRank: "QB28-32 in 2025", nonPprRank: "QB28-32", upside: "Dynasty asset — ceiling is real if Cleveland builds properly", risk: "Extreme in 2025 — bad OL, bad weapons, massive learning curve", note: "Redraft: do not touch. Dynasty: buy low now, patience required." }
  },

  "Mason Rudolph": {
    team: "PIT", backup: "Will Howard", age: 30, tier: "BELOW_AVG",
    style: ["game manager", "conservative", "check-down reliant"],
    stats2024: { games: 5, record: "0-1", cmp: 73.1, yds: 310, td: 2, int: 2, ypa: 6.0, aya: 5.0, rate: 84.6, qbr: 34.1, skPct: 3.70 },
    situation2025: "Aaron Rodgers not on roster. Rudolph inherits starting job by default. Pittsburgh likely adds a QB via draft. This situation is in flux — treat as placeholder.",
    strengths: ["Conservative game manager — won't lose games on his own", "Pittsburgh defense keeps them competitive regardless", "Low sack rate (3.70%) — gets ball out quickly"],
    weaknesses: ["No upside — cannot win games with his arm", "Will Howard as backup signals Pittsburgh knows this is temporary", "Najee Harris and run game must carry the offense"],
    bettingAngles: ["Steelers team total UNDER — offense will be run-heavy and conservative", "Fade Pittsburgh in must-score situations — passing ceiling extremely low", "Steelers ML value as underdogs — defense keeps them in games Rudolph can't win"],
    fantasyProfile: { pprRank: "QB30-32", nonPprRank: "QB30-32", upside: "Handcuff only if Pittsburgh adds a real starter", risk: "Extreme — this situation almost certainly changes before Week 1", note: "Do not draft. Monitor Pittsburgh QB moves through the draft heavily." }
  },

  // AFC SOUTH
  "C.J. Stroud": {
    team: "HOU", backup: "Davis Mills", age: 24, tier: "STARTER",
    style: ["pocket passer", "pre-snap reader", "rhythm thrower", "deep ball"],
    stats2024: { games: 14, record: "9-5", cmp: 64.5, yds: 3041, td: 19, int: 8, ypa: 7.2, aya: 7.2, rate: 92.9, qbr: 61.7, skPct: 5.16 },
    situation2025: "Fully healthy. Tank Dell returning. Nico Collins retained. Texans have built one of the best skill position groups in the AFC. Full season expected to confirm trajectory.",
    strengths: ["QBR 61.7 in only 14 games", "Elite pre-snap processing for a year-2 QB", "Tank Dell + Nico Collins premier WR duo when healthy", "Texans scheme maximizes his processing"],
    weaknesses: ["Missed games in both NFL seasons — injury concern", "19 TDs in 14 games — needs full season volume", "Nico Collins health is the primary upside variable"],
    bettingAngles: ["Texans team total OVER when fully healthy — top-5 offense", "Stroud passing yards OVER vs weak secondaries", "Collins target share OVER — primary connection"],
    fantasyProfile: { pprRank: "QB7-10", nonPprRank: "QB7-10", upside: "Top-5 QB if healthy full season", risk: "Injury — missed games both seasons", note: "Full healthy season projects to 4500+ yards, 30+ TDs. Health is the only gate." }
  },

  "Daniel Jones": {
    team: "IND", backup: "Anthony Richardson", age: 28, tier: "STARTER",
    style: ["pocket passer", "mobile", "pre-snap reader"],
    stats2024: { games: 13, record: "8-5", cmp: 68.0, yds: 3101, td: 19, int: 8, ypa: 8.1, aya: 8.1, rate: 100.2, qbr: 63.0, skPct: 5.42 },
    situation2025: "Listed QB1 on Ourlads depth chart with Anthony Richardson as backup — the opposite of most expectations. Richardson's injury history has put Jones ahead in the depth chart. Major story to monitor through camp.",
    strengths: ["68.0% completion and QBR 63.0 — best statistical season of his career", "8-5 record as a starter", "Jonathan Taylor and Tyler Warren TE are legitimate weapons"],
    weaknesses: ["Injury history himself", "Richardson looming — depth chart could flip if Jones struggles early", "Colts may shift back to Richardson at any point"],
    bettingAngles: ["Monitor this situation weekly — could flip by training camp", "Jones OVER if confirmed starter — he can produce in this system", "Fade Colts team total if Richardson takes over — AR passing is unreliable"],
    fantasyProfile: { pprRank: "QB12-16 if starting", nonPprRank: "QB12-16", upside: "Legitimate QB2 ceiling if he keeps the job", risk: "High — Richardson looming, injury history, fluid situation", note: "Do not invest heavily until camp confirms Jones. Monitor daily." }
  },

  "Trevor Lawrence": {
    team: "JAX", backup: "Nick Mullens", age: 26, tier: "STARTER",
    style: ["pocket passer", "arm talent", "rhythm thrower", "dual threat lite"],
    stats2024: { games: 17, record: "13-4", cmp: 60.9, yds: 4007, td: 29, int: 12, ypa: 7.2, aya: 7.2, rate: 91.0, qbr: 58.3, skPct: 6.82 },
    situation2025: "13-4 record showed real winning ability. Needs receiver corps upgrade — Christian Kirk situation unclear. Year 5 is when accuracy needs to take the leap.",
    strengths: ["13-4 record — best in franchise history", "29 TDs, elite arm talent", "3 fourth-quarter comebacks — improved clutch performance"],
    weaknesses: ["60.9% completion — accuracy is the primary flaw", "12 INTs — forces throws into coverage", "Receiving corps needs improvement"],
    bettingAngles: ["Lawrence OVER in high-total games vs weak secondaries", "Jaguars home ML — home record with Lawrence is strong", "Fade Lawrence in bad weather road games — completion rate drops"],
    fantasyProfile: { pprRank: "QB10-14", nonPprRank: "QB10-14", upside: "QB1 ceiling in right matchup — arm talent is genuine", risk: "Accuracy inconsistency, turnover rate", note: "High-variance QB2. Target in favorable matchups." }
  },

  "Cam Ward": {
    team: "TEN", backup: "Mitchell Trubisky", age: 23, tier: "BELOW_AVG",
    style: ["improviser", "arm talent", "raw", "dual threat potential"],
    stats2024: { games: 17, record: "3-14", cmp: 59.8, yds: 3169, td: 15, int: 7, ypa: 5.9, aya: 5.8, rate: 80.2, qbr: 33.2, skPct: 9.24 },
    situation2025: "Year 2. Will Levis also listed as third QB. Tennessee has cap space to add weapons. Ward needs receivers and a rebuilt line to show his ceiling. 7 INTs on a 3-14 team showed genuine composure.",
    strengths: ["7 INTs in 17 games on a historically bad team — real ball security", "Arm talent is legitimate", "23 years old — ceiling undefined"],
    weaknesses: ["3-14 record — extreme context", "59.8% completion, 5.9 Y/A — very limited production", "9.24% sack rate — terrible line created impossible conditions"],
    bettingAngles: ["Titans team total UNDER until weapons and line improve", "Ward sack OVER in early season — OL still a problem", "Fade Titans vs playoff-caliber defenses"],
    fantasyProfile: { pprRank: "QB26-32", nonPprRank: "QB26-32", upside: "Dynasty stash — ceiling is real if Tennessee builds around him", risk: "No supporting cast, Tennessee rebuild ongoing", note: "Redraft: skip. Dynasty: low-cost stash for year 3-4 potential." }
  },

  // AFC WEST
  "Bo Nix": {
    team: "DEN", backup: "Jarrett Stidham", age: 25, tier: "STARTER",
    style: ["game manager", "check-down reliant", "run-pass option", "caretaker"],
    stats2024: { games: 17, record: "14-3", cmp: 63.4, yds: 3931, td: 25, int: 11, ypa: 6.4, aya: 6.4, rate: 87.8, qbr: 58.3, skPct: 3.47 },
    situation2025: "Year 2 in Payton system. Continuity is the plan. Ceiling is defined by the scheme, not Nix individually. The running backs (Javonte Williams, RJ Harvey) are the real offensive assets.",
    strengths: ["14-3 rookie record — system maximized his strengths", "3.47% sack rate — gets ball out fastest among starters", "5 fourth-quarter comebacks"],
    weaknesses: ["6.4 Y/A — most conservative passing attack among starters", "Ceiling is Payton's system", "11 INTs on modest attempts"],
    bettingAngles: ["Broncos UNDER in pass-heavy game scripts — scheme won't allow it", "Broncos RB props OVER — run-first offense means RBs are the assets", "Fade Nix passing yards OVER — scheme deliberately suppresses volume"],
    fantasyProfile: { pprRank: "QB18-24", nonPprRank: "QB18-24", upside: "Streaming option with right game script", risk: "System-bound, low ceiling", note: "Javonte Williams and RJ Harvey are the fantasy assets on this offense." }
  },

  "Patrick Mahomes": {
    team: "KC", backup: "Justin Fields", age: 30, tier: "ELITE",
    style: ["improviser", "off-platform", "two-minute drill master", "pre-snap manipulator"],
    stats2024: { games: 14, record: "6-8", cmp: 62.7, yds: 3587, td: 22, int: 11, ypa: 7.1, aya: 7.0, rate: 89.6, qbr: 68.5, skPct: 6.34 },
    situation2025: "Justin Fields added as backup — pressure and insurance. Chiefs need receiver room upgrade. QBR 68.5 despite 6-8 record confirms Mahomes is not the problem.",
    strengths: ["QBR 68.5 despite worst season — individual talent unchanged", "Three Super Bowl titles", "Off-platform improvisation unmatched in NFL history", "Two-minute drill efficiency is elite career-long"],
    weaknesses: ["6-8 record — needs better weapons", "62.7% completion — below his standard", "11 INTs — more than typical Mahomes season"],
    bettingAngles: ["Chiefs ML in playoff spots — January Mahomes is a different player", "Fade Chiefs -7+ in regular season without elite WR help", "Mahomes UNDER when Reid runs the ball to manage game"],
    fantasyProfile: { pprRank: "QB5-8", nonPprRank: "QB5-8", upside: "QB1 when weapons healthy and scheme firing", risk: "Supporting cast dependent — 2024 proved ceiling without elite targets", note: "Watch the draft. If KC takes a WR early, Mahomes shoots back to QB1-2 territory." }
  },

  "Aidan O'Connell": {
    team: "LV", backup: "", age: 27, tier: "BELOW_AVG",
    style: ["game manager", "conservative", "check-down"],
    stats2024: { games: 1, cmp: 45.5, yds: 102, td: 0, int: 0, ypa: 4.6, rate: 59.3, qbr: 16.3, skPct: 4.35 },
    situation2025: "Only QB listed on Raiders depth chart — full rebuild. Placeholder, not a solution. Raiders almost certain to draft a QB.",
    strengths: ["Placeholder starter in a rebuild", "Low sack rate in tiny sample"],
    weaknesses: ["Insufficient sample", "No backup listed — team in complete rebuild", "No meaningful weapons on roster"],
    bettingAngles: ["Raiders team total UNDER until QB situation resolved", "Fade Raiders as favorites in any game"],
    fantasyProfile: { pprRank: "Do not draft", nonPprRank: "Do not draft", upside: "None in current form", risk: "Extreme", note: "Watch the draft. Raiders are a prime candidate to take a QB early." }
  },

  "Justin Herbert": {
    team: "LAC", backup: "Trey Lance", age: 27, tier: "STARTER",
    style: ["pocket passer", "big arm", "deep ball", "statue in pocket"],
    stats2024: { games: 16, record: "11-5", cmp: 66.4, yds: 3727, td: 26, int: 13, ypa: 7.3, aya: 7.2, rate: 94.1, qbr: 60.6, skPct: 9.54 },
    situation2025: "Harbaugh year 2. Trey Lance as backup adds interesting dimension. Line needs to fix Herbert's 9.54% sack rate — that is the entire development story heading into 2025.",
    strengths: ["Elite arm talent — strongest and most accurate deep ball among starters", "11-5 record — first winning season, Harbaugh effect real", "66.4% completion at solid efficiency"],
    weaknesses: ["9.54% sack rate — worst among starters, holds ball too long", "13 INTs — forces deep throws under pressure", "Processing delay costs drives and games"],
    bettingAngles: ["Herbert OVER in shootout game scripts — arm will produce", "Chargers sack allowed OVER vs elite pass rushes", "Herbert deep TD props OVER vs weak CBs"],
    fantasyProfile: { pprRank: "QB9-13", nonPprRank: "QB9-13", upside: "QB1 ceiling in right matchup — arm talent is genuine", risk: "Sack exposure kills drives, inconsistent floor", note: "If Harbaugh fixes the sack rate in year 2, Herbert jumps to QB5-7 territory." }
  },

  // NFC EAST
  "Dak Prescott": {
    team: "DAL", backup: "Sam Howell", age: 32, tier: "ELITE",
    style: ["pocket passer", "rhythm thrower", "red zone efficiency", "play-action"],
    stats2024: { games: 17, record: "7-9-1", cmp: 67.3, yds: 4552, td: 30, int: 10, ypa: 7.6, aya: 7.8, rate: 99.5, qbr: 70.2, skPct: 4.91 },
    situation2025: "CeeDee Lamb retained. New HC — McCarthy fired. New system creates early-season uncertainty but individual talent is top-6 in the league.",
    strengths: ["QBR 70.2 — top-6 QB by metrics", "4552 yards, 30 TDs on a .500 team", "67.3% completion, 4.91% sack rate", "CeeDee Lamb is top-3 WR in the league"],
    weaknesses: ["7-9-1 record — team context poor", "10 INTs", "New coaching system uncertainty in early 2025"],
    bettingAngles: ["Prescott OVER vs weak secondaries — volume consistent", "Lamb OVER correlates with Dak efficiency", "Fade Cowboys early season while new system installs"],
    fantasyProfile: { pprRank: "QB6-9", nonPprRank: "QB6-9", upside: "QB1 in shootouts", risk: "New coaching system, team dysfunction", note: "Lamb correlation is the best in NFC. Target together." }
  },

  "Jaxson Dart": {
    team: "NYG", backup: "Jameis Winston", age: 22, tier: "UNKNOWN",
    style: ["pocket passer", "accuracy-first", "arm talent", "raw"],
    stats2024: { games: 14, record: "4-8", cmp: 63.7, yds: 2272, td: 15, int: 5, ypa: 6.7, aya: 6.9, rate: 91.7, qbr: 57.5, skPct: 9.36 },
    situation2025: "Giants franchise QB of the future. Malik Nabers WR1 is a genuine elite weapon. Jameis Winston veteran presence as backup. Dart showed promising metrics in limited sample.",
    strengths: ["Only 5 INTs in 12 starts", "QBR 57.5 — solid for young starter", "Malik Nabers connection is elite — best young WR pairing in NFC"],
    weaknesses: ["9.36% sack rate — needs to get ball out faster", "4-8 record, team context poor", "Small sample, full learning curve ahead"],
    bettingAngles: ["Giants UNDER until Dart shows consistency", "Nabers receiving yards OVER — gets targets regardless", "Fade Giants as favorites until proven"],
    fantasyProfile: { pprRank: "QB18-24 in 2025", nonPprRank: "QB18-24", upside: "Potential breakout year 2 with Nabers development", risk: "OL still thin, supporting cast developing", note: "Dynasty asset. Redraft streaming option only." }
  },

  "Jalen Hurts": {
    team: "PHI", backup: "Andy Dalton", age: 27, tier: "STARTER",
    style: ["dual threat", "power runner", "play-action", "option QB"],
    stats2024: { games: 16, record: "11-5", cmp: 64.8, yds: 3224, td: 25, int: 6, ypa: 7.1, aya: 7.6, rate: 98.5, qbr: 55.2, skPct: 6.58 },
    situation2025: "AJ Brown retained. DeVonta Smith back. Elite line intact. Sirianni fired — new HC creates early scheme uncertainty. Rushing floor makes him fantasy-relevant regardless.",
    strengths: ["Only 6 INTs — exceptional ball security", "11-5 record", "Rushing volume (500+ yards annually) creates weekly floor", "AJ Brown + DeVonta Smith premier receiving duo"],
    weaknesses: ["New HC — rushing usage could change", "3224 passing yards — scheme suppresses volume", "QBR 55.2 — system elevates him on passing side"],
    bettingAngles: ["Eagles team total OVER when Hurts is healthy", "Hurts rushing yards OVER — Eagles design runs regardless of HC", "Fade Hurts passing OVER — new HC may run even more"],
    fantasyProfile: { pprRank: "QB3-5", nonPprRank: "QB3-5", upside: "QB1 — rushing floor makes him elite every healthy week", risk: "New HC could alter rushing usage", note: "Lock in the rushing floor. He stays top-5 unless scheme radically changes." }
  },

  "Jayden Daniels": {
    team: "WAS", backup: "Marcus Mariota", age: 25, tier: "STARTER",
    style: ["dual threat", "improviser", "pocket mover", "speed-first"],
    stats2024: { games: 7, record: "2-5", cmp: 60.6, yds: 1262, td: 8, int: 3, ypa: 6.7, aya: 6.8, rate: 88.1, qbr: 44.7, skPct: 8.74 },
    situation2025: "Confirmed Year 2 starter. Terry McLaurin retained. Zach Ertz at TE. Rushing ability (400+ yards projected) makes him a legitimate weekly dual-threat asset even with passing questions.",
    strengths: ["Rushing upside is elite — 60+ yards per game ceiling on ground", "Only 3 INTs in 7 games", "Washington's OL improved significantly in 2024"],
    weaknesses: ["7-game sample — very limited", "60.6% completion needs improvement", "8.74% sack rate — needs to trust checkdowns"],
    bettingAngles: ["Daniels rushing yards OVER — scheme designs runs for him weekly", "Commanders team total OVER when healthy", "Fade Daniels passing OVER — dual-threat scheme caps aerial volume"],
    fantasyProfile: { pprRank: "QB8-12", nonPprRank: "QB8-12", upside: "QB1 ceiling — rushing projection makes him weekly viable", risk: "Small sample, Year 2 regression possible", note: "Rushing projection is the buy. If he throws 3500+ he's a top-5 overall QB." }
  },

  // NFC NORTH
  "Caleb Williams": {
    team: "CHI", backup: "Tyson Bagent", age: 24, tier: "STARTER",
    style: ["improviser", "off-platform", "scrambler", "creative playmaker"],
    stats2024: { games: 17, record: "11-6", cmp: 58.1, yds: 3942, td: 27, int: 7, ypa: 6.9, aya: 7.3, rate: 90.1, qbr: 58.2, skPct: 4.05 },
    situation2025: "Year 2. Bears added Joe Thuney (LG) and Garrett Bradbury (C) — line upgraded. DJ Moore departed to Buffalo — receiving corps thinner. Rome Odunze must step up. Luther Burden drafted.",
    strengths: ["Only 7 INTs — exceptional for an improviser", "27 TDs as a rookie", "Off-platform arm talent is genuinely special", "4.05% sack rate — good pocket awareness"],
    weaknesses: ["58.1% completion — accuracy on standard throws needs work", "DJ Moore gone — receiving corps downgraded", "6.9 Y/A — modest efficiency"],
    bettingAngles: ["Bears UNDER until new weapons establish chemistry with Williams", "Williams rushing yards OVER — scrambles add consistent value", "Fade Bears in must-pass situations — passing ceiling still developing"],
    fantasyProfile: { pprRank: "QB11-15", nonPprRank: "QB11-15", upside: "QB1 potential by year 3 — talent is clear", risk: "Weapon downgrade, consistency development", note: "Buy low. If Bears draft a WR early, his value jumps immediately." }
  },

  "Jared Goff": {
    team: "DET", backup: "Teddy Bridgewater", age: 31, tier: "STARTER",
    style: ["game manager elevated", "rhythm thrower", "short-intermediate", "clean pocket dependent"],
    stats2024: { games: 17, record: "9-8", cmp: 68.0, yds: 4564, td: 34, int: 8, ypa: 7.9, aya: 8.4, rate: 105.5, qbr: 57.3, skPct: 6.17 },
    situation2025: "ARSB, Gibbs, Montgomery, LaPorta all back. System intact. Goff is the best game manager in the league in this specific scheme. No major changes.",
    strengths: ["34 TDs, 8 INTs — elite ratio", "68.0% completion in system", "Elite supporting cast", "Ford Field dome maximizes production"],
    weaknesses: ["QBR 57.3 — scheme-dependent", "Weather sensitivity — outdoor cold games are risky", "9-8 record — team declined from prior year"],
    bettingAngles: ["Goff OVER in dome games — Ford Field conditions are ideal", "Fade Goff in adverse weather road games", "Lions team total OVER at home"],
    fantasyProfile: { pprRank: "QB8-12", nonPprRank: "QB8-12", upside: "QB1 at home with full cast", risk: "Weather-dependent, cast-dependent", note: "Home/dome splits are extreme. Target in favorable matchups only." }
  },

  "Jordan Love": {
    team: "GB", backup: "Desmond Ridder", age: 27, tier: "ELITE",
    style: ["pocket passer", "deep ball", "rhythm thrower", "play-action specialist"],
    stats2024: { games: 15, record: "9-5-1", cmp: 66.3, yds: 3381, td: 23, int: 6, ypa: 7.7, aya: 8.1, rate: 101.2, qbr: 72.7, skPct: 4.57 },
    situation2025: "Young receiver room entering year 3 together — chemistry building. Love's QBR (72.7) was among the best in the league. Contract extension imminent. Legitimate top-5 QB situation.",
    strengths: ["QBR 72.7 — elite", "Only 6 INTs", "AY/A 8.1, 4.57% sack rate", "Young receiver room (Doubs, Watson, Reed) developing"],
    weaknesses: ["Run-balanced scheme suppresses volume ceiling", "3381 yards — below peers in counting stats", "Receivers are young and inconsistent"],
    bettingAngles: ["Love OVER in negative game scripts — throws more when trailing", "Packers team total OVER at Lambeau", "Love TD OVER vs weak secondaries"],
    fantasyProfile: { pprRank: "QB5-8", nonPprRank: "QB5-8", upside: "QB1 ceiling — metrics confirm he's already elite", risk: "Volume ceiling from run-balance", note: "Underrated every preseason. Target in rounds 4-5." }
  },

  "Kyler Murray": {
    team: "MIN", backup: "J.J. McCarthy", age: 28, tier: "STARTER",
    style: ["dual threat", "improviser", "scrambler", "air raid descendant"],
    stats2024: { games: 5, record: "2-3", cmp: 68.3, yds: 962, td: 6, int: 3, ypa: 6.0, aya: 5.9, rate: 88.6, qbr: 47.2, skPct: 9.04 },
    situation2025: "Traded from Arizona to Minnesota. J.J. McCarthy now his backup — significant development setback for McCarthy. Kyler inherits Justin Jefferson and a premier supporting cast. Health is everything.",
    strengths: ["Justin Jefferson is the best WR in football — instant upgrade over Arizona cast", "Kyler's rushing adds dimension Minnesota hasn't had", "Kevin O'Connell's scheme is elite for QBs — see Darnold 2024"],
    weaknesses: ["Injury history — has never played a full 17-game season", "5-game sample in 2024 — tiny", "9.04% sack rate — takes too many hits"],
    bettingAngles: ["Vikings team total OVER — Jefferson + Kyler rushing is a premier offense", "Kyler rushing yards OVER — adds 40-60 yards weekly when healthy", "Fade Vikings when Kyler is even questionable — McCarthy is a significant downgrade"],
    fantasyProfile: { pprRank: "QB6-10 when healthy", nonPprRank: "QB6-10", upside: "Top-5 QB if stays healthy — Jefferson + rushing is elite combination", risk: "Injury — has never played a full season", note: "Highest upside play in the NFC if healthy. Draft with a late handcuff." }
  },

  // NFC SOUTH
  "Michael Penix Jr.": {
    team: "ATL", backup: "Tua Tagovailoa", age: 25, tier: "UNKNOWN",
    style: ["pocket passer", "deep ball", "accuracy-first", "big arm"],
    stats2024: { games: 9, record: "3-6", cmp: 60.1, yds: 1982, td: 9, int: 3, ypa: 7.2, aya: 7.3, rate: 88.5, qbr: 57.9, skPct: 4.50 },
    situation2025: "Kirk Cousins cut. Penix is unquestioned QB1. Tua Tagovailoa signed as backup veteran presence. Bijan Robinson and Drake London are elite weapons. Kyle Pitts at TE if healthy. Strong cast around him.",
    strengths: ["Only 3 INTs in 9 games", "QBR 57.9 in difficult situation", "Drake London top-15 WR, Bijan Robinson top-5 RB", "Kyle Pitts at TE when healthy"],
    weaknesses: ["60.1% completion — needs refinement", "3-6 record with limited sample", "Unproven starter with high expectations"],
    bettingAngles: ["Falcons team total OVER — weapons make this offense viable regardless", "Bijan Robinson OVER rushing yards — carries offense when passing struggles", "Monitor Penix preseason closely before investing"],
    fantasyProfile: { pprRank: "QB14-20 in 2025", nonPprRank: "QB14-20", upside: "Breakout candidate — weapons are elite around him", risk: "Unproven starter", note: "The weapons (Robinson, London, Pitts) make Atlanta's offense viable. Penix is the unknown." }
  },

  "Bryce Young": {
    team: "CAR", backup: "Kenny Pickett", age: 24, tier: "STARTER",
    style: ["pocket passer", "off-platform", "scrambler", "small frame"],
    stats2024: { games: 16, record: "8-8", cmp: 63.6, yds: 3011, td: 23, int: 11, ypa: 6.3, aya: 6.2, rate: 87.8, qbr: 47.6, skPct: 5.35 },
    situation2025: "Tetairoa McMillan drafted WR1 — real weapon addition. Jonathon Brooks RB returning. Carolina genuinely building around him after 8-8 rebound.",
    strengths: ["Real improvement from 2-15 to 8-8", "McMillan adds a legitimate WR1", "23 TDs shows red zone improvement", "Off-platform improvisation is elite for his frame"],
    weaknesses: ["QBR 47.6 — below average", "6.3 Y/A — conservative production", "11 INTs", "Frame (5-10, 204 lbs) — injury risk ongoing"],
    bettingAngles: ["Panthers UNDER until McMillan chemistry establishes", "Young rushing yards OVER — scrambles undervalued", "Fade Panthers vs top-10 defenses"],
    fantasyProfile: { pprRank: "QB18-24", nonPprRank: "QB18-24", upside: "Year 3 leap possible with McMillan — buy low", risk: "Frame, turnover rate, ceiling unproven", note: "McMillan addition is real. If chemistry develops, Young becomes a low-end starter by midseason." }
  },

  "Tyler Shough": {
    team: "NO", backup: "Spencer Rattler", age: 26, tier: "STARTER",
    style: ["pocket passer", "rhythm thrower", "big arm"],
    stats2024: { games: 11, record: "5-4", cmp: 67.6, yds: 2384, td: 10, int: 6, ypa: 7.3, aya: 7.1, rate: 91.3, qbr: 48.8, skPct: 8.66 },
    situation2025: "Wins Saints starting job after solid 2024 finish. Chris Olave WR1 when healthy. Saints rebuilding with two young QBs — both Shough and Rattler are options.",
    strengths: ["67.6% completion — accurate in rhythm", "5-4 record as a starter", "Olave connection when healthy"],
    weaknesses: ["8.66% sack rate — needs better pocket presence", "Limited weapons beyond Olave", "Saints still rebuilding supporting cast"],
    bettingAngles: ["Saints UNDER — offense still developing", "Shough sack OVER vs elite pass rushes", "Fade Saints as road favorites"],
    fantasyProfile: { pprRank: "QB22-28", nonPprRank: "QB22-28", upside: "Streaming option in good matchups", risk: "Limited weapons, developing passer", note: "Olave healthy is the trigger for Saints fantasy relevance." }
  },

  "Baker Mayfield": {
    team: "TB", backup: "Jake Browning", age: 30, tier: "STARTER",
    style: ["game manager", "rhythm thrower", "veteran savvy", "mobile enough"],
    stats2024: { games: 17, record: "8-9", cmp: 63.2, yds: 3693, td: 26, int: 11, ypa: 6.8, aya: 6.8, rate: 90.6, qbr: 61.3, skPct: 6.22 },
    situation2025: "Mike Evans age-32 season. Chris Godwin health is key variable. Liam Coen stays as OC — scheme continuity helps. Career revival is real but ceiling is defined.",
    strengths: ["QBR 61.3 — legitimately solid", "26 TDs, good red zone efficiency", "Evans in red zone is elite trusted connection"],
    weaknesses: ["8-9 record — team declining around him", "11 INTs", "Evans, Godwin aging — weapons eroding"],
    bettingAngles: ["Evans TD OVER when Mayfield starting — reliable red zone target", "Fade Buccaneers when both Evans and Godwin compromised", "Mayfield UNDER in cold outdoor away games"],
    fantasyProfile: { pprRank: "QB14-18", nonPprRank: "QB14-18", upside: "Matchup streamer in shootout scripts", risk: "Supporting cast health, weapons aging", note: "Evans in the red zone is his primary value driver. Correlate their props." }
  },

  // NFC WEST
  "Jacoby Brissett": {
    team: "ARZ", backup: "Gardner Minshew", age: 33, tier: "BELOW_AVG",
    style: ["game manager", "conservative", "veteran caretaker"],
    stats2024: { games: 14, record: "1-11", cmp: 64.9, yds: 3366, td: 23, int: 8, ypa: 6.9, aya: 7.1, rate: 94.1, qbr: 41.2, skPct: 8.14 },
    situation2025: "Kyler Murray traded to Minnesota. Brissett is Arizona's QB1 with Marvin Harrison Jr. and Trey McBride as weapons. Cardinals rebuilding but have real skill talent.",
    strengths: ["23 TDs, 8 INTs on a 1-11 team", "64.9% completion — accurate", "Marvin Harrison Jr. WR1 is elite — real target"],
    weaknesses: ["QBR 41.2 — below average", "1-11 record — brutal team context", "8.14% sack rate — needs better line", "Veteran caretaker, not a franchise solution"],
    bettingAngles: ["Fade Cardinals as favorites until line improves", "Harrison Jr. target share OVER — Brissett leans on his WR1", "Cardinals UNDER — offense rebuilding without Kyler"],
    fantasyProfile: { pprRank: "QB22-28", nonPprRank: "QB22-28", upside: "Harrison Jr. is the real fantasy asset, not Brissett", risk: "Terrible team context", note: "Harrison Jr. in dynasty leagues regardless of QB situation." }
  },

  "Matthew Stafford": {
    team: "LAR", backup: "Stetson Bennett", age: 37, tier: "ELITE",
    style: ["pocket passer", "deep ball", "pre-snap reader", "play-action specialist"],
    stats2024: { games: 17, record: "12-5", cmp: 65.0, yds: 4707, td: 46, int: 8, ypa: 7.9, aya: 8.8, rate: 109.2, qbr: 71.2, skPct: 3.71 },
    situation2025: "Best season of career at age 37 — 46 TDs. Cooper Kupp returning healthy. Puka Nacua development is real. McVay scheme perfectly built for his skillset. Contract situation to monitor.",
    strengths: ["46 TDs in 2024 — led the NFL", "QBR 71.2, AY/A 8.8 — genuinely elite", "3.71% sack rate — lowest among elite QBs", "McVay scheme creates pre-snap clean looks"],
    weaknesses: ["Age 37 — durability is the primary risk every week", "Scheme-dependent", "Kupp health is key supporting cast concern"],
    bettingAngles: ["Rams team total OVER at home — SoFi ideal conditions", "Stafford passing yards OVER — scheme guarantees volume", "Kupp OVER correlates with Stafford efficiency"],
    fantasyProfile: { pprRank: "QB4-7", nonPprRank: "QB4-7", upside: "Another 40+ TD season if healthy — scheme and weapons intact", risk: "Age — one more year of Father Time", note: "Last year to get elite Stafford value. Draft confidently if healthy entering camp." }
  },

  "Brock Purdy": {
    team: "SF", backup: "Mac Jones", age: 26, tier: "STARTER",
    style: ["system quarterback", "rhythm thrower", "short-intermediate", "pre-snap reader"],
    stats2024: { games: 9, record: "7-2", cmp: 69.4, yds: 2167, td: 20, int: 10, ypa: 7.6, aya: 7.5, rate: 100.5, qbr: 72.8, skPct: 3.73 },
    situation2025: "McCaffrey health is the entire 49ers offense. Deebo Samuel and Aiyuk both back. Shanahan system is the great equalizer. Purdy's 9-game QBR (72.8) was highest of any QB in 2024.",
    strengths: ["QBR 72.8 in 9 games — highest of any QB in 2024", "69.4% completion — elite accuracy in Shanahan scheme", "20 TDs in 9 games", "3.73% sack rate — lowest among starters"],
    weaknesses: ["Missed 8 games in 2024 — injury concern", "10 INTs in 9 games — more than ideal", "Shanahan system is the star"],
    bettingAngles: ["49ers team total OVER when McCaffrey healthy", "Purdy OVER when fully healthy cast confirmed", "Fade 49ers when Purdy is questionable — Mac Jones is a significant downgrade"],
    fantasyProfile: { pprRank: "QB7-10 when healthy", nonPprRank: "QB7-10", upside: "Top-5 QB ceiling — 9-game pace projects to 35+ TDs over 17 games", risk: "Injury — missed 8 games in 2024", note: "Draft him, roster Mac Jones as handcuff. Floor in Shanahan system is elite." }
  },

  "Sam Darnold": {
    team: "SEA", backup: "Drew Lock", age: 28, tier: "STARTER",
    style: ["pocket passer", "big arm", "rhythm thrower", "turnover prone under pressure"],
    stats2024: { games: 17, record: "14-3", cmp: 67.7, yds: 4048, td: 25, int: 14, ypa: 8.5, aya: 8.2, rate: 99.1, qbr: 55.6, skPct: 5.36 },
    situation2025: "Left Minnesota (14-3 system) for Seattle. New scheme, new weapons. DK Metcalf and Tyler Lockett are real targets. Regression from 2024 is the base case — the Minnesota system was the star.",
    strengths: ["14-3 record experience", "67.7% completion — best of career in O'Connell system", "DK Metcalf and Lockett are legitimate weapons"],
    weaknesses: ["14 INTs — turnover problem persists", "QBR 55.6 — system product, not franchise-level talent", "Leaving elite Minnesota system for unknown Seattle scheme"],
    bettingAngles: ["Fade Seahawks team total until scheme revealed in camp", "Darnold turnover props — INT is in play every game", "Monitor early season before committing to Seattle props"],
    fantasyProfile: { pprRank: "QB14-18", nonPprRank: "QB14-18", upside: "If Seattle scheme mirrors Minnesota, he can replicate 2024", risk: "High — leaving elite system, INT rate is alarming", note: "2024 was likely his career peak. Buy low on Seattle skill players, not Darnold." }
  },

};

const RBs = {};
const WRs = {};
const TEs = {};
const Coaches = {};

export { QBs, RBs, WRs, TEs, Coaches };
