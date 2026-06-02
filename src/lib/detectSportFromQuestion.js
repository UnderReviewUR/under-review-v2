import { inferSportFromQuestionText } from "../../shared/urTakeSportRouting.js";
import { normalizeText } from "./normalizeText.js";

const SPORT_TABS = new Set(["nba", "mlb", "nfl", "golf", "tennis", "f1", "worldcup"]);

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
  "k prop",
  "pitcher k",
  "pitchers k",
  "strikeout prop",
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
  "nfl draft",
  "mock draft",
  "pittsburgh",
  "prospect",
  "big board",
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

/** Full names, cities, nicknames → abbr. Longest keys matched first (see detectNflTeamHint). */
export const NFL_TEAM_NAMES = {
  "new york giants": "NYG",
  "new york jets": "NYJ",
  "los angeles chargers": "LAC",
  "los angeles rams": "LAR",
  "san francisco": "SF",
  "kansas city": "KC",
  "green bay": "GB",
  "las vegas": "LV",
  "new england": "NE",
  "new orleans": "NO",
  "tampa bay": "TB",
  "philadelphia": "PHI",
  "washington": "WAS",
  "cincinnati": "CIN",
  "jacksonville": "JAX",
  "indianapolis": "IND",
  "baltimore": "BAL",
  "pittsburgh": "PIT",
  "cleveland": "CLE",
  "tennessee": "TEN",
  "minnesota": "MIN",
  "carolina": "CAR",
  "arizona": "ARI",
  "atlanta": "ATL",
  "buffalo": "BUF",
  "chicago": "CHI",
  "detroit": "DET",
  "houston": "HOU",
  "denver": "DEN",
  "seattle": "SEA",
  "miami": "MIA",
  "dallas": "DAL",
  cowboys: "DAL",
  eagles: "PHI",
  giants: "NYG",
  commanders: "WAS",
  bears: "CHI",
  lions: "DET",
  packers: "GB",
  vikings: "MIN",
  falcons: "ATL",
  panthers: "CAR",
  saints: "NO",
  buccaneers: "TB",
  cardinals: "ARI",
  rams: "LAR",
  "49ers": "SF",
  niners: "SF",
  seahawks: "SEA",
  ravens: "BAL",
  bengals: "CIN",
  browns: "CLE",
  steelers: "PIT",
  texans: "HOU",
  colts: "IND",
  jaguars: "JAX",
  titans: "TEN",
  broncos: "DEN",
  chiefs: "KC",
  raiders: "LV",
  chargers: "LAC",
  patriots: "NE",
  pats: "NE",
  bills: "BUF",
  dolphins: "MIA",
  jets: "NYJ",
  nyg: "NYG",
  nyj: "NYJ",
  bucs: "TB",
  tampa: "TB",
};

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

export function detectNflTeamHint(question) {
  const q = normalizeText(question);
  if (!q) return null;
  const keys = Object.keys(NFL_TEAM_NAMES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (q.includes(key)) return NFL_TEAM_NAMES[key];
  }
  return null;
}

/**
 * Question text wins when it clearly signals a sport; otherwise the active tab is the default.
 * Returns a sport hint or "generic".
 */
export function detectSportFromQuestion(question, currentTab) {
  const tab = normalizeText(currentTab);
  const fromQuestion = inferSportFromQuestionText(question);

  if (tab === "tennis") {
    if (detectWtaFromQuestion(question)) return "tennis_wta_profile";
    if (fromQuestion && fromQuestion !== "tennis") return fromQuestion;
    return fromQuestion || "tennis";
  }

  if (fromQuestion) return fromQuestion;

  if (SPORT_TABS.has(tab)) return tab;

  if (detectWtaFromQuestion(question)) return "tennis_wta_profile";

  return "generic";
}
