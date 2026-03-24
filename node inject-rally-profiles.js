#!/usr/bin/env node
// ============================================================
// inject-rally-profiles.js
// Run from repo root: node inject-rally-profiles.js
//
// What it does:
//   1. Reads api/tennis-players.js
//   2. Reads src/lib/tennis/data/atp.js
//   3. Injects rallyProfile after surfaceNote for every player
//   4. Writes the patched files back in place
//   5. Prints a summary of every player patched / skipped
//
// Safe to re-run — skips players that already have rallyProfile
// ============================================================

const fs = require("fs");
const path = require("path");

// ─── Rally profile data ──────────────────────────────────────
const rallyProfiles = {
  // ATP Top 10
  "Sinner": { short: { pct: 34, winPct: 57 }, medium: { pct: 38, winPct: 56 }, long: { pct: 28, winPct: 55 }, profile: "The only top-10 player who wins 55%+ in every rally band. Genuinely elite across all lengths.", bettingAngle: "Fade opponents trying to grind him down. 81% tiebreak rate means close sets almost always go his way." },
  "Alcaraz": { short: { pct: 32, winPct: 56 }, medium: { pct: 36, winPct: 55 }, long: { pct: 32, winPct: 54 }, profile: "Dominant across all rally lengths. Drop shots and athleticism make 9+ shot exchanges his playground. Long-rally rate climbs further on clay.", bettingAngle: "Total games overs are live in Alcaraz matches. Back him in any long-rally condition." },
  "Djokovic": { short: { pct: 30, winPct: 53 }, medium: { pct: 37, winPct: 56 }, long: { pct: 33, winPct: 59 }, profile: "Best long-rally player in history. 59% win rate in 9+ shots — gets stronger as rallies extend. Short points are his relative weakness.", bettingAngle: "Fade against big servers on fast surfaces. Back heavily in long-rally conditions." },
  "Zverev": { short: { pct: 36, winPct: 55 }, medium: { pct: 37, winPct: 53 }, long: { pct: 27, winPct: 50 }, profile: "Short-point dominant via his serve. Long rally win rate (50%) is coin-flip — no structural edge when rallies extend.", bettingAngle: "Over total games almost always correct in grinding conditions. His 50% long-rally rate means the edge disappears on slow clay." },
  "Medvedev": { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 55 }, profile: "Gets better as rallies lengthen. Flat counterpunching most effective with time to redirect. 41.9% tiebreak rate is his fatal flaw.", bettingAngle: "Back in grinding baseline conditions. Fade in tiebreaks and against big servers on fast courts." },
  "De Minaur": { short: { pct: 28, winPct: 50 }, medium: { pct: 38, winPct: 54 }, long: { pct: 34, winPct: 58 }, profile: "Elite long-rally player — 58% in 9+ shots. Speed makes him stronger as rallies extend. Short-point rate (50%) reflects no serve weapons.", bettingAngle: "Back in grind conditions. Fade against pure serve-first players (Fritz, FAA, Mensik) who win before the rally starts." },
  "Auger-Aliassime": { short: { pct: 42, winPct: 61 }, medium: { pct: 36, winPct: 51 }, long: { pct: 22, winPct: 47 }, profile: "Most extreme short-point profile in the top 10. 42% of points end in 0-4 shots. Long-rally win rate (47%) is below 50%.", bettingAngle: "Ace overs automatic. Under total games when on serve. Fade in clay or slow conditions." },
  "Shelton": { short: { pct: 40, winPct: 59 }, medium: { pct: 36, winPct: 51 }, long: { pct: 24, winPct: 46 }, profile: "Left-handed serve creates short-point dominance. Long-rally win rate (46%) below average. DR 1.07 shows how quickly the edge disappears.", bettingAngle: "Dangerous in best-of-3 short formats. Fade in long matches and vs elite returners." },
  "Fritz": { short: { pct: 43, winPct: 62 }, medium: { pct: 35, winPct: 51 }, long: { pct: 22, winPct: 45 }, profile: "Most serve-dominated profile on tour. 43% of points end in 0-4 shots. Long-rally win rate (45%) weakest in the top 10.", bettingAngle: "Ace props are the primary angle. Structural mismatch vs Sinner and De Minaur." },
  "Musetti": { short: { pct: 29, winPct: 51 }, medium: { pct: 36, winPct: 54 }, long: { pct: 35, winPct: 56 }, profile: "Long-rally specialist. One-handed backhand most effective in extended exchanges. Short-point rate (51%) reflects weak serve.", bettingAngle: "Dangerous on clay in long matches. On hard, short-point liability is exposed." },

  // ATP 11-25
  "Tien": { short: { pct: 37, winPct: 55 }, medium: { pct: 37, winPct: 51 }, long: { pct: 26, winPct: 48 }, profile: "Hard court specialist. Short-point aggression strong. Long-rally rate (48%) drops below 50%. Clay Elo #106 is a massive surface gap.", bettingAngle: "Back on fast hard in best-of-3. Fade on clay entirely. 67.5% tiebreak rate is his best clutch weapon." },
  "Draper": { short: { pct: 34, winPct: 55 }, medium: { pct: 37, winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Balanced profile when healthy — DR 1.23 shows up across all rally lengths. Left-handed serve skews short-point data.", bettingAngle: "Back healthy Draper at any surface. Monitor injury status — his DR is top-5 quality." },
  "Fils": { short: { pct: 33, winPct: 53 }, medium: { pct: 37, winPct: 52 }, long: { pct: 30, winPct: 50 }, profile: "Balanced but doesn't dominate any rally length. Long-rally rate (50%) coin-flip. BP save rate (59.8%) below average.", bettingAngle: "Clay Elo #11 makes him a Roland Garros watch. Fade in tiebreaks — 52.9% near coin-flip." },
  "Bublik": { short: { pct: 44, winPct: 62 }, medium: { pct: 33, winPct: 50 }, long: { pct: 23, winPct: 44 }, profile: "Second most extreme short-point profile on tour. 14.7% ace rate drives everything. Long-rally win rate (44%) — loses more extended exchanges than he wins.", bettingAngle: "Ace and hold props automatic. Both ace over and DF over live given 5.7% DF rate." },
  "Mensik": { short: { pct: 41, winPct: 60 }, medium: { pct: 36, winPct: 51 }, long: { pct: 23, winPct: 46 }, profile: "15.9% ace rate drives short-point dominance. Long rallies a clear weakness (46%) while baseline game matures.", bettingAngle: "Ace overs among the best props on any slate. Fade in clay grinding conditions." },
  "Ruud": { short: { pct: 28, winPct: 51 }, medium: { pct: 36, winPct: 54 }, long: { pct: 36, winPct: 57 }, profile: "Classic clay baseline grinder. Long rallies (57%) are his weapon. Short points (51%) near coin-flip.", bettingAngle: "Back on clay in long matches. On hard or grass, short-point limitation exposed." },
  "Korda": { short: { pct: 37, winPct: 55 }, medium: { pct: 36, winPct: 52 }, long: { pct: 27, winPct: 49 }, profile: "Serve-first attacker drops below 50% in long rallies. Tiebreak rate (52.6%) coin-flip. Grass Elo #13 is a hidden strength.", bettingAngle: "Back in best-of-3 on hard and grass. Grass ceiling underrated by the market." },
  "Fonseca": { short: { pct: 37, winPct: 55 }, medium: { pct: 36, winPct: 51 }, long: { pct: 27, winPct: 46 }, profile: "19-year-old power baseliner — short-point game already strong. Long-rally (46%) and 44% tiebreak rate compound in pressure-heavy long matches.", bettingAngle: "Dangerous in best-of-3 fast hard. Fade in long matches and best-of-5." },
  "Paul": { short: { pct: 30, winPct: 52 }, medium: { pct: 38, winPct: 53 }, long: { pct: 32, winPct: 54 }, profile: "Most balanced profile in the top 20. Wins across all rally lengths. Clay Elo #17 stronger than reputation.", bettingAngle: "Hard to fade in any specific rally condition. Best backed where opponents have specific weaknesses." },
  "Fokina": { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 55 }, profile: "Counter-puncher who improves as rallies lengthen. Tiebreak weakness (48.5%) is the main liability.", bettingAngle: "Back in grinding conditions. Avoid betting him to win tiebreaks." },
  "Rublev": { short: { pct: 33, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Medium-rally specialist. Tiebreak weakness (53.3%) in pressure-heavy rallies. Grass Elo #12 is a hidden strength.", bettingAngle: "Fade in tiebreaks. Back in comfortable midlength exchanges." },
  "Lehecka": { short: { pct: 39, winPct: 57 }, medium: { pct: 36, winPct: 51 }, long: { pct: 25, winPct: 47 }, profile: "Serve-first with below-average long-rally performance. Grass Elo #15 best surface ranking. yElo #69 in 2026 signals below-best form.", bettingAngle: "Lehecka on grass underrated. Tiebreaks (51.9%) essentially coin-flip." },
  "Cerundolo": { short: { pct: 27, winPct: 50 }, medium: { pct: 36, winPct: 53 }, long: { pct: 37, winPct: 57 }, profile: "Best long-rally player outside the top 15. 68.2% tiebreak rate. Elite return stats (40.3% RPW, 28.8% break rate).", bettingAngle: "Genuine clay value play. Structure collapses on fast surfaces where big servers force short points." },
  "Norrie": { short: { pct: 28, winPct: 50 }, medium: { pct: 38, winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Grinder who survives through medium and long rallies. DR 1.02 lowest in the top 25 — margins thin everywhere.", bettingAngle: "Hard to back as a favorite. Best bet is over total games against grinding profiles." },
  "Khachanov": { short: { pct: 35, winPct: 54 }, medium: { pct: 37, winPct: 52 }, long: { pct: 28, winPct: 49 }, profile: "Power baseliner with declining long-rally game. Tiebreak rate (42.4%) worst in the top 25. yElo #78 in 2026 confirms form concerns.", bettingAngle: "Tiebreak fade is automatic. Strong overall fade in any tight match." },

  // ATP 26-150 (uses full names as they appear in atp.js)
  "Flavio Cobolli": { short: { pct: 34, winPct: 54 }, medium: { pct: 38, winPct: 53 }, long: { pct: 28, winPct: 50 }, profile: "Forehand-led attacker who does damage in short and medium exchanges. Long-rally rate (50%) coin-flip. Hard court DR 0.94 confirms thin margins.", bettingAngle: "On clay he looks like a legitimate top-15 player. On hard, fade in long-format matches." },
  "Tsitsipas": { short: { pct: 35, winPct: 55 }, medium: { pct: 39, winPct: 54 }, long: { pct: 26, winPct: 51 }, profile: "Medium-rally specialist. One-handed backhand gets targeted under sustained pressure in long rallies.", bettingAngle: "Thrives in medium exchanges on clay. Over total games on clay, under on fast hard vs big servers." },
  "Frances Tiafoe": { short: { pct: 35, winPct: 54 }, medium: { pct: 37, winPct: 53 }, long: { pct: 28, winPct: 50 }, profile: "Athletic shotmaker. Long-rally rate (50%) coin-flip. 69% tiebreak rate is his best clutch metric. Vs top-10 is 0-6 with 0.75 DR.", bettingAngle: "Dangerous in short best-of-3 hard court matches. Fade vs top-10 opponents every time." },
  "Tomas Machac": { short: { pct: 30, winPct: 51 }, medium: { pct: 38, winPct: 52 }, long: { pct: 32, winPct: 52 }, profile: "Counter-punching all-court player who improves as rallies develop. Elo of 1858 vs ranking of 48 is a significant undervalue signal.", bettingAngle: "Live underdog on slow hard courts. Miami conditions suit him." },
  "Holger Rune": { short: { pct: 31, winPct: 52 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Emotionally volatile but statistically balanced when switched on. Medium and long rally rates both positive.", bettingAngle: "Momentum trader. Back in best-of-3 when confident. Fade in long matches." },
  "Raphael Collignon": { short: { pct: 28, winPct: 50 }, medium: { pct: 37, winPct: 54 }, long: { pct: 35, winPct: 55 }, profile: "Elite return pressure player — 40.1% RPW and 28.3% break rate already tour-quality. DR 1.09 is legitimate top-30 quality.", bettingAngle: "Back in any condition that extends rallies. Most underpriced player in his ranking band." },
  "Grigor Dimitrov": { short: { pct: 32, winPct: 52 }, medium: { pct: 38, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "All-court stylist whose rally profile has flattened badly in 2026 (2-6 record). Physical durability now the core question.", bettingAngle: "Fade aggressively. 2-6 in 2026 with declining physicality." },
  "Ugo Humbert": { short: { pct: 38, winPct: 56 }, medium: { pct: 37, winPct: 52 }, long: { pct: 25, winPct: 47 }, profile: "Left-handed serve-and-early-ball attacker. Long-rally rate (47%) drops below average. Best-of-5 structural weakness (1-3 record).", bettingAngle: "Dangerous in best-of-3 on fast courts. Fade in best-of-5 and clay." },
  "Marcos Giron": { short: { pct: 31, winPct: 52 }, medium: { pct: 38, winPct: 52 }, long: { pct: 31, winPct: 50 }, profile: "Balanced hard-court baseliner. DR 0.98 means thin margins — good floater, not a reliable favorite.", bettingAngle: "Dangerous live underdog on hard courts when opponents give him rhythm." },
  "Marin Cilic": { short: { pct: 38, winPct: 56 }, medium: { pct: 36, winPct: 52 }, long: { pct: 26, winPct: 48 }, profile: "Veteran power server. Short-point profile still strong (11.7% ace rate). Long-rally rate (48%) reflects physical decline.", bettingAngle: "Ace overs remain live. Fade in long physical matches." },
  "Fabian Marozsan": { short: { pct: 31, winPct: 51 }, medium: { pct: 38, winPct: 52 }, long: { pct: 31, winPct: 51 }, profile: "Clean ball-striker with rhythm-based game. All bands near 51-52%. Tiebreak rate (44%) significant liability.", bettingAngle: "Fade in tiebreaks — 44% well below average. Slow courts suit his game." },
  "Rafael Jodar": { short: { pct: 29, winPct: 52 }, medium: { pct: 37, winPct: 54 }, long: { pct: 34, winPct: 55 }, profile: "19-year-old with a remarkably complete profile. 53.2% TPW and 1.20 DR outstanding for his level. Return-heavy — wins from both directions.", bettingAngle: "Most underpriced young player on tour. Back at big odds on hard courts. Trajectory still upward." },
  "Sebastian Baez": { short: { pct: 26, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 37, winPct: 56 }, profile: "Pure clay grinder. Long-rally win rate (56%) is his entire game. Short-point rate (49%) negative — 2.4% ace rate. Hard court hold rate (70.9%) is weak.", bettingAngle: "Back on clay in long matches. Fade completely on hard or grass." },
  "Zizou Bergs": { short: { pct: 34, winPct: 53 }, medium: { pct: 36, winPct: 51 }, long: { pct: 30, winPct: 49 }, profile: "Serve-forehand driven attacker in form decline. DR 0.95 last 52 weeks. Long-rally rate (49%) below 50%.", bettingAngle: "Fade current form — 0.95 DR and 45% win rate in last 52." },
  "Marton Fucsovics": { short: { pct: 28, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 35, winPct: 55 }, profile: "Physical clay baseliner with elite endurance. Long-rally win rate (55%) reflects his style. Tiebreak rate (44%) main liability.", bettingAngle: "Back in long clay matches. Fade in tiebreaks." },
  "Alexei Popyrin": { short: { pct: 38, winPct: 55 }, medium: { pct: 36, winPct: 51 }, long: { pct: 26, winPct: 46 }, profile: "Serve-first attacker whose form has collapsed in 2026 (2-9 record, 0.94 DR). Short-point profile has upside when serving.", bettingAngle: "Hard fade in current form. Back only at very long odds when first-serve percentage is high." },
  "Hubert Hurkacz": { short: { pct: 42, winPct: 60 }, medium: { pct: 35, winPct: 49 }, long: { pct: 23, winPct: 44 }, profile: "Pure short-point machine — 15.9% ace rate. Medium and long-rally win rates both negative. Break rate collapsed to 7.9% in 2026.", bettingAngle: "Ace overs are live. Everything else fades. Return collapse makes him a structural fade." },
  "Jack Thompson": { short: { pct: 37, winPct: 55 }, medium: { pct: 37, winPct: 52 }, long: { pct: 26, winPct: 48 }, profile: "Solid Australian hard court player with serve-first tendencies. Long-rally rate (48%) reflects limited baseline depth.", bettingAngle: "Reliable floater on hard courts in best-of-3. Fade in long matches." },
  "Miomir Kecmanovic": { short: { pct: 30, winPct: 51 }, medium: { pct: 39, winPct: 53 }, long: { pct: 31, winPct: 53 }, profile: "Steady clay-friendly baseliner. Medium and long rally rates both positive.", bettingAngle: "Back in grinding conditions and slow surfaces. Fade on fast hard or grass." },
  "Jan-Lennard Struff": { short: { pct: 40, winPct: 58 }, medium: { pct: 35, winPct: 51 }, long: { pct: 25, winPct: 46 }, profile: "Big German server with a front-loaded game. Long-rally rate (46%) drops off sharply.", bettingAngle: "Ace and hold props are primary angles. Fade in long matches." },
  "Giovanni Mpetshi Perricard": { short: { pct: 45, winPct: 64 }, medium: { pct: 33, winPct: 49 }, long: { pct: 22, winPct: 43 }, profile: "Most extreme short-point profile in the top 50. Medium and long win rates both negative.", bettingAngle: "Ace props automatic. Hold props strong. Everything else fades." },
  "Luca Van Assche": { short: { pct: 27, winPct: 50 }, medium: { pct: 36, winPct: 54 }, long: { pct: 37, winPct: 56 }, profile: "Return-oriented counterpuncher — 42.0% RPW and 32.5% break rate elite for his level. 2026 form excellent (1.18 DR). Tiebreak rate (46%) the liability.", bettingAngle: "Back on hard courts where his 28-14 record and 1.12 DR are legitimate." },
  "Denis Shapovalov": { short: { pct: 35, winPct: 54 }, medium: { pct: 37, winPct: 52 }, long: { pct: 28, winPct: 49 }, profile: "Explosive left-handed attacker. Long-rally rate (49%) drops below average when opponents absorb his pace.", bettingAngle: "Back when he has first-strike control. Fade in grind conditions." },
  "Matteo Berrettini": { short: { pct: 40, winPct: 58 }, medium: { pct: 36, winPct: 52 }, long: { pct: 24, winPct: 47 }, profile: "Power server and forehand aggressor. Short-point profile elite when healthy. Injury history makes form volatile.", bettingAngle: "Ace and hold props primary when healthy. Monitor injury status." },
  "Ignacio Buse": { short: { pct: 26, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 37, winPct: 56 }, profile: "Clay-first heavy-topspin grinder. Long-rally win rate (56%) is his primary weapon. Hard court DR 1.02 barely positive.", bettingAngle: "Back on clay in extended matches. Fade completely on grass." },
  "Quentin Halys": { short: { pct: 43, winPct: 60 }, medium: { pct: 34, winPct: 49 }, long: { pct: 23, winPct: 44 }, profile: "Extreme short-point profile driven by 13.3% ace rate. Medium and long-rally win rates both negative.", bettingAngle: "Ace overs automatic on fast hard and grass. Everything else fades." },
  "Adam Walton": { short: { pct: 37, winPct: 53 }, medium: { pct: 37, winPct: 51 }, long: { pct: 26, winPct: 47 }, profile: "Serve-led hard-court player in form decline. DR dropped to 0.97. Tiebreak record 16-24 last 52 weeks.", bettingAngle: "Fade current form — tiebreak rate (40%) one of the worst on tour." },
  "Nishesh Basavareddy": { short: { pct: 33, winPct: 52 }, medium: { pct: 38, winPct: 53 }, long: { pct: 29, winPct: 52 }, profile: "Young American whose Elo (92) is dramatically above his ranking (198). Balanced profile. Serve improving in 2026.", bettingAngle: "Back as underdog on hard courts — severely mispriced. 9-4 in 2026." },
  "Patrick Kypson": { short: { pct: 34, winPct: 53 }, medium: { pct: 37, winPct: 53 }, long: { pct: 29, winPct: 51 }, profile: "All-court baseliner with no dominant weapon but no catastrophic weakness. 2026 regression (DR 1.05) is a concern.", bettingAngle: "Back at significant odds on hard courts in best-of-3." },
  "James Duckworth": { short: { pct: 38, winPct: 55 }, medium: { pct: 36, winPct: 52 }, long: { pct: 26, winPct: 47 }, profile: "Veteran first-strike attacker. 2026 form collapsed (4-9, 0.88 DR). Short-point profile has upside when serving well.", bettingAngle: "Fade 2026 form entirely. Back only at very long odds on fast hard when serving well." },

  // WTA Top 10
  "Sabalenka": { short: { pct: 36, winPct: 58 }, medium: { pct: 37, winPct: 55 }, long: { pct: 27, winPct: 52 }, profile: "Power baseliner who dominates short and medium rallies. Long-rally win rate (52%) still positive.", bettingAngle: "Under games in Sabalenka hard court matches. 92.3% tiebreak rate makes close sets almost automatic." },
  "Rybakina": { short: { pct: 39, winPct: 61 }, medium: { pct: 36, winPct: 53 }, long: { pct: 25, winPct: 49 }, profile: "WTA most extreme short-point profile. 10.3% ace rate drives everything. Long-rally win rate (49%) drops below 50%.", bettingAngle: "Ace machine on fast surfaces. On clay vs grinders, long-rally weakness exploitable." },
  "Swiatek": { short: { pct: 25, winPct: 50 }, medium: { pct: 36, winPct: 55 }, long: { pct: 39, winPct: 60 }, profile: "Opposite of Rybakina. Only 25% of points end quickly. Long-rally win rate (60%) is the best on the WTA tour.", bettingAngle: "Total games overs in Swiatek matches almost always live. On clay, back in any format." },
  "Pegula": { short: { pct: 31, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Remarkably balanced — wins 53-54% across all three rally bands. Low DF rate (3.0%) means she never self-destructs.", bettingAngle: "Tiebreak weakness (47.6%) is the one exploitable angle. yElo #2 in 2026 massively underrated." },
  "Gauff": { short: { pct: 27, winPct: 51 }, medium: { pct: 36, winPct: 54 }, long: { pct: 37, winPct: 56 }, profile: "Long-rally specialist — 56% in 9+ shots. Elite return stats drive this. 10.4% DF rate clusters in high-pressure short points.", bettingAngle: "Back in grind conditions. DF rate in clutch moments is where she loses matches she should win." },
  "Mboko": { short: { pct: 33, winPct: 54 }, medium: { pct: 37, winPct: 52 }, long: { pct: 30, winPct: 50 }, profile: "20-year-old Canadian rising fast. Elo rank 6. 7.1% DF rate and 37.5% tiebreak rate are the current limiting factors.", bettingAngle: "Back on hard courts — 16-5 in 2026. Fade in tiebreaks (37.5% alarming). Trajectory steeply upward." },
  "Anisimova": { short: { pct: 34, winPct: 54 }, medium: { pct: 36, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Aggressive flat hitter with solid all-round numbers. 38.4% break rate and 45.2% RPW above average. DF rate (5.9%) is the risk.", bettingAngle: "Dangerous draw threat on hard courts. DF props are live. Back when hitting spots." },
  "Svitolina": { short: { pct: 26, winPct: 50 }, medium: { pct: 36, winPct: 54 }, long: { pct: 38, winPct: 57 }, profile: "Counter-punching defensive baseliner. Long-rally win rate (57%) elite. Short-point rate (50%) reflects a non-weapon serve.", bettingAngle: "Best WTA long-match lean. yElo #4 in 2026 massively underrated by the market." },
  "Muchova": { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Creative all-court player who improves as rallies develop. 2.7% DF rate means she rarely self-destructs.", bettingAngle: "Best form of her career in 2026 (14-3, yElo #6). Back in any condition that allows variety." },
  "Ostapenko": { short: { pct: 40, winPct: 58 }, medium: { pct: 35, winPct: 51 }, long: { pct: 25, winPct: 43 }, profile: "Feast-or-famine flat hitter. Long-rally rate (43%) worst in WTA top 20. 7.5% DF spikes in pressure rallies.", bettingAngle: "Vs clay grinders is terrible for her. Against big servers on fast hard she can explode." },

  // WTA 11-100
  "Danielle Collins": { short: { pct: 34, winPct: 55 }, medium: { pct: 37, winPct: 55 }, long: { pct: 29, winPct: 53 }, profile: "48.7% break rate and 85.7% tiebreak rate are the standout numbers. Wins across all rally lengths.", bettingAngle: "Live in any rally condition. Tiebreak dominance (85.7%) makes her one of the best bets in close sets." },
  "Paula Badosa": { short: { pct: 33, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Hard court specialist with balanced rally profile. All three bands positive.", bettingAngle: "Solid lean on hard courts in best-of-3. No glaring rally weakness." },
  "Anna Kalinskaya": { short: { pct: 31, winPct: 52 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Return-heavy player. 42.7% break rate is elite. Short-point rate (52%) reflects a serve without power.", bettingAngle: "Back vs serve-first players who can't sustain rallies. Hard court dominance (24-13) reliable." },
  "Mirra Andreeva": { short: { pct: 28, winPct: 51 }, medium: { pct: 36, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "51.6% break rate elite. Long-rally game (55%) already her primary weapon. Gets better as rallies extend.", bettingAngle: "Back in slow conditions and long matches. Fade on fast courts where serve is a liability." },
  "Beatriz Haddad Maia": { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 55 }, profile: "Aggressive clay baseliner who improves in longer rallies. 47.3% break rate and 72.7% tiebreak rate strong.", bettingAngle: "Reliable lean on clay in grinding matches. Fade on fast surfaces." },
  "Jelena Ostapenko": { short: { pct: 40, winPct: 58 }, medium: { pct: 35, winPct: 51 }, long: { pct: 25, winPct: 43 }, profile: "Extreme feast-or-famine flat hitter. Long-rally rate (43%) worst in WTA top 20.", bettingAngle: "DF props almost always live. Fade vs grinders on clay." },
  "Barbora Krejcikova": { short: { pct: 30, winPct: 51 }, medium: { pct: 36, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Grass and clay specialist. 44.8% break rate and 81.8% tiebreak rate exceptional. Hard court weakness (9-9) is real.", bettingAngle: "On grass one of the best WTA value plays. Tiebreak rate (81.8%) automatic in close sets." },
  "Donna Vekic": { short: { pct: 33, winPct: 53 }, medium: { pct: 38, winPct: 54 }, long: { pct: 29, winPct: 52 }, profile: "Consistent all-court player with no obvious rally weakness. Grass is her best surface.", bettingAngle: "Underrated on grass — 11-4 record is legitimate." },
  "Victoria Azarenka": { short: { pct: 28, winPct: 51 }, medium: { pct: 36, winPct: 54 }, long: { pct: 36, winPct: 56 }, profile: "Classic aggressive baseliner who gets stronger as rallies extend. 45.7% break rate elite.", bettingAngle: "Back in grinding hard court matches. Her break rate and long-rally profile both elite for her ranking tier." },
  "Madison Keys": { short: { pct: 37, winPct: 57 }, medium: { pct: 36, winPct: 54 }, long: { pct: 27, winPct: 50 }, profile: "Power hitter with short-point lean. DR 1.35 strong overall. Clay record (13-4) a genuine surprise.", bettingAngle: "Dangerous in best-of-3 on any surface. Over aces and under total games on fast courts." },
  "Magdalena Frech": { short: { pct: 29, winPct: 51 }, medium: { pct: 38, winPct: 53 }, long: { pct: 33, winPct: 53 }, profile: "Return-first baseliner with 40.6% break rate. Hold rate (52.9%) is low — gets broken often.", bettingAngle: "Target opponent break props vs Frech — her 52.9% hold rate is exploitable." },
  "Linda Noskova": { short: { pct: 33, winPct: 53 }, medium: { pct: 37, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Aggressive baseliner with solid break rate (44.8%) and elite tiebreak rate (68.8%).", bettingAngle: "Back in tiebreak-heavy matchups on hard courts — 68.8% tiebreak rate one of the best on tour." },
  "Liudmila Samsonova": { short: { pct: 35, winPct: 54 }, medium: { pct: 37, winPct: 53 }, long: { pct: 28, winPct: 50 }, profile: "Aggressive flat hitter. Short and medium rallies her domain. Long-rally rate (50%) coin-flip.", bettingAngle: "Back on fast hard in best-of-3. Fade in long grinding matches." },
  "Ekaterina Alexandrova": { short: { pct: 32, winPct: 52 }, medium: { pct: 37, winPct: 53 }, long: { pct: 31, winPct: 51 }, profile: "Aggressive baseliner with 43.6% break rate. Clay record (1-7) alarming. Tiebreak rate (42.9%) below average.", bettingAngle: "Fade completely on clay. Tiebreak weakness (42.9%) means fade in close sets on any surface." },
  "Yulia Putintseva": { short: { pct: 27, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Return-heavy grinder. 51.5% break rate one of the best on tour. Grass record (8-1) is the hidden gem.", bettingAngle: "Back on grass — 88.9% win rate is extraordinary. Long-rally profile translates." },
  "Anastasia Pavlyuchenkova": { short: { pct: 31, winPct: 52 }, medium: { pct: 38, winPct: 54 }, long: { pct: 31, winPct: 53 }, profile: "Experienced hard court baseliner with medium-rally preference. All rally bands positive.", bettingAngle: "Steady hard court lean. No dramatic rally weakness." },
  "Elise Mertens": { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 53 }, long: { pct: 34, winPct: 54 }, profile: "Defensive baseliner with strong break conversion (45.2%) and weak hold rate (53.8%). DR 1.04 — thin margins.", bettingAngle: "Target break point props when she has a return-game mismatch." },
  "Anastasia Potapova": { short: { pct: 31, winPct: 52 }, medium: { pct: 37, winPct: 53 }, long: { pct: 32, winPct: 52 }, profile: "Consistent aggressive baseliner with 43.7% break rate. Tiebreak rate (14.3%) extremely low.", bettingAngle: "Strong fade in tiebreaks — 14.3% is among the worst on tour." },
  "Petra Kvitova": { short: { pct: 38, winPct: 57 }, medium: { pct: 35, winPct: 52 }, long: { pct: 27, winPct: 47 }, profile: "Left-handed power server whose short-point dominance is built on flat serve and forehand. Grass is her best surface.", bettingAngle: "Still dangerous on grass. Fade on clay and in long physical matches." },
  "Barbora Vondrousova": { short: { pct: 27, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 55 }, profile: "Creative left-handed baseliner. Long-rally win rate (55%) is her strength. Wimbledon champion 2023.", bettingAngle: "Back in slow conditions and grinding matches. Fade on fast hard courts." },
  "Sorana Cirstea": { short: { pct: 33, winPct: 52 }, medium: { pct: 37, winPct: 53 }, long: { pct: 30, winPct: 51 }, profile: "Solid baseliner with no dominant rally length. All bands hover near 51-53%.", bettingAngle: "Reliable underdog value play in best-of-3." },
  "Daria Kasatkina": { short: { pct: 28, winPct: 51 }, medium: { pct: 37, winPct: 54 }, long: { pct: 35, winPct: 55 }, profile: "Smart baseliner who improves as rallies develop. Long-rally edge compounds on slow surfaces.", bettingAngle: "Back in grinding conditions and on clay. Fade on fast hard courts." },
  "Jasmine Paolini": { short: { pct: 29, winPct: 51 }, medium: { pct: 38, winPct: 54 }, long: { pct: 33, winPct: 55 }, profile: "Medium and long-rally specialist. Physical stamina is a genuine edge in three-set matches.", bettingAngle: "Back in conditions that extend rallies. Three-set record is strong because stamina compounds." },
  "Emma Navarro": { short: { pct: 30, winPct: 52 }, medium: { pct: 38, winPct: 53 }, long: { pct: 32, winPct: 53 }, profile: "Emerging American baseliner with balanced rally profile. All three bands positive.", bettingAngle: "Live underdog on any hard court in best-of-3. yElo trend still moving upward — buy low." },
  "Linda Fruhvirtova": { short: { pct: 29, winPct: 51 }, medium: { pct: 37, winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Young Czech baseliner with grinder profile. Long-rally game her primary development area.", bettingAngle: "Back against similarly-ranked players in slow conditions. Fade vs elite opponents." },
  "Katerina Siniakova": { short: { pct: 28, winPct: 50 }, medium: { pct: 36, winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Defensive baseliner with strong break conversion (47.4%) and poor hold rate (50.1%). Grass record (5-3) hidden strength.", bettingAngle: "Target opponent break props vs Siniakova — 50.1% hold rate is exploitable." },
  "Rebecca Sramkova": { short: { pct: 32, winPct: 54 }, medium: { pct: 36, winPct: 53 }, long: { pct: 32, winPct: 52 }, profile: "Aggressive baseliner with elite hold rate (62.3%) and strong tiebreak rate (66.7%). Hard court dominance (19-6, 76%) standout stat.", bettingAngle: "Back on hard courts — 19-6 record and DR 1.41 are elite numbers." },
  "Katie Boulter": { short: { pct: 34, winPct: 53 }, medium: { pct: 37, winPct: 53 }, long: { pct: 29, winPct: 49 }, profile: "Hard court specialist with long-rally weakness. 70.6% first serve win rate primary weapon. Clay record 0-4.", bettingAngle: "Reliable on hard in best-of-3. Fade aggressively on clay. DF props live (7.5% DF)." },
  "Naomi Osaka": { short: { pct: 37, winPct: 55 }, medium: { pct: 36, winPct: 53 }, long: { pct: 27, winPct: 48 }, profile: "Serve-reliant power player. 9.7% ace rate strong but hold rate (58.5%) below average. Tiebreak rate (38.5%) extremely low.", bettingAngle: "Fade in tiebreaks — 38.5% one of the worst rates on tour." },
  "Emma Raducanu": { short: { pct: 33, winPct: 53 }, medium: { pct: 36, winPct: 53 }, long: { pct: 31, winPct: 52 }, profile: "Aggressive baseliner with strong break rate (45.7%) and solid tiebreak rate (66.7%). Grass record (8-3) hidden strength.", bettingAngle: "Back on hard courts and grass. Tiebreak rate (66.7%) reliable in close sets." },
  "Anhelina Kalinina": { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 36, winPct: 54 }, profile: "Clay-leaning grinder with poor serve. 49.2% hold rate major liability. Hard court record (8-14) alarming.", bettingAngle: "Fade on hard courts — 33% win rate is structural. Back on clay at generous odds." },
  "Jessica Bouzas Maneiro": { short: { pct: 28, winPct: 49 }, medium: { pct: 36, winPct: 52 }, long: { pct: 36, winPct: 53 }, profile: "Baseline grinder with critically low hold rate (47.4%) but strong tiebreak rate (66.7%).", bettingAngle: "Tiebreak rate (66.7%) is her one genuine edge. Fade in service hold props — 47.4% is among the lowest in the WTA." },
  "Katie Volynets": { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 53 }, long: { pct: 36, winPct: 54 }, profile: "Return-first baseliner with negative short-point profile. Wins entirely through medium and long rally domination.", bettingAngle: "Fade on fast courts vs big servers. Back in slow conditions where break rate can take over." },
  "Camila Osorio": { short: { pct: 26, winPct: 49 }, medium: { pct: 36, winPct: 53 }, long: { pct: 38, winPct: 56 }, profile: "Clay grinding specialist. Short-point rate (49%) negative. Serve is a liability (1.5% ace, 6.5% DF).", bettingAngle: "Genuine underdog value on clay in long matches. Hard court record (7-10) confirms fade off clay." },
  "Viktoriya Tomova": { short: { pct: 28, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 35, winPct: 53 }, profile: "Break-reliant player with negative short-point profile (49%). Hard court record (11-17) confirms structural surface weakness.", bettingAngle: "Hard court fade. 39% win rate there is structural." },
  "Elisabetta Cocciaretto": { short: { pct: 27, winPct: 49 }, medium: { pct: 37, winPct: 52 }, long: { pct: 36, winPct: 53 }, profile: "Baseline grinder with a significant hard court problem. 42.8% break rate solid in medium and long rallies. Hard court record (8-15) alarming.", bettingAngle: "Fade on hard courts completely. On clay or grass, live underdog." },
  "Lucia Bronzetti": { short: { pct: 28, winPct: 50 }, medium: { pct: 37, winPct: 53 }, long: { pct: 35, winPct: 54 }, profile: "Defensive Italian baseliner. 43.7% break conversion solid. Short-point rate (50%) coin-flip — 2.6% ace rate.", bettingAngle: "Back at +150 or better on clay. Fade as a favorite on hard courts." },
  "Veronika Kudermetova": { short: { pct: 28, winPct: 50 }, medium: { pct: 38, winPct: 52 }, long: { pct: 34, winPct: 53 }, profile: "Defensive baseliner with 47.1% break rate and 49.5% hold rate. Hard court record (10-16) confirms surface weakness.", bettingAngle: "Target opponent break props vs Kudermetova on hard courts — 49.5% hold rate exploitable." },
  "Clara Burel": { short: { pct: 29, winPct: 50 }, medium: { pct: 36, winPct: 52 }, long: { pct: 35, winPct: 53 }, profile: "46.4% break rate but very poor tiebreak rate (22.2%) and 7% DF rate.", bettingAngle: "Tiebreak fade automatic — 22.2% is among the worst on tour." },
  "Nadia Podoroska": { short: { pct: 26, winPct: 48 }, medium: { pct: 36, winPct: 51 }, long: { pct: 38, winPct: 52 }, profile: "Defensive grinder with a DR of 0.57 — loses more points than she wins overall. Hard and clay records both poor.", bettingAngle: "Fade in almost all circumstances. DR of 0.57 is one of the worst on the WTA tour." },
};

// ─── Helper: build the rallyProfile string to inject ──────────
function buildRallyProfileStr(p, indent) {
  const i = " ".repeat(indent);
  const s = JSON.stringify;
  return (
    `${i}rallyProfile: {\n` +
    `${i}  short: { pct: ${p.short.pct}, winPct: ${p.short.winPct} },\n` +
    `${i}  medium: { pct: ${p.medium.pct}, winPct: ${p.medium.winPct} },\n` +
    `${i}  long: { pct: ${p.long.pct}, winPct: ${p.long.winPct} },\n` +
    `${i}  profile: ${s(p.profile)},\n` +
    `${i}  bettingAngle: ${s(p.bettingAngle)}\n` +
    `${i}}`
  );
}

// ─── Inject into a file ───────────────────────────────────────
function injectIntoFile(filePath, isAtpJs) {
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (file not found): ${filePath}`);
    return { patched: 0, skipped: 0, notFound: [] };
  }

  let content = fs.readFileSync(filePath, "utf8");
  let patched = 0;
  let skipped = 0;
  const notFound = [];

  for (const [playerName, profile] of Object.entries(rallyProfiles)) {
    // Skip WTA players when processing atp.js, skip ATP 26+ when processing tennis-players.js
    // We'll just try to match all in each file — safe because names are unique across files

    // Check if already has rallyProfile near this player
    const alreadyHas = new RegExp(
      `["']${playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*:\\s*\\{[^}]*(?:\\{[^}]*\\}[^}]*)*rallyProfile`
    ).test(content);

    if (alreadyHas) {
      skipped++;
      continue;
    }

    // Find surfaceNote closing for this player
    // Pattern: look for the player key, then find "surfaceNote:" followed by its closing brace
    // then insert rallyProfile after it

    // Build a regex that finds: "PlayerName": { ... surfaceNote: { hard: "...", clay: "...", grass: "..." } }
    // and inserts after the surfaceNote closing
    
    const escapedName = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // Find player entry and its surfaceNote
    // We look for surfaceNote: { ... } (single-line format used in tennis-players.js)
    // AND multi-line format used in atp.js
    
    let playerPos = -1;
    
    // Try exact quoted key match
    const keyPatterns = [
      `"${playerName}"`,
      `'${playerName}'`,
    ];
    
    for (const kp of keyPatterns) {
      const idx = content.indexOf(kp);
      if (idx !== -1) {
        playerPos = idx;
        break;
      }
    }
    
    if (playerPos === -1) {
      notFound.push(playerName);
      continue;
    }

    // From playerPos, find the surfaceNote block
    const surfaceNotePos = content.indexOf("surfaceNote:", playerPos);
    if (surfaceNotePos === -1 || surfaceNotePos > playerPos + 8000) {
      notFound.push(playerName);
      continue;
    }

    // Find the closing of surfaceNote — could be single line { } or multi-line
    // Walk forward from surfaceNotePos to find the matching closing brace
    let braceCount = 0;
    let inSurface = false;
    let surfaceEnd = -1;
    
    for (let i = surfaceNotePos; i < Math.min(content.length, surfaceNotePos + 2000); i++) {
      if (content[i] === "{") {
        braceCount++;
        inSurface = true;
      } else if (content[i] === "}" && inSurface) {
        braceCount--;
        if (braceCount === 0) {
          surfaceEnd = i + 1;
          break;
        }
      }
    }

    if (surfaceEnd === -1) {
      notFound.push(playerName);
      continue;
    }

    // Detect indent level by looking at the line containing surfaceNote
    const lineStart = content.lastIndexOf("\n", surfaceNotePos) + 1;
    const lineContent = content.slice(lineStart, surfaceNotePos);
    const indent = lineContent.match(/^(\s*)/)?.[1]?.length ?? 8;

    const rallyStr = buildRallyProfileStr(profile, indent);

    // Insert after surfaceNote's closing brace
    content =
      content.slice(0, surfaceEnd) +
      ",\n" +
      rallyStr +
      content.slice(surfaceEnd);

    patched++;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return { patched, skipped, notFound };
}

// ─── Run ──────────────────────────────────────────────────────
console.log("\n=== inject-rally-profiles.js ===\n");

const files = [
  { path: path.join("api", "tennis-players.js"), label: "api/tennis-players.js" },
  { path: path.join("src", "lib", "tennis", "data", "atp.js"), label: "src/lib/tennis/data/atp.js" },
];

let totalPatched = 0;
let totalSkipped = 0;
const allNotFound = [];

for (const f of files) {
  console.log(`Processing ${f.label}...`);
  const result = injectIntoFile(f.path, f.path.includes("atp.js"));
  console.log(`  ✓ Patched: ${result.patched}`);
  console.log(`  - Skipped (already have rallyProfile): ${result.skipped}`);
  if (result.notFound.length > 0) {
    console.log(`  ✗ Not found in file: ${result.notFound.join(", ")}`);
  }
  totalPatched += result.patched;
  totalSkipped += result.skipped;
  allNotFound.push(...result.notFound);
  console.log("");
}

console.log(`=== DONE ===`);
console.log(`Total patched: ${totalPatched}`);
console.log(`Total skipped: ${totalSkipped}`);
if (allNotFound.length > 0) {
  console.log(`Not found anywhere: ${[...new Set(allNotFound)].join(", ")}`);
} else {
  console.log(`All players found and patched.`);
}
console.log("\nVercel will auto-deploy on next git push.\n");
