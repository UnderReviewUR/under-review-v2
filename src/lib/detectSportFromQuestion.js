import { normalizeText } from "./normalizeText.js";

const SPORT_TABS = new Set(["nba", "mlb", "nfl", "golf", "tennis", "f1"]);

/** WTA-first names / signals — checked before ATP. */
const WTA_NAMES = [
  "sabalenka",
  "swiatek",
  "gauff",
  "coco gauff",
  "rybakina",
  "pegula",
  "paolini",
  "jabeur",
  "azarenka",
  "kvitova",
  "wta",
  "wimbledon women",
];

const ATP_HINT_NAMES = [
  "alcaraz",
  "sinner",
  "djokovic",
  "medvedev",
  "zverev",
  "tsitsipas",
  "fritz",
  "shelton",
  "de minaur",
  "rublev",
  "atp",
];

const NBA_TERMS = [
  "nba",
  "basketball",
  "pra",
  "points prop",
  "three-pointer",
  "three pointers",
  "rebounds",
  "lakers",
  "celtics",
  "spurs",
  "blazers",
  "trail blazers",
  "warriors",
  "heat",
  "knicks",
  "nuggets",
  "thunder",
  "magic",
  "pistons",
  "76ers",
  "sixers",
  "bucks",
  "suns",
  "mavericks",
  "mavs",
  "clippers",
  "nets",
  "bulls",
  "hawks",
  "cavaliers",
  "cavs",
  "rockets",
  "pacers",
  "hornets",
  "jazz",
  "kings",
  "grizzlies",
  "timberwolves",
  "wolves",
  "pelicans",
  "raptors",
  "wizards",
  "76",
];

const MLB_TERMS = [
  "mlb",
  "baseball",
  "strikeout",
  "strikeouts",
  "home run",
  "pitcher",
  "first pitch",
  "yankees",
  "dodgers",
  "red sox",
  "cubs",
  "mets",
  "braves",
  "astros",
  "phillies",
  "padres",
  "giants",
  "rangers",
  "orioles",
  "twins",
  "guardians",
  "tigers",
  "royals",
  "white sox",
  "angels",
  "mariners",
  "athletics",
  "rays",
  "blue jays",
  "marlins",
  "nationals",
  "rockies",
  "diamondbacks",
  "d-backs",
  "cardinals",
  "brewers",
  "reds",
  "pirates",
];

const NFL_TERMS = [
  "nfl",
  "football",
  "receiving yards",
  "rushing yards",
  "anytime td",
  "touchdown",
  "cowboys",
  "eagles",
  "chiefs",
  "49ers",
  "bills",
  "ravens",
  "lions",
  "packers",
  "vikings",
  "bears",
  "steelers",
  "browns",
  "bengals",
  "texans",
  "colts",
  "jaguars",
  "titans",
  "broncos",
  "chargers",
  "raiders",
  "commanders",
  "giants",
  "jets",
  "patriots",
  "dolphins",
  "saints",
  "falcons",
  "panthers",
  "buccaneers",
  "bucs",
  "rams",
  "seahawks",
  "cardinals",
];

const GOLF_TERMS = [
  "pga",
  "golf",
  "outright",
  "masters",
  "players championship",
  "us open",
  "british open",
  "the open",
  "harbour town",
  "rbc heritage",
  "scheffler",
  "mcilroy",
  "koepka",
  "finau",
];

const F1_TERMS = [
  "f1",
  "formula 1",
  "formula one",
  "grand prix",
  "pole position",
  "podium",
  "verstappen",
  "norris",
  "leclerc",
  "hamilton",
  "russell",
  "piastri",
  "antonelli",
  "ferrari",
  "mercedes",
  "mclaren",
  "red bull",
];

function containsAny(hay, needles) {
  const h = normalizeText(hay);
  for (const n of needles) {
    if (h.includes(normalizeText(n))) return true;
  }
  return false;
}

export function detectWtaFromQuestion(question) {
  const q = normalizeText(question);
  if (q.includes("wta")) return true;
  return containsAny(q, WTA_NAMES);
}

/**
 * When user is on a sport tab, that sport wins (with tennis → WTA scan).
 * Otherwise keyword-scan the question. Returns a sport hint or "generic".
 */
export function detectSportFromQuestion(question, currentTab) {
  const tab = normalizeText(currentTab);

  if (tab === "tennis") {
    return detectWtaFromQuestion(question) ? "tennis_wta_profile" : "tennis";
  }
  if (SPORT_TABS.has(tab)) {
    return tab;
  }

  const q = normalizeText(question);

  if (detectWtaFromQuestion(question)) return "tennis_wta_profile";

  if (containsAny(q, F1_TERMS)) return "f1";
  if (containsAny(q, GOLF_TERMS)) return "golf";
  if (containsAny(q, MLB_TERMS)) return "mlb";
  if (containsAny(q, NFL_TERMS)) return "nfl";
  if (containsAny(q, NBA_TERMS)) return "nba";

  if (
    q.includes("tennis") ||
    q.includes("atp") ||
    q.includes("match winner") ||
    containsAny(q, ATP_HINT_NAMES)
  ) {
    return "tennis";
  }

  return "generic";
}
