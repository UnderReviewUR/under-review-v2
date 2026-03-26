export default function handler(req, res) {

res.setHeader("Access-Control-Allow-Origin", "*");

res.status(200).json({

surfaces: {

tennis_atp_miami_open: {

name: "Miami Open",

surface: "Hard",

speed: "Medium-Fast",

note: "Miami's hard courts play slightly slower than most hard court events. Heavy topspin and baseline consistency are rewarded. Big servers still have an edge but rallies run longer than at the US Open.",

},

tennis_wta_miami_open: {

name: "Miami Open",

surface: "Hard",

speed: "Medium-Fast",

note: "Miami hard courts favor aggressive baseliners. Sabalenka just won Indian Wells and arrives as the clear favorite at 35.4% per Tennis Abstract simulations. Slightly slower conditions than the US Open benefit topspin baseliners.",

},

tennis_atp_french_open: {

name: "French Open",

surface: "Clay",

speed: "Slow",

note: "Roland Garros clay neutralizes big servers and rewards endurance and topspin. The two-week grind tests fitness more than any other Slam. Alcaraz has won here twice and Sinner is improving rapidly on clay.",

},

tennis_wta_french_open: {

name: "French Open",

surface: "Clay",

speed: "Slow",

note: "Clay at Roland Garros rewards heavy topspin, patience, and elite fitness. Swiatek has dominated this event. Points are longer, serve advantages shrink, and fitness is the deciding factor deep in draws.",

},

tennis_atp_wimbledon: {

name: "Wimbledon",

surface: "Grass",

speed: "Fast",

note: "Wimbledon grass is the fastest major surface. Big servers dominate early rounds, points are short, and net rushers have a natural advantage. Alcaraz won here in 2023 and 2024 before losing to Sinner in the 2025 final.",

},

tennis_wta_wimbledon: {

name: "Wimbledon",

surface: "Grass",

speed: "Fast",

note: "Grass at Wimbledon rewards flat hitting, serve power, and net aggression. Rybakina won here in 2022 and is the standout performer on this surface. Clay court specialists frequently exit early.",

},

tennis_atp_us_open: {

name: "US Open",

surface: "Hard",

speed: "Medium",

note: "US Open DecoTurf plays faster than Miami. Night conditions with cool air amplify serve speed. Alcaraz won the 2025 US Open, beating Sinner in the final.",

},

tennis_wta_us_open: {

name: "US Open",

surface: "Hard",

speed: "Medium",

note: "Flushing Meadows rewards aggression and power. Gauff won the 2023 US Open on this surface. The fast DecoTurf suits players with big serves and flat groundstrokes.",

},

},

atp: {

// ATP Top 10

Alcaraz: {

eloRank: 1,

elo: 2290,

hElo: 2216.8,

hEloRank: 2,

cElo: 2225.2,

cEloRank: 1,

gElo: 2148.3,

gEloRank: 1,

peakElo: 2308.5,

peakMonth: "2026-03",

yEloRank: 1,

yElo2026: 2123.9,

record2026: "16-1 — Won Australian Open, unbeaten until IW final. #1 in-season form on tour.",

record: "72-7 (91.1%) last 52 weeks",

style: "All-court attacker",

strengths: "Drop shots, net presence, elite athleticism on all surfaces",

serveStats: "Hold 88.5%, Ace 7.2%, DF 3.1%",

returnStats: "RPW 41.6%, Break rate 30.7% — 45% above tour average of 21.3%",

bpStats: "Break point conversion 43.5%, Save rate 66.9%",

overallStats: "Dominance Ratio 1.31, TPW 54.5%, Tiebreak 61.8%",

h2h: "vs Sinner 11-6 · vs Djokovic 4-5 · vs Zverev 6-6 · vs Medvedev 6-2 · vs Fritz 5-1 · vs De Minaur 5-0 · vs Shelton 3-0 (source: Tennis Abstract)",

fullNote: "The most complete statistical profile on tour. 91.1% win rate, DR 1.31 means he wins 31% more points than he loses. Elite on both serve and return. Converts 43.5% of break chances and saves 66.9% of break points faced.",

hardRecord: "158-42 career hard court record (79%). Currently on a 34-match outdoor hard court winning streak — third best in history behind Federer and Connors.",

miamiNote: "Won Miami in 2022 and 2023. Arrives unbeaten in 2026 (16-0) after winning the Australian Open. His combination of movement, variety, and shot-making makes him the most complete hard court player on tour right now alongside Sinner.",

surfaceNote: {

hard: "Won Australian Open 2026, US Open 2025, Miami Open 2022 and 2023. 79% career hard court win rate.",

clay: "Won Roland Garros 2024 and 2025. Clay is his strongest surface historically.",

grass: "Won Wimbledon 2023 and 2024. Lost 2025 Wimbledon final to Sinner.",

},

},

Sinner: {

eloRank: 2,

elo: 2285,

hElo: 2238.2,

hEloRank: 1,

cElo: 2149.6,

cEloRank: 2,

gElo: 2070.7,

gEloRank: 2,

peakElo: 2329.6,

peakMonth: "2025-01",

yEloRank: 3,

yElo2026: 2094.7,

record2026: "13-2 — Won Indian Wells. Fewer matches than Alcaraz/Medvedev but quality arguably #1.",

record: "64-8 (88.9%) last 52 weeks",

style: "Aggressive baseliner",

strengths: "Devastating backhand, elite return game, exceptional fitness and mental composure",

serveStats: "Hold 91.8% — best on tour, Ace 10.2%, DF 1.9% — lowest on tour",

returnStats: "RPW 42.2%, Break rate 32.1% — #1 on tour, 50% above tour average",

bpStats: "Break point conversion 43.6%, Save rate 72.4% — best on tour",

overallStats: "Dominance Ratio 1.49 — best on tour, TPW 56.2%, Tiebreak 81.0% — best on tour",

h2h: "vs Alcaraz 6-11 · vs Djokovic 4-6 · vs Zverev 6-4 · vs Medvedev 8-7 · vs De Minaur 13-0 · vs Fritz 4-1 · vs Shelton 8-1 (source: Tennis Abstract)",

fullNote: "DR 1.49 is the best on tour — wins 49% more points than he loses. Tour-leading hold (91.8%), break rate (32.1%), BP save rate (72.4%), and 81% tiebreak win rate. His DF rate (1.9%) is the lowest in the top 50. Statistically the most dominant player right now.",

hardRecord: "234-54 career hard court record (81.3%) — second among all active players. Just completed the full hard court Masters set by winning Indian Wells.",

miamiNote: "Arrives as Miami favorite at 41.2% per Tennis Abstract after winning Indian Wells. Now targeting the Sunshine Double — Indian Wells and Miami back to back. Hard courts are where he is most dominant.",

surfaceNote: {

hard: "81.3% career hard court win rate. Won Australian Open 2024 and 2025, Indian Wells 2026, ATP Finals 2024 and 2025. Has now won every major hard court event.",

clay: "Strong but not dominant on clay — lost French Open final to Alcaraz in 2025.",

grass: "Won Wimbledon 2025. Still developing his grass game but improving rapidly.",

},

},

Djokovic: {

eloRank: 3,

elo: 2100,

hElo: 2051.8,

hEloRank: 3,

cElo: 2002.2,

cEloRank: 4,

gElo: 1955.0,

gEloRank: 3,

peakElo: 2463.2,

peakMonth: "2016-05",

yEloRank: 13,

yElo2026: 1895.9,

record2026: "7-2 — Limited schedule. yElo rank 13 reflects small sample, not true level.",

record: "39-9 (81.3%) last 52 weeks",

style: "Counter-punching baseliner",

strengths: "Return of serve, defensive retrieval, mental toughness, all-surface adaptability",

serveStats: "Hold 87.8%, Ace 9.5%, DF 2.7%",

returnStats: "RPW 39.6%, Break rate 26.4% — well above tour average",

bpStats: "Break point conversion 41.8%, Save rate 64.9%",

overallStats: "Dominance Ratio 1.30, TPW 54.1%, Tiebreak 52.4% — near coin-flip, notable decline",

h2h: "vs Alcaraz 5-4 · vs Sinner 6-4 · vs Zverev 9-5 · vs Medvedev 10-5 · vs Fritz 8-2 (source: Tennis Abstract)",

fullNote: "Still elite at 38. DR 1.30, solid hold and break rates. Only weakness: tiebreaks at 52.4% — almost exactly coin-flip, a notable departure from his historically dominant tiebreak record.",

hardRecord: "Career 81%+ hard court win rate. The all-time record holder at most major hard court events.",

miamiNote: "All-time Miami record is exceptional but at 38 he now selects his schedule carefully. When motivated he remains the best defensive player on tour and a threat to go deep in any draw.",

surfaceNote: {

hard: "Greatest hard court player in history — 10 Australian Opens, 4 US Opens.",

clay: "Exceptional on clay — Roland Garros champion multiple times.",

grass: "Greatest Wimbledon champion — 7 titles.",

},

},

Zverev: {

eloRank: 4,

elo: 2060,

hElo: 2016.5,

hEloRank: 4,

cElo: 2002.8,

cEloRank: 3,

gElo: 1885.1,

gEloRank: 6,

peakElo: 2176.5,

peakMonth: "2022-01",

yEloRank: 4,

yElo2026: 2000.9,

record2026: "11-4 — Solid but clear drop from top 3.",

record: "56-24 (70.0%) last 52 weeks",

style: "Power baseliner",

strengths: "Serve, forehand, clay court movement",

serveStats: "Hold 87.9%, Ace 10.6%, DF 2.2%",

returnStats: "RPW 36.8%, Break rate 21.3% — exactly tour average, no return edge",

bpStats: "Break point conversion 41.8%, Save rate 63.1%",

overallStats: "Dominance Ratio 1.18, TPW 52.3%, Tiebreak 62.2%",

h2h: "vs Alcaraz 6-6 · vs Sinner 4-6 · vs Djokovic 5-9 · vs Medvedev 8-6 · vs De Minaur 3-8 (source: Tennis Abstract)",

fullNote: "Good serve (87.9% hold) but return game is exactly tour average (21.3% break rate). His 70% win rate reflects the gap. When his serve is broken he has no return weapon to compensate.",

hardRecord: "Solid hard court record but inconsistent at the top level.",

miamiNote: "Has not won Miami despite his ranking. His game is better suited to clay and he tends to lose to elite opponents on hard courts in close matches.",

surfaceNote: {

hard: "Capable on hard but not dominant — better on clay.",

clay: "Roland Garros finalist multiple times — clay is his best surface.",

grass: "Below his ranking at Wimbledon.",

},

},

Medvedev: {

eloRank: 5,

elo: 2030,

hElo: 1994.7,

hEloRank: 5,

cElo: 1929.5,

cEloRank: 7,

gElo: 1893.9,

gEloRank: 5,

peakElo: 2201.2,

peakMonth: "2022-01",

yEloRank: 2,

yElo2026: 2096.6,

record2026: "18-4 — Most wins of any top player in 2026. Lost IW final to Sinner. Best form in years.",

record: "47-21 (69.1%) last 52 weeks",

style: "Defensive baseliner",

strengths: "Return game, flat low-bouncing groundstrokes, mental resilience in long matches",

serveStats: "Hold 84.2% — weakest in top 10, Ace 11.2%, DF 5.7% — highest in top 10",

returnStats: "RPW 40.1%, Break rate 27.5% — 4th on tour, well above average",

bpStats: "Break point conversion 40.3%, Save rate 62.4% — below top 10 average",

overallStats: "Dominance Ratio 1.17, TPW 52.5%, Tiebreak 41.9% — worst in top 10",

h2h: "vs Alcaraz 2-6 · vs Sinner 7-8 · vs Djokovic 5-10 · vs Zverev 6-8 · vs Fritz 8-4 (source: Tennis Abstract)",

fullNote: "Elite return game (4th on tour) but serve is a liability — 5.7% DF rate highest in top 10, 84.2% hold weakest. His 41.9% tiebreak win rate is worst in the top 10 — he consistently loses close sets, explaining why he cannot convert form into titles.",

hardRecord: "US Open champion 2021. Multiple Australian Open finalist. Hard courts are clearly his best surface by a wide margin.",

miamiNote: "Just lost the Indian Wells final to Sinner in two tiebreaks. Hard courts suit his flat game well and he arrives in good form. His return stats rank among the best on tour.",

surfaceNote: {

hard: "Elite on hard — US Open champion, two-time Australian Open finalist.",

clay: "Noticeably weaker on clay — tends to lose to lower-ranked players at Roland Garros.",

grass: "Below par on grass, tends to exit early at Wimbledon.",

},

},

"De Minaur": {

eloRank: 6,

elo: 2024,

hElo: 1974.8,

hEloRank: 6,

cElo: 1908.9,

cEloRank: 8,

gElo: 1847.7,

gEloRank: 8,

peakElo: 2053.1,

peakMonth: "2024-06",

yEloRank: 6,

yElo2026: 1958.2,

record2026: "12-4 — Consistent elite form to start 2026.",

record: "53-23 (69.7%) last 52 weeks",

style: "Counter-punching speedster",

strengths: "Elite footwork, defensive retrieval, slice backhand, elite fitness",

serveStats: "Hold 84.9%, Ace 5.8% — lowest ace rate in top 10 (placement over power), DF 3.2%",

returnStats: "RPW 40.4%, Break rate 27.4% — 3rd on tour, ahead of Medvedev",

bpStats: "Break point conversion 43.0%, Save rate 65.1%",

overallStats: "Dominance Ratio 1.20, TPW 53.0%, Tiebreak 60.0%",

h2h: "vs Sinner 0-13 · vs Alcaraz 0-5 · vs Zverev 8-3 · vs Medvedev 3-5 · vs Fritz 6-3 (source: Tennis Abstract)",

fullNote: "Return ranks 3rd on tour (ahead of Medvedev). Lowest ace rate in top 10 — wins serve points through placement not power. Well-rounded game with no obvious single weakness. His elite speed allows him to get into rallies no one else can.",

hardRecord: "Consistently performs above his seed at hard court events due to his speed and counter-punching.",

miamiNote: "A legitimate dangerous floater in this draw. His elite speed neutralizes power players and he has the fitness to outlast anyone in a grinding match on hard courts.",

surfaceNote: {

hard: "His best surface — elite speed is maximized on hard.",

clay: "Competitive but not elite on clay.",

grass: "Good on grass — his speed translates well.",

},

},

"Auger-Aliassime": {

eloRank: 7,

elo: 1999,

hElo: 1960.0,

hEloRank: 7,

cElo: 1870.2,

cEloRank: 13,

gElo: 1800.6,

gEloRank: 11,

peakElo: 2062.7,

peakMonth: "2022-10",

yEloRank: 7,

yElo2026: 1955.5,

record2026: "14-5 — Strong volume, confirming hard court form is real.",

record: "48-23 (67.6%) last 52 weeks",

style: "Serve-and-volley attacker",

strengths: "Serve, net play, indoor and outdoor hard court game",

serveStats: "Hold 87.4%, Ace 13.8% — 3rd highest on tour, DF 4.0%",

returnStats: "RPW 36.0%, Break rate 18.5% — below tour average of 21.3%",

bpStats: "Break point conversion 35.0% — below average, Save rate 67.6%",

overallStats: "Dominance Ratio 1.18, TPW 52.0%, Tiebreak 64.3%",

h2h: "vs Alcaraz 3-5 · vs Sinner 2-4 · vs Medvedev 4-6 · vs Zverev 3-6 (source: Tennis Abstract)",

fullNote: "Serve-dominant — 3rd highest ace rate on tour (13.8%), strong hold rate (87.4%). Return is the clear gap: 18.5% break rate is below tour average. His path to winning depends entirely on his serve. Strong in tiebreaks (64.3%) which helps compensate.",

hardRecord: "Strong hard court results, particularly indoor. Tennis Abstract notes his exceptional hard court form.",

miamiNote: "His serve-and-volley style works well on Miami's hard courts. A dangerous floater who can upset higher-ranked opponents if his serve is firing.",

surfaceNote: {

hard: "Strong on hard courts — his serve and net game are most effective here.",

clay: "Below his ranking on clay.",

grass: "Natural grass court player.",

},

},

Shelton: {

eloRank: 8,

elo: 1996,

hElo: 1952.3,

hEloRank: 8,

cElo: 1864.3,

cEloRank: 14,

gElo: 1813.6,

gEloRank: 10,

peakElo: 2024.4,

peakMonth: "2025-08",

yEloRank: 5,

yElo2026: 1966.4,

record2026: "11-3 — Best season form of his career. #5 yElo is a genuine breakthrough.",

record: "41-22 (65.1%) last 52 weeks",

style: "Power server, aggressive attacker",

strengths: "Left-handed serve, aggressive baseline game, net presence",

serveStats: "Hold 87.8%, Ace 13.0%, DF 3.7%",

returnStats: "RPW 33.3%, Break rate 16.3% — second weakest in top 10",

bpStats: "Break point conversion 40.1%, Save rate 68.3%",

overallStats: "Dominance Ratio 1.07 — lowest in top 10, TPW 51.1%, Tiebreak 58.1%",

h2h: "vs Sinner 1-8 · vs Alcaraz 0-3 · vs Medvedev 3-4 · vs Fritz 5-3 (source: Tennis Abstract)",

fullNote: "DR 1.07 is the lowest in the top 10 — barely wins more points than he loses overall. His serve is elite but his return (16.3% break rate) is the second weakest in the top 10. Against Sinner or Alcaraz's return games his serve will face maximum pressure.",

hardRecord: "Most of his best results have come on hard courts. The left-handed serve creates unusual angles.",

miamiNote: "Dangerous on US hard courts. His left-handed serve creates havoc and his aggressive style suits Miami's medium-fast surface. Always a threat to go deep at home events.",

surfaceNote: {

hard: "Most effective on hard courts — his serve dominates.",

clay: "Less effective on clay.",

grass: "Solid on grass — his serve is even more effective.",

},

},

Fritz: {

eloRank: 9,

elo: 1983,

hElo: 1926.1,

hEloRank: 10,

cElo: 1874.1,

cEloRank: 12,

gElo: 1915.8,

gEloRank: 4,

peakElo: 2070.2,

peakMonth: "2025-09",

yEloRank: 22,

yElo2026: 1838.8,

record2026: "10-7 — Underperforming in 2026. yElo rank 22 is well below his career Elo ranking.",

record: "53-25 (67.9%) last 52 weeks",

style: "Big server, aggressive baseliner",

strengths: "Serve power, forehand, US hard court comfort",

serveStats: "Hold 89.2% — best in top 10, Ace 15.8% — highest on tour, DF 2.4%",

returnStats: "RPW 34.4%, Break rate 15.6% — weakest returner in top 10",

bpStats: "Break point conversion 34.1% — lowest in top 10, Save rate 68.1%",

overallStats: "Dominance Ratio 1.16, TPW 52.0%, Tiebreak 59.6%",

h2h: "vs Sinner 1-4 · vs Alcaraz 1-5 · vs Medvedev 4-8 · vs Zverev 3-6 · vs De Minaur 3-6 (source: Tennis Abstract)",

fullNote: "Highest ace rate on tour (15.8%), best hold rate in top 10 (89.2%) — but worst break rate (15.6%) and lowest BP conversion (34.1%). Entirely one-sided: dominant server, weak returner. Against Sinner's 91.8% hold rate he will generate almost no break chances.",

hardRecord: "Strong US hard court performer. Has won ATP titles on hard and is comfortable in these conditions.",

miamiNote: "A legitimate title threat on US hard courts. His powerful serve and forehand can overpower opponents. Comfortable playing in front of home crowds.",

surfaceNote: {

hard: "Strong on US hard courts — this is where he wins titles.",

clay: "Below his ranking on clay.",

grass: "Solid on grass.",

},

},

Musetti: {

eloRank: 10,

elo: 1979,

hElo: 1908.7,

hEloRank: 12,

cElo: 1984.0,

cEloRank: 5,

gElo: 1855.6,

gEloRank: 7,

peakElo: 2050.5,

peakMonth: "2025-05",

yEloRank: 17,

yElo2026: 1865.3,

record2026: "7-3 — Modest 2026 form, confirming hard courts are not his best surface.",

record: "47-22 (68.1%) last 52 weeks",

style: "One-handed backhand all-court player",

strengths: "One-handed backhand, clay court movement, variety and drop shots",

serveStats: "Hold 83.4% — lowest in top 10, Ace 6.1%, DF 2.4%",

returnStats: "RPW 38.8%, Break rate 25.0% — above tour average for a clay specialist",

bpStats: "Break point conversion 39.2%, Save rate 62.1% — lowest in top 10",

overallStats: "Dominance Ratio 1.14, TPW 52.1%, Tiebreak 45.5% — second worst in top 10",

h2h: "vs Alcaraz 1-8 · vs Sinner 0-3 · vs Zverev 3-2 · vs De Minaur 2-3 (source: Tennis Abstract)",

fullNote: "Strong return for a clay specialist (25% break rate, above tour avg) but his serve is weak — 83.4% hold lowest in top 10, 62.1% BP save rate also the lowest. Gets broken often. 45.5% tiebreak rate is poor — hard courts expose him in tight sets.",

hardRecord: "Below his ranking on hard courts — clay is strongly preferred.",

miamiNote: "Clay specialist who tends to underperform his ranking on fast hard courts. His elegant one-handed backhand is harder to control on faster surfaces.",

surfaceNote: {

hard: "Below his ranking on hard courts.",

clay: "Excellent on clay — his best surface by far.",

grass: "Decent on grass.",

},

},

// ATP 11–25

Tien: {

eloRank: 11,

elo: 1972,

hElo: 1933.5,

hEloRank: 9,

cElo: 1638.4,

cEloRank: 106,

gElo: 1728.4,

gEloRank: 28,

peakElo: 1977.4,

peakMonth: "2026-03",

yEloRank: 11,

yElo2026: 1931.3,

record2026: "10-5 — Strong season for a 20-year-old. #11 in-season form is impressive.",

record: "40-24 (62.5%) last 52 weeks",

style: "Aggressive hard court baseliner",

strengths: "Power groundstrokes, explosive movement, strong hard court game",

serveStats: "Hold 80.2%, Ace 6.8%, DF 5.0% — above average DF rate",

returnStats: "RPW 36.9%, Break rate 22.3% — slightly above tour average of 21.3%",

bpStats: "Break point conversion 41.3%, Save rate 62.3%",

overallStats: "DR 1.03, TPW 50.7%, Tiebreak 67.5%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-1 · vs Medvedev 0-0 · vs Bublik 0-0 (source: Tennis Abstract H2H matrix — limited top-15 record)",

fullNote: "At 20 years old, Tien is one of the most exciting young Americans on tour. His hElo of 1933 ranks #9 — elite on hard. His clay Elo (#106) reveals a massive surface gap — he is essentially a hard court specialist at this stage. DR 1.03 is modest but expected at his age. 67.5% tiebreak rate is a genuine strength.",

surfaceNote: {

hard: "Elo rank #9 on hard courts — elite for his age. His best surface by a wide margin.",

clay: "Clay Elo rank #106 — massive weakness. Fade him heavily at Roland Garros.",

grass: "Grass Elo rank #28 — developing but not yet proven.",

},

},

Draper: {

eloRank: 12,

elo: 1956,

hElo: 1914.3,

hEloRank: 11,

cElo: 1828.4,

cEloRank: 20,

gElo: 1765.3,

gEloRank: 17,

peakElo: 2103.8,

peakMonth: "2025-04",

yEloRank: 34,

yElo2026: 1813.3,

record2026: "5-2 — Small sample. Injury-affected start to 2026.",

record: "22-9 (71.0%) last 52 weeks",

style: "Aggressive left-handed baseliner",

strengths: "Heavy topspin forehand, serve, physicality",

serveStats: "Hold 86.8%, Ace 10.5%, DF 3.6%",

returnStats: "RPW 38.4%, Break rate 24.2% — above tour average",

bpStats: "Break point conversion 37.1%, Save rate 66.0%",

overallStats: "DR 1.23, TPW 52.8%, Tiebreak 70.0%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 (source: Tennis Abstract — limited top-15 record)",

fullNote: "DR 1.23 is elite — ranks among the top 5 on tour. His 70% tiebreak rate is exceptional. The gap between his peak Elo (2103 in April 2025) and current yElo rank (#34) reflects injury disruption in 2026. When healthy he is a genuine top-5 caliber player. Left-handed serve creates unique problems for opponents.",

surfaceNote: {

hard: "Hard court Elo #11 — elite. Best results on hard.",

clay: "Clay Elo #20 — solid, improving.",

grass: "Grass Elo #17 — strong, benefits from left-handed serve at Wimbledon.",

},

},

Fils: {

eloRank: 13,

elo: 1956,

hElo: 1903.0,

hEloRank: 15,

cElo: 1883.8,

cEloRank: 11,

gElo: 1763.8,

gEloRank: 18,

peakElo: 1985.3,

peakMonth: "2025-04",

yEloRank: 8,

yElo2026: 1948.6,

record2026: "9-4 — #8 in-season form. Strong 2026 start.",

record: "23-10 (69.7%) last 52 weeks",

style: "Aggressive baseliner",

strengths: "Explosive groundstrokes, athleticism, competitive fire",

serveStats: "Hold 82.3%, Ace 6.2%, DF 3.3%",

returnStats: "RPW 37.5%, Break rate 22.3% — slightly above tour average",

bpStats: "Break point conversion 38.8%, Save rate 59.8% — below average",

overallStats: "DR 1.08, TPW 51.2%, Tiebreak 52.9%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 (source: Tennis Abstract — limited top-15 record)",

fullNote: "Young Frenchman with legitimate top-10 upside. Clay Elo #11 is notable — he is not just a hard court player. BP save rate (59.8%) is below average which is his primary vulnerability. 52.9% tiebreak rate is essentially coin-flip — he struggles to close tight sets.",

surfaceNote: {

hard: "Hard Elo #15 — solid.",

clay: "Clay Elo #11 — genuine clay threat. Watch at Roland Garros.",

grass: "Grass Elo #18 — still developing.",

},

},

Bublik: {

eloRank: 14,

elo: 1952,

hElo: 1874.4,

hEloRank: 16,

cElo: 1900.1,

cEloRank: 9,

gElo: 1845.1,

gEloRank: 9,

peakElo: 1988.6,

peakMonth: "2026-01",

yEloRank: 20,

yElo2026: 1856.8,

record2026: "13-5 — Solid 2026.",

record: "48-19 (71.6%) last 52 weeks",

style: "Unorthodox serve-and-volley big server",

strengths: "Enormous serve, net presence, unpredictability",

serveStats: "Hold 88.2%, Ace 14.7%, DF 5.7% — very high DF rate",

returnStats: "RPW 34.7%, Break rate 18.2% — below tour average",

bpStats: "Break point conversion 39.3%, Save rate 70.9% — elite",

overallStats: "DR 1.09, TPW 51.6%, Tiebreak 60.0%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-1 · vs Djokovic 0-1 · vs Zverev 1-3 · vs Medvedev 1-7 · vs Musetti 0-0 · vs De Minaur 1-2 · vs FAA 3-4 · vs Shelton 1-2 · vs Fritz 0-0 · vs Ruud 0-0 · vs Mensik 2-1 · vs Cobolli 0-1 · vs Khachanov 1-1 (source: Tennis Abstract H2H matrix)",

fullNote: "The most unpredictable player in the top 15. 14.7% ace rate is elite but 5.7% DF rate is a volatility risk. BP save rate of 70.9% is his superpower — he rarely gets broken when he holds his nerve. Return game (18.2% break rate) is the weakness — below tour average. His clay Elo (#9) is surprisingly strong for a serve-based player.",

surfaceNote: {

hard: "Hard Elo #16 — solid but not elite.",

clay: "Clay Elo #9 — surprisingly strong. His serve works on clay too.",

grass: "Grass Elo #9 — thrives on fast surfaces where his serve dominates.",

},

},

Mensik: {

eloRank: 15,

elo: 1940,

hElo: 1904.9,

hEloRank: 13,

cElo: 1800.4,

cEloRank: 24,

gElo: 1731.3,

gEloRank: 25,

peakElo: 1969.6,

peakMonth: "2026-02",

yEloRank: 9,

yElo2026: 1938.0,

record2026: "14-5 — #9 in-season form. Excellent 2026.",

record: "38-19 (66.7%) last 52 weeks",

style: "Big serving aggressive baseliner",

strengths: "Serve, forehand power, mental composure for his age",

serveStats: "Hold 85.0%, Ace 15.9% — one of the highest on tour, DF 4.7%",

returnStats: "RPW 36.3%, Break rate 20.1% — just below tour average",

bpStats: "Break point conversion 40.2%, Save rate 65.1%",

overallStats: "DR 1.08, TPW 51.3%, Tiebreak 66.7%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 · vs Bublik 1-2 · vs Ruud 0-2 · vs Cobolli 1-1 · vs Khachanov 0-2 (source: Tennis Abstract H2H matrix)",

fullNote: "At 20, Mensik has the highest ace rate in the top 15 (15.9%). His serve is already a tour-level weapon. Return game (20.1% break rate) is just below average — the area to improve. 66.7% tiebreak rate is strong. His clay Elo (#24) shows he is not a pure hard court specialist.",

surfaceNote: {

hard: "Hard Elo #13 — strong. His serve plays well on hard.",

clay: "Clay Elo #24 — solid for a young big server.",

grass: "Grass Elo #25 — expected to improve as his serve matures.",

},

},

Ruud: {

eloRank: 16,

elo: 1934,

hElo: 1872.2,

hEloRank: 18,

cElo: 1939.2,

cEloRank: 6,

gElo: 1690.4,

gEloRank: 45,

peakElo: 2071.9,

peakMonth: "2022-05",

yEloRank: 35,

yElo2026: 1812.6,

record2026: "7-6 — Below his best. yElo #35 reflects a difficult start.",

record: "36-19 (65.5%) last 52 weeks",

style: "Clay court baseliner",

strengths: "Heavy topspin, consistency on clay, high ball trajectory",

serveStats: "Hold 85.4%, Ace 8.8%, DF 2.6% — low DF rate",

returnStats: "RPW 36.1%, Break rate 20.9% — just below tour average",

bpStats: "Break point conversion 39.1%, Save rate 68.0%",

overallStats: "DR 1.08, TPW 51.4%, Tiebreak 64.7%",

h2h: "vs Alcaraz 1-6 · vs Sinner 0-4 · vs Djokovic 1-5 · vs Zverev 4-2 · vs Musetti 2-2 · vs De Minaur 2-2 · vs FAA 5-4 · vs Shelton 2-2 · vs Medvedev 3-1 · vs Bublik 0-0 · vs Khachanov 1-2 (source: Tennis Abstract H2H matrix)",

fullNote: "Clay Elo #6 on tour — legitimate Roland Garros threat every year. Grass Elo #45 reveals the surface weakness clearly. His hard court Elo (#18) is solid but not elite. Low DF rate (2.6%) shows controlled serving. His yElo rank (#35) in 2026 suggests below-par form — worth monitoring at Miami where hard courts are not his best surface.",

surfaceNote: {

hard: "Hard Elo #18 — solid but not elite. Miami is not his best event.",

clay: "Clay Elo #6 — genuine Roland Garros contender every year.",

grass: "Grass Elo #45 — significant weakness. Exits early at Wimbledon typically.",

},

},

Korda: {

eloRank: 17,

elo: 1915,

hElo: 1873.0,

hEloRank: 17,

cElo: 1780.8,

cEloRank: 30,

gElo: 1789.9,

gEloRank: 13,

peakElo: 2020.7,

peakMonth: "2023-01",

yEloRank: 10,

yElo2026: 1936.6,

record2026: "14-6 — #10 in-season form. Strong 2026 start.",

record: "29-19 (60.4%) last 52 weeks",

style: "All-court attacker",

strengths: "Serve, forehand, athleticism",

serveStats: "Hold 84.9%, Ace 12.1%, DF 3.0%",

returnStats: "RPW 36.7%, Break rate 20.1% — just below tour average",

bpStats: "Break point conversion 38.7%, Save rate 63.5%",

overallStats: "DR 1.12, TPW 51.7%, Tiebreak 52.6% — below average tiebreaks",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 (source: Tennis Abstract — limited top-15 record)",

fullNote: "DR 1.12 is solid. His 12.1% ace rate is a genuine weapon. The concern is tiebreaks — 52.6% is essentially coin-flip, meaning he struggles to convert close sets. Grass Elo #13 is a hidden strength — he may be underrated at Wimbledon. His yElo #10 confirms genuine 2026 form.",

surfaceNote: {

hard: "Hard Elo #17 — solid.",

clay: "Clay Elo #30 — below average on clay.",

grass: "Grass Elo #13 — underrated on grass. Worth watching at Wimbledon.",

},

},

Fonseca: {

eloRank: 18,

elo: 1912,

hElo: 1904.5,

hEloRank: 14,

cElo: 1784.7,

cEloRank: 29,

gElo: 1697.0,

gEloRank: 43,

peakElo: 1992.5,

peakMonth: "2025-03",

yEloRank: 55,

yElo2026: 1745.6,

record2026: "4-4 — Small sample, mixed results.",

record: "23-16 (59.0%) last 52 weeks",

style: "Aggressive baseliner",

strengths: "Explosive groundstrokes, raw talent, hard court game",

serveStats: "Hold 85.1%, Ace 8.1%, DF 2.6%",

returnStats: "RPW 35.8%, Break rate 19.4% — below tour average",

bpStats: "Break point conversion 35.2%, Save rate 61.8%",

overallStats: "DR 1.08, TPW 51.0%, Tiebreak 44.0% — significant weakness",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 (source: Tennis Abstract — very limited top-15 record)",

fullNote: "At 19, Fonseca is the youngest player in the top 20. His hElo of 1904 ranks #14 — elite for his age on hard. The glaring weakness is tiebreaks at 44% — well below average. He loses more tiebreaks than he wins, which caps his ceiling in tight matches. BP conversion (35.2%) is the lowest in the top 20. Enormous upside but raw.",

surfaceNote: {

hard: "Hard Elo #14 — exceptional for a 19-year-old.",

clay: "Clay Elo #29 — developing.",

grass: "Grass Elo #43 — very limited grass experience.",

},

},

Paul: {

eloRank: 19,

elo: 1905,

hElo: 1850.5,

hEloRank: 21,

cElo: 1843.0,

cEloRank: 17,

gElo: 1750.1,

gEloRank: 21,

peakElo: 2028.8,

peakMonth: "2025-05",

yEloRank: 12,

yElo2026: 1897.1,

record2026: "12-6 — #12 in-season form. Solid 2026.",

record: "29-15 (65.9%) last 52 weeks",

style: "All-court baseliner",

strengths: "Consistency, return game, two-handed backhand",

serveStats: "Hold 83.5%, Ace 7.5%, DF 2.4% — low DF rate",

returnStats: "RPW 37.9%, Break rate 23.6% — above tour average",

bpStats: "Break point conversion 42.0%, Save rate 64.6%",

overallStats: "DR 1.12, TPW 51.8%, Tiebreak 57.1%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 (source: Tennis Abstract — limited top-15 record)",

fullNote: "One of the most balanced profiles in the top 20. Low DF rate (2.4%), solid break rate (23.6% — above average), BP conversion 42%. Clay Elo #17 is surprisingly strong — he is not a pure hard court specialist. DR 1.12 is solid. A reliable, consistent player without glaring weaknesses.",

surfaceNote: {

hard: "Hard Elo #21 — solid.",

clay: "Clay Elo #17 — stronger on clay than his reputation suggests.",

grass: "Grass Elo #21 — capable on all surfaces.",

},

},

Fokina: {

eloRank: 20,

elo: 1904,

hElo: 1857.9,

hEloRank: 19,

cElo: 1821.3,

cEloRank: 22,

gElo: 1729.8,

gEloRank: 27,

peakElo: 1934.8,

peakMonth: "2025-07",

yEloRank: 31,

yElo2026: 1822.5,

record2026: "9-6 — Decent but not elite form.",

record: "40-25 (61.5%) last 52 weeks",

style: "Aggressive clay court baseliner",

strengths: "Heavy topspin, clay court movement, forehand",

serveStats: "Hold 81.8%, Ace 4.9% — low ace rate, DF 2.6%",

returnStats: "RPW 38.2%, Break rate 24.9% — above tour average",

bpStats: "Break point conversion 43.2%, Save rate 68.2%",

overallStats: "DR 1.07, TPW 51.4%, Tiebreak 48.5% — below average",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs De Minaur 1-4 (source: Tennis Abstract — limited top-15 record)",

fullNote: "Strong return game — 38.2% RPW and 43.2% BP conversion are both solid. But tiebreaks at 48.5% is a liability — he loses more tiebreaks than he wins. Low ace rate (4.9%) means he can't bail himself out with free points. Best on clay where his topspin and movement neutralize big servers.",

surfaceNote: {

hard: "Hard Elo #19 — solid but not elite. Miami suits him reasonably.",

clay: "Clay Elo #22 — genuine clay threat.",

grass: "Grass Elo #27 — limited grass upside.",

},

},

Rublev: {

eloRank: 21,

elo: 1896,

hElo: 1852.7,

hEloRank: 20,

cElo: 1856.3,

cEloRank: 16,

gElo: 1797.6,

gEloRank: 12,

peakElo: 2122.1,

peakMonth: "2021-04",

yEloRank: 21,

yElo2026: 1854.0,

record2026: "10-5 — Solid but well below his 2021 peak.",

record: "35-24 (59.3%) last 52 weeks",

style: "Aggressive baseliner",

strengths: "Forehand, work rate, consistency",

serveStats: "Hold 84.3%, Ace 10.1%, DF 3.7%",

returnStats: "RPW 37.2%, Break rate 21.9% — slightly above tour average",

bpStats: "Break point conversion 38.7%, Save rate 64.3%",

overallStats: "DR 1.12, TPW 51.7%, Tiebreak 53.3%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 · vs De Minaur 0-0 · vs FAA 0-0 · vs Shelton 0-0 · vs Fritz 0-0 · vs Ruud 0-0 (source: Tennis Abstract — H2H not in top-15 matrix)",

fullNote: "Career peak of 2122 in April 2021 — he is now 226 points below that. DR 1.12 is solid but tiebreaks at 53.3% reveal a player who struggles in the clutch — consistent with his reputation. Grass Elo #12 is a hidden strength. His forehand is elite but his mental game in big moments has been a recurring issue.",

surfaceNote: {

hard: "Hard Elo #20 — solid.",

clay: "Clay Elo #16 — strong on clay, consistent results at Roland Garros.",

grass: "Grass Elo #12 — underrated on grass.",

},

},

Lehecka: {

eloRank: 22,

elo: 1887,

hElo: 1834.6,

hEloRank: 24,

cElo: 1780.3,

cEloRank: 31,

gElo: 1775.9,

gEloRank: 15,

peakElo: 1989.9,

peakMonth: "2025-10",

yEloRank: 69,

yElo2026: 1717.8,

record2026: "6-5 — Below his best in 2026.",

record: "34-23 (59.6%) last 52 weeks",

style: "Big serving baseliner",

strengths: "Serve, forehand, power",

serveStats: "Hold 83.5%, Ace 10.6%, DF 3.0%",

returnStats: "RPW 35.3%, Break rate 20.0% — just below tour average",

bpStats: "Break point conversion 41.3%, Save rate 60.6% — below average",

overallStats: "DR 1.05, TPW 50.8%, Tiebreak 51.9% — near coin-flip",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 (source: Tennis Abstract — limited top-15 record)",

fullNote: "Grass Elo #15 is his best surface ranking — big servers thrive at Wimbledon. His BP save rate (60.6%) is below average which is a vulnerability when opponents get opportunities. Tiebreaks at 51.9% is essentially coin-flip. yElo rank #69 in 2026 signals he is below his best form right now.",

surfaceNote: {

hard: "Hard Elo #24 — solid.",

clay: "Clay Elo #31 — below average on clay.",

grass: "Grass Elo #15 — his best surface. Watch at Wimbledon.",

},

},

Cerundolo: {

eloRank: 23,

elo: 1884,

hElo: 1836.8,

hEloRank: 23,

cElo: 1857.6,

cEloRank: 15,

gElo: 1664.3,

gEloRank: 52,

peakElo: 1961.6,

peakMonth: "2025-04",

yEloRank: 30,

yElo2026: 1823.5,

record2026: "11-5 — Solid season.",

record: "36-24 (60.0%) last 52 weeks",

style: "Clay court baseliner",

strengths: "Topspin, clay court footwork, competitive mentality",

serveStats: "Hold 76.9%, Ace 4.9% — very low, DF 3.6%",

returnStats: "RPW 40.3%, Break rate 28.8% — well above tour average",

bpStats: "Break point conversion 43.0%, Save rate 62.7%",

overallStats: "DR 1.08, TPW 51.5%, Tiebreak 68.2%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Musetti 0-0 (source: Tennis Abstract — limited top-15 record)",

fullNote: "Return game is elite — 40.3% RPW and 28.8% break rate are both well above average. 68.2% tiebreak rate is strong. His grass Elo (#52) reveals a player who is essentially a clay and hard court specialist. Low ace rate (4.9%) means his serve is a liability on fast surfaces. A genuine clay court threat.",

surfaceNote: {

hard: "Hard Elo #23 — solid.",

clay: "Clay Elo #15 — genuine threat at Roland Garros.",

grass: "Grass Elo #52 — significant weakness on grass.",

},

},

Norrie: {

eloRank: 24,

elo: 1865,

hElo: 1812.5,

hEloRank: 29,

cElo: 1833.1,

cEloRank: 19,

gElo: 1753.1,

gEloRank: 20,

peakElo: 2028.6,

peakMonth: "2022-08",

yEloRank: 24,

yElo2026: 1835.4,

record2026: "9-6 — Steady form.",

record: "36-25 (59.0%) last 52 weeks",

style: "Left-handed defensive baseliner",

strengths: "Consistency, retrieval, left-handed slice",

serveStats: "Hold 81.8%, Ace 5.9% — low, DF 2.8%",

returnStats: "RPW 36.1%, Break rate 19.6% — below tour average",

bpStats: "Break point conversion 38.2%, Save rate 67.0%",

overallStats: "DR 1.02, TPW 50.4%, Tiebreak 58.1%",

h2h: "vs Alcaraz 0-0 · vs Sinner 0-0 · vs Djokovic 0-0 · vs Zverev 0-0 · vs Medvedev 0-0 · vs Ruud 0-2 · vs Khachanov 2-1 (source: Tennis Abstract — limited top-15 record)",

fullNote: "DR 1.02 is the lowest in the top 25 — he barely wins more points than he loses, which explains why he beats lower-ranked players comfortably but struggles against the elite. Clay Elo #19 and grass Elo #20 show he is genuinely multi-surface. Low ace rate (5.9%) and below-average break rate (19.6%) are his main limitations.",

surfaceNote: {

hard: "Hard Elo #29 — below average in top 25.",

clay: "Clay Elo #19 — strong on clay.",

grass: "Grass Elo #20 — benefits from left-handed serve at Wimbledon.",

},

},

Khachanov: {

eloRank: 25,

elo: 1863,

hElo: 1804.3,

hEloRank: 31,

cElo: 1827.5,

cEloRank: 21,

gElo: 1759.7,

gEloRank: 19,

peakElo: 2029.5,

peakMonth: "2018-10",

yEloRank: 78,

yElo2026: 1700.8,

record2026: "6-6 — Below his best. yElo #78 is a significant concern.",

record: "34-24 (58.6%) last 52 weeks",

style: "Power baseliner",

strengths: "Forehand, physicality, big points",

serveStats: "Hold 84.0%, Ace 8.6%, DF 2.6%",

returnStats: "RPW 36.6%, Break rate 21.5% — slightly above tour average",

bpStats: "Break point conversion 39.7%, Save rate 64.0%",

overallStats: "DR 1.10, TPW 51.4%, Tiebreak 42.4% — worst in top 25",

h2h: "vs Alcaraz 0-6 · vs Sinner 1-4 · vs Djokovic 1-9 · vs Zverev 3-6 · vs Musetti 0-1 · vs De Minaur 2-2 · vs FAA 2-2 · vs Shelton 0-2 · vs Fritz 0-2 · vs Medvedev 2-7 · vs Ruud 2-1 · vs Mensik 2-0 · vs Cobolli 1-0 (source: Tennis Abstract H2H matrix)",

fullNote: "Tiebreak rate of 42.4% is the worst in the top 25 — he loses significantly more tiebreaks than he wins. This is his career-defining weakness. yElo #78 in 2026 suggests real form concerns. DR 1.10 is solid when he is on but his peak was back in 2018. Grass Elo #19 is a hidden strength for Wimbledon.",

surfaceNote: {

hard: "Hard Elo #31 — below average in top 25.",

clay: "Clay Elo #21 — solid on clay.",

grass: "Grass Elo #19 — underrated on grass.",

},

},

},

wta: {

Sabalenka: {

eloRank: 1,

elo: 2247,

hElo: 2203.9,

hEloRank: 1,

cElo: 2142.8,

cEloRank: 1,

gElo: 2000.2,

gEloRank: 1,

peakElo: 2247.1,

peakMonth: "2026-03",

yEloRank: 1,

yElo2026: 2199.2,

record2026: "17-1 — Dominant. Won Indian Wells. #1 in-season form by a wide margin.",

record: "63-9 (87.5%) last 52 weeks",

style: "Power baseliner",

strengths: "Serve power, forehand aggression, hard court dominance",

serveStats: "Hold 79.9%, Ace 6.6%, DF 3.3% — lowest DF rate among top 5",

returnStats: "RPW 45.3%, Break rate 38.0% — above tour avg of 35.8%",

bpStats: "Break point conversion 44.5%, Save rate 66.0% — best save rate in top 5",

overallStats: "DR 1.22, TPW 54.0%, Tiebreak 92.3% — 24-2 record, historically extraordinary",

h2h: "vs Swiatek 5-8 · vs Rybakina 8-7 · vs Gauff 6-6 · vs Pegula 9-3 · vs Svitolina 6-1 · vs Anisimova 6-5 (source: Tennis Abstract)",

fullNote: "The most complete player on the WTA tour statistically. 87.5% win rate, elite on both serve (lowest DF in top 5) and return. Her 38% break rate and 45.3% RPW are elite numbers. Just won Indian Wells and arrives as Miami favorite at 35.4%.",

miamiNote: "Just won Indian Wells, arrives as Miami favorite at 35.4%. Her stats are elite — more winners than errors, rare for a top player. Hard courts are her domain.",

surfaceNote: {

hard: "Premier hard court force in women's tennis. Won Miami 2023, Indian Wells 2026, Australian Open 2024 and 2025.",

clay: "Solid on clay but Swiatek and topspin players can neutralize her power.",

grass: "Good on grass — her flat serve is devastating on fast surfaces.",

},

},

Rybakina: {

eloRank: 2,

elo: 2163,

hElo: 2124.3,

hEloRank: 2,

cElo: 2006.4,

cEloRank: 4,

gElo: 1915.4,

gEloRank: 3,

peakElo: 2176.7,

peakMonth: "2026-02",

yEloRank: 3,

yElo2026: 2124.2,

record2026: "17-4 — Strong volume and quality. #3 in-season form.",

record: "61-17 (78.2%) last 52 weeks",

style: "Power server, flat hitter",

strengths: "Biggest serve in women's tennis — 10.3% ace rate tops the tour, flat groundstrokes, composure",

serveStats: "Hold 83.6% — best on tour, Ace 10.3% — highest on tour by far, DF 3.7%",

returnStats: "RPW 42.7%, Break rate 33.0% — below tour average of 35.8%",

bpStats: "Break point conversion 45.3%, Save rate 66.7%",

overallStats: "DR 1.23, TPW 53.7%, Tiebreak 56.0% — near average",

h2h: "vs Sabalenka 7-8 · vs Swiatek 6-6 · vs Gauff 1-0 · vs Pegula 4-3 (source: Tennis Abstract)",

fullNote: "Best hold rate on tour (83.6%) and highest ace rate (10.3%) by a wide margin. Her serve is her dominant weapon. Return is slightly below tour average — her only relative weakness. Hard courts amplify her flat serve.",

miamiNote: "Hard courts suit her flat hitting. Her serve is the most dominant weapon in women's tennis. Always a threat to win big hard court events.",

surfaceNote: {

hard: "Strong on hard — flat serve is devastating.",

clay: "Less dominant on clay — topspin players slow her down.",

grass: "Her best surface — Wimbledon champion 2022.",

},

},

Swiatek: {

eloRank: 3,

elo: 2110,

hElo: 2055.5,

hEloRank: 4,

cElo: 2054.3,

cEloRank: 2,

gElo: 1950.7,

gEloRank: 2,

peakElo: 2291.0,

peakMonth: "2024-07",

yEloRank: 7,

yElo2026: 1957.7,

record2026: "12-5 — Significantly underperforming vs career level. #7 yElo is her weakest season start in years.",

record: "56-17 (76.7%) last 52 weeks",

style: "Heavy topspin baseliner",

strengths: "Forehand topspin, consistency, mental strength, elite return game",

serveStats: "Hold 75.1% — below tour average of 70.9% adjusted, Ace 5.6%, DF 5.1% — high",

returnStats: "RPW 47.3%, Break rate 43.8% — #1 on tour, 22% above tour average",

bpStats: "Break point conversion 51.2% — best on tour, Save rate 58.5% — below tour average",

overallStats: "DR 1.23, TPW 54.3%, Tiebreak 75.0%",

h2h: "vs Sabalenka 8-5 · vs Rybakina 6-6 · vs Gauff 11-5 · vs Pegula 6-5 · vs Anisimova 2-1 (source: Tennis Abstract)",

fullNote: "The best returner in women's tennis — 47.3% RPW and 43.8% break rate are both #1 on tour. Her serve is actually a relative weakness (75.1% hold, high DF) which is why aggressive servers like Sabalenka and Rybakina can exploit her. She wins matches by dominating return games.",

miamiNote: "Won Miami 2022. The slower Miami hard courts play closer to her preferred clay conditions. Dangerous but can be exposed by Sabalenka-level aggression.",

surfaceNote: {

hard: "Very strong but not untouchable — Sabalenka has her number on hard.",

clay: "Greatest clay player active — Roland Garros champion 4 times.",

grass: "Weaker on grass — tends to exit earlier at Wimbledon.",

},

},

Pegula: {

eloRank: 4,

elo: 2094,

hElo: 2056.0,

hEloRank: 3,

cElo: 1909.1,

cEloRank: 8,

gElo: 1876.9,

gEloRank: 5,

peakElo: 2101.6,

peakMonth: "2026-03",

yEloRank: 2,

yElo2026: 2131.5,

record2026: "16-3 — BEST SEASON OF HER CAREER. #2 in-season form, ahead of Rybakina and Swiatek. Massively underrated coming into Miami.",

record: "54-21 (72.0%) last 52 weeks",

style: "Aggressive baseliner",

strengths: "Forehand power, hard court consistency, low error rate",

serveStats: "Hold 75.0%, Ace 4.6%, DF 3.0% — second lowest in top 5",

returnStats: "RPW 45.1%, Break rate 38.1% — above tour average",

bpStats: "Break point conversion 45.1%, Save rate 59.8%",

overallStats: "DR 1.17, TPW 53.0%, Tiebreak 47.6% — below average, notable weakness",

h2h: "vs Sabalenka 3-9 · vs Swiatek 5-6 · vs Rybakina 3-4 · vs Gauff 8-5 (source: Tennis Abstract)",

fullNote: "Consistent and disciplined on both sides. 38.1% break rate and 45.1% RPW are both elite. Very low DF rate (3.0%) means she rarely self-destructs. Her game is not spectacular but it is extremely reliable — she beats herself very rarely.",

miamiNote: "Hard courts are her best surface. Disciplined and consistent — she stays in rallies and relies on opponents making mistakes, which works well on slower Miami hard courts.",

surfaceNote: {

hard: "Strong on hard courts — consistently reaches deep at major hard court events.",

clay: "Competitive but clay is not her peak surface.",

grass: "Below her ranking on grass.",

},

},

Gauff: {

eloRank: 5,

elo: 2074,

hElo: 2017.0,

hEloRank: 6,

cElo: 2044.5,

cEloRank: 3,

gElo: 1842.7,

gEloRank: 6,

peakElo: 2155.7,

peakMonth: "2024-01",

yEloRank: 14,

yElo2026: 1909.8,

record2026: "11-5 — Underperforming relative to career level. #14 yElo is well below expectations.",

record: "48-17 (73.8%) last 52 weeks",

style: "Athletic all-court player",

strengths: "Return game is her primary weapon. Elite break point conversion and first-strike return patterns.",

},

Mboko: {

eloRank: 6, elo: 2072,

hElo: 2037.4, hEloRank: 5, cElo: 1862.4, cEloRank: 10, gElo: 1749.6,
gEloRank: 21,

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

fullNote: "A 20-year-old Canadian rising fast. 71.7% win rate at Elo rank 6 is impressive. Her 7.1% DF rate is high and will be a limiting factor against elite players. Break rate (38.2%) is above tour average which shows her return game is developing well.",

miamiNote: "A rapidly rising Canadian at 20 years old. Her Elo of 2072 places her firmly in title contention territory. Limited Miami track record but her form in 2026 has been exceptional.",

surfaceNote: { hard: "Most of her best results on hard courts.", clay:
"Still developing on clay.", grass: "Limited grass record." },

rallyProfile: { short: { pct: 33, winPct: 54 }, medium: { pct: 37,
winPct: 52 }, long: { pct: 30, winPct: 50 }, profile: "20-year-old rising fast. Elo rank 6. 7.1% DF rate and 37.5% tiebreak rate are the current limiting factors.", bettingAngle: "Back on hard courts — 16-5 in 2026 is legitimate. Fade in tiebreaks (37.5% alarming)." }

},

Anisimova: {

eloRank: 7, elo: 2050,

hElo: 2001.5, hEloRank: 8, cElo: 1862.0, cEloRank: 11, gElo: 1885.6,
gEloRank: 4,

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

h2h: "vs Sabalenka 6-5 · vs Swiatek 2-1 · vs Gauff 3-4 (source: Tennis Abstract)",

fullNote: "Solid all-round numbers — 38.4% break rate and 45.2% RPW are both above tour average. High DF rate (5.9%) is the risk — she can lose serve unexpectedly. When on she can beat anyone; when off her DF rate derails matches.",

miamiNote: "Dangerous draw threat with big upside and real downside risk. When she hits her spots she can beat anyone. When she is off she gifts games away.",

surfaceNote: { hard: "Best surface — flat hitting works well.", clay:
"Less consistent on clay.", grass: "Capable when hitting cleanly." },

rallyProfile: { short: { pct: 34, winPct: 54 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Aggressive flat hitter. DF rate (5.9%) is the risk.", bettingAngle: "Dangerous on hard courts. DF props are live. Back when hitting her spots." }

},

Svitolina: {

eloRank: 8, elo: 2049,

hElo: 1993.6, hEloRank: 9, cElo: 1955.7, cEloRank: 5, gElo: 1826.0,
gEloRank: 7,

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

h2h: "vs Sabalenka 1-6 · vs Swiatek 1-4 · vs Rybakina 1-3 (source: Tennis Abstract)",

fullNote: "Excellent 76.7% win rate, elite return game (41.3% break rate, well above 35.8% average). Her RPW of 46.0% is 5th on tour. The most underrated player in the top 10 statistically — her numbers suggest she should be ranked higher.",

miamiNote: "A steady competitor who makes opponents beat her cleanly. Her consistency makes her difficult to dispatch in best-of-three formats and she has the experience to go deep.",

surfaceNote: { hard: "Solid on hard — consistency keeps her competitive.", clay: "Good on clay — works hard for every point.",
grass: "Strong on grass — has made deep Wimbledon runs." },

rallyProfile: { short: { pct: 26, winPct: 50 }, medium: { pct: 36,
winPct: 54 }, long: { pct: 38, winPct: 57 }, profile: "Counter-punching defensive baseliner. Long-rally win rate (57%) elite — gets stronger as matches grind.", bettingAngle: "Best WTA long-match lean. yElo #4 in 2026 massively underrated by the market." }

},

Muchova: {

eloRank: 9, elo: 2041,

hElo: 2012.0, hEloRank: 7, cElo: 1843.7, cEloRank: 12, gElo: 1767.0,
gEloRank: 14,

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

h2h: "vs Sabalenka 1-4 · vs Swiatek 2-5 · vs Rybakina 1-2 · vs Gauff 2-2 (source: Tennis Abstract)",

fullNote: "Low DF rate (2.7%) shows she keeps the ball in play well. Creative all-court player who improves as rallies develop. Best form of her career in 2026.",

miamiNote: "Creative and unpredictable. Her variety makes her difficult to pattern-play. Best form of her career in 2026.",

surfaceNote: { hard: "Strong on hard courts — her variety translates well.", clay: "Excellent on clay — drop shots and slice are maximized.",
grass: "Strong on grass — her net play and variety shine." },

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Creative all-court player who improves as rallies develop. 2.7% DF rate means she rarely self-destructs.", bettingAngle: "Best form of her career in 2026 (14-3, yElo #6). Back in any condition that allows variety." }

},

Kasatkina: {

eloRank: 9, elo: 0,

record: "42-23",

style: "Aggressive baseline grinder who relies on break points and consistency rather than power.",

strengths: "Elite break point conversion at 49.4% with solid hold percentage (53.9%); hard court specialist (26-17 record) with 1.29 dominance ratio; tiebreak player at 58.3% TB win rate.",

weaknesses: "Low ace rate (2.3%) and first serve percentage (66.5%) limit holding patterns; modest first serve win rate (61%).",

serveStats: "Hold 53.9%, Ace 2.3%, DF 7%, 1stIn 66.5%, 1stWon 61%",

returnStats: "Break 49.4%, TB 58.3%, DR 1.29",

overallStats: "Hard 26-17 · Clay 8-4 · Grass 8-2",

fullNote: "Kasatkina's 49.4% break rate is elite-level but she only holds serve 53.9%, creating coin-flip sets. Her 58.3% tiebreak rate combined with modest serve makes over games appealing when facing top servers.",

hardCourtNote: "Dominant hard court performer (60% win rate) where her baseline control and break point aggression thrive.",

rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 37,
winPct: 54 }, long: { pct: 35, winPct: 55 }, profile: "Smart baseliner who improves as rallies develop. Long-rally edge compounds on slow surfaces.", bettingAngle: "Back in grinding conditions and on clay. Fade on fast hard courts where short points neutralize her game." }

},

Krejcikova: {

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

rallyProfile: { short: { pct: 30, winPct: 51 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Grass and clay specialist. 44.8% break rate and 81.8% tiebreak rate exceptional. Hard court weakness (9-9) is real.", bettingAngle: "On grass one of the best WTA value plays. Tiebreak rate (81.8%) automatic in close sets on preferred surfaces." }

},

"Danielle Collins": {

eloRank: 11, elo: 0, record: "38-17",

style: "Aggressive baseline player leveraging high break percentage and tiebreak success.",

strengths: "Elite 48.7% break rate and 85.7% tiebreak conversion; strong 70% first serve win rate.",

weaknesses: "Below-average ace production (5.3%); inconsistent first serve percentage (57.9%).",

serveStats: "Hold 61.5%, Ace 5.3%, DF 6.6%, 1stIn 57.9%, 1stWon 70%",

returnStats: "Break 48.7%, TB 85.7%, DR 1.38",

overallStats: "Hard 16-11 · Clay 19-5 · Grass 3-1",

fullNote: "Collins' 48.7% break rate is elite territory. Her 85.7% tiebreak rate suggests heavy action in close sets. Hard court specialization (16-11) with clay dominance (19-5).",

hardCourtNote: "Dominates hard courts with 16-11 record, converting break opportunities at elite rates.",

rallyProfile: { short: { pct: 34, winPct: 55 }, medium: { pct: 37,
winPct: 55 }, long: { pct: 29, winPct: 53 }, profile: "Aggressive baseliner with elite return game. Wins across all rally lengths.",
bettingAngle: "Live in any rally condition. Tiebreak dominance (85.7%) makes her one of the best bets in close sets." }

},

"Paula Badosa": {

eloRank: 12, elo: 0, record: "37-19",

style: "Aggressive baseline player with solid serve and excellent break point conversion.",

strengths: "48.5% break rate (elite level), 69.3% first serve win rate, 1.32 double break ratio.",

weaknesses: "Below-average ace rate at 6.5%; 7.6% double fault rate.",

serveStats: "Hold 64.1%, Ace 6.5%, DF 7.6%, 1stIn 57.2%, 1stWon 69.3%",

returnStats: "Break 48.5%, TB 57.1%, DR 1.32",

overallStats: "Hard 26-12 · Clay 6-5 · Grass 5-2",

fullNote: "Sharp angle: target her 48.5% break rate in prop bets. Hard courts where she thrives offer solid value.",

hardCourtNote: "Dominates hard courts with 26-12 record (68.4% win rate).",

rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 38,
winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Hard court specialist with balanced rally profile. All three bands positive.",
bettingAngle: "Solid lean on hard courts in best-of-3. No glaring rally weakness." }

},

"Diana Shnaider": {

eloRank: 13, elo: 0, record: "43-21",

style: "Aggressive baseline player with above-average serve consistency and strong tiebreak execution.",

strengths: "Elite tiebreak conversion (77.8%); hard court dominance (26-13 record); break point conversion (48%) above tour average.",

weaknesses: "Low ace rate (2.9%) and modest hold percentage (54.9%); double fault rate (3.7%).",

serveStats: "Hold 54.9%, Ace 2.9%, DF 3.7%, 1stIn 64.2%, 1stWon 64.5%",

returnStats: "Break 48%, TB 77.8%, DR 1.34",

overallStats: "Hard 26-13 · Clay 8-5 · Grass 9-3",

fullNote: "Shnaider's 77.8% tiebreak rate is sharp leverage in extended matches. Back her in three-set formats where her break conversion and volatile hold create unpredictable scorelines.",

hardCourtNote: "Hard court record of 26-13 (67% win rate) demonstrates this is her most profitable surface.",

rallyProfile: { short: { pct: 32, winPct: 53 }, medium: { pct: 37,
winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Aggressive baseliner with elite tiebreak rate (77.8%). All rally bands positive.",
bettingAngle: "Back in tiebreak-heavy matchups — 77.8% tiebreak rate is elite." }

},

"Anna Kalinskaya": {

eloRank: 14, elo: 0, record: "33-19",

style: "Aggressive baseliner who relies on consistent first-serve placement and break point conversion.",

strengths: "Exceptional break point conversion at 42.7%; dominant on hard courts (65% win rate); reliable hold percentage at 58.7%.",

weaknesses: "Low ace percentage (2.5%); clay court struggles (33% win rate); tiebreak execution at 50%.",

serveStats: "Hold 58.7%, Ace 2.5%, DF 5.2%, 1stIn 67%, 1stWon 64%",

returnStats: "Break 42.7%, TB 50%, DR 1.27",

overallStats: "Hard 24-13 · Clay 2-4 · Grass 7-2",

fullNote: "Kalinskaya's 42.7% break rate is elite but her 58.7% hold is merely average. On hard courts her elevated break percentage compensates for weak ace generation.",

hardCourtNote: "Thrives on hard courts with 24-13 record.",

rallyProfile: { short: { pct: 31, winPct: 52 }, medium: { pct: 38,
winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Return-heavy player. 42.7% break rate is elite.", bettingAngle: "Back vs serve-first players who can't sustain rallies. Hard court dominance (24-13) reliable." }

},

"Jelena Ostapenko": {

eloRank: 15, elo: 0, record: "29-18",

style: "Aggressive baseline striker who relies on powerful groundstrokes.",

strengths: "Elite break point conversion at 47.4% with strong hard court form (18-10 record); ace production at 5.7%.",

weaknesses: "Double fault rate of 7.5%; modest 58.4% first serve percentage.",

serveStats: "Hold 56.7%, Ace 5.7%, DF 7.5%, 1stIn 58.4%, 1stWon 65.7%",

returnStats: "Break 47.4%, TB 70%, DR 1.23",

overallStats: "Hard 18-10 · Clay 6-5 · Grass 5-3",

fullNote: "Ostapenko's 47.4% break conversion is elite-tier for WTA. Exploit her 7.5% DF% in tiebreaks and pressure sets.",

hardCourtNote: "Hard courts showcase her best results with 18-10 record.",

rallyProfile: { short: { pct: 40, winPct: 58 }, medium: { pct: 35,
winPct: 51 }, long: { pct: 25, winPct: 43 }, profile: "Feast-or-famine flat hitter. Long-rally rate (43%) worst in WTA top 20.", bettingAngle:
"Vs clay grinders is terrible for her. Against big servers on fast hard she can explode. DF props almost always live." }

},

"Mirra Andreeva": {

eloRank: 16, elo: 0, record: "34-16",

style: "Aggressive baseline player with above-average break conversion who relies on consistency over power.",

strengths: "51.6% break rate significantly outperforms tour average; solid hold efficiency.",

weaknesses: "Low ace rate (4.1%); grass court struggles (0-2).",

serveStats: "Hold 51.3%, Ace 4.1%, DF 3.9%, 1stIn 64.1%, 1stWon 64.2%",

returnStats: "Break 51.6%, TB 100%, DR 1.36",

overallStats: "Hard 18-9 · Clay 16-5 · Grass 0-2",

fullNote: "Andreeva's elite 51.6% break rate creates favorable break-point asymmetry. Sharp edge in break-point props against serve-dependent opponents.",

hardCourtNote: "Dominates hard courts (18-9 record, 66.7%).",

rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Young baseliner whose long-rally game (55%) is already her primary weapon. 51.6% break rate elite.", bettingAngle: "Back in slow conditions and long matches. Profile improves with age." }

},

"Beatriz Haddad Maia": {

eloRank: 17, elo: 0, record: "38-27",

style: "Aggressive baseline player who relies on break point conversion and tiebreak proficiency.",

strengths: "Elite break conversion at 47.3% with strong tiebreak performance at 72.7%.",

weaknesses: "Inconsistent hold percentage at 58.6%; low ace rate of 3.1%.",

serveStats: "Hold 58.6%, Ace 3.1%, DF 4.8%, 1stIn 65.5%, 1stWon 64.6%",

returnStats: "Break 47.3%, TB 72.7%, DR 1.17",

overallStats: "Hard 25-17 · Clay 7-6 · Grass 3-3",

fullNote: "Sharp edge in break point situations (47.3%) makes her valuable in tighter sets and tiebreaks (72.7% conversion).",

hardCourtNote: "Dominates hard courts (25-17 record).",

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 34, winPct: 55 }, profile: "Aggressive clay baseliner who improves in longer rallies. 47.3% break rate and 72.7% tiebreak rate strong.", bettingAngle: "Reliable lean on clay in grinding matches. Fade on fast surfaces." }

},

"Marta Kostyuk": {

eloRank: 18, elo: 0, record: "36-20",

style: "Aggressive baseline player with strong return game.",

strengths: "Elite break percentage at 46.3%; hard court specialist with 68.4% win rate (26-12).",

weaknesses: "Low ace percentage (3.9%) and moderate hold percentage (54.8%); high double fault rate at 8.9%.",

serveStats: "Hold 54.8%, Ace 3.9%, DF 8.9%, 1stIn 59%, 1stWon 64.1%",

returnStats: "Break 46.3%, TB 71.4%, DR 1.29",

overallStats: "Hard 26-12 · Clay 8-5 · Grass 2-3",

fullNote: "Kostyuk's 46.3% break rate is elite-level. On hard courts her 68% conversion rate paired with poor hold% (54.8%) sets up profitable break games props.",

hardCourtNote: "Dominates hard courts with nearly 70% win rate.",

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Return-heavy baseliner with elite break conversion (46.3%). Hard court dominant.",
bettingAngle: "Back on hard courts — 26-12 record and DR 1.29 are legitimate." }

},

"Donna Vekic": {

eloRank: 19, elo: 0, record: "33-20",

style: "Aggressive baseline player who relies on court positioning and consistency.",

strengths: "Excellent grass court record (11-4, 73% win rate); strong serving fundamentals (71% first serve points won).",

weaknesses: "Below-average break point conversion (43.4%); moderate first serve percentage (56.9%).",

serveStats: "Hold 54.4%, Ace 6.1%, DF 6.3%, 1stIn 56.9%, 1stWon 71%",

returnStats: "Break 43.4%, TB 42.9%, DR 1.25",

overallStats: "Hard 14-11 · Clay 8-5 · Grass 11-4",

fullNote: "Vekic's 71% first serve points won masks a 56.9% first serve percentage. Grass is her best surface with an 11-4 record.",

hardCourtNote: "Hard court represents her most significant playing surface with 14-11 record.",

rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 38,
winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Consistent all-court player with no obvious rally weakness. Grass is her best surface.", bettingAngle: "Underrated on grass — 11-4 record is legitimate." }

},

"Victoria Azarenka": {

eloRank: 20, elo: 0, record: "30-15",

style: "Aggressive baseline player who leverages above-average break conversion.",

strengths: "Exceptional hard court win-rate (66.7%); elite break percentage (45.7%); consistent hold percentage (60.3%).",

weaknesses: "Weak ace generation (3.7%) and elevated double fault rate (5.4%); tiebreak conversion (55.6%).",

serveStats: "Hold 60.3%, Ace 3.7%, DF 5.4%, 1stIn 64.9%, 1stWon 66.4%",

returnStats: "Break 45.7%, TB 55.6%, DR 1.33",

overallStats: "Hard 20-10 · Clay 7-4 · Grass 3-1",

fullNote: "Azarenka's 45.7% break rate is a sharp edge for return-game-dependent props. Target break point overs on hard courts where her 66.7% win rate carries value.",

hardCourtNote: "Hard court dominance shows 20-10 record with 66.7% conversion rate.",

rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 36,
winPct: 54 }, long: { pct: 36, winPct: 56 }, profile: "Classic aggressive baseliner who gets stronger as rallies extend. 45.7% break rate elite.", bettingAngle: "Back in grinding hard court matches. Her break rate and long-rally profile both elite for her ranking tier." }

},

"Madison Keys": {

eloRank: 21, elo: 0, record: "25-12",

style: "Aggressive baseline player who leverages elite serve power and high first-serve win rate.",

strengths: "Exceptional first-serve dominance (65.8% 1stWon) and break conversion (43.6%); clay court specialist (13-4 record); tiebreak proficiency (72.7%).",

weaknesses: "Double fault rate (3.9%) and hold percentage (60.2%).",

serveStats: "Hold 60.2%, Ace 5.4%, DF 3.9%, 1stIn 69%, 1stWon 65.8%",

returnStats: "Break 43.6%, TB 72.7%, DR 1.35",

overallStats: "Hard 7-6 · Clay 13-4 · Grass 5-2",

fullNote: "Keys' 43.6% break rate paired with 1.35 double break ratio creates edge in set-building. Clay record (13-4) is a genuine surprise.",

hardCourtNote: "7-6 hard court record trails her clay success.",

rallyProfile: { short: { pct: 37, winPct: 57 }, medium: { pct: 36,
winPct: 54 }, long: { pct: 27, winPct: 50 }, profile: "Power hitter with short-point lean. DR 1.35 strong overall.", bettingAngle: "Dangerous in best-of-3 on any surface in current form. Over aces and under total games on fast courts." }

},

"Emma Navarro": {

eloRank: 22, elo: 0, record: "45-22",

style: "Aggressive baseline player with strong return game.",

strengths: "47.2% break rate significantly outperforms tour average; 68% hard court win rate.",

weaknesses: "Low ace rate (1.9%); 44.4% tiebreak rate suggests vulnerability in close sets.",

serveStats: "Hold 55.1%, Ace 1.9%, DF 3.1%, 1stIn 65.7%, 1stWon 63.7%",

returnStats: "Break 47.2%, TB 44.4%, DR 1.35",

overallStats: "Hard 30-13 · Clay 8-6 · Grass 7-3",

fullNote: "Sharp edge lies in break point scenarios. Her 47.2% break rate combined with 65.7% first serve creates exploitable return leverage. Hard court 70% win rate.",

hardCourtNote: "Navarro owns 30-13 hard court record with elevated break conversion.",

rallyProfile: { short: { pct: 30, winPct: 52 }, medium: { pct: 38,
winPct: 53 }, long: { pct: 32, winPct: 53 }, profile: "Emerging American baseliner with balanced rally profile. All three bands positive.",
bettingAngle: "Live underdog on any hard court in best-of-3. yElo trend still moving upward — buy low." }

},

"Magdalena Frech": {

eloRank: 25, elo: 0, record: "29-27",

style: "Aggressive baseline player who relies on break point conversion and consistent first-serve execution.",

strengths: "Exceptional break point conversion (40.6%); strong first serve consistency (64.4%).",

weaknesses: "Below-average hold percentage (52.9%); limited ace production (3.1%).",

serveStats: "Hold 52.9%, Ace 3.1%, DF 2.5%, 1stIn 64.4%, 1stWon 62.7%",

returnStats: "Break 40.6%, TB 55.6%, DR 1.04",

overallStats: "Hard 20-16 · Clay 6-8 · Grass 2-3",

fullNote: "Target Frech in hard court matchups versus lower-ranked or serve-weak opponents where her 40.6% break conversion becomes a leverage edge.",

hardCourtNote: "Frech's 20-16 hard court record demonstrates clear surface preference.",

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 38,
winPct: 53 }, long: { pct: 33, winPct: 53 }, profile: "Return-first baseliner with 40.6% break rate. Hold rate (52.9%) is low.",
bettingAngle: "Target opponent break props vs Frech — her 52.9% hold rate is exploitable." }

},

"Linda Noskova": {

eloRank: 26, elo: 0, record: "26-18",

style: "Aggressive baseline player with solid serve who relies on break point conversion and tiebreak prowess.",

strengths: "Elite break point conversion at 44.8% and exceptional tiebreak win rate of 68.8%; strong hard court record (17-9).",

weaknesses: "Below-average first serve percentage at 60.2% and low ace rate of 6.4%.",

serveStats: "Hold 59%, Ace 6.4%, DF 5.9%, 1stIn 60.2%, 1stWon 69.9%",

returnStats: "Break 44.8%, TB 68.8%, DR 1.18",

overallStats: "Hard 17-9 · Clay 6-6 · Grass 3-3",

fullNote: "Noskova is a sharp betting play on hard courts. Her 44.8% break rate is her primary edge. Live-bet her tiebreak odds heavily (68.8% TB%).",

hardCourtNote: "Hard court is her most productive surface (65% win rate).",

rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Aggressive baseliner with solid break rate (44.8%) and elite tiebreak rate (68.8%).", bettingAngle: "Back in tiebreak-heavy matchups on hard courts — 68.8% tiebreak rate one of the best on tour." }

},

"Liudmila Samsonova": {

eloRank: 27, elo: 0, record: "27-23",

style: "Aggressive baseline player with heavy groundstrokes who relies on break opportunities.",

strengths: "Strong break conversion at 45.7% and excellent grass court record (8-3, 73%).",

weaknesses: "Below-average first serve percentage (50.9%) and inconsistent hold rate (56.5%).",

serveStats: "Hold 56.5%, Ace 6.8%, DF 7.2%, 1stIn 50.9%, 1stWon 70%",

returnStats: "Break 45.7%, TB 50%, DR 1.08",

overallStats: "Hard 13-15 · Clay 6-5 · Grass 8-3",

fullNote: "Samsonova's 45.7% break rate is her true weapon. Her hard court woes make clay/grass matchups more favorable.",

hardCourtNote: "Struggles on hard courts with 13-15 record.",

rallyProfile: { short: { pct: 35, winPct: 54 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 28, winPct: 50 }, profile: "Aggressive flat hitter. Short and medium rallies her domain. Long-rally rate (50%) coin-flip.", bettingAngle: "Back on fast hard in best-of-3. Fade in long grinding matches." }

},

"Ekaterina Alexandrova": {

eloRank: 28, elo: 0, record: "26-24",

style: "Aggressive baseline player who relies on heavy groundstrokes.",

strengths: "Exceptional break point conversion (43.6%) and solid hard court record (20-14).",

weaknesses: "Weak serve metrics (7.5% aces, 59.3% 1st serve %) and alarming clay court struggles (1-7); tiebreak win rate (42.9%).",

serveStats: "Hold 58.4%, Ace 7.5%, DF 7.4%, 1stIn 59.3%, 1stWon 69.6%",

returnStats: "Break 43.6%, TB 42.9%, DR 1.04",

overallStats: "Hard 20-14 · Clay 1-7 · Grass 5-3",

fullNote: "Alexandrova's 43.6% break percentage is elite-tier, making her dangerous in longer baseline rallies but vulnerable to serve-heavy opponents.",

hardCourtNote: "Hard court is her best surface (58.8% win rate).",

rallyProfile: { short: { pct: 32, winPct: 52 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 31, winPct: 51 }, profile: "Aggressive baseliner with 43.6% break rate. Clay record (1-7) alarming. Tiebreak rate (42.9%) below average.", bettingAngle: "Fade completely on clay. Tiebreak weakness (42.9%) means fade in close sets on any surface." }

},

"Yulia Putintseva": {

eloRank: 29, elo: 0, record: "35-19",

style: "Aggressive baseline player who relies on break opportunities and consistency.",

strengths: "Elite break conversion at 51.5% and exceptional grass court form (88.9%).",

weaknesses: "Low ace production (2.2%) and high double fault rate (2.3%).",

serveStats: "Hold 58.2%, Ace 2.2%, DF 2.3%, 1stIn 70%, 1stWon 61.8%",

returnStats: "Break 51.5%, TB 50%, DR 1.3",

overallStats: "Hard 19-12 · Clay 7-4 · Grass 8-1",

fullNote: "Putintseva's 51.5% break rate is her primary weapon. Grass dominance (8-1) is a significant outlier.",

hardCourtNote: "Strong hard court record (19-12).",

rallyProfile: { short: { pct: 27, winPct: 50 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Return-heavy grinder. 51.5% break rate one of the best on tour. Grass record (8-1) is the hidden gem.", bettingAngle: "Back on grass — 88.9% win rate is extraordinary." }

},

"Anastasia Pavlyuchenkova": {

eloRank: 30, elo: 0, record: "25-20",

style: "Aggressive baseline player who relies on consistent first-serve delivery and break point conversion.",

strengths: "Solid 66.7% first-serve win rate and 46.4% break conversion rate; thrives on hard courts with 21-13 record.",

weaknesses: "Double fault rate of 5.6%.",

serveStats: "Hold 57.3%, Ace 4.6%, DF 5.6%, 1stIn 61.8%, 1stWon 66.7%",

returnStats: "Break 46.4%, TB 71.4%, DR 1.11",

overallStats: "Hard 21-13 · Clay 3-5 · Grass 1-2",

fullNote: "Sharp edge targeting her 66.7% first-serve win rate. The 46.4% break conversion is solid.",

hardCourtNote: "Dominates hard courts with 62% win rate (21-13).",

rallyProfile: { short: { pct: 31, winPct: 52 }, medium: { pct: 38,
winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Experienced hard court baseliner with medium-rally preference. All rally bands positive.", bettingAngle: "Steady hard court lean. No dramatic rally weakness." }

},

"Leylah Fernandez": {

eloRank: 31, elo: 0, record: "31-25",

style: "Aggressive baseline player who relies on pace and movement.",

strengths: "Elite break point conversion at 44.8%; exceptional grass court record (7-3, 70%); tiebreak win rate (63.6%).",

weaknesses: "Weak ace production (3.3%) and high double fault rate (6%); 57.3% hold percentage.",

serveStats: "Hold 57.3%, Ace 3.3%, DF 6%, 1stIn 64.4%, 1stWon 64.6%",

returnStats: "Break 44.8%, TB 63.6%, DR 1.11",

overallStats: "Hard 18-16 · Clay 6-6 · Grass 7-3",

fullNote: "Fernandez is a break-heavy player with 44.8% conversion. Her 63.6% tiebreak win rate creates value in over 2.5 sets lines.",

hardCourtNote: "Slightly underwater on hard courts (18-16).",

rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 35, winPct: 54 }, profile: "Aggressive counter-puncher with strong grass credentials. Break rate (44.8%) is her weapon.", bettingAngle: "Back on grass — 7-3 record is legit. Fade as a favorite on hard courts." }

},

"Elise Mertens": {

eloRank: 34, elo: 0, record: "27-25",

style: "Defensive baseline player with modest serve who relies on return games and break point conversion.",

strengths: "Strong break point conversion at 45.2%; solid first serve win rate of 67.5%; consistent hard court performer (18-16 record).",

weaknesses: "Below-average hold percentage at 53.8%; low ace rate of 5.6%; first serve percentage of 55.2%.",

serveStats: "Hold 53.8%, Ace 5.6%, DF 7.6%, 1stIn 55.2%, 1stWon 67.5%",

returnStats: "Break 45.2%, TB 25%, DR 1.04",

overallStats: "Hard 18-16 · Clay 6-5 · Grass 3-4",

fullNote: "Target Mertens in break point-heavy matchups against players with low hold percentages. Monitor first serve percentage.",

hardCourtNote: "Mertens performs best on hard courts (52.9% win rate).",

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Defensive baseliner with strong break conversion (45.2%) and weak hold rate (53.8%).", bettingAngle: "Target break point props when she has a return-game mismatch. Fade in tiebreaks (25%)." }

},

"Anastasia Potapova": {

eloRank: 35, elo: 0, record: "26-22",

style: "Aggressive baseline player who relies on consistency and break point conversion.",

strengths: "Strong break point conversion at 43.7%; solid hold rate of 58.9%; hard court specialist with 17-14 record.",

weaknesses: "Low ace percentage (3.1%) and modest first serve percentage (55.6%); tiebreak win rate of 14.3%.",

serveStats: "Hold 58.9%, Ace 3.1%, DF 6.5%, 1stIn 55.6%, 1stWon 65.3%",

returnStats: "Break 43.7%, TB 14.3%, DR 1.08",

overallStats: "Hard 17-14 · Clay 6-5 · Grass 3-3",

fullNote: "Sharp edge exists in backing Potapova on hard courts. Her 43.7% break conversion rate is a critical prop lever.",

hardCourtNote: "Hard court specialist with 17-14 record.",

rallyProfile: { short: { pct: 31, winPct: 52 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 32, winPct: 52 }, profile: "Consistent aggressive baseliner with 43.7% break rate. Tiebreak rate (14.3%) extremely low.", bettingAngle: "Strong fade in tiebreaks — 14.3% is among the worst on tour." }

},

"Petra Kvitova": {

eloRank: 36, elo: 0, record: "28-18",

style: "Left-handed power server and aggressive flat hitter.",

strengths: "Elite grass court performer; powerful left-handed serve.",

weaknesses: "Long-rally game declining with age; clay court record weaker.",

serveStats: "Hold 62.4%, Ace 7.8%, DF 5.1%, 1stIn 57.3%, 1stWon 71.2%",

returnStats: "Break 42.1%, TB 58.3%, DR 1.15",

overallStats: "Hard 15-10 · Clay 5-5 · Grass 8-3",

fullNote: "Kvitova remains dangerous on grass and fast hard courts. Her flat serve and hitting are maximized on fast surfaces.",

hardCourtNote: "15-10 hard court record reflects a player who can still produce excellent results on fast hard.",

rallyProfile: { short: { pct: 38, winPct: 57 }, medium: { pct: 35,
winPct: 52 }, long: { pct: 27, winPct: 47 }, profile: "Left-handed power server. Short-point dominance built on flat serve and forehand. Grass is her best surface.", bettingAngle: "Still dangerous on grass. Fade on clay and in long physical matches." }

},

"Barbora Vondrousova": {

eloRank: 37, elo: 0, record: "31-22",

style: "Creative left-handed baseliner who thrives in extended exchanges.",

strengths: "Variety and slice backhand create discomfort; Wimbledon champion 2023.",

weaknesses: "Serve is not a weapon; fast hard courts reduce effectiveness.",

serveStats: "Hold 55.8%, Ace 3.2%, DF 4.1%, 1stIn 63.4%, 1stWon 62.8%",

returnStats: "Break 43.9%, TB 52.4%, DR 1.09",

overallStats: "Hard 15-14 · Clay 10-6 · Grass 6-2",

fullNote: "Vondrousova is a creative variety player whose game is most dangerous on clay and grass.",

hardCourtNote: "Hard courts are her least comfortable surface at 15-14.",

rallyProfile: { short: { pct: 27, winPct: 50 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Creative left-handed baseliner. Long-rally win rate (55%) is her strength. Wimbledon champion 2023.", bettingAngle: "Back in slow conditions and grinding matches. Fade on fast hard courts." }

},

"Sorana Cirstea": {

eloRank: 38, elo: 0, record: "30-24",

style: "Aggressive baseliner with consistent first-serve execution.",

strengths: "Solid break point conversion (42.8%); consistent hard court performer.",

weaknesses: "Hold percentage (57.3%) is below average.",

serveStats: "Hold 57.3%, Ace 4.8%, DF 5.2%, 1stIn 62.1%, 1stWon 65.9%",

returnStats: "Break 42.8%, TB 51.2%, DR 1.06",

overallStats: "Hard 18-14 · Clay 8-7 · Grass 4-3",

fullNote: "Cirstea is a solid baseliner with no dominant rally length. Best as a dangerous floater against higher-seeded opponents.",

hardCourtNote: "Hard courts are her most comfortable surface.",

rallyProfile: { short: { pct: 33, winPct: 52 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Solid baseliner with no dominant rally length. All bands hover near 51-53%.",
bettingAngle: "Reliable underdog value play in best-of-3." }

},

"Daria Kasatkina": {

eloRank: 9, elo: 0,

record: "42-23",

style: "Aggressive baseline grinder who relies on break points and consistency.",

strengths: "Elite break point conversion at 49.4%; hard court specialist (26-17 record); tiebreak player at 58.3% TB win rate.",

weaknesses: "Low ace rate (2.3%) and first serve percentage (66.5%).",

serveStats: "Hold 53.9%, Ace 2.3%, DF 7%, 1stIn 66.5%, 1stWon 61%",

returnStats: "Break 49.4%, TB 58.3%, DR 1.29",

overallStats: "Hard 26-17 · Clay 8-4 · Grass 8-2",

fullNote: "Kasatkina's 49.4% break rate is elite-level but she only holds serve 53.9%, creating coin-flip sets.",

hardCourtNote: "Dominant hard court performer (60% win rate).",

rallyProfile: { short: { pct: 28, winPct: 51 }, medium: { pct: 37,
winPct: 54 }, long: { pct: 35, winPct: 55 }, profile: "Smart baseliner who improves as rallies develop.", bettingAngle: "Back in grinding conditions and on clay." }

},

"Linda Fruhvirtova": {

eloRank: 40, elo: 0, record: "24-20",

style: "Young Czech baseliner with grinder profile.",

strengths: "Strong return game; consistent baseline pressure.",

weaknesses: "Serve not yet a weapon; still developing against elite opponents.",

serveStats: "Hold 54.2%, Ace 3.1%, DF 4.8%, 1stIn 63.7%, 1stWon 62.1%",

returnStats: "Break 43.2%, TB 48.6%, DR 1.03",

overallStats: "Hard 12-12 · Clay 9-6 · Grass 3-2",

fullNote: "Fruhvirtova is a developing grinder whose long-rally game is her primary asset. Still raw at the elite level.",

hardCourtNote: "Hard courts are her most played surface with 12-12 record.",

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 37,
winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Young Czech baseliner with grinder profile. Long-rally game her primary development area.", bettingAngle: "Fade vs elite opponents. Back against similarly-ranked players in slow conditions." }

},

"Marie Bouzkova": {

eloRank: 44, elo: 0, record: "26-22",

style: "Defensive baseline player who relies on consistency and return of serve.",

strengths: "Strong break point conversion at 44.5%; solid first serve win rate of 64.4%.",

weaknesses: "Low ace rate of 3.4%; tiebreak win rate of 36.4%.",

serveStats: "Hold 54.2%, Ace 3.4%, DF 4%, 1stIn 62.5%, 1stWon 64.4%",

returnStats: "Break 44.5%, TB 36.4%, DR 1.08",

overallStats: "Hard 18-17 · Clay 6-2 · Grass 2-3",

fullNote: "Bouzkova's 44.5% break conversion is well above WTA average. Her 36.4% TB% suggests backing under on tiebreak props.",

hardCourtNote: "Slight advantage on hard courts with 18-17 record.",

rallyProfile: { short: { pct: 29, winPct: 50 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Defensive baseliner with strong break rate (44.5%) and weak tiebreak rate (36.4%).", bettingAngle: "Fade in tiebreaks — 36.4% is well below average." }

},

"Katerina Siniakova": {

eloRank: 45, elo: 0, record: "26-26",

style: "Defensive baseline player relying on consistency and break point conversion.",

strengths: "Strong break point conversion at 47.4%; excellent grass court record (5-3).",

weaknesses: "Extremely low ace rate (2.5%) and weak hold percentage (50.1%).",

serveStats: "Hold 50.1%, Ace 2.5%, DF 7.2%, 1stIn 62%, 1stWon 62.3%",

returnStats: "Break 47.4%, TB 44.4%, DR 1",

overallStats: "Hard 17-17 · Clay 4-6 · Grass 5-3",

fullNote: "Siniakova's 47.4% break conversion is elite-level but negated by poor service hold (50.1%).",

hardCourtNote: "Hard court is her primary surface but dead-even 17-17 record.",

rallyProfile: { short: { pct: 28, winPct: 50 }, medium: { pct: 36,
winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Defensive baseliner with strong break conversion (47.4%) and poor hold rate (50.1%). Grass record (5-3) hidden strength.", bettingAngle: "Target opponent break props vs Siniakova — 50.1% hold rate is exploitable." }

},

"Rebecca Sramkova": {

eloRank: 46, elo: 0, record: "24-10",

style: "Aggressive baseliner with strong hold games and conversion ability on hard courts.",

strengths: "Elite 62.3% hold rate; 48.5% break rate; 66.7% tiebreak win rate.",

weaknesses: "Low ace rate (3.4%); limited grass court success (0-1).",

serveStats: "Hold 62.3%, Ace 3.4%, DF 3.3%, 1stIn 60.6%, 1stWon 61.6%",

returnStats: "Break 48.5%, TB 66.7%, DR 1.41",

overallStats: "Hard 19-6 · Clay 5-3 · Grass 0-1",

fullNote: "Sramkova's 62.3% hold rate is elite territory for the WTA. Her 66.7% TB% suggests backing her in tiebreak-heavy matchups.",

hardCourtNote: "Dominant 19-6 hard court record (76% win rate).",

rallyProfile: { short: { pct: 32, winPct: 54 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 32, winPct: 52 }, profile: "Aggressive baseliner with elite hold rate (62.3%) and strong tiebreak rate (66.7%). Hard court dominance (19-6, 76%) standout stat.", bettingAngle: "Back on hard courts — 19-6 record and DR 1.41 are elite numbers." }

},

"Jasmine Paolini": {

eloRank: 48, elo: 0, record: "38-20",

style: "Aggressive baseline player with strong return game and elite physical conditioning.",

strengths: "Strong break conversion (44.1%); excellent hard court consistency; physical stamina.",

weaknesses: "Serve not a weapon; modest hold rate.",

serveStats: "Hold 56.3%, Ace 3.4%, DF 3.9%, 1stIn 64.2%, 1stWon 62.8%",

returnStats: "Break 44.1%, TB 55.8%, DR 1.12",

overallStats: "Hard 22-12 · Clay 12-6 · Grass 4-2",

fullNote: "Paolini is a medium and long-rally specialist. Physical stamina is a genuine edge in three-set matches.",

hardCourtNote: "Strong hard court record (22-12) as her most reliable surface.",

rallyProfile: { short: { pct: 29, winPct: 51 }, medium: { pct: 38,
winPct: 54 }, long: { pct: 33, winPct: 55 }, profile: "Medium and long-rally specialist. Physical stamina is a genuine edge in three-set matches.", bettingAngle: "Back in conditions that extend rallies. Three-set record is strong because stamina compounds." }

},

"Olga Danilovic": {

eloRank: 51, elo: 0, record: "12-7",

style: "Consistent baseline player relying on break point conversion.",

strengths: "Strong break point rate at 51.8%; reliable hold percentage of 58.4%.",

weaknesses: "Low ace rate of 2.7%; below-average 40% tiebreak rate.",

serveStats: "Hold 58.4%, Ace 2.7%, DF 5.4%, 1stIn 63.9%, 1stWon 61.7%",

returnStats: "Break 51.8%, TB 40%, DR 1.26",

overallStats: "Hard 5-2 · Clay 7-4 · Grass 0-1",

fullNote: "Danilovic is a grinder whose 51.8% break rate ranks elite for her tier. Matches hinge on return games rather than serving dominance.",

hardCourtNote: "7-2 record on hard courts shows this is her best surface.",

rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Return-first grinder with elite break rate (51.8%) and weak tiebreak rate (40%).",
bettingAngle: "Back on clay where her break rate is most effective. Fade in tiebreaks." }

},

"Clara Tauson": {

eloRank: 50, elo: 0, record: "23-16",

style: "Aggressive baseline player with above-average break conversion.",

strengths: "Strong break conversion rate (49.4%); solid first serve win percentage (68.9%).",

weaknesses: "High double fault percentage (6.9%) and weak tiebreak performance (28.6%).",

serveStats: "Hold 56.9%, Ace 7.4%, DF 6.9%, 1stIn 58.1%, 1stWon 68.9%",

returnStats: "Break 49.4%, TB 28.6%, DR 0.91",

overallStats: "Hard 10-12 · Clay 4-3 · Grass 0-2",

fullNote: "Tauson is a break-heavy player (49.4% Break%) rather than a hold-heavy one, making her vulnerable to servers who maintain first serve consistency above 60%.",

hardCourtNote: "Hard court is primary surface (10-12 record) but shows concerning inconsistency.",

rallyProfile: { short: { pct: 30, winPct: 51 }, medium: { pct: 37,
winPct: 52 }, long: { pct: 33, winPct: 51 }, profile: "Aggressive baseliner with 49.4% break rate and very poor tiebreak rate (28.6%).",
bettingAngle: "Tiebreak fade is automatic — 28.6% is well below average." }

},

"Viktoriya Tomova": {

eloRank: 53, elo: 0, record: "22-27",

style: "Inconsistent baseline player who relies on break opportunities.",

strengths: "Strong break conversion rate at 45.3%.",

weaknesses: "Critically low ace rate of 1.7%; 65.3% first serve percentage; 49% win rate.",

serveStats: "Hold 52.1%, Ace 1.7%, DF 4%, 1stIn 65.3%, 1stWon 59.4%",

returnStats: "Break 45.3%, TB 50%, DR 0.9",

overallStats: "Hard 11-17 · Clay 8-8 · Grass 3-2",

fullNote: "Tomova is a break-reliant player. Hard court struggles (39% win rate) make her a fade candidate.",

hardCourtNote: "Worst surface at 11-17 record.",

rallyProfile: { short: { pct: 28, winPct: 49 }, medium: { pct: 37,
winPct: 52 }, long: { pct: 35, winPct: 53 }, profile: "Break-reliant player with negative short-point profile (49%). Hard court record (11-17) confirms structural surface weakness.", bettingAngle: "Hard court fade. 39% win rate there is structural." }

},

"Jessica Bouzas Maneiro": {

eloRank: 54, elo: 0, record: "10-11",

style: "Baseline grinder with modest pace who relies on consistency.",

strengths: "Strong break point conversion at 48% and solid tiebreak performance (66.7%).",

weaknesses: "Low ace rate (1.3%) and subpar hold percentage (47.4%).",

serveStats: "Hold 47.4%, Ace 1.3%, DF 7.6%, 1stIn 61.2%, 1stWon 58.3%",

returnStats: "Break 48%, TB 66.7%, DR 0.95",

overallStats: "Hard 7-7 · Clay 1-3 · Grass 2-1",

fullNote: "Bouzas Maneiro thrives in tiebreaks (66.7% conversion) making under/total games props valuable, but her 47.4% hold rate is among WTA's lowest.",

hardCourtNote: "Even 7-7 hard court record masks inconsistency.",

rallyProfile: { short: { pct: 28, winPct: 49 }, medium: { pct: 36,
winPct: 52 }, long: { pct: 36, winPct: 53 }, profile: "Baseline grinder with critically low hold rate (47.4%) but strong tiebreak rate (66.7%).", bettingAngle: "Tiebreak rate (66.7%) is her one genuine edge. Fade in service hold props." }

},

"Anhelina Kalinina": {

eloRank: 55, elo: 0, record: "20-24",

style: "Baseline grinder with modest serve who relies on return pressure.",

strengths: "Strong break conversion at 41.6% and solid clay court form (10-7).",

weaknesses: "Weak first serve hold at 49.2%; hard court struggles (8-14).",

serveStats: "Hold 49.2%, Ace 2%, DF 5.3%, 1stIn 62.6%, 1stWon 60.1%",

returnStats: "Break 41.6%, TB 20%, DR 0.91",

overallStats: "Hard 8-14 · Clay 10-7 · Grass 2-3",

fullNote: "Kalinina's 41.6% break rate is her primary weapon but her 49.2% hold% creates service game fragility. Fade her in hard court spots.",

hardCourtNote: "Hard court liability at 33% win rate.",

rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37,
winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Clay-leaning grinder with poor serve. 49.2% hold rate major liability. Hard court record (8-14) alarming.", bettingAngle: "Fade on hard courts — 33% win rate is structural. Back on clay at generous odds." }

},

"Emma Raducanu": {

eloRank: 56, elo: 0, record: "24-13",

style: "Aggressive baseline player with solid serve mechanics and high break-point conversion.",

strengths: "Elite break percentage (45.7%) and tiebreak success (66.7%); strong grass court form (8-3).",

weaknesses: "High double fault rate (4.4%).",

serveStats: "Hold 62.3%, Ace 5.1%, DF 4.4%, 1stIn 65.9%, 1stWon 64.4%",

returnStats: "Break 45.7%, TB 66.7%, DR 1.3",

overallStats: "Hard 12-8 · Clay 2-2 · Grass 8-3",

fullNote: "Sharp angle targets break-point props when facing first-serve vulnerable opponents. Tiebreak efficiency (66.7%) suggests she closes tight matches effectively.",

hardCourtNote: "Raducanu thrives on hard courts with 60% win rate.",

rallyProfile: { short: { pct: 33, winPct: 53 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 31, winPct: 52 }, profile: "Aggressive baseliner with strong break rate (45.7%) and solid tiebreak rate (66.7%). Grass record (8-3) hidden strength.", bettingAngle: "Back on hard courts and grass. Tiebreak rate (66.7%) reliable in close sets." }

},

"Naomi Osaka": {

eloRank: 57, elo: 0, record: "22-17",

style: "Aggressive server-reliant player.",

strengths: "Elite first serve winning percentage (74.7%) and solid ace rate (9.7%).",

weaknesses: "Below-average first serve percentage (54.9%); low tiebreak win rate (38.5%).",

serveStats: "Hold 58.5%, Ace 9.7%, DF 3.9%, 1stIn 54.9%, 1stWon 74.7%",

returnStats: "Break 45.9%, TB 38.5%, DR 1.13",

overallStats: "Hard 13-9 · Clay 5-5 · Grass 3-3",

fullNote: "Sharp angle: fade at short odds given hold% of only 58.5%. Target totals over 22.5 games. Moneyline value exists at +odds only when facing poor returners.",

hardCourtNote: "Strongest surface with 13-9 record.",

rallyProfile: { short: { pct: 37, winPct: 55 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 27, winPct: 48 }, profile: "Serve-reliant power player. Tiebreak rate (38.5%) extremely low.", bettingAngle: "Fade in tiebreaks — 38.5% one of the worst rates on tour." }

},

"Katie Volynets": {

eloRank: 58, elo: 0, record: "13-17",

style: "Aggressive baseline player with strong return game but inconsistent serving.",

strengths: "Break point conversion (44.5%) well above tour average; solid first serve percentage (76.7%).",

weaknesses: "Ace production critically low at 1.1%; hard court struggles (9-13).",

serveStats: "Hold 52.9%, Ace 1.1%, DF 1.7%, 1stIn 76.7%, 1stWon 57.1%",

returnStats: "Break 44.5%, TB 50%, DR 0.87",

overallStats: "Hard 9-13 · Clay 3-3 · Grass 1-1",

fullNote: "Volynets presents a return-heavy betting profile with 44.5% break rate but 52.9% hold rate creates vulnerable service games.",

hardCourtNote: "Hard court represents 69% of matches with concerning 41% win rate.",

rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 36, winPct: 54 }, profile: "Return-first baseliner with negative short-point profile. Wins entirely through medium and long rally domination.", bettingAngle: "Fade on fast courts vs big servers. Back in slow conditions where break rate can take over."
}

},

"Camila Osorio": {

eloRank: 59, elo: 0, record: "20-17",

style: "Baseline grinder with modest serve who relies on break point conversion and clay court comfort.",

strengths: "71.3% break point conversion rate; 10-4 clay record; 72.7% tiebreak win rate.",

weaknesses: "Weak first serve at 66.5%; low ace rate of 1.5%; 51.5% hold percentage.",

serveStats: "Hold 51.5%, Ace 1.5%, DF 6.5%, 1stIn 66.5%, 1stWon 58.3%",

returnStats: "Break 51.1%, TB 72.7%, DR 1.08",

overallStats: "Hard 7-10 · Clay 10-4 · Grass 1-3",

fullNote: "Osorio's 51.1% break conversion is the sharpest edge; target her in clay tournaments where her 10-4 record and break rate compound.",

hardCourtNote: "Hard court is her weakest surface at 7-10.",

rallyProfile: { short: { pct: 26, winPct: 49 }, medium: { pct: 36,
winPct: 53 }, long: { pct: 38, winPct: 56 }, profile: "Clay grinding specialist. Short-point rate (49%) negative. Serve is a liability (1.5% ace, 6.5% DF).", bettingAngle: "Genuine underdog value on clay in long matches. Hard court record (7-10) confirms fade off clay." }

},

"Veronika Kudermetova": {

eloRank: 72, elo: 0, record: "16-25",

style: "Defensive baseline player relying on consistency and break point conversion.",

strengths: "Strong break point conversion at 47.1%; solid first serve won percentage at 64%.",

weaknesses: "Severe struggles on hard courts (10-16 record, 38.5% win rate); low ace rate of 4.9%; modest hold percentage of 49.5%.",

serveStats: "Hold 49.5%, Ace 4.9%, DF 2.9%, 1stIn 61%, 1stWon 64%",

returnStats: "Break 47.1%, TB 28.6%, DR 0.78",

overallStats: "Hard 10-16 · Clay 3-5 · Grass 3-4",

fullNote: "Kudermetova's 47.1% break rate is respectable but offset by 49.5% hold%. Her opponent break bets on her service games are exploitable.",

hardCourtNote: "Hard court is her worst surface at 10-16 (38.5%).",

rallyProfile: { short: { pct: 28, winPct: 50 }, medium: { pct: 38,
winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Defensive baseliner with 47.1% break rate and 49.5% hold rate. Hard court record (10-16) confirms surface weakness.", bettingAngle: "Target opponent break props vs Kudermetova on hard courts — 49.5% hold rate exploitable." }

},

"Lucia Bronzetti": {

eloRank: 73, elo: 0, record: "21-27",

style: "Defensive baseline player relying on consistency and break opportunities.",

strengths: "Strong break point conversion (43.7%) and hold percentage (56.7%).",

weaknesses: "Extremely low ace rate (2.6%); tiebreak weakness (45.5%); modest 0.88 draw ratio.",

serveStats: "Hold 56.7%, Ace 2.6%, DF 3.8%, 1stIn 61.7%, 1stWon 61.4%",

returnStats: "Break 43.7%, TB 45.5%, DR 0.88",

overallStats: "Hard 16-18 · Clay 4-6 · Grass 1-3",

fullNote: "Bronzetti's 56.7% hold rate masks a player who survives through break opportunities. Target her in tiebreak props under 45%.",

hardCourtNote: "Hard court is primary surface (16-18 record) but shows vulnerability with only 48% win rate.",

rallyProfile: { short: { pct: 28, winPct: 50 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 35, winPct: 54 }, profile: "Defensive Italian baseliner. 43.7% break conversion solid. Short-point rate (50%) coin-flip.", bettingAngle: "Back at +150 or better on clay. Fade as a favorite on hard courts." }

},

"Katie Boulter": {

eloRank: 24, elo: 0, record: "34-22",

style: "Aggressive baseline player leveraging strong first-serve win rate (70.6%).",

strengths: "Elite first-serve conversion (70.6% win rate); solid break point conversion (43.4%); hard court specialist (64% win rate).",

weaknesses: "Double fault rate elevated at 7.5%; clay court struggles (0-4 record).",

serveStats: "Hold 59.4%, Ace 5%, DF 7.5%, 1stIn 56.8%, 1stWon 70.6%",

returnStats: "Break 43.4%, TB 50%, DR 1.21",

overallStats: "Hard 25-14 · Clay 0-4 · Grass 8-3",

fullNote: "Sharp bettors should target Boulter on hard court venues where her 70.6% first-serve win rate creates structural advantages.",

hardCourtNote: "Dominates hard courts with 25-14 record (64% win rate).",

rallyProfile: { short: { pct: 34, winPct: 53 }, medium: { pct: 37,
winPct: 53 }, long: { pct: 29, winPct: 49 }, profile: "Hard court specialist with long-rally weakness. 70.6% first serve win rate primary weapon. Clay record 0-4.", bettingAngle: "Reliable on hard in best-of-3. Fade aggressively on clay. DF props live (7.5% DF)." }

},

"Elisabetta Cocciaretto": {

eloRank: 52, elo: 0, record: "18-23",

style: "Baseline-oriented player who relies on consistency and break point conversion.",

strengths: "Strong break point conversion at 42.8%; excellent grass court form at 3-1.",

weaknesses: "Concerning hard court record of 8-15 (34.8%); low ace rate of 1.8%.",

serveStats: "Hold 55.7%, Ace 1.8%, DF 4.1%, 1stIn 67.7%, 1stWon 61.2%",

returnStats: "Break 42.8%, TB 50%, DR 0.88",

overallStats: "Hard 8-15 · Clay 7-7 · Grass 3-1",

fullNote: "Cocciaretto's 42.8% break conversion is her primary edge. Hard court woes (8-15) versus clay preference creates clear betting splits.",

hardCourtNote: "Hard court struggles are pronounced with only 8 wins in 15 matches.",

rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37,
winPct: 52 }, long: { pct: 36, winPct: 53 }, profile: "Baseline grinder with a significant hard court problem. 42.8% break rate solid in medium and long rallies.", bettingAngle: "Fade on hard courts completely. On clay or grass, live underdog." }

},

"Nadia Podoroska": {

eloRank: 100, elo: 0, record: "10-25",

style: "Defensive baseline player relying on consistency and break opportunities.",

strengths: "Strong break point conversion (44.2%); reliable hold percentage (52.3%).",

weaknesses: "Critically weak ace production (2.6%); poor 35% win rate; DR 0.57.",

serveStats: "Hold 52.3%, Ace 2.6%, DF 5.2%, 1stIn 65.6%, 1stWon 59.6%",

returnStats: "Break 44.2%, TB 28.6%, DR 0.57",

overallStats: "Hard 8-14 · Clay 2-9 · Grass 0-2",

fullNote: "Podoroska's DR 0.57 means she loses more points than she wins overall. Fade in almost all circumstances.",

hardCourtNote: "Hard court remains her best surface at 36% win rate, but 8-14 record shows continued vulnerability.",

rallyProfile: { short: { pct: 26, winPct: 48 }, medium: { pct: 36,
winPct: 51 }, long: { pct: 38, winPct: 52 }, profile: "Defensive grinder with a DR of 0.57 — loses more points than she wins overall.",
bettingAngle: "Fade in almost all circumstances. DR of 0.57 is one of the worst on the WTA tour." }

}

}

});

}
