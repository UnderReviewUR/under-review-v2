import { applyCors } from "./_cors.js";

export default function handler(req, res) {
if (!applyCors(req, res)) return;

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



"Marozsan": {
eloRank: 52,
elo: 1797,
record2026: "4-4 in 2026. Opened the season with a solid Auckland run and is back in the Miami draw.",
record: "246-174 (59%) career",
style: "aggressive_baseliner, balanced_hard_clay_profile",
strengths: "baseline_tempo, clean_ball_striking, solid_first_strike_tennis",
serveStats: "Hold 81.2%, Ace 5.3%",
returnStats: "RPW 36.5%, Break rate 20.6%",
overallStats: "DR 1.01, TPW 50.3%, Tiebreak 44%",
h2h: "Notable recent wins include Ruud, Rublev, Humbert, De Minaur, Rune, and Auger-Aliassime. Has also made a Miami run before.",
fullNote: "Marozsan is more about timing and clean baseline pressure than one overwhelming weapon. The profile is fairly balanced. The serve is respectable without being a true free-point engine, and the return numbers are decent without creating a big edge on hard courts. That usually makes him dangerous against players who give him rhythm, but less dangerous when opponents can either overpower him or drag him off his preferred tempo.",
miamiNote: "Miami is a reasonable fit for him because the slower hard conditions give him time to settle into rallies and redirect the ball. He made a real run here in 2024, beating Rune, Popyrin, and De Minaur before losing to Zverev. That matters, because this surface rewards his ability to absorb pace and strike cleanly from the baseline.",
surfaceNote: { hard: "Playable on hard, but not dominant. Last 52 hard record is 15-16 with 81.6% hold and 19.9% break. More solid than explosive.", clay: "Clay may be his cleanest surface. Last 52 clay record is 9-7 with a stronger 24.4% break rate and a better 1.06 dominance ratio.", grass: "Grass is clearly the weakest fit right now. Last 52 grass record is 2-3 with a 0.92 dominance ratio." },
},

"Perricard": {
eloRank: 83,
elo: 1734,
record2026: "7-9 in 2026. Results are volatile, but the serve remains one of the biggest single weapons in the sport.",
record: "167-138 (55%) career",
style: "big_server, first_strike_attacker",
strengths: "ace_volume, easy_holds, short_point_tennis",
serveStats: "Hold 87.9%, Ace 17.9%",
returnStats: "RPW 27.2%, Break rate 9.4%",
overallStats: "DR 0.9, TPW 49%, Tiebreak 58%",
h2h: "Serve-driven matchup profile. Notable wins include Fritz, Tommy Paul, Musetti, Tiafoe, Shelton, and Auger-Aliassime. Many matches are decided by tie-break pressure and serve comfort more than baseline control.",
fullNote: "Perricard is one of the clearest serve-first players in tennis. The ace rate is absurd at 17.9% over the last 52 weeks and even higher at 21.8% in 2026, which means the serve alone can carry entire matches. The problem is everything after that. His return profile is extremely weak, with just a 9.4% break rate over the last 52 weeks, so when the serve cools off even slightly he has very little margin. This is why his matches are so line-sensitive and tie-break heavy. He is dangerous because the ceiling is huge, but the overall profile is less stable than the raw serve numbers suggest.",
miamiNote: "Miami is playable for him, but it is not the ideal version of a serve court. He can still stack aces here, but the slower hard conditions give returners a few more looks than the fastest hard events. That matters a lot for a player whose entire identity is built on cheap holds and first-strike pressure.",
surfaceNote: { hard: "Hard courts are the cleanest fit because the serve alone can dictate match shape. Still dangerous anywhere on hard, especially when the line is short and the match projects for tie-breaks.", clay: "Clay is better than people assume when the serve is landing, but it reduces his free-point edge and exposes the weak return profile more often.", grass: "Grass is the purest upside surface for him. The serve becomes even more central and the match can get very short very quickly." },
},

"Ugo Carabelli": {
eloRank: 97,
elo: 1713,
record2026: "9-7 in 2026. Solid on clay with some carryover to hard, but still matchup-dependent outside his best conditions.",
record: "361-229 (61%) career",
style: "grinder, counterpuncher",
strengths: "return_game, consistency, rally_tolerance",
serveStats: "Hold 73.4%, Ace 4.1%",
returnStats: "RPW 37.3%, Break rate 23.2%",
overallStats: "DR 0.93, TPW 48.7%, Tiebreak 36%",
h2h: "Profile plays up against big servers and weaker movers. Beat Perricard in Miami 2026 by extending rallies and forcing returns into play. Struggles more against clean baseline hitters who can dictate first strike.",
fullNote: "Ugo Carabelli is a return-first grinder who wins matches through volume, not power. The serve is a liability at this level with just a 73.4% hold rate, so he is constantly playing from pressure. What keeps him competitive is a strong return profile and willingness to extend rallies, forcing opponents to hit extra balls. This creates upset paths against serve-heavy players but makes him vulnerable against clean, aggressive baseline profiles. His matches tend to be physical and swing on whether he can drag opponents into longer exchanges.",
miamiNote: "Miami conditions are workable because they slow the match down slightly and reward rally tolerance. That helps his style, especially against big servers, but the lack of serve still limits his ceiling against top-tier opponents.",
surfaceNote: { hard: "Playable but not ideal. Needs longer rallies to compete and struggles when points stay short.", clay: "Best surface. The slower conditions maximize his return game and consistency.", grass: "Poor fit. Limited serve and reliance on rallies make it difficult to compete on fast grass courts." },
},

"Giron": {
eloRank: 47,
elo: 1809,
record2026: "12-8 in 2026. Strong rebound season so far with better hold numbers and a more stable all-around hard-court profile.",
record: "380-310 (55%) career",
style: "aggressive_baseliner, counterpuncher",
strengths: "clean_ball_striking, movement, return_game, hard_court_comfort",
serveStats: "Hold 80.2%, Ace 6.1%",
returnStats: "RPW 35.8%, Break rate 19.4%",
overallStats: "DR 0.98, TPW 49.8%, Tiebreak 47%",
h2h: "Competitive against mid-tier hard-court players and dangerous when opponents give him rhythm. Can trouble bigger names with pace absorption and clean redirection, but lacks easy serve separation against elite top-end attackers.",
fullNote: "Marcos Giron is a balanced hard-court baseliner whose value comes from steadiness, movement, and clean contact rather than overwhelming weapons. His profile is solid across the board: decent hold rate, competent return numbers, and a style that keeps him competitive in a wide range of matchups. He does not dominate with serve or raw power, so his ceiling depends on timing, redirection, and making opponents play extra balls without letting rallies get away from him. When he is sharp, he is a dangerous matchup player because he takes the ball early and stays organized off both wings.",
miamiNote: "Miami is reasonably playable for him because the surface rewards clean timing and baseline organization more than pure first-strike power. He can absolutely win rounds here, but without a huge serve he is still vulnerable in close sets against more explosive players.",
surfaceNote: { hard: "Best overall fit. His clean baseline game and movement translate well on hard courts.", clay: "Playable, but less naturally dangerous. He can compete through discipline, though he is less imposing in slower clay patterns.", grass: "Underrated on grass. Lower bounce and first-strike exchanges can suit his timing, though he is not a pure grass specialist." },
},

"Landaluce": {
eloRank: 193,
elo: 1584,
record2026: "9-8 in 2026. Still volatile, but Miami qualifying and the Giron win are strong signals of upward hard-court progress.",
record: "111-90 (55%) career",
style: "aggressive_baseliner, counterpuncher",
strengths: "backhand, return_game, court_coverage, rally_tolerance",
serveStats: "Hold 76.1%, Ace 5.7%",
returnStats: "RPW 38.5%, Break rate 24.5%",
overallStats: "DR 1.01, TPW 50.2%, Tiebreak 50%",
h2h: "Still early-stage and developing at tour level. Most dangerous when he can extend baseline exchanges, pressure second serves, and make matches physical rather than serve-dominated.",
fullNote: "Martin Landaluce looks like a long-term upside development profile rather than a finished ATP product. The statistical base is fairly neutral overall, but the return numbers are encouraging for a young player and suggest real baseline value once the serve stabilizes. He does not yet separate cleanly on serve, which is why many matches stay close, but he already competes well in rallies, absorbs pace effectively, and has enough offensive ability to redirect and take control when given time. The profile reads like a player whose ceiling comes from all-court maturity and shot tolerance rather than one overwhelming weapon.",
miamiNote: "Miami can work for him because the slower hard courts reward rally quality and point construction more than raw serve power. His path there is through extending exchanges, attacking second serves, and forcing more experienced opponents to actually beat him from the baseline.",
surfaceNote: { hard: "Currently his cleanest surface for ATP progression. The return profile gives him a real foundation here.", clay: "Comfortable on clay and capable of long, physical rallies, though he still needs more authority to dominate regularly.", grass: "Playable but less natural at this stage. He can compete, though the surface reduces some of his rally-building edge." },
},

"Opelka": {
eloRank: 63,
elo: 1772,
record2026: "4-4 in 2026. Limited sample but underlying serve numbers remain elite, with hold rate near 95% early in the season.",
record: "227-192 (54%) career",
style: "serve_bot, first_strike",
strengths: "serve, tiebreaks, free_points, short_points",
serveStats: "Hold 89.9%, Ace 21.5%",
returnStats: "RPW 29.2%, Break rate 10.8%",
overallStats: "DR 0.98, TPW 50%, Tiebreak 53%",
h2h: "Matchups are heavily dictated by opponent return quality. Against weaker returners he controls matches almost entirely; against elite returners he becomes tiebreak-dependent with limited margin.",
fullNote: "Reilly Opelka is one of the clearest serve-dominant profiles on tour. His statistical identity is built around elite hold rates and extremely high ace production, which allow him to control the majority of his service games with minimal baseline exposure. However, his return numbers are among the lowest at the ATP level, meaning he rarely creates break opportunities and relies heavily on tiebreak performance to win matches. This creates a very binary match dynamic: either he dominates with serve and short points, or he gets dragged into extended rallies where his impact drops significantly. His overall metrics typically hover around neutral because his serve carries him while his return limits separation.",
miamiNote: "Miami conditions are not ideal for his profile. Slower hard courts reduce the effectiveness of his serve and increase rally frequency, which shifts matches toward opponents with stronger return and baseline consistency. He can still win through tiebreaks, but his edge is smaller here than on faster courts.",
surfaceNote: { hard: "Best surface. Serve plays up the most and gives him consistent hold dominance.", clay: "Clear weakness. Reduced serve impact and extended rallies expose limitations in return and movement.", grass: "Very dangerous. One of the few players who can completely control matches on this surface." },
},

"Shapovalov": {
eloRank: 35,
elo: 1839,
record2026: "6-6 in 2026. Flashes of high-level wins but inconsistency remains, especially against structured baseliners.",
record: "317-236 (57%) career",
style: "aggressive_baseliner, shotmaker",
strengths: "shotmaking, lefty_patterns, pace_generation, first_strike",
serveStats: "Hold 83.4%, Ace 10.2%",
returnStats: "RPW 36%, Break rate 20.1%",
overallStats: "DR 1.05, TPW 50.8%, Tiebreak 50%",
h2h: "Performs best against players who allow rhythm and pace. Struggles against elite defenders and high-discipline baseliners who absorb and redirect his aggression.",
fullNote: "Denis Shapovalov profiles as a high-variance shotmaker with clear offensive upside. His left-handed patterns, pace generation, and ability to take the ball early allow him to dictate rallies when he is in rhythm. However, his profile is heavily dependent on execution. Unforced errors and streaky decision-making often erase his advantage, especially against disciplined opponents. Statistically he sits just above neutral, with solid return numbers but a serve that does not consistently create easy separation. Matches tend to swing quickly based on his level, making him one of the more volatile players in the model.",
miamiNote: "Miami conditions can expose his inconsistency. Slower courts extend rallies, which increases the number of shots per point and raises the likelihood of errors. He can still break through if he finds rhythm early, but his margin is thinner in these conditions.",
surfaceNote: { hard: "Best surface. Can take time away and dictate with pace.", clay: "More vulnerable. Longer rallies increase error exposure.", grass: "Upside is real due to first-strike ability, but still inconsistent." },
},

"Borges": {
eloRank: 73,
elo: 1751,
record2026: "7-9 in 2026. Competitive but struggling to convert in tight matches, especially at ATP level.",
record: "312-178 (64%) career",
style: "baseline_consistency, counterpuncher",
strengths: "consistency, rally_tolerance, shot_selection, movement",
serveStats: "Hold 80.2%, Ace 6.5%",
returnStats: "RPW 37.8%, Break rate 22.9%",
overallStats: "DR 1.05, TPW 50.9%, Tiebreak 50%",
h2h: "Performs best against lower-tier or error-prone opponents. Struggles to impose himself against elite servers or top-tier attackers who control points early.",
fullNote: "Nuno Borges profiles as a steady, baseline-oriented player who wins through consistency and structure rather than overwhelming weapons. His serve is functional but not a major advantage, and his ace rate reflects that. Instead, he relies on extending rallies, maintaining solid depth, and capitalizing on opponent errors. Statistically he sits slightly above neutral across most categories, which makes him competitive but rarely dominant. Against stronger players, his lack of easy points becomes a limitation, forcing him into longer matches where margins tighten.",
miamiNote: "Miami conditions generally suit his style. Slower hard courts reward consistency and rally tolerance, which gives him a more stable baseline than on faster surfaces. However, without a clear serve advantage, he still needs to win through accumulation rather than quick separation.",
surfaceNote: { hard: "Comfortable but not dangerous. Relies on grinding rather than dictating.", clay: "Solid. Consistency and movement translate well.", grass: "Less effective. Lacks the serve and first-strike edge to shorten points." },
},

"VanDeZandschulp": {
eloRank: 76,
elo: 1746,
record2026: "Mixed 2026. Capable of strong wins (e.g., Tsitsipas, Shapovalov) but inconsistent week-to-week.",
record: "360-244 (60%) career",
style: "baseline_control, all_court, counterpuncher",
strengths: "depth, rally_balance, return_pressure, composure",
serveStats: "Hold 77.2%, Ace 7.6%",
returnStats: "RPW 39.3%, Break rate 25.9%",
overallStats: "DR 1.05, TPW 50.8%, Tiebreak 53%",
h2h: "Performs well against aggressive or unstable opponents by absorbing pace and redirecting. Struggles against elite players who can consistently dictate with serve + first ball or maintain high tempo without errors.",
fullNote: "Botic van de Zandschulp is a balanced, control-oriented baseliner with solid capabilities across all phases but no single elite weapon. His return numbers are strong, allowing him to consistently apply pressure, and he is comfortable extending rallies while maintaining depth. Unlike pure grinders, he has enough offensive ability to finish points when given time, but he rarely forces them early. His main limitation is the lack of a dominant serve or go-to shot, which prevents him from consistently separating against higher-level opponents. This leads to volatile results, where he can produce high-quality wins but also drop matches due to thin margins.",
miamiNote: "Miami conditions suit him well. Slower hard courts enhance his return game and rally tolerance, allowing him to compete effectively and neutralize more aggressive opponents.",
surfaceNote: { hard: "Best surface. Balanced game and return strength translate well.", clay: "Comfortable. Can grind and construct points effectively.", grass: "Less effective. Lacks serve dominance to capitalize on faster conditions." },
},

"Collignon": {
eloRank: 39,
elo: 1828,
record2026: "13-5 (72%) — trending up with strong indoor + hard results and improving serve profile.",
record: "214-107 (67%) career",
style: "aggressive_baseliner, early_strike, tempo_player",
strengths: "return_pressure, baseline_depth, tempo_control, tiebreak_composure",
serveStats: "Hold 78.4%, Ace 6.8%",
returnStats: "RPW 40.1%, Break rate 28.3%",
overallStats: "DR 1.09, TPW 51.5%, Tiebreak 62%",
h2h: "Already producing high-level wins (Ruud, De Minaur, Dimitrov, Shapovalov). Performs well against aggressive players by taking time away and controlling tempo early in rallies.",
fullNote: "Raphael Collignon profiles as one of the most statistically solid emerging players on tour. His return numbers are already elite, allowing him to consistently apply pressure across matches, and his dominance ratio reflects a player who wins more points than he loses at a meaningful margin. He plays with controlled aggression, taking the ball early and dictating tempo without needing overwhelming power. Unlike many young players, he is highly composed in tiebreaks and close sets, which makes him dangerous in tight matches. The main area still developing is serve dominance, but recent trends show improvement in both hold percentage and ace rate.",
miamiNote: "Miami conditions suit him very well. Slower hard courts enhance his return advantage and allow him to extend baseline control, making him a live threat against higher-ranked opponents.",
surfaceNote: { hard: "Best surface. Strong return metrics and improving serve make him highly competitive.", clay: "Comfortable and capable, though slightly less effective than on hard.", grass: "Least proven. Lower reliance on serve limits upside on faster courts." },
},

"Dimitrov": {
eloRank: 44,
elo: 1819,
record2026: "2-6 (25%) — sharp drop in form to start 2026 after a strong 2024 season.",
record: "597-370 (62%) career",
style: "all_court, one_handed_backhand, counterpuncher",
strengths: "variety, slice, movement, transition_game",
serveStats: "Hold 83.4%, Ace 8.9%",
returnStats: "RPW 37.3%, Break rate 22.2%",
overallStats: "DR 1.11, TPW 51.7%, Tiebreak 53%",
h2h: "Historically competitive vs top players, but recent results show decline against both elite and rising opponents.",
fullNote: "Grigor Dimitrov remains one of the most stylistically complete players on tour, combining variety, movement, and shot-making across all phases of play. At his peak, his all-court ability allowed him to disrupt rhythm and outmaneuver opponents in longer exchanges. However, the current version is much more fragile. The serve still holds at a solid rate, but the return game has declined meaningfully, reducing his ability to consistently apply pressure. Recent results show a clear drop in baseline resistance and physical consistency, especially against younger players who can sustain pace and tempo. He can still produce high-level tennis in stretches, but maintaining that level across an entire match has become the main challenge.",
miamiNote: "Miami has been a strong event for him historically, including a final run in 2024. The slower hard courts help his variety and movement, but current form makes him far less reliable than in past years.",
surfaceNote: { hard: "Best surface historically, but current level is closer to average tour level than elite.", clay: "Capable but lacks the consistency to sustain long physical matches.", grass: "Variety translates well, but physical durability remains a concern." },
},

"Muller": {
eloRank: 85,
elo: 1730,
record2026: "2-5 (29%) — poor start to 2026 after a stronger 2024 and a mixed 2025.",
record: "416-319 (57%) career",
style: "baseline_grinder, counterpuncher, two_handed_backhand",
strengths: "rally_tolerance, returning, point_construction, clay_competence",
serveStats: "Hold 73.9%, Ace 4.1%",
returnStats: "RPW 39.2%, Break rate 26.1%",
overallStats: "DR 1, TPW 50.1%, Tiebreak 51%",
h2h: "Most dangerous against opponents who donate rhythm or fail to hit through him consistently; struggles more against clean first-strike players and higher-end servers.",
fullNote: "Alexandre Muller profiles as a steady, matchup-dependent tour grinder built more on rally tolerance and structure than on overwhelming weapons. His return numbers are respectable and often stronger than his reputation suggests, but his serve is a clear limitation for top-level consistency. That imbalance keeps him competitive in many matches while also capping his upside against stronger hard-court attackers. At his best, he absorbs pace well, extends rallies, and exploits opponents who lack discipline or shot tolerance. On clay, this profile plays up because he gets more time to construct points and expose weaker decision-making. On faster courts, the weaker hold profile makes him more vulnerable, especially against opponents who can protect serve comfortably and force him to play from behind.",
miamiNote: "Miami is not an ideal setup for him. The slower hard courts can help his rally game somewhat, but his serve/hold profile is usually too weak to make him especially dangerous unless the matchup is favorable.",
surfaceNote: { hard: "Playable, but limited by below-average hold strength and modest first-strike impact.", clay: "Best surface for his style; point construction and consistency become more relevant.", grass: "Least natural fit; lower serve quality and reduced ability to extend points hurt him." },
},

"Berrettini": {
eloRank: 40,
elo: 1824,
record2026: "5-4 (56%)",
record: "341-181 (65%) career",
style: "serve_forehand_attacker, first_strike, plus_one_tennis",
strengths: "serve, forehand, hold_rate, tiebreak_pressure, grass_hard_upside",
serveStats: "Hold 87.7%, Ace 11.8%",
returnStats: "RPW 35.3%, Break rate 18.4%",
overallStats: "DR 1.13, TPW 51.7%, Tiebreak 56%",
h2h: "Most dangerous against opponents who struggle to neutralize serve + first forehand patterns; less comfortable when dragged into repeated backhand exchanges or forced to defend wide off that wing.",
fullNote: "Matteo Berrettini remains one of the clearest serve-forehand profiles on tour. His hold numbers are elite, his ace rate is high-end, and his first-serve effectiveness gives him a strong baseline advantage in short matches and tiebreak-heavy environments. He is not a great return player relative to the top tier, but he does not need to be: his game is built around scoreboard pressure, cheap holds, and overwhelming first-strike patterns. When healthy and confident, he is a very real threat on grass and faster hard courts because opponents get so few looks in return games. The weakness is structural too: his backhand side can be pressured, and on slower surfaces or against elite returners/absorbers, he can be forced into more neutral exchanges than he wants. Even so, the statistical profile is still clearly that of a dangerous upper-tier player rather than a fringe grinder.",
miamiNote: "Miami is decent but not peak conditions for him. The surface is slower than classic fast hard courts, which slightly reduces the value of his first-strike game, but his serve remains strong enough to make him dangerous in almost any hard-court draw.",
surfaceNote: { hard: "Very strong, especially when conditions reward first-strike tennis and tiebreak execution.", clay: "Good, but not because he becomes a grinder; still dangerous due to serve/forehand and improved weight of shot.", grass: "Best surface. Serve, slice, forehand, and short-point profile become especially hard to contain." },
},

"Tsitsipas": {
eloRank: 31,
elo: 1850,
record2026: "10-6 (63%)",
record: "509-257 (66%) career",
style: "all_court_aggressor, serve_plus_one, forehand_dominant, one_handed_backhand",
strengths: "forehand, serve, variety, transition_game, clay_court_patterns",
serveStats: "Hold 86.2%, Ace 9%",
returnStats: "RPW 36.1%, Break rate 20.7%",
overallStats: "DR 1.12, TPW 51.9%, Tiebreak 58%",
h2h: "Strong against players who allow him to dictate with forehand and transition forward; vulnerable against opponents who can consistently attack or pin his backhand, especially with pace or high backhand pressure.",
fullNote: "Stefanos Tsitsipas is an all-court aggressive player built around a heavy forehand, strong first serve, and willingness to take time away early in rallies. At his peak, he combined strong serve numbers with above-average return performance, producing a well-rounded statistical profile. He is comfortable constructing points on clay and using variety, including net play, to finish. However, his one-handed backhand remains a structural vulnerability against high pace and targeted pressure, especially from elite returners or players who can repeatedly expose that wing. His recent results suggest a player whose underlying level is still strong but less dominant week-to-week, with more volatility and susceptibility in neutral exchanges than during his peak years.",
miamiNote: "Miami conditions are neutral-to-slightly unfavorable. Slower hard courts reduce the effectiveness of his first-strike patterns and expose his backhand more often in extended rallies.",
surfaceNote: { hard: "Good, but not dominant unless he can control with serve + forehand.", clay: "Best surface. Time allows him to construct points and use variety effectively.", grass: "Playable but not optimal; backhand can be rushed and exposed." },
},

"Fery": {
eloRank: 93,
elo: 1720,
record2026: "8-4 (67%)",
record: "145-79 (65%) career",
style: "balanced_baseliner, counterpunching_aggressor, return_oriented, two_handed_backhand",
strengths: "return_game, rally_tolerance, court_coverage, hard_court_baseline_patterns",
serveStats: "Hold 80.1%, Ace 6%",
returnStats: "RPW 40.1%, Break rate 27.4%",
overallStats: "DR 1.12, TPW 51.8%, Tiebreak 51%",
h2h: "Competitive against players he can extend into neutral rallies and pressure with depth; more vulnerable against stronger first-strike opponents who can protect serve and keep him from leveraging his return edge.",
fullNote: "Arthur Fery profiles as a balanced baseline player whose value comes more from point construction and return pressure than from overwhelming serve power. His ace rate and hold numbers are solid but not dominant, while his return numbers are notably strong for his level, especially the 40.1% return points won and 27.4% break rate. That combination suggests a player who wins through consistency, depth, and sustained scoreboard pressure rather than cheap points. His 2025 season was especially strong statistically, and his recent form indicates a player performing above his ranking. Against higher-level ATP opponents, the main limitation is that his serve and first-strike offense are not yet strong enough to consistently prevent stronger players from taking control early in rallies.",
miamiNote: "Miami is reasonably favorable. Slower hard conditions reward his return game and baseline consistency, but against top ATP servers or forehand-dominant aggressors he may struggle to hold often enough to sustain pressure.",
surfaceNote: { hard: "Best surface based on results and statistical profile; return game plays especially well here.", clay: "Playable, but current profile is less proven than on hard courts.", grass: "Can compete, but serve is not big enough to make grass a true advantage." },
},

"Arnaldi": {
eloRank: 74,
elo: 1750,
record2026: "1-2 (33%)",
record: "205-157 (57%) career",
style: "athletic_baseliner, counterpunching_aggressor, return_oriented, two_handed_backhand",
strengths: "movement, rally_tolerance, defensive_range, neutral-rally competitiveness, return pressure",
serveStats: "Hold 76.2%, Ace 6.3%",
returnStats: "RPW 38.8%, Break rate 25.1%",
overallStats: "DR 1, TPW 50.2%, Tiebreak 59%",
h2h: "Competitive when matches become physical and extended, especially against players who donate pace or allow him to reset points. More vulnerable against clean first-strike players and opponents who can expose his relatively modest serve.",
fullNote: "Matteo Arnaldi profiles as an athletic, return-capable baseline player whose game is built more on movement, point construction, and resilience than on raw serve or overwhelming first-strike offense. His career numbers are basically neutral overall — 50.2% total points won and a 1.00 dominance ratio — which fits a player who is good enough to compete broadly across ATP-level events but not dominant in any one phase. The return numbers are solid, while the serve numbers are clearly more vulnerable, especially the hold rate. That makes him a player who often needs to win through physicality and sustained pressure rather than serve-plus-one control. The bigger concern is recent trend: the last-52 profile drops meaningfully below career norms, suggesting his current rank and Elo are still giving him some credit for a stronger earlier phase than what he has shown most recently.",
miamiNote: "Miami is mixed. Slower hard courts help his movement and rally game, but his current form and vulnerable hold profile make him less attractive than a typical top-75 Elo player in this setting.",
surfaceNote: { hard: "Playable and credible at ATP level, but not naturally dominant because serve is only average and he often has to work hard to hold.", clay: "Probably the cleanest fit for his athletic baseline profile and extended-rally game.", grass: "Least natural surface; serve does not create enough free points and he is less able to grind into matches." },
},

"Shevchenko": {
eloRank: 120,
elo: 1680,
record2026: "Mixed results — hovering around .500 at ATP/Challenger level",
record: "261-208 (56%) career",
style: "baseline_counterpuncher, tempo_disruptor, moderate_aggressor, two_handed_backhand",
strengths: "rally_tolerance, depth_control, competitive_baseline play, tiebreak competence",
serveStats: "Hold 74.7%, Ace 5.7%",
returnStats: "RPW 38.7%, Break rate 25.3%",
overallStats: "DR 0.99, TPW 50%, Tiebreak 56%",
h2h: "Capable of pushing matches into extended baseline exchanges and tiebreaks, but struggles to impose himself against players with clear serve or first-strike advantages.",
fullNote: "Alexander Shevchenko profiles as a neutral-baseline ATP player whose game is built on rally tolerance and competitive depth rather than any overwhelming weapon. His statistical profile is almost perfectly balanced — 50.0% total points won and a 0.99 dominance ratio — which places him right on the edge between winning and losing players at tour level. Both serve and return sit slightly below top-tier thresholds, particularly the hold percentage, which limits his ability to control matches. Over the last 52 weeks, there has been no meaningful upward shift — the numbers remain flat to slightly negative, reinforcing the idea that his ranking has at times outpaced his underlying level. He can compete, extend matches, and steal sets, but lacks a reliable way to dictate outcomes consistently.",
miamiNote: "Miami conditions help him marginally — longer rallies and slower courts suit his baseline tolerance — but without a strong serve or dominant return edge, he remains more reactive than controlling in this environment.",
surfaceNote: { hard: "Competent but not dangerous — lacks the serve and first-strike tools to consistently win quick points.", clay: "Best surface fit — extended rallies and physical exchanges maximize his baseline stability.", grass: "Weakest surface — limited serve upside and difficulty shortening points." },
},

"Diallo": {
eloRank: 65,
elo: 1769,
record2026: "4-7",
record: "161-107 (60%) career",
style: "serve-first aggressor, big-server baseliner, short-point preference, two-handed backhand",
strengths: "serve quality, hold stability, 1st-ball offense, grass/hard court upside",
serveStats: "Hold 82.9%, Ace 10.8%",
returnStats: "RPW 36.9%, Break rate 21%",
overallStats: "DR 1.07, TPW 51.2%, Tiebreak 55%",
fullNote: "Gabriel Diallo profiles as a serve-led ATP attacker with a very real top-50 level baseline. The serve is the clear foundation: 10.8% ace rate, 82.9% hold rate, and strong first-serve volume make him difficult to break and dangerous in quick-strike conditions. Unlike pure serve bots, though, he is not empty underneath the serve — his overall career TPW of 51.2% and DR of 1.07 show legitimate main-tour quality. The limitation is on return: 36.9% RPW and 21.0% break rate are solid but not dominant, so many matches stay close and hinge on a few points. Over the last 52 weeks his profile flattened a bit, and in 2026 specifically the numbers have dipped sharply, which suggests some volatility and possible overpricing if the market is still treating him like a steady riser.",
miamiNote: "Miami is slightly less ideal for Diallo than faster hard courts or grass because the slower surface reduces the payoff from his serve-plus-first-strike pattern. He can still win there because the serve carries anywhere, but the environment trims his edge rather than amplifying it.",
surfaceNote: { hard: "Natural fit — serve and first-strike patterns translate well.", clay: "Playable but less optimal — return is not strong enough to dominate slower exchanges.", grass: "Best surface ceiling — big hold profile becomes especially dangerous." },
},

"Diallo": {
eloRank: 65,
elo: 1769,
record2026: "4-7",
record: "161-107 (60%) career",
style: "serve-first aggressor, big-server baseliner, short-point preference, two-handed backhand",
strengths: "serve quality, hold stability, 1st-ball offense, grass/hard court upside",
serveStats: "Hold 82.9%, Ace 10.8%",
returnStats: "RPW 36.9%, Break rate 21%",
overallStats: "DR 1.07, TPW 51.2%, Tiebreak 55%",
fullNote: "Gabriel Diallo profiles as a serve-led ATP attacker with a very real top-50 level baseline. The serve is the clear foundation: 10.8% ace rate, 82.9% hold rate, and strong first-serve volume make him difficult to break and dangerous in quick-strike conditions. Unlike pure serve bots, though, he is not empty underneath the serve — his overall career TPW of 51.2% and DR of 1.07 show legitimate main-tour quality. The limitation is on return: 36.9% RPW and 21.0% break rate are solid but not dominant, so many matches stay close and hinge on a few points. Over the last 52 weeks his profile flattened a bit, and in 2026 specifically the numbers have dipped sharply, which suggests some volatility and possible overpricing if the market is still treating him like a steady riser.",
miamiNote: "Miami is slightly less ideal for Diallo than faster hard courts or grass because the slower surface reduces the payoff from his serve-plus-first-strike pattern. He can still win there because the serve carries anywhere, but the environment trims his edge rather than amplifying it.",
surfaceNote: { hard: "Natural fit — serve and first-strike patterns translate well.", clay: "Playable but less optimal — return is not strong enough to dominate slower exchanges.", grass: "Best surface ceiling — big hold profile becomes especially dangerous." },
},

"Yibing Wu": {
eloRank: 38,
elo: 1828,
record2026: "11-5 (69%)",
record: "143-87 (62%) career",
style: "balanced hard-court aggressor, clean ball-striker, serve-plus-redirect player, takes time away without being serve-dependent",
strengths: "strong hard-court baseline level, excellent recent win rate, solid serve/return balance, tiebreak performance, upset capability vs top players",
serveStats: "Hold 78.2%, Ace 5.7%",
returnStats: "RPW 38.7%, Break rate 25.6%",
overallStats: "DR 1.05, TPW 50.9%, Tiebreak 61%",
fullNote: "Wu profiles as a very dangerous hard-court shotmaker whose ranking underrates his actual level. The standout feature is balance: unlike serve-only players, he wins in more than one way. His serve is solid but not overwhelming, while his return numbers are clearly above average for this tier. The recent sample is especially impressive — 36-14 in the last 52 with a 1.11 DR, and 11-5 in 2026 with another 1.10 DR. That is not fluke territory. His Elo at 1828 and Elo rank of 38 are the biggest signal here: the market/ranking may still be pricing him as a fringe top-120 player, but the performance profile is closer to a genuine top-50 hard-court threat when healthy and in rhythm.",
miamiNote: "Miami suits him better than it suits pure serve bots because he has enough return quality and baseline stability to survive longer rallies. The court does not kill his offense, and the slower conditions can actually help his timing and redirect game versus more one-dimensional opponents.",
surfaceNote: { hard: "Best surface by far; this is where his full profile shows up.", clay: "Can compete in spots, but not the ideal expression of his game.", grass: "Playable, but less proven." },
},

"Tirante": {
eloRank: 147,
elo: 1641,
record2026: "10-8 (56%)",
record: "253-191 (57%) career",
style: "baseline grinder, clay-oriented aggressor, heavy topspin patterns, two-handed backhand rally player",
strengths: "solid clay-court results, above-average return numbers, consistent baseline tolerance, competitive in long matches, recent Challenger success",
serveStats: "Hold 81%, Ace 9%",
returnStats: "RPW 38.9%, Break rate 26.3%",
overallStats: "DR 1.11, TPW 51.6%, Tiebreak 48%",
fullNote: "Tirante profiles as a clay-leaning baseline player with a solid but not dominant overall statistical profile. His last 52 weeks (49-35, 1.11 DR) show a stable, slightly above-average level driven more by return performance than elite serving. The 26.3% break rate and 38.9% return points won are strong for his tier, while the serve (81% hold, 9% ace rate) is functional but not a major weapon. His ranking rise has been built largely through Challenger-level clay success, including a title in Szczecin and multiple deep runs. On hard courts, results are more mixed, and his Elo (1641, rank 147) suggests he is more of a fringe top-100 player than a firmly established one.",
miamiNote: "Miami conditions are less ideal for his profile. While he can compete from the baseline, he lacks the easy hold ability and first-strike firepower that typically separate players in these slower hard-court conditions. Likely to rely on grinding and opponent errors rather than dictating consistently.",
surfaceNote: { hard: "Playable but less effective; results are inconsistent and depend on matchups.", clay: "Best surface; builds results through consistency and strong return game.", grass: "Very limited impact; not suited to his baseline-heavy style." },
},

"Valentin Royer": {
eloRank: 123,
elo: 1676,
record2026: "2-9 (18%)",
record: "256-149 (63%) career",
style: "aggressive baseliner, first-strike hard-court player, serve-plus-forehand oriented, two-handed backhand rally player",
strengths: "strong 2025 results base, solid career win rate, serviceable hold numbers, can win through first-strike patterns, proved capable of hard-court upsets",
serveStats: "Hold 81.9%, Ace 7.6%",
returnStats: "RPW 36.5%, Break rate 22.3%",
overallStats: "DR 1.03, TPW 50.7%, Tiebreak 43%",
fullNote: "Royer’s profile is heavily shaped by a strong 2025 season rather than his current level. The long-term baseline is respectable — 256-149 career with a 1.06 career dominance ratio — but the recent 52-week sample is only modestly positive at 43-34 with 50.7% total points won and a 1.03 DR. The key flag is 2026: just 2-9 with a 47.5% total points won mark and 0.82 DR, which is a major drop from 2025’s 61-31, 51.9% TPW, and 1.11 DR. His serve metrics are fine without being dominant, while the return numbers are fairly ordinary for this ranking tier. Overall, the ranking still reflects last year’s surge more than current underlying form.",
miamiNote: "Miami hard courts are playable for Royer because he can attack early and keep points short, but current form is a major concern. The profile does not show enough return strength or recent stability to trust him as a reliable hard-court performer right now.",
surfaceNote: { hard: "Playable and capable of spikes, especially when first-strike tennis is landing.", clay: "Can compete well here too, but not clearly better than hard by the numbers.", grass: "Limited sample, though he did qualify for Wimbledon and beat Stefanos Tsitsipas there in 2025." },
},

"Aleksandar Kovacevic": {
eloRank: 135,
elo: 1662,
record: "200-185 (52%) career",
style: "serve-first aggressor, one-handed backhand shotmaker, tiebreak-heavy player, quick-strike baseline style",
strengths: "strong serve and ace production, ability to push sets into tiebreaks, upset capability vs higher-ranked players, short-point effectiveness, hard-court preference",
serveStats: "Hold 83.7%, Ace 12.1%",
returnStats: "RPW 32%, Break rate 14.1%",
overallStats: "DR 0.94, TPW 49.2%, Tiebreak 49%",
fullNote: "Kovacevic is a serve-driven player whose profile is built around first-strike tennis and tiebreak frequency. His underlying numbers show a clear imbalance: strong serve metrics (83.7% hold, 12.1% ace rate, 76.3% first serve won) but very weak return production (32.0% RPW, 14.1% break rate). That combination leads to thin margins, reflected in a 49.2% total points won and 0.94 dominance ratio over the last 52 weeks. Despite flashes — including wins over Hurkacz, Norrie, and Rublev — the overall trend is negative (24-34 record). His ranking near the top 100 is more reflective of peak runs and isolated performances than consistent match-level dominance.",
miamiNote: "Miami conditions are not ideal for his profile. Slower hard courts reduce the impact of his serve and force more extended rallies, where his return game and baseline consistency are less reliable. Matches often hinge on tiebreaks, making outcomes volatile.",
surfaceNote: { hard: "Best surface; serve plays up and allows him to compete with higher-ranked opponents.", clay: "Less effective due to reduced serve impact and longer rallies.", grass: "Limited success despite theoretically favorable conditions." },
},

"Rei Sakamoto": {
eloRank: 160,
elo: 1627,
record2026: "12-7 (63%)",
record: "78-65 (55%) career",
style: "balanced hard-court aggressor, young baseline attacker, serve-led all-court prospect, two-handed backhand rally player",
strengths: "strong age-adjusted upside, solid 2026 improvement, good serve metrics for his age, positive hard-court trajectory, above-average recent point metrics",
serveStats: "Hold 80.8%, Ace 10.1%",
returnStats: "RPW 37.4%, Break rate 21.8%",
overallStats: "DR 1.07, TPW 51%, Tiebreak 54%",
fullNote: "Sakamoto profiles as one of the more interesting young risers in this pool because the age-adjusted indicators are already solid and the 2026 trend is clearly positive. He has a balanced statistical base rather than a one-dimensional one: 80.8% hold rate, 37.4% return points won, 51.0% total points won, and a 1.07 dominance ratio over the last 52 weeks. The 2026 sample is stronger still, jumping to 52.2% TPW and 1.15 DR with a 12-7 record. For a 19-year-old, that combination of serve competence, improving return numbers, and positive match results is a strong signal. He is not yet fully proven at ATP level, but the profile already looks more stable than a typical teenage projection-only player.",
miamiNote: "Miami is a difficult but useful measuring spot for him. The slower hard courts should test whether his improving baseline level and return game can hold up against stronger ATP opponents, but his current trajectory suggests he is capable of competing rather than just participating.",
surfaceNote: { hard: "Best surface right now; most of the recent rise and strongest results have come here.", clay: "Playable developmental surface, but less reliable than hard at this stage.", grass: "Very limited evidence so far." },
},

"Quentin Halys": {
eloRank: 107,
elo: 1693,
record2026: "14-10 (58%)",
record: "430-348 (55%) career",
style: "serve-first aggressor, big first-strike hard-court player, ace-driven quick-point attacker, two-handed backhand power baseliner",
strengths: "elite ace production, strong first-serve effectiveness, hard-court upside, tiebreak comfort, capable of upsetting top players",
serveStats: "Hold 82.8%, Ace 13.3%",
returnStats: "RPW 33.4%, Break rate 14.1%",
overallStats: "DR 0.99, TPW 49.7%, Tiebreak 50%",
fullNote: "Halys is a classic serve-led power player whose profile is built around free points, short rallies, and pressure-score tennis. The underlying split is clear: his serve remains a real weapon — 13.3% ace rate, 82.8% hold rate, and 77.4% first-serve points won over the last 52 weeks — but the return side is limited, with just 33.4% return points won and 14.1% break rate. That leaves him living on narrow margins, which is why the last-52 sample is only 23-33 despite top-50 caliber weapons. The more encouraging signal is 2026, where he has rebounded to 14-10 with 51.1% total points won and a 1.09 dominance ratio. When the serve is landing and the forehand is dictating, he can hit through strong fields and steal matches from higher-ranked opponents, but the profile remains volatile because the return game gives him little margin for error.",
miamiNote: "Miami is playable but not ideal for Halys. The slower hard courts reduce some of the cheap value on his serve and force him to win more baseline exchanges than he would prefer. He can still be dangerous if serving well, but the conditions make him less comfortable than on quicker hard courts or grass.",
surfaceNote: { hard: "Best surface overall; serve and first-strike patterns are most effective here.", clay: "More competent than his style suggests, but still not the cleanest fit for his game.", grass: "Very dangerous on grass because the serve plays up even more." },
},

"Liam Draxl": {
eloRank: 171,
elo: 1613,
record2026: "11-7 (61%)",
record: "216-116 (65%) career",
style: "balanced counterpunching baseliner, return-oriented grinder, high-percentage rally player, two-handed backhand consistency player",
strengths: "strong return game, high win rate across levels, consistent baseline tolerance, solid break rate, tiebreak effectiveness",
serveStats: "Hold 76.1%, Ace 6.2%",
returnStats: "RPW 39.9%, Break rate 27.9%",
overallStats: "DR 1.05, TPW 50.9%, Tiebreak 63%",
fullNote: "Draxl profiles as a return-first, consistency-driven player whose success is built on grinding opponents down rather than overpowering them. The key statistical identity is clear: below-average serve impact (76.1% hold, 6.2% ace rate) paired with a strong return profile (39.9% RPW, 27.9% break rate). That combination supports a solid 50.9% total points won and 1.05 dominance ratio over the last 52 weeks, along with a strong 45-28 record. His 2025 season was particularly strong (49-29, 51.4% TPW, 1.07 DR), but 2026 has dipped slightly in underlying level (48.9% TPW, 0.95 DR), suggesting some regression. Overall, he is a reliable match player who wins through consistency and pressure rather than serve dominance, but lacks easy points against higher-level opponents.",
miamiNote: "Miami conditions suit his profile reasonably well. The slower hard courts give him time to engage in longer rallies and leverage his return game, though his lack of serve power can still leave him vulnerable against big hitters who control first strike.",
surfaceNote: { hard: "Best surface; consistent results and strongest statistical profile.", clay: "Very playable due to rally tolerance and return strength.", grass: "Less effective due to limited serve power and reduced rally patterns." },
},

"Kamil Majchrzak": {
eloRank: 70,
elo: 1754,
record2026: "6-7 (46%)",
record: "424-243 (64%) career",
style: "balanced counterpunching baseliner, high-IQ point constructor, grinder with offensive transitions, two-handed backhand consistency player",
strengths: "well-rounded serve/return balance, consistent baseline tolerance, solid hard-court performance, experience and match management, ability to extend rallies and outlast opponents",
serveStats: "Hold 82.4%, Ace 7.6%",
returnStats: "RPW 37.7%, Break rate 22.2%",
overallStats: "DR 1.07, TPW 51.2%, Tiebreak 52%",
fullNote: "Majchrzak is a classic well-balanced tour-level player whose game is built on consistency, depth, and decision-making rather than overwhelming weapons. His statistical profile reflects that balance: 82.4% hold rate paired with 37.7% return points won, producing a solid 51.2% total points won and 1.07 dominance ratio over the last 52 weeks. His 2024 season was elite at the Challenger level (53.7% TPW, 1.22 DR), which drove his return to the top 60, and his Elo (1754) still supports that level. However, 2026 has been a step back so far (6-7 record, sub-50% TPW), with declining return numbers being the main drag. Overall, he remains a very stable, matchup-dependent player who can compete across surfaces but relies on consistency and structure rather than easy offense.",
miamiNote: "Miami conditions suit his game reasonably well. The slower hard courts allow him to extend rallies and leverage his consistency, though he may struggle to hit through bigger hitters unless he controls patterns early in points.",
surfaceNote: { hard: "Strongest surface overall; balanced profile plays well in extended baseline exchanges.", clay: "Very comfortable; consistency and movement translate well.", grass: "Capable but less dangerous due to lack of serve firepower." },
},

"Miomir Kecmanovic": {
eloRank: 72,
elo: 1752,
record2026: "8-10 (44%)",
record: "313-261 (55%) career",
style: "baseline counterpuncher, rally-tolerant grinder, balanced but non-elite weapon profile, redirect-heavy backhand player",
strengths: "solid baseline consistency, ability to absorb pace, physical durability in long rallies, occasional upset capability, experience vs top players",
serveStats: "Hold 79.3%, Ace 6.5%",
returnStats: "RPW 36.6%, Break rate 20.6%",
overallStats: "DR 1.01, TPW 49.9%, Tiebreak 37%",
fullNote: "Kecmanovic profiles as a steady, baseline-oriented player whose game is built on rally tolerance and structure rather than elite weapons. His underlying numbers show a very narrow margin profile: 49.9% total points won and a 1.01 dominance ratio over the last 52 weeks, which aligns with his losing record in that span (23-31). The serve is solid but not dominant (79.3% hold), and the return has declined from earlier career levels (20.6% break rate), limiting his ability to create separation. His peak level (2022 season, 1.09 DR) showed what the profile looks like when everything clicks, but recent seasons have trended toward mediocrity. 2026 has been slightly more stable statistically than results suggest, but overall he remains a highly matchup-dependent player without a clear elite weapon to rely on in tight matches.",
miamiNote: "Miami conditions are neutral to slightly favorable. Longer rallies suit his consistency, but without easy offense he can struggle to finish points against higher-end players who can take control of rallies.",
surfaceNote: { hard: "Most balanced surface; results depend heavily on matchup quality.", clay: "Comfortable and consistent, but lacks top-end weapons to dominate.", grass: "Least effective surface due to limited serve impact." },
},

"career_record": {

},

"serve_stats": {

},

"return_stats": {

},

"overall_stats": {

},

"form": {

},

"Alexei Popyrin": {
eloRank: 82,
elo: 1739,
record2026: "2-9 (18%)",
record: "267-242 (52%) career",
style: "serve-dominant aggressive baseliner, first-strike tennis player, big forehand attacker, short-point oriented",
strengths: "high ace rate and free points on serve, forehand power, tiebreak ability, upside vs top players, ability to play explosive short bursts",
serveStats: "Hold 81.7%, Ace 10.4%",
returnStats: "RPW 35%, Break rate 18%",
overallStats: "DR 1, TPW 50%, Tiebreak 58%",
fullNote: "Popyrin profiles as a classic serve + forehand attacker whose outcomes are heavily driven by first-strike success. The serve is clearly the foundation (10.4% ace rate, 81.7% hold), but the return side is consistently below average (35.0% RPW, 18.0% break), which keeps his overall profile around neutral (50.0% TPW, 1.00 DR). His peak stretch came in 2024 (1.03 DR), showing that when the forehand and serve align he can push into top-20 level. However, the last 52 weeks (0.97 DR) and especially 2026 (0.94 DR, 2-9 record) show clear regression, driven primarily by declining return impact and inconsistency in longer rallies. He remains a high-variance player capable of big wins, but with a fragile baseline floor when the serve is not dominant.",
miamiNote: "Miami conditions are slightly negative for his profile. The slower courts reduce his first-strike effectiveness and expose his weaker return and rally tolerance, making him more vulnerable to balanced baseline players.",
surfaceNote: { hard: "Best surface; serve and forehand combination plays up.", clay: "More limited; struggles to generate consistent advantage in extended rallies.", grass: "Very dangerous in short formats due to serve dominance." },
},

"Jacob Fearnley": {
eloRank: 145,
elo: 1643,
record2026: "5-10 (33%)",
record: "99-54 (65%) career",
style: "balanced baseliner, counterpunching with offensive transitions, two-handed backhand rally player, tempo-based point constructor",
strengths: "strong return metrics, solid break rate, high peak level (2024 season), good rally tolerance, ability to compete across surfaces",
serveStats: "Hold 75.4%, Ace 6.9%",
returnStats: "RPW 37.6%, Break rate 23.7%",
overallStats: "DR 0.97, TPW 49.5%, Tiebreak 45%",
fullNote: "Fearnley is a developing, well-rounded baseline player whose profile is built more on balance than on elite weapons. His career numbers are strong (65% win rate, 1.05 DR), largely driven by a dominant 2024 season (53.0% TPW, 1.18 DR), but the transition to higher levels has exposed limitations. Over the last 52 weeks, the profile has dropped to 49.5% total points won and a 0.97 DR, with 2026 declining further (0.91 DR). The key strength remains his return game (37.6% RPW, 23.7% break), which is above average for this tier, but the serve is a clear liability (75.4% hold), limiting his ability to control matches. Overall, he profiles as a competitive, rally-capable player whose ceiling depends on whether the serve can improve enough to support his return strengths.",
miamiNote: "Miami conditions are generally favorable for his profile. The slower hard courts allow him to extend rallies and lean on his return game, though his serve vulnerability can still be targeted by stronger opponents.",
surfaceNote: { hard: "Most reliable surface; balanced profile plays best here.", clay: "Comfortable due to rally tolerance and return strength.", grass: "Less effective due to limited serve impact." },
},

"Marton Fucsovics": {
eloRank: 57,
elo: 1788,
record2026: "5-6 (45%)",
record: "495-367 (57%) career",
style: "physical baseliner, counterpunching grinder, athletic all-court mover, long-rally tolerance player",
strengths: "elite physicality and endurance, strong return game, baseline consistency, ability to absorb pace, veteran match toughness",
serveStats: "Hold 80%, Ace 5.1%",
returnStats: "RPW 39.2%, Break rate 25.3%",
overallStats: "DR 1.1, TPW 51.5%, Tiebreak 44%",
fullNote: "Fucsovics remains one of the most physically reliable baseline players on tour, with a profile built on endurance, rally tolerance, and return strength rather than pure weapons. His last 52 weeks are strong (1.10 DR, 51.5% TPW), driven by an excellent 2025 season (1.16 DR), showing he can still perform at a high level deep into his 30s. The return game is a standout (39.2% RPW, 25.3% break), consistently putting pressure on opponents, while the serve is solid but not dominant (80% hold, low ace rate). In 2026, there are mild signs of regression (1.01 DR), but the underlying profile remains stable. Overall, he profiles as a high-floor, physically demanding opponent who drags matches into extended rallies and wins through consistency rather than explosiveness.",
miamiNote: "Miami conditions suit his grinding style. Slower hard courts enhance his return game and physical edge, though he can struggle to finish points against higher-end offensive players.",
surfaceNote: { hard: "Reliable; balanced profile translates well.", clay: "Very strong; physicality and rally tolerance are maximized.", grass: "Least effective due to limited serve and shorter point dynamics." },
},

"Terence Atmane": {
eloRank: 136,
elo: 1660,
record2026: "4-8 (33%)",
record: "235-160 (59%) career",
style: "lefty serve-based aggressor, first-strike baseliner, tempo-driven offensive player, serve-plus-forehand patterns",
strengths: "high ace rate, lefty serve patterns, tiebreak performance, ability to take time away, upside against top players",
serveStats: "Hold 79.7%, Ace 10.6%",
returnStats: "RPW 35%, Break rate 18.2%",
overallStats: "DR 0.97, TPW 49.7%, Tiebreak 67%",
fullNote: "Atmane is a left-handed, serve-oriented aggressor whose profile is built around first-strike tennis and quick point construction. His biggest weapon is the serve (10.6% ace rate, 73.8% 1st serve won), which allows him to generate pressure and shorten points, especially on faster courts. However, the return game is clearly below average (35.0% RPW, 18.2% break), creating an imbalanced profile that relies heavily on holding serve. The last 52 weeks show slight underperformance (0.97 DR), and 2026 has been a clear regression so far (0.86 DR, 47.9% TPW). One notable strength is tiebreak play (67%), which aligns with his serve-heavy style. Overall, he profiles as a high-variance player capable of upsetting stronger opponents when the serve is firing, but vulnerable in extended rallies and return-heavy matchups.",
miamiNote: "Miami conditions are not ideal for his profile. The slower courts reduce the effectiveness of his serve and force more rallies, exposing his weaker return and baseline consistency.",
surfaceNote: { hard: "Best surface, especially faster conditions that reward his serve.", clay: "Less effective; longer rallies reduce his edge.", grass: "Potentially strong due to lefty serve and first-strike patterns." },
},

"Daniel Altmaier": {
eloRank: 109,
elo: 1692,
record2026: "0-7 (0%)",
record: "386-288 (57%) career",
style: "one-handed backhand baseliner, clay-oriented grinder, heavy topspin rally player, physical point constructor",
strengths: "solid return game, rally tolerance, clay-court performance, ability to extend points, upset capability on slower surfaces",
serveStats: "Hold 76.5%, Ace 9%",
returnStats: "RPW 34.7%, Break rate 18.2%",
overallStats: "DR 0.91, TPW 48.5%, Tiebreak 46%",
fullNote: "Altmaier is a clay-leaning baseline grinder built around heavy topspin, physicality, and point construction rather than pure weapons. His career profile is stable (50.1% TPW, 1.00 DR), but recent performance shows clear decline. Over the last 52 weeks, he sits at 48.5% TPW and a 0.91 DR, with a severe drop in 2026 (0-7 record, 0.58 DR, 41.2% TPW). The serve is below average for this level (76.5% hold), and the return numbers have also dipped (34.7% RPW), removing his margin in longer matches. His best results continue to come on clay, where his physical style and rally tolerance can still create problems, including wins over top players. However, current form suggests a player significantly underperforming his ranking, particularly on faster surfaces.",
miamiNote: "Miami conditions are unfavorable for his profile. The slower hard courts do not compensate enough for his lack of serve dominance, and his current form makes him vulnerable even in extended rallies.",
surfaceNote: { hard: "Less effective; lacks serve and offensive edge.", clay: "Best surface; grinding style and heavy spin are maximized.", grass: "Weakest surface; struggles to control short points." },
},

"Arthur Cazaux": {
eloRank: 53,
elo: 1796,
record2026: "2-1 (67%)",
record: "201-127 (61%) career",
style: "aggressive serve-plus-forehand player, high-tempo shotmaker, first-strike baseliner, hard-court offensive profile",
strengths: "strong serve +1 combination, high hold percentage, above-average return for aggressive player, recent winning form, upside vs higher-ranked opponents",
serveStats: "Hold 83.2%, Ace 10.9%",
returnStats: "RPW 36.3%, Break rate 21.2%",
overallStats: "DR 1.06, TPW 51%, Tiebreak 59%",
fullNote: "Cazaux is one of the clearest ‘Elo > ranking’ players in this tier. With a 1796 Elo (rank 53), he profiles much closer to a top-50 level than his current ranking suggests. His game is built around aggressive first-strike tennis — strong serve (83.2% hold, 10.9% aces) combined with heavy forehand pressure. Unlike many players in this mold, he also brings solid return production (36.3% RPW), giving him a more complete profile than pure serve bots. The last 52 weeks are consistently strong (1.06 DR), and the early 2026 sample is elite (56.1% TPW, 1.43 DR), indicating real upward momentum rather than variance. Overall, he projects as a rising hard-court threat with the tools to break into the top tier if the trajectory holds.",
miamiNote: "Miami is still a positive environment for him. While slightly slower conditions reduce pure serve dominance, his ability to generate offense from the baseline and maintain solid return numbers keeps him effective.",
surfaceNote: { hard: "Best surface; full offensive profile translates.", clay: "Playable, but less dangerous than on faster courts.", grass: "Very effective; serve +1 game plays up." },
},

"Sebastian Baez": {
eloRank: 59,
elo: 1786,
record2026: "14-6 (70%)",
record: "275-179 (61%) career",
style: "clay-court counterpuncher, high-volume returner, grinding baseliner, physical rally player",
strengths: "elite return game, high break percentage, consistency and rally tolerance, clay-court dominance, strong recent 2026 form",
serveStats: "Hold 70.9%, Ace 2.4%",
returnStats: "RPW 39.5%, Break rate 26.5%",
overallStats: "DR 0.97, TPW 49.5%, Tiebreak 70%",
fullNote: "Baez is a return-driven grinder whose profile is heavily skewed toward clay-court success. The defining feature is his return game (39.5% RPW, 26.5% break), which consistently puts pressure on opponents, but this is offset by a weak serve (70.9% hold, very low ace rate). Over the last 52 weeks, his overall numbers have dipped below tour-average impact (0.97 DR), largely due to struggles on faster surfaces where his lack of free points is exposed. However, 2026 shows a clear rebound (14-6 record, 1.06 DR), driven by strong clay results and improved hold percentage (79.8%). At his best, he can overwhelm opponents in extended rallies, but his ceiling remains surface-dependent, with limited upside on fast hard courts or grass.",
miamiNote: "Miami conditions are challenging for his profile. While the slower courts help extend rallies, his lack of serve power makes it difficult to hold consistently against aggressive opponents on hard courts.",
surfaceNote: { hard: "Below average; serve limitations are exposed.", clay: "Elite surface; return game and consistency dominate.", grass: "Weakest surface; struggles to control short points." },
},

"Alejandro Tabilo": {
eloRank: 50,
elo: 1802,
record2026: "18-8 (69%)",
record: "353-252 (58%) career",
style: "lefty all-court aggressor, serve-plus-forehand player, tempo disruptor, controlled baseline attacker",
strengths: "lefty serve patterns, strong hold percentage, solid recent win rate, forehand control and finishing, versatility across surfaces",
serveStats: "Hold 83.4%, Ace 7.8%",
returnStats: "RPW 37.1%, Break rate 22.1%",
overallStats: "DR 1.08, TPW 51.4%, Tiebreak 46%",
fullNote: "Tabilo has developed into a well-rounded lefty with a strong serve + forehand foundation and increasingly reliable baseline control. The key shift is in the last 12 months: a 43-23 record with a 1.08 DR, followed by an even stronger 2026 sample (18-8, 1.18 DR). His serve is now a real weapon (83–84% hold range), especially with lefty patterns that open the court, and his forehand does the damage behind it. Unlike pure serve bots, he maintains a solid enough return game to stay neutral or slightly positive overall. His Elo (1802, rank ~50) aligns closely with his ranking, suggesting this is a stable top-40/top-50 level rather than a spike. The main limitation is that his edge comes more from efficiency than overwhelming weapons, so against elite defenders or big hitters his margin can shrink.",
miamiNote: "Miami is a good fit. The slower hard courts give him time to set up his forehand while still rewarding his serve patterns. His balanced profile plays well here compared to more one-dimensional players.",
surfaceNote: { hard: "Very solid; current level translates well.", clay: "Strong, especially with heavy forehand and consistency.", grass: "Underrated; lefty serve gives him upside." },
},

"Francisco Comesana": {
eloRank: 124,
elo: 1676,
record2026: "4-9 (31%)",
record: "242-164 (60%) career",
style: "baseline grinder, clay-oriented counterpuncher, physical rally player, depth-over-power hitter",
strengths: "solid rally tolerance, above-average return ability, point construction on clay, consistency over long matches, grinding mentality",
serveStats: "Hold 77.4%, Ace 9.6%",
returnStats: "RPW 37%, Break rate 20.5%",
overallStats: "DR 0.99, TPW 49.9%, Tiebreak 40%",
fullNote: "Comesana profiles as a classic clay-first grinder whose underlying numbers have flattened out at the ATP level. While his career record is strong (60%), the recent trend is clearly negative: sub-.500 over the last 52 matches and a very weak 2026 start (4-9, 0.96 DR). His game is built around consistency and rally tolerance rather than weapons — the serve is decent but not a separator, and the return is only mildly positive. That combination leaves him needing long exchanges to win matches, which becomes difficult against higher-level attackers. The key signal is the DR sitting around 1.00 or below recently, suggesting he is playing at roughly break-even level rather than progressing upward. His Elo (1676) also places him outside the true top tier despite a top-100 ranking.",
miamiNote: "Miami is not an ideal fit. The slower hard courts don’t give him the same edge as clay, and without a strong serve or finishing weapon, he can struggle to hit through opponents or protect holds consistently.",
surfaceNote: { hard: "Playable but limited ceiling; lacks finishing power.", clay: "Best surface; maximizes his grinding style.", grass: "Least effective surface." },
},

"Alex Michelsen": {
eloRank: 33,
elo: 1841,
record2026: "10-6 (63%)",
record: "168-104 (62%) career",
style: "aggressive baseliner, serve + forehand attacker, front-foot hard court player, tempo controller",
strengths: "strong first serve + hold rate, forehand as primary weapon, ability to dictate rallies, solid performance vs top players, clutch in tight matches (tiebreak positive)",
serveStats: "Hold 79.8%, Ace 7.4%",
returnStats: "RPW 36.4%, Break rate 19.4%",
overallStats: "DR 1.01, TPW 50%, Tiebreak 52%",
fullNote: "Michelsen is one of the more promising young hard-court players, already sitting top-35 in Elo at just 21. His profile is built around a strong serve (nearly 80% holds) and an aggressive forehand that allows him to take control of rallies early. Unlike many young players, he already shows the ability to beat top opponents (wins over Fritz, Tsitsipas, Musetti) and compete in high-level matches. The underlying numbers are solid but not dominant — hovering around 50% TPW and ~1.00 DR — which suggests a player still developing consistency rather than fully established. The key positive trend is 2026 improvement (1.06 DR, 63% win rate), indicating upward momentum. His game is best when he’s dictating; when forced into extended neutral rallies, his edge diminishes.",
miamiNote: "Miami conditions suit him well. The medium-paced hard courts reward his serve + forehand patterns, and his improving hold numbers (85% in 2026 sample) make him dangerous, especially in best-of-3 formats.",
surfaceNote: { hard: "Best surface; aggressive game translates directly.", clay: "Playable but less effective due to reduced finishing power.", grass: "Solid upside; serve and first-strike tennis carry over well." },
},

"Mattia Bellucci": {
eloRank: 99,
elo: 1709,
record2026: "12-10 (55%)",
record: "221-164 (57%) career",
style: "lefty aggressive baseliner, serve-plus-forehand player, tempo disruptor, shotmaker with variation",
strengths: "lefty serve patterns, above-average hold percentage, ability to take time away, tiebreak performance, upset potential vs higher-ranked players",
serveStats: "Hold 78.5%, Ace 8.2%",
returnStats: "RPW 36.7%, Break rate 20.5%",
overallStats: "DR 1, TPW 49.9%, Tiebreak 50%",
fullNote: "Bellucci is a left-handed shotmaker with a solid serve + forehand foundation and the ability to disrupt rhythm with variation. His profile is relatively balanced, with a strong enough serve (78–80% hold range) and neutral-to-slightly positive return numbers. However, the last 52 weeks show stagnation (49.9% TPW, 1.00 DR), indicating a player hovering around tour-average impact. The 2026 sample is more encouraging (1.07 DR), suggesting some upward movement, highlighted by strong Challenger results and occasional wins over top players. His biggest asset is unpredictability and lefty patterns, but inconsistency remains an issue — his level can fluctuate significantly match to match.",
miamiNote: "Miami conditions are moderately favorable. The slower hard courts give him time to construct points and use his variation, but he still needs to serve well to avoid getting pulled into neutral rallies where his edge is limited.",
surfaceNote: { hard: "Best surface; balanced profile plays well.", clay: "Playable but not dominant.", grass: "Decent upside due to lefty serve and shotmaking." },
},

"Emilio Nava": {
eloRank: 137,
elo: 1660,
record2026: "7-9 (44%)",
record: "232-168 (58%) career",
style: "aggressive baseliner, serve-plus-forehand player, high-tempo striker, confidence-driven shotmaker",
strengths: "strong serve metrics, high ace rate, solid recent win rate (last 52), ability to play aggressive tennis, upside on hard courts",
serveStats: "Hold 83.1%, Ace 11.1%",
returnStats: "RPW 37.5%, Break rate 22.1%",
overallStats: "DR 1.08, TPW 51.3%, Tiebreak 57%",
fullNote: "Nava is a classic momentum-based aggressor whose profile took a major step forward in 2025 before regressing in early 2026. The standout numbers come from the last 52 weeks: 46-28 record, 51.3% TPW, and a strong 1.08 DR, supported by an excellent serve (83% holds, 11% aces). That profile suggests a legitimate top-60 level when in form. However, 2026 has been a clear drop-off (0.94 DR, 49.1% TPW), driven by declining return numbers and reduced break percentage. His game is built on first-strike tennis and confidence — when the serve and forehand are clicking, he can beat strong opponents, but his level can dip quickly when forced into longer rallies or defensive positions. The Elo (1660) suggests the market may still be adjusting downward from his 2025 peak level.",
miamiNote: "Miami is a neutral-to-slightly negative spot. The slower hard courts reduce his ability to finish quickly, putting more pressure on his rally tolerance and return consistency, which have dipped in 2026.",
surfaceNote: { hard: "Best surface; serve-driven game is most effective.", clay: "Playable but less dangerous; rallies expose limitations.", grass: "Solid upside due to serve and aggressive patterns." },
},

"Tomas Machac": {
eloRank: 29,
elo: 1858,
record2026: "8-4 (67%)",
record: "275-152 (64%) career",
style: "counterpunching aggressor, elite movement + transition player, flat hitter with redirect ability, all-court shotmaker",
strengths: "excellent return numbers, high break rate, movement and court coverage, ability to redirect pace, proven top-tier wins",
serveStats: "Hold 81.6%, Ace 7.9%",
returnStats: "RPW 34.8%, Break rate 20.2%",
overallStats: "DR 0.96, TPW 49.8%, Tiebreak 50%",
fullNote: "Machac is a high-end all-court player whose peak level (top-20 ranking, 1858 Elo) reflects a genuinely dangerous profile driven by movement, return pressure, and shot tolerance. At his best, he combines strong returning (career 39.1% RPW, 27% break rate) with the ability to redirect pace and extend rallies until openings appear. However, the last 52-week sample shows a dip (0.96 DR), indicating inconsistency relative to his peak level. The 2026 results are solid on the surface (8-4 record, title in Adelaide), but underlying numbers remain only neutral (~1.00 DR). His game relies less on raw power and more on timing and movement, so small dips in form can have an outsized impact. When sharp, he profiles as a clear top-30 level player; when off, he plays closer to tour average.",
miamiNote: "Miami is a strong fit. The slower hard courts enhance his movement, defense-to-offense transitions, and return game, allowing him to grind down more aggressive opponents.",
surfaceNote: { hard: "Best surface; balanced game thrives.", clay: "Very strong; movement and rally tolerance translate well.", grass: "Playable, but less effective without time to construct points." },
},

"Roberto Bautista Agut": {
eloRank: 68,
elo: 1763,
record2026: "4-6 (40%)",
record: "736-471 (61%) career",
style: "ultra-consistent baseliner, rhythm disruptor, counterpunching grinder, low-error pressure player",
strengths: "elite ball tolerance, excellent depth and direction control, strong return fundamentals, very steady off both wings, high-level match discipline and fitness base",
serveStats: "Hold 77.1%, Ace 3.9%",
returnStats: "RPW 36%, Break rate 19.2%",
overallStats: "DR 0.96, TPW 49.4%, Tiebreak 42%",
fullNote: "Bautista Agut remains a very recognizable version of himself stylistically: compact, disciplined, hard to hit through, and built around repetition, depth, and clean directional control from the baseline. Even at 37, the core identity is intact. The issue is that the underlying numbers now point to decline versus ATP main-draw average at his old level: last-52 DR of 0.96, 2026 DR of 0.92, weaker hold numbers, and less scoreboard edge in close matches. His return game is still solid and his floor is still respectable because he competes so cleanly, but he no longer gets enough cheap offense from the serve and is less able to turn neutral rallies into sustained pressure against stronger athletes. He is still dangerous against impatient or error-prone opponents, yet his profile now looks more like a veteran spoiler than a reliable top-tier hard-court threat.",
miamiNote: "Miami is mixed for him. The slower hard court helps his consistency and return patterns, but the heavier physical demands and reduced free points on serve make it tougher for him to hold up against stronger current top-50 hitters.",
surfaceNote: { hard: "Still playable because of timing and consistency, but less threatening than at peak.", clay: "Can still grind and redirect well, though lacks finishing power.", grass: "Least comfortable relative to prime because he gets less time to establish rhythm." },
},

"Karen Khachanov": {
eloRank: 25,
elo: 1863,
record2026: "6-6 (50%)",
record: "430-295 (59%) career",
style: "first-strike power baseliner, big serve + heavy forehand attacker, high-pace backhand driver, front-foot hard-court aggressor",
strengths: "big serve and easy hold ability, plus forehand weight through the court, strong backhand through neutral exchanges, excellent pace tolerance against top players, dangerous on faster hard courts and in short points",
serveStats: "Hold 83.7%, Ace 8.5%",
returnStats: "RPW 36.8%, Break rate 21.8%",
overallStats: "DR 1.1, TPW 51.4%, Tiebreak 39%",
fullNote: "Khachanov is still the same essential player archetype: big-bodied, big-serving, baseline-led power tennis with his best patterns built around serve plus first forehand and sustained backhand pace. The overall profile remains strong: last-52 DR of 1.10 with solid hold numbers and enough return value to stay above water against strong fields. The main contradiction in his recent data is the poor tiebreak record despite otherwise healthy point-based indicators, especially in 2026 where he is only 1-7 in breakers. That usually suggests performance has been better than the bare win-loss headline. He is most dangerous when he gets clean court positioning and can hit through the middle or inside-out without being dragged into low-balance defending. Against elite redirectors or players who can expose his movement in extended patterns, he becomes more beatable, but his power floor remains high enough to threaten almost anyone on hard courts.",
miamiNote: "Miami is decent but not perfect for him. The court rewards his serve and first-strike ball, yet the slightly slower conditions can force extra rally tolerance and make it harder to finish quickly against elite movers. He is still a very live hard-court threat here because the serve baseline is strong enough to protect him in most matches.",
surfaceNote: { hard: "Best surface overall; serve and first-strike patterns play at full value.", clay: "Playable because he hits heavy through the court, but movement and point construction get stressed.", grass: "Can be dangerous thanks to serve and flat pace, though return windows are narrower." },
},

"Casper Ruud": {
eloRank: 16,
elo: 1934,
record2026: "7-6 (54%)",
record: "431-243 (64%) career",
style: "heavy topspin baseliner, forehand-dominant grinder, high-margin rally constructor, physical endurance-based player",
strengths: "elite forehand weight and consistency, high rally tolerance, strong clay-court fundamentals, improved serve over last few seasons, disciplined point construction",
serveStats: "Hold 85.4%, Ace 8.7%",
returnStats: "RPW 36.4%, Break rate 21.5%",
overallStats: "DR 1.09, TPW 51.5%, Tiebreak 63%",
fullNote: "Ruud remains one of the most structurally sound baseline players on tour, built around heavy forehand spin, consistency, and physical endurance. His long-term profile is extremely stable (career 1.09 DR), and the last 52 weeks reinforce that with a 1.09 DR and strong 65% win rate. The key development in recent years has been serve improvement — now holding at 85% in the last 52 — which has elevated his hard-court viability. However, 2026 shows a notable dip (0.95 DR, 50.0% TPW), driven primarily by a sharp decline in return effectiveness (32.3% RPW, 14.7% break rate). That drop reduces his ability to control matches from the baseline and forces more reliance on serve. At his best, he is a top-tier clay and high-level hard-court grinder; when the return slips, his profile becomes more neutral and easier to pressure for aggressive opponents.",
miamiNote: "Miami is slightly negative relative to his peak conditions. The slower hard court helps his rally tolerance, but reduced return effectiveness in 2026 makes it harder for him to consistently generate break chances against strong servers.",
surfaceNote: { hard: "Strong but slightly less dominant; depends on serve/return balance.", clay: "Elite surface; forehand and physical profile fully maximized.", grass: "Least effective; flatter hitters and quick points reduce his advantages." },
},

"Ethan Quinn": {
eloRank: 48,
elo: 1807,
record2026: "11-6 (65%)",
record: "132-99 (57%) career",
style: "aggressive baseliner, serve-first striker, tiebreak-oriented competitor, tempo-driven hard-court player",
strengths: "big serve for his tier, strong tiebreak performance, recent upward trajectory, ability to take time away, confidence vs higher-ranked players",
serveStats: "Hold 80.7%, Ace 9.8%",
returnStats: "RPW 35.7%, Break rate 19.2%",
overallStats: "DR 1, TPW 50.1%, Tiebreak 69%",
fullNote: "Quinn is a classic rising hard-court player whose profile is built around serve + aggression rather than underlying dominance. The career and last-52 samples both sit right around neutral (≈1.00 DR), which typically signals a player whose ranking depends heavily on clutch moments — and that shows up clearly in his elite 69% tiebreak win rate over the last year. The 2026 jump is the key signal: 1.06 DR, 51.1% TPW, and improved serve numbers (76.6% 1st serve won, 84.6% hold). That’s a real step forward, not just variance. His ceiling comes from first-strike tennis and confidence, as shown by wins over players like Hurkacz and deep Challenger runs. The limitation is still return impact — sub-20% break rate keeps him from consistently controlling matches. Overall, he profiles as an emerging top-50 level hard-court player whose results can run hot when the serve + tiebreak combination clicks.",
miamiNote: "Miami is a mixed fit. The slower conditions reduce some of his serve advantage, but his improved baseline level in 2026 helps offset that. Matches tend to hinge on whether he can maintain first-strike patterns rather than getting dragged into extended rallies.",
surfaceNote: { hard: "Best surface; serve and aggression profile play up strongly.", clay: "Playable but less natural; shorter points preferred.", grass: "Potentially strong long-term due to serve and tiebreak ability." },
},

"Moise Kouame": {
eloRank: 251,
elo: 1512,
record2026: "18-5 (78%)",
record: "32-21 (60%) career",
style: "young all-court baseliner, return-driven competitor, developmental upside play, athletic pressure-builder",
strengths: "excellent return numbers for age, strong 2026 acceleration, already competitive vs Challenger fields, wins through pressure, not just serve, unusually mature match resilience for 17",
serveStats: "Hold 76.1%, Ace 5%",
returnStats: "RPW 41.7%, Break rate 30.9%",
overallStats: "DR 1.06, TPW 51.1%, Tiebreak 50%",
fullNote: "Kouame is a very serious teenage prospect profile. The first thing that jumps out is not the serve, but the return game: 41.7% return points won and a 30.9% break rate over the last 52 are outstanding numbers for a 17-year-old, and they explain why his overall profile is already stronger than his ranking. He is not winning with one overwhelming weapon yet; instead, he is creating pressure through athleticism, baseline consistency, and the ability to turn neutral rallies into scoreboard pressure. The 2026 split is especially encouraging: 18-5, 52.0% total points won, and a 1.10 dominance ratio. That is real forward movement. The obvious developmental area is serve reliability — modest ace rate, only average first-serve volume, and some double-fault volatility in match logs. So the upside case is clear: if the serve becomes merely solid, the return foundation gives him a pathway to jump levels quickly. Right now he profiles as a high-upside teenage grinder/attacker hybrid whose numbers are already more advanced than his ranking.",
miamiNote: "Miami is actually an interesting spot for him. The slower hard court gives his return game and physicality more room to matter, which is better for him than a pure serve-dominant environment. Against established ATP players, though, the serve can still be exposed over two sets or over a full match.",
surfaceNote: { hard: "Already very competitive, especially in slower hard conditions where return skill matters.", clay: "Likely a natural long-term fit because of his movement and pressure tolerance.", grass: "Still mostly projection; serve development will determine future ceiling there." },
},

"Jiri Lehecka": {
eloRank: 22,
elo: 1887,
record2026: "6-5 (55%)",
record: "254-161 (61%) career",
style: "first-strike power baseliner, serve-forehand driven aggressor, hard-court pressure player, high-end pace and penetration",
strengths: "big serve with free-point upside, can overwhelm opponents early in rallies, dangerous on faster hard and grass courts, proven top-player upset capability, good ceiling in premium events",
serveStats: "Hold 83.4%, Ace 10.7%",
returnStats: "RPW 35.5%, Break rate 20.3%",
overallStats: "DR 1.06, TPW 50.9%, Tiebreak 54%",
fullNote: "Lehecka profiles as a classic modern power player whose best tennis is built around serve quality, early ball striking, and the ability to take time away from opponents. The core numbers show that clearly: 10.7% ace rate, 83.4% hold rate, and 75.0% first-serve points won over the last 52. When he is landing the first serve and getting to the forehand early, he looks like a genuine top-15 level threat. His upside has already shown in real results — wins over Alcaraz, Medvedev, Rublev, Tsitsipas, Fritz, and others across the last few seasons. The limitation in the profile is that the return game is solid rather than elite, so his margin can narrow quickly when the first strike is neutralized. That is why his overall efficiency is good but not dominant: 50.9% total points won and 1.06 dominance ratio. In 2026 specifically, the numbers are a bit flat by his standards — 6-5 with a 0.99 dominance ratio — which suggests his current level is a little below his best 2025 stretch. Still, the weaponry is obvious. He remains the kind of player who can look ordinary for a few weeks and then suddenly play at a top-10 level in the right conditions.",
miamiNote: "Miami is decent for him but not perfect. He benefits from the hard court and can still serve through plenty of games, but the slower conditions mean he has to construct points a bit more than on quicker courts. That slightly lowers his edge compared with faster hard events.",
surfaceNote: { hard: "Best overall surface right now; serve and first-strike patterns play up most naturally here.", clay: "Playable and improving, but not where his raw offense is most dangerous.", grass: "Very live surface for him because the serve and flat penetration carry so well." },
},

"Aleksandar Vukic": {
eloRank: 131,
elo: 1667,
record2026: "6-8 (43%)",
record: "308-266 (54%) career",
style: "serve-dominant baseliner, high-ace first-strike player, tiebreak-heavy match profile, aggressive but streaky shotmaker",
strengths: "big serve and free points, can overwhelm weaker returners, dangerous in short formats and tiebreaks, capable of upsets on fast courts, holds serve at a solid rate consistently",
serveStats: "Hold 81.4%, Ace 10.6%",
returnStats: "RPW 33.3%, Break rate 15.4%",
overallStats: "DR 0.93, TPW 48.8%, Tiebreak 49%",
fullNote: "Vukic is a classic serve-first player whose entire profile is built around holding serve and navigating tight sets. The underlying numbers make that very clear: double-digit ace rate, solid hold percentage, but limited return impact (15.4% break rate over the last 52). That creates a very narrow margin profile — many tiebreaks, many close sets, and results that swing heavily on short sequences. Earlier in his career (2022–2023), he ran closer to neutral or slightly positive efficiency, but the last 52 weeks show clear regression: 0.93 DR and sub-49% total points won. The 2026 sample is even weaker (0.84 DR), driven by a significant drop in return effectiveness and overall point-winning ability. He can still produce spikes — especially on faster hard courts where his serve carries — but over larger samples he struggles to generate enough break chances to sustain winning records at ATP level. Overall, he profiles as a lower-tier ATP player whose results are highly format- and matchup-dependent.",
miamiNote: "Miami is a negative environment for him. The slower hard courts reduce the value of his serve and force more rallies, exposing his weaker return and neutral baseline patterns.",
surfaceNote: { hard: "Best surface, especially on faster courts where serve dominance plays up.", clay: "Least effective; return and rally tolerance get exposed.", grass: "Also favorable due to serve and tiebreak profile." },
},

"Rafael Jodar": {
eloRank: 54,
elo: 1793,
record2026: "17-6 (74%)",
record: "65-26 (71%) career",
style: "balanced all-court baseliner, pressure returner with strong point construction, hard-court oriented aggressor, young upward-trending control player",
strengths: "excellent return numbers for his age, wins a high share of total points, solid on both first and second serve, breaks serve at an elite rate for Challenger level, already competitive against ATP-level opposition on hard courts",
serveStats: "Hold 80.3%, Ace 5.9%",
returnStats: "RPW 41.9%, Break rate 32.3%",
overallStats: "DR 1.2, TPW 53.2%, Tiebreak 57%",
fullNote: "Jodar’s statistical profile is extremely strong for a 19-year-old and looks much more complete than a typical prospect at this stage. The standout feature is balance: he is not just winning with one big weapon, but through broad point control. His serve is already solid enough to hold around 80% of the time on hard courts, while his return profile is outstanding — 32.3% break rate and 41.9% return points won over the last 52. Those are highly meaningful indicators because they suggest he is driving match play from both directions rather than surviving on serve alone. The overall efficiency metrics are the real separator: 53.2% total points won and a 1.20 dominance ratio are excellent numbers and far stronger than his current ATP rank would suggest. That gap between ranking and Elo is a strong signal of future upward movement. His 2026 line is a bit less explosive than 2025, but still clearly positive and already good enough to be dangerous in ATP qualifying and early main-draw rounds. Overall, he profiles as one of the more credible young hard-court risers in this tier — not a pure boom-or-bust teenager, but a genuinely robust performance profile with real tour-level upside.",
miamiNote: "Miami suits him better than many young attackers because he is not overly serve-dependent. The slower hard court gives his return game and baseline consistency more time to create scoreboard pressure.",
surfaceNote: { hard: "Best current surface by sample and profile; strongest blend of hold and break numbers.", clay: "Still promising but sample is small; return numbers suggest upside there too.", grass: "No meaningful sample yet." },
},

"Zizou Bergs": {
eloRank: 55,
elo: 1792,
record2026: "6-6 (50%)",
record: "312-211 (60%) career",
style: "aggressive first-strike baseliner, serve-forehand driven hard-court attacker, tempo player who likes to play on the front foot, athletic transition player with volatility",
strengths: "solid free-point production on serve, can raise level quickly in faster conditions, comfortable taking time away from opponents, good enough athlete to finish forward when in control, career body of work shows ATP-caliber baseline pace",
serveStats: "Hold 77.8%, Ace 8.2%",
returnStats: "RPW 35.4%, Break rate 18.3%",
overallStats: "DR 0.95, TPW 49.2%, Tiebreak 47%",
fullNote: "Bergs is still a dangerous ATP-level opponent, but his current profile looks much more fragile than his ranking alone suggests. The key split is between his attacking ceiling and his underlying match efficiency. He can serve well enough to protect scoreboard pressure, especially on hard courts, and his ace rate is healthy at 8.2% over the last 52 weeks. His 2026 hold rate is especially strong at 84.9%, which shows the serve-plus-first-ball pattern is still working. But the rest of the profile is much thinner than that of a stable top-50 player. The return numbers are modest — only 18.3% breaks and 35.4% return points won in the last 52 — and the global efficiency indicators are negative or nearly flat: 49.2% total points won and a 0.95 dominance ratio over the last 52, improving only to near-neutral 49.9% TPW and 0.99 DR in 2026. That usually points to a player who can look sharp in bursts, especially indoors or on quicker hard courts, but who is not consistently controlling matches over time. Compared with his stronger 2023-2024 seasons, this looks like a decline in match-to-match pressure application rather than a complete collapse. In practical terms, he is still live against many ATP opponents because his pace and athleticism can overwhelm weaker defenders, but statistically he profiles more like a volatile #40-70 caliber player than a secure top-40 force right now.",
hardCourtNote: "Hard court remains his best working surface because it lets him lean on serve quality and first-strike patterns, but even there the recent edge is thinner than his ranking suggests.",
surfaceNote: { hard: "Best surface by volume and fit; serve and pace translate best here.", clay: "Less effective recently; weaker hold and less ability to sustain pressure.", grass: "Playable because of his attacking style, but sample is smaller and still somewhat swingy." },
},

"Jenson Brooksby": {
eloRank: 51,
elo: 1797,
record2026: "4-7 (36%)",
record: "157-100 (61%) career",
style: "counterpunching disruptor, elite return-focused baseliner, low-pace, high-variation grinder, absorbs pace and redirects with control",
strengths: "strong return game and rally tolerance, excellent tiebreak performance, ability to disrupt rhythm and force errors, solid consistency from both wings, wins matches through attrition rather than power",
serveStats: "Hold 75.9%, Ace 4.3%",
returnStats: "RPW 38.2%, Break rate 22.8%",
overallStats: "DR 1, TPW 49.8%, Tiebreak 72%",
fullNote: "Brooksby remains one of the most stylistically unique players on tour, built around disruption, consistency, and return pressure rather than raw power. His underlying profile is very balanced: over the last 52 weeks he sits almost exactly neutral at 49.8% total points won and a 1.00 dominance ratio, which aligns with a mid-tier ATP player. The key to his success is the return side — 38.2% return points won and 22.8% breaks are strong numbers, especially given his lack of easy serve points. His serve is functional rather than dangerous, with a 75.9% hold rate and low ace output, meaning he relies heavily on extended rallies and opponent discomfort. The biggest signal in his profile is the divergence between 2025 stability and 2026 regression. In 2026 his level has dropped significantly (47.4% TPW, 0.85 DR), driven by a sharp decline in return effectiveness and overall match control. That kind of drop is meaningful because his margin for error is already thin compared to more aggressive players. When he is at his best, he can neutralize higher-powered opponents and drag them into uncomfortable patterns, but when the return edge slips even slightly, the whole profile becomes fragile. Overall, he still projects as a tricky and annoying matchup for many players, but his current trajectory suggests he is performing below his established baseline level.",
miamiNote: "Miami conditions suit his game well because the slower hard courts amplify his ability to extend rallies and force errors. He is more comfortable here than on faster surfaces where his serve can be exposed.",
surfaceNote: { hard: "Playable but not dominant; relies heavily on return and consistency.", clay: "Very solid fit due to extended rallies and return strength.", grass: "Better than expected; shorter points reduce his physical grind but require sharper execution." },
},

"Tomas Martin Etcheverry": {
eloRank: 37,
elo: 1830,
record2026: "11-5 (69%)",
record: "356-234 (60%) career",
style: "big-pattern clay-based baseliner, serve-plus-forehand grinder, high-margin, physically strong point constructor, prefers extended baseline exchanges with heavy depth",
strengths: "strong serve reliability and hold rate, excellent physicality and endurance in long matches, comfortable building points with heavy forehand patterns, solid baseline depth and rally tolerance, much improved confidence and scoreboard resilience in 2026",
serveStats: "Hold 82.6%, Ace 9.6%",
returnStats: "RPW 35.7%, Break rate 18.5%",
overallStats: "DR 1.03, TPW 50.4%, Tiebreak 54%",
fullNote: "Etcheverry’s profile is built on stability, physical strength, and repeatable serve-plus-forehand patterns. Even though he is still thought of primarily as a clay-court player, his numbers over the last 52 weeks show a more balanced ATP profile than that label suggests. He is holding 82.6% of the time with a healthy 9.6% ace rate, both strong indicators that his serve has become a real weapon, especially on faster surfaces. The return side is more modest — 35.7% return points won and 18.5% breaks are adequate rather than dangerous — which is why his overall profile settles into solid-but-not-dominant territory at 50.4% total points won and a 1.03 dominance ratio. That usually describes a player who wins a lot of tight matches by staying structurally sound rather than overwhelming opponents. The most encouraging sign is his 2026 jump: 11-5, 50.9% TPW, and a 1.07 DR, plus a big rise in hold percentage to 87.3%. That suggests his serve and confidence are carrying more weight than in 2025, when he was much closer to neutral overall. He is still not an elite returner, so his ceiling on hard courts depends on whether he can protect serve and keep points on his forehand terms. On clay he remains especially dangerous because his movement, endurance, and heavy patterns wear opponents down over time. Overall, he looks like a sturdy top-40 caliber player whose current form is trending upward, with a game that travels better across surfaces than his reputation sometimes implies.",
miamiNote: "Miami is decent for him, but not perfect. The slower hard court helps his rally tolerance and physical game, yet his limited return upside versus strong hard-court attackers keeps him from being a top-tier fit here.",
surfaceNote: { hard: "Improved and clearly viable now; serve has become more impactful, but return ceiling limits upside against elite hard-court players.", clay: "Best surface; heavy forehand, physicality, and point construction all play up.", grass: "More vulnerable because flatter first-strike tennis can rush his patterns despite a solid serve." },
},

"Tommy Paul": {
eloRank: 19,
elo: 1905,
record2026: "12-6 (67%)",
record: "432-246 (64%) career",
style: "elite movement counterpuncher, aggressive transition baseliner, all-court athlete with strong forehand acceleration, tempo disruptor with defensive-to-offensive conversion",
strengths: "elite movement and court coverage, very strong hold percentage driven by improved serve, high-level baseline consistency and rally tolerance, ability to redirect pace and counterattack, strong performance in big matches and long formats",
serveStats: "Hold 83.7%, Ace 7.3%",
returnStats: "RPW 38%, Break rate 23.9%",
overallStats: "DR 1.13, TPW 51.9%, Tiebreak 60%",
fullNote: "Paul has evolved into one of the most complete all-court players on tour, with a profile built around elite movement, improved serving, and strong baseline balance. Over the last 52 weeks he is operating at a clearly top-tier level: 83.7% holds, 38.0% return points won, and a 1.13 dominance ratio. That combination signals a player who is winning both serve and return exchanges at a high level, rather than relying on one phase. The most notable development is the serve — first serve points won at 74.0% and a rising ace rate have pushed his hold percentage into top-20 territory, which was previously the limiting factor in his profile. On return, he remains one of the more disruptive players in his tier, using speed and anticipation to neutralize opponents and extend rallies. The 2026 numbers are even stronger: 53.0% total points won and a 1.24 dominance ratio, which is firmly elite and supported by an 88.9% hold rate on hard courts. That suggests his current level is closer to top-10 than his ranking indicates. Stylistically, he thrives in dynamic baseline exchanges where his movement and ability to transition from defense to offense create constant pressure. Against top players, the gap still appears when he cannot impose enough first-strike damage, but his floor is extremely high. Overall, this is a highly stable, upward-trending profile with legitimate contender-level metrics when in form.",
miamiNote: "Miami is an excellent fit for his game. The slower hard court amplifies his movement, rally tolerance, and counterpunching ability, allowing him to grind down opponents while still holding serve at a high level.",
surfaceNote: { hard: "Best surface currently; serve improvements and movement make him a top-tier hard-court player.", clay: "Very strong due to physicality and rally tolerance; results have improved significantly.", grass: "Solid but slightly less dangerous due to reduced rally length and reliance on first-strike tennis." },
},

"Adrian Mannarino": {
eloRank: 104,
elo: 1694,
record2026: "7-9 (44%)",
record: "699-579 (55%) career",
style: "flat lefty counterpuncher, low-bounce rhythm disruptor, redirecting baseliner with minimal backswing, angle-creating pace absorber",
strengths: "excellent timing and ability to redirect pace, awkward left-handed patterns that disrupt opponents’ rhythm, very effective on quicker hard and grass courts, strong feel in short exchanges and return positioning, can take time away with compact, flat ball striking",
serveStats: "Hold 79.8%, Ace 6.6%",
returnStats: "RPW 38.4%, Break rate 24.5%",
overallStats: "DR 1.07, TPW 51%, Tiebreak 39%",
fullNote: "Mannarino remains one of the tour’s most unusual matchup problems. His game is built on ultra-flat left-handed ball striking, early contact, and exceptional ability to absorb and redirect pace. Even at 37, his last-52 profile is still respectable: 79.8% holds, 38.4% return points won, 51.0% total points won, and a 1.07 dominance ratio. Those are still competitive top-50 style numbers, especially for a player whose game depends more on timing, disguise, and discomfort than on raw power. His value comes from making opponents hit from awkward contact points over and over, especially on hard courts where his skid through the surface keeps rallies uncomfortable. The concern is that the 2026 numbers show real slippage: just 48.9% total points won, a 0.94 dominance ratio, and only 18.7% break rate. That suggests his returning impact has dipped meaningfully, even if the serve remains acceptable. He can still produce dangerous weeks when conditions reward clean timing and low, flat trajectories, but the overall baseline is no longer stable enough to project sustained top-tier results. The poor recent tiebreak record also matters because his style naturally produces a lot of close sets. Overall, this is still a tricky veteran with upset potential, but one whose week-to-week level now looks more volatile and surface-dependent than in his 2023 peak stretch.",
miamiNote: "Miami is decent but not ideal. The hard court helps his flat redirecting game, but the slightly slower conditions give athletic baseliners more time to reset and can reduce the discomfort he usually creates on quicker courts.",
weaknesses: "limited physical upside at this stage of career; serve is functional rather than dominant; tiebreak performance over the last 52 weeks has been poor; 2026 return numbers have dropped sharply; clay remains his least favorable environment",
surfaceNote: { hard: "Best current surface; flat timing and lefty patterns still make him dangerous, especially indoors or on quicker courts.", clay: "Clearly weakest surface; lower ball speed and higher bounce reduce his ability to rush opponents.", grass: "Historically very strong fit because the skid and low contact point amplify his style." },
},

"Mariano Navone": {
eloRank: 88,
elo: 1729,
record2026: "8-7 (53%)",
record: "217-157 (58%) career",
style: "high-volume clay grinder, heavy topspin baseliner, attritional rally player, physical consistency-first competitor",
strengths: "elite clay-court profile driven by heavy topspin and depth, excellent return numbers and break rate (36% career, 33% last 52), very high rally tolerance and physical endurance, strong ability to wear opponents down over time, solid consistency off both wings with low error rate",
serveStats: "Hold 73%, Ace 2.5%",
returnStats: "RPW 42.6%, Break rate 33.2%",
overallStats: "DR 1.08, TPW 51.4%, Tiebreak 50%",
fullNote: "Navone is a classic modern clay-court grinder whose identity is built on physicality, spin, and relentless baseline consistency. His statistical profile is very telling: modest serve (73% holds, just 2.5% aces last 52) paired with strong return pressure (42.6% return points won, 33.2% break rate). That combination makes him highly competitive in long, grinding matches but more vulnerable in quicker conditions where holds are easier to protect. His overall numbers are solid—51.4% total points won and 1.08 dominance ratio—but they are heavily surface-dependent. On clay, he becomes a different level of player (52.6% TPW, 1.13 DR, 64% win rate), using heavy topspin and depth to push opponents behind the baseline and create physical matches. On hard courts, the edge shrinks considerably (49.7% TPW, 0.99 DR), because he lacks the serve and first-strike weapons to consistently control points. The encouraging sign is that his level has stabilized: 2026 is around neutral (1.01 DR), suggesting he’s maintaining a solid top-70 baseline. His ceiling is strongly tied to surface and matchup—he thrives against players who don’t hit through him but struggles against aggressive attackers who shorten rallies. Overall, this is a very reliable clay specialist with improving all-court competence, but still clearly limited by serve and pace generation.",
miamiNote: "Miami is not ideal. Slower hard courts help a bit, but the surface still favors players with bigger serves and first-strike offense—areas where Navone is weakest.",
weaknesses: "serve is a major limitation (low ace rate, low hold %); lacks easy power or quick-strike weapons; hard-court effectiveness drops significantly; can struggle to finish points against aggressive players; limited upside in faster conditions",
},

"Valentin Vacherot": {
eloRank: 30,
elo: 1857,
record2026: "8-6 (57%)",
record: "244-142 (63%) career",
style: "serve-led aggressive baseliner, hard-court first-strike player, compact offensive shotmaker, hold-oriented pressure server",
strengths: "big serve and free-point production, especially on hard courts, strong first-serve effectiveness and high hold rate, comfortable playing short, aggressive patterns, good enough return to stay positive overall, even if serve drives the profile, has proven he can beat high-level opponents on faster courts",
serveStats: "Hold 83.2%, Ace 9.9%",
returnStats: "RPW 38.3%, Break rate 25.1%",
overallStats: "DR 1.13, TPW 52.1%, Tiebreak 50%",
fullNote: "Vacherot’s profile is that of a modern hard-court aggressor whose game is built around serve quality and early control of rallies. The key numbers jump out immediately: 83.2% hold rate and 9.9% ace rate over the last 52 weeks, rising to an even bigger 12.8% ace rate and 87.9% hold rate on hard courts. That is the foundation of his game. He wins a high percentage behind first serve (73.5% last 52; 76.3% on hard), gets a lot of cheap points, and is very comfortable dictating with first-strike patterns. Unlike a pure servebot, though, he is not empty on return—his 38.3% return points won and 25.1% break rate are good enough to make him a genuine top-30 Elo player rather than just a hold merchant. His overall profile is strong: 52.1% total points won and a 1.13 dominance ratio over the last year. Interestingly, his clay numbers are also quite good, but the style still reads much more dangerous on hard courts because the serve becomes a larger separator there. The slight caution sign is that his 2026 numbers are a bit cooler than his 2025 breakout, suggesting he is still good but maybe not quite peaking every week. Overall, this is a player with real upside in fast conditions, capable of beating strong opponents when the serve plus first ball are landing consistently.",
miamiNote: "Miami suits him better than Navone on paper. Even though Miami is slower than some hard courts, Vacherot still carries the bigger serve, stronger hold profile, and cleaner first-strike upside.",
weaknesses: "return game is solid but not dominant; can become more vulnerable when first-strike tennis is neutralized; clay level is good, but clearly less dangerous than on hard courts; tiebreak results are only average despite the serve advantage; 2026 form is still good but less overwhelming than his 2025 surge",
},

"Arthur Fils": {
eloRank: 13,
elo: 1955,
record2026: "9-4 (69%)",
record: "183-120 (60%) career",
style: "explosive all-court aggressor, serve-plus-forehand shotmaker, athletic first-strike baseliner, high-upside power athlete",
strengths: "elite upside for a 21-year-old, with top-15 Elo already, big serve and heavy first forehand that can take over matches, excellent athleticism and court coverage for an attacking player, can win on both hard and clay, dangerous against strong opponents when he is dictating early in rallies",
serveStats: "Hold 82.5%, Ace 5.8%",
returnStats: "RPW 37.7%, Break rate 22.7%",
overallStats: "DR 1.08, TPW 51.3%, Tiebreak 53%",
fullNote: "Fils profiles as a high-ceiling power athlete whose ranking slightly understates his true level right now. The biggest indicator is the gap between his current ATP rank (31) and Elo rank (13): the market is basically saying he already plays like a top-15 player. His game is built around explosive baseline offense, especially serve plus forehand. The serve is strong rather than overwhelming, but the combination of 82.5% hold rate, 70.6% first-serve points won, and a very healthy 55.5% won behind second serve over the last 52 weeks tells you he is hard to pressure. He is not just a serve-first player either; his athleticism lets him defend better than most young shotmakers, and his clay split is actually stronger than his hard split by total points won and dominance ratio. That matters because it suggests a rounded top-level profile rather than a one-surface specialist. The caution is that his statistical edge is strong but not yet crushing: 51.3% total points won and 1.08 dominance ratio are very good, but not fully elite. That fits the eye test—he can look unstoppable for stretches, then lose shape or donate errors. Against top-10 players, the record and underlying numbers are still rough, which is normal for a 21-year-old but shows there is another tier for him to climb. Overall, though, the blend of youth, athleticism, shot quality, and already-proven big-match wins makes him one of the more dangerous non-seeded types in any draw.",
hardCourtNote: "On hard courts Fils is dangerous because he can serve well enough to start neutral or ahead in most points, then use the forehand to accelerate. The hard-court hold numbers are strong, but the return profile is not yet as punishing as his raw talent suggests.",
weaknesses: "week-to-week level still fluctuates more than the very top players; return game is good rather than dominant on hard courts; can leak errors when forced to hit one extra ball; top-10 opposition still exposes him at times; match scorelines can look less dominant than the talent level suggests",
},

"James Duckworth": {
eloRank: 158,
elo: 1630,
record2026: "4-9 (31%)",
record: "522-357 (59%) career",
style: "veteran first-strike hard-court attacker, serve-led rhythm player, flat-ball baseliner who likes quick patterns, experienced tour-level counterpunch punisher",
strengths: "solid veteran serve backed by strong first-ball patterns, very comfortable on hard courts and in tiebreak-heavy matches, clean ball striker who can redirect pace well, experienced in Challenger events and knows how to manage weaker fields, still capable of upsetting better-ranked players when serve and timing click",
serveStats: "Hold 83.3%, Ace 10.1%",
returnStats: "RPW 36.5%, Break rate 20.8%",
overallStats: "DR 1.08, TPW 51.3%, Tiebreak 50%",
fullNote: "Duckworth is a classic experienced hard-court pro whose game is built around serve quality, clean timing, and staying on the front foot in short-to-medium rallies. The broad career profile is actually very stable: 82.9% hold rate for his career, 10.3% ace rate, and a career total-points-won mark of 51.0% all describe a player who wins by protecting serve, playing efficient offensive tennis, and avoiding long defensive exchanges. Over the last 52 weeks, the numbers are still respectable—51.3% TPW and 1.08 DR—but the story changes sharply in 2026, where he is only 4-9 with a 48.1% TPW and 0.88 dominance ratio. That drop matters a lot, because it suggests the current ranking of 80 is stronger than his present form level. His Elo rank of 158 says something similar: he still has the toolkit to be dangerous on a given day, but his true week-to-week level now looks more like a fringe-tour or strong-Challenger player than a locked-in ATP main-draw threat. The positive angle is that his style remains live on quick courts. When he lands first serves, gets easy forehands, and keeps points on his terms, he can still beat solid tour players and make runs, especially in Challenger fields. The negative angle is that his margin is thin. Because his return game is only moderate and his physical edge is not what it once was, matches can flip quickly if the first serve percentage dips or if the opponent extends rallies. In short, Duckworth is still a credible hard-court veteran and a dangerous draw in the right conditions, but he now looks more like a savvy spoiler than a sustainable top-50 caliber player.",
hardCourtNote: "Hard court is still his natural home. The serve numbers remain good, he takes the ball early, and he is most comfortable when sets are decided by a handful of tight service games or tiebreaks.",
weaknesses: "overall ceiling is lower now than his ranking peak years; return game is modest and rarely overwhelms opponents; 2026 form has been poor by both record and underlying numbers; best-of-five results are weak compared with best-of-three; athletic decline means long physical matches can get away from him",
},

"Hubert Hurkacz": {
eloRank: 56,
elo: 1791,
record2026: "5-8 (38%)",
record: "396-243 (62%) career",
style: "serve-first low-margin attacker, big-hold-rate first-strike player, tiebreak-heavy quick-pattern server, surface-flexible but serve-dependent aggressor",
strengths: "serve remains a major weapon, with 15.9% ace rate in the last 52 and 18.0% in 2026, still holds at a very high rate: 87.7% over the last 52 and 88.6% in 2026, first-serve quality is still elite-level strong, winning 77.9% of first-serve points over the last 52, can still produce top-end wins against elite opponents when the serve is dictating, clay results are better than the reputation suggests, with a solid 7-4 last-52 clay record",
serveStats: "Hold 87.7%, Ace 15.9%",
returnStats: "RPW 31.9%, Break rate 12.3%",
overallStats: "DR 1, TPW 50%, Tiebreak 47%",
fullNote: "Hurkacz now profiles as a serve-first player whose ranking is worse than his Elo, but whose underlying level has still clearly declined from his peak version. The Elo rank of 56 versus ATP rank of 75 says he is somewhat underrated by ranking alone, though not remotely at the level of his former top-10 status. The key story in the numbers is the split between a still-strong serve and a much weaker return game. Over the last 52 weeks he has held 87.7% of the time, hit aces at 15.9%, and won 77.9% of first-serve points, all of which are strong carry traits. But the return profile has collapsed to just 31.9% return points won and 12.3% break rate, and in 2026 it has gotten even worse at 30.1% RPW and 7.9% breaks. That is why the total profile has flattened from a strong career 51.3% TPW and 1.08 dominance ratio to 50.0% and 1.00 over the last 52, then 49.3% and 0.95 in 2026. In practical terms, he is no longer consistently outplaying opponents point for point. He is instead living much more on serve protection, tie-break variance, and short bursts of first-strike control. That still gives him upset potential, which is why wins over players like Zverev and Fritz still show up, but it also makes him much more fragile week to week. On hard courts especially, the current version is dangerous in close matches but not trustworthy as a sustained top-tier performer. Clay is more competent than the reputation suggests, but even there he wins more by holding steadily than by imposing return pressure. Overall, Hurkacz is still a dangerous serve-led opponent with real upside in quick conditions, but the return decline has made him much more matchup-dependent and far less sustainable over full events.",
hardCourtNote: "Hard court is still the natural home of his serve, but the recent hard numbers are disappointing. He is holding well, yet not breaking enough to create real separation, which makes him much more tiebreak- and variance-dependent than before.",
weaknesses: "return game has fallen off hard, with break rate down from 20.1% career to 12.3% last 52 and 7.9% in 2026; overall point profile has slipped from clearly positive to neutral or negative; hard-court form is much weaker than the name value suggests; second-serve winning has dipped below ideal margin levels for a serve-led player; best-of-five output in the recent sample is poor",
},

"Zachary Svajda": {
eloRank: 64,
elo: 1770,
record2026: "17-6 (74%)",
record: "186-142 (57%) career",
style: "compact all-court pressure player, return-driven rhythm attacker, grass-capable counterpunch-to-first-strike hybrid, efficient hold-break profile without huge serve reliance",
strengths: "Elo is much stronger than ranking, suggesting his true level is ahead of his ATP number right now, very healthy last-52 underlying profile: 52.3% TPW and 1.13 DR, return game is the backbone, with 38.5% RPW and 27.1% break rate over the last 52, serve has improved meaningfully, especially the ace rate rising to 10.2% over the last 52, excellent recent grass results, with a 14-3 record and strong hold-break combo, best-of-three profile is strong and stable, making him dangerous in ATP qualifying and Challenger fields",
serveStats: "Hold 82.8%, Ace 10.2%",
returnStats: "RPW 38.5%, Break rate 27.1%",
overallStats: "DR 1.13, TPW 52.3%, Tiebreak 58%",
fullNote: "Svajda profiles as one of the more interesting under-the-radar risers because the numbers say his current ranking still undersells his true level. The biggest signal is the gap between ATP rank 96 and Elo rank 64. That is not just minor noise; it suggests his underlying level is already more like a solid top-75 type than a player merely sneaking into the top 100. The statistical base supports that. Over the last 52 weeks he has gone 45-20 with 52.3% total points won and a 1.13 dominance ratio, both strong marks for someone still transitioning from Challenger success toward sustained ATP relevance. He has backed that up in 2026 with even better efficiency: 53.1% TPW and 1.17 DR through a 17-6 start.\n\nThe most important feature of his profile is that he is not winning with smoke and mirrors. This is not a player scraping by on tiebreak variance or one hot serving week. His return numbers are genuinely strong: 38.5% return points won and a 27.1% break rate over the last 52 weeks. Those are the numbers of a player who consistently creates scoreboard pressure. That gives him a healthier foundation than many young hard-court prospects who depend too heavily on serve. In fact, Svajda’s serve is improving but still works best as a support weapon rather than the central one. The ace rate jumping to 10.2% is a major development from the 6.6% career mark, and pairing that with 74.5% won on first serve, 53.9% won on second serve, and an 82.8% hold rate means the service side is now clearly good enough to support his return strength.\n\nThat combination is why his profile is attractive. He breaks often enough to create separation, but now also holds well enough that those breaks actually matter. Career Svajda was more modest overall at 50.9% TPW and 1.05 DR, which is decent but not especially dangerous. The current version is a different animal. The last-52 and 2026 metrics both show clear improvement in quality, and they suggest real progression rather than a temporary hot streak. He is holding much more comfortably, serving bigger, and keeping his already solid return game intact.\n\nSurface-wise, hard courts remain the core of the profile simply because that is where most of the volume is and where he has built his rise. The hard-court numbers are strong enough: 30-15, 51.9% TPW, 1.10 DR. That is real ATP/Challenger crossover quality. But grass may actually be where the profile gets most dangerous in short samples. A 14-3 grass run over the last 52 with 53.9% TPW and 1.25 DR is excellent, and it makes sense stylistically. His improved serve, compact ball-striking, and ability to redirect and pressure returns translate very well there. Clay is the clear weak spot for now, with only a 1-2 record, 46.9% TPW, and 0.83 DR, so he still looks much more like a hard/grass player than a universal surface performer.\n\nThe caution is mainly about projection level. He has strong numbers, but not yet against a huge volume of top ATP opposition. The 0-1 record vs top 10 tells you very little, and the match logs show that while he can absolutely compete with good ATP players, he is not yet routinely imposing on that tier. He has good wins and a lot of clean lower-level wins, but he can still be physically or power-wise overmatched when the opponent brings sustained top-50 weight. Also, the best-of-five split is a clear warning sign: only 48.4% TPW and 0.89 DR in that format over the last 52. So for now, he looks much stronger in best-of-three environments than in long-format Slam projection.\n\nOverall, Svajda looks like a legitimately ascending player whose ranking has not fully caught up to the numbers. The game is built less on overwhelming shot tolerance and more on balance: a now-solid serve, a legitimately good return game, and enough all-court adaptability to be dangerous on both hard and grass. That usually produces a more sustainable rise than a profile built on one oversized weapon. He looks like a player who can keep outperforming public expectation until the market fully prices in the improvement.",
hardCourtNote: "Hard court is the main base of the profile. The numbers are strong rather than absurd, but the combination of improving serve and already-good return game gives him a sustainable edge in qualifying, Challenger events, and lower-tier ATP matches.",
weaknesses: "not a pure free-point server, so he still has to win a fair amount of tennis from the baseline; clay profile is clearly the weakest surface at the moment; best-of-five numbers lag behind best-of-three by a wide margin; top-end ATP main-draw sample is still limited, so some of the profile is built more on Challenger/qualifying strength than fully proven tour-level volume; can still be overpowered by higher-end ATP physicality and pace, especially against stronger first-strike players",
},

"Yannick Hanfmann": {
  eloRank: 61,
  elo: 1779,
  currentRank: 64,
  peakRank: 45,
  age: 34,

  record: "384-280 (58%) career",
  recordLast52: "50-28 (64%)",
  record2026: "10-6 (63%)",

  style: [
    "power-baseline aggressor with serve support",
    "hard-clay dual-surface first-strike veteran",
    "pace-driven all-court attacker",
    "hold-focused aggressor with solid return floor"
  ],

  strengths: [
    "underlying level is stronger than his ATP rank, with Elo rank 61 versus ATP rank 64 and a solid 1779 Elo",
    "last-52 profile is clearly positive: 52.1% TPW and 1.16 DR",
    "serve has become a bigger weapon recently, especially on hard courts where ace rate is 12.8% and hold rate is 86.3%",
    "very healthy best-of-three profile, going 49-26 with 52.3% TPW and 1.18 DR",
    "has been effective across hard, clay, and even grass in the last-52 sample rather than relying on one single surface",
    "return game remains good enough to complement the serve, especially on clay where he still wins 39.5% of return points"
  ],

  weaknesses: [
    "tiebreak profile is poor both career-long and recently, which reduces his edge in close serve-dominated matches",
    "top-10 level remains a real barrier, going 0-6 in the last-52 sample with only 45.0% TPW",
    "best-of-five output is much weaker than best-of-three, with only 47.6% TPW and 0.88 DR over the last 52",
    "2024 showed how quickly his level can dip when the serve and first-strike patterns flatten out",
    "despite a strong recent profile, he still has patches of abrupt losses against lower-ranked opposition"
  ],

  serveStats: {
    holdPct: 84.1,
    acePct: 9.3,
    firstServeInPct: 65.8,
    firstServeWonPct: 72.5,
    secondServeWonPct: 56.7
  },

  returnStats: {
    rpwPct: 38.2,
    breakPct: 23.6
  },

  overallStats: {
    totalPointsWonPct: 52.1,
    dominanceRatio: 1.16,
    tiebreakPct: 40
  },

  surfaceSplits: {
    hard: {
      record: "24-13",
      tpw: 52.2,
      dr: 1.19
    },
    clay: {
      record: "21-12",
      tpw: 51.7,
      dr: 1.13
    },
    grass: {
      record: "5-3",
      tpw: 52.9,
      dr: 1.20
    }
  },

  recentForm: {
    last52TPW: 52.1,
    last52DR: 1.16,
    y2026TPW: 51.8,
    y2026DR: 1.12
  },

  fullNote:
    "Hanfmann profiles as a veteran power player whose current ranking is basically fair, but whose recent numbers are quietly stronger than many people would assume for a 34-year-old. The key point is that this is not a washed veteran hanging around on name value. His Elo rank of 61 and ATP rank of 64 are tightly aligned, and the last-52 profile is good: 50-28, 52.1% total points won, and a 1.16 dominance ratio. That is the statistical shape of a legitimate ATP-level player who can still threaten draws, especially in best-of-three.\n\nThe game is built around solid serve quality, first-strike baseline patterns, and enough return competence to avoid being one-dimensional. Over the last 52 weeks he has held 84.1% of the time, won 72.5% of first-serve points, and 56.7% of second-serve points. Those second-serve numbers are especially important because they show he is not surviving only on first-ball freebies. He has real cushion behind serve. On hard courts the serve becomes even more dangerous: 12.8% ace rate, 86.3% hold rate, 68.8% service points won, and a 1.19 DR. That is a strong hard-court profile, especially for someone whose broader reputation still leans clay.\n\nWhat makes Hanfmann useful analytically is that the profile is more balanced than it looks. He is not just a clay grinder and he is not just a serve bot. His return numbers remain healthy enough across surfaces, with 38.2% RPW overall in the last 52 and 39.5% on clay. That gives him more structural stability than players who rely only on holds and tiebreaks. In fact, his recent tiebreak record is terrible at 12-18, which actually suggests his match record may undersell the quality of his point profile a little. Usually a player with 52.1% TPW and 1.16 DR would expect better than a 40% tiebreak win rate. So while he does lose some close matches, the underlying level is stronger than the tiebreak record alone suggests.\n\nThe surface story is also broader than expected. Hard court is probably the cleanest recent statistical surface, but clay is still very playable and has produced plenty of wins. He is 21-12 on clay over the last 52 with a 1.13 DR, which is still a good profile even if it is no longer dramatically better than the hard-court one. Grass has also been efficient in a small sample, though that should be treated more cautiously. The bigger takeaway is that current Hanfmann is functional across conditions rather than locked into one niche.\n\nThe main caution is ceiling. He is a good ATP player, but the top tier still shuts him down. Against top-10 opposition in the last-52 sample he is 0-6 with only 45.0% TPW and a 0.72 DR. That is a major gap and tells you his power game is good enough to pressure ordinary ATP players, but not good enough to hold up consistently when elite defenders or elite first-strike players absorb his pace and attack his weaker spots. The other caution is format. In best-of-three he looks dangerous and sustainable. In best-of-five he drops sharply to 47.6% TPW and 0.88 DR, which says his level is much less reliable over longer matches.\n\nThe year-to-year trend also matters. His 2024 season was poor by underlying numbers, with 48.2% TPW and 0.90 DR, but the rebound since then has been real. The 2025 and early-2026 numbers have restored him to clear ATP competence. That matters because it tells you the current version should not be judged by the 2024 slump alone. He is not peaking in the same way he did during his best 2023 surge, but he is back to being a credible tour-level threat.\n\nOverall, Hanfmann looks like a durable, statistically sound veteran who can beat solid ATP opponents when his first-strike patterns are landing and the matchup is not too speed- or defense-heavy. He is stronger in best-of-three than best-of-five, stronger against the middle class of the tour than the elite, and more balanced across hard and clay than his reputation suggests. The profile is not flashy, but it is very real: good serve, enough return, positive point differential, and broad surface usability.",

  hardCourtNote:
    "Hard courts may now be his most efficient surface in pure statistical terms. The serve pops more, the ace rate jumps, and the hold-break combo is strong enough to make him a real threat in ATP qualifying, lower ATP main draws, and indoor conditions.",

  clayNote:
    "Clay is still an important part of the profile, but not in the old-fashioned grinder sense. He wins there by serving well enough, hitting through neutral balls, and maintaining a decent return floor rather than by dragging opponents into endless physical exchanges.",

  grassNote:
    "Grass is a smaller sample, but the recent numbers are surprisingly strong. The serve and first-strike patterns translate well enough for him to be dangerous, even if it is not the surface most people associate with him first.",

  matchupProfile: {
    vsBigServers:
      "Often more competitive than expected because he serves well enough himself and is not a passive returner, though his poor tiebreak record can hurt in these matchups.",
    vsCounterpunchers:
      "This is usually a good lane when he is taking the initiative early, because his pace can force shorter points and stop the match from becoming too reactive.",
    "vsEliteAll-Courters":
      "This is the toughest category, because they can neutralize his first strike, expose his lower top-end shot tolerance, and turn his positive ATP-level profile into a clearly losing one."
  },

  developmentNote:
    "At this stage it is not about adding a new weapon. The key for Hanfmann is sustaining the stronger recent serve numbers and avoiding the kind of flat stretches that wrecked his 2024. If he keeps the current serve-return balance, he remains a dangerous best-of-three veteran with enough level to outperform seed lines and rankings."
},

"Zhizhen Zhang": {
eloRank: 84,
elo: 1734,
record2026: "8-7 (53%)",
record: "253-250 (50%) career",
style: "big-serving offensive baseliner, flat-hitting first-strike hard-court aggressor, tempo player who likes quick control of points, serve-led attacker with top-50 peak shotmaking",
strengths: "serve is still a real weapon, with 10.2% ace rate over the last 52 weeks, can hold serve at a strong clip on hard courts, posting 82.9% hold in the last-52 sample, has shown genuine ATP-level upside at his best, with a peak ranking of 31, forehand and first-ball offense can rush opponents when timing is on, 2026 results are better than 2025 and suggest at least some stabilization, Elo rank of 84 is much stronger than current ATP rank of 270, implying his ranking is still depressed relative to true level",
serveStats: "Hold 82.9%, Ace 10.2%",
returnStats: "RPW 32.6%, Break rate 14.5%",
overallStats: "DR 0.93, TPW 49.3%, Tiebreak 40%",
fullNote: "Zhang is one of the more interesting ranking-versus-level cases in this group because the current ATP rank looks awful at 270, but the Elo rank of 84 says he is still much more competitive than that number suggests. The broad story is pretty clear: this is a player with real top-level tools and a recent top-50 past, but whose results have fallen apart because the full profile is no longer holding together from week to week.\n\nThe biggest remaining asset is the serve. Over the last 52 weeks he has posted a 10.2% ace rate, landed 64.9% first serves, won 73.8% of first-serve points, and held 82.9% of the time. Those are strong numbers and they tell you the serve plus first-ball combination is still dangerous. He can still make opponents uncomfortable quickly, especially on hard courts where he is able to flatten the ball, play on his front foot, and shorten points. That is the main reason Elo still sees him as much closer to fringe top-100 level than his current ranking does.\n\nThe problem is everything after the serve advantage. His return game in the last-52 sample is weak: only 32.6% return points won and just 14.5% break rate. Those are low numbers for a player trying to live at ATP main-draw level. In practical terms, it means he does not create enough scoreboard pressure when matches settle into normal service patterns. Even though he can hold reasonably well, he is too often playing from a zero-margin position where one loose service game or one bad tiebreak swings the whole match.\n\nThat dynamic shows up in the overall indicators. He is only 9-10 in the last 52, with 49.3% total points won and a 0.93 dominance ratio. That is a negative tour-level profile. It is not disastrous, but it is clearly below the line of a stable ATP player. The 2025 season was especially rough at 5-12 with a 0.86 DR, and while 2026 has improved to 8-7 with a 0.96 DR, the underlying level is still only around break-even rather than convincingly positive.\n\nSo the right way to think about Zhang is not that he is finished, but that he is incomplete right now. The serve and shotmaking are still live enough to beat quality opponents on a given day. He has shown that repeatedly over the last few years, and even in the recent period there are reminders of the level. But the full week-to-week structure is not there. The return numbers are too soft, the second serve is too attackable at 48.7% won, and the match-to-match reliability has collapsed compared with his peak period when he briefly looked like a sustainable top-40 hard-court threat.\n\nThe rank/Elo gap matters a lot here. Current rank 270 reflects lost points and poor continuity, but Elo rank 84 suggests the market still prices him as a dangerous opponent, not a washed lower-tier player. That makes sense. Players with his serve, size, and flat pace can still be live in qualifying, weaker main draws, and indoor or quicker hard-court conditions. But unless the return game improves meaningfully, he will remain vulnerable in coin-flip matches because he is too dependent on holding and outplaying people in short bursts.\n\nOverall, Zhang profiles as a serve-first hard-court attacker whose ceiling is still visibly higher than his ranking, but whose current statistical base is too thin to trust. He is dangerous, but fragile. The ATP rank is probably too low relative to true talent, while the recent point stats still say caution because the return game and overall control of matches are not good enough yet.",
hardCourtNote: "Hard court is clearly the live surface for the current version of Zhang. The serve still earns cheap points, the flat baseline game plays up, and he can look like a real problem when he gets ahead early in rallies. The issue is that the return numbers are too weak to let him dominate consistently.",
weaknesses: "return game has collapsed badly in the last-52 sample, with only 32.6% return points won and 14.5% breaks; overall recent point profile is negative: 49.3% TPW and 0.93 DR; second-serve performance is vulnerable, with only 48.7% won over the last 52 weeks; current ranking has cratered from his peak, showing weak continuity and too many early losses; recent sample is almost entirely hard-court based, so there is not much evidence of present all-surface stability; top-end opponents still expose the return and rally tolerance issues",
},

"Nikoloz Basilashvili": {
eloRank: 165,
elo: 1623,
record2026: "5-10 (33%)",
record: "485-430 (53%) career",
style: "ultra-aggressive baseline hitter, high-risk flat-ball shotmaker, tempo-dictating first-strike attacker, streak-dependent power baseliner",
strengths: "can generate overwhelming baseline pace and take control of rallies quickly, serve has improved in recent sample, with ace rate up to 9.4% last 52 and 12.6% in 2026, first-serve effectiveness is strong, winning 74.9% of first-serve points over the last 52, still capable of high-end wins and deep runs when timing is on, 2024–2025 stretch showed he can still produce positive ATP-level metrics (above 50% TPW, DR >1.00)",
serveStats: "Hold 78.1%, Ace 9.4%",
returnStats: "RPW 36.1%, Break rate 21.9%",
overallStats: "DR 0.99, TPW 49.9%, Tiebreak 55%",
fullNote: "Basilashvili is one of the clearest examples of a high-variance, offense-driven player whose peak level far exceeds his current baseline. At his best, he was a top-20 player with elite shotmaking, capable of overwhelming even top-tier opponents with flat, relentless baseline pace. That peak is still visible in flashes, but the current statistical profile shows a player whose week-to-week level has normalized closer to neutral or slightly negative.\n\nThe defining trait of his game is risk. He plays extremely aggressive from both wings, especially off the forehand, looking to shorten rallies and dictate immediately. When that is working, he can produce dominant scorelines and runs, as seen in 2024 and 2025 where he posted 51.2% and 50.6% TPW respectively, both with positive dominance ratios. Those seasons showed that even in his 30s, the ceiling is still ATP-relevant.\n\nHowever, the structure underneath that aggression is fragile. Over the last 52 weeks he sits at 49.9% TPW and 0.99 DR, which is essentially break-even. That is a huge drop from what you would expect from a former top-20 player. In 2026 it has worsened further to 48.4% TPW and 0.91 DR. Those are clear losing-player numbers. The reason is that when his timing drops even slightly, the error count rises quickly and he no longer has the defensive or return base to compensate.\n\nThe serve has actually improved in some respects. His ace rate has jumped from a modest 5.2% career mark to 9.4% over the last 52 and 12.6% in 2026, which helps him maintain a respectable hold rate around 78%. His first-serve points won are strong at 74.9%. But this is not a dominant serve profile, and his relatively low first-serve-in rate (54.3%) combined with only average second-serve performance (50.0%) means he still gets dragged into too many neutral rallies, where his volatility becomes a liability.\n\nThe return side is the bigger long-term decline. Career numbers (37.9% RPW, 23.8% break rate) were solid, but the recent version is weaker at 36.1% RPW and 21.9% breaks. That is not disastrous, but it is not strong enough to support a high-risk attacking style. He does not generate consistent scoreboard pressure, so when he has an off serving day or a dip in timing, matches get away from him quickly.\n\nThe Elo versus ranking gap is telling. An Elo rank of 165 compared to an ATP rank of 134 suggests he is slightly overranked relative to current performance level. That fits the broader picture: his name value and occasional runs keep him in the ranking range, but the underlying point profile does not support consistent results at that level anymore.\n\nSurface-wise, he is relatively neutral. Hard and clay are both essentially break-even in the last-52 sample, while grass has been slightly more efficient in a small sample. This reflects his style more than surface specialization. He is not adapting his game significantly by surface; he is imposing the same aggressive template everywhere, with results driven more by form than conditions.\n\nIn matches, the pattern is very predictable. When Basilashvili wins, it is usually because he is dictating early, hitting through the court, and keeping rallies short. He can look unplayable in those stretches. When he loses, it is often abrupt: error cascades, low first-serve percentage, and inability to stabilize rallies. There is very little middle ground.\n\nOverall, Basilashvili is still a dangerous opponent in isolated matches, especially against players who give him time or struggle with pace. But the current data shows a player who is no longer structurally sound enough to sustain high-level results. He is high-upside but fragile, capable of beating strong players on a good day, but equally capable of losing early when the margins tilt against him.",
hardCourtNote: "Hard court is where his aggressive baseline game is most natural, but the recent numbers show only a neutral profile. He can dominate if timing is on, but lacks the consistency to control matches regularly.",
weaknesses: "extremely volatile profile with large swings in level from match to match; return game has declined from earlier career levels and is now only moderate (36.1% RPW last 52); second serve is attackable and drops sharply under pressure; 2026 form is poor both in results (5-10) and underlying numbers (48.4% TPW, 0.91 DR); low margin style leads to frequent error-driven losses; Elo rank (165) is significantly worse than ATP rank, suggesting he is currently overranked",
},

"Coleman Wong": {
eloRank: 113,
elo: 1689,
record2026: "15-11 (58%)",
record: "161-131 (55%) career",
style: "serve-led aggressive baseliner, tempo-driven hard-court attacker, first-strike player with improving all-court balance, controlled aggression with solid rally tolerance",
strengths: "serve has become a real weapon, with 12.0% ace rate last 52 and 14.3% in 2026, strong first-serve + second-serve combo (73.0% / 52.1%) gives him stable service games, hold rate trending up to 80.5% last 52 and 83.4% in 2026, hard-court profile is clearly positive (51.4% TPW, 1.09 DR), consistent incremental improvement year-over-year since 2022, can compete with higher-ranked players and already owns top-level wins (e.g. Shelton, Nakashima)",
serveStats: "Hold 80.5%, Ace 12%",
returnStats: "RPW 36.9%, Break rate 21.7%",
overallStats: "DR 1.05, TPW 50.9%, Tiebreak 58%",
fullNote: "Wong profiles as a young, upward-trending hard-court player whose game is built around serve quality and controlled aggression rather than pure shotmaking volatility. The key takeaway is that he is already a stable positive player at age 21, but not yet a dominant one. His Elo rank (113) and ATP rank (120) are closely aligned, which suggests the market has a fairly accurate read on his current level.\n\nThe biggest driver of his improvement has been the serve. Over the last 52 weeks he has posted a 12.0% ace rate, won 73.0% of first-serve points, and 52.1% on second serve, leading to an 80.5% hold rate. In 2026 those numbers are even stronger, with a hold rate up to 83.4% and ace rate at 14.3%. That matters because it gives him a reliable foundation. He is not constantly under scoreboard pressure, which is often the difference between fringe Challenger players and stable top-120 types.\n\nHowever, the return side is still developing. His 36.9% RPW and 21.7% break rate are solid but not impactful enough to consistently dominate matches. This is why his overall metrics sit in the “good but not elite” range: 50.9% TPW and 1.05 DR. That profile wins more matches than it loses, but it does not create consistent separation. Many of his matches are competitive and margin-sensitive, especially against players with strong serves or similar baseline profiles.\n\nThe surface split reinforces his identity. Hard court is clearly his best surface, where his serve and first-strike patterns translate cleanly into a 51.4% TPW and 1.09 DR. Clay is a clear weakness, with only 48.2% TPW and a 0.88 DR, showing that extended rallies and slower conditions reduce his edge. Grass is viable in smaller samples because the serve plays up, but it is not yet a major differentiator.\n\nFrom a development standpoint, the trajectory is encouraging. Since 2022 he has improved every year: from a 46.8% TPW / 0.87 DR player to a stable 50%+ TPW player with a positive DR. The 2026 numbers (51.1% TPW, 1.07 DR) suggest another incremental step forward. This kind of steady progression is often more predictive than volatile spikes, especially for players transitioning from Challenger level to consistent ATP relevance.\n\nMatch dynamics are fairly clear. Wong wins when he serves well, keeps points on his terms, and uses controlled aggression rather than overpressing. He is not a chaotic shotmaker; his game has more structure than many young attackers. When he loses, it is usually because the return game does not generate enough pressure, forcing him into too many neutral exchanges where the opponent can match him or outlast him.\n\nOverall, Wong looks like a solid, emerging ATP-level player with a strong hard-court base and a clear developmental path. He is not yet a high-ceiling disruptor, but he is already a reliable competitor with a positive statistical profile. The next jump will come if the return game improves from “solid” to “impactful,” which would turn his current narrow edges into more decisive wins.",
hardCourtNote: "Hard court is clearly his foundation. The serve becomes a real weapon, and his structured aggression allows him to control a high percentage of points without overextending.",
weaknesses: "return game is still only average (36.9% RPW, 21.7% break last 52); overall profile is positive but not yet dominant (50.9% TPW, 1.05 DR); clay performance is clearly below his hard-court level; can struggle to convert matches where he does not control with serve + first ball; top-tier opposition still exposes gaps in consistency and physical baseline tolerance",
},

"Luca Van Assche": {
eloRank: 91,
elo: 1721,
record2026: "18-6 (75%)",
record: "197-157 (56%) career",
style: "counterpunching baseliner with strong movement, return-oriented grinder with good rally tolerance, tempo disruptor who wins through depth and consistency, all-court clay-rooted player whose hard-court level has improved",
strengths: "return game is the clearest asset: 42.0% RPW and 32.5% break rate over the last 52, 2026 jump is real: 53.3% TPW and 1.18 DR are excellent numbers for this level, hard-court profile is now clearly positive, not just clay-based (52.2% TPW, 1.12 DR last 52), very solid second-serve points won for his archetype (51.1% last 52, 55.2% in 2026), wins a lot of long, physical matches through consistency and pattern discipline, young but already proven against strong Challenger and fringe ATP opposition",
serveStats: "Hold 75.8%, Ace 4.3%",
returnStats: "RPW 42%, Break rate 32.5%",
overallStats: "DR 1.1, TPW 51.7%, Tiebreak 46%",
fullNote: "Van Assche profiles as a high-IQ, movement-based baseliner whose game is built more on return pressure, rally tolerance, and point construction than on pure serve or first-strike power. The statistical profile is strong and, importantly, trending upward again after a flatter 2024. His Elo rank of 91 being better than his ATP rank of 106 suggests his underlying level is a bit stronger than the ranking alone indicates.\n\nThe most important thing in his profile is the return game. Over the last 52 weeks he has posted 42.0% return points won and a 32.5% break rate, both excellent markers. Those are the numbers of a player who can consistently create scoreboard pressure even without a huge serve. That return strength is what separates him from many players in the same ranking band. He does not need to dominate service games to control matches because he gets into so many return games.\n\nHis serve is solid structurally, but not naturally explosive. The ace rate is just 4.3% over the last 52 weeks, and even though his first-serve-in rate is healthy at 64.5%, the serve is more of a point starter than a point finisher. The good news is that he compensates with strong second-serve performance: 51.1% second-serve points won over the last 52, rising to 55.2% in 2026. That is a very useful indicator because it means he is not overly vulnerable once rallies begin. He can neutralize serve disadvantages by playing well immediately after the serve.\n\nThe broad profile is very healthy. Last 52 weeks: 51.7% total points won and a 1.10 dominance ratio. In 2026 those jump to 53.3% TPW and 1.18 DR, which is a major step. A 1.18 DR is genuinely strong and suggests his current form is closer to solid top-80 level than fringe top-110 level. The 18-6 record in 2026 backs that up. This looks less like random variance and more like a real rebound.\n\nAnother important development is that hard court now looks like a real strength rather than just a survivable surface. Over the last 52 weeks he is 28-14 on hard with 52.2% TPW and 1.12 DR, actually stronger than his clay split in pure efficiency terms. That matters because earlier in his development he looked more naturally clay-oriented. Now the numbers suggest he is becoming a more complete player, with hard courts maybe even his best practical surface because the return game still translates while the court rewards his improved baseline penetration.\n\nThe weaknesses are tied to style. Because he does not get many free points on serve, matches can stay close even when he is the better player. The weak tiebreak mark last 52 weeks, 46%, fits that picture. Players who rely more on accumulation than quick finishing often underperform in short-form, high-variance moments. Against bigger hitters, he can also get pushed behind the baseline and forced to absorb too much unless he takes the ball early enough.\n\nFrom a matchup standpoint, Van Assche is uncomfortable for loose or impatient opponents because he gives little away and keeps making them play. He is especially dangerous against players who have shaky second serves or who need rhythm to dictate. Against elite first-strike players, though, he may need exceptional depth and court position because he does not have a huge serve to reset points cheaply.\n\nOverall, Van Assche looks like a very real ATP-caliber player whose base is already strong because of his return game and physical consistency. The 2026 numbers suggest he is trending back toward, and probably above, his prior career-high ranking range. The key to the next level is not a total style change; it is simply turning the serve and first forehand from 'adequate' into 'reliably positive' weapons. If that happens, his return foundation is good enough to support a move well inside the top 100 and potentially into the top 60 range again.",
hardCourtNote: "Hard court now looks like a genuine strength. The return game still holds up, and the recent jump in serve efficiency has made his overall profile clearly positive on the surface.",
weaknesses: "serve is still modest by ATP standards; ace rate is only 4.3% last 52; hold rate is good but not overwhelming, so he can be dragged into many pressure games; tiebreak performance last 52 is weak at 46%, which fits a player who wins more by attrition than cheap points; can struggle to finish points quickly against aggressive first-strike opponents; ceiling is capped somewhat unless serve/forehand become more damaging weapons",
},

"Ignacio Buse": {
eloRank: 63,
elo: 1770,
record2026: "7-5 (58%)",
record: "150-92 (62%) career",
style: "clay-first heavy-topspin baseliner, high-volume return pressure player, physical rally grinder with controlled aggression, point-construction focused counterpuncher",
strengths: "elite return profile for his level: 41.5% RPW career, 39.8% last 52, very strong break rate (27.4% last 52, 30.4% career), clay performance is clearly high-level (51.7% TPW, 1.10 DR last 52), second serve is solid for a non-big server (52.3% last 52), consistent win rate profile (67% last 52) backed by positive underlying numbers, proven ability to beat strong opponents on clay (Berrettini, Fonseca, etc.)",
serveStats: "Hold 77.3%, Ace 5.1%",
returnStats: "RPW 39.8%, Break rate 27.4%",
overallStats: "DR 1.08, TPW 51.3%, Tiebreak 59%",
fullNote: "Buse profiles as a classic clay-first grinder with a strong return foundation and a steadily improving overall level, but with clear surface dependence and a slight dip in 2026 form. The headline numbers over the last 52 weeks are strong: 51.3% total points won and a 1.08 dominance ratio, paired with a 51-25 record. That is the profile of a player who is legitimately outperforming most opponents at the Challenger/ATP fringe level.\n\nThe defining strength is the return game. With 39.8% return points won and a 27.4% break rate over the last 52, Buse consistently creates pressure. That is especially important given his serve is not dominant. He wins matches by accumulating small edges across many return games rather than by dominating service holds. On clay, this becomes even more pronounced. His 42-19 clay record with a 1.10 DR reflects a very functional, repeatable winning formula: extend rallies, force errors, and gradually take control of points.\n\nHis serve is adequate but not a separator. A 5.1% ace rate and 69.5% first-serve points won indicate that he does not generate many free points. However, the second serve is solid at 52.3%, which prevents opponents from easily attacking him. The hold rate at 77.3% is respectable for his style, but it means he relies heavily on breaking serve rather than protecting his own at elite levels.\n\nThe biggest concern is the shift in 2026. While the record is still positive at 7-5, the underlying numbers have dipped: 49.7% TPW and 0.96 DR. More importantly, the return numbers have fallen to 34.5% RPW and 20.6% break rate. That is a significant drop from his baseline and suggests that his core advantage—return pressure—is currently underperforming. Without that edge, his profile becomes much more fragile, especially given the lack of a dominant serve.\n\nSurface dynamics are very clear. Clay is his natural environment and where his full profile shows up. Hard courts are playable but less effective, with only a marginally positive 1.02 DR. Grass is currently a non-factor. This makes him somewhat predictable in terms of performance: dangerous and reliable on clay, more volatile elsewhere.\n\nMatch patterns follow a consistent structure. When Buse wins, it is usually through sustained pressure: long rallies, consistent depth, and forcing opponents into errors. When he loses, it is often because he cannot generate enough offensive weight to finish points, or because his return game is not creating enough opportunities. Against big servers or aggressive players who can take time away, he can struggle to impose his preferred rhythm.\n\nThe Elo and ranking alignment at 63 suggests the market has a very accurate read on him. He is not being underrated or overrated; he is performing roughly at his level. The question going forward is whether the 2026 dip is temporary or indicative of a plateau. If his return numbers rebound, his existing profile is strong enough to maintain or slightly improve his ranking. If not, he risks becoming more of a surface-dependent player who thrives primarily on clay.\n\nOverall, Buse is a structurally sound, return-driven player with a clear identity and strong clay credentials. His ceiling will depend on whether he can add just enough offensive weight—particularly on serve and first ball—to turn his consistent pressure into more decisive wins.",
hardCourtNote: "Hard court is playable but not ideal. His return still gives him chances, but the lack of free points on serve limits his ability to separate from opponents.",
weaknesses: "serve is not a weapon, with only 5.1% ace rate last 52; hard-court profile is much weaker than clay (50.4% TPW, 1.02 DR); 2026 return numbers have dropped sharply (34.5% RPW, 20.6% break); can struggle to finish points quickly against aggressive players; limited free points means tight matches often come down to margins; grass profile is currently non-competitive",
},

"Rinky Hijikata": {
eloRank: 94,
elo: 1720,
record2026: "15-10 (60%)",
record: "240-171 (58%) career",
style: "baseline counterpuncher with compact strokes, tempo disruptor who absorbs and redirects pace, high-IQ point constructor with strong timing, counter-attacker who thrives in neutral rallies",
strengths: "extremely stable across metrics (career DR 1.00, last 52 DR 1.01), solid two-sided baseline game with no major technical holes, very reliable in tiebreaks (60% career), good second serve performance (52.3% last 52), competent return game (38% RPW) that keeps him competitive in most matches, proven ability to upset higher-ranked players on hard courts",
serveStats: "Hold 77.9%, Ace 5.7%",
returnStats: "RPW 38%, Break rate 25.2%",
overallStats: "DR 1.01, TPW 50.5%, Tiebreak 60%",
fullNote: "Hijikata is one of the most ‘neutral profile’ players inside the top 100—almost every key metric sits right around equilibrium. A 50.5% total points won and 1.01 dominance ratio over the last 52 weeks perfectly capture his identity: consistently competitive, rarely overwhelmed, but also rarely dominant.\n\nHis game is built around balance and timing rather than power. From the baseline, he absorbs pace well and redirects with compact strokes, making him difficult to hit through. This allows him to stay in rallies and force opponents to play extra balls. However, this same trait limits his ability to take control of points. He often relies on opponents to miss rather than imposing himself.\n\nThe serve is functional but not impactful. A 5.7% ace rate and sub-69% first serve points won mean he doesn’t generate many free points. His hold rate (77.9%) is solid but not protective enough to offset a middling return game. The second serve is actually a positive (52.3%), which helps him avoid getting attacked too easily, but it doesn’t create advantage either.\n\nOn return, he sits in the ‘good but not dangerous’ tier. Around 38% RPW and 25% break rate means he applies pressure but doesn’t consistently convert it into control of matches. This creates a lot of close matches—reflected in his strong 60% tiebreak record. He is comfortable in tight situations, but the reliance on them introduces volatility.\n\nSurface-wise, hard courts are clearly his best environment. His 1.02 DR there shows he can edge opponents consistently. Clay is a poor fit; without easy offense, longer rallies expose his inability to finish points. Grass is interestingly viable due to his timing and ability to redirect pace, giving him a slightly positive 1.06 DR in a small sample.\n\nThe most important takeaway is structural: Hijikata’s entire profile sits just above the winning threshold but without separation. He wins because he is slightly better than opponents in many small areas, not because he dominates any single phase. This makes him a classic ‘Top 50–120 band’ player—dangerous on the right day, but difficult to project as a consistent top-tier threat.\n\nRecent 2026 form is steady (1.02 DR), suggesting no major regression or breakout. What you see is what you get: a reliable, well-rounded competitor who can beat good players when matches stay close, but who struggles to control matches against higher-end opponents.\n\nTo move beyond this tier, he would need one clear upgrade—either more serve effectiveness (free points) or more first-strike aggression from the baseline. Without that, his current equilibrium profile likely keeps him hovering around his current ranking range.",
hardCourtNote: "Hard courts maximize his strengths. His balance, timing, and rally tolerance allow him to stay competitive and grind out wins.",
weaknesses: "lack of a true weapon (serve + baseline both average); overall profile is neutral → struggles to dominate matches (50.5% TPW); break rate is modest (25.2%) relative to top 100 returners; can get overpowered by elite aggression or big serving; limited upside on slower surfaces (clay DR 0.95); results volatility due to reliance on tight margins",
},

"Alexander Blockx": {
eloRank: 67,
elo: 1768,
record2026: "16-7 (70%)",
record: "136-81 (63%) career",
style: "aggressive all-court baseliner with real first-strike intent, serve-forehand driven hard-court player, takes the ball early and looks to control with pace, young offensive player whose numbers already fit top-75 quality",
strengths: "excellent hard-court profile (42-19, 52.6% TPW, 1.19 DR), serve has become a real weapon (9.8% ace rate on hard, 85.6% hold), first-serve quality is outstanding (75.6% 1st serve points won on hard), overall last-52 profile is clearly positive (52.1% TPW, 1.15 DR), already winning at a strong rate for his age with upward year-over-year growth, can sustain offense over long matches, not just quick-strike bursts",
serveStats: "Hold 83.2%, Ace 8.7%",
returnStats: "RPW 39.2%, Break rate 25.2%",
overallStats: "DR 1.15, TPW 52.1%, Tiebreak 43%",
fullNote: "Blockx looks like one of the strongest underlying profiles in this group. The key number is the 1.15 dominance ratio over the last 52 weeks, backed by 52.1% total points won. That is not a fake ranking climb or a soft-draw profile — those are real top-75ish hard-court indicators, especially for a 20-year-old.\n\nHis identity is pretty clear: this is an aggressive, serve-led baseliner whose game translates best on hard courts. The serve has taken a major jump. An 8.7% ace rate overall in the last 52 weeks — and 9.8% on hard — combined with a 74.3% first-serve points won rate and 83.2% hold rate gives him a real platform. He is no longer just a promising junior-type shotmaker; the serve now creates structure and scoreboard pressure.\n\nWhat makes the profile more interesting is that the return side is not weak. A 39.2% return points won rate is good enough to support a real top-100 offense-first game. He is not a pure server. He can pressure second serves and finish points once he gets control. That balance is why the hard-court dominance ratio jumps all the way to 1.19. Players with that kind of split are usually tracking upward.\n\nThe biggest oddity in the data is the tiebreak record. He is only 10-13 in breakers over the last 52 weeks despite having strong serve numbers and a positive point-level edge. That usually suggests some combination of small-sample variance, shot-selection lapses in biggest moments, or a still-developing ability to manage score pressure. In other words, his true level may actually be a little better than his current match outcomes imply.\n\nSurface-wise, hard court is clearly the money surface. Clay is playable, but much less convincing. The second-serve win rate drops sharply there and the hold percentage falls under 70%, which means the serve stops giving him the same baseline advantage. Grass is still mostly neutral in the sample. So the current version of Blockx is best understood as a hard-court riser first, all-surface player second.\n\nThe age context matters a lot. At 20, to already have a top-90 ranking, top-70 Elo, and a 1.15 last-52 dominance ratio is extremely encouraging. That combination usually points to more upward mobility. His 2026 line — 16-7 with a 70% win rate — reinforces that the trend is still positive rather than flattening out.\n\nThe development question is less about adding raw offense and more about sharpening conversion. The serve is good enough. The baseline weight is good enough. The next jump comes from cleaning up tight sets, improving tiebreak execution, and making the return game just a bit more dangerous. If that happens, the underlying numbers suggest he can move beyond fringe top 100 and into a more stable top-50 to top-70 band.\n\nBottom line: Blockx has one of the more convincing upward profiles here. The ranking says top 90; the hard-court numbers say he may already be better than that.",
hardCourtNote: "This is where his profile really pops. The serve becomes a genuine advantage, and the full package looks comfortably top-100 with upside beyond that.",
weaknesses: "tiebreak record is surprisingly poor for an offense-led profile (43% last 52); return game is solid but not yet elite (25.2% break, 39.2% RPW); clay profile is still underdeveloped, especially on second serve (45.5% 2nd serve won); can run hot/cold in tight matches despite strong point-level numbers; still some volatility typical of a 20-year-old attacker; hard-court ceiling is ahead of current ranking, but week-to-week consistency is not fully locked in yet",
},

"Mackenzie Mcdonald": {
eloRank: 112,
elo: 1689,
record2026: "8-8 (50%)",
record: "344-283 (55%) career",
style: "quick-strike all-court baseliner built on speed, timing, and clean ball-striking, counterpunching-to-aggressive transition player rather than pure power hitter, likes taking the ball early and redirecting pace, best on faster hard and grass courts where his movement and compact strokes play up",
strengths: "very solid overall point-construction fundamentals and clean technique, still a competent hard-court player at point level (50.7% TPW, 1.06 DR on hard last 52), serve has actually held up well recently for his profile (81.2% hold on hard last 52), excellent mover who can absorb and redirect pace, comfortable against medium-paced baseline exchanges and rhythm players, experienced match player with a long track record of ATP-level wins",
serveStats: "Hold 81.6%, Ace 7.6%",
returnStats: "RPW 36.4%, Break rate 21.8%",
overallStats: "DR 1.04, TPW 50.5%, Tiebreak 41%",
fullNote: "Mackenzie Mcdonald now looks like a solid but fairly narrow-margin veteran profile. The core of the game is still recognizable: he moves well, takes the ball early, changes direction cleanly, and can rush opponents with pace absorption rather than raw force. He is still a good athlete, still technically sound, and still capable of producing very clean hard-court tennis. But the numbers suggest the version we are seeing now is more fringe top-100/top-125 than the player who peaked at No. 37.\n\nThe headline is that his overall point-level profile is still respectable, but not especially forceful. Over the last 52 weeks he is at 50.5% total points won and a 1.04 dominance ratio. That is not bad, but it is the kind of profile that leaves little room for slippage in clutch spots. His hard-court split is a bit better — 50.7% TPW and 1.06 DR — which says he is still ATP-viable on his best surface. So this is not a collapse profile. It is more that he now needs favorable conditions and good execution to separate consistently.\n\nThe serve has actually held up better than you might expect. A 7.6% ace rate over the last 52 weeks, with 65.6% first serves in, 70.4% first-serve points won, and 54.3% second-serve points won, is a pretty healthy combination for a player who is not thought of as serve-led. The 81.6% hold rate is solid. That means the biggest decline is not really on serve.\n\nThe bigger issue is on return. His break rate is down to 21.8% overall in the last 52 weeks, and return points won are just 36.4%. That is a noticeable problem for a player whose game has historically depended on being able to neutralize, extend, and then outmaneuver opponents from the back. When the return numbers slip, he has fewer chances to apply pressure, and his matches become more serve-dependent than his profile ideally wants. For a player without elite free power, that is a difficult tradeoff.\n\nThe tiebreak record reinforces the thin-margin story. He is only 11-16 in breakers over the last 52 weeks and 1-4 in 2026. Some of that is variance, but it also fits the eye test of a player who competes well point to point yet can struggle to create decisive separation against opponents with bigger weapons. He is still good enough to stay close. He is less good than before at turning close into decisive.\n\nSurface-wise, hard and grass are still clearly his lanes. On grass he remains dangerous because his movement, balance, and early contact play nicely there, and the hold percentage jumps to 85.9% in the last-52 sample. Hard court remains the most stable surface because the serve plus redirect game still works. Clay is the weak point now. A 1-4 record, 45.8% TPW, and 0.76 DR over the last 52 weeks is a very poor clay profile. He can still scrap, but the lack of easy offense and declining return leverage get exposed there.\n\nThe age context matters. At 30, this looks less like a player building toward another leap and more like a veteran trying to preserve a competitive ATP-level baseline. The skill set is still credible, and he can absolutely beat good players on faster surfaces when he is sharp. But the statistical base says his current level is closer to dangerous veteran floater than durable top-50 fixture.\n\nThe most important thing strategically is matchup dependence. Mcdonald is still very live against rhythm players, medium servers, and opponents who let him get into neutral patterns. He is much less comfortable when facing players who either overwhelm him with first-strike power or take time away before he can establish his movement and redirection patterns. Against top-end power, his recent numbers versus top 10s are grim, and the underlying point stats in those matchups collapse.\n\nBottom line: Mcdonald remains a competent hard-court and grass-court pro with enough movement, timing, and experience to punish sloppy opponents and hold his own in ATP main draws. But his return decline and weak clutch record make him look more like a narrow-margin veteran than a true rebound candidate. The current ranking is pretty believable for the underlying level.",
hardCourtNote: "Hard court is still his most reliable surface. The profile is not explosive, but it is stable enough to trouble plenty of ATP and Challenger opponents.",
weaknesses: "return game has slipped materially in the last year (21.8% break, 36.4% RPW overall last 52); tiebreak performance is poor recently (11-16 last 52, 1-4 in 2026); lacks overwhelming weapons, so margins get thin against stronger first-strike opponents; best-of-5 profile is weak recently (0-4 last 52, 43.5% TPW); clay form is a real problem right now (1-4, 45.8% TPW, 0.76 DR); at this stage, ceiling is lower and form swings matter more than they did at his peak",
},

"Adam Walton": {
eloRank: 163,
elo: 1625,
record2026: "9-10 (47%)",
record: "197-133 (60%) career",
style: "serve-led hard-court baseliner with compact, efficient strokes, first-strike player who relies on serve + early ball patterns, rhythm-based hitter who prefers medium-paced exchanges, Challenger-level aggressor with ATP transition profile",
strengths: "solid serve foundation with good ace rate (8.9% last 52, 10.3% in 2026), high first-serve quality (71–72% points won consistently), can take control early in rallies when first ball lands, capable of beating strong players when serve + forehand click (e.g., wins over Medvedev, Kecmanovic), comfortable on hard courts with a repeatable baseline structure, peaked with strong 2024–2025 numbers showing real top-100 ability",
serveStats: "Hold 80.5%, Ace 8.9%",
returnStats: "RPW 34.9%, Break rate 18.4%",
overallStats: "DR 0.97, TPW 49.5%, Tiebreak 40%",
fullNote: "Walton is one of the clearest examples of a player whose ranking and recent underlying level are slightly out of sync. At No. 85, he sits comfortably inside the top 100, but his Elo rank of 163 and his last-52-week statistical profile suggest something closer to fringe ATP / strong Challenger level right now.\n\nThe career arc explains why. In 2023–2024 he built a strong statistical base, peaking in 2024 with 51.6% total points won and a 1.11 dominance ratio, which is a legitimate top-80 profile. That period was driven by efficient serve numbers, solid baseline consistency, and enough return pressure to create separation. But the last 12 months show clear regression. His TPW has dropped to 49.5% and DR to 0.97, which is below the threshold typically needed to sustain a top-100 ranking.\n\nThe serve remains the backbone of his game. An 8.9% ace rate over the last 52 weeks and over 10% in 2026 is strong, and the 71–72% first-serve points won is consistently good. His hold rate (80.5%) is still respectable. So like several players in this tier, the serve is not the issue.\n\nThe problem is almost entirely on the return side. A 34.9% return-points-won mark and just 18.4% break rate is a major drop from his better seasons. That is a big deal because Walton’s game is not overwhelming enough to rely purely on holding serve. When the return pressure disappears, his matches become coin-flip heavy, and that is exactly what the tiebreak numbers show.\n\nHis tiebreak performance is one of the clearest red flags. He is 16-24 in breakers over the last 52 weeks and just 3-8 in 2026. That aligns with his style: he stays close in sets because he serves well and plays cleanly, but he struggles to create decisive separation or produce big-point advantages against stronger opponents.\n\nSurface-wise, this is a very hard-court-skewed profile. Even there, though, the edge has flattened. A 49.8% TPW and 0.99 DR on hard courts last 52 weeks is basically neutral. Clay and grass are clearly weaker, especially grass where the return impact drops even further and results are poor (1-5).\n\nAgainst higher-level opposition, the gap becomes obvious. His 0-3 record vs top 10 with just 44.3% TPW shows that when he cannot control with the serve or dictate early, he does not have the defensive ceiling or shot weight to recover the point. He can upset strong players occasionally—there are notable wins—but sustaining that level is the issue.\n\nFrom a structural standpoint, Walton is a classic 'efficient but not overpowering' player. He does a lot of things well: serves competently, moves decently, hits cleanly, and plays smart patterns. But he does not have a single area that consistently tilts matches in his favor at the ATP level. When his return dips even slightly, the entire profile becomes very margin-dependent.\n\nThe key takeaway is that his current ranking is still supported by prior results and solid baseline competence, but the trendline is slightly negative. Unless the return numbers rebound closer to the 20–22% break range he had during his rise, it is difficult for him to push meaningfully higher. Right now, he looks like a competitive but fragile top-100 player who can win matches when serving well, but struggles to build consistent separation week to week.",
hardCourtNote: "Hard court is his only reliable surface, but even there the edge has flattened to around neutral point-level performance.",
weaknesses: "clear decline in return performance (18.4% break, 34.9% RPW last 52); negative recent form (44% win rate, sub-50% TPW, sub-1.00 DR); tiebreak performance is a major issue (16-24 last 52, 3-8 in 2026); struggles badly against top players (0-3 vs top 10, 44.3% TPW); grass and clay profiles are weak relative to hard court; game lacks a true finishing weapon, so matches often stay close; Elo (163) suggests ranking is ahead of current level",
},

"Nishesh Basavareddy": {
eloRank: 92,
elo: 1721,
record2026: "9-4 (69%)",
record: "99-58 (63%) career",
style: "clean ball-striker with an all-court hard-court foundation, tempo player who likes to take the ball early and redirect, balanced baseliner with strong rally tolerance for his age, young ATP-transition player whose level is better than his ranking",
strengths: "Elo is much stronger than ranking (No. 92 Elo vs No. 198 ranking), solid overall point profile for age: 51.5% TPW and 1.09 DR career, hard-court game is clearly ATP-caliber in the right setting, serve is improving, especially in 2026 (9.2% ace rate, 86.8% hold), first-serve points won are strong and trending up (77.1% in 2026), composed in tiebreaks overall, especially on hard courts (8-3 last 52), has quality wins and competitive performances against higher levels, age-adjusted upside is very high because the fundamentals are already real",
serveStats: "Hold 80.5%, Ace 7.1%",
returnStats: "RPW 36.1%, Break rate 20.3%",
overallStats: "DR 0.99, TPW 50%, Tiebreak 56%",
fullNote: "Basavareddy is one of the clearest buy-low profiles in this group. The ranking has slipped to No. 198 after peaking at No. 99, but the Elo rank of No. 92 is a big signal that the underlying level is still much stronger than the official number. In other words, this looks much more like a temporarily under-ranked young player than a true sub-200 level player.\n\nThe career numbers are excellent for a 20-year-old. A 63% career win rate, 51.5% total points won, and 1.09 dominance ratio point to a real prospect, not just someone farming lower levels. The 2024 season was especially strong: 49-18 with 53.0% TPW and 1.18 DR, which is a standout developmental year. That season is the main reason the market should still take him seriously.\n\nThe issue is that the last 52 weeks have flattened out. He is just 28-26 in that span, with exactly 50.0% total points won and a 0.99 DR. That says he has been playing roughly break-even tennis overall, which matches the ranking slide. So the tension in his profile is obvious: the upside is strong, but the week-to-week production has cooled.\n\nThe most important split is hard court. That remains his true home base. On hard over the last 52 weeks he is 23-16 with 50.7% TPW and a 1.04 DR. Those are still useful numbers, especially for a 20-year-old. The serve-return combo is solid rather than spectacular, but there is enough there to project him back toward the top 100 if the trend improves.\n\nHis serve has developed nicely. The ace rate is up to 7.1% over the last 52 weeks and 9.2% in 2026, while first-serve points won have jumped to 77.1% in 2026. The hold rate of 86.8% this year is especially encouraging. That suggests a player whose serve is becoming more of a weapon instead of just a neutral starting shot.\n\nAt the same time, the return profile has backed up. Career return numbers are very promising — 39.2% RPW and 26.7% break rate — but last 52 weeks those have dipped to 36.1% and 20.3%. That is a major drop. It helps explain why the overall profile has gone from clearly positive to neutral. When he was surging, he was winning enough return points to create real separation. Recently, that edge has not shown up nearly as often.\n\nThat makes him a bit of a transition player right now: too good for his ranking on pure talent and baseline quality, but not yet complete enough to impose himself consistently at ATP level. His losses to elite or near-elite opposition are telling. Against top-10 level players the profile falls off sharply: 44.5% TPW and a 0.73 DR. That is normal for a 20-year-old, but it shows the remaining gap in physicality, pace absorption, and ability to hold structure under pressure.\n\nThe positive sign is 2026. Even in a small sample, 9-4 with a 1.05 DR and 51.0% TPW is better than the broader last-52 picture. The serve has improved, the hold percentage is up, and he qualified for the Australian Open before reaching the second round. That looks more like stabilization than decline.\n\nSurface-wise, this is still a hard-court-first player. Clay is not a disaster long term, but the current numbers say it is clearly below his hard-court level. Grass is even less developed, especially because the return impact drops and the tiebreak edge disappears.\n\nThe main takeaway is that Basavareddy is stronger than his ranking, but not yet fully polished. He has enough serve quality, ball-striking ability, and baseline control to be a top-100 caliber player again, and probably better than that in time. The current ranking mostly reflects an adjustment phase after his breakout. Right now he projects as a dangerous draw for anyone outside the top tier on hard courts, with real upside if the return game rebounds even modestly.",
hardCourtNote: "Hard court is absolutely the best surface and the one that still supports a top-100ish projection despite the current ranking.",
weaknesses: "ranking drop reflects inconsistency more than lack of level; last-52 return numbers have fallen sharply (20.3% break, 36.1% RPW); recent overall profile is basically neutral (50.0% TPW, 0.99 DR); clay and grass are clearly behind hard court; best-of-5 profile still underdeveloped; can get exposed physically or structurally by elite pace and weight of shot; double-fault clusters show up in some matches when serve rhythm slips; top-end offense is not yet overwhelming enough to control ATP matches consistently",
},

"Flavio Cobolli": {
eloRank: 32,
elo: 1849,
record2026: "9-6 (60%)",
record: "229-174 (57%) career",
style: "explosive, aggressive baseliner with clay-court roots and improving all-surface versatility, forehand-led attacker who likes to dictate with pace and take time away, emotionally charged competitor who can ride momentum hard, modern ATP athlete whose ranking has jumped ahead of his raw underlying point profile",
strengths: "clear upward career trajectory and now established at No. 14, last-52 win rate is strong at 42-26 (62%), excellent clutch performance in tiebreaks recently (27-14, 66%), very dangerous on clay, where the return game becomes a real weapon, grass results are better than many expected and show real adaptability, can raise level in bigger moments and ride streaks through events, forehand pace and confidence can overwhelm opponents when he gets front foot court position, has added notable wins over strong ATP opposition, especially outside pure clay settings",
serveStats: "Hold 78.5%, Ace 6.4%",
returnStats: "RPW 37.7%, Break rate 22.9%",
overallStats: "DR 1.01, TPW 50.3%, Tiebreak 66%",
fullNote: "Cobolli is one of the more interesting cases in this group because the ranking and the raw performance indicators are telling slightly different stories. The ranking says top-15 player, and that part is real — he is up to No. 14 with continued momentum from the last two seasons. But the Elo of No. 32 and, especially, the point-based profile suggest he is not quite playing like a typical entrenched top-15 guy on a week-to-week basis.\n\nThat tension matters. Over the last 52 weeks, he is 42-26, which is a very good win-loss record, but the underlying stats are only modestly positive: 50.3% total points won and a 1.01 dominance ratio. Those are good, but not especially strong for this ranking band. Usually, top-15 players are carrying more separation in the raw numbers. So Cobolli looks like someone who has done an excellent job converting close sets and close matches, rather than someone who has steamrolled the tour statistically.\n\nThat is reinforced by the tiebreak data. A 27-14 tiebreak record over the last 52 weeks is excellent and probably one of the biggest reasons his ranking has climbed this quickly. That does not mean it is fake — clutch play is a skill — but it does suggest some fragility if the close-match edge cools.\n\nClay remains the clearest strength. The clay split over the last 52 weeks is excellent: 15-6 with 51.8% TPW, a 1.09 DR, and a huge 33.8% break rate. That is where the full Cobolli package shows up best. The forehand does damage, his movement is natural, and his return game becomes much more dangerous. On clay he looks much more like the ranking implies, and probably even a bit better.\n\nThe surprise is that grass has also become quite viable. A 6-3 record, 85.5% hold rate, and 8-2 in tiebreaks show that he can carry aggression and confidence onto faster courts when the serve is landing. That is a strong development point, because it gives him a more complete profile than the old 'Italian clay specialist' label would suggest.\n\nHard court is where the skepticism comes in. Despite some headline runs and big wins, the last-52 hard-court numbers are weak for a player ranked No. 14: 21-17, 49.1% TPW, 0.94 DR, and only 18.6% break rate. That is the split of a dangerous but not fully reliable hard-court player. He can absolutely beat strong opponents when the forehand catches fire and he serves well, but the underlying profile says he is vulnerable on fast surfaces if he is not dictating.\n\nThe 2026 line sharpens that concern. He is still winning matches at 9-6, but the 48.7% TPW and 0.93 DR are actually negative indicators. That usually means the ranking is being held up by timely wins, not by sustained control of matches. His serve has improved — 10.2% ace rate this year is a big jump — but the return game has slipped to just 17.0% break rate, which is low for someone trying to stay in the top 15.\n\nAgainst top-10 players, the gap is still obvious. A 1-7 record, 45.9% TPW, and 0.77 DR over the last 52 weeks say he still has a meaningful step to make before he can be viewed as a genuine top-tier threat. He is very good, but not yet elite. The best players can neutralize his first strike, expose the serve, and force him to defend more than he wants.\n\nStylistically, Cobolli is dangerous because he brings intensity, pace, and confidence. He can look brilliant when the emotional current is flowing in the right direction. The risk is that his game can be momentum-sensitive. When the first-strike aggression is landing, he looks top-10 adjacent. When it is not, the underlying point construction is not always stable enough to protect him.\n\nSo the cleanest read is this: Cobolli absolutely belongs in the top-20 conversation, and on clay he can play at a top-15 or better standard. But the current No. 14 ranking probably sits a little ahead of the true all-surface baseline level suggested by the numbers. He is a legit high-end ATP player, just one whose statistical floor is thinner than his ranking suggests. If the hard-court return game improves even a little, then the ranking becomes much easier to defend over time.",
hardCourtNote: "Hard court is the stress test. The results are good enough, but the underlying numbers say he is overperforming a bit relative to rank on this surface.",
weaknesses: "underlying numbers are much less dominant than the ranking suggests; last-52 total points won is only 50.3% with a 1.01 DR, which is modest for a top-15 player; hard-court profile is the main concern: 49.1% TPW and 0.94 DR last 52; return impact versus elite players drops sharply; can run hot and cold within matches, especially when first-strike game misfires; serve is improved but still not a truly stabilizing top-tier weapon; top-10 record remains weak (1-7 last 52); ranking may currently overstate his week-to-week level on faster hard courts",
},

"Frances Tiafoe": {
eloRank: 28,
elo: 1860,
record2026: "12-6 (67%)",
record: "388-285 (58%) career",
style: "dynamic, athletic shotmaker built around serve + forehand aggression, high-variance performer who thrives on energy, crowd, and momentum, comfortable mixing offense and defense, with strong improvisation skills, plays best when emotionally engaged and dictating tempo",
strengths: "elite athleticism and movement allow him to extend rallies and flip defense to offense, serve + forehand combo can take over matches when firing, very strong in pressure moments: 69% tiebreak win rate last 52, big-match performer, especially at Slams (9-4 last 52), 2026 form is strong: 12-6 with 51.4% TPW and 1.08 DR, solid hold numbers (80%+ consistently) give him a stable base, can produce top-tier wins when locked in mentally, clay results have quietly improved (51.5% TPW, 1.12 DR last 52)",
serveStats: "Hold 80.8%, Ace 9.4%",
returnStats: "RPW 36.9%, Break rate 23%",
overallStats: "DR 1.06, TPW 50.8%, Tiebreak 69%",
fullNote: "Tiafoe is one of the clearest examples on tour of a player whose identity is tied as much to match dynamics as to raw numbers. The underlying profile is solid — 50.8% total points won and a 1.06 dominance ratio over the last 52 weeks — but not overwhelming. Yet he consistently produces high-end results, especially in big environments. That gap between baseline level and peak performance is the defining feature of his profile.\n\nAt his core, Tiafoe is a momentum-driven player. When he is engaged, energized, and dictating with the forehand, he can look like a top-10 caliber threat. His athleticism allows him to extend points, his serve gives him free points, and his shotmaking lets him finish rallies explosively. But when the energy drops or the first-strike patterns are neutralized, his level can fall closer to that of a fringe top-20 player.\n\nThe last 52 weeks reflect that balance. A 32-23 record is strong, and the 1.06 DR suggests a legitimately positive player, but not one dominating week-to-week. The tiebreak performance stands out — 11-5 (69%) — which reinforces the idea that he is winning a lot of tight matches through clutch play rather than sustained statistical superiority.\n\nThe 2026 start is encouraging. He is 12-6 with improved underlying numbers (51.4% TPW, 1.08 DR), which is closer to what you would expect from someone pushing back toward the top 15. The serve has been particularly effective, with an 83.3% hold rate and strong first-serve points won. That is a key driver of his success — when the serve is landing, the rest of his game opens up.\n\nSurface-wise, he is more balanced than earlier in his career. Hard courts remain his base, where he plays at a steady but not dominant level (50.7% TPW, 1.03 DR). Clay has actually become a relative strength, with a 1.12 DR and improved return numbers. That reflects better patience and construction in rallies. Grass, however, is still the weakest surface, where the return game struggles and the margin is thinner.\n\nThe biggest limitation in his profile shows up against elite players. The 0-6 record vs top-10 opponents over the last 52 weeks, combined with a 45.4% TPW and 0.75 DR, is a clear indicator. Against the very best, his serve can be neutralized more often, and his rally tolerance is tested. He can compete, but sustaining that level across a full match remains difficult.\n\nWhat makes Tiafoe dangerous is his ceiling. He is capable of producing matches where everything clicks — serve, forehand, movement, and energy — and in those moments he can beat almost anyone. His US Open and big-event history reinforces that. But the floor is not as stable as the very top tier, and that creates volatility in results.\n\nSo the overall picture is this: Tiafoe is a legit top-20 player with a top-10 ceiling, but not a top-10 baseline. His ranking tends to fluctuate within that band depending on form and confidence. When he is locked in, he is one of the most dangerous players in the draw. When he is not, he becomes vulnerable to more structured, consistent opponents.\n\nThe key for him is not adding new weapons — he already has them — but stabilizing the level between peaks. If he can raise his average rally tolerance and return consistency even slightly, then the gap between his floor and ceiling narrows, and that is what would make a sustained return to the top 10 realistic.",
hardCourtNote: "Hard court is his foundation — solid but not dominant. He wins plenty, but typically through tight margins rather than control.",
weaknesses: "underlying metrics are good but not elite for a top-20 player; baseline consistency can break down, especially against elite defenders; return game is average for his ranking tier (36.9% RPW); struggles badly vs top-10 players (0-6 last 52, 0.75 DR); can have sharp level drops within matches; first serve in rate is relatively low (57.4%); grass performance remains inconsistent; results can be streaky rather than stable week-to-week",
},

"Alexander Bublik": {
eloRank: 14,
elo: 1952,
record2026: "13-5 (72%)",
record: "388-291 (57%) career",
style: "serve-dominant, ultra-creative first-strike attacker, uses variety constantly: huge serving, abrupt pace changes, drop shots, slices, surprise patterns, wins by making matches uncomfortable and irregular rather than purely grinding, far more complete now than earlier in his career, with improved discipline and point construction",
strengths: "one of the biggest serves on tour; ace rate is elite at 14.2% last 52, hold game is top-tier: 87.5% over the last 52 weeks, has made real gains on second serve effectiveness (50.0% won last 52, 52.9% in 2026), much stronger baseline numbers than old Bublik versions: 51.8% TPW, 1.11 DR last 52, excellent all-surface profile, especially surprising strength on clay (23-6, 1.13 DR), can beat elite players when serving and improvising well; 7-7 vs top 10 last 52, best-of-3 profile is especially dangerous because his serve protects him from long downturns, when confident, he controls tempo and forces opponents into low-rhythm tennis",
serveStats: "Hold 87.5%, Ace 14.2%",
returnStats: "RPW 35.6%, Break rate 19.8%",
overallStats: "DR 1.11, TPW 51.8%, Tiebreak 61%",
fullNote: "Bublik’s profile has changed dramatically. The old version of Bublik was mostly a chaos server: dangerous for a day, unreliable for a month, and too unstable to sustain top-level results. The current version is different. He is still one of the most unconventional players on tour, but the underlying numbers now show a genuinely strong player rather than just a volatile entertainer.\n\nThe first thing that jumps out is how strong the serve remains while the rest of the game has improved around it. A 14.2% ace rate over the last 52 weeks is elite, and his 87.5% hold rate gives him one of the safest service platforms on tour. More important than the raw ace count, though, is the improvement behind it: first serve in is up to 62.9%, first-serve points won to 78.6%, and second-serve points won to 50.0%. That last number matters a lot because earlier versions of Bublik often gave away too much on second serve. Now he protects his service games much more consistently.\n\nThe broader profile is strong as well. Over the last 52 weeks he is 54-19 with 51.8% total points won and a 1.11 dominance ratio. Those are real top-15 level numbers. They say he is no longer living only on tiebreaks and hot streaks. He is actually outplaying opponents at a sustainably positive level.\n\nWhat is especially interesting is the all-surface strength. Hard courts are still a natural fit, with a 26-12 record and 1.09 DR, because the serve and first-strike patterns are so potent. Grass is obviously dangerous terrain for him as well, where the serve gets even more value. But the biggest development is clay. A 23-6 clay record with a 1.13 dominance ratio is not a fluke over this sample size. It suggests that he has learned how to use shape, variety, and patience better than before, while still injecting surprise. He is no longer just surviving on clay — he is actually thriving on it.\n\nThat said, the profile still has a ceiling and a flaw. The flaw is the return game. A 35.6% return-points-won rate and 19.8% break rate are fine, but not elite. He is still fundamentally a serve-led player. Against average or good opponents, that is enough because the serve creates so much scoreboard pressure. Against the very best returners and most stable baseliners, that gap becomes a problem.\n\nYou can see that in the top-10 split. The record is a respectable 7-7, which is far better than many players in this tier, but the underlying numbers are much worse: 46.8% TPW and 0.79 DR. That tells you he can absolutely land punches on elite players, but he usually needs to win the high-leverage moments disproportionately. Over time, top players still win more of the actual point battle against him.\n\nThe other key characteristic is that Bublik wins by distortion. He makes matches structurally weird. The serve is huge, but the real weapon is the disruption layered on top of it — off-speed balls, low skidding slices, sudden drop shots, rushed tempo changes, and awkward patterns that make opponents uncomfortable. He is not just trying to overpower; he is trying to break normal rhythm. When he is engaged and picking the right moments for those plays, he becomes a nightmare to solve.\n\nThe 2026 start mostly confirms that the rise is holding. He is 13-5, still serving at an elite level, and the second-serve numbers are even stronger. The underlying numbers are a touch below the broader last-52 sample, but still clearly positive. That suggests the jump was not just a brief heater.\n\nSo the big picture is this: Bublik is now a legitimate top-15 caliber player by level, not just ranking. His combination of serve dominance, improving baseline competence, and creative disruption gives him one of the highest matchup discomfort factors on tour. He is still not built like a classic top-10 grinder because the return game and concentration can wobble, but his current level is much more real and sustainable than people often assume.\n\nThe reason he is dangerous is obvious: if the serve is landing and he is making smart creative choices, he can beat almost anyone. The reason he is not fully bankable at the very top is also obvious: when the serve dips or the shot selection gets loose, the return game alone usually does not save him.\n\nIn other words, Bublik has evolved from a dangerous novelty into a real upper-tier player. The talent was always there. The difference now is that the structure underneath it is finally strong enough to support it.",
hardCourtNote: "Hard court is the clearest expression of his serve-first identity: elite hold numbers, frequent tiebreak control, and enough baseline improvement to sustain a top-tier record.",
weaknesses: "still volatile match to match despite major improvement; return game remains the limiting factor; 35.6% RPW is modest for a player ranked this high; against top players his overall numbers dip sharply (46.8% TPW, 0.79 DR); can lose focus or make low-percentage choices when frustrated; double-fault and risk management issues can reappear under pressure; results can hinge heavily on serve rhythm and tiebreak margins; best-of-5 level is solid, but the edge narrows compared with best-of-3; when opponents absorb the serve and extend neutral rallies, his control weakens",
},

"Alex De Minaur": {
eloRank: 6,
elo: 2024,
record2026: "12-4 (75%)",
record: "417-235 (64%) career",
style: "elite counterpunching baseliner with top-end speed and relentless court coverage, wins through pressure, depth, consistency, and physical intensity more than raw power, turns neutral rallies into uncomfortable grinding exchanges and forces opponents to hit extra balls, much more complete now on serve and in controlled aggression than earlier versions of his game",
strengths: "one of the best movers and defenders in the sport, return game is excellent: 40.4% RPW and 27.7% break rate over the last 52 weeks, very strong point-construction discipline; rarely gives away cheap rallies, hold numbers have improved to genuine top-tier hard-court standards: 84.9% last 52, 86.8% in 2026, second-serve performance is strong at 57.1% won last 52, which stabilizes his service games, best-of-5 profile is especially impressive: 12-4 with 54.1% TPW and 1.27 DR, hard-court level is firmly elite and supported by strong underlying numbers rather than just results, mentally very durable; excellent at extending pressure and wearing down less disciplined opponents",
serveStats: "Hold 84.9%, Ace 5.8%",
returnStats: "RPW 40.4%, Break rate 27.7%",
overallStats: "DR 1.2, TPW 53%, Tiebreak 63%",
fullNote: "De Minaur’s profile is that of a true upper-tier player with an unusually strong statistical foundation. He is no longer just a fast, annoying counterpuncher who makes life difficult for better hitters. The numbers now describe a complete, top-6 caliber player whose game is built on elite movement, high-end return pressure, strong defensive-to-neutral conversion, and a significantly improved serve package.\n\nThe biggest story in his development is that the old gap between his movement and his serve has narrowed a lot. Earlier in his career, De Minaur could pressure opponents in rallies but did not always protect his own service games well enough to stay with the very best. Over the last 52 weeks, that is no longer true. He is holding 84.9% of the time, winning 72.9% of first-serve points and an excellent 57.1% of second-serve points. That second-serve number is especially important because it shows how rarely he lets opponents attack him cleanly after the first ball. He still does not earn many cheap points compared to the biggest servers, but he now starts service points from a much stronger position.\n\nHis return game remains the real backbone. A 40.4% return-points-won rate and a 27.7% break rate are elite marks for a top player. Combined with his movement and consistency, that makes him one of the toughest players on tour to hold against unless you have truly top-end serving and first-strike offense. He constantly turns ordinary service games into stressful ones.\n\nThe overall point profile is excellent. Over the last 52 weeks he is 51-22 with 53.0% total points won and a 1.20 dominance ratio. Those are very strong top-10 numbers. Importantly, this is not a fake profile built on close wins or event-specific spikes. The indicators line up: strong serve improvement, elite return pressure, strong best-of-5 level, and consistent results across surfaces.\n\nHard court is still the clearest fit. The 38-15 hard record with 53.0% TPW and 1.20 DR reflects exactly what you would expect: he absorbs pace well, redirects cleanly, and makes big hitters play one or two extra shots every point. That is exhausting over the course of a match. Clay has improved a lot too. The clay split is not just respectable — it is actively strong, with 53.4% TPW and 1.20 DR. That makes sense because his speed, balance, and consistency translate very well, especially when he is willing to play with more shape and patience. Grass is fine, but the surface still gives more reward to bigger first-strike players than it does to his style.\n\nAnother very important feature of his profile is the best-of-5 split. He is 12-4 in majors over the last 52 weeks with 54.1% total points won and a 1.27 dominance ratio. That is outstanding. Long matches suit him because he is physically durable, tactically disciplined, and hard to knock out for three straight sets unless the opponent is at a truly elite level.\n\nThe limiting factor is still visible in the top-10 split. He is only 4-9 there over the last 52 weeks, with 48.8% TPW and a 0.93 DR. That tells the story pretty clearly. Against most of the tour, his pressure and completeness are enough to tilt matches toward him. Against the absolute best, especially those with huge serve-plus-one power or overwhelming baseline offense, he can still be forced into a more reactive version of himself. When that happens, his lack of effortless finishing power shows up.\n\nThat does not mean he cannot beat top players — he obviously can — but it means the matchup gets harder when he has to create instead of absorb and redirect. The very best players can sometimes hit through his resistance, especially if they protect their serve. His path to those wins usually depends on making the match physical, extending rallies, and dragging elite attackers below their preferred strike quality.\n\nThe 2026 start reinforces the overall picture. He is 12-4, has already won Rotterdam, and the numbers are still strong: 86.8% hold, 56.9% second-serve points won, 52.7% TPW, 1.18 DR. That is basically a continuation of his top-10 level rather than a departure from it.\n\nSo the big-picture conclusion is that De Minaur is now a fully legitimate elite player, not just a speed-based overachiever. His game is built on one of the best movement/return foundations in the world, and the serve has improved enough to keep the whole structure stable against top opposition. He may still lack the overwhelming offensive ceiling of the absolute best title favorites at the biggest events, but his week-to-week level is extremely real and extremely hard to break down.\n\nIn practical terms: if you cannot serve through him, hit through him, or keep him from extending rallies, he will usually drag you into a match you do not want to play. That is why his floor is so high. The reason he is just below the very top tier, rather than clearly above it, is that against the most explosive top-end players he still has to work harder for offense than they do.\n\nHe is, essentially, a modern elite pressure player: not the biggest hitter, not the biggest server, but one of the most structurally sound and physically punishing matchups on tour.",
hardCourtNote: "Hard court is his best overall platform because his return quality, movement, and improved serve combine into a very stable top-tier profile.",
weaknesses: "still lacks the effortless serve-plus-one firepower of the very biggest top-tier attackers; against elite top-10 opposition the underlying numbers fall off: 48.8% TPW and 0.93 DR last 52; can be overpowered by the absolute top offense when opponents serve big and take time away early; when forced to generate first-strike offense repeatedly, he can look less dangerous than the true super-elites; does not get many free points from serve compared to the biggest contenders; some losses still come when aggressive opponents hit through his patterns before he can settle rallies; grass upside is good but not as naturally explosive as the best serve-forehand grass players",
},

"Ben Shelton": {
eloRank: 8,
elo: 1996,
record2026: "11-3 (79%)",
record: "176-97 (64%) career",
style: "explosive left-handed serve-plus-one attacker with elite first-strike upside, looks to impose quickly with serve, forehand, and sudden pace changes, thrives in high-energy matches where he can shorten points and ride momentum, more dangerous when playing front-foot tennis than when forced into long, neutral exchanges",
strengths: "elite weaponized serve for a lefty: 13.0% ace rate over the last 52 weeks and 14.4% in 2026, hold percentage is already top-tier at 87.7% over the last 52 weeks and 91.3% in 2026, first-serve production is huge: 76.0% first-serve points won last 52, 76.7% in 2026, second serve has become a real strength, not just a survival shot: 55.1% won last 52 and 58.4% in 2026, best-of-5 profile is far better than his general profile: 12-4 with 52.8% TPW and 1.21 DR, hard-court game fits naturally with his power, lefty patterns, and easy serve-plus-one offense, tiebreak threat is real because his serve and first strike can erase scoreboard pressure, can overwhelm opponents in short bursts with pace, lefty angles, and confidence-driven shotmaking",
serveStats: "Hold 87.7%, Ace 13%",
returnStats: "RPW 33.3%, Break rate 16.3%",
overallStats: "DR 1.06, TPW 51.1%, Tiebreak 61%",
fullNote: "Shelton’s profile is one of the clearest high-upside, high-pressure power profiles in the top tier. The foundational identity is obvious: huge left-handed serve, immediate forehand intent, aggressive court positioning, emotional energy, and the ability to produce short-run bursts of tennis that overwhelm opponents. He is already strong enough statistically to be a real top-10 player, but the shape of those numbers also makes clear why he still sits just below the very strongest week-to-week contenders.\n\nThe serve is the centerpiece. A 13.0% ace rate over the last 52 weeks is enormous, and it rises to 14.4% in 2026. He is holding 87.7% overall in the last 52 weeks and an elite 91.3% so far in 2026. That is contender-level hold protection. He wins 76.0% of first-serve points and, importantly, a strong 55.1% of second-serve points over the last year. The 2026 second-serve number of 58.4% is especially encouraging because that is a real marker of growth. It suggests his service games are not dependent only on landing the first serve; he is becoming harder to attack even when points start neutrally.\n\nHard court is clearly the best expression of his game. The 28-12 hard-court split over the last 52 weeks with 51.6% total points won and a 1.11 dominance ratio is good, and the way he gets there matters. He creates scoreboard pressure very quickly, especially indoors or on quicker hard courts where the serve and lefty patterns play up. Once he is ahead, he is difficult to reel back in because holds come so fast and tiebreaks become very live outcomes.\n\nThat leads to one of the most important things about Shelton: he is dangerous in compressed match states. Tiebreaks, late sets, and short momentum swings suit him because he can generate cheap points and force opponents to defend immediately. His raw tiebreak percentage over the last 52 weeks is 61%, which is solid, though not absurd considering how strong the serve is. The more meaningful takeaway is that he is structurally set up to keep sets close even when he is not the better returner.\n\nThe big positive surprise in his profile is the Slam split. Best-of-5 is actually stronger than best-of-3: 12-4 in majors over the last 52 weeks with 52.8% TPW and a 1.21 DR. That is excellent. It means his athleticism, power, and emotional endurance hold up well over long matches. Unlike some serve-heavy or volatility-heavy players, he does not disappear over five sets. In fact, the longer format seems to give him more room to impose physically and find offensive rhythm.\n\nAt the same time, the overall profile still has a clear ceiling issue, and it is almost entirely on the return side. His return-points-won rate is only 33.3% over the last 52 weeks, with a 16.3% break rate. Those are decent, but not elite, and they are the main reason his overall point profile is good rather than dominant. Even with an enormous serve, he is still only at 51.1% total points won and a 1.06 DR over the last 52 weeks. For a top player, that says he is often winning from serve leverage rather than from controlling both sides of the match.\n\nThat becomes even clearer against top opponents. His last-52 split vs Top 10 is 3-10, with only 46.6% total points won, a 0.77 dominance ratio, and a brutal 0-7 tiebreak record. That is the loudest number set in the profile. Against top-level players, the serve still gives him chances, but the return game and rally consistency are not yet strong enough to sustain pressure over full matches. Elite players blunt his first strike more often, make him hit extra attacking balls, and expose the fact that he is still less comfortable constructing points patiently than the absolute best.\n\nThis is why his best-of-3 profile is more fragile than his Slam one. In shorter matches, when a couple of return games swing the wrong way or the opponent serves well enough to avoid pressure, Shelton can lose sets without ever really getting his teeth into the match. That is reflected in the last-52 best-of-3 line: 29-17, but only 50.2% TPW and a 0.99 DR. That is much less convincing than his longer-format number.\n\nClay is improving, but it is still the least natural surface for him. The 7-5 record is respectable, yet the underlying numbers are weak relative to his rank: 49.5% TPW and 0.97 DR. He can still win there because the serve and forehand are so big, and because the lefty shape creates awkward patterns, but the surface asks more of his rally patience, defensive balance, and return consistency than hard courts do. Grass is more intuitive for him because of the serve, but even there the return limitations keep his edge from looking overwhelming.\n\nThe 2026 start is promising because the whole serve structure has tightened further. He is 11-3, holding 91.3%, winning 70.9% of service points, and posting a 1.13 DR. Those are meaningful improvements, not random noise. Dallas is a great example of what his ceiling looks like in the right environment: big serving, tiebreak comfort, and enough offensive weight to take control quickly.\n\nSo the overall judgment is that Shelton is already a legitimate top-end threat, especially on hard courts, and one of the most dangerous players to face in any match where the serve is dominant and the score stays compressed. But his current statistical profile still says 'elite weapon, incomplete total package' rather than 'fully rounded top-tier machine.' The serve is championship level. The return is not. The offense is explosive. The rally floor is still developing. The upside is absolutely huge, because if the return and point construction climb even a little, the hold numbers are already strong enough to carry him toward true contender status.\n\nRight now, he is a player who can beat almost anyone when the serve and first strike are landing, especially on hard courts, and who is particularly dangerous in best-of-5 because the physical tools and big-shot tolerance scale well over long matches. The final step is turning that explosive identity into something more stable against elite opposition. Until then, he remains extremely dangerous, but a little more matchup- and conditions-dependent than the very top few players.",
hardCourtNote: "Hard court is clearly the best fit. The serve, lefty forehand patterns, and first-strike offense give him real top-10 hard-court threat value.",
weaknesses: "return game is still the main cap on his ceiling: only 33.3% RPW and 16.3% break rate over the last 52 weeks; vs Top 10 numbers are a major warning sign: 3-10 record, 46.6% TPW, 0.77 DR, and 0-7 in tiebreaks; can struggle when elite opponents neutralize his first strike and make him build points repeatedly; best-of-3 profile is much shakier than his Slam profile: 50.2% TPW and 0.99 DR last 52; rally tolerance and point construction are still less stable than the top all-surface elite players; when first serve or forehand dominance drops, he can leak games quickly because the return floor is modest; clay remains his least reliable surface despite some progress and isolated good results",
},

"Ugo Humbert": {
eloRank: 26,
elo: 1863,
record2026: "9-8 (53%)",
record: "353-239 (60%) career",
style: "left-handed shotmaker who plays fast, takes the ball early, and looks to redirect pace, prefers first-strike patterns built around serve plus backhand and flat forehand acceleration, most comfortable on quicker courts where his timing and court-skimming ball flight are rewarded, can look brilliant when rhythm is flowing, but the level can swing sharply when timing drops",
strengths: "very solid lefty serve profile: 8.8% ace rate career, 10.0% in 2026, with 87.3% hold this year, clean first-ball offense, especially on hard courts, where he can rush opponents with early contact, 2024 showed his best sustained top-level stretch: 39-24 with 51.9% TPW and 1.11 DR, has real indoor and fast-hard upside, with titles and deep runs in Marseille, Dubai, Paris, and Metz, backhand is a genuine weapon when he is confident, especially crosscourt and on the rise, grass can suit him because the compact swings and lefty patterns keep points on his terms, capable of high-end upset tennis when he serves well and takes time away from elite opponents, tiebreak play has improved recently relative to career baseline: 54% last 52, 58% in 2026",
serveStats: "Hold 84.1%, Ace 8.8%",
returnStats: "RPW 34.3%, Break rate 17.1%",
overallStats: "DR 1.03, TPW 50.6%, Tiebreak 54%",
fullNote: "Humbert is one of the clearest rhythm players in the ATP top tier. When his timing is on, he looks like a genuine problem for almost anyone on a quick court: left-handed serve, early ball-taking, clean backhand acceleration, and a game style that strips time away very quickly. When the rhythm fades, though, the profile becomes much more ordinary. That contrast is the key to reading his numbers.\n\nAt a broad level, the career line is strong enough: 353-239 with 51.2% total points won and a 1.07 dominance ratio. That says he has been a real tour-level asset for a long time. But the more relevant story is the gap between peak version Humbert and current Humbert. Over the last 52 weeks he is only 23-23 with 50.6% TPW and a 1.03 DR. That is basically the profile of a good, dangerous, but unstable top-40 player rather than a firm top-15 force.\n\nThe serve remains a clear strength. He is not in the Shelton or Hurkacz class as a pure serving weapon, but for a lefty he gets a lot out of it: 8.8% ace rate over the last 52 weeks, rising to 10.0% in 2026, plus an 84.1% hold rate last 52 and 87.3% in 2026. Those are good numbers. The 76.6% first-serve points won in 2026 is especially nice and helps explain why he can still produce stretches of very high-level tennis on fast courts. He protects service games well enough that he stays live in sets, especially indoors.\n\nWhat makes Humbert dangerous is how well the serve blends into the rest of his offensive patterns. He does not just serve big; he serves into immediate control. The lefty angle opens the court, and then he takes the next ball early, usually with the backhand or a flat forehand into space. On quick hard courts, especially indoors, that combination can feel suffocating for opponents because he does not give them much time to reset or neutralize.\n\nThat is why hard courts, and especially indoor-style hard, are still the best lens for his upside. Even in a somewhat uneven last 52 weeks, he is 17-14 on hard with 68.1% service points won. And if you zoom out a little, the 2024 season shows what his high-end version looks like: 39-24 overall, 51.9% TPW, 1.11 DR, plus major results like Marseille, Dubai, Tokyo, and the Paris Masters final. That run was not fake. It reflected a genuine top-tier shotmaking level when the offense is synchronized.\n\nThe backhand is central to that. Humbert’s two-hander is one of the cleaner redirecting shots on tour when he is confident. He is comfortable taking it early, flattening it out, and changing direction without much backswing. That lets him rush right-handers and keep rallies from getting too physical. It is also part of why he can be dangerous against big names on fast courts: he can make even top opponents feel a little hurried.\n\nBut the current statistical problem is that the overall package is not holding up consistently enough. The return numbers are modest: 34.3% return points won and only a 17.1% break rate over the last 52 weeks. Those are not disastrous, but they are too light to support a volatile first-strike game unless the serve is carrying more of the load. That is why his total points won is sitting only slightly above 50%. He wins by maintaining slim edges, not by controlling both sides of the match.\n\nThe best-of-5 split is another concern. Over the last 52 weeks he is just 1-3 in best-of-5 with 49.0% TPW and a 0.92 DR, and the Grand Slam line is 1-4 with 48.6% TPW and 0.89 DR. That is a major limitation. It suggests that his game, while dangerous over shorter matches, becomes less trustworthy when opponents have more time to adjust, extend rallies, and force him to sustain his timing over long stretches. This matches the eye test: Humbert can play extraordinary front-foot sets, but maintaining that precision over four or five sets is harder.\n\nClay is still his weakest surface at the top level. The last-52 clay split is just 2-5 with a 0.97 DR, and the underlying serve numbers dip a lot there. That is not surprising. Clay gives opponents more time to absorb his pace and asks him to defend and construct points with more patience than he naturally prefers. He has had some useful clay results in the broader record, but at ATP level it is still the least natural setting for his game.\n\nGrass is more favorable. The 4-4 record is only average, but the underlying 51.7% TPW and 1.10 DR are encouraging. His compact swings, lefty serve, and early timing translate well there. He may not have the overwhelming grass serve of the biggest servers, but stylistically the surface helps him because points stay in his preferred strike window.\n\nOne weird but notable split is the lefty matchup issue. In the last 52 weeks he is only 1-5 against lefties. That is a small sample, but it fits a broader idea: when the usual lefty patterns are mirrored back at him, some of his structural edge disappears. Humbert is often more comfortable being the one who imposes those angles than the one who has to solve them.\n\nThe 2026 numbers are mildly positive. He is 9-8, but the efficiency has stabilized a bit: 51.0% TPW and 1.06 DR. That is not outstanding, yet it is better than a pure slump profile. It says he is still hovering around solid top-30 or top-40 level, with enough quality to make runs when the draw and conditions suit him. Wins over players like Medvedev, Tsitsipas, and Fritz in the recent sample are reminders that the upside is still there.\n\nSo the overall judgment is that Humbert is a high-skill, timing-based lefty aggressor whose peak level is significantly better than his median level. On fast hard courts, especially indoors, he can absolutely play like a top-15 player because the serve, backhand, and early strike patterns all reinforce each other. But his return game is not strong enough, and his level is not stable enough, to hold that status week after week. He is dangerous, stylish, and matchup-sensitive. Against the right opponent in the right conditions, he is a nightmare. Over the long run, though, the profile still looks more like a streaky high-end shotmaker than a fully rounded elite anchor.\n\nIf he is going to climb back toward his peak ranking territory, the biggest need is not a transformation of style. It is making the current identity more reliable: a slightly sturdier forehand floor, a bit more return pressure, and better match-to-match stability when the timing is not perfect. Because when the timing is perfect, the ceiling is already obvious.",
hardCourtNote: "Hard court, especially quick hard and indoor conditions, is the natural home of his game. That is where the serve, backhand, and early-strike patterns are most dangerous.",
weaknesses: "overall last-52 profile is mediocre for a top-35 player: 23-23, 50.6% TPW, 1.03 DR; return game has slipped: only 17.1% break rate and 34.3% RPW over the last 52 weeks; lefty-lefty matchups have been poor recently: 1-5 in the last 52 weeks; best-of-5 profile is clearly weaker than best-of-3: 1-3 last 52 with 49.0% TPW and 0.92 DR; clay remains a real weakness at tour level: 2-5 last 52 with 49.6% TPW and 0.97 DR; can be rhythm-dependent, so when timing goes off the forehand can leak errors and short balls; does not consistently impose week after week against stronger athletes and heavier baseline pressure; Slam reliability is poor compared with his tour-level indoor/hard-court ceiling",
},

"Francisco Cerundolo": {
eloRank: 23,
elo: 1884,
record2026: "11-5 (69%)",
record: "324-190 (63%) career",
style: "heavy forehand clay-court aggressor with high spin and shape, baseline controller who builds points through forehand dominance, return-oriented pressure player who wins via break volume rather than serve, physically strong grinder who thrives in extended rallies on slower surfaces",
strengths: "elite return profile: 40.2% RPW and 28.4% break rate last 52 weeks, clay dominance is real: 52.8% TPW and 1.16 DR on clay, forehand is a top-tier weapon, capable of dictating rallies and creating constant pressure, 2026 jump in level is clear: 53.2% TPW and 1.17 DR, excellent tiebreak performance recently: 68% last 52, 100% in 2026, physically durable and comfortable in long baseline exchanges, can consistently beat mid-tier and lower top-50 players through pressure and volume, one of the better point-accumulation players outside the elite tier",
serveStats: "Hold 76.3%, Ace 4.7%",
returnStats: "RPW 40.2%, Break rate 28.4%",
overallStats: "DR 1.07, TPW 51.3%, Tiebreak 68%",
fullNote: "Cerundolo is one of the clearest examples on tour of a return-driven, forehand-dominant clay specialist who has successfully translated enough of that game to remain a top-20 player. His profile is built much more on pressure than on serve, and that shows up immediately in the numbers.\n\nThe defining stat is the return. Over the last 52 weeks he is winning 40.2% of return points with a 28.4% break rate. Those are borderline elite figures. Very few players outside the top tier consistently operate above 40% RPW. That tells you exactly how he wins matches: he applies constant scoreboard pressure, creates frequent break chances, and forces opponents to hold under stress over and over again.\n\nThe serve, by contrast, is solid but not a weapon. A 76.3% hold rate last 52 weeks is fine but clearly below top-10 standards, and the 4.7% ace rate confirms that he is not getting many free points. He relies on first-ball patterns rather than outright serve dominance. The first serve does its job (69.1% won), but it is more of a setup tool than a finishing shot.\n\nThat combination—average serve, strong return—is why his total points won sits in the low 51% range (51.3% last 52 weeks, 53.2% in 2026). He wins matches by consistently being slightly better across many games rather than overwhelming opponents in short bursts. The dominance ratio of 1.07 last 52 is good, but not elite. It fits a player who is reliably positive but rarely crushing.\n\nClay is where everything clicks. The last-52 clay numbers are excellent: 20-10 record, 52.8% TPW, and a 1.16 DR. The break rate jumps to 34.3% and RPW to 42.9%, which is a huge spike. On clay, his forehand becomes a true controlling weapon. The heavy topspin pushes opponents back, creates shorter replies, and allows him to dictate patterns repeatedly. Combined with his movement and physicality, he can grind opponents down while still playing aggressive tennis.\n\nThe 2026 form suggests he is currently operating at or near his peak level. He is 11-5 with a 53.2% TPW and a very strong 1.17 DR. The serve numbers have improved slightly (81.4% hold, 72.2% first serve won), but more importantly, the overall efficiency has jumped. That kind of dominance ratio is more typical of a top-10 level run, even if it is still a relatively small sample.\n\nHard courts are more neutral for him. The last-52 split is 13-11 with exactly 50.3% TPW and a 1.00 DR. That is the definition of a coin-flip profile. The return is still good (38.1% RPW), but the serve does not give him enough easy holds, and his forehand is slightly less effective when it sits up less and rallies are shorter. He can still produce runs—wins over players like Ruud, Paul, and De Minaur show that—but the margin is much thinner.\n\nGrass is clearly the worst surface. The 0-2 record with 46.4% TPW and a 0.78 DR tells the story. The lower bounce and faster pace reduce his ability to build with spin and expose the relative weakness of his serve. He has had isolated success in the past (Eastbourne title), but structurally it is not a natural fit.\n\nThe biggest gap in his profile is against elite opposition. The 1-7 record vs top-10 players with 43.8% TPW and a 0.71 DR is stark. Against top players, his serve becomes a liability and his forehand advantage is harder to assert because they can match his weight and redirect pace. This is the key barrier between his current level (solid top-20) and the next tier.\n\nTactically, everything revolves around the forehand. Cerundolo looks to run around backhands, open the court, and control rallies from that wing. When it is firing, he can dominate even strong baseliners. When it is slightly off, though, the lack of cheap serve points and limited backhand offense mean he can get stuck in neutral exchanges where he no longer has the edge.\n\nThe tiebreak numbers are interesting. He is at 68% over the last 52 weeks and 100% in 2026, which is significantly above his career baseline. That suggests improved composure or short-term variance, but it also reflects that when sets are tight, his ability to apply pressure on return still translates into key points.\n\nOverall, Cerundolo profiles as a high-level clay specialist with a strong enough all-court baseline game to stay inside the top 20. His path to winning is consistent and repeatable: pressure on return, heavy forehand control, and physical baseline play. His limitation is equally clear: without a bigger serve or more easy points, his margin against elite players and on faster courts remains thin. At his best, especially on clay, he can play like a top-10 player. Across the full calendar, he still looks more like a strong, surface-skewed top-20 anchor than a true multi-surface contender.",
hardCourtNote: "On hard courts he becomes more of a neutral efficiency player. The return keeps him competitive, but the lack of serve dominance makes matches much tighter and more opponent-dependent.",
weaknesses: "serve is below top-20 level: only 75–76% hold range long-term; low ace rate (3–5%) limits free points and makes him grind for holds; hard-court profile is much thinner: 50.3% TPW and 1.00 DR last 52; struggles badly vs elite players: 1-7 vs top 10 with 43.8% TPW; grass is a clear weakness: 0-2 last 52 with 0.78 DR; can get overpowered by big hitters on faster surfaces; when forehand misfires, he lacks alternative ways to shorten points; serve + first-strike ceiling is lower than most top-20 peers",
},

"Daniil Medvedev": {
eloRank: 5,
elo: 2030,
record2026: "18-4 (82%)",
record: "582-243 (71%) career",
style: "elite hard-court counterpuncher with world-class depth and court coverage, serve-plus-neutralizer who combines easy holds with suffocating baseline defense, one of the best pattern disruptors on tour, thriving in long, awkward rallies, flat-hitting absorber and redirector who forces opponents to overplay",
strengths: "top-tier overall hard-court profile: 53.4% TPW and 1.22 DR last 52 weeks, serve remains a major weapon: 11.3% ace rate last 52 and 84.4% hold rate, elite return quality for a big server: 40.2% RPW last 52, excellent baseline tolerance and defensive elasticity, 2026 form is outstanding: 54.5% TPW, 1.27 DR, 87.1% hold, 33.6% break, very strong vs top opposition recently: 5-4 vs top 10 last 52, hard-court point construction is still among the best in the world, can beat elite shotmakers by extending rallies and exposing impatience",
serveStats: "Hold 84.4%, Ace 11.3%",
returnStats: "RPW 40.2%, Break rate 27.9%",
overallStats: "DR 1.17, TPW 52.6%, Tiebreak 42%",
fullNote: "Medvedev still profiles as one of the very best hard-court players in the world, and the headline numbers make that obvious immediately. Over the last 52 weeks he is 47-20 with 52.6% total points won and a 1.17 dominance ratio. That is comfortably top-tier performance. On hard courts specifically, the profile sharpens further: 36-13, 53.4% TPW, and a 1.22 DR. That is a real contender-level baseline, not just a top-10 résumé built on draw luck or reputation.\n\nThe core of his game remains the same: elite serve quality plus elite neutral-rally control. He is unusual because he combines the holding power of a true big server with the return and rally skill of a premier counterpuncher. An 84.4% hold rate and 11.3% ace rate last 52 weeks are excellent. But unlike many players with that serve profile, he also wins 40.2% of return points, which is outstanding. That dual threat is why he continues to post strong total-point and dominance figures even in seasons that feel less explosive than his peak years.\n\nThe hard-court version is still the gold standard. The 85.3% hold rate, 29.3% break rate, and 41.1% RPW on hard over the last 52 weeks point to one of the most complete non-Sinner hard-court profiles on tour. He does not overpower opponents in the traditional way; instead he drains them. The serve gets him ahead, the backhand keeps him unbreakable in patterns, and his court position—however deep—lets him absorb and extend until opponents go for too much.\n\nWhat makes Medvedev so difficult is that he is both annoying and efficient. He can defend from absurd positions, but he is not merely a retriever. His ball stays low and flat, he redirects with very little backswing, and he takes away rhythm better than almost anyone. Opponents often feel like they are playing one extra ball every rally, and that extra ball is usually enough to force an error or produce a short reply.\n\nThe 2026 numbers are especially strong and suggest he may actually be playing better than his current ranking implies. He is 18-4 with 54.5% TPW and a huge 1.27 DR. That is elite, near-title-favorite territory. The serve numbers are excellent: 67.7% first serves in, 74.4% first serve won, 50.6% second serve won, and an 87.1% hold rate. The return side is even more eye-catching: 42.3% RPW and a 33.6% break rate. That is monster territory. In pure level terms, his 2026 sample looks much closer to peak Medvedev than to a declining veteran hovering around the edge of contention.\n\nThe biggest statistical blemish is the tiebreak record. He is just 13-18 over the last 52 weeks and 3-6 in 2026. That is poor relative to the rest of his profile, especially for someone with his serve. Normally a player holding in the mid-80s with strong return pressure should be at least break-even in breakers, if not clearly above. That suggests some mix of variance, poorer short-format execution, and perhaps a slight dip in his most aggressive first-strike serving under pressure.\n\nAnother red flag is the Grand Slam split. He is only 3-4 in slams over the last 52 weeks, with weaker serve and overall efficiency numbers there than in best-of-three. His best-of-five line sits at just 50.7% TPW and a 1.03 DR, compared with 53.1% TPW and a 1.21 DR in best-of-three. That is a meaningful gap. It suggests that while his week-to-week level remains elite, his ability to sustain that over seven best-of-five matches has slipped relative to his prime.\n\nSurface-wise, the ranking is clear. Hard court is still his best platform by a wide margin. Clay is no longer the disaster it once was—his last-52 clay line is a respectable 6-4 with 51.1% TPW and 1.07 DR—but it still does not maximize his strengths. The lower ace rate, lower hold rate, and slightly reduced offensive sting on first strike make him more beatable there, even though his movement and rally tolerance have improved substantially on the surface over time.\n\nGrass is more interesting. The hold rate is enormous at 94.0% last 52 weeks, and the serve clearly plays. But the return numbers collapse to 31.8% RPW and just 14.1% break rate. That makes him much more reliant on narrow-scoreline tennis. He can still make deep runs because his serve and flat ball penetrate well, but the grass version of Medvedev is less complete than the hard-court version and often more vulnerable in a couple of loose return games or a weak tiebreak.\n\nAgainst top-10 opponents, the profile is pretty healthy. A 5-4 record last 52 weeks is good, and the 1.02 DR says he has been competitive rather than merely opportunistic. That matters because it confirms he still belongs in the elite conversation. He may not be the best player on tour anymore, but he is still fully capable of beating the very best when conditions suit him.\n\nTactically, the entire Medvedev package still starts with the serve and backhand. The serve gives him scoreboard control. The backhand lets him redirect without overcommitting. From there, he forces opponents to create pace and angle repeatedly. Against players who need rhythm, this is miserable. Against players who rely on first-strike patterns, his depth and anticipation make them hit extra shots from uncomfortable positions. He is one of the best in the world at making an opponent's A-minus game look useless.\n\nThe main limitation at this stage is not that he has become average—it is that the very top attacking players can now hit through even his defensive shell more consistently than before. If an elite opponent serves big, takes the forehand early, and doesn't blink in long rallies, Medvedev can be pushed into reactive patterns where he is absorbing more than controlling. That is where the rank gap between him and the absolute top becomes visible.\n\nOverall, though, the numbers still describe an elite player, especially on hard courts. He remains one of the toughest outs in the sport, one of the best hard-court tacticians of his era, and a legitimate title threat whenever the surface rewards his serve, depth, and defensive geometry. The ranking of No. 10 slightly undersells the actual level. By the underlying profile, especially in 2026, he still looks much closer to a top-5 player than a fringe top-10 one.",
hardCourtNote: "Hard court is still his home base. The combination of elite hold rate, excellent return numbers, and unmatched rally discomfort makes him one of the toughest hard-court opponents in the world.",
weaknesses: "recent tiebreak performance is poor: 13-18 last 52 and 3-6 in 2026; slam conversion has dipped: only 3-4 in Grand Slams last 52; second-serve stability is slightly below peak Medvedev levels; on clay he is improved but still less dangerous than on hard; grass hold numbers are excellent, but return threat drops sharply on the surface; can get rushed by ultra-aggressive first-strike players when they redline; when positioned very deep, he can surrender too much court to elite attackers; occasional offensive passivity allows lower-tier opponents to hang around",
},

"Alejandro Davidovich Fokina": {
eloRank: 20,
elo: 1904,
record2026: "9-6 (60%)",
record: "306-226 (58%) career",
style: "high-variance all-court disruptor with elite movement and improvisation, aggressive counterpuncher who loves changing direction and pace, chaos creator who can turn neutral rallies into uncomfortable, scrambling exchanges, shotmaker with strong transition instincts and a willingness to attack early",
strengths: "athleticism and court coverage are elite; he defends and counterattacks extremely well, solid last-52 profile: 51.5% TPW and 1.07 DR, hard-court level is now credible top-20 quality: 25-16 with 83.5% hold, clay return game remains dangerous: 34.3% break rate and 42.5% RPW last 52, grass sample is strong: 5-2 with 52.1% TPW and 1.13 DR, best-of-five numbers are encouraging: 6-4 with 51.8% TPW, has shown he can beat elite opponents when playing front-foot tennis, more serve stability than earlier versions of his career, especially in 2026",
serveStats: "Hold 81.6%, Ace 4.9%",
returnStats: "RPW 38.4%, Break rate 25.3%",
overallStats: "DR 1.07, TPW 51.5%, Tiebreak 48%",
fullNote: "Davidovich Fokina profiles as a dangerous, athletic, high-variance top-20 player whose game is built on movement, disruption, and improvisation rather than overwhelming serve or baseline force. The overall statistical résumé is solid but not dominant: 39-24 over the last 52 weeks, 51.5% total points won, and a 1.07 dominance ratio. That is the profile of a legitimately good player who can threaten strong fields, but not quite the statistical profile of a weekly title favorite.\n\nWhat makes him tricky to evaluate is that the eye test can be more explosive than the numbers. He often looks more dangerous than his raw profile because he covers the court so well, takes the ball early, and plays with a style that makes matches messy. He is one of those players who can break rhythm, expose passivity, and drag opponents into uncomfortable patterns. When he is locked in, his mix of defense, acceleration, and improvisation can make him look like a top-10 talent.\n\nThe serve has improved meaningfully versus earlier phases of his career. Over the last 52 weeks he is holding 81.6% of the time, which is a strong number for someone whose game is not built around free points. His 67.4% first serves in and 53.1% second-serve points won are healthy indicators of increased stability. In 2026 those numbers tick even higher: 70.8% first serves in, 71.8% first-serve points won, 54.2% second-serve points won, and an 85.9% hold rate. That is probably the clearest positive development in his profile.\n\nStill, the serve is more functional than fearsome. A 4.9% ace rate over the last 52 weeks and 6.6% in 2026 show improvement, but he is not getting the scoreboard shortcuts that elite hard-court players do. He has to work for his service games more than most top players, and that matters when matches tighten late.\n\nFrom the back of the court, his main edge is dynamic movement and point-shape disruption. He is very good at turning standard rallies into broken-play exchanges. He changes direction well, absorbs pace better than his size would suggest, and can move from defense to offense quickly. He is also comfortable improvising at net and using touch. That makes him particularly annoying for rhythm players who prefer predictable rally patterns.\n\nThe return numbers show both promise and limitation. Overall last 52, he wins 38.4% of return points and breaks 25.3% of the time. Those are decent figures, but not elite. On clay the return becomes much more dangerous: 42.5% RPW and 34.3% breaks. That matches the eye test. Clay gives him more time to deploy his movement, stretch rallies, and pressure opponents with constant changes in direction. On hard courts, though, the return numbers slip to 36.9% RPW and 22.9% break rate, which is acceptable but not especially threatening for a top-20 player.\n\nThat difference explains a lot about his profile. Even though he can absolutely produce big hard-court wins, the hard-court version of Davidovich Fokina is still more about competitiveness than relentless control. His hold percentage on hard is quite good at 83.5%, but because the return side is only moderate, he often ends up in tight sets and close-score matches. He does not separate cleanly enough, so the door stays open for opponents.\n\nHis clay profile is maybe the most natural fit for his game, though not in a simple traditional-Spanish sense. He is not a heavy topspin grinder. Instead, clay amplifies his movement and defensive elasticity while giving him room to counterpunch and improvise. The last-52 clay line—9-6, 51.7% TPW, 1.08 DR—is quietly strong. The break numbers are the most impressive part. He can really pressure second serves and extend points until opponents lose patience.\n\nGrass is the surprising subplot. In the last 52 weeks he is 5-2 on grass with 52.1% TPW and a 1.13 DR. The serve/hold combination there is strong, and the second-serve points won number is excellent. That likely reflects the fact that his movement, hand skills, and comfort finishing points translate better to grass than people assume. He is not a natural grass bully, but he is much more than serviceable.\n\nHis Grand Slam split is encouraging. He is 6-4 in slams last 52 weeks, with 51.8% TPW and a 1.10 DR. That is actually a bit better than his best-of-three profile. For a player whose game runs hot and cold within matches, that is an important signal. It suggests that over longer formats, his athleticism and persistence can wear opponents down, and he has enough variety to solve problems over time.\n\nAgainst top-10 opponents he is competitive but still a notch short. A 4-5 record last 52 looks respectable, but the underlying line—49.0% TPW and 0.92 DR—says those matches are still usually uphill. He can absolutely spring upsets, especially when his defense frustrates a hitter or when he finds front-foot timing early. But the baseline numbers suggest that against elite opposition he still gets outmuscled a bit too often over the full match.\n\nThe 2026 stats are interesting because they are both encouraging and cautionary. The serve side looks stronger than ever, especially the hold rate at 85.9%. But the return numbers are down to 35.6% RPW and just 19.7% breaks. So the improved hold game is being offset by less return pressure. That creates a profile that is sturdier from behind the scoreboard but not necessarily more dominant overall. The 51.0% TPW and 1.07 DR in 2026 are basically in line with his broader last-52 level.\n\nThat is probably the essence of Davidovich Fokina statistically: good enough to beat a lot of strong players, dangerous enough to make deep runs, but not consistently dominant enough to impose himself on every draw. He is often operating near the edge—playing reactive defense, taking opportunistic cuts, and trying to win the emotional and physical volatility battle. When it works, he looks brilliant. When it doesn't, the lack of easy points and the tendency toward tight-score tennis can cost him.\n\nTactically, his best version is the one that mixes aggression with discipline. He is at his most effective when he uses his movement to extend rallies but does not become passive, and when he attacks short balls early instead of waiting for the perfect opening. His transitions are good, his feel is underrated, and he can finish with quality when he commits. The danger is when he starts forcing low-margin plays too early or trying to manufacture magic from neutral positions.\n\nOverall, he looks like a legitimate top-20 player whose ranking makes sense. The tools are exciting, the movement is elite, and the serve has reached a much more stable place. But the underlying numbers still say he is more dangerous than dominant. To climb another level, he likely needs either more free points on serve or a cleaner, more repeatable front-foot identity on return games and in neutral rallies. Right now he is a tough opponent for everyone, but not yet a player who controls tournaments with statistical authority.",
hardCourtNote: "Hard court has become a real asset rather than a weakness. The hold rate is good enough for top-20 life, but the return profile is still a bit light, which is why so many of his matches stay close.",
weaknesses: "baseline level is good rather than overwhelming; overall dominance ratio is modest; tiebreak performance remains only average overall and can swing his tournaments; serve is improved but still not a huge free-point weapon compared with top-tier peers; vs top 10 mark last 52 is competitive but still negative in underlying numbers; can lose structure and overpress when matches get tight; shot selection volatility sometimes gives opponents easy momentum swings; hard-court return numbers are only moderate for a player with his movement; he often plays too many close matches because he does not separate cleanly enough",
},

"Learner Tien": {
eloRank: 11,
elo: 1972,
record2026: "10-5 (67%)",
record: "158-66 (71%) career",
style: "left-handed counterpunching shotmaker with advanced point construction, clean timing-based baseliner who redirects pace exceptionally well, disruptive returner who thrives on angles, changes of direction, and early contact, crafty problem-solver with composure beyond his age, especially in tight sets",
strengths: "already elite for his age on hard courts: 35-14 with 51.5% TPW and 1.09 DR, tiebreak performance is a real weapon: 69% last 52, 79% in 2026, lefty patterns give him natural matchup value, especially into right-handed backhands, best-of-five profile is strong: 9-5 with 51.1% TPW and 1.06 DR, serve is improving fast, especially in 2026 with a 10.6% ace rate, first-serve quality is strong: 71.3% won last 52, 74.6% in 2026, mentality in big matches looks unusually mature for a 20-year-old, already owns high-end hard-court wins over major names",
serveStats: "Hold 79.9%, Ace 6.6%",
returnStats: "RPW 37.2%, Break rate 23.1%",
overallStats: "DR 1.03, TPW 50.7%, Tiebreak 69%",
fullNote: "Learner Tien already looks like one of the most interesting young players on tour because his profile is unusually polished for a 20-year-old. He does not project as a pure power first-striker or a raw athletic chaos player. Instead, he looks like a left-handed timing-based tactician whose value comes from taking the ball early, redirecting pace, and solving problems in real time. The statistical profile is good rather than dominant overall, but the age-adjusted signal is excellent.\n\nThe core split is simple: on hard courts he already looks like a genuine top-level threat, while on clay and grass he is still under construction. Over the last 52 weeks he is 35-14 on hard with 51.5% total points won and a 1.09 dominance ratio. That is comfortably his best surface and the clearest indicator of where his upside sits right now. The hard-court serve numbers are strong enough to support high-end ranking progress, and the combination of left-handed geometry, clean timing, and tiebreak skill makes him very dangerous in quick conditions.\n\nThe serve is one of the more encouraging parts of the profile. Last 52 he holds 79.9% overall, which is already good for a player whose game is not built around huge raw serve power. The ace rate is 6.6% over the last 52 and jumps all the way to 10.6% in 2026, which suggests that the serve is developing quickly rather than just holding steady. His first-serve points won are strong at 71.3% last 52 and 74.6% in 2026. That is real progress. He is not just landing serves; he is getting quality from them.\n\nThe first-serve-in rate sits around 60%, which is fine but leaves room for another level. If he can keep the current first-serve effectiveness while nudging that percentage higher, his hold rate could jump meaningfully. Even now, the 82.7% hold rate in 2026 is a very good sign for someone this young. It suggests his serve is becoming a more reliable scoreboard tool, not just a neutral rally starter.\n\nThe return side is solid but not yet elite. He wins 37.2% of return points last 52 and breaks 23.1% of the time. Those are respectable numbers, especially paired with his age and surface success on hard. But they are not yet the numbers of a tour-dominating returner. This matters because his overall last-52 profile is only 50.7% TPW with a 1.03 dominance ratio. That means he is winning a lot of matches without fully controlling them. The ability to edge tight sets, especially via tiebreaks, is currently doing a lot of work.\n\nAnd that tiebreak profile is one of the most important things in his numbers. He is 22-10 in tiebreaks over the last 52 weeks, which is 69%, and 11-3 in 2026, which is 79%. That is not random noise over such a meaningful sample. It suggests composure, point-starting quality, and clarity under pressure. He seems very comfortable narrowing matches into a few high-leverage decisions and executing them well. For a young player, that is a huge competitive asset.\n\nThere is also something interesting in the best-of-five split. He is 9-5 last 52 in best-of-five matches, with 51.1% TPW and a 1.06 DR. That is actually a touch better than the best-of-three profile. That usually points to fitness, resilience, and the ability to make tactical adjustments over longer match arcs. It also lines up with what his wins suggest: he does not panic when a match gets complicated, and he can keep solving for several hours.\n\nThe hard-court profile is where the real excitement is. A 71% hard-court win rate last 52 is already top-level quality. The serve numbers are healthy, the tiebreak performance is outstanding, and the left-handed nature of his game gives him automatic pattern advantages. He can pull opponents off the court, change backhand exchange geometry, and make right-handers hit uncomfortable forehands from stretched court positions. He is not overwhelming opponents with raw pace, but he makes them play difficult tennis.\n\nAgainst top-10 opposition, though, the underlying numbers show the gap that still exists. He is 4-5 against the top 10, which sounds excellent, but the deeper profile is much weaker: only 46.8% TPW and a 0.82 DR. That means when he beats elite players, he is usually doing so by being sharper in key moments rather than by carrying the overall balance of play. That is impressive in one sense, but it also warns against assuming he is already top-10 level by week-to-week dominance. The scoreline wins are real; the underlying control is not there yet.\n\nClay is clearly the biggest developmental challenge. Last 52 he is just 3-7 on clay, with 48.5% TPW and a 0.91 dominance ratio. The serve loses some bite, the hold percentage drops to 72.3%, and the return numbers do not compensate enough. That usually means one of two things: either his rally ball does not yet have enough weight for clay, or he is not fully comfortable constructing points patiently on slower dirt. Probably both. He is not failing on clay because of one fatal flaw; he simply looks less naturally advantaged there.\n\nGrass is also not yet a true asset despite a superficially even 4-4 record. The grass split last 52 is only 48.1% TPW and a 0.85 DR, which is weak. The break rate collapses to 12.2% and the return points won number is just 30.5%. That says he can survive some grass matches with serve quality and tiebreak skill, but right now he is not imposing himself on the surface. It may improve because his lefty serve and timing should translate eventually, but the current numbers are not strong.\n\nWhat really jumps out about Tien is the difference between his age and his strategic maturity. Most 20-year-olds with this ranking rise are either overpowering weaker fields or riding a single loud weapon. Tien's profile feels different. He wins because he competes cleanly, manages score pressure well, and uses his skill set in a fairly grown-up way. He already looks comfortable playing intelligent, adaptive tennis instead of just high-energy tennis.\n\nThat said, the overall stat line still says 'emerging high-level player,' not yet 'finished star.' The last-52 totals of 50.7% TPW and 1.03 DR are modest for someone with such exciting wins and such a high Elo rank. In other words, his upside case is visible, but his week-to-week control is still catching up. Right now he is probably outperforming his underlying dominance a bit because of poise, clutch serving, and tiebreak execution.\n\nThe 2026 numbers are mildly encouraging. The serve is better, the hold rate is up, and the ace rate has jumped. The return numbers are still not explosive, but the total points won percentage is holding steady around 51.0 with a slightly stronger 1.07 DR. That suggests he is not just treading water after a breakout; he is consolidating. And if the serve improvement is real, his overall baseline could move up a tier pretty quickly.\n\nFrom a scouting perspective, his best traits are probably anticipation, balance, and directional control. He seems to see the court early, he is comfortable taking pace and using it, and he does not need perfect setups to create pressure. The left-handed element makes that even tougher to handle because the natural rally shapes are unfamiliar for many opponents. He can make ordinary baseline patterns feel subtly wrong.\n\nThe next step is obvious: he needs either more free points or more repeatable return damage against top players. Ideally both. If he becomes just a little more dangerous on second-serve returns and adds a bit more physical sting to neutral balls, the strong tiebreak profile and hard-court intelligence could turn him from dangerous outsider into seeded contender. Right now he looks like a player with real top-10 tools on hard courts, but not yet a player who imposes top-10 statistical control across the whole schedule.\n\nOverall, Tien projects as a very serious hard-court talent with unusually mature competitive habits, fast-improving serve quality, and clear matchup value as a lefty. The weakness on clay and current limitations on grass keep the all-surface profile incomplete. But on hard courts, especially in pressure matches, he already looks like a player nobody will enjoy seeing in a draw.",
hardCourtNote: "Hard court is already the home surface. The numbers are strong, the lefty serve plus redirect game works, and the tiebreak profile makes him especially dangerous in tight matches.",
weaknesses: "overall dominance is still modest for a player ranked this high by Elo; vs top 10 underlying numbers are weak despite respectable win-loss results; clay remains a clear problem area right now; grass numbers are also poor underneath the surface-level record; return game is solid but not yet imposing against top-tier servers; physicality and first-strike weight can get exposed by elite power players; can be vulnerable when opponents rush him and take time away repeatedly; still reliant on timing and problem-solving more than overwhelming raw force",
},

"Brandon Nakashima": {
eloRank: 34,
elo: 1840,
record2026: "10-6 (63%)",
record: "264-173 (60%) career",
style: "clean ball-striking first-strike baseliner with compact mechanics, serve-led rhythm player who thrives in structured patterns, low-error, tempo-controlling counterpuncher from neutral positions, tiebreak-oriented match player built around serve stability",
strengths: "very strong serve foundation: 85%+ hold rate both career and last 52, excellent first-serve efficiency: ~74–75% won consistently, clean, repeatable groundstrokes that rarely break down under pressure, grass profile is strong: 51.9% TPW and 1.17 DR last 52, 2026 serve jump is real: 91.0% hold and 15.2% ace rate, high baseline consistency makes him difficult to hit through at mid-tier level, solid overall efficiency profile across career (51.5% TPW, 1.11 DR), comfortable in structured, serve-dominant matches",
serveStats: "Hold 85.2%, Ace 11.5%",
returnStats: "RPW 34.3%, Break rate 16%",
overallStats: "DR 1.05, TPW 50.5%, Tiebreak 48%",
fullNote: "Nakashima profiles as a classic serve-stability baseliner whose game is built around clean mechanics, low error rates, and maintaining neutral control rather than imposing dominance. His statistical profile is very consistent across his career, but the key detail is that his edge has narrowed over the last 12 months before showing signs of recovery in 2026.\n\nThe serve is the backbone of everything. Over the last 52 weeks he holds at 85.2%, which is strong, and in 2026 that jumps to 91.0%, which is elite territory. The ace rate has also climbed significantly, from 11.5% last 52 to 15.2% in 2026. Combined with a 67–70% first-serve-in rate and over 74% won behind it, this is a very reliable and increasingly dangerous serve profile. He is not just holding comfortably; he is starting to create real pressure on return games through scoreboard control.\n\nHowever, the return side is the limiting factor. Last 52 he wins just 34.3% of return points with a 16.0% break rate. That is well below top-30 standards. It explains why his total points won sits at just 50.5% with a 1.05 dominance ratio. He wins matches by protecting serve and being slightly more efficient, not by consistently breaking opponents down. When his serve dips even slightly, his margin becomes very thin.\n\nThis is also visible in match patterns. Nakashima plays a high volume of tight sets and tiebreaks. Over his career he has been slightly positive in tiebreaks (54%), but over the last 52 weeks that has dropped to 48%. That is important because his style relies on converting small edges in tight moments. When the tiebreak edge disappears, his win rate naturally compresses.\n\nThe hard-court profile is solid but not dominant. He is 21-17 last 52 with 50.6% TPW and a 1.05 DR. Those are essentially coin-flip numbers. The serve keeps him competitive in almost every match, but the return and lack of a finishing ground weapon limit his ability to create separation. He often needs multiple close sets to win and struggles to blow opponents off the court.\n\nGrass is actually his most efficient surface in the sample. The last-52 numbers are strong: 6-3 record, 51.9% TPW, and a 1.17 DR. The serve becomes more effective, the first-strike patterns are cleaner, and the shorter rallies reduce his need to generate offense from neutral. This fits his profile well: efficient serve, compact strokes, and controlled aggression.\n\nClay is the weakest surface. The hold rate drops to 73.7%, and the overall profile dips below break-even with 49.3% TPW and a 0.96 DR. Without easy serve points and without a heavy forehand to dictate, he struggles to create advantages in longer rallies. He can compete through consistency, but he lacks the tools to consistently impose himself.\n\nThe biggest red flag in his profile is performance against top players. He is 0-9 vs the top 10 with just 46.6% TPW and a 0.80 DR. That gap is significant. Against elite opposition, his serve is still good, but his neutral patterns are not damaging enough, and his return does not create enough pressure. He tends to get outplayed over the course of matches rather than losing purely on variance.\n\nThere is, however, a clear positive trend in 2026. The serve has taken a real step forward, and the overall numbers have improved to 51.8% TPW and a 1.15 DR. That is a meaningful jump from the last-52 baseline. A 1.15 DR is comfortably above his long-term average and suggests he is currently playing closer to a top-25 level than his ranking might indicate. If the serve gains are sustainable, they raise his entire ceiling.\n\nFrom a stylistic perspective, Nakashima is extremely clean technically. He takes the ball early, redirects well, and rarely gives away cheap errors. The problem is that he also rarely forces errors at a high rate. His forehand is solid but not explosive, and his backhand is reliable but not a point-ending weapon. This makes him very stable in rallies but not especially threatening unless he is already ahead in the point.\n\nMatch dynamics often follow the same pattern: he holds serve efficiently, keeps rallies controlled, and waits for small openings. Against mid-tier players, this is enough because his consistency forces mistakes. Against stronger players, it is not, because they can both hold serve and apply more pressure in rallies. That is why his results flatten out at the top level.\n\nThe 2026 improvements suggest a potential shift. If the serve becomes a true weapon—closer to the current 91% hold level—and he continues to generate more free points, his reliance on return pressure decreases. That would allow his clean baseline game to operate from more favorable scoreboard positions. Even a small increase in break rate (from ~16% to ~20%) would significantly change his overall profile.\n\nOverall, Nakashima is a very stable, technically clean player whose results are driven by serve reliability and low error rates. His limitation is a lack of offensive separation, especially on return. The current trajectory is encouraging because the serve is trending upward. If that continues, he can solidify himself as a consistent top-30 player with the ability to push higher. Without it, he remains a high-floor, low-ceiling type who wins efficiently but rarely dominates.",
hardCourtNote: "Hard courts suit his structure, but the numbers show he is more solid than dangerous. He holds well but does not break enough to consistently separate from opponents.",
weaknesses: "return game is clearly below top-30 level, especially last 52; break rate has dropped significantly to just 16.0% last 52; struggles badly vs elite players: 0-9 vs top 10; tiebreak performance has regressed recently (48% last 52); lacks a true finishing weapon off the ground; can get stuck in neutral rallies without creating separation; hard-court dominance is thinner than his serve numbers suggest; limited ability to flip matches when behind on scoreboard",
},

"Alexander Zverev": {
eloRank: 4,
elo: 2060,
record2026: "11-4 (73%)",
record: "594-275 (68%) career",
style: "elite serve-baseline controller with backhand-led structure, high-volume point constructor who dominates from neutral depth, first-strike player built around serve + backhand patterns, physically durable baseliner with strong defensive elasticity",
strengths: "top-tier serve consistency: 87.9% hold last 52, 91.2% in 2026, elite first-serve volume (73% in) combined with strong win rate, backhand is one of the most reliable and controlling shots on tour, excellent baseline depth that forces errors without overpressing, very strong clay profile: 54.0% TPW and 1.30 DR last 52, 2026 form is elite: 53.0% TPW and 1.26 DR, improved second serve (53.7% last 52, 56.0% in 2026), physically robust, thrives in long matches and best-of-five, consistent top-5 level across surfaces over extended periods",
serveStats: "Hold 87.9%, Ace 10.6%",
returnStats: "RPW 36.8%, Break rate 21.3%",
overallStats: "DR 1.18, TPW 52.2%, Tiebreak 62%",
fullNote: "Zverev is operating as a fully established top-tier player whose game is built on serve reliability, backhand control, and sustained baseline pressure. The key to understanding his current level is that he is no longer just a high-floor player—he is producing consistently elite underlying numbers, especially in 2026.\n\nThe serve is a major weapon again. Over the last 52 weeks he holds at 87.9%, which is already top-tier, but in 2026 that jumps to 91.2%. That is elite even among top-5 players. The improvement is not just about aces (though those are up to 14.7% in 2026), but about efficiency: 73% first serves in, 77.3% won behind them in 2026, and a strong 56.0% behind second serve. This is a complete serve profile with very few weak points.\n\nBehind that, his baseline game is anchored by the backhand. It remains one of the most stable and controlling shots on tour. He uses it to dictate crosscourt patterns, absorb pace, and redirect with depth. This allows him to win a high percentage of neutral rallies without needing to take excessive risks. The forehand is more variable—solid but not elite—and can become passive under pressure, but within his overall structure it is good enough.\n\nThe overall numbers confirm a top-5 level. Last 52 he is at 52.2% total points won and a 1.18 dominance ratio, both clearly elite. In 2026, those improve further to 53.0% TPW and 1.26 DR, which is firmly in title-contender territory. That 1.26 DR is especially notable—it indicates he is not just winning, but doing so with strong statistical margins.\n\nSurface-wise, clay is where his profile peaks. The last-52 clay numbers—54.0% TPW and 1.30 DR—are dominant. His movement, patience, and backhand stability allow him to outlast and outmaneuver opponents, while the improved serve gives him free points even on slower courts. This combination makes him one of the most complete clay-court players in the world.\n\nOn hard courts, he remains highly effective but slightly less dominant. The numbers (51.6% TPW, 1.13 DR) show a strong but not overwhelming edge. Matches tend to be tighter, and he relies more on serve stability and baseline consistency rather than outright control. Still, this is comfortably top-10 level.\n\nGrass is efficient but somewhat dependent on serve. The hold rate jumps to 92.6%, and the overall DR is a healthy 1.17, but the break rate drops to just 10.7%. This means many matches are decided on small margins, often in tiebreaks or single breaks.\n\nThe main concern in his profile is performance against the very top players. He is 3-12 vs top 10 in the last 52 weeks with just 46.7% TPW and a 0.82 DR. That gap is significant. Against elite opponents, his patterns are less effective because they can both match his baseline stability and apply more aggressive pressure. The second serve and forehand become more attackable, and he is often pushed slightly behind in rallies.\n\nThat said, his consistency outside that tier is exceptional. He rarely loses to lower-ranked players, maintains high win percentages across surfaces, and consistently goes deep in tournaments. His baseline level is extremely reliable, which is why his ranking and Elo both sit at No. 4.\n\nFrom a match dynamics perspective, Zverev wins by accumulation rather than explosion. He serves well, controls rallies with depth, and gradually forces errors. He is not as explosive as players like Alcaraz or Sinner, but he is more stable point-to-point. This makes him very difficult to beat over the course of a full match.\n\nThe 2026 trend is particularly important. The serve improvement and rising DR suggest he is currently playing at or near his peak level. If that continues, he becomes a legitimate contender at every event, especially on clay and slower hard courts.\n\nOverall, Zverev is an elite, complete player whose game is built on structure, efficiency, and physical durability. His main challenge remains bridging the gap against the very top tier, but his current form suggests he is closer than he has been in several seasons.",
hardCourtNote: "Hard court is strong but slightly more margin-based. He holds serve easily but often needs multiple tight sets to separate from top opponents.",
weaknesses: "return aggression has dipped slightly vs elite competition; struggles vs top-10 players recently (3-12 last 52); second serve can still be attacked under pressure despite improvement; forehand can break down or become passive in big moments; can revert to overly defensive patterns when tight; tiebreak level is good but not dominant relative to serve strength; occasionally lacks killer instinct when ahead in matches",
},

"Felix Auger-Aliassime": {
eloRank: 7,
elo: 1999,
record2026: "14-5 (74%)",
record: "390-233 (63%) career",
style: "serve-forehand attacker with explosive first-strike tennis, aggressive baseline player who looks to shorten points, hard-court oriented shotmaker built around serve plus forehand, rhythm-dependent offensive player with streaky momentum swings",
strengths: "huge serve ceiling: 13.9% ace rate last 52, 15.5% in 2026, elite first-serve effectiveness: 77.9% won last 52, 80.3% in 2026, hold numbers are top-tier: 87.2% last 52, 91.7% in 2026, dangerous forehand when dictating, especially on hard courts, excellent hard-court tiebreak and serve-plus-one profile, improving overall efficiency in 2026: 52.7% TPW and 1.25 DR, strong on fast surfaces where his first-strike patterns matter most, can play at genuine top-5 level when timing is locked in, solid recent record vs top 10: 6-7 last 52",
serveStats: "Hold 87.2%, Ace 13.9%",
returnStats: "RPW 36%, Break rate 18.5%",
overallStats: "DR 1.17, TPW 51.9%, Tiebreak 64%",
fullNote: "Auger-Aliassime is back in clear upper-tier form, and the numbers show that his game is once again being driven by elite serve quality and strong first-strike offense. He is not built like a pure grinder or point accumulator; instead, he wins by creating immediate pressure with serve, forehand, and aggressive court positioning.\n\nThe serve is the centerpiece. Over the last 52 weeks he holds 87.2% of the time, and in 2026 that has jumped to 91.7%, which is elite. The ace rate is huge at 13.9% over the last 52 and 15.5% in 2026. Even more important is the efficiency behind the serve: he lands 66.4% first serves, wins 77.9% of those points, and is a respectable 52.2% on second serve over the last 52 weeks. In 2026 those numbers improve again to 67.4%, 80.3%, and 53.8%. That is a genuinely dangerous serve profile and the main reason his overall level has risen again.\n\nOnce the serve gives him a short ball or a neutral rally, the forehand takes over. His best tennis comes when he is stepping inside the court, attacking with heavy pace, and finishing quickly. The forehand is the defining groundstroke in his offense, while the two-handed backhand is more of a stabilizer than a primary weapon. The backhand holds up reasonably well, but the forehand is the shot that changes matches.\n\nThe overall numbers paint the picture of a strong top-10 player. Last 52, he is at 51.9% total points won with a 1.17 dominance ratio. In 2026, that rises to 52.7% TPW and 1.25 DR. That 2026 number is especially impressive because it suggests he is not just squeaking through matches behind serve; he is controlling them at a clearly elite level.\n\nHard courts are where his profile is strongest. He is 38-13 on hard over the last 52 with 52.1% TPW, 1.18 DR, a 14.3% ace rate, and a 78% tiebreak win rate. That is exactly the kind of profile you expect from a dangerous indoor and fast-hard specialist. On these surfaces he can beat almost anyone if he serves well and gets his forehand into the match early.\n\nGrass is also a strong fit for him. The ace rate jumps to 17.1%, first-serve points won hits 80.0%, and his DR is 1.21. The issue is that the sample is smaller and his tiebreak record has not fully translated to wins yet, but stylistically grass suits him very well.\n\nClay remains the weak point. The last-52 record is just 3-6, and although the efficiency stats are not disastrous, the serve is less overwhelming and the extended rally demands expose his weaker areas. He can still produce isolated runs on clay when the draw opens or confidence is high, but compared with hard courts he is much less reliable there.\n\nThe main weakness in his profile is the return game. A break rate of 18.5% last 52 is good, but not elite for someone trying to contend consistently for the biggest titles. Against top opponents, that becomes a bigger issue: he is 6-7 vs top 10 in the last 52, which is respectable, but the underlying numbers drop to 48.7% TPW and a 0.92 DR. That suggests his serve keeps him competitive, but he does not consistently outplay the very best over full match samples.\n\nThat also explains the feel of many of his matches. He often lives on narrow margins—holds, tiebreaks, and short bursts of explosive offense. When he is confident, those margins tilt heavily in his favor because his serve and forehand are so overwhelming. When his timing slips, especially on return or in extended rallies, his level can fall off quickly.\n\nThe 2025-26 trend is encouraging. The serve numbers are stronger, the point-winning numbers are better, and his overall record is more stable. He appears to be playing with more structure and less random volatility than in some earlier seasons, when his level could swing dramatically from week to week.\n\nFrom a match-dynamics standpoint, Auger-Aliassime is most dangerous when he can play front-foot tennis: big first serve, forehand into open court, quick finish. He is much less comfortable when dragged into long, physical, directional baseline exchanges where consistency matters more than firepower.\n\nOverall, he looks like a high-end top-10 player whose best surface is hard court and whose ceiling is driven by serve plus forehand dominance. The upside is extremely high—good enough to beat elite opponents and win major events on fast courts. The final step is turning that explosive profile into more consistent return pressure and more reliable rally tolerance against the very best.",
hardCourtNote: "Hard court is clearly the best environment for his game. The serve, forehand, and tiebreak edge make him one of the more dangerous players on tour on this surface.",
weaknesses: "return game remains the main limitation at elite level; break rate is modest for a top-10 player: 18.5% last 52; second serve can lose quality under pressure against top returners; forehand can become erratic when rushed or off balance; baseline tolerance is lower than the very best defenders/counterpunchers; clay profile is still clearly weaker than hard-court profile; can run hot and cold within matches and across events; elite opponents can neutralize him if first serve is blunted",
},

"Arthur Rinderknech": {
eloRank: 36,
elo: 1830,
record2026: "5-6 (45%)",
record: "306-229 (57%) career",
style: "serve-first, short-point attacker built around a heavy first serve, tall, aggressive baseliner who prefers quick patterns over extended rallies, hard-court and grass-leaning power player with a flat strike profile, rhythm-based server who can look dangerous when matches turn into hold-and-tiebreak battles",
strengths: "big serve remains the foundation: 11.7% ace rate last 52, 12.6% in 2026, strong first-strike profile when landing first serves, generally solid hold numbers: 85.3% last 52, grass game translates well because the serve stays highly effective, comfortable in tiebreak-heavy, low-margin matches, can upset better players when serve plus forehand are clicking, good enough firepower to rush opponents and shorten points, has produced notable wins over top players on quicker surfaces",
serveStats: "Hold 85.3%, Ace 11.7%",
returnStats: "RPW 31.8%, Break rate 13.3%",
overallStats: "DR 0.95, TPW 49.3%, Tiebreak 50%",
fullNote: "Rinderknech profiles as a classic serve-led power player whose success is driven far more by holding serve comfortably than by creating constant pressure on return. He is dangerous because the serve is big enough to keep sets close against stronger players, but the broader statistical profile says he is more upset threat than week-to-week elite performer.\n\nThe serve is clearly the center of everything. Over the last 52 weeks he has an 11.7% ace rate, lands 62.9% first serves, wins 75.8% of first-serve points, and holds 85.3% of the time. Those are good numbers and explain why he remains competitive against players above him. In 2026 the ace rate is still healthy at 12.6%, but the overall serve quality has slipped a bit because the first-serve win rate is down to 74.1% and hold rate to 84.7%.\n\nHis best tennis usually comes when matches are played on his terms: short rallies, lots of first serves, quick forehand patterns, and pressure through court position. He is not a player who wants long neutral exchanges. He prefers serve-plus-one tennis and flat baseline hitting, especially on hard courts and grass where the ball gets through the court quickly.\n\nThe main issue is that the return game is too light for a stable top-30 profile. A break rate of 13.3% over the last 52 weeks is very low for this ranking range. His return points won is only 31.8%, and the total package comes out to 49.3% total points won with a 0.95 dominance ratio. That combination usually describes someone who relies heavily on close sets and narrow wins rather than someone consistently controlling matches.\n\nThat becomes even clearer against the best players. He is 3-6 vs top 10 over the last 52 weeks, which is respectable on the surface, but the underlying numbers are rough: only 7.3% break rate, 27.0% return points won, 48.0% TPW, and a 0.86 DR. In other words, he can stay close behind serve and steal matches when the tiebreaks fall his way, but he usually does not impose enough return pressure to sustain that level repeatedly.\n\nSurface-wise, hard courts are his main working environment, but the profile is not overwhelmingly strong there. He is 19-16 on hard over the last 52 with 49.6% TPW and 0.95 DR. That is playable and dangerous, but not especially authoritative. Grass arguably suits his style even better in pure stylistic terms: 90.4% hold rate, 69.2% service points won, and a neutral 1.00 DR over the last 52. The problem is that even on grass the return impact is limited, so a lot depends on small margins.\n\nClay is the weakest surface for him. The serve loses some bite, the second serve becomes more exposed, and his movement plus rally tolerance are tested more often. The last-52 clay split is 9-10 with just 48.1% TPW and 0.90 DR. He can still win clay matches through aggression and occasional hot serving, but it is much harder for him to hold a consistent edge there.\n\nThe year-by-year progression is interesting. His best statistical period was around 2020-21, when the serve-return balance was healthier and he posted 51.7% TPW / 1.15 DR in 2020 and 51.5% / 1.10 in 2021. Since then, the numbers have gradually softened. He has stayed relevant thanks to serve quality and periodic big results, but the baseline level has drifted down. The 2026 sample is especially concerning: 48.0% TPW and 0.85 DR is well below his ranking and suggests the current ranking may be a little ahead of the underlying level.\n\nHis 2025 results are a good example of his profile. He had a huge Shanghai run with wins over Zverev, Lehecka, Auger-Aliassime, and Medvedev, then made the final. That run shows his ceiling: on a quick hard court, if the serve is landing and he gets enough first forehands, he can absolutely beat elite players. But the broader sample around that run is much more uneven, which is why his overall last-52 record is only 35-31.\n\nMatch-dynamically, Rinderknech is at his most dangerous against opponents who do not pressure second serve relentlessly and who are willing to play a lot of short, serve-dominated patterns. He is less effective against elite returners, strong defenders, or players who can extend rallies and make him hit multiple precise attacking balls in a row.\n\nOverall, he looks like a dangerous serve-based top-50 caliber player who can spike into top-30 territory when the serve is running hot and the draw suits him. The strengths are obvious: serve, cheap points, quick-court offense, and upset potential. The limitation is just as obvious: the return game is too modest, and the total-point profile is too thin, to make him a truly stable upper-tier ATP player.",
hardCourtNote: "Hard court is his most important surface because it lets the serve and first-strike game stay central, but his edge there is still fairly narrow because the return numbers are modest.",
weaknesses: "return game is the major limitation: only 13.3% break rate last 52; overall point-winning profile is below top-30 standard: 49.3% TPW, 0.95 DR last 52; second-serve quality is vulnerable, especially on clay; baseline consistency drops in longer exchanges; limited ability to generate sustained scoreboard pressure on return; can be overly dependent on serve rhythm and first-ball execution; results against top players usually require near-perfect serving days; current 2026 level has dipped meaningfully from his better 2021-24 form",
},

"Jakub Mensik": {
eloRank: 15,
elo: 1940,
record2026: "14-5 (74%)",
record: "160-89 (64%) career",
style: "high-upside serve-plus-power aggressor with a modern first-strike hard-court profile, big-serving right-hander who combines easy pace with a strong two-handed backhand, offensive baseliner who is comfortable ending points early but has enough athleticism to extend when needed, young all-surface threat whose best tennis comes when serve and backhand are driving the match",
strengths: "elite upside on serve for his age: 14.9% ace rate last 52, 14.8% in 2026, first-serve quality is already top-tier: 77.5% first-serve points won last 52, has real offensive ceiling against strong opponents on hard courts, backhand is a genuine weapon and helps him redirect pace cleanly, tiebreak comfort and big-match composure are already notable, strong best-of-five profile so far: 7-3 last 52, return numbers are solid enough to complement the serve, trajectory is clearly upward, with 2026 metrics stronger than his career baseline",
serveStats: "Hold 83.7%, Ace 14.9%",
returnStats: "RPW 37%, Break rate 21.4%",
overallStats: "DR 1.08, TPW 51.3%, Tiebreak 57%",
fullNote: "Mensik already looks like one of the most dangerous young players on the ATP Tour because the foundational weapons are real. The serve is huge, the backhand is a serious shot at top-tour speed, and the overall statistical profile over the last 52 weeks is already that of a legitimate top-20 player with room for more.\n\nThe most obvious strength is the serve. Over the last 52 weeks he has a 14.9% ace rate, wins 77.5% of first-serve points, and holds 83.7% of the time. Those are premium numbers for a 20-year-old, especially when paired with solid return output. In 2026 the shape of the profile is even better overall: 14-5 record, 23.7% break rate, 38.2% return points won, 51.7% total points won, and a 1.10 dominance ratio. That is a real breakout-level stat line.\n\nWhat makes him especially intriguing is that he is not just a server. Plenty of young power players can hold serve but struggle to create enough on return. Mensik is already better than that. His last-52 return numbers are good: 37.0% return points won and 21.4% break rate. That is not elite yet, but it is clearly strong enough to make the whole package more complete. Combined with the serve, it gives him a genuine top-player framework rather than a one-dimensional big-server profile.\n\nFrom the baseline, the backhand is the cleanest standout. He can redirect pace, take the ball early, and hurt opponents crosscourt or down the line. The forehand is powerful too, though a bit more variable. The overall style is aggressive and modern: big serve, quick backhand acceleration, strong first strike, and willingness to play proactively from neutral balls. He is comfortable in fast conditions, but the clay numbers suggest he is not purely surface-dependent either.\n\nHard court is still the main reference point. He is 23-12 on hard over the last 52 with 51.2% TPW and a 1.07 DR, and many of his best wins have come there. The Miami title run in 2025 is the clearest expression of his ceiling: wins over Draper, Fritz, and Djokovic, with his serve and tiebreak play holding up under major pressure. That kind of run is not something you fake. It shows his top-end level is already good enough to beat elite players in big hard-court matches.\n\nClay is quietly encouraging. The last-52 clay numbers are actually excellent in the sample: 6-5 record, 52.3% TPW, and 1.16 DR. That does not automatically make clay his best surface, but it suggests his game is more complete than just 'big serve on fast courts.' The serve still earns free points, and his backhand plus improving movement let him stay competitive in longer rallies. He is not a finished clay-court player yet, but the underlying numbers are promising.\n\nGrass is still developing. The ace rate jumps to 16.7%, which is logical, but the sample is small and the overall output is more neutral: 4-3, 50.2% TPW, 1.00 DR. The tools say grass should eventually suit him very well. Right now it looks more like an area where the upside is obvious but the week-to-week adjustment is not fully there yet.\n\nThe biggest limitation at the moment is that the top-end profile is ahead of the floor. Against top-10 opponents over the last 52 weeks he is 1-4, and the underlying split is rough: only 31.0% second-serve points won, 5.7% break rate, 45.4% TPW, and 0.76 DR. That is a reminder that while he can beat elite opponents, he is not yet consistently imposing himself on them. The serve and aggression can trouble anyone, but the margins tighten quickly when top defenders and top returners force him to play extra balls.\n\nThe first-serve percentage is another swing factor. At 58.7% last 52 and 59.7% in 2026, it is acceptable but not ideal for someone whose game gains so much value from first-ball control. If that number climbs even a few points while he maintains the same first-serve effectiveness, the entire profile becomes much more dangerous.\n\nHis best-of-five output is also notable. He is 7-3 in Grand Slam matches over the last 52 weeks with 51.7% TPW and 1.09 DR. That is impressive for such a young player because it suggests his level is not just built for short-format ambushes. He already has the serve, mentality, and offensive toolkit to sustain winning over longer matches.\n\nThe year-to-year development is strong. In 2022 he was still a raw prospect with a negative dominance ratio. By 2023 he was already posting a 1.06 DR. In 2024 he was around break-even to slightly positive against stronger fields, and by 2025-26 he has turned into a clear ATP-level positive-force player. The serve has grown, the first-serve winning has improved, the hold rate is up, and the return is holding its own. That is exactly what you want to see from a future contender.\n\nOverall, Mensik looks like a genuine future top-10 threat and possibly more if the movement, rally tolerance, and point construction continue to sharpen. The foundation is already excellent: huge serve, premium backhand, real tiebreak comfort, and enough return game to avoid being one-dimensional. Right now he reads as a dangerous upper-tier hard-court player with all-surface upside, a high match-winning ceiling, and a trajectory that still has a lot of room left.",
hardCourtNote: "Hard court is the clearest expression of his current level: big serve, backhand acceleration, and enough return pressure to create a full top-tier profile.",
weaknesses: "first-serve percentage is still a bit low at 58.7%, which can create volatility; second-serve points won remains only average for a top-15 caliber profile; vs elite returners and top-10 players, the level still drops sharply; can run hot-and-cold within matches because so much is built on serve rhythm and bold shotmaking; physical management and durability still matter given several retirements / walkovers in the record; grass profile is promising but not yet fully developed in sample size; when forced into repeated neutral exchanges, he can still overpress; current level is ahead of his pure week-to-week consistency",
},

"Andrey Rublev": {
eloRank: 21,
elo: 1896,
record2026: "10-5 (67%)",
record: "510-288 (64%) career",
style: "high-tempo baseline aggressor built around forehand volume and pace, relentless first-strike hitter who looks to dictate from the first neutral ball, rhythm-dependent power player who thrives on controlling exchanges early, pressure baseliner who wins through sustained offensive weight rather than variety",
strengths: "elite baseline pressure profile: 51.6% TPW and 1.12 DR last 52, strong return production for an aggressive player: 37.1% RPW, 21.9% break rate, forehand is one of the most repeatable high-speed weapons on tour, serve has quietly improved: 84.2% hold last 52, up to 87.9% in 2026, first-serve effectiveness is excellent: 77.5% won last 52, consistently positive dominance ratio across multiple seasons, can overwhelm mid-tier players with sustained pace and tempo, 2026 numbers indicate a resurgence in overall efficiency (1.21 DR)",
serveStats: "Hold 84.2%, Ace 10%",
returnStats: "RPW 37.1%, Break rate 21.9%",
overallStats: "DR 1.12, TPW 51.6%, Tiebreak 53%",
fullNote: "Rublev remains one of the clearest examples of a 'pressure-through-volume' elite baseliner. His entire profile is built on sustained pace, especially off the forehand wing, and the numbers strongly support that identity. Across his career he holds a 51.5% total points won and 1.10 dominance ratio, which has been remarkably stable over time. Over the last 52 weeks that profile is essentially unchanged or slightly improved (51.6% TPW, 1.12 DR), and in 2026 it has ticked up further to 52.5% TPW and a 1.21 DR — which is a very strong indicator that his underlying level is still high.\n\nThe serve is often underrated in his profile. While not an ace-heavy weapon (10.0% last 52), it is extremely efficient. He wins 77.5% of first-serve points and 51.2% of second-serve points, which is a strong combination. The hold rate at 84.2% (and 87.9% in 2026) shows that his serve is not just a setup shot — it is a reliable foundation that allows him to consistently start rallies on his terms.\n\nThe real engine, however, is the baseline game. Rublev’s return numbers are strong for an aggressive player: 37.1% RPW and 21.9% break rate. That combination — solid hold plus strong return — is why his dominance ratio consistently stays above 1.10. He is not dependent on short points or serve dominance alone; he wins through sustained pressure across both serve and return games.\n\nHis forehand is the defining weapon. Unlike players who rely on occasional explosive winners, Rublev applies constant, repeatable pressure. He hits hard, flat, and early, and can maintain that intensity for long stretches. This is why he is extremely effective against mid-tier players — they simply cannot absorb the pace over time. His backhand is solid and stable, mainly functioning as a support shot to keep rallies neutral or slightly offensive until he can pivot to the forehand.\n\nThe limitation is that this approach is relatively one-dimensional at the very top level. Against elite defenders or players with exceptional counterpunching ability, his lack of variation becomes a problem. Players who can absorb pace, redirect it, or change rhythm tend to force errors or draw him into uncomfortable patterns. This is reflected in many of his losses: tight matches or straight-set losses where his usual pressure does not break through.\n\nTiebreaks are another indicator of this dynamic. At 51% career and 53% over the last 52 weeks, he is essentially neutral in high-leverage situations. That aligns with his style — he does not gain disproportionate advantage in short formats because his edge comes from sustained pressure rather than quick-strike efficiency.\n\nThe year-by-year trajectory is interesting. His peak statistical years (2020–2021) were clearly elite, with TPW approaching 53–54% and DR near 1.20–1.30. Since then, he has settled into a slightly lower but still strong tier. However, the 2026 data suggests a rebound: 52.5% TPW and 1.21 DR is back in near-peak territory. That implies his current ranking (16) may slightly underrate his actual level at the moment.\n\nFrom a matchup perspective, Rublev is extremely dangerous against players who allow him to dictate tempo. He can run through draws quickly when conditions favor clean ball-striking. However, he is more vulnerable against players who introduce variation — slice, height changes, defensive retrieval, or counterpunching — because those patterns disrupt his rhythm and reduce the effectiveness of his forehand volume.\n\nOverall, Rublev profiles as a high-floor, high-pressure top-20 player with occasional top-10 level spikes. His statistical consistency is one of his biggest strengths — he rarely dips below a positive dominance ratio — but the ceiling is somewhat capped by stylistic rigidity. When he is winning, it is because he is dictating relentlessly and shortening opponents’ time. When he is losing, it is usually because that rhythm is broken and he is forced into uncomfortable, extended or varied exchanges.",
weaknesses: "game is highly linear — struggles when opponents disrupt rhythm; limited tactical variety compared to top-tier elite players; tiebreak performance is only average (51% career, volatility remains); can be exposed by elite defenders who absorb pace and extend rallies; second-serve is solid but not a true weapon under pressure; recent losses show vulnerability to lower-ranked disruptors; mental and emotional volatility can affect match stability; Elo below peak ranking suggests slight decline from prime level",
},

"Cameron Norrie": {
eloRank: 24,
elo: 1865,
record2026: "9-6 (60%)",
record: "389-255 (60%) career",
style: "high-volume counterpuncher with lefty patterns and relentless depth, grinding baseline disruptor who wins through consistency and tempo control, physical endurance player who thrives in extended rallies, low-error, rhythm-breaking baseliner with heavy crosscourt patterns",
strengths: "extremely stable point-winning profile: 50.7% TPW, 1.04 DR last 52, high first-serve percentage (65.9%) creates consistent match control, solid second-serve performance: 53.4% won last 52, excellent rally tolerance and physical durability, strong clay return profile: 40.2% RPW, 28.2% break rate, very effective in long matches and best-of-five (11-4 last 52), left-handed patterns disrupt opponent rhythm consistently, rarely gives away free points; forces opponents to earn everything",
serveStats: "Hold 82.1%, Ace 5.8%",
returnStats: "RPW 36.6%, Break rate 20.7%",
overallStats: "DR 1.04, TPW 50.7%, Tiebreak 59%",
fullNote: "Norrie is one of the clearest examples on tour of a player who wins through consistency, physicality, and disruption rather than through raw weapons. His statistical profile is extremely stable but rarely dominant, which explains both his high floor and his limited ceiling.\n\nAt the core, his numbers consistently sit just above neutral. Over the last 52 weeks he is at 50.7% total points won with a 1.04 dominance ratio. That is the definition of a solid top-30 baseline: he wins slightly more points than he loses, but not by a large margin. In 2026, that has ticked up slightly to 51.0% TPW and 1.05 DR, showing he is still performing at essentially the same level.\n\nThe serve is functional rather than dangerous. He lands a high percentage of first serves (65.9%), wins a respectable 70.6% behind them, and backs it up with a strong 53.4% on second serve. This combination gives him a reliable hold rate of 82.1%, but because the ace rate is low (5.8%), he rarely gets cheap points. Instead, his serve is designed to start neutral rallies rather than end them.\n\nThe return game is solid but no longer elite. Earlier in his peak years (2021–2022), he was breaking at close to 27–29%, which drove his best results. Over the last 52 weeks that has dropped to 20.7%, and return points won to 36.6%. Those are still good numbers, but the decline matters — it reduces his ability to consistently pressure opponents and explains why his dominance ratio has slipped from peak levels (~1.10+) to the current ~1.04 range.\n\nFrom a stylistic standpoint, Norrie is all about discomfort. His left-handed patterns, especially the heavy crosscourt forehand into a right-hander’s backhand, combined with his flat, low backhand, create awkward rally dynamics. He does not overpower opponents; he outlasts them. He keeps the ball deep, changes direction selectively, and forces opponents to hit extra balls.\n\nThis makes him extremely effective against mid-tier players and those who rely on rhythm. He can drag them into long exchanges, expose impatience, and accumulate errors. That is why his overall record remains strong (41-26 last 52) despite relatively modest underlying dominance numbers.\n\nHowever, the limitations become clear against elite players. Against top 10 opponents over the last 52 weeks, he is just 3-6 with very poor underlying metrics: 46.4% TPW and 0.79 DR. That is a large gap. At that level, opponents can hit through him, defend his patterns, or generate more offense than he can handle. Because he lacks a true finishing weapon, he struggles to turn neutral positions into decisive advantages against top-tier competition.\n\nSurface-wise, clay is arguably his best fit. The slower conditions enhance his physicality and consistency, and his return numbers there (40.2% RPW, 28.2% break rate) are excellent. His clay DR of 1.06 over the last 52 is his best surface mark. Hard courts are solid but more margin-dependent, while grass is slightly less comfortable because the shorter points reduce his ability to grind opponents down.\n\nOne notable strength is his performance in longer matches. He is 11-4 in Grand Slams over the last 52 weeks, with a strong tiebreak record (71%). His physical conditioning and mental resilience allow him to maintain level deep into matches, which is a key part of his profile.\n\nMatch dynamics for Norrie are very consistent. When he wins, it is usually through accumulation: extending rallies, forcing errors, and maintaining a slightly positive point differential over time. When he loses, it is often because opponents either hit through him or prevent him from settling into rhythm.\n\nOverall, Norrie profiles as a high-floor, system-driven player whose game is extremely reliable but not explosive. His ranking and Elo being nearly identical (24 vs 24) reflects that accurately — there is no major inefficiency in how he is rated. He is exactly what the numbers say: a consistent, physically strong top-25 player who can beat almost anyone on the right day, but who lacks the raw weapons to consistently dominate elite opposition.",
hardCourtNote: "Hard courts are solid but often margin-based. He relies on consistency and physicality rather than serve or quick-strike dominance.",
weaknesses: "lack of easy power limits ability to finish points quickly; serve is solid but not a major weapon (5.8% ace rate); break rate has declined vs peak years (20.7% last 52 vs ~27% peak); struggles to create separation against top-tier players; vs top 10: very weak underlying numbers (46.4% TPW, 0.79 DR); can get overpowered by elite aggressors; tends to rely on opponent errors rather than imposing offense; ceiling is limited by lack of finishing weapons",
},

"Corentin Moutet": {
eloRank: 41,
elo: 1823,
record2026: "4-5 (44%)",
record: "334-244 (58%) career",
style: "creative left-handed disruptor with heavy variation and awkward patterns, counterpunching shotmaker who mixes spins, pace changes, and touch, unorthodox baseline artist who breaks rhythm constantly, crafty all-court problem solver with soft hands and improvisation",
strengths: "very tricky matchup profile because of lefty angles and constant variation, solid recent overall level: 50.7% TPW, 1.03 DR last 52, good returner with 38.8% RPW and 24.4% break rate last 52, grass performance has been especially strong: 9-4, 51.3% TPW, 1.08 DR, good in tight moments recently with a 58% tiebreak record last 52, can unsettle more powerful opponents by changing tempo and ball shape, improvisation, touch, and feel give him solutions in awkward rally patterns, capable of upset wins when matches become uncomfortable or chaotic",
serveStats: "Hold 78.5%, Ace 4.4%",
returnStats: "RPW 38.8%, Break rate 24.4%",
overallStats: "DR 1.03, TPW 50.7%, Tiebreak 58%",
fullNote: "Moutet is a very different kind of top-50 player. He is not built on power, serve dominance, or straightforward baseline control. Instead, he wins by making tennis awkward. His profile is built around variation, left-handed angles, touch, improvisation, and disruption. Against the wrong opponent, that becomes a nightmare.\n\nThe first big takeaway is that his overall statistical level is solid but not overwhelming. Over the last 52 weeks he sits at 50.7% total points won with a 1.03 dominance ratio. That is good enough to support a ranking around where he is now, but it is not the profile of a dominant player. It suggests a lot of close matches, momentum swings, and wins built on problem-solving rather than sustained control.\n\nHis serve is the clearest limitation. Even with some recent progress, his ace rate is only 4.4% over the last 52 weeks and 2.8% for his career. He lands 61.8% first serves, wins 68.4% behind them, and 52.2% on second serve. Those are workable numbers, but not strong enough to generate many easy holds against elite returners. His 78.5% hold rate last 52 is respectable, yet it leaves him more exposed than players with bigger serves.\n\nThat means the return game has to do a lot of work, and generally it does. Moutet wins 38.8% of return points and breaks 24.4% of the time over the last 52 weeks. Those are strong numbers and a major reason he stays competitive. He pressures second serves well, reads patterns intelligently, and uses his variety to pull return games away from standard rhythm.\n\nStylistically, Moutet is one of the most disruptive players on tour. He changes pace constantly, mixes spin and trajectory, uses short angles, and is comfortable making points weird. He can flatten balls out, float in softer shapes, redirect early, and use touch to expose poor movement. That makes him particularly dangerous against players who want repeatable baseline patterns or who dislike having to generate their own pace over and over.\n\nThe problem is that the underlying level still sits only modestly above neutral. His recent hard-court split is 20-18 with a 1.01 DR, and clay is basically the same at 1.01. So even though he can look brilliant for stretches, the week-to-week level is more fragile than the eye test sometimes suggests. He is less of a stable pressure machine and more of a matchup disruptor.\n\nGrass has actually been his best surface recently. The 9-4 record, 85.7% hold rate, 65.7% service points won, and 1.08 DR stand out. That makes sense: his feel, lefty serve patterns, disguise, and ability to take the ball early all play up there. He does not need huge power on grass if he is controlling direction and using touch effectively.\n\nAgainst elite opposition, the ceiling gets tested. He is 2-7 vs top 10 over the last 52 weeks with poor underlying numbers: 47.4% TPW and 0.87 DR. That tells the story pretty clearly. When top players absorb the variation, protect their service games, and force him to defend from compromised positions, he struggles to hold the middle of the court. Because he does not get many free serve points, the pressure is always on him to create.\n\nHis Slam numbers also lag behind his best-of-3 profile. Over the last 52 weeks he is just 4-4 in majors with a 49.8% TPW and 0.98 DR. In best-of-3 he is clearly better: 34-24, 50.8% TPW, 1.03 DR. That suggests his style is very effective over shorter formats, where he can spring tactical surprises and ride momentum, but it is harder to sustain over long five-set matches against disciplined opponents.\n\nThe biggest red flag in the data is the start of 2026. He is only 4-5 with 49.3% TPW and a 0.95 DR, both clearly below his last-52 baseline. That is not a disaster in a small sample, but it does suggest his recent ranking may slightly overstate his current form. His Elo rank at 41 versus ATP rank of 33 points in the same direction: the market-like rating sees him as a bit less strong than the ranking table does.\n\nOverall, Moutet is a classic discomfort player. He is dangerous because he makes standard tennis unavailable. His left-handedness, creativity, touch, and tactical chaos give him upset potential almost any week. But because the serve is limited and the underlying point dominance is modest, he remains vulnerable when opponents can stay calm, hit through the disruption, and keep the match on first principles.",
hardCourtNote: "Hard courts are playable for him, but the margin is thin. He can disrupt rhythm and steal matches, though the serve limits sustained control.",
weaknesses: "serve remains a real limitation for a top-tier ceiling; very low ace production even after improvement: 4.4% last 52, 2.8% career; hold rate is only decent rather than strong at 78.5% last 52; vs top 10 numbers are poor: 47.4% TPW, 0.87 DR; can get overpowered when opponents take time away early in rallies; 2026 form has dipped sharply: 49.3% TPW, 0.95 DR; Grand Slam profile is weaker than best-of-3 profile; margin for error is thin because he lacks consistent free points",
},

"Jannik Sinner": {
eloRank: 2,
elo: 2285,
record2026: "13-2 (87%)",
record: "401-121 (77%) career",
style: "elite first-strike baseliner with overwhelming pace off both wings, ultra-clean ball striker who takes time away relentlessly, high-tempo aggressor with exceptional depth and directional control, modern power counterpuncher who can defend, reset, and then instantly attack",
strengths: "one of the strongest statistical profiles in the sport: 56.2% TPW and 1.49 DR last 52, elite serve-plus-one growth has transformed him from dangerous to dominant, hold rate is massive at 91.8% over the last 52 weeks, return game is also top-tier: 42.2% RPW and 32.1% break rate, hard-court dominance is absurd: 45-5 with 56.5% TPW and 1.52 DR, wins big matches consistently, including 19-5 vs top 10 in the last 52, tiebreak performance is elite: 17-4 last 52, 81%, no obvious surface weakness anymore; hard, clay, and grass all grade as title-level",
serveStats: "Hold 91.8%, Ace 10.2%",
returnStats: "RPW 42.2%, Break rate 32.1%",
overallStats: "DR 1.49, TPW 56.2%, Tiebreak 81%",
fullNote: "Sinner’s profile is the profile of a true dominant No. 1/No. 2-level player, and the numbers show that clearly. Over the last 52 weeks he is 64-8, wins 56.2% of all points played, and carries a 1.49 dominance ratio. Those are not just excellent numbers, they are championship-caliber, historically elite-range numbers for a modern top player. He is no longer simply a brilliant ball striker with upside. He is already a fully formed tour anchor.\n\nThe first major takeaway is that his serve has become a genuine weapon. Earlier in his career, Sinner’s game was driven more by baseline superiority than by easy service control. That is no longer true. Over the last 52 weeks he has a 10.2% ace rate, lands 63.4% of first serves, wins 79.3% behind the first serve, and 58.4% behind the second. Most importantly, he holds 91.8% of the time. That is massive. Once a player with his returning and rally quality starts holding that often, the matchup pressure becomes overwhelming.\n\nThe second major takeaway is that the return game is just as dangerous. Sinner wins 42.2% of return points and breaks serve 32.1% of the time over the last 52 weeks. Those numbers are elite by any standard. So he is not winning with serve protection alone. He is winning from both ends. Opponents face huge pressure in their own service games, while getting almost no relief on his.\n\nStylistically, Sinner is an elite first-strike baseliner, but that undersells the completeness of the package now. He takes time away with world-class pace off both wings, especially the backhand, yet he is not just a hitter. His depth control, balance, and ability to redirect make him incredibly hard to pin down. He can absorb pace, counter with more pace, and turn neutral balls into immediate pressure. His ball speed is clean rather than reckless, and that is a huge part of why his baseline dominance is so repeatable.\n\nHis hard-court numbers are especially frightening. He is 45-5 on hard courts in the last 52 weeks with 56.5% TPW and a 1.52 DR. That is complete hard-court alpha territory. The serve gets maximum value there, his ball-striking penetrates through the court, and his return position and reaction speed let him control match tempo early. When he gets ahead in patterns, he makes top-10 players look ordinary.\n\nWhat is striking is that the dominance is no longer surface-dependent. On clay he is 11-2 with 55.9% TPW and 1.42 DR, and on grass he is 8-1 with 55.6% TPW and 1.48 DR. That means his game now travels everywhere. On clay, he has become more physically durable and more comfortable constructing points without losing aggression. On grass, the improved serve and flatter trajectory make him brutally efficient. There is no longer a clear safe surface to attack him on.\n\nThe top-10 split shows just how real this level is. He is 19-5 vs top-10 opponents in the last 52 weeks, with 54.1% TPW and a 1.32 DR. Those are elite numbers against elite opposition. This is not a player farming weaker fields and merely maintaining ranking position. He is beating the best players regularly and usually doing it on underlying numbers that still look dominant.\n\nHis tiebreak performance reinforces the same point. He is 17-4 in breakers over the last 52 weeks, a huge 81%. Some of that is variance, but most of it reflects how good his serve and first-strike ball quality have become in compressed situations. He is simply winning more short, high-leverage point clusters than almost everyone else.\n\nThe 2026 numbers are fractionally below the broader last-52 profile, but only fractionally. He is 13-2 with 55.6% TPW and 1.46 DR so far. In other words, even his slightly lesser version is still operating at an elite tour-leading standard. That matters because it suggests his current level is not just a hot streak. It looks stable.\n\nIf there is a limitation in the data, it is that the absolute top of the rivalry chain can still challenge him in specific contexts. Carlos Alcaraz has been the clearest example, particularly in major clay environments and some headline finals. But that is not a sign of weakness so much as proof that Sinner’s only real problems now come from players with generational ceilings of their own.\n\nOverall, Sinner’s profile is that of a complete modern dominant player. He serves huge, returns great, wins tiebreaks, beats top-10 players, and posts top-end numbers on every surface. His baseline game remains the foundation, but the serve and physical maturity have turned that foundation into a nearly complete championship machine. Right now, he is one of the hardest players in the world to pressure, one of the hardest to hit through, and one of the hardest to out-execute over two or five sets.",
hardCourtNote: "This is his best surface in both results and underlying numbers. The serve, return, and first-strike baseline package become especially suffocating on hard courts.",
weaknesses: "very few true weaknesses remain in the numbers; can still be slightly more vulnerable in extended physical clay battles against the very best attackers; break rate on grass is lower than on hard or clay, so margins can compress there; when opponents match his pace and force repeated close sets, outcomes become more variance-driven; Carlos Alcaraz has been the main stylistic and results-based counterweight in major clay and some big finals; 2026 return numbers are a touch lower than his last-52 peak, though still elite; because his baseline is so high, even small dips in aggression or first-serve precision matter more than for other players",
},

"Novak Djokovic": {
eloRank: 3,
elo: 2100,
record2026: "7-2 (78%)",
record: "1233-252 (83%) career",
style: "elite counterpunching baseliner with unmatched depth and control, return-driven pressure player with surgical precision, defensive-to-offensive converter with exceptional elasticity, high-IQ point manager who thrives in extended rallies and big moments",
strengths: "historically elite baseline profile: 54.5% career TPW, 1.30 DR, still extremely strong last-52 level: 53.9% TPW, 1.28 DR, serve remains efficient with 87.5% hold rate last 52, first serve performance is excellent: 76.1% won last 52, one of the best returners ever even with slight decline (39.5% RPW), elite problem-solving and adaptability in long matches, remains highly effective in best-of-5 formats (54.4% TPW, 1.30 DR), grass level is still extremely dangerous (1.42 DR last 52), can still beat top players through experience and match management",
serveStats: "Hold 87.5%, Ace 9.2%",
returnStats: "RPW 39.5%, Break rate 25.9%",
overallStats: "DR 1.28, TPW 53.9%, Tiebreak 50%",
fullNote: "Djokovic’s current profile is a fascinating blend of sustained elite performance and gradual statistical decline from his historical peak. At a macro level, he remains one of the best players in the world—his Elo rank (3) aligns perfectly with his ATP ranking, and his last-52 record of 34-8 with a 1.28 dominance ratio still places him firmly in the elite tier.\n\nHowever, the key shift is in how those numbers are constructed. At his peak, Djokovic’s dominance came heavily from overwhelming return pressure—regularly breaking at 30%+ rates and controlling baseline exchanges almost by default. Over the last 52 weeks, that break rate has dropped to 25.9%, and return points won sit at 39.5%. Those are still strong numbers, but no longer generational. This reduction in return dominance is the clearest statistical indicator of aging.\n\nThe serve, interestingly, has held up extremely well. A 66.0% first serve rate combined with 76.1% first-serve points won and a strong 55.1% on second serve produces an 87.5% hold rate. That means he is still very difficult to break, and in many matches he now relies more on serve stability than earlier in his career. In effect, his profile has shifted slightly from return-dominant to more balanced.\n\nThe biggest red flag comes in top-level matchups. Against top-10 opponents over the last 52 weeks, he is just 5-4 with a 48.5% TPW and 0.86 dominance ratio. That is a losing statistical profile. It suggests that while he can still win these matches through experience and clutch play, he is no longer controlling them from a point-by-point perspective. This aligns with recent losses to Alcaraz, Sinner, and other high-end aggressive players who can match or exceed his baseline tempo.\n\nSurface-wise, there is no true weakness, but grass stands out as particularly strong in the current phase of his career. His 1.42 DR on grass is elite, driven by improved serve efficiency and shorter point patterns that reduce physical load. Hard courts remain strong but slightly less dominant than earlier years, while clay is still solid but less overwhelming against elite attackers.\n\nThe 2026 sample reinforces the broader trend. While the record (7-2) is still strong, the underlying numbers—52.6% TPW and 1.18 DR—are clearly below his recent baseline. That suggests his current ranking may slightly overstate his week-to-week level, even if he remains extremely dangerous in big events.\n\nStructurally, Djokovic is transitioning from a player who wins by suffocating opponents statistically into one who wins by managing matches better than anyone else. He still defends at an elite level, still redirects pace with unmatched precision, and still thrives in extended rallies—but the margin is thinner. Matches are more competitive, and outcomes rely more on key moments rather than sustained control.\n\nOverall, Djokovic remains a top-tier contender, especially in majors where his best-of-five profile is still excellent. But the numbers now clearly show that against the very best players, he is no longer the default favorite. He is still elite—but no longer untouchable.",
hardCourtNote: "Hard courts are still very strong, but the return dominance has dipped slightly, making matches more competitive than in his peak years.",
weaknesses: "clear decline in return dominance vs peak years (break rate down to 25.9% last 52); vs top 10 profile is now negative: 48.5% TPW, 0.86 DR; tiebreak performance has regressed recently (50% last 52); 2026 underlying numbers show drop-off: 52.6% TPW, 1.18 DR; second serve is slightly more attackable than peak (55.1% last 52 vs higher historical peaks); cannot consistently overwhelm elite opponents physically anymore; more vulnerable to high-tempo power players who take time away early; reliance on extended rallies can be exposed by aggressive first-strike tennis",
},

"Taylor Fritz": {
eloRank: 9,
elo: 1983,
record2026: "10-7 (59%)",
record: "456-268 (63%) career",
style: "first-strike attacking baseliner built around serve-plus-one patterns, flat-ball aggressor who excels at taking time away on hard courts, big-serve forehand player with strong front-foot court positioning, rhythm-dependent offensive player who prefers shorter, controlled exchanges",
strengths: "elite serve foundation: 88.6% hold rate over the last 52 weeks, huge weaponized first serve with 15.9% ace rate last 52, excellent first-serve efficiency: 79.6% won last 52, hard-court game is proven at the highest level with repeated deep runs, tiebreak performance is a clear asset (62% last 52, 67% in 2026), forehand can dominate when he gets center-court control early, grass-court profile is especially dangerous because serve and low-contact hitting scale up well, has shown the ability to beat top opponents when dictating with serve and forehand",
serveStats: "Hold 88.6%, Ace 15.9%",
returnStats: "RPW 34.4%, Break rate 15.6%",
overallStats: "DR 1.15, TPW 51.9%, Tiebreak 62%",
fullNote: "Fritz’s current profile is that of a firmly established top-10 player whose ceiling is driven primarily by serve quality, first-strike forehand offense, and hard-court comfort. His Elo rank of 9 is almost perfectly aligned with his ATP ranking of 7, which suggests the market and results see him as a genuine upper-tier player, but not quite in the inner circle of the very best.\n\nThe core of his success is obvious in the serve numbers. Over the last 52 weeks, he has held 88.6% of the time, hit aces at 15.9%, won 79.6% of first-serve points, and still won a respectable 53.1% behind the second serve. That is elite serve performance. It allows him to keep scoreboard pressure on opponents constantly, makes him extremely dangerous in tiebreak-heavy matches, and creates a highly repeatable pathway to wins on quick hard courts and grass.\n\nWhat separates him from the absolute top tier is the return profile. His 34.4% return points won and 15.6% break rate over the last 52 weeks are good enough to support a top-10 ranking when paired with a huge serve, but they are not dominant numbers. They indicate that Fritz often wins by protecting his own service games and capitalizing efficiently on a limited number of return chances, rather than by imposing sustained pressure from both sides of the ball.\n\nThat construction makes him highly surface-sensitive in a positive way. On hard courts, the serve plus forehand combination plays at its cleanest, and he has repeatedly produced deep runs in big events there. Grass is arguably the most natural fit for his style because the serve becomes even more valuable and his flatter groundstrokes penetrate effectively. Clay has improved from earlier in his career, but it is still the surface where his movement, defensive elasticity, and point construction are least naturally advantaged.\n\nThe developmental arc from 2022 through 2025 shows a clear rise into a mature elite phase. In 2023, 2024, and 2025 he posted strong win totals with TPW around the low-52 to 53 range and DR generally between 1.18 and 1.21, which is exactly the kind of profile you would expect from a player hovering around the top 5 to top 10. The issue is that 2026 has slipped a bit: the record is only 10-7, second-serve points won have fallen under 50%, break rate is down to 12.1%, and TPW has dipped to 50.9%. Those are not collapse numbers, but they do suggest that his current ranking may be slightly stronger than his current week-to-week level.\n\nMatchup-wise, Fritz is strongest against players who allow him to establish clean serving patterns and forehand control. He can overpower many solid baseliners if they do not disrupt his rhythm early. Against elite returners, great movers, or ultra-aggressive players who attack his second serve and rush him out of comfortable patterns, his margin becomes much thinner. Because his return game is not overwhelming, small dips in serve quality have a disproportionate effect on his results.\n\nThe positive news is that his identity is stable and tournament-winning. Players with this level of serve and baseline power can remain elite for a long time if they maintain physical sharpness and keep the second serve from slipping. But the ceiling is still defined by whether he can add a little more return pressure and survive more neutral-to-defensive rally situations against the best opponents.\n\nOverall, Fritz is a legitimate top-10 caliber player with a very real threat profile on hard courts and grass, especially in fast conditions. He is not built like an all-surface, all-scenario dominator, but when the serve is landing and the forehand is dictating, he is absolutely capable of beating almost anyone.",
hardCourtNote: "Hard courts are the clearest expression of his game. The serve-plus-one pattern is elite here, and this remains his best surface overall.",
weaknesses: "return game remains the limiting factor: only 34.4% RPW last 52; break rate is modest for an elite player at 15.6% last 52; second serve has dipped in 2026 to 49.6%, a meaningful red flag; 2026 overall numbers are down from 2024-2025 peak levels; can look vulnerable when forced into extended defensive rallies; backhand can hold up, but it is less naturally damaging than the forehand in neutral exchanges; clay is still his least natural surface despite some improvement; when first-strike patterns are neutralized, he does not generate pressure as consistently as the very top tier",
},

"Jack Draper": {
eloRank: 12,
elo: 1956,
record2026: "5-2 (71%)",
record: "248-114 (69%) career",
style: "left-handed first-strike aggressor with heavy forehand and serve-led patterns, explosive baseline attacker who can shorten rallies from either wing, power player with improved all-court comfort and better point construction than earlier in career, high-upside shotmaker whose best level is top-10 caliber on multiple surfaces",
strengths: "elite upside off the serve + first forehand combination, lefty delivery creates natural matchup pressure, especially in ad court patterns, improving second-serve results (54.3% won last 52) make him less vulnerable in neutral starts, strong return numbers for an aggressive player (38.8% RPW last 52), excellent dominance ratio over last 52 (1.24) signals real top-tier level, dangerous on all three surfaces, especially improved on clay, tiebreak performance has been outstanding recently (7-1, 88%), can beat elite opposition when his first-strike game is landing",
serveStats: "Hold 86.6%, Ace 10.4%",
returnStats: "RPW 38.8%, Break rate 24.7%",
overallStats: "DR 1.24, TPW 52.9%, Tiebreak 88%",
fullNote: "Draper is one of the clearest examples of a player whose underlying level and upside have often looked even stronger than his week-to-week ranking. His Elo of 1956 and Elo rank of 12 are much more flattering than his current ATP rank of 26, and that gap makes sense: when healthy and in rhythm, he plays like a genuine top-10 threat.\n\nHis profile is built around left-handed offense. The serve is a major weapon, but what separates him from many big lefties is how naturally the serve feeds into his first forehand and front-foot baseline patterns. Over the last 52 weeks he has held 86.6% of the time, won 77.3% behind first serve, and even posted a strong 54.3% on second serve. That second-serve number is especially important because it means opponents are not consistently getting neutral starts even when he misses first serves.\n\nThe other major signal in Draper's numbers is that he is not just serve-reliant. His 38.8% return points won over the last 52 weeks is excellent for an aggressive player, and his 24.7% break rate confirms that he can pressure return games rather than merely survive them. Combined with a 52.9% total points won and a 1.24 dominance ratio, this is the profile of a player who is doing real damage across both phases of the game.\n\nStylistically, Draper plays proactive tennis. He wants to dictate with serve placement, lefty forehand patterns, and early backhand strikes. At his best he takes time away well enough to rush even elite defenders, and his shot weight is strong enough to finish rallies instead of just creating mild advantage. This is why his peak level has translated to big wins over players like Djokovic, Alcaraz, Fritz, Shelton, and others. He does not need opponents to play poorly for him to beat them.\n\nWhat is especially encouraging is the surface spread. Earlier in his development he looked most naturally dangerous on hard and grass, but the last 52-week clay numbers are outstanding: 12-4, 41.8% RPW, 53.8% TPW, and a 1.30 DR. That suggests his game is no longer surface-limited. The lefty forehand still does damage, but the improvement on clay hints at better patience, better rally management, and more complete point construction.\n\nThe caution flags are mostly about sustainability rather than quality. Physically, he has had enough interruptions that durability remains part of any honest projection. And while the last-52 profile is superb, his 2026 split is a little more ordinary: 5-2 record, 17.1% break rate, 34.2% RPW, 51.4% TPW, 1.12 DR. That does not mean he is playing badly, only that his current level is not quite matching his strongest 2025 surge.\n\nAgainst elite opponents, Draper is dangerous because his lefty patterns can break normal rhythm and force uncomfortable contact points. But when opponents absorb the serve and forehand well, he can become more volatile. The recent vs-top-10 sample shows this tension clearly: he can absolutely win those matches, but the underlying numbers in that split are less dominant because the margin for error narrows fast.\n\nOverall, Draper projects as a true top-tier talent whose ceiling is clearly top 10 and whose peak may be even higher than that in short windows. The keys are durability, maintaining return quality, and continuing to stabilize his aggressive baseline game so that the explosive version of Draper becomes his normal level rather than just his best stretch.",
hardCourtNote: "Hard court remains the cleanest expression of his serve + first-strike package and probably his best overall surface for top-end wins.",
weaknesses: "physical durability has been a recurring concern throughout career; level can dip when forced to defend repeatedly or extend uncomfortable rallies; 2026 return numbers have softened sharply (17.1% break, 34.2% RPW); vs top 10 sample last 52 shows his floor drops when serve/forehand edge is neutralized; can leak errors when pressing too hard from aggressive court positions; still not a pure week-to-week metronome compared with very top tier; results can swing heavily with health and rhythm; sometimes more scoreline-fragile than raw Elo suggests",
},

"Patrick Kypson": {
eloRank: 130,
elo: 1670,
record2026: "8-10 (44%)",
record: "213-142 (60%) career",
style: "solid all-court baseliner with balanced serve + rally profile, tempo-controlled player who relies on consistency over raw power, counterpunch-capable with moderate offensive upside, grinds through matches with structure rather than overwhelming weapons",
strengths: "well-rounded statistical profile with no major technical holes, respectable serve foundation: 85.6% hold rate last 52, good first-serve efficiency (75.0% won last 52), positive return baseline: 37.4% RPW last 52, break rate of 23.3% shows real ability to pressure serve at his level, strong Challenger-level results in 2025 (45-15, multiple titles), tiebreak improvement recently (63% last 52 vs 49% career), can compete effectively vs peers and lower-tier ATP players when in rhythm",
serveStats: "Hold 85.6%, Ace 10%",
returnStats: "RPW 37.4%, Break rate 23.3%",
overallStats: "DR 1.13, TPW 52.1%, Tiebreak 63%",
fullNote: "Kypson profiles as a classic high-end Challenger / fringe ATP player whose game is built on balance rather than standout weapons. His Elo of 1670 and rank around 100 are tightly aligned, which reinforces that his current level is accurately reflected by both rating systems and results.\n\nFrom a statistical standpoint, his profile is actually quite solid. Over the last 52 weeks he has won 52.1% of total points with a 1.13 dominance ratio, held serve 85.6% of the time, and broken at 23.3%. Those are strong numbers for a player outside the top 50 and clearly explain his excellent 50-22 record over that span. He wins matches by being slightly better than his opponents across both serve and return, rather than dominating in one phase.\n\nThe key to understanding Kypson is that his strengths are evenly distributed. His serve is good but not overwhelming, his return is active but not elite, and his rally tolerance is solid without being suffocating. This makes him very effective against similarly ranked players, particularly on hard courts where he has gone 43-20 over the last year. He is comfortable in structured baseline exchanges and can capitalize on errors while maintaining scoreboard pressure.\n\nHowever, the limitations become clear when projecting upward. His dominance ratio and total points won are not high enough to suggest a stable top-50 ceiling, and his Grand Slam sample (0-2, 44.4% TPW) shows how much more difficult it is for him to impose himself against higher-quality opponents. Without a major weapon, he relies on outplaying opponents incrementally, which becomes much harder against players who can dictate points.\n\nThe trajectory also matters. His 2025 season was a clear breakout at the Challenger level (45-15, DR 1.15), which drove his ranking into the top 100. But 2026 has seen a step back: 8-10 record, declining break rate, and overall TPW dropping to 50.8%. That suggests he is currently hovering right at the cutoff between maintaining ATP relevance and slipping back toward the Challenger tier.\n\nMatchup-wise, Kypson performs best against players who do not overwhelm him with serve or pace. Against similar baseliners, his balance and consistency allow him to edge matches. Against big servers or high-end aggressors, he often struggles to generate enough return pressure or offensive damage to swing matches consistently.\n\nSurface-wise, hard courts are clearly his foundation. Clay has produced some strong short-term results (7-1 last 52), but the sample is small. Grass remains a clear weakness both statistically and in results.\n\nOverall, Kypson is a well-constructed, efficient player whose game translates extremely well at the Challenger level and can be competitive at ATP 250s. To move beyond the top-100 range, he would likely need either a more dangerous serve or a more decisive baseline weapon to raise his point-ending ability.",
hardCourtNote: "Hard court is his primary surface, where his balanced serve + return profile translates best and most consistently.",
weaknesses: "lacks a true elite weapon (serve or groundstroke) to consistently finish points; ceiling limited by moderate dominance ratio (1.13 last 52); struggles translating Challenger success to ATP/Grand Slam level (0-2 Slams, very low TPW); 2026 regression across key metrics (TPW down to 50.8, DR 1.05); second serve is average and attackable (50.9% in 2026); difficulty sustaining pressure vs higher-ranked opponents; grass performance is extremely limited; can get overpowered by top-tier pace and first-strike players",
},

"Carlos Alcaraz": {
eloRank: 1,
elo: 2290,
record2026: "16-1 (94%)",
record: "370-85 (81%) career",
style: "elite all-surface attacking baseliner with complete court coverage, constant pressure player who blends explosive offense with world-class defense, dynamic point constructor who can win with pace, shape, touch, and transition play, tempo-breaking shotmaker capable of overwhelming opponents from neutral positions",
strengths: "best overall level in the sport by both rank and Elo, dominant last-52 profile: 72-6 with a 1.32 dominance ratio, elite return game: 41.7% RPW and 30.9% break rate last 52, serve has become a real weapon on top of his return dominance (88.7% hold last 52), wins in multiple ways: aggression, defense, counterpunching, and improvisation, exceptional against top opposition (19-3 vs Top 10 last 52), all-surface excellence with elite records on hard, clay, and grass, best-of-5 monster: 27-1 in Grand Slams over the last 52 weeks",
serveStats: "Hold 88.7%, Ace 7.2%",
returnStats: "RPW 41.7%, Break rate 30.9%",
overallStats: "DR 1.32, TPW 54.6%, Tiebreak 62%",
fullNote: "Alcaraz profiles as the clear gold-standard player in the current field: world No. 1, Elo No. 1, and the most complete blend of offense, defense, movement, and adaptability on tour. His Elo of 2290 is not just elite—it separates him meaningfully from the rest of the ATP field and reinforces that his dominance is backed by both results and underlying performance.\n\nStatistically, his recent profile is overwhelming. Over the last 52 weeks he has gone 72-6, won 54.6% of total points, posted a 1.32 dominance ratio, held serve 88.7% of the time, and broken serve at 30.9%. Those are title-favorite numbers on every surface. Unlike many elite players who lean heavily on either serve or return, Alcaraz dominates in both phases, which is why he is so difficult to destabilize.\n\nThe key to understanding Alcaraz is that he wins from every part of the court. He can dictate with pace off both wings, create angles that move opponents off the court, absorb and redirect pace in defense, and finish with drop shots, net play, or sudden acceleration. His athleticism allows him to turn neutral rallies into attacking positions faster than almost anyone else, and his shot tolerance means he can pressure opponents without needing to play low-margin tennis on every ball.\n\nWhat makes him especially dangerous is that his strengths scale everywhere. On hard courts, his improved serve and explosive first-strike game create a near-complete profile. On clay, his movement, spin tolerance, and return pressure make him suffocating. On grass, his hold rate and ability to improvise make him far more than just competent—he is now fully elite there as well. The last-52 splits confirm that this is not surface-specific dominance but universal dominance.\n\nHis return game is arguably the biggest separator. A 41.7% return points won rate at the top of the sport is extraordinary, especially when paired with an 88.7% hold rate. That combination means opponents are constantly under scoreboard stress. Even against top servers, he tends to find enough neutralizing returns to create extended pressure, and once the rally begins he often owns the most dangerous and versatile toolkit on court.\n\nAgainst top players, the profile remains elite rather than regressing. A 19-3 record versus Top 10 opponents over the last 52 weeks shows that this level is not being built only on weaker draws. He has already proven he can beat the very best in every major setting: Masters, Slams, grass, clay, and hard courts.\n\nThe only real limitations are relative. Because his baseline is so high, the discussion is more about maintaining efficiency than fixing flaws. At times he can over-force or play with too much creative risk, which can produce short patches of instability. But those are fluctuations inside a profile that is still comfortably the strongest on tour.\n\nOverall, Alcaraz is the most scalable matchup problem in men’s tennis. He can win ugly, dominate cleanly, survive long physical matches, or sprint through short ones. His current combination of results, athletic prime, tactical flexibility, and statistical superiority gives him the highest ceiling and the highest weekly floor in the sport.",
hardCourtNote: "Hard court is already an elite surface for him: huge hold/break combination, excellent first-strike tennis, and enough defensive range to outlast even top attackers.",
weaknesses: "because his baseline is so high, weaknesses are more relative than absolute; can occasionally overpress and donate errors when forcing too much offense; tiebreak record is strong but not as dominant as his overall match level; serve quality, while much improved, is still not the primary basis of his dominance; rare off days can come when first-strike execution dips on faster hard courts; high-variance creativity can sometimes create momentum swings in otherwise controlled matches; ultra-aggressive return positioning can be exposed briefly by elite serving bursts; physical intensity of his style can make match management important over dense schedules",
},

"Sebastian Korda": {
eloRank: 17,
elo: 1915,
record2026: "14-6 (70%)",
record: "256-172 (60%) career",
style: "clean ball-striking first-strike baseliner, serve-plus-forehand tempo player with flat penetration, rhythm-dependent shotmaker who prefers shorter patterns, low-margin aggressor who thrives on timing and court positioning",
strengths: "high-quality serve + first-ball combo (84.6% hold last 52), excellent first-serve effectiveness (75.8% won last 52), cleanest ball-strikers on tour when in rhythm, 2026 jump is significant: 53.1% TPW and 1.26 DR, hard-court profile is strong and scalable (52.2% TPW, 1.17 DR last 52), ability to take time away and flatten rallies early, dangerous against mid-tier opponents when dictating, can produce high-level runs when confidence and timing align",
serveStats: "Hold 84.6%, Ace 12.2%",
returnStats: "RPW 37.6%, Break rate 21.5%",
overallStats: "DR 1.15, TPW 52%, Tiebreak 55%",
fullNote: "Korda profiles as a high-end offensive baseliner whose level is driven heavily by timing, serve efficiency, and first-strike execution. The key signal in his profile is the gap between ranking (36) and Elo (17), which suggests he is currently undervalued by results relative to his underlying level.\n\nThe last-52-week numbers are strong: 52.0% total points won and a 1.15 dominance ratio, supported by an 84.6% hold rate and improved serve metrics across the board. The serve has clearly become a bigger weapon, with a 12.2% ace rate and strong first-serve win percentage, allowing him to control a large percentage of his service games. On hard courts, this translates especially well, where his flat ball striking and early contact create consistent pressure.\n\nThe biggest development is in 2026, where his numbers have jumped to 53.1% TPW and a 1.26 dominance ratio. That is a meaningful step into borderline elite territory and aligns with his strong start to the season (14-6, title in Delray Beach). When Korda is playing at this level, he can dictate rallies cleanly and beat strong top-30 opponents with relative authority.\n\nHowever, the limiting factor remains his return game and matchup scalability. A 21.5% break rate over the last 52 weeks is solid but not high-end, and it drops sharply against elite players (7.9% break vs Top 10). This creates a structural issue: against top opponents, he struggles to create enough return pressure to offset their hold rates. That is why his record vs Top 10 remains poor despite competitive underlying serve numbers.\n\nHis game is also highly rhythm-dependent. When his timing is clean, he looks like a top-15 caliber shotmaker, taking the ball early and flattening out both wings. But when opponents disrupt his rhythm—through variety, defense, or physical rallies—his level can drop quickly, and matches can flip despite otherwise solid baseline stats.\n\nSurface-wise, hard court is clearly his best environment, where the serve and flat hitting maximize his strengths. Clay is more neutral to slightly negative, as longer rallies and heavier spin reduce his ability to dictate consistently. Grass should theoretically suit him, but there is limited recent data to confirm current level there.\n\nOverall, Korda is a high-upside, offense-driven player whose Elo suggests he is closer to the top 20 than his ranking indicates. The next step in his development is not about adding power—it is about improving return pressure and increasing resilience when he is not dictating. If he can lift his break rate even marginally, his profile becomes much more stable at the top tier.",
hardCourtNote: "Hard courts maximize his strengths: serve efficiency, early ball striking, and ability to control rallies off the first forehand.",
weaknesses: "return game is clearly below top-tier level (21.5% break last 52); struggles to generate consistent pressure vs strong servers; very poor vs elite opposition (0-4 vs Top 10 last 52); match control can collapse if timing drops; relies heavily on rhythm—less effective in disrupted or physical matches; limited defensive ceiling compared to elite players; clay results are average and less natural fit; career baseline metrics (1.07 DR) show historically thin margins",
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
bettingAngle: "Fade in almost all circumstances. DR of 0.57 is one of the worst on the WTA tour." },

},

"Elina Avanesyan": {
eloRank: 43,
elo: 0,
record: "24-22",
style: "Aggressive baseline player with moderate serve and strong break point conversion.",
strengths: "Break point conversion at 46.2% significantly above tour average; clay court specialist with 61% win rate (11-7); tiebreak proficiency at 66.7%.",
serveStats: "Hold 53.3%, Ace 0.8%, DF 3.4%, 1stIn 70.8%, 1stWon 57.9%",
returnStats: "Break 46.2%, TB 66.7%, DR 1.04",
overallStats: "Hard 12-12 · Clay 11-7 · Grass 1-3",
fullNote: "Avanesyan exploits break opportunities (46.2%) making her valuable in extended matches against weaker servers. Tiebreak angle (66.7%) attractive in tight sets.",
rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Clay-leaning grinder with strong break rate (46.2%) and tiebreak rate (66.7%). Serve is almost non-existent (0.8% ace rate).", bettingAngle: "Back on clay at generous odds. Fade on hard courts where her serve is fully exposed." },
},


"Erika Andreeva": {
eloRank: 83,
elo: 0,
record: "9-16",
style: "Aggressive baseline player who relies on break point conversion and consistent first-serve placement.",
strengths: "Strong break point conversion at 43.4% and solid first-serve win rate of 65.4%; reliable hold percentage of 52.2%.",
serveStats: "Hold 52.2%, Ace 4.4%, DF 4%, 1stIn 61.2%, 1stWon 65.4%",
returnStats: "Break 43.4%, TB 42.9%, DR 0.72",
overallStats: "Hard 7-12 · Clay 1-3 · Grass 1-1",
fullNote: "Andreeva is a break-point dependent player with high volatility. Fade her in tiebreak-heavy matchups given 42.9% TB% and monitor first-serve percentage dips below 60%.",
rallyProfile: { short: { pct: 28, winPct: 49 }, medium: { pct: 36, winPct: 51 }, long: { pct: 36, winPct: 52 }, profile: "Aggressive baseliner in poor overall form. DR 0.72 means she loses more points than she wins.", bettingAngle: "Fade in almost all circumstances. DR 0.72 is alarming." },
},


"Alycia Parks": {
eloRank: 82,
elo: 0,
record: "4-10",
style: "Aggressive baseline player relying on power and depth rather than precision or serve dominance.",
strengths: "Solid first-serve win rate (66.3%) and break point conversion (33.3%) when opportunities arise.",
serveStats: "Hold 47%, Ace 7.1%, DF 12.6%, 1stIn 52.3%, 1stWon 66.3%",
returnStats: "Break 33.3%, TB 0%, DR 0.57",
overallStats: "Hard 4-8 · Clay 0-0 · Grass 0-2",
fullNote: "Parks' 47% hold percentage is critically low and projects significant break probability against comparable opponents. Her 0.57 defensive rating suggests vulnerability to aggressive returners.",
rallyProfile: { short: { pct: 31, winPct: 49 }, medium: { pct: 35, winPct: 50 }, long: { pct: 34, winPct: 50 }, profile: "Power player in severe form decline. DR 0.57 means she's losing more points than she wins.", bettingAngle: "Fade in almost all circumstances. 12.6% DF rate is catastrophic. DF props automatic." },
},


"Sonay Kartal": {
eloRank: 84,
elo: 0,
record: "7-1",
style: "Aggressive baseline player with high break conversion and tiebreak proficiency.",
strengths: "Exceptional break conversion at 46.3%; perfect 100% tiebreak record; strong hard court performance at 5-0.",
serveStats: "Hold 55.6%, Ace 1.7%, DF 2.7%, 1stIn 67.4%, 1stWon 66.5%",
returnStats: "Break 46.3%, TB 100%, DR 1.75",
overallStats: "Hard 5-0 · Clay 0-0 · Grass 2-1",
fullNote: "Sharp angle targets Kartal's 46.3% break conversion as primary weapon. Tiebreak prop at 100% wins shows elite clutch performance. Fade clay court exposure given 0-0 record.",
rallyProfile: { short: { pct: 31, winPct: 53 }, medium: { pct: 37, winPct: 55 }, long: { pct: 32, winPct: 54 }, profile: "Emerging player with elite DR (1.75) in small sample. 46.3% break rate and 100% tiebreak rate impressive.", bettingAngle: "Back on hard courts while the form holds. Sample is small but numbers are exceptional." },
},


"Jaqueline Cristian": {
eloRank: 85,
elo: 0,
record: "20-23",
style: "Baseline grinder with modest serve who relies on return aggression and consistency.",
strengths: "Strong break point conversion (43.4%) and clay court performance (11-7); solid first serve win rate (65.1%).",
serveStats: "Hold 56.5%, Ace 4%, DF 4.8%, 1stIn 58.7%, 1stWon 65.1%",
returnStats: "Break 43.4%, TB 14.3%, DR 0.93",
overallStats: "Hard 8-13 · Clay 11-7 · Grass 0-2",
fullNote: "Cristian's value lies in clay tournaments where she's 61% (11-7), but bettors should exploit her 58.7% first serve rate on hard courts.",
rallyProfile: { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Clay-leaning grinder. Tiebreak rate (14.3%) is extremely low.", bettingAngle: "Back on clay only. Fade on hard courts and grass. Tiebreak fade is automatic." },
},

},

});

}
