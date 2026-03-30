export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

// --- NFL QB Database (inline for Vercel serverless) --------------------------
const NFL_QBS = {
  "Josh Allen":      { team:"BUF", tier:"ELITE", passing:{ gs:17, rec:"12-5", cmp:69.3, yds:3668, td:25, int:10, ypa:8.0, rate:102.2, qbr:65.4, skPct:8.0 }, advanced:{ ontgt:79.9, badTh:13.0, prss:18.0, pktTime:2.5, iay_pa:7.3, pa_yds:954, hrry:30, hits:29, scrm:49, yds_scr:8.8 }, trend:{ ontgt_delta:+5.1, prss_delta:+1.6, note:"On-target JUMPED 5.1pts year-over-year -- accuracy genuinely elite now" }, rushing:{ attPg:6.6, ydsPg:34.1, tdPg:0.82, ypc:5.2, fmbPg:0.41, tier:"ELITE RUSHER" }, props:{ passYds:{ floor:215, ceil:310, lean:"OVER in shootouts, volatile 215-310 range" }, passTd:{ pg:1.47, lean:"OVER 1.5 in home shootouts" }, rushYds:{ floor:25, ceil:65, lean:"OVER most weeks, cold weather pushes higher" }, ints:{ pg:0.59, lean:"OVER 0.5 vs zone-heavy defenses" }, best:"Rushing yards OVER -- most reliable Allen prop" }, futures:{ wins:"12-13", div:"AFC East favorite", playoff:"95%+", mvp:"Top-5" }, fantasy:{ ppr:"QB1-2", floor:"Never a zero -- rushing guarantees 25+ yards", startSit:"NEVER sit" }, matchup:{ vsBlitz:"FEASTS -- 8.8 yds/scramble punishes every blitz", vsZone:"Good -- attacks all levels", vsEliteD:"Holds up -- floor never disappears", weather:"Cold is NOT negative -- floor rises", dome:"Ceiling higher" }, situation:"DJ Moore added. Best cast of Allen's career. Legit Super Bowl contender.", note:"79.9% on-target (top-3 in league) plus elite rushing floor = safest QB1 in football. Rushing OVER is the lock prop every week." },
  "Malik Willis":    { team:"MIA", tier:"BELOW_AVG", passing:{ gs:1, note:"1 start only -- Tua was QB1" }, advanced:{ note:"4-game sample -- meaningless at starter volume" }, rushing:{ attPg:5.5, ydsPg:30.8, tdPg:0.50, ypc:5.6, fmbPg:0.50, tier:"ELITE RUSHER (tiny sample)" }, props:{ best:"Dolphins team total UNDER every week" }, futures:{ wins:"6-8", div:"Long shot AFC East", playoff:"15-20%" }, fantasy:{ ppr:"QB24-32", startSit:"Never" }, matchup:{ vsBlitz:"Unknown at starter volume", vsEliteD:"No data" }, situation:"Tua released. Willis inherits job without ever starting a full NFL season. Hill and Waddle wasted.", note:"Most volatile QB situation in league. Fade Dolphins team totals. Hill and Waddle prop OVER is the only Miami offensive play worth making." },
  "Drake Maye":      { team:"NE", tier:"ELITE", passing:{ gs:17, rec:"14-3", cmp:72.0, yds:4394, td:31, int:8, ypa:8.9, rate:113.5, qbr:77.1, skPct:8.72 }, advanced:{ ontgt:79.0, badTh:13.8, prss:21.8, pktTime:2.4, iay_pa:9.1, pa_yds:1049, hrry:42, hits:42, scrm:62, yds_scr:6.9 }, trend:{ ontgt_delta:+2.8, prss_delta:+1.9, note:"On-target improved 2.8pts as a rookie. 9.1 IAY/PA is elite deep-ball aggression." }, rushing:{ attPg:6.1, ydsPg:26.5, tdPg:0.24, ypc:4.4, fmbPg:0.47, tier:"STRONG RUSHER" }, props:{ passYds:{ floor:230, ceil:320, lean:"OVER -- 8.9 Y/A with elite on-target" }, passTd:{ pg:1.82, lean:"OVER 1.5 reliably" }, rushYds:{ floor:15, ceil:45, lean:"OVER -- market underprices his legs" }, best:"Rushing yards OVER -- massively undervalued, market sees him as pocket-only" }, futures:{ wins:"10-12", div:"Challenging AFC East", playoff:"65-75%", mvp:"Dark horse if sack rate fixes" }, fantasy:{ ppr:"QB3-5", startSit:"Start every week healthy. Year 2 breakout expected." }, matchup:{ vsBlitz:"Handles well -- 62 scrambles shows he escapes", vsZone:"Elite -- 9.1 IAY/PA attacks every level", vsEliteD:"Still dangerous -- QBR 77.1 too high to be scheme-dependent", weather:"New England December will test him", dome:"Ceiling rises" }, situation:"Year 2. Patriots addressing line. Best cast of his career.", note:"QBR 77.1 as a rookie is historically rare. 9.1 IAY/PA attacks downfield every play. Rushing (26.5 yds/g) adds floor the market ignores. Buy everywhere at depressed ADP." },
  "Geno Smith":      { team:"NYJ", tier:"BELOW_AVG", passing:{ gs:15, rec:"2-13", cmp:67.4, yds:3025, td:19, int:17, ypa:6.8, rate:84.7, qbr:34.1, skPct:10.93 }, advanced:{ ontgt:77.0, badTh:11.4, prss:22.8, pktTime:2.5, iay_pa:6.1, pa_yds:719 }, trend:{ ontgt_delta:-4.8, note:"On-target DROPPED 4.8pts year-over-year -- declining accuracy" }, rushing:{ attPg:2.7, ydsPg:7.3, tier:"OCCASIONAL" }, props:{ passYds:{ lean:"UNDER -- 6.1 IAY/PA, checkdown only" }, best:"Smith INT OVER 0.5 every week -- 1.13 INTs/g is most reliable fade in AFC" }, futures:{ wins:"5-7", div:"No chance", playoff:"10%" }, fantasy:{ ppr:"QB28-32", startSit:"Never. Wilson props only." }, matchup:{ vsBlitz:"Collapses -- 10.93% sack rate is proof", vsEliteD:"Gets exposed badly -- QBR 34.1" }, situation:"Signed from LV. 17 INTs, 10.93% sack rate, 2-13 record follows him to NYJ.", note:"6.1 IAY/PA = no downfield game. 10.93% sack rate = worst in league. INT OVER 0.5 is the most reliable single-game fade. Fade Jets team totals every week." },
  "Lamar Jackson":   { team:"BAL", tier:"ELITE", passing:{ gs:13, rec:"6-7", cmp:63.6, yds:2549, td:21, int:7, ypa:8.4, rate:103.8, qbr:62.7, skPct:10.65 }, advanced:{ ontgt:72.4, badTh:18.3, prss:23.6, pktTime:2.5, iay_pa:8.8, pa_yds:825, hrry:28, hits:23, scrm:30, yds_scr:7.3 }, trend:{ ontgt_delta:-6.3, prss_delta:+3.9, note:"ON-TARGET DROPPED 6.3pts -- BIGGEST REGRESSION IN LEAGUE. Most alarming hidden AFC development." }, rushing:{ attPg:5.2, ydsPg:26.8, tdPg:0.15, ypc:5.2, fmbPg:0.54, tier:"STRONG RUSHER" }, props:{ rushYds:{ floor:30, ceil:75, lean:"OVER every week" }, passYds:{ lean:"UNDER in run-heavy scripts -- Ravens prioritize ground game" }, best:"Rushing yards OVER + TD scorer OVER" }, futures:{ wins:"11-13 healthy", div:"AFC North favorite", playoff:"85%+", mvp:"Top-3 if fully healthy" }, fantasy:{ ppr:"QB1-3", startSit:"Start every healthy week. Must carry handcuff QB." }, matchup:{ vsBlitz:"ELITE -- best blitz beater in NFL, 7.3 yds/scramble", vsEliteD:"Most dangerous player on field regardless", weather:"Neutral -- runs in all conditions" }, situation:"Henry retained. Hendrickson added. Ravens are Super Bowl caliber when Lamar healthy.", note:"72.4% on-target DROPPED 6.3pts is the hidden concern. Bad throw rate 18.3% is elevated for elite tier. Rushing floor covers it. Sack rate (10.65%) is the real risk -- holds ball hunting explosive plays." },
  "Joe Burrow":      { team:"CIN", tier:"ELITE", passing:{ gs:8, rec:"5-3", cmp:66.8, yds:1809, td:17, int:5, ypa:7.0, rate:100.7, qbr:63.0, note:"8 games only" }, advanced:{ ontgt:75.0, badTh:11.3, prss:21.7, pktTime:2.3, iay_pa:7.2, pa_yds:190, note:"8-game sample -- prior season 80.3% on-target is true baseline" }, rushing:{ attPg:1.75, ydsPg:5.1, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.13, lean:"OVER 1.5 -- most reliable TD rate in AFC when healthy" }, passYds:{ lean:"OVER when Chase confirmed active" }, best:"TD OVER 1.5 when healthy -- 2.13/g is elite" }, futures:{ wins:"11-13 healthy", div:"AFC North contender", playoff:"80%+", mvp:"Top-3 if full season" }, fantasy:{ ppr:"QB4-7", startSit:"Start every healthy week. Handcuff essential." }, matchup:{ vsBlitz:"ELITE -- Chase draws double teams leaving hot routes open", vsEliteD:"Still dangerous -- Chase is too good" }, situation:"Chase on massive extension. Higgins back. Brown Jr. signed at LT. Full healthy year = MVP.", note:"Prior season 80.3% on-target is the real Burrow. 11.3% bad throw rate is cleanest in league. Injury history is the only risk. Bet TDs aggressively when healthy. Fade everything when he's questionable." },
  "Shedeur Sanders": { team:"CLE", tier:"BELOW_AVG", passing:{ gs:7, rec:"3-4", cmp:56.6, yds:1400, td:7, int:10, ypa:6.6, rate:68.1, qbr:18.9 }, advanced:{ ontgt:69.6, badTh:18.0, prss:40.3, pktTime:2.6, iay_pa:7.2, pa_yds:284, scrm:18, yds_scr:9.3 }, rushing:{ attPg:2.6, ydsPg:21.1, ypc:8.0, fmbPg:0.25, tier:"STRONG RUSHER" }, props:{ best:"Browns team total UNDER. Sacks taken OVER every week." }, futures:{ wins:"4-7", div:"Bottom AFC North", playoff:"5-10%" }, fantasy:{ ppr:"Do not draft", startSit:"Never in 2025 redraft." }, matchup:{ vsBlitz:"Overwhelmed -- 40.3% pressure rate", vsEliteD:"Gets exposed badly" }, situation:"True evaluation year with better line and cast. 2025 numbers are almost context-free.", note:"40.3% PRESSURE RATE -- worst in NFL history. League average is 21.9%. Stats are meaningless without context. 9.3 yds/scramble shows real mobility. 2026 is the true eval year." },
  "Mason Rudolph":   { team:"PIT", tier:"BELOW_AVG", passing:{ gs:1, note:"1 start -- Rodgers was QB1" }, advanced:{ ontgt:79.6, prss:10.9, note:"52 attempts -- not meaningful" }, rushing:{ tier:"POCKET ONLY" }, props:{ best:"Steelers team total UNDER every week. Pickens receiving yards OVER." }, futures:{ wins:"6-8", div:"Bottom half AFC North", playoff:"15-20%" }, fantasy:{ ppr:"Do not start", startSit:"Never. Pickens props are more reliable." }, situation:"Rodgers gone. Rudolph inherits by default. Pickens is only weapon.", note:"Fade Steelers offense entirely. Back their defense separately. Pickens individual props are the only Pittsburgh offensive play worth considering." },
  "C.J. Stroud":     { team:"HOU", tier:"STARTER", passing:{ gs:14, rec:"9-5", cmp:64.5, yds:3041, td:19, int:8, ypa:7.2, rate:92.9, qbr:61.7, skPct:5.16 }, advanced:{ ontgt:74.6, badTh:17.6, prss:21.4, pktTime:2.4, iay_pa:7.9, pa_yds:738, scrm:25, yds_scr:7.8 }, trend:{ ontgt_delta:+1.3, prss_delta:-6.6, note:"PRESSURE RATE DROPPED 6.6pts -- biggest protection improvement in league." }, rushing:{ attPg:3.4, ydsPg:14.9, tier:"USEFUL RUSHER" }, props:{ passYds:{ lean:"OVER when Collins confirmed active" }, passTd:{ pg:1.36, lean:"OVER 1.5 when both WRs healthy" }, best:"Collins receiving props OVER -- primary connection" }, futures:{ wins:"10-12", div:"AFC South favorite", playoff:"75-85%", mvp:"Top-8 if full year" }, fantasy:{ ppr:"QB8-12", startSit:"Start when Collins active. Sit when Collins/Dell questionable." }, matchup:{ vsBlitz:"Good -- pre-snap reads, ball out quickly", vsEliteD:"Modest scheme dependence" }, situation:"Year 3. Pressure rate improved dramatically. Collins and Dell when healthy are elite.", note:"Pressure rate dropping 6.6pts year-over-year is the key development. Year 3 with healthy weapons and better protection projects as top-8 QB." },
  "Daniel Jones":    { team:"IND", tier:"BELOW_AVG", passing:{ gs:13, rec:"8-5", cmp:68.0, yds:3101, td:19, int:8, ypa:8.1, rate:100.2, qbr:63.0 }, advanced:{ ontgt:78.0, badTh:12.1, prss:20.3, pktTime:2.3, iay_pa:8.0, pa_yds:872, scrm:23, yds_scr:6.6 }, rushing:{ attPg:3.5, ydsPg:12.6, tdPg:0.38, fmbPg:0.69, tier:"USEFUL RUSHER", note:"0.69 fmb/g -- HIGHEST among all starters" }, props:{ best:"Jones fumble prop OVER if available. Warren receiving props OVER." }, futures:{ wins:"7-9", div:"AFC South competitive", playoff:"30-40%" }, fantasy:{ ppr:"QB18-22", startSit:"Spot start only. Monitor AR health." }, matchup:{ vsBlitz:"Adequate", vsEliteD:"Limited sample -- likely inflated by weak schedule" }, situation:"Listed QB1 over Richardson due to AR injury history. Tyler Warren TE is emerging weapon.", note:"78.0% on-target and 12.1% bad throw rate are good metrics. 0.69 fumbles/g is alarming -- highest among all starters. Situation is fluid -- AR health changes everything." },
  "Trevor Lawrence": { team:"JAX", tier:"STARTER", passing:{ gs:17, rec:"13-4", cmp:60.9, yds:4007, td:29, int:12, ypa:7.2, rate:91.0, qbr:58.3 }, advanced:{ ontgt:73.7, badTh:14.4, prss:21.8, pktTime:2.4, iay_pa:8.7, pa_yds:951, scrm:42, yds_scr:7.4 }, trend:{ ontgt_delta:0, prss_delta:+6.6, note:"On-target FLAT two straight seasons -- confirmed ceiling. Pressure rate jumped 6.6pts -- line protection worsened significantly." }, rushing:{ attPg:4.8, ydsPg:21.1, tdPg:0.53, fmbPg:0.29, tier:"STRONG RUSHER", note:"0.53 rushing TDs/g -- underrated scorer" }, props:{ best:"Total TDs OVER -- rushing TDs (0.53/g) + passing TDs. Best combined TD rate in AFC South." }, futures:{ wins:"10-12", div:"AFC South contender", playoff:"55-65%" }, fantasy:{ ppr:"QB10-14", startSit:"Start in favorable matchups. Sit vs elite secondaries." }, matchup:{ vsBlitz:"Mixed -- scrambles but INT rate rises", vsZone:"Struggles -- 73.7% on-target vs tight windows", dome:"Best environment" }, situation:"Year 5 -- defining season. Pressure rate jumped significantly year-over-year.", note:"73.7% on-target flat for two straight seasons is a confirmed pattern. Pressure rate jumped 6.6pts. Total TD prop (rushing + passing combined) is the most underrated bet on his slate." },
  "Cam Ward":        { team:"TEN", tier:"BELOW_AVG", passing:{ gs:17, rec:"3-14", cmp:59.8, yds:3169, td:15, int:7, ypa:5.9, rate:80.2, qbr:33.2, skPct:9.24 }, advanced:{ ontgt:72.6, badTh:19.0, prss:27.8, pktTime:2.4, iay_pa:7.2, pa_yds:519, hrry:67 }, rushing:{ attPg:2.3, ydsPg:9.4, fmbPg:0.65, tier:"OCCASIONAL", note:"0.65 fmb/g on limited carries" }, props:{ best:"Titans team total UNDER. Sacks taken OVER." }, futures:{ wins:"5-8", div:"Bottom AFC South", playoff:"10-15%" }, fantasy:{ ppr:"QB28-32", startSit:"Never in redraft. Dynasty dart only." }, situation:"Year 2. Tennessee adding weapons. 3-14 record with historically bad cast.", note:"27.8% pressure rate and 9.24% sack rate on a bad line. 19.0% bad throw rate. Arm talent is real but weapons and line must improve before investing anything. 2026 is still a development year." },
  "Bo Nix":          { team:"DEN", tier:"STARTER", passing:{ gs:17, rec:"14-3", cmp:63.4, yds:3931, td:25, int:11, ypa:6.4, rate:87.8, qbr:58.3, skPct:3.47 }, advanced:{ ontgt:77.4, badTh:15.9, prss:19.1, pktTime:2.4, iay_pa:7.3, pa_yds:761, rpo_yds:497, scrm:35, yds_scr:8.8 }, trend:{ ontgt_delta:+0.8, prss_delta:+3.2, note:"Pressure rate rose 3.2pts -- line declined slightly." }, rushing:{ attPg:4.9, ydsPg:20.9, tdPg:0.29, fmbPg:0.24, tier:"STRONG RUSHER" }, props:{ passYds:{ lean:"UNDER in shootouts -- 6.4 Y/A ceiling" }, best:"Broncos team total UNDER vs elite offenses. Nix rushing OVER -- 8.8 yds/scramble." }, futures:{ wins:"10-12", div:"AFC West competitive", playoff:"55-65%" }, fantasy:{ ppr:"QB18-24", startSit:"Spot start vs weak secondaries only." }, matchup:{ vsBlitz:"Excellent -- 3.47% sack rate (lowest in league), ball out instantly", vsEliteD:"Exposed -- 6.4 Y/A falls further" }, situation:"Payton system intact. Defense top-10. Game manager by design.", note:"RPO (497 yards) is where Denver actually generates offense -- not the passing game. 6.4 Y/A ceiling is scheme by design. Bet Broncos in defensive scripts, fade them in shootouts." },
  "Patrick Mahomes": { team:"KC", tier:"ELITE", passing:{ gs:14, rec:"6-8", cmp:62.7, yds:3587, td:22, int:11, ypa:7.1, rate:89.6, qbr:68.5 }, advanced:{ ontgt:74.3, badTh:17.9, prss:24.0, pktTime:2.2, iay_pa:7.9, pa_yds:797, scrm:52, yds_scr:8.1, hits:69 }, trend:{ ontgt_delta:-2.6, note:"Accuracy dropped 2.6pts -- weapons-driven regression. Expect return to 76-77% with better receivers." }, rushing:{ attPg:4.6, ydsPg:30.1, tdPg:0.36, ypc:6.6, fmbPg:0.21, tier:"ELITE RUSHER", note:"6.6 Y/att -- best rushing efficiency among all QBs. Most underrated prop angle in football." }, props:{ rushYds:{ floor:18, ceil:45, lean:"OVER -- 30.1 yds/g at 6.6 Y/att is chronically ignored" }, best:"Rushing yards OVER. Chiefs ML in any playoff spot -- ALWAYS." }, futures:{ wins:"11-13", div:"AFC West favorite", playoff:"85%+", mvp:"Top-3" }, fantasy:{ ppr:"QB4-7", startSit:"Start every week. 2025 was weapons problem not Mahomes problem." }, matchup:{ vsBlitz:"ELITE -- best off-platform thrower ever, 8.1 yds/scramble", vsEliteD:"Proven in multiple Super Bowls" }, situation:"Better receiver room expected. Bounce-back season. Never bet against in January.", note:"2.2 pocket time -- quickest release among elite QBs. 30.1 rushing yds/g at 6.6 Y/att is the most undervalued prop in football. Chiefs ML in playoff rounds is categorical, not analytical." },
  "Aidan O'Connell": { team:"LV", tier:"BELOW_AVG", passing:{ note:"Full rebuild. Only QB on roster." }, props:{ best:"Raiders team total UNDER every week." }, futures:{ wins:"3-6", playoff:"2-5%" }, note:"Fade everything Raiders offense." },
  "Justin Herbert":  { team:"LAC", tier:"STARTER", passing:{ gs:16, rec:"11-5", cmp:66.4, yds:3727, td:26, int:13, ypa:7.3, rate:94.1, qbr:60.6, skPct:9.54 }, advanced:{ ontgt:76.4, badTh:15.2, prss:29.8, pktTime:2.4, iay_pa:7.8, pa_yds:904, hrry:55, hits:74, scrm:48, yds_scr:9.0 }, trend:{ ontgt_delta:-3.3, prss_delta:+8.4, note:"ON-TARGET DROPPED 3.3pts. Pressure rate JUMPED 8.4pts -- line was DESTROYED year-over-year. This explains stat regression entirely." }, rushing:{ attPg:5.2, ydsPg:31.1, tdPg:0.13, ypc:6.0, fmbPg:0.44, tier:"ELITE RUSHER", note:"31 yds/g at 6.0 Y/att -- massively undervalued, market prices him as pocket-only" }, props:{ rushYds:{ lean:"OVER -- 31.1 yds/g is elite rushing, ignored by market" }, best:"Rushing yards OVER. Best undervalued prop on his slate every week." }, futures:{ wins:"10-12", div:"AFC West contender", playoff:"60-70%", mvp:"Top-8 if Harbaugh fixes line" }, fantasy:{ ppr:"QB9-13", startSit:"Start in dome/favorable matchups. Monitor line health weekly." }, matchup:{ vsBlitz:"STRUGGLES -- 29.8% pressure rate. Blitz him early and often.", vsEliteD:"Significant dip -- pressure rate spikes vs elite DL", dome:"Best Herbert environment -- pressure reduced, deep game opens" }, situation:"Harbaugh year 2. Line being upgraded to fix catastrophic pressure rate.", note:"Prior year on-target was 79.7% -- the line collapse (21.4% to 29.8% pressure rate) drove the regression, not Herbert. If Harbaugh fixes protection, top-5 QB talent is there. Rushing OVER is the best undervalued prop in the AFC." },
  "Dak Prescott":    { team:"DAL", tier:"ELITE", passing:{ gs:17, rec:"7-9-1", cmp:67.3, yds:4552, td:30, int:10, ypa:7.6, rate:99.5, qbr:70.2, skPct:4.91 }, advanced:{ ontgt:74.8, badTh:12.5, prss:21.6, pktTime:2.4, iay_pa:8.0, pa_yds:1014, scrm:26, yds_scr:6.8 }, trend:{ ontgt_delta:+3.5, prss_delta:-4.0, note:"On-target improved 3.5pts. Pressure rate dropped 4.0pts -- genuine two-way improvement." }, rushing:{ attPg:3.1, ydsPg:10.4, tier:"OCCASIONAL" }, props:{ passYds:{ lean:"OVER vs weak secondaries -- Lamb plus PA scheme is elite" }, passTd:{ pg:1.76, lean:"OVER 1.5 reliably" }, best:"Lamb receiving props OVER. PA yards OVER when available -- 1014 yards is top-3." }, futures:{ wins:"9-11", div:"NFC East competitive", playoff:"55-65%", mvp:"Top-5 individually" }, fantasy:{ ppr:"QB5-8", startSit:"Start every healthy week. Home dome games are best spots." }, matchup:{ vsBlitz:"Elite -- 163 blitzes faced but only 21.6% pressure rate, handles best in league", vsEliteD:"Individual holds -- team execution often fails around him", dome:"AT&T Stadium dome is ideal" }, situation:"CeeDee Lamb retained. Line addressed. Individual talent never the problem.", note:"QBR 70.2 is elite. 12.5% bad throw rate is cleanest among ELITE tier QBs. 1014 PA yards (top-3). Always bet Prescott individually. Always fade Cowboys in team futures. The disconnect is persistent." },
  "Jaxson Dart":     { team:"NYG", tier:"BELOW_AVG", passing:{ gs:12, rec:"4-8", cmp:63.7, yds:2272, td:15, int:5, ypa:6.7, rate:91.7, qbr:57.5 }, advanced:{ ontgt:72.9, badTh:15.5, prss:23.3, pktTime:2.4, iay_pa:8.1, pa_yds:328, scrm:38, yds_scr:7.7 }, rushing:{ attPg:6.1, ydsPg:34.8, tdPg:0.64, ypc:5.7, fmbPg:0.36, tier:"ELITE RUSHER", note:"BIGGEST MARKET EDGE: 34.8 yds/g rushing. Market sees him as pocket-only. He is not." }, props:{ rushYds:{ lean:"OVER -- wildly undervalued. Market ignores 34.8 yds/g completely." }, passTd:{ lean:"OVER 1.5 when McMillan healthy" }, best:"Rushing yards OVER every week -- most undervalued prop in the NFC." }, futures:{ wins:"7-9", div:"NFC East competitive", playoff:"30-40%" }, fantasy:{ ppr:"QB15-20", startSit:"Stream when matchup favorable. Start in 2-QB leagues." }, matchup:{ vsBlitz:"38 scrambles -- converts pressure into yardage", vsEliteD:"9.36% sack rate gets worse vs elite pass rushers" }, situation:"Year 2. Tetairoa McMillan drafted -- first real WR1 of his career.", note:"34.8 rushing yds/g at 5.7 Y/att as a 'pocket passer' is the best prop edge in the NFC. Market completely ignores it. McMillan adds a ceiling the passing stats alone don't show." },
  "Jalen Hurts":     { team:"PHI", tier:"STARTER", passing:{ gs:16, rec:"11-5", cmp:64.8, yds:3224, td:25, int:6, ypa:7.1, rate:98.5, qbr:55.2 }, advanced:{ ontgt:74.0, badTh:16.7, prss:20.0, pktTime:2.5, iay_pa:9.0, pa_yds:610, rpo_yds:476, scrm:40, yds_scr:6.7 }, trend:{ ontgt_delta:-5.1, note:"ON-TARGET DROPPED 5.1pts (79.1 to 74.0) -- most significant accuracy regression in NFC. Needs monitoring." }, rushing:{ attPg:6.6, ydsPg:26.3, tdPg:0.50, fmbPg:0.50, tier:"STRONG RUSHER", note:"Designed runs, not scrambles -- scheme guarantees floor regardless of passing game" }, props:{ rushYds:{ lean:"OVER every week -- designed runs schemed regardless of game script" }, passYds:{ lean:"UNDER in blowout wins -- Eagles manage clock" }, best:"Rushing yards OVER. Floor guaranteed by scheme design." }, futures:{ wins:"11-13", div:"NFC East favorite", playoff:"80-85%", mvp:"Top-5" }, fantasy:{ ppr:"QB4-6", startSit:"Never sit when healthy. Scheme guarantees the floor." }, matchup:{ vsBlitz:"FEASTS -- RPO design is specifically built to punish blitz", vsEliteD:"Still produces -- rushing floor never disappears", weather:"Cold weather is NEUTRAL to positive -- run-heavy script rises" }, situation:"AJ Brown and Smith retained. Swift at RB. Eagles always NFC contenders.", note:"On-target dropped 5.1pts year-over-year -- the hidden concern. Rushing floor (designed runs 6.6/g) covers any passing variance. Start every week, never sit." },
  "Jayden Daniels":  { team:"WAS", tier:"STARTER", passing:{ gs:7, rec:"2-5", cmp:60.6, yds:1262, td:8, int:3, ypa:6.7, rate:88.1, qbr:44.7, note:"7 games only" }, advanced:{ ontgt:76.4, badTh:14.9, prss:16.7, pktTime:2.3, iay_pa:7.2, pa_yds:357, scrm:39, yds_scr:6.5 }, trend:{ ontgt_prior:78.2, note:"Prior full season 78.2% on-target is the true baseline -- 7 games is not enough" }, rushing:{ attPg:8.3, ydsPg:39.7, tdPg:0.29, fmbPg:0.43, tier:"ELITE RUSHER", note:"Allen-level pace in 7-game sample" }, props:{ rushYds:{ lean:"OVER every week -- 39.7 yds/g pace is best in NFC" }, best:"Rushing yards OVER. Most undervalued NFC QB prop when healthy." }, futures:{ wins:"9-11", div:"NFC East dark horse", playoff:"50-60%", mvp:"Top-5 if stays healthy" }, fantasy:{ ppr:"QB8-13", startSit:"Start every healthy week. Must carry handcuff QB -- only 7 healthy games last season." }, matchup:{ vsBlitz:"39 scrambles -- elite conversion of pressure to yardage", weather:"Washington cold in December -- rushing floor rises" }, situation:"Year 2 full health. Washington adding weapons. Rushing ability is the primary value.", note:"39.7 rushing yds/g pace in 7 games matches Josh Allen's baseline. If healthy all year he's a legitimate QB1-2. Health is the only real question -- three injury-shortened seasons in career." },
  "Caleb Williams":  { team:"CHI", tier:"STARTER", passing:{ gs:17, rec:"11-6", cmp:58.1, yds:3942, td:27, int:7, ypa:6.9, rate:90.1, qbr:58.2 }, advanced:{ ontgt:69.8, badTh:20.7, prss:25.1, pktTime:2.5, iay_pa:8.5, pa_yds:1192, hrry:94, scrm:41, yds_scr:8.7 }, trend:{ ontgt_delta:-2.6, note:"On-target declined further to 69.8% -- two straight seasons below 73%. 174 blitzes faced (most in league)." }, rushing:{ attPg:4.5, ydsPg:22.8, tdPg:0.18, fmbPg:0.53, tier:"STRONG RUSHER" }, props:{ passYds:{ lean:"OVER vs weak secondaries" }, best:"Bears team total OVER -- best cast Williams has had. Year 2 breakout expected." }, futures:{ wins:"10-12", div:"NFC North contender", playoff:"60-70%", mvp:"Top-8 if accuracy improves" }, fantasy:{ ppr:"QB9-12", startSit:"Start most weeks. Sit vs elite secondaries where 69.8% on-target gets exposed." }, matchup:{ vsBlitz:"FEASTS -- off-platform improvisation punishes blitz", vsEliteD:"Accuracy floor drops further -- 69.8% compounds vs elite corners" }, situation:"Burden III, Loveland TE, Swift RB, Thuney OG all added. Best supporting cast of his career.", note:"69.8% on-target lowest among all starters. 20.7% bad throw rate second highest. BUT 1192 PA yards is top-3 -- Bears scheme is actually well-designed. 174 blitzes faced (most in league) -- defenses have found his weakness. Year 2 with better cast is the buy." },
  "Jared Goff":      { team:"DET", tier:"STARTER", passing:{ gs:17, rec:"9-8", cmp:68.0, yds:4564, td:34, int:8, ypa:7.9, rate:105.5, qbr:57.3 }, advanced:{ ontgt:78.3, badTh:15.8, prss:24.5, pktTime:2.3, iay_pa:6.4, pa_yds:1502, scrm:5, yds_scr:9.6, hits:76 }, trend:{ ontgt_delta:-2.2, prss_delta:+3.6, note:"On-target dropped slightly. QB hits jumped to 76 -- highest among starters. Line regressed year-over-year." }, rushing:{ attPg:1.1, ydsPg:2.6, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.0, lean:"OVER 1.5 every week -- 34 TDs (2.0/g) is most reliable TD rate in NFC" }, passYds:{ lean:"OVER at Ford Field dome -- ideal environment" }, best:"Passing TDs OVER 1.5 every week. 1502 PA yards (league best) drives the engine." }, futures:{ wins:"11-13", div:"NFC North favorite", playoff:"80-85%" }, fantasy:{ ppr:"QB8-11", startSit:"Always start at Ford Field. Assess weather for road games." }, matchup:{ vsBlitz:"Only 5 scrambles -- takes the hit. 76 QB hits shows the line problem.", vsEliteD:"Dips notably -- QBR 57.3 reveals scheme dependence", dome:"Ford Field is ideal -- home games are categorically different from road" }, situation:"ARSB, Gibbs, Montgomery, LaPorta all back. Campbell committed. NFC championship caliber.", note:"1502 PA yards is league best by wide margin. McVay-style pre-snap motion scheme beats every zone. TD prop (2.0/g) is most reliable in NFC. FADE in cold outdoor road games -- 6.4 IAY/PA accuracy suffers." },
  "Jordan Love":     { team:"GB", tier:"ELITE", passing:{ gs:15, rec:"9-5-1", cmp:66.3, yds:3381, td:23, int:6, ypa:7.7, rate:101.2, qbr:72.7 }, advanced:{ ontgt:77.4, badTh:14.6, prss:22.1, pktTime:2.4, iay_pa:8.7, pa_yds:861, scrm:24, yds_scr:7.6 }, trend:{ ontgt_delta:+4.2, note:"On-target improved 4.2pts -- most underreported QB development in the NFC. Real improvement, not noise." }, rushing:{ attPg:3.1, ydsPg:13.3, tier:"USEFUL RUSHER" }, props:{ passYds:{ lean:"OVER in negative game scripts -- scheme opens when Packers trail" }, best:"Love is consistently undervalued by market. QBR 72.7 with only 6 INTs." }, futures:{ wins:"10-12", div:"NFC North contender", playoff:"65-75%", mvp:"Dark horse -- QBR 72.7 is legitimately MVP-caliber" }, fantasy:{ ppr:"QB5-8", startSit:"Start most weeks. Best in shootout/negative game scripts." }, matchup:{ vsBlitz:"Good -- 4.57% sack rate means ball out quickly", vsEliteD:"Still efficient -- QBR 72.7 too high to be matchup-dependent", weather:"Lambeau cold not a deterrent" }, situation:"Year 3 with same receiver corps. Young core entering prime.", note:"Most underrated QB in football. QBR 72.7 with 6 INTs in 15 games. On-target jumped 4.2pts. The balanced Packers scheme suppresses counting stats but underlying quality is elite. Buy everywhere at depressed ADP." },
  "Kyler Murray":    { team:"MIN", tier:"STARTER", passing:{ gs:5, rec:"2-3", cmp:68.3, yds:962, td:6, int:3, note:"5 games with ARZ pre-trade" }, advanced:{ ontgt:75.2, prss:16.5, iay_pa:5.9, note:"5-game sample -- distorted by bad ARZ situation. Prior full season is true baseline." }, trend:{ ontgt_prior:79.1, prss_prior:16.3, pa_yds_prior:1124, note:"Prior full season: 79.1% on-target (elite), 16.3% pressure (clean). These are the true Kyler baselines when healthy." }, rushing:{ attPg:5.8, ydsPg:34.6, tdPg:0.20, ypc:6.0, fmbPg:0.20, tier:"ELITE RUSHER", note:"0.20 fmb/g -- cleanest ball protection among all mobile QBs" }, props:{ rushYds:{ lean:"OVER when healthy -- 34.6 yds/g with cleanest fumble rate among mobile QBs" }, best:"Vikings team total OVER when Murray confirmed healthy. Murray rushing OVER." }, futures:{ wins:"10-13 healthy", div:"NFC North contender", playoff:"70-80% healthy", mvp:"Top-5 if healthy full season" }, fantasy:{ ppr:"QB8-13 health dependent", startSit:"Start every healthy week. Must carry handcuff -- multiple season-ending injuries in career." }, matchup:{ vsBlitz:"Elite improviser -- defenses don't blitz him because they can't", vsEliteD:"Jefferson vs any corner is best individual matchup in NFC", dome:"US Bank Stadium dome is elite environment" }, situation:"Traded from ARZ to MIN. O'Connell scheme elite for QB production. Jefferson is best WR in football.", note:"O'Connell turned Darnold into 14-3 QB -- what does it do with the most athletically gifted QB in league? Jefferson is generational. 0.20 fumble rate is cleanest ball protection among mobile QBs. Health is the only ceiling -- three season-ending injuries in career." },
  "Michael Penix":   { team:"ATL", tier:"BELOW_AVG", passing:{ gs:9, rec:"3-6", cmp:60.1, yds:1982, td:9, int:3, ypa:7.2, rate:88.5, qbr:57.9 }, advanced:{ ontgt:72.9, badTh:24.0, prss:16.6, pktTime:2.4, iay_pa:8.4, pa_yds:347 }, rushing:{ tier:"OCCASIONAL" }, props:{ best:"London and Robinson individual props OVER. More reliable than Penix passing props." }, futures:{ wins:"8-10", div:"NFC South contender", playoff:"45-55%" }, fantasy:{ ppr:"QB20-26", startSit:"Never start weekly. London and Robinson are the real Falcons assets." }, situation:"First full season as starter. London and Robinson are elite weapons. Pitts potentially healthy.", note:"24.0% bad throw rate -- HIGHEST among all starters. 72.9% on-target below average despite excellent 16.6% pressure rate (line is good, accuracy is the issue). London and Robinson props are the only Atlanta offensive play worth making." },
  "Bryce Young":     { team:"CAR", tier:"BELOW_AVG", passing:{ gs:16, rec:"8-8", cmp:63.6, yds:3011, td:23, int:11, ypa:6.3, rate:87.8, qbr:47.6 }, advanced:{ ontgt:77.9, badTh:16.4, prss:24.0, pktTime:2.4, iay_pa:6.4, pa_yds:633 }, trend:{ ontgt_delta:+6.0, prss_delta:-2.7, note:"ON-TARGET IMPROVED 6.0pts -- BIGGEST IMPROVEMENT IN LEAGUE. Line also better. Both are meaningful positive trends." }, rushing:{ attPg:3.4, ydsPg:13.5, tier:"USEFUL RUSHER" }, props:{ best:"McMillan receiving yards OVER -- first WR1 in Young's career." }, futures:{ wins:"7-9", div:"NFC South competitive", playoff:"25-35%" }, fantasy:{ ppr:"QB20-25", startSit:"Never a reliable weekly starter yet." }, situation:"Year 3 make-or-break. Tetairoa McMillan adds first real WR1.", note:"On-target jumped 6.0pts year-over-year -- biggest improvement in league. Hidden story: he's becoming a functional starter. 6.4 IAY/PA is conservative -- McMillan may push this higher. Year 3 with a real WR1 is the setup for a step-change." },
  "Tyler Shough":    { team:"NO", tier:"BELOW_AVG", passing:{ gs:9, rec:"5-4", cmp:67.6, yds:2384, td:10, int:6, ypa:7.3, rate:91.3, qbr:48.8, skPct:8.66 }, advanced:{ ontgt:76.5, badTh:15.9, prss:19.6, pktTime:2.2, iay_pa:8.3, pa_yds:299 }, rushing:{ attPg:4.1, ydsPg:16.9, tier:"USEFUL RUSHER" }, props:{ best:"Saints team total UNDER. Olave receiving yards OVER." }, futures:{ wins:"5-7", div:"Bottom NFC South", playoff:"10%" }, note:"Saints are rebuilding. Olave individual props are the only New Orleans offensive play worth making. Fade Saints team totals." },
  "Baker Mayfield":  { team:"TB", tier:"STARTER", passing:{ gs:17, rec:"8-9", cmp:63.2, yds:3693, td:26, int:11, ypa:6.8, rate:90.6, qbr:61.3 }, advanced:{ ontgt:73.7, badTh:15.7, prss:14.8, pktTime:2.3, iay_pa:8.0, pa_yds:770, scrm:42, yds_scr:8.9 }, trend:{ ontgt_delta:-4.9, note:"ON-TARGET DROPPED 4.9pts (78.6 to 73.7) -- most concerning regression among mid-tier starters." }, rushing:{ attPg:3.2, ydsPg:22.5, ypc:6.9, fmbPg:0.65, tier:"STRONG RUSHER", note:"6.9 Y/att elite efficiency, 0.65 fmb/g alarming" }, props:{ best:"Evans TD scorer OVER. Mayfield rushing yards OVER -- 8.9 yds/scramble is elite." }, futures:{ wins:"8-10", div:"NFC South favorite", playoff:"50-60%" }, fantasy:{ ppr:"QB14-18", startSit:"Matchup-dependent. Check Evans health first every week." }, matchup:{ vsBlitz:"Line is excellent (14.8% pressure) -- blitz rarely arrives", vsEliteD:"Dips -- accuracy regression compounds" }, situation:"Evans retained. Godwin health is key variable. Liam Coen scheme continues.", note:"On-target dropped 4.9pts -- most concerning mid-tier regression. Evans health drove it. 8.9 yds/scramble is surprisingly elite. Fade in cold outdoor road games -- accuracy drops further." },
  "Jacoby Brissett": { team:"ARZ", tier:"BELOW_AVG", passing:{ gs:12, rec:"1-11", cmp:64.9, yds:3366, td:23, int:8, ypa:6.9, rate:94.1, qbr:41.2 }, advanced:{ ontgt:73.2, badTh:17.6, prss:27.5, pktTime:2.4, iay_pa:7.6, pa_yds:799 }, rushing:{ attPg:2.7, ydsPg:12.0, tier:"USEFUL RUSHER" }, props:{ best:"Harrison Jr. receiving yards OVER every week. Cardinals team total UNDER." }, futures:{ wins:"4-6", div:"Bottom NFC West", playoff:"5%" }, note:"Kyler traded to MIN. Full rebuild. Harrison Jr. props are the only Arizona offensive play worth making. Fade everything Cardinals offense." },
  "Matthew Stafford":{ team:"LAR", tier:"ELITE", passing:{ gs:17, rec:"12-5", cmp:65.0, yds:4707, td:46, int:8, ypa:7.9, rate:109.2, qbr:71.2, skPct:3.71 }, advanced:{ ontgt:73.6, badTh:18.1, prss:18.5, pktTime:2.4, iay_pa:9.0, pa_yds:1744, rpo_yds:102, scrm:7, yds_scr:3.1, hits:52 }, trend:{ ontgt_delta:-0.7, prss_delta:-3.8, note:"On-target stable. Pressure rate IMPROVED 3.8pts -- Rams line got better." }, rushing:{ attPg:1.7, ydsPg:0.1, tier:"POCKET ONLY" }, props:{ passTd:{ pg:2.71, lean:"OVER 2.5 -- 46 TDs in 17 games is best TD rate in football" }, passYds:{ lean:"OVER -- 4707 yards (276.9/g) is consistent elite volume" }, best:"Passing TDs OVER 2.5 -- 2.71/g baseline is best single-player prop in NFC." }, futures:{ wins:"11-13", div:"NFC West favorite", playoff:"80-85%", mvp:"Top-3" }, fantasy:{ ppr:"QB4-7", startSit:"Start every healthy week. Age 38 is only concern." }, matchup:{ vsBlitz:"Elite -- 3.71% sack rate (lowest in league), ball out before rush arrives", vsEliteD:"Scheme is so well-designed elite Ds struggle", dome:"Ceiling even higher -- 9.0 IAY/PA deep game opens without wind" }, situation:"Kupp healthy. Nacua year 3. McVay scheme unchanged. Age 38 is the only concern.", note:"1744 PA yards -- league's best by a wide margin. 9.0 IAY/PA highest among all starters. 3.71% sack rate lowest in league. TD prop (OVER 2.5) at 2.71/g is the most reliable single-player prop in the NFC. Never bench him healthy." },
  "Brock Purdy":     { team:"SF", tier:"STARTER", passing:{ gs:9, rec:"7-2", cmp:69.4, yds:2167, td:20, int:10, ypa:7.6, rate:100.5, qbr:72.8, note:"9 games only" }, advanced:{ ontgt:82.2, badTh:12.3, prss:21.1, pktTime:2.7, iay_pa:7.5, pa_yds:570, scrm:18, yds_scr:7.3 }, trend:{ ontgt_prior:78.4, note:"82.2% on-target is highest among ALL starters. Prior full season 78.4% also elite. 2.7 pocket time -- most patient thrower in football." }, rushing:{ attPg:3.7, ydsPg:16.3, tier:"USEFUL RUSHER" }, props:{ passTd:{ pg:2.22, lean:"OVER 2.0 -- scheme generates TDs efficiently every game" }, best:"CMC and Aiyuk receiving props OVER. Purdy TD OVER 2.0 when fully healthy." }, futures:{ wins:"10-12", div:"NFC West contender", playoff:"70-80% healthy", mvp:"Top-5 if healthy" }, fantasy:{ ppr:"QB9-13", startSit:"Start when CMC confirmed active. Monitor both Purdy AND CMC weekly." }, matchup:{ vsBlitz:"Elite -- Shanahan hot route design destroys every blitz", vsEliteD:"Still efficient -- 72.8 QBR too high to be fully scheme-dependent" }, situation:"CMC health is the key variable for the entire offense. Deebo and Aiyuk retained. Kittle back.", note:"82.2% on-target is the highest among all starters -- cleanest in football. 12.3% bad throw rate is cleanest in league. CMC health is the multiplier for everything. Start aggressively when CMC is confirmed." },
  "Sam Darnold":     { team:"SEA", tier:"STARTER", passing:{ gs:17, rec:"14-3", cmp:67.7, yds:4048, td:25, int:14, ypa:8.5, rate:99.1, qbr:55.6, note:"With MIN under O'Connell" }, advanced:{ ontgt:79.8, badTh:14.6, prss:21.0, pktTime:2.4, iay_pa:7.8, pa_yds:1394, scrm:14, yds_scr:6.4 }, trend:{ ontgt_prior:81.8, note:"Prior year even better at 81.8%. Both seasons inflated by O'Connell scheme. Career norms outside that system: 73-75% on-target, INT-prone." }, rushing:{ attPg:2.1, ydsPg:5.6, fmbPg:0.65, tier:"POCKET ONLY", note:"0.65 fmb/g -- highest among pocket passers" }, props:{ best:"Darnold INT OVER 0.5 every week. Scheme regression from MIN to SEA." }, futures:{ wins:"7-10", div:"NFC West competitive", playoff:"40-50%" }, fantasy:{ ppr:"QB16-22", startSit:"Never a reliable weekly starter. Spot streaming in favorable matchups only." }, matchup:{ vsBlitz:"Collapses -- career norms show this without O'Connell scheme protecting him", vsEliteD:"Gets exposed -- career QBR well below the 55.6 from Minnesota" }, situation:"Left Minnesota's elite system for Seattle. Regression to career norms is the base case.", note:"14-3 and 79.8% on-target was O'Connell's scheme and Jefferson. Without either, expect regression. INT OVER 0.5 every week. The scheme downgrade is real and significant." },
};

// --- Sport detection ----------------------------------------------------------
function detectSport(question) {
  const q = question.toLowerCase();
  const nflSignals = [
    "nfl","quarterback","qb","touchdown","interception","passing yards",
    "rushing yards","fantasy football","super bowl","afc","nfc","wide receiver",
    "running back","tight end","offensive line","defensive line","linebacker",
    "cornerback","safety","field goal","punt","snap","blitz","coverage",
    "pocket","scramble","red zone","two-point","audible","shotgun","pistol",
    "play action","rpo","dome","outdoor stadium",
    "bills","patriots","dolphins","jets","ravens","bengals","browns","steelers",
    "texans","colts","jaguars","titans","chiefs","raiders","chargers","broncos",
    "cowboys","giants","eagles","commanders","bears","lions","packers","vikings",
    "falcons","panthers","saints","buccaneers","cardinals","rams","49ers","seahawks",
    "allen","mahomes","lamar","burrow","hurts","prescott","stroud","herbert",
    "maye","love","darnold","stafford","purdy","goff","daniels","williams",
    "ward","nix","lawrence","dart","young","mayfield","penix","jackson",
    "sanders","shough","brissett","rudolph","willis","o'connell","smith",
    // RB/WR/TE signals
    "cook","henry","taylor","robinson","achane","nacua","chase","smith-njigba",
    "pickens","lamb","mcbride","bowers","kelce","warren",
    "rb","wr","te","receiver","back","tight end","prop","props",
  ];
  return nflSignals.some(s => q.includes(s)) ? "nfl" : "tennis";
}

// --- Extract relevant QB profiles from question -------------------------------
function getRelevantQBs(question) {
  const q = question.toLowerCase();
  const relevant = {};
  for (const [name, data] of Object.entries(NFL_QBS)) {
    const nameParts = name.toLowerCase().split(" ");
    if (nameParts.some(part => part.length > 3 && q.includes(part))) {
      relevant[name] = data;
    }
    if (data.team && q.includes(data.team.toLowerCase())) {
      relevant[name] = data;
    }
  }
  return Object.keys(relevant).length > 0 ? relevant : NFL_QBS;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { question, players, context, liveMatches, tournamentResults, oddsData, tour, history, matchupContext, image, nflContext } = req.body;
  if (!question) return res.status(400).json({ error: "Missing question" });

  const sport = detectSport(question);
  const isNFL = sport === "nfl";

  // --- Odds context builder ------------------------------------------------
  function buildOddsContext(odds) {
    if (!odds || (!odds.matches?.length && !odds.props?.length)) return null;
    const lines = [];
    if (odds.matches?.length > 0) {
      lines.push("LIVE MATCH ODDS:");
      for (const m of odds.matches) {
        if (m.homeOdds !== null && m.awayOdds !== null) {
          lines.push(`  ${m.home} (${m.homeOdds > 0 ? "+" : ""}${m.homeOdds}) vs ${m.away} (${m.awayOdds > 0 ? "+" : ""}${m.awayOdds})`);
        }
      }
    }
    if (odds.props?.length > 0) {
      lines.push("\nLIVE PROP LINES:");
      for (const mp of odds.props) {
        lines.push(`  ${mp.home} vs ${mp.away}:`);
        for (const a of mp.aces || []) {
          lines.push(`    ${a.player} Aces ${a.description} ${a.line} (${a.odds > 0 ? "+" : ""}${a.odds})`);
        }
        for (const d of mp.doubleFaults || []) {
          lines.push(`    ${d.player} DFs ${d.description} ${d.line} (${d.odds > 0 ? "+" : ""}${d.odds})`);
        }
      }
    }
    return lines.length > 0 ? lines.join("\n") : null;
  }

  function buildDrawPath(results) {
    if (!Array.isArray(results) || results.length === 0) return null;
    const roundOrder = ["1st Round","2nd Round","3rd Round","4th Round","Round of 128","Round of 64","Round of 32","Round of 16","Quarterfinal","Quarterfinals","Semifinal","Semifinals","Final"];
    const byRound = {};
    for (const r of results) {
      const round = r.round || "Unknown";
      if (!byRound[round]) byRound[round] = [];
      byRound[round].push(r);
    }
    const sortedRounds = Object.keys(byRound).sort((a, b) => {
      const ai = roundOrder.findIndex(r => a.toLowerCase().includes(r.toLowerCase()));
      const bi = roundOrder.findIndex(r => b.toLowerCase().includes(r.toLowerCase()));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const lines = [];
    for (const round of sortedRounds) {
      lines.push(`${round}:`);
      for (const match of byRound[round]) {
        lines.push(`  ${match.winner} def. ${match.loser}${match.score ? ` (${match.score})` : ""}`);
      }
    }
    return lines.join("\n");
  }

  const oddsCtx = buildOddsContext(oddsData);
  const drawPath = buildDrawPath(tournamentResults);

  // --- Build system prompt based on sport ----------------------------------
  let systemPrompt;

  if (isNFL) {
    const relevantQBs = getRelevantQBs(question);
    const qbData = JSON.stringify(relevantQBs, null, 0).slice(0, 12000);

    // nflContext is the rich RB/WR/TE data string sent from the frontend
    const skillPositionData = nflContext || "No skill position data provided.";

    systemPrompt = `You are UR TAKE -- the voice of Under Review, a sharp sports betting intelligence app.

CORE JOB
Answer the user's question immediately with a sharp, stat-backed take. Lead with the lean, then back it with data. Sound like a savvy bettor talking to a friend -- confident, direct, specific. Never hedge when the data points clearly.

SPORT: NFL
Current context: 2026 NFL season (stats from season ending Jan 2025 are the primary baseline)

-----------------------------------------
NFL STAT GLOSSARY
-----------------------------------------
ontgt = on-target throw % (true accuracy, league avg 74.9% -- above is good, below is a concern)
badTh = bad throw rate % (INT predictor -- cleaner than raw INT count, league avg 16.1%)
prss  = pressure rate % (line quality + QB processing, league avg 21.9% -- above is a problem)
iay_pa = intended air yards per attempt (depth of throw: 8.5+ = deep thrower, 6.5- = checkdown)
pa_yds = play-action passing yards (scheme dependency signal -- high = PA-reliant offense)
yds_scr = yards per scramble (mobility quality)
ontgt_delta = year-over-year change in on-target % (positive = improving, negative = regressing)
prss_delta = year-over-year change in pressure rate (positive = line worse, negative = line better)

For skill positions (RB/WR/TE):
ydsPg = yards per game
td = touchdowns
td pg = touchdowns per game (TD rate -- PRIMARY signal for TD scorer props)
recPg = receptions per game
tgt = total targets
ypr = yards per reception
floor/ceil = prop range
lean = directional take on whether to bet OVER or UNDER

-----------------------------------------
CRITICAL RULE: USE THE SKILL POSITION DATABASE
-----------------------------------------
The RB/WR/TE SKILL POSITION DATABASE below is your PRIMARY source for all running back, wide receiver, and tight end questions. It contains:
- Per-game stats (ydsPg, recPg, tgt, ypr)
- Total touchdowns and TD rates (TDs/g) for EVERY player
- Prop floors, ceilings, and directional leans
- Situation context and betting angles

When asked about RBs, WRs, or TEs -- including TD leaders, prop questions, season totals, comparisons -- USE THIS DATABASE. Do NOT say you lack RB/WR/TE data. It is right here.

Key TD rates from the database (use these for TD leader questions):
- Derrick Henry (RB, BAL): 0.94 TDs/g, 15 total TDs in 16g -- HIGHEST TD RATE
- James Cook (RB, BUF): 0.88 TDs/g, 14 total TDs in 16g
- De'Von Achane (RB, MIA): 0.86 TDs/g, 12 total TDs in 14g
- Jonathan Taylor (RB, IND): 0.82 TDs/g, 14 total TDs in 17g
- Bijan Robinson (RB, ATL): 0.65 TDs/g, 11 total TDs in 17g
- Ja'Marr Chase (WR, CIN): 0.63 TDs/g, 10 total TDs in 16g
- Puka Nacua (WR, LAR): 0 TDs/g, 0 total TDs in 16g -- FADE TD scorer

-----------------------------------------
NFL RESPONSE RULES
-----------------------------------------

FOR PROP QUESTIONS:
Lead immediately with the lean. Format:
Player -- Prop OVER/UNDER X -- [one key stat that drives the take]

FOR TD LEADER / RANKING QUESTIONS:
Rank by TD rate (TDs/g) from the skill position database. Henry leads at 0.94/g.

FOR MATCHUP/GAME QUESTIONS:
Lead with the take. Then 2-3 sentences of reasoning. Then 1-2 prop bullets.

FOR FANTASY QUESTIONS:
Start/Sit verdict first. Floor/ceiling reasoning. Injury variable if relevant.

PUSHBACK RULES:
Your take is anchored to the database. Hold position on stat-backed takes.

FORMAT:
- No markdown bold. No headers. No section labels.
- Do not start with "UR TAKE:".
- One precise stat beats three vague ones.
- Never mention the database, prompts, or data sources.

-----------------------------------------
RB / WR / TE SKILL POSITION DATABASE
-----------------------------------------
${skillPositionData}

-----------------------------------------
QB DATABASE
-----------------------------------------
${qbData}

${oddsCtx ? `LIVE BETTING LINES\n${oddsCtx}\nWhen lines are present: reference the exact number, compare to database baseline, state whether line is sharp/soft/fair.` : "No live lines -- give directional leans only."}`.trim();

  } else {
    // --- TENNIS SYSTEM PROMPT (unchanged) ----------------------------------
    systemPrompt = `
You are UR TAKE -- the voice of Under Review, a sharp sports betting intelligence app covering all of professional tennis.

CORE JOB
Answer any tennis question immediately with a sharp, stat-backed take. Lead with the lean, back it with data. Sound like the sharpest bettor in the room talking to a friend -- confident, specific, natural. Never hedge when data points clearly. Never flip a take from social pressure.

You cover the full tennis calendar. You can answer questions about:
- The current live tournament (draw, props, matchups, results)
- Any upcoming tournament (previews, surface advantages, who to watch)
- Season-long futures (who wins Wimbledon, Roland Garros favorites, dark horses)
- Player-vs-player matchups on any surface at any time
- Prop angles and betting edges across the full tour

-----------------------------------------
SURFACE ELO GUIDE -- USE THIS FOR FUTURES AND MATCHUPS
-----------------------------------------
Each player in the database has three Elo ratings:
- hElo: hard court Elo -- use for Miami, US Open, Australian Open, indoor events
- cElo: clay Elo -- use for Roland Garros, Madrid, Rome, Charleston
- gElo: grass Elo -- use for Wimbledon, Queen's Club, Halle

For futures questions, rank players by the relevant surface Elo.
A player with cElo 2100 but hElo 1950 is a clay specialist -- buy them for Roland Garros, fade for Wimbledon.
Surface Elo gaps over 150 points are significant betting edges.

-----------------------------------------
RESPONSE MODES -- READ QUESTION AND PICK THE RIGHT ONE
-----------------------------------------

MODE 1: LIVE DRAW (current tournament has draw path results below)
- Lead with the take on the specific matchup or prop
- Use draw path results to confirm who is in form, who is fatigued
- Reference actual scores from the draw path when relevant
- Never invent results not in the draw path

MODE 2: TOURNAMENT PREVIEW (tournament starting soon, no draw yet)
- Use player database + surface Elo + tournament context to identify favorites and edges
- Reference surface notes from CURRENT TOURNAMENT CONTEXT
- Identify 2-3 prop angles or value plays based on surface fit
- Be specific: "On green clay, Swiatek's cElo (2089) is the highest on tour -- she's the play"

MODE 3: FUTURES / SEASON OUTLOOK (who wins Roland Garros, Wimbledon dark horses, etc.)
- Use surface Elo to rank the field
- Identify the structural favorites (highest relevant surface Elo)
- Find the value plays (players with high surface Elo but low market profile)
- Identify fades (players with great hard court record but weak clay/grass Elo)
- Be direct with the lean: "Alcaraz cElo puts him second only to Swiatek on clay -- buy Roland Garros futures now"

MODE 4: GENERAL TENNIS (player comparisons, H2H, style matchups, any surface)
- Use the full player database
- Apply style matchup logic
- Give a definitive take with the most relevant stat

-----------------------------------------
PLAYER PROFILE FIELDS TO USE
-----------------------------------------
- hElo, cElo, gElo: surface-specific Elo ratings (PRIMARY signal for surface questions)
- serveStats.holdPct: hold percentage
- serveStats.acePct: ace rate
- returnStats.breakPct: break rate
- returnStats.rpwPct: return points won
- overallStats.dominanceRatio (DR): points won vs points lost ratio
- overallStats.tiebreakPct: tiebreak win rate
- recentForm.y2026DR: current season dominance ratio
- matchupProfile: stylistic notes vs different opponent types
- fullNote, hardCourtNote, clayNote, grassNote: surface-specific notes

PLAYER STYLE CLASSIFICATIONS:
- BIG SERVER: holdPct >= 86%, acePct >= 12%
- ATTACKER / FIRST-STRIKE: holdPct >= 83%, style includes "first-strike" or "attacking"
- COUNTER-PUNCHER: breakPct >= 26%, rpwPct >= 40%
- ALL-COURT: balanced across all metrics
- CLAY SPECIALIST: cElo significantly higher than hElo (150+ gap)
- GRASS SPECIALIST: gElo significantly higher than hElo (150+ gap)

-----------------------------------------
STRUCTURAL EDGE CALCULATION
-----------------------------------------
1. Surface Elo gap: >150 = strong lean, 60-150 = moderate, <60 = toss-up
2. DR gap: compare dominanceRatio values on relevant surface
3. Hold/break asymmetry: can Player B break Player A's serve?
4. Style matchup on this specific surface
5. H2H on this surface if noted in player profiles

STYLE OUTCOMES ON SURFACE:
Clay -- counter-punchers and baseliners have max edge, big servers neutralized, OVER games default lean, UNDER aces
Grass -- big servers dominate, tiebreaks everywhere, UNDER games default, OVER aces for big servers
Hard -- most balanced, surface Elo gap is primary signal, individual hold/break rates matter most

-----------------------------------------
PROP ANGLES BY SURFACE
-----------------------------------------
Clay props: OVER games almost always, UNDER aces for most, break rate high so tiebreaks rare
Grass props: UNDER games, OVER aces for big servers, tiebreaks common (bet them)
Hard court props: use player baselines from database, ace_props section has per-surface averages

-----------------------------------------
DRAW PATH INTEGRITY
-----------------------------------------
If TOURNAMENT DRAW PATH has results: use them, never invent scores not listed.
If draw path is empty: say so briefly in one sentence, then pivot immediately to what you DO know -- surface analysis, player database, style matchups. Do not stop at "I don't have the draw." Always give a useful take.

-----------------------------------------
PUSHBACK RULES
-----------------------------------------
Your take is anchored to surface Elo and player database stats. Hold position on stat-backed takes. Re-anchor to the specific number. Never reverse based on user confidence alone.

-----------------------------------------
FORMAT
-----------------------------------------
No markdown bold. No headers in responses. No section labels.
Do not start with "UR TAKE:".
One precise stat beats three vague ones.
Prop questions: bullet format -- Player -- Prop -- one key stat reason.
Broader questions: prose first, then 1-2 prop bullets if relevant.
Never mention the database, prompts, or data sources.
Never say you can't answer a tennis question -- you always have the player database and surface Elo.

-----------------------------------------
CURRENT TOURNAMENT CONTEXT
-----------------------------------------
${(() => {
  const t = context?.currentTournament;
  if (t) {
    return [
      `ACTIVE: ${t.name} -- ${t.surface}, ${t.speed} speed.`,
      t.context,
      `SURFACE BETTING NOTES: ${t.surface_notes || "Use hElo as primary signal."}`,
      `TOUR FAVORITE (ATP): ${t.atp_favorite || "TBD"}`,
      `TOUR FAVORITE (WTA): ${t.wta_favorite || "TBD"}`,
      `Tour: ${t.tour || tour || "ATP/WTA"}`,
    ].join("\n");
  }
  return `ACTIVE: Miami Open 2026 -- Hard court, medium-fast.\nATP FAVORITE: Sinner\nWTA FAVORITE: Sabalenka`;
})()}

ALL TOURNAMENTS THIS SEASON (for futures questions):
${(() => {
  const all = context?.tournaments;
  if (!all) return "Full season schedule unavailable.";
  return Object.values(all).map(t =>
    `${t.name} (${t.surface}, ${t.speed}) -- ${t.tour} -- Favorites: ATP ${t.atp_favorite || "TBD"} / WTA ${t.wta_favorite || "TBD"}`
  ).join("\n");
})()}

PLAYER DATABASE
${players ? JSON.stringify(players, null, 0).slice(0, 16000) : "Player data unavailable"}

LIVE MATCHES
${Array.isArray(liveMatches) && liveMatches.length > 0 ? liveMatches.slice(0, 12).map(m => `${m.home_team} vs ${m.away_team} -- ${m.round || context?.currentTournament?.name || "Current Tournament"} -- ${m.live === "1" ? "LIVE" : m.status || "Scheduled"}`).join("\n") : "No live matches currently"}

ACE PROP BASELINES (per surface)
${context?.ace_props ? Object.entries(context.ace_props).map(([k, v]) => `${k}: hard avg ${v.avg_aces_hard}, clay avg ${v.avg_aces_clay || "n/a"}, grass avg ${v.avg_aces_grass || "n/a"}`).join("\n") : "No ace baselines"}

${(() => { const o = buildOddsContext(oddsData); return o ? `LIVE BETTING LINES\n${o}\nReference exact line numbers. Compare to database baseline. State if sharp/soft/fair.` : "No live prop lines -- directional leans only, no invented numbers."; })()}

TOURNAMENT DRAW PATH (completed matches)
${drawPath || "No draw results yet -- tournament may be previewing or just started. Use player database and surface analysis to answer."}

FINAL INSTRUCTION
Pick the right mode for the question. Use surface Elo as the primary signal for any surface-specific question. Always give a definitive take. Never stop at "I don't have draw data" -- pivot to what you know. The player database and surface Elo are always available.
`.trim();
  }

  // --- Build messages ------------------------------------------------------
  const messages = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-4)) {
      if (!msg || msg.loading) continue;
      const text = msg.text || msg.content;
      if (!text) continue;
      messages.push({ role: msg.role === "user" ? "user" : "assistant", content: text });
    }
  }

  if (image && image.base64 && image.mediaType) {
    messages.push({
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
        { type: "text", text: question },
      ],
    });
  } else {
    messages.push({ role: "user", content: question });
  }

  // --- Call Anthropic ------------------------------------------------------
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: image ? "claude-sonnet-4-5" : "claude-haiku-4-5-20251001",
        max_tokens: 700,
        temperature: 0.7,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({ error: "AI response failed", details: data });
    }

    const text = data?.content?.filter(i => i.type === "text")?.map(i => i.text)?.join("\n")?.trim() || "Couldn't get a response. Try again.";
    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
