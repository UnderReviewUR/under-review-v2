/**
 * F1 Circuit Intelligence Database
 * In-memory database keyed by circuit_short_name (OpenF1 field).
 * Covers all 2026-season venues with betting-relevant characteristics.
 */

export const CIRCUIT_DB = {
  // ── Bahrain ───────────────────────────────────────────────────────────────
  Bahrain: {
    name: "Bahrain International Circuit",
    location: "Sakhir, Bahrain",
    type: "traditional",
    characteristics: ["high tire deg", "hot temps", "technical sector 2", "good overtaking"],
    avgQualGap: 0.8,
    avgPitStops: 2,
    safetyCar: "medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Mercedes 2026", last5: ["Mercedes", "Red Bull", "Mercedes", "Red Bull", "Mercedes"] },
    winner: { pattern: "Mercedes dominant in new regs", last5: ["Mercedes", "Red Bull", "Red Bull", "Red Bull", "Mercedes"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "medium" },
    bettingAngles: [
      "High deg favors teams with tire management (Mercedes, Ferrari history)",
      "Night-to-day temp swing creates 2nd stint pace shift — back teams with hard tire pace",
      "SC probability medium — pit stop timing critical for position",
    ],
    overtakingDifficulty: "easy",
    circuitLength: 5.412,
    laps: 57,
  },

  // ── Jeddah / Saudi Arabia ─────────────────────────────────────────────────
  Jeddah: {
    name: "Jeddah Corniche Circuit",
    location: "Jeddah, Saudi Arabia",
    type: "street",
    characteristics: ["high speed", "narrow", "wall proximity", "low grip", "VSC/SC likely"],
    avgQualGap: 0.5,
    avgPitStops: 1,
    safetyCar: "high",
    tireStrategy: { dominant: "1-stop", compounds: ["medium", "hard"], deg: "low-medium" },
    poleSitter: { pattern: "Low downforce cars shine", last5: ["Red Bull", "Red Bull", "Ferrari", "Red Bull", "Red Bull"] },
    winner: { pattern: "Track position crucial — pole advantage high", last5: ["Red Bull", "Red Bull", "Verstappen", "Leclerc", "Hamilton"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "high", downforceDemand: "low" },
    bettingAngles: [
      "Pole-to-win conversion among highest on calendar — qualifying bet is key",
      "SC/VSC almost guaranteed — randomizes race, value on midfield points finish props",
      "Street circuit: favour driver skill over car, variance plays are live",
      "Low tire deg → 1-stop viable → fewer strategic swings",
    ],
    overtakingDifficulty: "hard",
    circuitLength: 6.174,
    laps: 50,
  },

  // ── Albert Park / Australia ───────────────────────────────────────────────
  "Albert Park": {
    name: "Albert Park Circuit",
    location: "Melbourne, Australia",
    type: "street",
    characteristics: ["semi-street", "high SC rate", "smooth surface", "low deg"],
    avgQualGap: 0.6,
    avgPitStops: 1.5,
    safetyCar: "high",
    tireStrategy: { dominant: "1-2 stop", compounds: ["soft", "medium"], deg: "low" },
    poleSitter: { pattern: "Mixed", last5: ["Red Bull", "Ferrari", "Mercedes", "Ferrari", "Hamilton"] },
    winner: { pattern: "SC disrupts race — position swing likely", last5: ["Red Bull", "Sainz", "Verstappen", "Leclerc", "Hamilton"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "medium", downforceDemand: "medium" },
    bettingAngles: [
      "Safety car almost guaranteed at Melbourne — SC timing swing is the race",
      "Soft tire opening lap matters — track evolves quickly",
      "Value on midfield drivers at this circuit — top teams don't always dominate",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.278,
    laps: 58,
  },

  // ── Suzuka / Japan ────────────────────────────────────────────────────────
  Suzuka: {
    name: "Suzuka International Racing Course",
    location: "Suzuka, Japan",
    type: "traditional",
    characteristics: ["technical", "high downforce", "driver's circuit", "weather variable"],
    avgQualGap: 0.7,
    avgPitStops: 1.5,
    safetyCar: "low",
    tireStrategy: { dominant: "1-stop", compounds: ["medium", "hard"], deg: "medium" },
    poleSitter: { pattern: "Technical setup advantage", last5: ["Red Bull", "Red Bull", "Leclerc", "Red Bull", "Bottas"] },
    winner: { pattern: "High skill track — favors elite drivers", last5: ["Red Bull", "Verstappen", "Verstappen", "Verstappen", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "high" },
    bettingAngles: [
      "Suzuka rewards driver skill — favour elite drivers (Verstappen historically dominant here)",
      "High downforce track — 2026 Mercedes should shine in new regulation cycle",
      "Weather risk in Japan — wet race creates massive variance, fade heavy favourites if rain predicted",
      "Low overtaking — qualifying position critical, pole advantage significant",
    ],
    overtakingDifficulty: "hard",
    circuitLength: 5.807,
    laps: 53,
  },

  // ── Shanghai / China ──────────────────────────────────────────────────────
  Shanghai: {
    name: "Shanghai International Circuit",
    location: "Shanghai, China",
    type: "traditional",
    characteristics: ["long straight", "technical infield", "high deg", "cool temps"],
    avgQualGap: 0.9,
    avgPitStops: 2,
    safetyCar: "low-medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Power-sensitive", last5: ["Red Bull", "Red Bull", "Hamilton", "Hamilton", "Rosberg"] },
    winner: { pattern: "Tire strategy determines outcome", last5: ["Red Bull", "Verstappen", "Hamilton", "Vettel", "Rosberg"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "high", downforceDemand: "medium" },
    bettingAngles: [
      "High deg = 2-stop. Teams with superior tire management (Mercedes 2026) have structural edge",
      "Long back straight rewards power — 2026 Mercedes engine advantage plays out here",
      "Cool ambient temps reduce deg risk for harder compounds",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.451,
    laps: 56,
  },

  // ── Miami ─────────────────────────────────────────────────────────────────
  Miami: {
    name: "Miami International Autodrome",
    location: "Miami, Florida, USA",
    type: "street",
    characteristics: ["street", "high deg", "humid", "safety car prone", "bumpy"],
    avgQualGap: 0.7,
    avgPitStops: 2,
    safetyCar: "high",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Mixed — variance venue", last5: ["Red Bull", "Verstappen", "Leclerc", "Sainz", "Verstappen"] },
    winner: { pattern: "SC creates variance — value in midfield", last5: ["Verstappen", "Norris", "Leclerc", "Verstappen", "Verstappen"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "medium", downforceDemand: "medium" },
    bettingAngles: [
      "Miami has the highest SC rate in recent seasons — underdog value is strong",
      "Humidity and heat drive high deg — 2-stop dominant, pit window crucial",
      "Sprint weekend adds variance — qualify bet vs race bet diverge significantly",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.412,
    laps: 57,
  },

  // ── Imola / Emilia-Romagna ────────────────────────────────────────────────
  Imola: {
    name: "Autodromo Enzo e Dino Ferrari",
    location: "Imola, Italy",
    type: "traditional",
    characteristics: ["narrow", "low overtaking", "technical", "tifosi crowd"],
    avgQualGap: 0.8,
    avgPitStops: 1,
    safetyCar: "medium",
    tireStrategy: { dominant: "1-stop", compounds: ["medium", "hard"], deg: "medium" },
    poleSitter: { pattern: "Ferrari home advantage narrative (fans not data)", last5: ["Verstappen", "Verstappen", "Bottas", "Hamilton", "Hamilton"] },
    winner: { pattern: "Pole dominates — limited overtaking", last5: ["Verstappen", "Verstappen", "Verstappen", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "high" },
    bettingAngles: [
      "Imola is a qualifying track — pole position win rate very high",
      "Limited overtaking: fade race winner bets on drivers who qualify poorly",
      "SC disrupts — when it occurs, it randomises, especially with undercut",
    ],
    overtakingDifficulty: "very hard",
    circuitLength: 4.909,
    laps: 63,
  },

  // ── Monaco ────────────────────────────────────────────────────────────────
  Monaco: {
    name: "Circuit de Monaco",
    location: "Monte Carlo, Monaco",
    type: "street",
    characteristics: ["slowest circuit", "tight barriers", "no overtaking", "glamour", "SC near certain"],
    avgQualGap: 0.5,
    avgPitStops: 1,
    safetyCar: "very high",
    tireStrategy: { dominant: "1-stop", compounds: ["soft", "medium"], deg: "very low" },
    poleSitter: { pattern: "Pole = win at Monaco", last5: ["Leclerc", "Verstappen", "Verstappen", "Leclerc", "Hamilton"] },
    winner: { pattern: "Whoever qualifies P1 almost certainly wins", last5: ["Leclerc", "Verstappen", "Verstappen", "Leclerc", "Hamilton"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "very low", downforceDemand: "very high" },
    bettingAngles: [
      "Monaco pole = win — race winner prop is a qualifying bet",
      "ANY rain or SC completely reshuffles cards — watch forecast obsessively",
      "Qualifying pace is everything — driver skill > car pace more than any other round",
      "Fade pole winner only if rain is >50% likely — otherwise chalk",
      "SC near certain: value on Q1/Q2 exits surviving — midfield points finish props",
    ],
    overtakingDifficulty: "nearly impossible",
    circuitLength: 3.337,
    laps: 78,
  },

  // ── Barcelona / Spain ─────────────────────────────────────────────────────
  Catalunya: {
    name: "Circuit de Barcelona-Catalunya",
    location: "Barcelona, Spain",
    type: "traditional",
    characteristics: ["technical", "high deg", "test track", "well-known"],
    avgQualGap: 0.9,
    avgPitStops: 2,
    safetyCar: "low",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Dominant car shows its baseline here", last5: ["Verstappen", "Verstappen", "Hamilton", "Hamilton", "Hamilton"] },
    winner: { pattern: "Best car wins — very clean racing", last5: ["Verstappen", "Verstappen", "Hamilton", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "high" },
    bettingAngles: [
      "Barcelona is the reference track — best car wins. Back the championship leader",
      "High downforce track + 2026 Mercedes power = structural Mercedes advantage",
      "2-stop: tire compound choice at 2nd stop determines outcome",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 4.657,
    laps: 66,
  },

  // ── Montreal / Canada ─────────────────────────────────────────────────────
  Villeneuve: {
    name: "Circuit Gilles Villeneuve",
    location: "Montreal, Canada",
    type: "street",
    characteristics: ["stop-start", "street/traditional hybrid", "high SC rate", "cool temps", "wall of champions"],
    avgQualGap: 0.7,
    avgPitStops: 1.5,
    safetyCar: "very high",
    tireStrategy: { dominant: "1-stop with variable SC offset", compounds: ["medium", "hard"], deg: "low-medium" },
    poleSitter: { pattern: "Mixed — engine power critical", last5: ["Verstappen", "Alonso", "Verstappen", "Verstappen", "Hamilton"] },
    winner: { pattern: "SC disrupts almost every year", last5: ["Verstappen", "Alonso", "Verstappen", "Verstappen", "Hamilton"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "high", downforceDemand: "low" },
    bettingAngles: [
      "Montreal SC rate is near 100% — race result often split from qualifying order",
      "Engine power: long straights reward 2026 Mercedes power unit",
      "Cool temps = low deg = 1-stop dominant — undercut at SC restart is the move",
      "Back value drivers: track historically throws up upset winners",
    ],
    overtakingDifficulty: "easy",
    circuitLength: 4.361,
    laps: 70,
  },

  // ── Red Bull Ring / Austria ───────────────────────────────────────────────
  "Red Bull Ring": {
    name: "Red Bull Ring",
    location: "Spielberg, Austria",
    type: "power",
    characteristics: ["short", "power sensitive", "altitude", "fast", "sprint weekend likely"],
    avgQualGap: 0.6,
    avgPitStops: 1.5,
    safetyCar: "medium",
    tireStrategy: { dominant: "1-2 stop", compounds: ["soft", "medium"], deg: "medium" },
    poleSitter: { pattern: "Power + aero combo wins quali", last5: ["Verstappen", "Verstappen", "Leclerc", "Verstappen", "Bottas"] },
    winner: { pattern: "Red Bull home circuit — historically dominant (but 2026 changed regs)", last5: ["Verstappen", "Verstappen", "Leclerc", "Sainz", "Bottas"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "very high", downforceDemand: "low" },
    bettingAngles: [
      "Power circuit — 2026 Mercedes power unit should shine here",
      "Altitude (670m) affects engine performance — back teams with efficient power unit",
      "Short lap = more SC risk per lap distance",
      "Red Bull home race: crowd but home advantage advantage debatable in 2026",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 4.318,
    laps: 71,
  },

  // ── Silverstone / Britain ─────────────────────────────────────────────────
  Silverstone: {
    name: "Silverstone Circuit",
    location: "Northamptonshire, UK",
    type: "traditional",
    characteristics: ["high speed", "power sensitive", "medium downforce", "weather risk", "Hamilton home"],
    avgQualGap: 0.9,
    avgPitStops: 2,
    safetyCar: "low-medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Hamilton legendary here", last5: ["Verstappen", "Verstappen", "Hamilton", "Hamilton", "Hamilton"] },
    winner: { pattern: "High speed favors power + aero balance", last5: ["Hamilton", "Hamilton", "Verstappen", "Hamilton", "Sainz"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "high", downforceDemand: "medium" },
    bettingAngles: [
      "Silverstone is a power track — 2026 Mercedes advantage is significant here",
      "Hamilton home race: Mercedes + Hamilton on home soil is the narrative bet",
      "High deg (especially front-left) — 2-stop dominant, undercut viable",
      "Weather risk: British weather can randomize results — watch morning forecast",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.891,
    laps: 52,
  },

  // ── Spa / Belgium ─────────────────────────────────────────────────────────
  Spa: {
    name: "Circuit de Spa-Francorchamps",
    location: "Spa, Belgium",
    type: "power",
    characteristics: ["longest circuit", "high speed", "Eau Rouge", "weather unpredictable", "power sensitive"],
    avgQualGap: 1.2,
    avgPitStops: 2,
    safetyCar: "medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Power + low downforce = Red Bull (historically)", last5: ["Verstappen", "Leclerc", "Verstappen", "Hamilton", "Hamilton"] },
    winner: { pattern: "Power track: dominant car wins from pole usually", last5: ["Verstappen", "Verstappen", "Verstappen", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "very high", downforceDemand: "low" },
    bettingAngles: [
      "Spa is THE power circuit — 2026 Mercedes advantage maximised here",
      "Qualifying gap wider here (1.2s) — top teams more separated from field",
      "Weather: Spa can have rain on one part of circuit and dry another — strategy chaos",
      "Sprint weekend sometimes here — qualifier result diverges from race result",
    ],
    overtakingDifficulty: "easy",
    circuitLength: 7.004,
    laps: 44,
  },

  // ── Hungaroring / Hungary ─────────────────────────────────────────────────
  Hungaroring: {
    name: "Hungaroring",
    location: "Budapest, Hungary",
    type: "high-downforce",
    characteristics: ["tight", "technical", "no overtaking", "high downforce", "hot temps"],
    avgQualGap: 0.9,
    avgPitStops: 2,
    safetyCar: "low",
    tireStrategy: { dominant: "2-stop", compounds: ["soft", "medium"], deg: "high" },
    poleSitter: { pattern: "High downforce cars dominate quali", last5: ["Verstappen", "Russell", "Verstappen", "Hamilton", "Hamilton"] },
    winner: { pattern: "Qualifying very important — hard to pass", last5: ["Piastri", "Hamilton", "Verstappen", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "low", downforceDemand: "very high" },
    bettingAngles: [
      "Monaco-like in difficulty to pass — pole advantage is critical",
      "Hot temps + high deg = tire management is the race",
      "High downforce track: favors technical/aero-efficient cars",
      "2026 Mercedes high-downforce setup should suit Hungaroring well",
    ],
    overtakingDifficulty: "very hard",
    circuitLength: 4.381,
    laps: 70,
  },

  // ── Zandvoort / Netherlands ───────────────────────────────────────────────
  Zandvoort: {
    name: "Circuit Zandvoort",
    location: "Zandvoort, Netherlands",
    type: "high-downforce",
    characteristics: ["banked turns", "tight", "limited overtaking", "wind-affected", "Verstappen home"],
    avgQualGap: 0.7,
    avgPitStops: 2,
    safetyCar: "medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Verstappen dominant here (home race emotion)", last5: ["Verstappen", "Verstappen", "Verstappen", "Hamilton", "Hamilton"] },
    winner: { pattern: "Qualifying key — limited overtaking", last5: ["Verstappen", "Verstappen", "Verstappen", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "high" },
    bettingAngles: [
      "Zandvoort is Verstappen's home race — 3 straight wins here. BUT Red Bull fallen in 2026",
      "High banked turns require specific setup — teams with aero versatility shine",
      "Verstappen at home: emotional narrative bet, check his 2026 pace vs 2023-24",
      "Fade Norris/McLaren if their 2026 setup struggles with high-downforce configs",
    ],
    overtakingDifficulty: "hard",
    circuitLength: 4.259,
    laps: 72,
  },

  // ── Monza / Italy ─────────────────────────────────────────────────────────
  Monza: {
    name: "Autodromo Nazionale Monza",
    location: "Monza, Italy",
    type: "power",
    characteristics: ["lowest downforce", "highest speed", "power sensitive", "chicanes", "tifosi"],
    avgQualGap: 0.5,
    avgPitStops: 1,
    safetyCar: "medium",
    tireStrategy: { dominant: "1-stop", compounds: ["soft", "medium"], deg: "low" },
    poleSitter: { pattern: "Power unit quality determines quali", last5: ["Leclerc", "Verstappen", "Verstappen", "Hamilton", "Leclerc"] },
    winner: { pattern: "Engine power is decisive — Mercedes power unit era historically dominant", last5: ["Leclerc", "Verstappen", "Verstappen", "Gasly", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "maximum", downforceDemand: "very low" },
    bettingAngles: [
      "Monza is THE engine circuit — 2026 Mercedes power unit makes this their home advantage",
      "Lowest downforce of the season — qualifying gap compressed, slipstream effects huge",
      "Slipstream qualifying: pole may not start from fastest car in race conditions",
      "1-stop viable: tire management secondary to outright power and drag reduction",
      "SC risk from chicane incidents — Leclerc historically performs well at home (Ferrari tifosi)",
    ],
    overtakingDifficulty: "easy",
    circuitLength: 5.793,
    laps: 53,
  },

  // ── Baku / Azerbaijan ─────────────────────────────────────────────────────
  Baku: {
    name: "Baku City Circuit",
    location: "Baku, Azerbaijan",
    type: "street",
    characteristics: ["longest street circuit", "very high speed", "safety car likely", "narrow old town", "variable"],
    avgQualGap: 0.6,
    avgPitStops: 1.5,
    safetyCar: "very high",
    tireStrategy: { dominant: "1-2 stop variable", compounds: ["soft", "medium"], deg: "low-medium" },
    poleSitter: { pattern: "Leclerc (Ferrari) strong here historically", last5: ["Leclerc", "Verstappen", "Leclerc", "Leclerc", "Hamilton"] },
    winner: { pattern: "SC creates race reset — chaos track", last5: ["Piastri", "Leclerc", "Verstappen", "Perez", "Leclerc"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "high", downforceDemand: "low" },
    bettingAngles: [
      "Baku SC rate among the highest on calendar — chaos race bets live",
      "Leclerc has historically been exceptional here — check his 2026 Ferrari form",
      "Power sensitive: long straight (2.2km) rewards engine power",
      "SC timing swing: undercut/overcut at safety car window often determines winner",
      "High variance: fade short-priced favourites, back podium value bets",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 6.003,
    laps: 51,
  },

  // ── Marina Bay / Singapore ────────────────────────────────────────────────
  "Marina Bay": {
    name: "Marina Bay Street Circuit",
    location: "Singapore",
    type: "street",
    characteristics: ["night race", "highest deg", "SC near certain", "extreme humidity", "driver endurance"],
    avgQualGap: 0.8,
    avgPitStops: 2,
    safetyCar: "very high",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "very high" },
    poleSitter: { pattern: "Mixed — street specialist + technical setup", last5: ["Norris", "Sainz", "Leclerc", "Verstappen", "Hamilton"] },
    winner: { pattern: "SC disrupts almost every year", last5: ["Norris", "Sainz", "Verstappen", "Perez", "Hamilton"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "low", downforceDemand: "very high" },
    bettingAngles: [
      "Singapore always has safety car — race reset means track position gamble at stop",
      "Night race in 40°C heat + extreme humidity: driver fitness angle",
      "Highest tire deg on calendar: 2-stop dominant, which teams have superior deg management",
      "Street specialist advantage: Leclerc, Sainz, Hamilton historically strong",
    ],
    overtakingDifficulty: "very hard",
    circuitLength: 5.063,
    laps: 62,
  },

  // ── COTA / USA ────────────────────────────────────────────────────────────
  COTA: {
    name: "Circuit of the Americas",
    location: "Austin, Texas, USA",
    type: "traditional",
    characteristics: ["technical", "high downforce", "variable weather", "bumpy", "elevation changes"],
    avgQualGap: 0.9,
    avgPitStops: 2,
    safetyCar: "medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "high" },
    poleSitter: { pattern: "Dominant car package wins here", last5: ["Verstappen", "Verstappen", "Hamilton", "Hamilton", "Bottas"] },
    winner: { pattern: "Best car wins — clean track for baseline speed", last5: ["Verstappen", "Sainz", "Verstappen", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "high" },
    bettingAngles: [
      "COTA rewards raw car performance + aero efficiency",
      "Sprint weekend sometimes: sprint and race bets can diverge",
      "High deg: 2-stop teams with good tire management win races here",
      "Weather risk: Texas weather can change — rain creates chaos",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.513,
    laps: 56,
  },

  // ── Hermanos Rodriguez / Mexico ───────────────────────────────────────────
  "Hermanos Rodriguez": {
    name: "Autodromo Hermanos Rodriguez",
    location: "Mexico City, Mexico",
    type: "traditional",
    characteristics: ["high altitude (2285m)", "thin air", "low downforce effective", "engine stress", "stadium section"],
    avgQualGap: 0.8,
    avgPitStops: 1,
    safetyCar: "low-medium",
    tireStrategy: { dominant: "1-stop", compounds: ["medium", "hard"], deg: "low" },
    poleSitter: { pattern: "Low drag, high engine output", last5: ["Verstappen", "Verstappen", "Hamilton", "Verstappen", "Hamilton"] },
    winner: { pattern: "High altitude = power unit efficiency crucial", last5: ["Verstappen", "Verstappen", "Hamilton", "Verstappen", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "very high", downforceDemand: "low" },
    bettingAngles: [
      "High altitude (2285m): thinner air = downforce reduced, engine breathing harder",
      "Teams with efficient power units at altitude have big advantage — 2026 Mercedes unit",
      "Low deg at altitude → 1-stop race → strategic variance reduced",
      "Verstappen historically dominant here (5 wins) — BUT check Red Bull 2026 pace",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 4.304,
    laps: 71,
  },

  // ── Interlagos / Brazil ───────────────────────────────────────────────────
  Interlagos: {
    name: "Autodromo Jose Carlos Pace",
    location: "São Paulo, Brazil",
    type: "traditional",
    characteristics: ["anti-clockwise", "rain risk", "altitude", "chaotic historically"],
    avgQualGap: 0.8,
    avgPitStops: 2,
    safetyCar: "high",
    tireStrategy: { dominant: "variable — weather dependent", compounds: ["medium", "hard"], deg: "medium" },
    poleSitter: { pattern: "Mixed — weather intervenes often", last5: ["Verstappen", "Alonso", "Hamilton", "Russell", "Bottas"] },
    winner: { pattern: "Weather creates chaos annually — big upsets common", last5: ["Verstappen", "Verstappen", "Verstappen", "Hamilton", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "medium" },
    bettingAngles: [
      "Interlagos rain risk is very high — value on wet specialists or chaos bets",
      "Sprint weekend candidate: sprint + race can produce different leaders",
      "Anti-clockwise layout: some drivers historically stronger",
      "When dry, mid-race tyre windows critical for position swings",
    ],
    overtakingDifficulty: "easy",
    circuitLength: 4.309,
    laps: 71,
  },

  // ── Las Vegas ─────────────────────────────────────────────────────────────
  "Las Vegas": {
    name: "Las Vegas Strip Circuit",
    location: "Las Vegas, Nevada, USA",
    type: "street",
    characteristics: ["night race", "very cold temps", "long straight", "power circuit", "new circuit"],
    avgQualGap: 0.6,
    avgPitStops: 2,
    safetyCar: "medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "medium-high" },
    poleSitter: { pattern: "Power + straight line speed", last5: ["Leclerc", "Verstappen", "—", "—", "—"] },
    winner: { pattern: "Very cold temps cause high deg — strategy key", last5: ["Verstappen", "Leclerc", "—", "—", "—"] },
    keyDrivers: { streetSpecialist: true, powerBenefit: "high", downforceDemand: "low" },
    bettingAngles: [
      "Cold night temps (5-10°C) mean tires struggle to heat — deg elevated",
      "Massive power sensitivity: 1.2km straight rewards 2026 Mercedes unit",
      "Limited racing history (2023 debut) — historical patterns thin, value in variance",
      "Entertainment venue: race atmosphere but also abrasive surface that spikes deg",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 6.201,
    laps: 50,
  },

  // ── Lusail / Qatar ────────────────────────────────────────────────────────
  Lusail: {
    name: "Lusail International Circuit",
    location: "Lusail, Qatar",
    type: "high-downforce",
    characteristics: ["high-speed", "high deg", "night race", "dusty", "abrasive"],
    avgQualGap: 0.7,
    avgPitStops: 3,
    safetyCar: "medium",
    tireStrategy: { dominant: "3-stop", compounds: ["soft", "medium"], deg: "very high" },
    poleSitter: { pattern: "High downforce package wins", last5: ["Verstappen", "Verstappen", "Hamilton", "—", "—"] },
    winner: { pattern: "Highest deg on calendar — tire strategy is everything", last5: ["Verstappen", "Verstappen", "Hamilton", "—", "—"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "very high" },
    bettingAngles: [
      "Qatar: HIGHEST tire degradation on calendar — 3-stop is the norm",
      "Teams with superior tire management have enormous structural advantage",
      "Night race + dusty surface = grip evolution through race window",
      "Sprint race if applicable: very different tire usage from full race distance",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.419,
    laps: 57,
  },

  // ── Yas Marina / Abu Dhabi ────────────────────────────────────────────────
  "Yas Marina": {
    name: "Yas Marina Circuit",
    location: "Abu Dhabi, UAE",
    type: "traditional",
    characteristics: ["season finale", "twilight race", "revised layout", "medium deg", "championship decider"],
    avgQualGap: 0.8,
    avgPitStops: 2,
    safetyCar: "low-medium",
    tireStrategy: { dominant: "2-stop", compounds: ["medium", "hard"], deg: "medium" },
    poleSitter: { pattern: "Dominant car clean-sweeps season finale", last5: ["Verstappen", "Verstappen", "Verstappen", "Hamilton", "Verstappen"] },
    winner: { pattern: "Season finale — championship context determines strategy", last5: ["Verstappen", "Verstappen", "Verstappen", "Verstappen", "Hamilton"] },
    keyDrivers: { streetSpecialist: false, powerBenefit: "medium", downforceDemand: "medium" },
    bettingAngles: [
      "Season finale: championship context affects team strategy (title fight vs consolidation)",
      "Twilight race: track temp drops through session, later compounds perform differently",
      "Revised 2021 layout: more overtaking opportunities, less processional",
      "Back championship leader to control race — fastest pit wall pace to manage title",
    ],
    overtakingDifficulty: "medium",
    circuitLength: 5.281,
    laps: 58,
  },
};

/**
 * Look up circuit data by OpenF1 circuit_short_name or meeting location.
 * Returns null if not found.
 * @param {string|null|undefined} circuitShortName
 * @param {string|null|undefined} location
 * @returns {object|null}
 */
export function getCircuitInfo(circuitShortName, location) {
  if (circuitShortName && CIRCUIT_DB[circuitShortName]) {
    return CIRCUIT_DB[circuitShortName];
  }
  if (location) {
    const loc = String(location).toLowerCase();
    const entry = Object.entries(CIRCUIT_DB).find(([key, val]) =>
      loc.includes(key.toLowerCase()) ||
      String(val.location).toLowerCase().includes(loc) ||
      String(val.name).toLowerCase().includes(loc)
    );
    if (entry) return entry[1];
  }
  return null;
}

/**
 * Summarise circuit info for inclusion in AI system prompt.
 * @param {object} circuit
 * @param {string} raceName
 * @returns {string}
 */
export function summariseCircuit(circuit, raceName) {
  if (!circuit) return "";
  const lines = [
    `CIRCUIT: ${raceName || circuit.name} (${circuit.location})`,
    `Type: ${circuit.type.toUpperCase()} | Overtaking: ${circuit.overtakingDifficulty} | Length: ${circuit.circuitLength}km × ${circuit.laps} laps`,
    `Power benefit: ${circuit.keyDrivers.powerBenefit} | Downforce demand: ${circuit.keyDrivers.downforceDemand} | Street specialist: ${circuit.keyDrivers.streetSpecialist ? "YES" : "NO"}`,
    `Safety car: ${circuit.safetyCar} probability | Avg pit stops: ${circuit.avgPitStops}`,
    `Tire strategy: ${circuit.tireStrategy.dominant} (${circuit.tireStrategy.deg} deg) — ${circuit.tireStrategy.compounds.join("/")}`,
    `Key characteristics: ${circuit.characteristics.join(", ")}`,
    `Historical winner pattern: ${circuit.winner.pattern}`,
    `Historical pole pattern: ${circuit.poleSitter.pattern}`,
    `BETTING ANGLES:`,
    ...circuit.bettingAngles.map(a => `  • ${a}`),
  ];
  return lines.join("\n");
}
