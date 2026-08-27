/**
 * Trusted football transfer reporters + topic keywords for alert scoring.
 * Rumors OK; bylines from this list (or clear source tags) are the quality gate.
 */

/** @typedef {{ id: string, names: string[], outlets?: string[], tier: 1 | 2 | 3, barca?: boolean }} Reporter */

/** Tier 1 = Ornstein-class; Tier 2 = strong wire; Tier 3 = useful club beat. */
export const TRUSTED_REPORTERS = /** @type {Reporter[]} */ ([
  {
    id: "ornstein",
    names: ["David Ornstein", "Ornstein"],
    outlets: ["The Athletic"],
    tier: 1,
  },
  {
    id: "romano",
    names: ["Fabrizio Romano"],
    outlets: ["Here We Go"],
    tier: 1,
  },
  {
    id: "di_marzio",
    names: ["Gianluca Di Marzio", "Di Marzio"],
    outlets: ["Sky Italia"],
    tier: 1,
  },
  {
    id: "marcotti",
    names: ["Gabriele Marcotti", "Marcotti"],
    outlets: ["ESPN"],
    tier: 2,
  },
  {
    id: "jacobs",
    names: ["Ben Jacobs"],
    outlets: ["Sky Sports"],
    tier: 2,
  },
  {
    id: "law",
    names: ["Matt Law"],
    outlets: ["Telegraph"],
    tier: 2,
  },
  {
    id: "benge",
    names: ["James Benge"],
    outlets: ["The Athletic"],
    tier: 2,
    barca: true,
  },
  {
    id: "marsden",
    names: ["Sam Marsden"],
    outlets: ["ESPN"],
    tier: 2,
    barca: true,
  },
  {
    id: "johnson",
    names: ["Jonathan Johnson"],
    outlets: ["CBS Sports", "CBS"],
    tier: 2,
    barca: true,
  },
  {
    id: "lowe",
    names: ["Sid Lowe"],
    outlets: ["Guardian", "The Guardian"],
    tier: 2,
    barca: true,
  },
  {
    id: "westwood",
    names: ["James Westwood"],
    outlets: ["Football España", "Football Espana"],
    tier: 2,
    barca: true,
  },
  {
    id: "ballus",
    names: ["Pol Ballús", "Pol Ballus"],
    outlets: ["The Athletic"],
    tier: 2,
    barca: true,
  },
  {
    id: "schira",
    names: ["Nicolo Schira", "Nicolò Schira"],
    outlets: [],
    tier: 2,
  },
  {
    id: "pedulla",
    names: ["Alfredo Pedullà", "Alfredo Pedulla", "Pedulla"],
    outlets: [],
    tier: 2,
  },
  {
    id: "orourke",
    names: ["Pete O'Rourke", "Pete O’Rourke"],
    outlets: ["Football Insider"],
    tier: 2,
  },
  {
    id: "whitwell",
    names: ["Laurie Whitwell"],
    outlets: ["The Athletic"],
    tier: 2,
  },
  {
    id: "jackson",
    names: ["Jamie Jackson"],
    outlets: ["Guardian", "The Guardian"],
    tier: 2,
  },
  {
    id: "de_menezes",
    names: ["Jack de Menezes"],
    outlets: ["Independent"],
    tier: 3,
  },
  {
    id: "stone",
    names: ["Simon Stone"],
    outlets: ["BBC"],
    tier: 2,
  },
  {
    id: "roan",
    names: ["Dan Roan"],
    outlets: ["BBC"],
    tier: 2,
  },
  {
    id: "delaney",
    names: ["Miguel Delaney"],
    outlets: ["Independent"],
    tier: 2,
  },
  {
    id: "carnerero",
    names: ["Fernando Carnerero"],
    outlets: ["Marca"],
    tier: 3,
    barca: true,
  },
  {
    id: "tomàs",
    names: ["Toni Torrecillas", "Sergi Solé", "Roger Xica"],
    outlets: ["Mundo Deportivo", "Sport"],
    tier: 3,
    barca: true,
  },
]);

/** Strong transfer language — weak words like "target" alone are too noisy. */
export const TRANSFER_KEYWORDS = [
  "transfer",
  "transfers",
  "signing",
  "signed",
  "signs",
  "bid",
  "bids",
  "offer",
  "offered",
  "loan",
  "loans",
  "medical",
  "here we go",
  "here we go!",
  "agreement",
  "agreed",
  "personal terms",
  "release clause",
  "contract extension",
  "extension",
  "renewal",
  "departure",
  "sold",
  "swap deal",
  "option to buy",
  "set to join",
  "set to sign",
  "move for",
  "nearing",
  "fee",
];

/** Soft transfer hints — need a trusted byline or Barça + strong club context. */
export const SOFT_TRANSFER_KEYWORDS = [
  "deal",
  "talks",
  "interested",
  "enquiry",
  "inquiry",
  "approach",
  "close to",
  "target",
];

/** Barcelona / Barça surface — heavier weight in scoring. */
export const BARCA_KEYWORDS = [
  "barcelona",
  "barça",
  "barca",
  "fc barcelona",
  "fcb",
  "camp nou",
  "spotify camp nou",
  "laporta",
  "deco",
  "flick",
  "hansí flick",
  "hansi flick",
];

/** Rest of La Liga — welcome alongside Barça, without matching every Catalan feature. */
export const LA_LIGA_KEYWORDS = [
  "la liga",
  "laliga",
  "real madrid",
  "atletico",
  "atlético",
  "atleti",
  "sevilla",
  "villarreal",
  "real sociedad",
  "athletic club",
  "athletic bilbao",
  "real betis",
  "betis",
  "valencia",
  "girona",
  "celta",
  "osasuna",
  "getafe",
  "mallorca",
  "alaves",
  "alavés",
  "espanyol",
  "las palmas",
  "rayo vallecano",
  "leganes",
  "leganés",
];

/** Mega clubs — keep general top-of-market noise without drowning Barça. */
export const TOP_CLUB_KEYWORDS = [
  "barcelona",
  "real madrid",
  "manchester united",
  "man utd",
  "manchester city",
  "man city",
  "liverpool",
  "chelsea",
  "arsenal",
  "tottenham",
  "psg",
  "paris saint-germain",
  "bayern",
  "dortmund",
  "leverkusen",
  "rb leipzig",
  "juventus",
  "inter milan",
  "ac milan",
  "napoli",
  "roma",
  "atalanta",
  "monaco",
  "atletico",
  "atlético",
  "newcastle",
  "sevilla",
  "villarreal",
  "real sociedad",
  "athletic bilbao",
  "real betis",
  "valencia",
  "girona",
  "benfica",
  "sporting",
  "ajax",
];

export const PREMIER_LEAGUE_KEYWORDS = [
  "premier league",
  "manchester united",
  "man utd",
  "manchester city",
  "man city",
  "liverpool",
  "chelsea",
  "arsenal",
  "tottenham",
  "newcastle",
  "aston villa",
  "west ham",
  "brighton",
  "crystal palace",
  "everton",
  "wolves",
];

export const SERIE_A_KEYWORDS = [
  "serie a",
  "juventus",
  "inter milan",
  "ac milan",
  "napoli",
  "roma",
  "lazio",
  "atalanta",
  "fiorentina",
];

export const BUNDESLIGA_KEYWORDS = [
  "bundesliga",
  "bayern",
  "dortmund",
  "leipzig",
  "leverkusen",
  "bayer leverkusen",
];

export const LIGUE_1_KEYWORDS = [
  "ligue 1",
  "psg",
  "paris saint-germain",
  "monaco",
  "marseille",
];

export const UCL_KEYWORDS = [
  "champions league",
  "ucl",
  "uefa champions",
];

/**
 * When there is no trusted byline, title/source must hit one of these desks.
 * Keeps BBC/Sky/Athletic wires; drops Blaugranes-style aggregation.
 */
export const LEGIT_OUTLET_KEYWORDS = [
  "bbc",
  "the athletic",
  "athletic",
  "sky sports",
  "skysports",
  "the guardian",
  "guardian",
  "espn",
  "reuters",
  "associated press",
  "afp",
  "telegraph",
  "times",
  "independent",
  "marca",
  "mundo deportivo",
  "sport.es",
  "france 24",
  "cbs sports",
];
