// ============================================================
// api/data/tennis/wta.js
// Complete WTA Top 100 — original data + rally profiles
// Source: Tennis Abstract Elo (top 10) + Sackmann CSV (11-100)
// March 2026
// ============================================================

const wta = {

  // ─── TOP 10: Hand-built with full Elo suite ───────────────

  "Sabalenka": {
    eloRank: 1, elo: 2247,
    hElo: 2203.9, hEloRank: 1, cElo: 2142.8, cEloRank: 1, gElo: 2000.2, gEloRank: 1,
    peakElo: 2247.1, peakMonth: "2026-03",
    yEloRank: 1, yElo2026: 2199.2,
    record2026: "17-1 — Dominant. Won Indian Wells. #1 in-season form by a wide margin.",
    record: "63-9 (87.5%) last 52 weeks",
    style: "Power baseliner",
    strengths: "Serve power, forehand aggression, hard court dominance",
    serveStats: "Hold 79.9%, Ace 6.6%, DF 3.3% — lowest DF rate among top 5",
    returnStats: "RPW 45.3%, Break rate 38.0% — above tour avg of 35.8%",
    bpStats: "Break point conversion 44.5%, Save rate 66.0% — best save rate in top 5",
    overallStats: "DR 1.22, TPW 54.0%, Tiebreak 92.3% — 24-2 record, historically extraordinary",
    h2h: "vs Swiatek 5-8 · vs Rybakina 8-7 · vs Gauff 6-6 · vs Pegula 9-3 · vs Svitolina 6-1 · vs Anisimova 6-5",
    fullNote: "The most complete player on the WTA tour statistically. 87.5% win rate, elite on both serve and return. Her 38% break rate and 45.3% RPW are elite numbers. Just won Indian Wells and arrives as Miami favorite at 35.4%.",
    miamiNote: "Just won Indian Wells, arrives as Miami favorite at 35.4%. Her stats are elite — more winners than errors, rare for a top player. Hard courts are her domain.",
    surfaceNote: { hard: "Premier hard court force in women's tennis. Won Miami 2023, Indian Wells 2026, Australian Open 2024 and 2025.", clay: "Solid on clay but Swiatek and topspin players can neutralize her power.", grass: "Good on grass — her flat serve is devastating on fast surfaces." },
    rallyProfile: { short: { pct: 36, winPct: 58 }, medium: { pct: 37, winPct: 55 }, long: { pct: 27, winPct: 52 }, profile: "Power baseliner who dominates short and medium rallies. Long-rally win rate (52%) still positive but aggression is designed to avoid extended exchanges.", bettingAngle: "Under games in Sabalenka hard court matches. 92.3% tiebreak rate makes close sets almost automatic." }
  },

  "Rybakina": {
    eloRank: 2, elo: 2163,
    hElo: 2124.3, hEloRank: 2, cElo: 2006.4, cEloRank: 4, gElo: 1915.4, gEloRank: 3,
    peakElo: 2176.7, peakMonth: "2026-02",
    yEloRank: 3, yElo2026: 2124.2,
    record2026: "17-4 — Strong volume and quality. #3 in-season form.",
    record: "61-17 (78.2%) last 52 weeks",
    style: "Power server, flat hitter",
    strengths: "Biggest serve in women's tennis — 10.3% ace rate tops the tour, flat groundstrokes, composure",
    serveStats: "Hold 83.6% — best on tour, Ace 10.3% — highest on tour by far, DF 3.7%",
    returnStats: "RPW 42.7%, Break rate 33.0% — below tour average of 35.8%",
    bpStats: "Break point conversion 45.3%, Save rate 66.7%",
    overallStats: "DR 1.23, TPW 53.7%, Tiebreak 56.0% — near average",
    h2h: "vs Sabalenka 7-8 · vs Swiatek 6-6 · vs Gauff 1-0 · vs Pegula 4-3",
    fullNote: "Best hold rate on tour (83.6%) and highest ace rate (10.3%) by a wide margin. Her serve is her dominant weapon. Return is slightly below tour average — her only relative weakness.",
    miamiNote: "Hard courts suit her flat hitting. Her serve is the most dominant weapon in women's tennis. Always a threat to win big hard court events.",
    surfaceNote: { hard: "Strong on hard — flat serve is devastating.", clay: "Less dominant on clay — topspin players slow her down.", grass: "Her best surface — Wimbledon champion 2022." },
    rallyProfile: { short: { pct: 39, winPct: 61 }, medium: { pct: 36, winPct: 53 }, long: { pct: 25, winPct: 49 }, profile: "WTA's most extreme short-point profile. 10.3% ace rate drives everything. Long-rally win rate (49%) drops below 50%.", bettingAngle: "Ace machine on fast surfaces. On clay vs grinders, long-rally weakness exploitable. Under total games when she's the dominant server." }
  },

  "Swiatek": {
    eloRank: 3, elo: 2110,
    hElo: 2055.5, hEloRank: 4, cElo: 2054.3, cEloRank: 2, gElo: 1950.7, gEloRank: 2,
    peakElo: 2291.0, peakMonth: "2024-07",
    yEloRank: 7, yElo2026: 1957.7,
    record2026: "12-5 — Significantly underperforming vs career level. #7 yElo is her weakest season start in years.",
    record: "56-17 (76.7%) last 52 weeks",
    style: "Heavy topspin baseliner",
    strengths: "Forehand topspin, consistency, mental strength, elite return game",
    serveStats: "Hold 75.1%, Ace 5.6%, DF 5.1% — high",
    returnStats: "RPW 47.3%, Break rate 43.8% — #1 on tour, 22% above tour average",
    bpStats: "Break point conversion 51.2% — best on tour, Save rate 58.5% — below tour average",
    overallStats: "DR 1.23, TPW 54.3%, Tiebreak 75.0%",
    h2h: "vs Sabalenka 8-5 · vs Rybakina 6-6 · vs Gauff 11-5 · vs Pegula 6-5 · vs Anisimova 2-1",
    fullNote: "The best returner in women's tennis — 47.3% RPW and 43.8% break rate are both #1 on tour. Her serve is a relative weakness (75.1% hold, high DF) which is why aggressive servers like Sabalenka and Rybakina can exploit her. She wins matches by dominating return games.",
    miamiNote: "Won Miami 2022. The slower Miami hard courts play closer to her preferred clay conditions. Dangerous but can be exposed by Sabalenka-level aggression.",
    surfaceNote: { hard: "Very strong but not untouchable — Sabalenka has her number on hard.", clay: "Greatest clay player active — Roland Garros champion 4 times.", grass: "Weaker on grass — tends to exit earlier at Wimbledon." },
    rallyProfile: { short: { pct: 25, winPct: 50 }, medium: { pct: 36, winPct: 55 }, long: { pct: 39, winPct: 60 }, profile: "Opposite of Rybakina. Only 25% of points end quickly. Long-rally win rate (60%) is the best on the WTA tour — gets significantly stronger as rallies extend.", bettingAngle: "Total games overs in Swiatek matches almost always live. On clay, back in any format. Vs Rybakina/Sabalenka on hard, they short-circuit her before she can leverage her long-rally edge." }
  },

  "Pegula": {
    eloRank: 4, elo: 2094,
    hElo: 2056.0, hEloRank: 3, cElo: 1909.1, cEloRank: 8, gElo: 1876.9, gEloRank: 5,
    peakElo: 2101.6, peakMonth: "2026-03",
    yEloRank: 2, yElo2026: 2131.5,
    record2026: "16-3 — BEST SEASON OF HER CAREER. #2 in-season form, ahead of Rybakina and Swiatek. Massively underrated coming into Miami.",
    record: "54-21 (72.0%) last 52 weeks",
    style: "Aggressive baseliner",
    strengths: "Forehand power, hard court consistency, low error rate",
    serveStats: "Hold 75.0%, Ace 4.6%, DF 3.0% — second lowest in top 5",
    returnStats: "RPW 45.1%, Break rate 38.1% — above tour average",
    bpStats: "Break point conversion 45.1%, Save rate 59.8%",
    overallStats: "DR 1.17, TPW 53.0%, Tiebreak 47.6% — below average, notable weakness",
    h2h: "vs Sabalenka 3-9 · vs Swiatek 5-6 · vs Rybakina 3-4 · vs Gauff 8-5",
    fullNote: "Consistent and disciplined on both sides. 38.1% break rate and 45.1% RPW are both elite. Very low DF rate (3.0%) means she rarely self-destructs. Her game is not spectacular but it is extremely reliable.",
    miamiNote: "Hard courts are her best surface. Disciplined and consistent. Massively underrated at Miami — best season of her career in 2026.",
    surfaceNote: { hard: "Strong on hard courts — consistently reaches deep at major hard court events.", clay: "Competitive but clay is not her peak surface.", grass: "Below her ranking on grass." },
    rallyProfile: { short: { pct: 31, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Remarkably balanced — wins 53-54% across all three rally bands. Low DF rate (3.0%) means she never self-destructs in any rally length.", bettingAngle: "Tiebreak weakness (47.6%) is the one exploitable angle. yElo #2 in 2026 massively underrated by the market." }
  },

  "Gauff": {
    eloRank: 5, elo: 2074,
    hElo: 2017.0, hEloRank: 6, cElo: 2044.5, cEloRank: 3, gElo: 1842.7, gEloRank: 6,
    peakElo: 2155.7, peakMonth: "2024-01",
    yEloRank: 14, yElo2026: 1909.8,
    record2026: "11-5 — Underperforming relative to career level. #14 yElo is well below expectations.",
    record: "48-17 (73.8%) last 52 weeks",
    style: "Athletic all-court player",
    strengths: "Return game is elite, athleticism, improving serve",
    serveStats: "Hold 65.6% — weakest in top 5, Ace 3.4%, DF 10.4% — highest on tour by far",
    returnStats: "RPW 49.3%, Break rate 48.1% — both #1 on tour among top players",
    bpStats: "Break point conversion 53.1% — #2 on tour, Save rate 51.3% — worst in top 5",
    overallStats: "DR 1.16, TPW 53.3%, Tiebreak 66.7%",
    h2h: "vs Sabalenka 6-6 · vs Swiatek 5-11 · vs Rybakina 0-1 · vs Pegula 5-8",
    fullNote: "The best return stats on tour — 49.3% RPW and 48.1% break rate are remarkable. But her serve is a serious liability: 65.6% hold rate is the weakest in the top 5 and her 10.4% DF rate is the highest on the entire tour. Her matches become return battles.",
    miamiNote: "US hard courts are her best environment. US Open champion 2023. Her return game and athleticism are elite. The lower winners ratio means she needs opponents to make mistakes.",
    surfaceNote: { hard: "Strong on US hard courts — US Open champion.", clay: "Competitive on clay but not dominant.", grass: "Tends to struggle at Wimbledon." },
    rallyProfile: { short: { pct: 27, winPct: 51 }, medium: { pct: 36, winPct: 54 }, long: { pct: 37, winPct: 56 }, profile: "Long-rally specialist — 56% in 9+ shots. Elite return stats drive this. 10.4% DF rate clusters in high-pressure short points.", bettingAngle: "Back in grind conditions. DF rate in clutch moments is where she loses matches she should win." }
  },

  "Mboko": {
    eloRank: 6, elo: 2072,
    hElo: 2037.4, hEloRank: 5, cElo: 1862.4, cEloRank: 10, gElo: 1749.6, gEloRank: 21,
    peakElo: 2082.1, peakMonth: "2026-03",
    yEloRank: 5, yElo2026: 2087.4,
    record2026: "16-5 — Confirming her rise is real. #5 in-season form is extraordinary for a 20-year-old.",
    record: "38-15 (71.7%) last 52 weeks",
    style: "Aggressive young baseliner",
    strengths: "Power, athleticism, rising form",
    serveStats: "Hold 72.6%, Ace 6.3%, DF 7.1% — high DF rate",
    returnStats: "RPW 44.1%, Break rate 38.2% — above tour average",
    bpStats: "Break point conversion 51.8%, Save rate 55.8% — below tour average",
    overallStats: "DR 1.07, TPW 51.5%, Tiebreak 37.5% — significant weakness",
    fullNote: "A 20-year-old Canadian rising fast. 71.7% win rate at Elo rank 6 is impressive. Her 7.1% DF rate is high and will be a limiting factor against elite players. Break rate (38.2%) is above tour average.",
    miamiNote: "A rapidly rising Canadian at 20 years old. Her Elo of 2072 places her firmly in title contention territory. Limited Miami track record but her form in 2026 has been exceptional.",
    surfaceNote: { hard: "Most of her best results on hard courts.", clay: "Still developing on clay.", grass: "Limited grass record." },
    rallyProfile: { short: { pct: 33, winPct: 54 }, medium: { pct: 37, winPct: 52 }, long: { pct: 30, winPct: 50 }, profile: "20-year-old Canadian rising fast. Elo rank 6. 7.1% DF rate and 37.5% tiebreak rate are the current limiting factors.", bettingAngle: "Back on hard courts — 16-5 in 2026 is legitimate. Fade in tiebreaks (37.5% alarming). Trajectory steeply upward." }
  },

  "Anisimova": {
    eloRank: 7, elo: 2050,
    hElo: 2001.5, hEloRank: 8, cElo: 1862.0, cEloRank: 11, gElo: 1885.6, gEloRank: 4,
    peakElo: 2086.9, peakMonth: "2025-11",
    yEloRank: 16, yElo2026: 1903.8,
    record2026: "9-5 — Solid but not elite form in 2026.",
    record: "45-18 (71.4%) last 52 weeks",
    style: "Aggressive flat hitter",
    strengths: "Forehand power, flat groundstrokes, serve",
    serveStats: "Hold 73.1%, Ace 5.3%, DF 5.9% — above average DF rate",
    returnStats: "RPW 45.2%, Break rate 38.4% — above tour average",
    bpStats: "Break point conversion 47.3%, Save rate 59.1% — above average",
    overallStats: "DR 1.13, TPW 52.5%, Tiebreak 58.8%",
    h2h: "vs Sabalenka 6-5 · vs Swiatek 2-1 · vs Gauff 3-4",
    fullNote: "Solid all-round numbers — 38.4% break rate and 45.2% RPW are both above tour average. High DF rate (5.9%) is the risk — she can lose serve unexpectedly. When on she can beat anyone; when off her DF rate derails matches.",
    miamiNote: "Dangerous draw threat with big upside and real downside risk. When she hits her spots she can beat anyone.",
    surfaceNote: { hard: "Best surface — flat hitting works well.", clay: "Less consistent on clay.", grass: "Capable when hitting cleanly." },
    rallyProfile: { short: { pct: 34, winPct: 54 }, medium: { pct: 36, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Aggressive flat hitter with solid all-round numbers. DF rate (5.9%) is the risk.", bettingAngle: "Dangerous draw threat on hard courts. DF props are live. Back when hitting her spots." }
  },

  "Svitolina": {
    eloRank: 8, elo: 2049,
    hElo: 1993.6, hEloRank: 9, cElo: 1955.7, cEloRank: 5, gElo: 1826.0, gEloRank: 7,
    peakElo: 2120.6, peakMonth: "2018-05",
    yEloRank: 4, yElo2026: 2113.1,
    record2026: "19-4 — Most wins on the WTA tour in 2026. #4 in-season form is her best in years. Massively underrated at Miami.",
    record: "46-14 (76.7%) last 52 weeks",
    style: "Counter-punching defensive baseliner",
    strengths: "Consistency, retrieval, mental toughness, low error rate",
    serveStats: "Hold 73.9%, Ace 4.9%, DF 4.3%",
    returnStats: "RPW 46.0%, Break rate 41.3% — well above tour average",
    bpStats: "Break point conversion 52.1% — 3rd on tour, Save rate 60.5% — above average",
    overallStats: "DR 1.14, TPW 53.0%, Tiebreak 66.7%",
    h2h: "vs Sabalenka 1-6 · vs Swiatek 1-4 · vs Rybakina 1-3",
    fullNote: "Excellent 76.7% win rate, elite return game (41.3% break rate, well above 35.8% average). Her RPW of 46.0% is 5th on tour. The most underrated player in the top 10 statistically.",
    miamiNote: "A steady competitor who makes opponents beat her cleanly. Her consistency makes her difficult to dispatch in best-of-three formats.",
    surfaceNote: { hard: "Solid on hard — consistency keeps her competitive.", clay: "Good on clay — works hard for every point.", grass: "Strong on grass — has made deep Wimbledon runs." },
    rallyProfile: { short: { pct: 26, winPct: 50 }, medium: { pct: 36, winPct: 54 }, long: { pct: 38, winPct: 57 }, profile: "Counter-punching defensive baseliner. Long-rally win rate (57%) elite — she gets stronger as matches grind.", bettingAngle: "Best WTA long-match lean. yElo #4 in 2026 (most wins on tour) massively underrated by the market." }
  },

  "Muchova": {
    eloRank: 9, elo: 2041,
    hElo: 2012.0, hEloRank: 7, cElo: 1843.7, cEloRank: 12, gElo: 1767.0, gEloRank: 14,
    peakElo: 2050.8, peakMonth: "2026-03",
    yEloRank: 6, yElo2026: 2070.9,
    record2026: "14-3 — Best form of her career in 2026. #6 yElo with only 3 losses is extraordinary.",
    record: "29-14 (67.4%) last 52 weeks",
    style: "Creative all-court player",
    strengths: "Variety, drop shots, net play, slice backhand",
    serveStats: "Hold 76.6%, Ace 5.0%, DF 2.7% — second lowest DF rate in top 10",
    returnStats: "RPW 42.2%, Break rate 30.3% — below tour average",
    bpStats: "Break point conversion 39.4% — lowest in top 10, Save rate 59.6% — above average",
    overallStats: "DR 1.10, TPW 51.6%, Tiebreak 53.8%",
    h2h: "vs Sabalenka 1-4 · vs Swiatek 2-5 · vs Rybakina 1-2 · vs Gauff 2-2",
    fullNote: "Low DF rate (2.7%) shows she keeps the ball in play well. Creative all-court player who improves as rallies develop. 2026 is the best form of her career.",
    miamiNote: "Creative and unpredictable. Her variety makes her difficult to pattern-play. Best form of her career in 2026.",
    surfaceNote: { hard: "Strong on hard courts — her variety translates well.", clay: "Excellent on clay — drop shots and slice are maximized.", grass: "Strong on grass — her net play and variety shine." },
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Creative all-court player who improves as rallies develop. 2.7% DF rate means she rarely self-destructs.", bettingAngle: "Best form of her career in 2026 (14-3, yElo #6). Back in any condition that allows variety." }
  },

  "Kasatkina": {
    eloRank: 9, elo: 0,
    record: "42-23",
    style: "Aggressive baseline grinder who relies on break points and consistency rather than power, with modest serve metrics offset by strong return game.",
    strengths: "Elite break point conversion at 49.4% with solid hold percentage (53.9%) creates pressure; hard court specialist (26-17 record) with 1.29 dominance ratio; tiebreak player at 58.3% TB win rate.",
    weaknesses: "Low ace rate (2.3%) and first serve percentage (66.5%) limit holding patterns; modest first serve win rate (61%) means secondary ball exposure.",
    serveStats: "Hold 53.9%, Ace 2.3%, DF 7%, 1stIn 66.5%, 1stWon 61%",
    returnStats: "Break 49.4%, TB 58.3%, DR 1.29",
    overallStats: "Hard 26-17 · Clay 8-4 · Grass 8-2",
    fullNote: "Kasatkina's 49.4% break rate is elite-level but she only holds serve 53.9%, creating coin-flip sets. Her 58.3% tiebreak rate combined with modest serve makes over games appealing when facing top servers.",
    hardCourtNote: "Dominant hard court performer (60% win rate) where her baseline control and break point aggression thrive.",
    rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 37, winPct: 54 }, long: { pct: 35, winPct: 55 }, profile: "Smart baseliner who improves as rallies develop. Long-rally edge compounds on slow surfaces.", bettingAngle: "Back in grinding conditions and on clay. Fade on fast hard courts where short points neutralize her game." }
  },

  "Krejcikova": {
    eloRank: 10, elo: 0,
    record: "21-16",
    style: "Aggressive baseline player who relies on break opportunities and tiebreak execution rather than dominant serving.",
    strengths: "Elite break conversion at 44.8% and exceptional tiebreak performance at 81.8% win rate; grass court dominance (9-2 record) shows surface versatility.",
    weaknesses: "Mediocre hard court results (9-9) suggest vulnerability on faster surfaces; below-average ace rate (4.4%) and modest first serve percentage (63.2%).",
    serveStats: "Hold 56.8%, Ace 4.4%, DF 5.5%, 1stIn 63.2%, 1stWon 66.8%",
    returnStats: "Break 44.8%, TB 81.8%, DR 1.14",
    overallStats: "Hard 9-9 · Clay 3-5 · Grass 9-2",
    fullNote: "Krejcikova's 44.8% break rate is WTA-elite and drives profitable tiebreak angles (81.8% TB%) on clay and grass. Hard courts neutralize this edge.",
    hardCourtNote: "Hard court record is precisely .500 (9-9), indicating this surface plays to her weaknesses.",
    rallyProfile: { short: { pct: 30, winPct: 51 }, medium: { pct: 36, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Grass and clay specialist. 44.8% break rate and 81.8% tiebreak rate exceptional. Hard court weakness (9-9) is real.", bettingAngle: "On grass one of the best WTA value plays. Tiebreak rate (81.8%) makes her automatic in close sets on preferred surfaces." }
  },

  // ─── RANKS 11-100: Auto-generated from Sackmann CSV ──────

  "Danielle Collins": {
    eloRank: 11, elo: 0, record: "38-17",
    style: "Aggressive baseline player leveraging high break percentage and tiebreak success to dominate extended rallies.",
    strengths: "Elite 48.7% break rate and 85.7% tiebreak conversion; strong 70% first serve win rate provides dominant hold patterns on fast courts.",
    weaknesses: "Below-average ace production (5.3%) limits free points; inconsistent first serve percentage (57.9%).",
    serveStats: "Hold 61.5%, Ace 5.3%, DF 6.6%, 1stIn 57.9%, 1stWon 70%",
    returnStats: "Break 48.7%, TB 85.7%, DR 1.38",
    overallStats: "Hard 16-11 · Clay 19-5 · Grass 3-1",
    fullNote: "Collins' 48.7% break rate is elite territory. Her 85.7% tiebreak rate suggests heavy action in close sets. Hard court specialization (16-11) with clay dominance (19-5).",
    hardCourtNote: "Dominates hard courts with 16-11 record, converting break opportunities at elite rates.",
    rallyProfile: { short: { pct: 34, winPct: 55 }, medium: { pct: 37, winPct: 55 }, long: { pct: 29, winPct: 53 }, profile: "Aggressive baseliner with elite return game. Wins across all rally lengths.", bettingAngle: "Live in any rally condition. Tiebreak dominance (85.7%) makes her one of the best bets in close sets." }
  },

  "Paula Badosa": {
    eloRank: 12, elo: 0, record: "37-19",
    style: "Aggressive baseline player with solid serve and excellent break point conversion who dominates on hard courts.",
    strengths: "48.5% break rate (elite level), 69.3% first serve win rate, 1.32 double break ratio.",
    weaknesses: "Below-average ace rate at 6.5% limits easy holds; 7.6% double fault rate creates break opportunities.",
    serveStats: "Hold 64.1%, Ace 6.5%, DF 7.6%, 1stIn 57.2%, 1stWon 69.3%",
    returnStats: "Break 48.5%, TB 57.1%, DR 1.32",
    overallStats: "Hard 26-12 · Clay 6-5 · Grass 5-2",
    fullNote: "Sharp angle: target her 48.5% break rate in prop bets. Her 1.32 DR exploitable in double break markets. On hard courts where she thrives, first-set winner props offer +EV.",
    hardCourtNote: "Dominates hard courts with 26-12 record (68.4% win rate).",
    rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Hard court specialist with balanced rally profile. All three bands positive.", bettingAngle: "Solid lean on hard courts in best-of-3. No glaring rally weakness." }
  },

  "Diana Shnaider": {
    eloRank: 13, elo: 0, record: "43-21",
    style: "Aggressive baseline player with above-average serve consistency and strong tiebreak execution.",
    strengths: "Elite tiebreak conversion (77.8%) and solid first-serve win rate (64.5%); hard court dominance (26-13 record); break point conversion (48%) above tour average.",
    weaknesses: "Low ace rate (2.9%) and modest hold percentage (54.9%); double fault rate (3.7%) creeps higher under pressure.",
    serveStats: "Hold 54.9%, Ace 2.9%, DF 3.7%, 1stIn 64.2%, 1stWon 64.5%",
    returnStats: "Break 48%, TB 77.8%, DR 1.34",
    overallStats: "Hard 26-13 · Clay 8-5 · Grass 9-3",
    fullNote: "Shnaider's 77.8% tiebreak rate is sharp leverage in extended matches. Back her in three-set formats where her break conversion (48%) and hold weakness (54.9%) create volatile scorelines.",
    hardCourtNote: "Hard court record of 26-13 (67% win rate) demonstrates this is her most profitable surface.",
    rallyProfile: { short: { pct: 32, winPct: 53 }, medium: { pct: 37, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Aggressive baseliner with elite tiebreak rate (77.8%). All rally bands positive.", bettingAngle: "Back in tiebreak-heavy matchups — 77.8% tiebreak rate is elite. Solid on hard courts in best-of-3." }
  },

  "Anna Kalinskaya": {
    eloRank: 14, elo: 0, record: "33-19",
    style: "Aggressive baseliner who relies on consistent first-serve placement and break point conversion rather than overpowering shot-making.",
    strengths: "Exceptional break point conversion at 42.7% (well above WTA average); dominant on hard courts (65% win rate); reliable hold percentage at 58.7%.",
    weaknesses: "Low ace percentage (2.5%) limits offensive serve weapons; clay court struggles (33% win rate); tiebreak execution at 50% is mediocre.",
    serveStats: "Hold 58.7%, Ace 2.5%, DF 5.2%, 1stIn 67%, 1stWon 64%",
    returnStats: "Break 42.7%, TB 50%, DR 1.27",
    overallStats: "Hard 24-13 · Clay 2-4 · Grass 7-2",
    fullNote: "Kalinskaya's 42.7% break rate is elite but her 58.7% hold is merely average. On hard courts her elevated break percentage compensates for weak ace generation.",
    hardCourtNote: "Thrives on hard courts with 24-13 record, leveraging predictable court conditions for her break-heavy game.",
    rallyProfile: { short: { pct: 31, winPct: 52 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Return-heavy player with medium-to-long rally preference. 42.7% break rate is elite.", bettingAngle: "Back vs serve-first players who can't sustain rallies. Hard court dominance (24-13) reliable." }
  },

  "Jelena Ostapenko": {
    eloRank: 15, elo: 0, record: "29-18",
    style: "Aggressive baseline striker who relies on powerful groundstrokes and high first-serve velocity.",
    strengths: "Elite break point conversion at 47.4% with strong hard court form (18-10 record); ace production at 5.7% supports aggressive service strategy.",
    weaknesses: "Double fault rate of 7.5% can be costly; modest 58.4% first serve percentage; TB% of 70 suggests vulnerability in close sets.",
    serveStats: "Hold 56.7%, Ace 5.7%, DF 7.5%, 1stIn 58.4%, 1stWon 65.7%",
    returnStats: "Break 47.4%, TB 70%, DR 1.23",
    overallStats: "Hard 18-10 · Clay 6-5 · Grass 5-3",
    fullNote: "Ostapenko's 47.4% break conversion is elite-tier for WTA. Exploit her 7.5% DF% in tiebreaks and pressure sets. Strong hard court specialist.",
    hardCourtNote: "Hard courts showcase her best results with 18-10 record.",
    rallyProfile: { short: { pct: 40, winPct: 58 }, medium: { pct: 35, winPct: 51 }, long: { pct: 25, winPct: 43 }, profile: "Feast-or-famine flat hitter. Long-rally rate (43%) worst in WTA top 20. 7.5% DF spikes in pressure rallies.", bettingAngle: "Vs clay grinders is terrible for her. Against big servers on fast hard she can explode. DF props almost always live." }
  },

  "Mirra Andreeva": {
    eloRank: 16, elo: 0, record: "34-16",
    style: "Aggressive baseline player with above-average break conversion who relies on consistency over power.",
    strengths: "51.6% break rate significantly outperforms tour average; 64.2% first-serve points won shows solid hold efficiency.",
    weaknesses: "Low ace rate (4.1%) and modest first-serve percentage (64.1%) limit offensive weapons; grass court struggles (0-2).",
    serveStats: "Hold 51.3%, Ace 4.1%, DF 3.9%, 1stIn 64.1%, 1stWon 64.2%",
    returnStats: "Break 51.6%, TB 100%, DR 1.36",
    overallStats: "Hard 18-9 · Clay 16-5 · Grass 0-2",
    fullNote: "Andreeva's elite 51.6% break rate combined with 64.2% first-serve hold creates favorable break-point asymmetry. Sharp edge in break-point props and matchups against serve-dependent opponents.",
    hardCourtNote: "Dominates hard courts (18-9 record, 66.7%).",
    rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 36, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Young baseliner whose long-rally game (55%) is already her primary weapon. 51.6% break rate elite.", bettingAngle: "Back in slow conditions and long matches. Profile improves with age. Fade on fast courts where serve is a liability." }
  },

  "Beatriz Haddad Maia": {
    eloRank: 17, elo: 0, record: "38-27",
    style: "Aggressive baseline player who relies on break point conversion and tiebreak proficiency rather than dominant serving.",
    strengths: "Elite break conversion at 47.3% with strong tiebreak performance at 72.7%; solid first serve win rate of 64.6%.",
    weaknesses: "Inconsistent hold percentage at 58.6% leaves serve vulnerable; low ace rate of 3.1%; grass court struggles.",
    serveStats: "Hold 58.6%, Ace 3.1%, DF 4.8%, 1stIn 65.5%, 1stWon 64.6%",
    returnStats: "Break 47.3%, TB 72.7%, DR 1.17",
    overallStats: "Hard 25-17 · Clay 7-6 · Grass 3-3",
    fullNote: "Sharp edge in break point situations (47.3%) makes her valuable in tighter sets and tiebreaks (72.7% conversion).",
    hardCourtNote: "Dominates hard courts (25-17 record) as her preferred surface.",
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 55 }, profile: "Aggressive clay baseliner who improves in longer rallies. 47.3% break rate and 72.7% tiebreak rate strong.", bettingAngle: "Reliable lean on clay in grinding matches. Fade on fast surfaces where short-point liability is exposed." }
  },

  "Marta Kostyuk": {
    eloRank: 18, elo: 0, record: "36-20",
    style: "Aggressive baseline player with strong return game who dictates points through powerful groundstrokes.",
    strengths: "Elite break percentage at 46.3%; hard court specialist with 68.4% win rate (26-12); solid first serve conversion at 64.1%.",
    weaknesses: "Low ace percentage (3.9%) and moderate hold percentage (54.8%); high double fault rate at 8.9%.",
    serveStats: "Hold 54.8%, Ace 3.9%, DF 8.9%, 1stIn 59%, 1stWon 64.1%",
    returnStats: "Break 46.3%, TB 71.4%, DR 1.29",
    overallStats: "Hard 26-12 · Clay 8-5 · Grass 2-3",
    fullNote: "Kostyuk's 46.3% break rate is elite-level and suggests aggressive returns will generate consistent break chances. On hard courts her 68% conversion rate paired with poor hold% (54.8%) sets up profitable break games props.",
    hardCourtNote: "Dominates hard courts with nearly 70% win rate.",
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Return-heavy baseliner with elite break conversion (46.3%). Hard court dominant.", bettingAngle: "Back on hard courts — 26-12 record and DR 1.29 are legitimate. Tiebreak rate (71.4%) is an edge." }
  },

  "Donna Vekic": {
    eloRank: 19, elo: 0, record: "33-20",
    style: "Aggressive baseline player who relies on court positioning and consistency rather than power.",
    strengths: "Excellent grass court record (11-4, 73% win rate) with strong serving fundamentals (71% first serve points won); solid hold percentage (54.4%).",
    weaknesses: "Below-average break point conversion (43.4%) limits offensive opportunities on return; moderate first serve percentage (56.9%).",
    serveStats: "Hold 54.4%, Ace 6.1%, DF 6.3%, 1stIn 56.9%, 1stWon 71%",
    returnStats: "Break 43.4%, TB 42.9%, DR 1.25",
    overallStats: "Hard 14-11 · Clay 8-5 · Grass 11-4",
    fullNote: "Vekic's 71% first serve points won masks a 56.9% first serve percentage that forces reliance on hold consistency (54.4%) rather than dominant service games.",
    hardCourtNote: "Hard court represents her most significant playing surface with 14-11 record.",
    rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Consistent all-court player with no obvious rally weakness. Grass is her best surface.", bettingAngle: "Underrated on grass — 11-4 record is legitimate. Back when conditions extend medium-length rallies." }
  },

  "Victoria Azarenka": {
    eloRank: 20, elo: 0, record: "30-15",
    style: "Aggressive baseline player who leverages above-average break conversion (45.7%) to create pressure.",
    strengths: "Exceptional hard court win-rate (66.7%); elite break percentage (45.7%); consistent hold percentage (60.3%).",
    weaknesses: "Weak ace generation (3.7%) and elevated double fault rate (5.4%); tiebreak conversion (55.6%).",
    serveStats: "Hold 60.3%, Ace 3.7%, DF 5.4%, 1stIn 64.9%, 1stWon 66.4%",
    returnStats: "Break 45.7%, TB 55.6%, DR 1.33",
    overallStats: "Hard 20-10 · Clay 7-4 · Grass 3-1",
    fullNote: "Azarenka's 45.7% break rate is a sharp edge for return-game-dependent props. Target break point overs and alternate set spreads on hard courts where her 66.7% win rate carries value.",
    hardCourtNote: "Hard court dominance shows 20-10 record with 66.7% conversion rate.",
    rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 36, winPct: 54 }, long: { pct: 36, winPct: 56 }, profile: "Classic aggressive baseliner who gets stronger as rallies extend. 45.7% break rate elite.", bettingAngle: "Back in grinding hard court matches. Her break rate and long-rally profile both elite for her ranking tier." }
  },

  "Madison Keys": {
    eloRank: 21, elo: 0, record: "25-12",
    style: "Aggressive baseline player who leverages elite serve power and high first-serve win rate.",
    strengths: "Exceptional first-serve dominance (65.8% 1stWon) and break conversion (43.6%); clay court specialist (13-4 record); tiebreak proficiency (72.7%).",
    weaknesses: "Double fault rate (3.9%) and hold percentage (60.2%) suggest occasional serve inconsistency; modest 5.4 ace rate.",
    serveStats: "Hold 60.2%, Ace 5.4%, DF 3.9%, 1stIn 69%, 1stWon 65.8%",
    returnStats: "Break 43.6%, TB 72.7%, DR 1.35",
    overallStats: "Hard 7-6 · Clay 13-4 · Grass 5-2",
    fullNote: "Keys' 43.6% break rate paired with 1.35 double break ratio creates edge in set-building. Her clay record (13-4) is a genuine surprise.",
    hardCourtNote: "7-6 hard court record trails her clay success, indicating hard courts require more margin for error.",
    rallyProfile: { short: { pct: 37, winPct: 57 }, medium: { pct: 36, winPct: 54 }, long: { pct: 27, winPct: 50 }, profile: "Power hitter with short-point lean. DR 1.35 strong overall. Clay record (13-4) a genuine surprise.", bettingAngle: "Dangerous in best-of-3 on any surface in current form. Over aces and under total games on fast courts." }
  },

  "Emma Navarro": {
    eloRank: 22, elo: 0, record: "45-22",
    style: "Aggressive baseline player with strong return game.",
    strengths: "47.2% break rate significantly outperforms tour average; 65.7% first serve consistency; 68% hard court win rate.",
    weaknesses: "Low ace rate (1.9%); 44.4% tiebreak rate suggests vulnerability in close sets; modest 55.1% hold percentage.",
    serveStats: "Hold 55.1%, Ace 1.9%, DF 3.1%, 1stIn 65.7%, 1stWon 63.7%",
    returnStats: "Break 47.2%, TB 44.4%, DR 1.35",
    overallStats: "Hard 30-13 · Clay 8-6 · Grass 7-3",
    fullNote: "Sharp edge lies in break point scenarios. Her 47.2% break rate combined with 65.7% first serve creates exploitable return leverage spots. Hard court 70% win rate.",
    hardCourtNote: "Navarro owns 30-13 hard court record with elevated break conversion.",
    rallyProfile: { short: { pct: 30, winPct: 52 }, medium: { pct: 38, winPct: 53 }, long: { pct: 32, winPct: 53 }, profile: "Emerging American baseliner with balanced rally profile. All three bands positive.", bettingAngle: "Live underdog on any hard court in best-of-3. yElo trend still moving upward — buy low." }
  },

  "Liudmila Samsonova": {
    eloRank: 27, elo: 0, record: "27-23",
    style: "Aggressive baseline player with heavy groundstrokes who relies on break opportunities.",
    strengths: "Strong break conversion at 45.7% and excellent grass court record (8-3, 73%); solid first serve winners at 70%.",
    weaknesses: "Below-average first serve percentage (50.9%) and inconsistent hold rate (56.5%); limited ace generation (6.8%).",
    serveStats: "Hold 56.5%, Ace 6.8%, DF 7.2%, 1stIn 50.9%, 1stWon 70%",
    returnStats: "Break 45.7%, TB 50%, DR 1.08",
    overallStats: "Hard 13-15 · Clay 6-5 · Grass 8-3",
    fullNote: "Samsonova's 45.7% break rate is her true weapon. Her hard court woes make clay/grass matchups more favorable for backing her.",
    hardCourtNote: "Struggles on hard courts with 13-15 record despite it being her primary surface.",
    rallyProfile: { short: { pct: 35, winPct: 54 }, medium: { pct: 37, winPct: 53 }, long: { pct: 28, winPct: 50 }, profile: "Aggressive flat hitter. Short and medium rallies her domain. Long-rally rate (50%) coin-flip.", bettingAngle: "Back on fast hard in best-of-3. Fade in long grinding matches. DF props often live." }
  },

  "Ekaterina Alexandrova": {
    eloRank: 28, elo: 0, record: "26-24",
    style: "Aggressive baseline player who relies on heavy groundstrokes and high-risk tennis.",
    strengths: "Exceptional break point conversion (43.6%) and solid hard court record (20-14) with above-average rally consistency (1.04 DR).",
    weaknesses: "Weak serve metrics (7.5% aces, 59.3% 1st serve %) and alarming clay court struggles (1-7); tiebreak win rate (42.9%) below average.",
    serveStats: "Hold 58.4%, Ace 7.5%, DF 7.4%, 1stIn 59.3%, 1stWon 69.6%",
    returnStats: "Break 43.6%, TB 42.9%, DR 1.04",
    overallStats: "Hard 20-14 · Clay 1-7 · Grass 5-3",
    fullNote: "Alexandrova's 43.6% break percentage is elite-tier, making her dangerous in longer baseline rallies but vulnerable to serve-heavy opponents.",
    hardCourtNote: "Hard court is her best surface (58.8% win rate).",
    rallyProfile: { short: { pct: 32, winPct: 52 }, medium: { pct: 37, winPct: 53 }, long: { pct: 31, winPct: 51 }, profile: "Aggressive baseliner with 43.6% break rate. Clay record (1-7) alarming. Tiebreak rate (42.9%) below average.", bettingAngle: "Fade completely on clay. Tiebreak weakness (42.9%) means fade in close sets on any surface." }
  },

  "Yulia Putintseva": {
    eloRank: 29, elo: 0, record: "35-19",
    style: "Aggressive baseline player who relies on break opportunities and consistency.",
    strengths: "Elite break conversion at 51.5% and exceptional grass court form (88.9%); combined with solid first serve percentage (70%) and hold rate (58.2%).",
    weaknesses: "Low ace production (2.2%) and high double fault rate (2.3%); modest 1st serve win rate (61.8%).",
    serveStats: "Hold 58.2%, Ace 2.2%, DF 2.3%, 1stIn 70%, 1stWon 61.8%",
    returnStats: "Break 51.5%, TB 50%, DR 1.3",
    overallStats: "Hard 19-12 · Clay 7-4 · Grass 8-1",
    fullNote: "Putintseva's 51.5% break rate is her primary weapon. Grass dominance (8-1) is a significant outlier.",
    hardCourtNote: "Strong hard court record (19-12) with balanced offense-defense metrics.",
    rallyProfile: { short: { pct: 27, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Return-heavy grinder. 51.5% break rate one of the best on tour. Grass record (8-1) is the hidden gem.", bettingAngle: "Back on grass — 88.9% win rate is extraordinary. Long-rally profile translates because retrieval overwhelms opponents." }
  },

  "Anastasia Pavlyuchenkova": {
    eloRank: 30, elo: 0, record: "25-20",
    style: "Aggressive baseline player who relies on consistent first-serve delivery and break point conversion.",
    strengths: "Solid 66.7% first-serve win rate and 46.4% break conversion rate; thrives on hard courts with 21-13 record.",
    weaknesses: "Double fault rate of 5.6% in high-pressure moments; grass court performance poor at 1-2.",
    serveStats: "Hold 57.3%, Ace 4.6%, DF 5.6%, 1stIn 61.8%, 1stWon 66.7%",
    returnStats: "Break 46.4%, TB 71.4%, DR 1.11",
    overallStats: "Hard 21-13 · Clay 3-5 · Grass 1-2",
    fullNote: "Sharp edge targeting her 66.7% first-serve win rate. The 46.4% break conversion is solid; fade her in tight clay/grass matchups where records expose surface limitations.",
    hardCourtNote: "Dominates hard courts with 62% win rate (21-13).",
    rallyProfile: { short: { pct: 31, winPct: 52 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Experienced hard court baseliner with medium-rally preference. All rally bands positive.", bettingAngle: "Steady hard court lean. No dramatic rally weakness." }
  },

  "Leylah Fernandez": {
    eloRank: 31, elo: 0, record: "31-25",
    style: "Aggressive baseline player who relies on pace and movement rather than serves, forcing errors through relentless shot-making.",
    strengths: "Elite break point conversion at 44.8%; exceptional grass court record (7-3, 70%); solid first serve win rate of 64.6%.",
    weaknesses: "Weak ace production (3.3%) and high double fault rate (6%); 57.3% hold percentage indicates vulnerability.",
    serveStats: "Hold 57.3%, Ace 3.3%, DF 6%, 1stIn 64.4%, 1stWon 64.6%",
    returnStats: "Break 44.8%, TB 63.6%, DR 1.11",
    overallStats: "Hard 18-16 · Clay 6-6 · Grass 7-3",
    fullNote: "Fernandez is a break-heavy player with 44.8% conversion. Her 63.6% tiebreak win rate creates value in over 2.5 sets lines.",
    hardCourtNote: "Slightly underwater on hard courts (18-16) where serve limitations are most exposed.",
    rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 35, winPct: 54 }, profile: "Aggressive counter-puncher with strong grass credentials. Break rate (44.8%) is her weapon.", bettingAngle: "Back on grass — 7-3 record is legit. Fade as a favorite on hard courts where her serve is exposed." }
  },

  "Elise Mertens": {
    eloRank: 34, elo: 0, record: "27-25",
    style: "Defensive baseline player with modest serve who relies on return games and break point conversion.",
    strengths: "Strong break point conversion at 45.2% well above tour average; solid first serve win rate of 67.5%; consistent hard court performer (18-16 record).",
    weaknesses: "Below-average hold percentage at 53.8%; low ace rate of 5.6%; first serve percentage of 55.2%.",
    serveStats: "Hold 53.8%, Ace 5.6%, DF 7.6%, 1stIn 55.2%, 1stWon 67.5%",
    returnStats: "Break 45.2%, TB 25%, DR 1.04",
    overallStats: "Hard 18-16 · Clay 6-5 · Grass 3-4",
    fullNote: "Sharp angle targets Mertens in break point-heavy matchups against players with low hold percentages. Monitor first serve percentage — matches below 54% suggest elevated break opportunities.",
    hardCourtNote: "Mertens performs best on hard courts (52.9% win rate).",
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Defensive baseliner with strong break conversion (45.2%) and weak hold rate (53.8%). DR 1.04 — thin margins.", bettingAngle: "Target break point props when she has a return-game mismatch. Fade in tiebreaks (25%)." }
  },

  "Anastasia Potapova": {
    eloRank: 35, elo: 0, record: "26-22",
    style: "Aggressive baseline player who relies on consistency and break point conversion.",
    strengths: "Strong break point conversion at 43.7%; solid hold rate of 58.9%; hard court specialist with 17-14 record.",
    weaknesses: "Low ace percentage (3.1%) and modest first serve percentage (55.6%); tiebreak win rate of 14.3% suggests vulnerability in tight sets.",
    serveStats: "Hold 58.9%, Ace 3.1%, DF 6.5%, 1stIn 55.6%, 1stWon 65.3%",
    returnStats: "Break 43.7%, TB 14.3%, DR 1.08",
    overallStats: "Hard 17-14 · Clay 6-5 · Grass 3-3",
    fullNote: "Sharp edge exists in backing Potapova on hard courts where she maintains 55% win rate. Her 43.7% break conversion rate is a critical prop lever.",
    hardCourtNote: "Hard court specialist with 17-14 record showing court-specific strength.",
    rallyProfile: { short: { pct: 31, winPct: 52 }, medium: { pct: 37, winPct: 53 }, long: { pct: 32, winPct: 52 }, profile: "Consistent aggressive baseliner with 43.7% break rate. Tiebreak rate (14.3%) extremely low.", bettingAngle: "Strong fade in tiebreaks — 14.3% is among the worst on tour." }
  },

  "Petra Kvitova": {
    eloRank: 36, elo: 0, record: "28-18",
    style: "Left-handed power server and aggressive flat hitter.",
    strengths: "Elite grass court performer; powerful left-handed serve; flat groundstrokes are devastating on fast surfaces.",
    weaknesses: "Long-rally game declining with age; clay court record much weaker; physicality is a limiting factor in long matches.",
    serveStats: "Hold 62.4%, Ace 7.8%, DF 5.1%, 1stIn 57.3%, 1stWon 71.2%",
    returnStats: "Break 42.1%, TB 58.3%, DR 1.15",
    overallStats: "Hard 15-10 · Clay 5-5 · Grass 8-3",
    fullNote: "Kvitova remains one of the most dangerous players on grass and fast hard courts. Her left-handed serve and flat hitting are maximized on fast surfaces. Physical decline limits her ceiling in long physical matches.",
    hardCourtNote: "15-10 hard court record reflects a player who can still produce excellent results on fast hard.",
    rallyProfile: { short: { pct: 38, winPct: 57 }, medium: { pct: 35, winPct: 52 }, long: { pct: 27, winPct: 47 }, profile: "Left-handed power server whose short-point dominance is built on flat serve and forehand. Grass is her best surface.", bettingAngle: "Still dangerous on grass. Fade on clay and in long physical matches." }
  },

  "Barbora Vondrousova": {
    eloRank: 37, elo: 0, record: "31-22",
    style: "Creative left-handed baseliner who thrives in extended exchanges.",
    strengths: "Variety and slice backhand create discomfort; long-rally win rate is strong; Wimbledon champion 2023.",
    weaknesses: "Serve is not a weapon; short-point profile modest; fast hard courts reduce her game's effectiveness.",
    serveStats: "Hold 55.8%, Ace 3.2%, DF 4.1%, 1stIn 63.4%, 1stWon 62.8%",
    returnStats: "Break 43.9%, TB 52.4%, DR 1.09",
    overallStats: "Hard 15-14 · Clay 10-6 · Grass 6-2",
    fullNote: "Vondrousova is a creative variety player whose game is most dangerous on clay and grass where her variety creates maximum discomfort. Hard court results are moderate.",
    hardCourtNote: "Hard courts are her least comfortable surface at 15-14.",
    rallyProfile: { short: { pct: 27, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Creative left-handed baseliner. Long-rally win rate (55%) is her strength. Wimbledon champion 2023.", bettingAngle: "Back in slow conditions and grinding matches. Fade on fast hard courts where short points neutralize her game." }
  },

  "Sorana Cirstea": {
    eloRank: 38, elo: 0, record: "30-24",
    style: "Aggressive baseliner with consistent first-serve execution.",
    strengths: "Solid break point conversion (42.8%); consistent hard court performer; experienced veteran with strong clutch instincts.",
    weaknesses: "Hold percentage (57.3%) is below average; modest ace rate limits easy free points.",
    serveStats: "Hold 57.3%, Ace 4.8%, DF 5.2%, 1stIn 62.1%, 1stWon 65.9%",
    returnStats: "Break 42.8%, TB 51.2%, DR 1.06",
    overallStats: "Hard 18-14 · Clay 8-7 · Grass 4-3",
    fullNote: "Cirstea is a solid baseliner with no dominant rally length. All bands hover near 51-53%. Built on consistency. Best as a dangerous floater against higher-seeded opponents.",
    hardCourtNote: "Hard courts are her most comfortable surface.",
    rallyProfile: { short: { pct: 33, winPct: 52 }, medium: { pct: 37, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Solid baseliner with no dominant rally length. All bands hover near 51-53%.", bettingAngle: "Reliable underdog value play in best-of-3. No catastrophic rally weakness." }
  },

  "Linda Fruhvirtova": {
    eloRank: 40, elo: 0, record: "24-20",
    style: "Young Czech baseliner with grinder profile.",
    strengths: "Strong return game; consistent baseline pressure; clay court pedigree.",
    weaknesses: "Serve not yet a weapon; still developing against elite opponents.",
    serveStats: "Hold 54.2%, Ace 3.1%, DF 4.8%, 1stIn 63.7%, 1stWon 62.1%",
    returnStats: "Break 43.2%, TB 48.6%, DR 1.03",
    overallStats: "Hard 12-12 · Clay 9-6 · Grass 3-2",
    fullNote: "Fruhvirtova is a developing grinder whose long-rally game is her primary asset. Still raw at the elite level but the baseline structure is positive.",
    hardCourtNote: "Hard courts are her most played surface with 12-12 record.",
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Young Czech baseliner with grinder profile. Long-rally game her primary development area.", bettingAngle: "Fade vs elite opponents. Back against similarly-ranked players in slow conditions." }
  },

  "Marie Bouzkova": {
    eloRank: 44, elo: 0, record: "26-22",
    style: "Defensive baseline player who relies on consistency and return of serve.",
    strengths: "Strong break point conversion at 44.5%; solid first serve win rate of 64.4%; maintains respectable hold percentage of 54.2%.",
    weaknesses: "Low ace rate of 3.4%; tiebreak win rate of 36.4% suggests vulnerability in close sets.",
    serveStats: "Hold 54.2%, Ace 3.4%, DF 4%, 1stIn 62.5%, 1stWon 64.4%",
    returnStats: "Break 44.5%, TB 36.4%, DR 1.08",
    overallStats: "Hard 18-17 · Clay 6-2 · Grass 2-3",
    fullNote: "Bouzkova's 44.5% break conversion is well above WTA average. Her 36.4% TB% suggests backing under on tiebreak props.",
    hardCourtNote: "Slight advantage on hard courts with 18-17 record.",
    rallyProfile: { short: { pct: 29, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Defensive baseliner with strong break rate (44.5%) and weak tiebreak rate (36.4%).", bettingAngle: "Fade in tiebreaks — 36.4% is well below average. Back at big odds in clay conditions." }
  },

  "Katerina Siniakova": {
    eloRank: 45, elo: 0, record: "26-26",
    style: "Defensive baseline player relying on consistency and break point conversion.",
    strengths: "Strong break point conversion at 47.4%; excellent grass court record (5-3).",
    weaknesses: "Extremely low ace rate (2.5%) and weak hold percentage (50.1%); even split record indicates matchup-dependent performance.",
    serveStats: "Hold 50.1%, Ace 2.5%, DF 7.2%, 1stIn 62%, 1stWon 62.3%",
    returnStats: "Break 47.4%, TB 44.4%, DR 1",
    overallStats: "Hard 17-17 · Clay 4-6 · Grass 5-3",
    fullNote: "Siniakova's 47.4% break conversion is elite-level but negated by poor service hold (50.1%), creating coin-flip service game dynamics.",
    hardCourtNote: "Hard court is her primary surface but dead-even 17-17 record shows she struggles against ranked opponents.",
    rallyProfile: { short: { pct: 28, winPct: 50 }, medium: { pct: 36, winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Defensive baseliner with strong break conversion (47.4%) and poor hold rate (50.1%). Grass record (5-3) hidden strength.", bettingAngle: "Target opponent break props vs Siniakova — 50.1% hold rate is exploitable." }
  },

  "Rebecca Sramkova": {
    eloRank: 46, elo: 0, record: "24-10",
    style: "Aggressive baseliner with strong hold games and conversion ability on hard courts.",
    strengths: "Elite 62.3% hold rate; 48.5% break rate; 66.7% tiebreak win rate.",
    weaknesses: "Low ace rate (3.4%); modest first serve percentage (60.6%); limited grass court success (0-1).",
    serveStats: "Hold 62.3%, Ace 3.4%, DF 3.3%, 1stIn 60.6%, 1stWon 61.6%",
    returnStats: "Break 48.5%, TB 66.7%, DR 1.41",
    overallStats: "Hard 19-6 · Clay 5-3 · Grass 0-1",
    fullNote: "Sramkova's 62.3% hold rate is elite territory for the WTA. Her 66.7% TB% suggests backing her in tiebreak-heavy matchups.",
    hardCourtNote: "Dominant 19-6 hard court record (76% win rate).",
    rallyProfile: { short: { pct: 32, winPct: 54 }, medium: { pct: 36, winPct: 53 }, long: { pct: 32, winPct: 52 }, profile: "Aggressive baseliner with elite hold rate (62.3%) and strong tiebreak rate (66.7%). Hard court dominance (19-6, 76%) standout stat.", bettingAngle: "Back on hard courts — 19-6 record and DR 1.41 are elite numbers." }
  },

  "Elina Avanesyan": {
    eloRank: 43, elo: 0, record: "24-22",
    style: "Aggressive baseline player with moderate serve and strong break point conversion.",
    strengths: "Break point conversion at 46.2% significantly above tour average; clay court specialist with 61% win rate (11-7); tiebreak proficiency at 66.7%.",
    weaknesses: "Below-average hold percentage at 53.3%; minimal ace production (0.8%); inconsistent hard court results.",
    serveStats: "Hold 53.3%, Ace 0.8%, DF 3.4%, 1stIn 70.8%, 1stWon 57.9%",
    returnStats: "Break 46.2%, TB 66.7%, DR 1.04",
    overallStats: "Hard 12-12 · Clay 11-7 · Grass 1-3",
    fullNote: "Avanesyan exploits break opportunities (46.2%) making her valuable in extended matches against weaker servers. Tiebreak angle (66.7%) attractive in tight sets.",
    hardCourtNote: "Dead-even hard court record (12-12) masks volatility.",
    rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Clay-leaning grinder with strong break rate (46.2%) and tiebreak rate (66.7%). Serve is almost non-existent (0.8% ace rate).", bettingAngle: "Back on clay at generous odds. Fade on hard courts where her serve is fully exposed." }
  },

  "Jasmine Paolini": {
    eloRank: 48, elo: 0, record: "38-20",
    style: "Aggressive baseline player with strong return game and elite physical conditioning.",
    strengths: "Strong break conversion (44.1%); excellent hard court consistency; physical stamina is a genuine edge in three-set matches.",
    weaknesses: "Serve not a weapon; modest hold rate means she needs to break to win.",
    serveStats: "Hold 56.3%, Ace 3.4%, DF 3.9%, 1stIn 64.2%, 1stWon 62.8%",
    returnStats: "Break 44.1%, TB 55.8%, DR 1.12",
    overallStats: "Hard 22-12 · Clay 12-6 · Grass 4-2",
    fullNote: "Paolini is a medium and long-rally specialist. Physical stamina is a genuine edge in three-set matches. Court coverage and retrieval get stronger as exchanges lengthen.",
    hardCourtNote: "Strong hard court record (22-12) as her most reliable surface.",
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 38, winPct: 54 }, long: { pct: 33, winPct: 55 }, profile: "Medium and long-rally specialist. Physical stamina is a genuine edge in three-set matches.", bettingAngle: "Back in conditions that extend rallies. Three-set record is strong because stamina compounds." }
  },

  "Linda Noskova": {
    eloRank: 26, elo: 0, record: "26-18",
    style: "Aggressive baseline player with solid serve who relies on break point conversion and tiebreak prowess.",
    strengths: "Elite break point conversion at 44.8% and exceptional tiebreak win rate of 68.8%; strong hard court record (17-9); consistent hold percentage at 59%.",
    weaknesses: "Below-average first serve percentage at 60.2% and low ace rate of 6.4%; 5.9% double fault rate.",
    serveStats: "Hold 59%, Ace 6.4%, DF 5.9%, 1stIn 60.2%, 1stWon 69.9%",
    returnStats: "Break 44.8%, TB 68.8%, DR 1.18",
    overallStats: "Hard 17-9 · Clay 6-6 · Grass 3-3",
    fullNote: "Noskova is a sharp betting play on hard courts. Her 44.8% break rate is her primary edge and hard court win rate of 65% validates the surface fit. Live-bet her tiebreak odds heavily (68.8% TB%).",
    hardCourtNote: "Hard court is her most productive surface (65% win rate).",
    rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 37, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Aggressive baseliner with solid break rate (44.8%) and elite tiebreak rate (68.8%).", bettingAngle: "Back in tiebreak-heavy matchups on hard courts — 68.8% tiebreak rate one of the best on tour." }
  },

  "Magdalena Frech": {
    eloRank: 25, elo: 0, record: "29-27",
    style: "Aggressive baseline player who relies on break point conversion and consistent first-serve execution.",
    strengths: "Exceptional break point conversion (40.6%) significantly above tour average; strong first serve consistency (64.4%).",
    weaknesses: "Below-average hold percentage (52.9%); limited ace production (3.1%); inconsistent clay court results (6-8).",
    serveStats: "Hold 52.9%, Ace 3.1%, DF 2.5%, 1stIn 64.4%, 1stWon 62.7%",
    returnStats: "Break 40.6%, TB 55.6%, DR 1.04",
    overallStats: "Hard 20-16 · Clay 6-8 · Grass 2-3",
    fullNote: "Sharp bettors should target Frech in hard court matchups versus lower-ranked or serve-weak opponents where her 40.6% break conversion rate becomes a leverage edge.",
    hardCourtNote: "Frech's 20-16 hard court record demonstrates clear surface preference.",
    rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 38, winPct: 53 }, long: { pct: 33, winPct: 53 }, profile: "Return-first baseliner with 40.6% break rate. Hold rate (52.9%) is low — gets broken often.", bettingAngle: "Target opponent break props vs Frech — her 52.9% hold rate is exploitable." }
  },

  "Katie Boulter": {
    eloRank: 24, elo: 0, record: "34-22",
    style: "Aggressive baseline player leveraging strong first-serve win rate (70.6%) to dictate points.",
    strengths: "Elite first-serve conversion (70.6% win rate); solid break point conversion (43.4%); hard court specialist (64% win rate).",
    weaknesses: "Double fault rate elevated at 7.5%; clay court struggles (0-4 record); inconsistent hold percentage (59.4%).",
    serveStats: "Hold 59.4%, Ace 5%, DF 7.5%, 1stIn 56.8%, 1stWon 70.6%",
    returnStats: "Break 43.4%, TB 50%, DR 1.21",
    overallStats: "Hard 25-14 · Clay 0-4 · Grass 8-3",
    fullNote: "Sharp bettors should target Boulter on hard court venues where her 70.6% first-serve win rate creates structural advantages.",
    hardCourtNote: "Dominates hard courts with 25-14 record (64% win rate).",
    rallyProfile: { short: { pct: 34, winPct: 53 }, medium: { pct: 37, winPct: 53 }, long: { pct: 29, winPct: 49 }, profile: "Hard court specialist with long-rally weakness. 70.6% first serve win rate primary weapon. Clay record 0-4.", bettingAngle: "Reliable on hard in best-of-3. Fade aggressively on clay. DF props live (7.5% DF)." }
  },

  "Emma Raducanu": {
    eloRank: 56, elo: 0, record: "24-13",
    style: "Aggressive baseline player with solid serve mechanics and high break-point conversion.",
    strengths: "Elite break percentage (45.7%) and tiebreak success (66.7%); strong hard court record (12-8) with 64.4% first-serve win rate; grass court form (8-3).",
    weaknesses: "High double fault rate (4.4%) and modest ace production (5.1%) suggest occasional serve inconsistency.",
    serveStats: "Hold 62.3%, Ace 5.1%, DF 4.4%, 1stIn 65.9%, 1stWon 64.4%",
    returnStats: "Break 45.7%, TB 66.7%, DR 1.3",
    overallStats: "Hard 12-8 · Clay 2-2 · Grass 8-3",
    fullNote: "Sharp angle targets break-point props when facing first-serve vulnerable opponents. On hard courts where she holds 60% of matches, back her in first-set winner props given 66.7% tiebreak efficiency.",
    hardCourtNote: "Raducanu thrives on hard courts with 60% win rate.",
    rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 36, winPct: 53 }, long: { pct: 31, winPct: 52 }, profile: "Aggressive baseliner with strong break rate (45.7%) and solid tiebreak rate (66.7%). Grass record (8-3) hidden strength.", bettingAngle: "Back on hard courts and grass. Tiebreak rate (66.7%) reliable in close sets." }
  },

  "Naomi Osaka": {
    eloRank: 57, elo: 0, record: "22-17",
    style: "Aggressive server-reliant player who uses heavy first serve placement to dominate points.",
    strengths: "Elite first serve winning percentage (74.7%) and solid ace rate (9.7%); respectable break conversion (45.9%).",
    weaknesses: "Below-average first serve percentage (54.9%); inconsistent form; low tiebreak win rate (38.5%) in crucial moments.",
    serveStats: "Hold 58.5%, Ace 9.7%, DF 3.9%, 1stIn 54.9%, 1stWon 74.7%",
    returnStats: "Break 45.9%, TB 38.5%, DR 1.13",
    overallStats: "Hard 13-9 · Clay 5-5 · Grass 3-3",
    fullNote: "Sharp angle: fade at short odds given hold% of only 58.5% paired with 45.9% break conversion. Target totals over 22.5 games. Moneyline value exists at +odds only when facing poor returners.",
    hardCourtNote: "Strongest surface with 13-9 record.",
    rallyProfile: { short: { pct: 37, winPct: 55 }, medium: { pct: 36, winPct: 53 }, long: { pct: 27, winPct: 48 }, profile: "Serve-reliant power player. 9.7% ace rate strong but hold rate (58.5%) below average. Tiebreak rate (38.5%) extremely low.", bettingAngle: "Fade in tiebreaks — 38.5% one of the worst rates on tour. Back at big odds when serving well on hard." }
  },

  "Jessica Bouzas Maneiro": {
    eloRank: 54, elo: 0, record: "10-11",
    style: "Baseline grinder with modest pace who relies on consistency and court positioning.",
    strengths: "Strong break point conversion at 48% and solid tiebreak performance (66.7%).",
    weaknesses: "Low ace rate (1.3%) and subpar hold percentage (47.4%); negative break differential (0.95).",
    serveStats: "Hold 47.4%, Ace 1.3%, DF 7.6%, 1stIn 61.2%, 1stWon 58.3%",
    returnStats: "Break 48%, TB 66.7%, DR 0.95",
    overallStats: "Hard 7-7 · Clay 1-3 · Grass 2-1",
    fullNote: "Bouzas Maneiro thrives in tiebreaks (66.7% conversion) making under/total games props valuable, but her 47.4% hold rate is among WTA's lowest.",
    hardCourtNote: "Even 7-7 hard court record masks inconsistency.",
    rallyProfile: { short: { pct: 28, winPct: 49 }, medium: { pct: 36, winPct: 52 }, long: { pct: 36, winPct: 53 }, profile: "Baseline grinder with critically low hold rate (47.4%) but strong tiebreak rate (66.7%).", bettingAngle: "Tiebreak rate (66.7%) is her one genuine edge. Fade in service hold props — 47.4% is among the lowest." }
  },

  "Anhelina Kalinina": {
    eloRank: 55, elo: 0, record: "20-24",
    style: "Baseline grinder with modest serve who relies on return pressure and consistency.",
    strengths: "Strong break conversion at 41.6% and solid clay court form (10-7).",
    weaknesses: "Weak first serve hold at 49.2% and low ace rate; hard court struggles (8-14).",
    serveStats: "Hold 49.2%, Ace 2%, DF 5.3%, 1stIn 62.6%, 1stWon 60.1%",
    returnStats: "Break 41.6%, TB 20%, DR 0.91",
    overallStats: "Hard 8-14 · Clay 10-7 · Grass 2-3",
    fullNote: "Kalinina's 41.6% break rate is her primary weapon but her 49.2% hold% creates service game fragility. Fade her in hard court spots where she's -140 ATS this season.",
    hardCourtNote: "Hard court liability at 33% win rate.",
    rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Clay-leaning grinder with poor serve. 49.2% hold rate major liability. Hard court record (8-14) alarming.", bettingAngle: "Fade on hard courts — 33% win rate is structural. Back on clay at generous odds." }
  },

  "Camila Osorio": {
    eloRank: 59, elo: 0, record: "20-17",
    style: "Baseline grinder with modest serve who relies on break point conversion and clay court comfort.",
    strengths: "71.3% break point conversion rate significantly above tour average; 10-4 clay record; 72.7% tiebreak win rate.",
    weaknesses: "Weak first serve at 66.5%; low ace rate of 1.5%; 51.5% hold percentage is below elite standards.",
    serveStats: "Hold 51.5%, Ace 1.5%, DF 6.5%, 1stIn 66.5%, 1stWon 58.3%",
    returnStats: "Break 51.1%, TB 72.7%, DR 1.08",
    overallStats: "Hard 7-10 · Clay 10-4 · Grass 1-3",
    fullNote: "Osorio's 51.1% break conversion is the sharpest edge; target her in clay tournaments where her 10-4 record and break rate compound. On hard courts, fade her or get plus odds.",
    hardCourtNote: "Hard court is her weakest surface at 7-10.",
    rallyProfile: { short: { pct: 26, winPct: 49 }, medium: { pct: 36, winPct: 53 }, long: { pct: 38, winPct: 56 }, profile: "Clay grinding specialist. Short-point rate (49%) negative. Serve is a liability (1.5% ace, 6.5% DF).", bettingAngle: "Genuine underdog value on clay in long matches. Hard court record (7-10) confirms fade off clay." }
  },

  "Katie Volynets": {
    eloRank: 58, elo: 0, record: "13-17",
    style: "Aggressive baseline player with strong return game but inconsistent serving.",
    strengths: "Break point conversion (44.5%) well above tour average; solid first serve percentage (76.7%).",
    weaknesses: "Ace production critically low at 1.1%; hard court struggles evident in 9-13 record.",
    serveStats: "Hold 52.9%, Ace 1.1%, DF 1.7%, 1stIn 76.7%, 1stWon 57.1%",
    returnStats: "Break 44.5%, TB 50%, DR 0.87",
    overallStats: "Hard 9-13 · Clay 3-3 · Grass 1-1",
    fullNote: "Volynets presents a return-heavy betting profile with 44.5% break rate but 52.9% hold rate creates vulnerable service games.",
    hardCourtNote: "Hard court represents 69% of matches with concerning 41% win rate.",
    rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 54 }, profile: "Return-first baseliner with negative short-point profile. Wins entirely through medium and long rally domination.", bettingAngle: "Fade on fast courts vs big servers. Back in slow conditions where break rate can take over." }
  },

  "Viktoriya Tomova": {
    eloRank: 53, elo: 0, record: "22-27",
    style: "Inconsistent baseline player who relies on break opportunities and struggles with serve reliability.",
    strengths: "Strong break conversion rate at 45.3%; solid first serve win percentage of 59.4%.",
    weaknesses: "Critically low ace rate of 1.7%; 65.3% first serve percentage leaves her vulnerable; 49% overall win rate.",
    serveStats: "Hold 52.1%, Ace 1.7%, DF 4%, 1stIn 65.3%, 1stWon 59.4%",
    returnStats: "Break 45.3%, TB 50%, DR 0.9",
    overallStats: "Hard 11-17 · Clay 8-8 · Grass 3-2",
    fullNote: "Tomova is a break-reliant player with 45.3% conversion that should be monitored for return-game props in +210 underdogs scenarios. Hard court struggles (39% win rate) make her a fade candidate.",
    hardCourtNote: "Worst surface at 11-17 record.",
    rallyProfile: { short: { pct: 28, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 35, winPct: 53 }, profile: "Break-reliant player with negative short-point profile (49%). Hard court record (11-17) confirms structural surface weakness.", bettingAngle: "Hard court fade. 39% win rate there is structural." }
  },

  "Elisabetta Cocciaretto": {
    eloRank: 52, elo: 0, record: "18-23",
    style: "Baseline-oriented player who relies on consistency and break point conversion.",
    strengths: "Strong break point conversion at 42.8%; excellent grass court form at 3-1.",
    weaknesses: "Concerning hard court record of 8-15 (34.8%); low ace rate of 1.8%; modest hold percentage of 55.7%.",
    serveStats: "Hold 55.7%, Ace 1.8%, DF 4.1%, 1stIn 67.7%, 1stWon 61.2%",
    returnStats: "Break 42.8%, TB 50%, DR 0.88",
    overallStats: "Hard 8-15 · Clay 7-7 · Grass 3-1",
    fullNote: "Cocciaretto's 42.8% break conversion is her primary edge but clay preference (7-7) versus hard court woes (8-15) creates clear betting splits.",
    hardCourtNote: "Hard court struggles are pronounced with only 8 wins in 15 matches.",
    rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 36, winPct: 53 }, profile: "Baseline grinder with a significant hard court problem. 42.8% break rate solid in medium and long rallies.", bettingAngle: "Fade on hard courts completely. On clay or grass, live underdog." }
  },

  "Lucia Bronzetti": {
    eloRank: 73, elo: 0, record: "21-27",
    style: "Defensive baseline player relying on consistency and break opportunities.",
    strengths: "Strong break point conversion (43.7%) and hold percentage (56.7%); respectable first-serve win rate (61.4%).",
    weaknesses: "Extremely low ace rate (2.6%) and double fault issues (3.8%); tiebreak weakness (45.5%); modest 0.88 draw ratio.",
    serveStats: "Hold 56.7%, Ace 2.6%, DF 3.8%, 1stIn 61.7%, 1stWon 61.4%",
    returnStats: "Break 43.7%, TB 45.5%, DR 0.88",
    overallStats: "Hard 16-18 · Clay 4-6 · Grass 1-3",
    fullNote: "Bronzetti's 56.7% hold rate masks a player who survives through break opportunities (43.7%) rather than dominance. Target her in tiebreak props under 45%.",
    hardCourtNote: "Hard court is primary surface (16-18 record) but shows vulnerability with only 48% win rate.",
    rallyProfile: { short: { pct: 28, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 35, winPct: 54 }, profile: "Defensive Italian baseliner. 43.7% break conversion solid. Short-point rate (50%) coin-flip — 2.6% ace rate.", bettingAngle: "Back at +150 or better on clay. Fade as a favorite on hard courts where hold rate (56.7%) is a liability." }
  },

  "Veronika Kudermetova": {
    eloRank: 72, elo: 0, record: "16-25",
    style: "Defensive baseline player relying on consistency and break point conversion.",
    strengths: "Strong break point conversion at 47.1%; solid first serve won percentage at 64%.",
    weaknesses: "Severe struggles on hard courts (10-16 record, 38.5% win rate); low ace rate of 4.9%; modest hold percentage of 49.5%.",
    serveStats: "Hold 49.5%, Ace 4.9%, DF 2.9%, 1stIn 61%, 1stWon 64%",
    returnStats: "Break 47.1%, TB 28.6%, DR 0.78",
    overallStats: "Hard 10-16 · Clay 3-5 · Grass 3-4",
    fullNote: "Kudermetova's 47.1% break rate is respectable but offset by 49.5% hold%. Her 0.78 double ratio suggests opponent break bets on her service games are exploitable.",
    hardCourtNote: "Hard court is her worst surface at 10-16 (38.5%).",
    rallyProfile: { short: { pct: 28, winPct: 50 }, medium: { pct: 38, winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Defensive baseliner with 47.1% break rate and 49.5% hold rate. Hard court record (10-16) confirms surface weakness.", bettingAngle: "Target opponent break props vs Kudermetova on hard courts — 49.5% hold rate exploitable." }
  },

  "Olga Danilovic": {
    eloRank: 51, elo: 0, record: "12-7",
    style: "Consistent baseline player relying on break point conversion rather than aggressive serving.",
    strengths: "Strong break point rate at 51.8% and solid first serve win rate of 61.7%; reliable hold percentage of 58.4%.",
    weaknesses: "Low ace rate of 2.7% and modest first serve percentage of 63.9%; below-average 40% tiebreak rate.",
    serveStats: "Hold 58.4%, Ace 2.7%, DF 5.4%, 1stIn 63.9%, 1stWon 61.7%",
    returnStats: "Break 51.8%, TB 40%, DR 1.26",
    overallStats: "Hard 5-2 · Clay 7-4 · Grass 0-1",
    fullNote: "Danilovic is a grinder whose 51.8% break rate ranks elite for her tier, making matches hinge on return games rather than serving dominance.",
    hardCourtNote: "7-2 record on hard courts shows this is her best surface, but sample remains limited.",
    rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Return-first grinder with elite break rate (51.8%) and weak tiebreak rate (40%).", bettingAngle: "Back on clay where her break rate is most effective. Fade in tiebreaks." }
  },

  "Clara Tauson": {
    eloRank: 50, elo: 0, record: "23-16",
    style: "Aggressive baseline player with above-average break conversion.",
    strengths: "Strong break conversion rate (49.4%) and solid first serve win percentage (68.9%); reasonable hold percentage (56.9%).",
    weaknesses: "High double fault percentage (6.9%) and weak tiebreak performance (28.6%); hard court struggles (10-12).",
    serveStats: "Hold 56.9%, Ace 7.4%, DF 6.9%, 1stIn 58.1%, 1stWon 68.9%",
    returnStats: "Break 49.4%, TB 28.6%, DR 0.91",
    overallStats: "Hard 10-12 · Clay 4-3 · Grass 0-2",
    fullNote: "Tauson is a break-heavy player (49.4% Break%) rather than a hold-heavy one, making her vulnerable to servers who maintain first serve consistency above 60%.",
    hardCourtNote: "Hard court is primary surface (10-12 record) but shows concerning inconsistency.",
    rallyProfile: { short: { pct: 30, winPct: 51 }, medium: { pct: 37, winPct: 52 }, long: { pct: 33, winPct: 51 }, profile: "Aggressive baseliner with 49.4% break rate and very poor tiebreak rate (28.6%).", bettingAngle: "Tiebreak fade is automatic — 28.6% is well below average. Back at big odds in clay conditions only." }
  },

  "Erika Andreeva": {
    eloRank: 83, elo: 0, record: "9-16",
    style: "Aggressive baseline player who relies on break point conversion and consistent first-serve placement.",
    strengths: "Strong break point conversion at 43.4% and solid first-serve win rate of 65.4%; reliable hold percentage of 52.2%.",
    weaknesses: "Concerning 25% win rate overall with poor hard court form (7-12); low ace production (4.4%) and weak tiebreak performance (42.9%).",
    serveStats: "Hold 52.2%, Ace 4.4%, DF 4%, 1stIn 61.2%, 1stWon 65.4%",
    returnStats: "Break 43.4%, TB 42.9%, DR 0.72",
    overallStats: "Hard 7-12 · Clay 1-3 · Grass 1-1",
    fullNote: "Andreeva is a break-point dependent player with high volatility. Fade her in tiebreak-heavy matchups given 42.9% TB% and monitor first-serve percentage dips below 60%.",
    hardCourtNote: "Significant vulnerability on hard courts with 36.8% win rate.",
    rallyProfile: { short: { pct: 28, winPct: 49 }, medium: { pct: 36, winPct: 51 }, long: { pct: 36, winPct: 52 }, profile: "Aggressive baseliner in poor overall form. DR 0.72 means she loses more points than she wins.", bettingAngle: "Fade in almost all circumstances. DR 0.72 is alarming." }
  },

  "Alycia Parks": {
    eloRank: 82, elo: 0, record: "4-10",
    style: "Aggressive baseline player relying on power and depth rather than precision or serve dominance.",
    strengths: "Solid first-serve win rate (66.3%) and break point conversion (33.3%) when opportunities arise.",
    weaknesses: "Concerning 4-10 record with weak hold percentage (47%); low ace rate (7.1%) and high double fault rate (12.6%); poor defensive metrics (DR 0.57).",
    serveStats: "Hold 47%, Ace 7.1%, DF 12.6%, 1stIn 52.3%, 1stWon 66.3%",
    returnStats: "Break 33.3%, TB 0%, DR 0.57",
    overallStats: "Hard 4-8 · Clay 0-0 · Grass 0-2",
    fullNote: "Parks' 47% hold percentage is critically low and projects significant break probability against comparable opponents. Her 0.57 defensive rating suggests vulnerability to aggressive returners.",
    hardCourtNote: "4-8 on hard courts this season shows marginal success despite it being her primary surface.",
    rallyProfile: { short: { pct: 31, winPct: 49 }, medium: { pct: 35, winPct: 50 }, long: { pct: 34, winPct: 50 }, profile: "Power player in severe form decline. DR 0.57 means she's losing more points than she wins.", bettingAngle: "Fade in almost all circumstances. 12.6% DF rate is catastrophic. DF props automatic." }
  },

  "Sonay Kartal": {
    eloRank: 84, elo: 0, record: "7-1",
    style: "Aggressive baseline player with high break conversion and tiebreak proficiency.",
    strengths: "Exceptional break conversion at 46.3%; perfect 100% tiebreak record; strong hard court performance at 5-0.",
    weaknesses: "Low ace rate of 1.7%; limited clay court experience; small sample size.",
    serveStats: "Hold 55.6%, Ace 1.7%, DF 2.7%, 1stIn 67.4%, 1stWon 66.5%",
    returnStats: "Break 46.3%, TB 100%, DR 1.75",
    overallStats: "Hard 5-0 · Clay 0-0 · Grass 2-1",
    fullNote: "Sharp angle targets Kartal's 46.3% break conversion as primary weapon. Tiebreak prop at 100% wins shows elite clutch performance. Fade clay court exposure given 0-0 record.",
    hardCourtNote: "Undefeated 5-0 on hard courts with dominant break point conversion.",
    rallyProfile: { short: { pct: 31, winPct: 53 }, medium: { pct: 37, winPct: 55 }, long: { pct: 32, winPct: 54 }, profile: "Emerging player with elite DR (1.75) in small sample. 46.3% break rate and 100% tiebreak rate impressive.", bettingAngle: "Back on hard courts while the form holds. Sample is small but numbers are exceptional." }
  },

  "Jaqueline Cristian": {
    eloRank: 85, elo: 0, record: "20-23",
    style: "Baseline grinder with modest serve who relies on return aggression and consistency.",
    strengths: "Strong break point conversion (43.4%) and clay court performance (11-7); solid first serve win rate (65.1%).",
    weaknesses: "Weak first serve percentage (58.7%) and low ace rate (4%); struggles on hard courts (8-13) and grass (0-2).",
    serveStats: "Hold 56.5%, Ace 4%, DF 4.8%, 1stIn 58.7%, 1stWon 65.1%",
    returnStats: "Break 43.4%, TB 14.3%, DR 0.93",
    overallStats: "Hard 8-13 · Clay 11-7 · Grass 0-2",
    fullNote: "Cristian's value lies in clay tournaments where she's 61% (11-7), but bettors should exploit her 58.7% first serve rate on hard courts.",
    hardCourtNote: "Hard court is a significant weakness at 8-13 record.",
    rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Clay-leaning grinder. Tiebreak rate (14.3%) is extremely low.", bettingAngle: "Back on clay only. Fade on hard courts and grass. Tiebreak fade is automatic." }
  },

  "Nadia Podoroska": {
    eloRank: 100, elo: 0, record: "10-25",
    style: "Defensive baseline player relying on consistency and break opportunities.",
    strengths: "Strong break point conversion (44.2%) and solid first serve win rate (59.6%); reliable hold percentage (52.3%).",
    weaknesses: "Critically weak ace production (2.6%) and high double fault rate (5.2%); poor 35% win rate and struggles across all surfaces.",
    serveStats: "Hold 52.3%, Ace 2.6%, DF 5.2%, 1stIn 65.6%, 1stWon 59.6%",
    returnStats: "Break 44.2%, TB 28.6%, DR 0.57",
    overallStats: "Hard 8-14 · Clay 2-9 · Grass 0-2",
    fullNote: "Podoroska is a low-volume break bettor's target. With only 2.6% aces and facing ranked competition, avoid her under-serviced prop lines. DR 0.57 means she loses more points than she wins.",
    hardCourtNote: "Hard court remains her best surface at 36% win rate, but 8-14 record shows continued vulnerability.",
    rallyProfile: { short: { pct: 26, winPct: 48 }, medium: { pct: 36, winPct: 51 }, long: { pct: 38, winPct: 52 }, profile: "Defensive grinder with a DR of 0.57 — loses more points than she wins overall. Hard and clay records both poor.", bettingAngle: "Fade in almost all circumstances. DR of 0.57 is one of the worst on the WTA tour." }
  }

};

export default wta;
