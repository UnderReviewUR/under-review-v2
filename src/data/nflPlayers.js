// NFL Skill Position Player Database
export const NFL_PLAYERS = {
  "James Cook":         { pos:"RB", team:"BUF", tier:"ELITE",  ydsPg:112.3, rec2025:{g:16,yds:1797,td:14,recPg:2.7,ydsPg:112.3,ypr:7.6},  props:{recYds:{floor:80,ceil:150,lean:"OVER"},td:{pg:0.88,lean:"OVER — 14 TDs, elite scorer"}},              situation:"Bills RB1. Every-down back. Volume guaranteed.", bettingAngles:["Rush yards OVER every week","TD scorer OVER — primary play","16g starter — volume locked in"] },
  "Jonathan Taylor":    { pos:"RB", team:"IND", tier:"ELITE",  ydsPg:105.1, rec2025:{g:17,yds:1786,td:14,recPg:3.2,ydsPg:105.1,ypr:4.6},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.82,lean:"OVER 0.5 — elite red zone back"}},            situation:"Colts RB1. Richardson health is the only risk.", bettingAngles:["Rush yards OVER weekly","TD scorer OVER","Monitor Richardson health"] },
  "Derrick Henry":      { pos:"RB", team:"BAL", tier:"ELITE",  ydsPg:103.3, rec2025:{g:16,yds:1653,td:15,recPg:1.1,ydsPg:103.3,ypr:5.1},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.94,lean:"OVER — 15 TDs, most on team"}},               situation:"Ravens RB1 and primary red zone weapon.", bettingAngles:["Rush yards OVER every week","TD scorer — highest rate in NFL","Fade receiving yards"] },
  "Bijan Robinson":     { pos:"RB", team:"ATL", tier:"ELITE",  ydsPg:100.8, rec2025:{g:17,yds:1713,td:11,recPg:3.8,ydsPg:100.8,ypr:5.3},  props:{recYds:{floor:70,ceil:140,lean:"OVER"},td:{pg:0.65,lean:"OVER in favorable matchups"}},                situation:"Falcons RB1. Every-down back with elite receiving role.", bettingAngles:["Rush yards OVER","Receiving yards OVER pass-heavy weeks","TD scorer reliable"] },
  "De'Von Achane":      { pos:"RB", team:"MIA", tier:"ELITE",  ydsPg:93.7,  rec2025:{g:14,yds:1312,td:12,recPg:5.4,ydsPg:93.7,ypr:6.3},   props:{recYds:{floor:65,ceil:135,lean:"OVER"},td:{pg:0.86,lean:"OVER — 12 TDs in 14g"}},                      situation:"Dolphins dual-threat RB. Health is the only risk.", bettingAngles:["Rush yards OVER when healthy","Receiving yards OVER","Hard fade when injured"] },
  "Puka Nacua":         { pos:"WR", team:"LAR", tier:"ELITE",  ydsPg:107.2, rec2025:{g:16,tgt:166,rec:129,yds:1715,td:0,recPg:8.1,ydsPg:107.2,ypr:13.3}, props:{recYds:{floor:75,ceil:140,lean:"OVER"},rec:{floor:6,ceil:11,lean:"OVER — 8.1/g"},td:{pg:0,lean:"FADE TD scorer — 0 TDs in 16g"}}, situation:"Rams WR1. Most receptions in NFL 2025. Zero TDs.", bettingAngles:["Receiving yards OVER every week","Catches OVER — elite volume","FADE TD scorer"] },
  "Ja'Marr Chase":      { pos:"WR", team:"CIN", tier:"ELITE",  ydsPg:88.3,  rec2025:{g:16,tgt:185,rec:125,yds:1412,td:10,recPg:7.8,ydsPg:88.3,ypr:11.3}, props:{recYds:{floor:65,ceil:125,lean:"OVER when Burrow healthy"},td:{pg:0.63,lean:"OVER 0.5 favorable matchups"}}, situation:"Bengals WR1. Burrow health is the only variable.", bettingAngles:["Rec yards OVER when Burrow active","TD scorer OVER in red zone games","Hard fade when Burrow out"] },
  "Jaxon Smith-Njigba": { pos:"WR", team:"SEA", tier:"ELITE",  ydsPg:105.5, rec2025:{g:17,tgt:163,rec:119,yds:1793,td:6,recPg:7.0,ydsPg:105.5,ypr:15.1}, props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.35,lean:"Moderate"}}, situation:"Seahawks WR1. Led NFL in receiving yards 2025.", bettingAngles:["Receiving yards OVER","Volume locked regardless of QB","Market underrates him"] },
  "George Pickens":     { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:84.1,  rec2025:{g:17,tgt:137,rec:93,yds:1429,td:8,recPg:5.5,ydsPg:84.1,ypr:15.4},   props:{recYds:{floor:65,ceil:125,lean:"OVER"},td:{pg:0.47,lean:"OVER 0.5 red zone games"}}, situation:"Cowboys WR. Deep threat.", bettingAngles:["Receiving yards OVER","TD scorer in red zone","Big play every game"] },
  "CeeDee Lamb":        { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:76.9,  rec2025:{g:14,tgt:117,rec:75,yds:1077,td:6,recPg:5.4,ydsPg:76.9,ypr:14.4},   props:{recYds:{floor:60,ceil:115,lean:"OVER when healthy"},td:{pg:0.43,lean:"OVER favorable matchups"}}, situation:"Cowboys WR1 when healthy. Missed 3 games 2025.", bettingAngles:["OVER when active","Hard fade when injured","Monitor weekly"] },
  "Trey McBride":       { pos:"TE", team:"ARI", tier:"ELITE",  ydsPg:72.9,  rec2025:{g:17,tgt:169,rec:126,yds:1239,td:5,recPg:7.4,ydsPg:72.9,ypr:9.8},   props:{rec:{floor:5,ceil:10,lean:"OVER — 7.4/g leads all TEs"},recYds:{floor:55,ceil:100,lean:"OVER"},td:{pg:0.29,lean:"Moderate — 5 TDs only"}}, situation:"Best TE situation in football.", bettingAngles:["Catches OVER every week","Receiving yards OVER","FADE TD scorer"] },
  "Brock Bowers":       { pos:"TE", team:"LVR", tier:"ELITE",  ydsPg:56.7,  rec2025:{g:12,tgt:86,rec:64,yds:680,td:3,recPg:5.3,ydsPg:56.7,ypr:10.6},     props:{rec:{floor:4,ceil:8,lean:"OVER when healthy"},recYds:{lean:"OVER when healthy"},td:{pg:0.25,lean:"Moderate"}}, situation:"Raiders TE1. Health is the major variable.", bettingAngles:["Health monitor every week","OVER when active","Fade when on injury report"] },
  "Travis Kelce":       { pos:"TE", team:"KAN", tier:"ELITE",  ydsPg:50.1,  rec2025:{g:17,tgt:108,rec:76,yds:851,td:4,recPg:4.5,ydsPg:50.1,ypr:11.2},    props:{rec:{floor:3,ceil:7,lean:"OVER — Mahomes always finds him"},td:{pg:0.24,lean:"Moderate — age 37"}}, situation:"Chiefs TE1. Age 37. Declining but Mahomes keeps him relevant.", bettingAngles:["Catches OVER when Mahomes healthy","FADE receiving yards — 50 is the real base","Monitor usage"] },
  "Tyler Warren":       { pos:"TE", team:"IND", tier:"ELITE",  ydsPg:48.1,  rec2025:{g:17,tgt:112,rec:76,yds:817,td:5,recPg:4.5,ydsPg:48.1,ypr:10.7},    props:{rec:{floor:3,ceil:7,lean:"OVER"},td:{pg:0.29,lean:"OVER 0.5 favorable matchups"}}, situation:"Colts TE1. Elite rookie season. Richardson health key.", bettingAngles:["Catches OVER every week","Receiving yards OVER","Year 2 with Richardson"] },
};

export const NFL_POSITIONS = ["ALL", "RB", "WR", "TE"];

export const NFL_PROP_GUIDE = [
  { player:"James Cook",    pos:"RB", team:"BUF", propType:"RUSH YDS", line:"115.5", floor:80,  ceil:150, lean:"OVER — 112.3 avg, elite workload",         leanClass:"lean-over" },
  { player:"Puka Nacua",    pos:"WR", team:"LAR", propType:"REC YDS",  line:"85.5",  floor:75,  ceil:140, lean:"OVER — 107.2 yds/g leads NFL",              leanClass:"lean-over" },
  { player:"Trey McBride",  pos:"TE", team:"ARI", propType:"CATCHES",  line:"6.5",   floor:5,   ceil:10,  lean:"OVER — 7.4/g is historic TE production",    leanClass:"lean-over" },
  { player:"Ja'Marr Chase", pos:"WR", team:"CIN", propType:"REC YDS",  line:"75.5",  floor:65,  ceil:125, lean:"OVER when Burrow healthy",                  leanClass:"lean-over" },
  { player:"Derrick Henry", pos:"RB", team:"BAL", propType:"RUSH TDs", line:"0.5",   floor:0,   ceil:2,   lean:"OVER — 0.94 TDs/g is elite",               leanClass:"lean-over" },
  { player:"Travis Kelce",  pos:"TE", team:"KAN", propType:"REC YDS",  line:"52.5",  floor:35,  ceil:80,  lean:"FADE — real floor ~50, market overprices",  leanClass:"lean-fade" },
];

export function buildNflContext() {
  return Object.entries(NFL_PLAYERS).map(([name, p]) => {
    const tdPg = p.props.td?.pg !== undefined ? `${p.props.td.pg} TDs/g` : "";
    const total = p.rec2025.td !== undefined ? `${p.rec2025.td} total TDs` : "";
    const games = p.rec2025.g !== undefined ? `${p.rec2025.g}g` : "";
    const tdLean = p.props.td?.lean || "—";
    const yLean = p.props.recYds?.lean || p.props.rec?.lean || "—";
    const recPg = p.rec2025.recPg !== undefined ? `, ${p.rec2025.recPg} rec/g` : "";
    const tgt = p.rec2025.tgt !== undefined ? `, ${p.rec2025.tgt} tgt` : "";
    const ypr = p.rec2025.ypr !== undefined ? `, ${p.rec2025.ypr} ypr` : "";
    return [
      `${name} | ${p.pos} | ${p.team} | ${p.tier}`,
      `  Stats: ${p.ydsPg} yds/g, ${total} in ${games}${recPg}${tgt}${ypr}`,
      `  TD rate: ${tdPg || "n/a"} | TD lean: ${tdLean}`,
      `  Volume lean: ${yLean}`,
      `  Situation: ${p.situation}`,
      `  Angles: ${p.bettingAngles.join(" | ")}`,
    ].join("\n");
  }).join("\n\n");
}
