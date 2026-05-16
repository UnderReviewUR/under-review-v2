/**
 * Fallback name pools when live feeds are thin — prevents "not in verified field" refusals
 * for legitimate pros the user names explicitly.
 */

export const NBA_ALWAYS_INCLUDE = [
  "Nikola Jokic",
  "Shai Gilgeous-Alexander",
  "Luka Doncic",
  "Giannis Antetokounmpo",
  "Jayson Tatum",
  "Jaylen Brown",
  "Jalen Brunson",
  "Joel Embiid",
  "LeBron James",
  "Stephen Curry",
  "Kevin Durant",
  "Devin Booker",
  "Anthony Davis",
  "Kawhi Leonard",
  "James Harden",
  "Jimmy Butler",
  "Bam Adebayo",
  "Tyrese Haliburton",
  "Anthony Edwards",
  "Donovan Mitchell",
  "Ja Morant",
  "Trae Young",
  "De'Aaron Fox",
  "Damian Lillard",
  "Victor Wembanyama",
  "Paolo Banchero",
  "Chet Holmgren",
  "Karl-Anthony Towns",
  "Domantas Sabonis",
  "DeMar DeRozan",
  "Zion Williamson",
  "Kyrie Irving",
  "Paul George",
  "Bradley Beal",
  "Jrue Holiday",
  "Kristaps Porzingis",
  "Derrick White",
  "Jaren Jackson Jr.",
  "Alperen Sengun",
  "Cade Cunningham",
];

export const NFL_ALWAYS_INCLUDE = [
  "Patrick Mahomes",
  "Josh Allen",
  "Lamar Jackson",
  "Jalen Hurts",
  "Joe Burrow",
  "Justin Herbert",
  "Tua Tagovailoa",
  "Trevor Lawrence",
  "Jordan Love",
  "Brock Purdy",
  "Dak Prescott",
  "C.J. Stroud",
  "Anthony Richardson",
  "Jayden Daniels",
  "Bo Nix",
  "Caleb Williams",
  "Drake Maye",
  "Christian McCaffrey",
  "Derrick Henry",
  "Saquon Barkley",
  "Breece Hall",
  "Jonathan Taylor",
  "Jahmyr Gibbs",
  "Bijan Robinson",
  "Travis Kelce",
  "Tyreek Hill",
  "Justin Jefferson",
  "Ja'Marr Chase",
  "CeeDee Lamb",
  "Amon-Ra St. Brown",
  "Davante Adams",
  "Cooper Kupp",
  "Stefon Diggs",
  "DK Metcalf",
  "Garrett Wilson",
  "George Kittle",
  "Mark Andrews",
  "T.J. Watt",
  "Micah Parsons",
  "Myles Garrett",
];

export const MLB_ALWAYS_INCLUDE = [
  "Shohei Ohtani",
  "Aaron Judge",
  "Mookie Betts",
  "Ronald Acuna Jr.",
  "Juan Soto",
  "Freddie Freeman",
  "Vladimir Guerrero Jr.",
  "Fernando Tatis Jr.",
  "Julio Rodriguez",
  "Jose Altuve",
  "Manny Machado",
  "Francisco Lindor",
  "Pete Alonso",
  "Yordan Alvarez",
  "Kyle Tucker",
  "Corey Seager",
  "Trea Turner",
  "Bryce Harper",
  "Mike Trout",
  "Gerrit Cole",
  "Spencer Strider",
  "Zack Wheeler",
  "Corbin Burnes",
  "Blake Snell",
  "Tyler Glasnow",
  "Tarik Skubal",
  "Paul Skenes",
  "Bobby Witt Jr.",
  "Elly De La Cruz",
  "Gunnar Henderson",
  "Jackson Holliday",
  "Corbin Carroll",
  "Adley Rutschman",
  "Salvador Perez",
  "Jose Ramirez",
  "Nolan Arenado",
  "Xander Bogaerts",
  "Rafael Devers",
  "Ketel Marte",
  "Matt Olson",
];

export const TENNIS_ALWAYS_INCLUDE = [
  "Carlos Alcaraz",
  "Jannik Sinner",
  "Novak Djokovic",
  "Daniil Medvedev",
  "Alexander Zverev",
  "Taylor Fritz",
  "Ben Shelton",
  "Holger Rune",
  "Andrey Rublev",
  "Casper Ruud",
  "Hubert Hurkacz",
  "Tommy Paul",
  "Grigor Dimitrov",
  "Stefanos Tsitsipas",
  "Iga Swiatek",
  "Aryna Sabalenka",
  "Coco Gauff",
  "Elena Rybakina",
  "Jessica Pegula",
  "Madison Keys",
  "Marketa Vondrousova",
  "Ons Jabeur",
  "Paula Badosa",
  "Mirra Andreeva",
  "Jasmine Paolini",
  "Barbora Krejcikova",
  "Qinwen Zheng",
  "Danielle Collins",
  "Emma Navarro",
  "Linda Noskova",
  "Leylah Fernandez",
  "Naomi Osaka",
  "Garbine Muguruza",
  "Petra Kvitova",
  "Victoria Azarenka",
  "Maria Sakkari",
  "Caroline Garcia",
  "Belinda Bencic",
  "Elina Svitolina",
  "Daria Kasatkina",
];

export const F1_ALWAYS_INCLUDE = [
  "Max Verstappen",
  "Lando Norris",
  "Charles Leclerc",
  "Oscar Piastri",
  "George Russell",
  "Lewis Hamilton",
  "Carlos Sainz",
  "Fernando Alonso",
  "Lance Stroll",
  "Pierre Gasly",
  "Esteban Ocon",
  "Alexander Albon",
  "Yuki Tsunoda",
  "Liam Lawson",
  "Daniel Ricciardo",
  "Nico Hulkenberg",
  "Kevin Magnussen",
  "Oliver Bearman",
  "Gabriel Bortoleto",
  "Jack Doohan",
  "Isack Hadjar",
  "Kimi Antonelli",
  "Franco Colapinto",
  "Valtteri Bottas",
  "Zhou Guanyu",
];

function normPersonToken(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function lastNameOf(name) {
  const parts = normPersonToken(name).split(" ").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

export function personNamesMatch(a, b, lastNameCounts = null) {
  const fa = normPersonToken(a);
  const fb = normPersonToken(b);
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  const la = lastNameOf(a);
  const lb = lastNameOf(b);
  if (la && la === lb) {
    if (lastNameCounts && lastNameCounts.get(la) > 1) return false;
    return la.length >= 3;
  }
  return fa.includes(fb) || fb.includes(fa);
}

function dedupePersonNames(names) {
  const list = [...names].filter(Boolean);
  const counts = new Map();
  for (const n of list) {
    const ln = lastNameOf(n);
    if (ln) counts.set(ln, (counts.get(ln) || 0) + 1);
  }
  const byLast = new Map();
  for (const name of list) {
    const ln = lastNameOf(name) || normPersonToken(name);
    if (!byLast.has(ln)) byLast.set(ln, []);
    byLast.get(ln).push(name);
  }
  const out = [];
  for (const [, group] of byLast) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const canonical = [...group].sort((a, b) => b.length - a.length)[0];
    if (counts.get(lastNameOf(canonical)) === 1) out.push(canonical);
    else out.push(...group);
  }
  return out;
}

export function mergeVerifiedNamesWithFallback(liveNames, fallbackList) {
  return dedupePersonNames([...(liveNames || []), ...(fallbackList || [])]);
}

export function isNameInMergedList(query, mergedList) {
  const q = String(query || "").trim();
  if (!q || !Array.isArray(mergedList) || !mergedList.length) return false;
  const counts = new Map();
  for (const n of mergedList) {
    const ln = lastNameOf(n);
    if (ln) counts.set(ln, (counts.get(ln) || 0) + 1);
  }
  return mergedList.some((n) => personNamesMatch(q, n, counts));
}

export function extractMentionedPersonFromQuestion(question, mergedList) {
  const q = String(question || "").trim();
  if (!q) return null;
  for (const name of mergedList) {
    if (q.toLowerCase().includes(name.toLowerCase())) return name;
    const last = lastNameOf(name);
    if (last && last.length >= 4 && new RegExp(`\\b${last}\\b`, "i").test(q)) return name;
  }
  const parts = q.split(/\s+/).filter((w) => w.length >= 3);
  for (let i = 0; i < parts.length - 1; i++) {
    const two = `${parts[i]} ${parts[i + 1]}`;
    const hit = mergedList.find((n) => personNamesMatch(two, n));
    if (hit) return hit;
    if (isNameInMergedList(two, mergedList)) return two;
  }
  return null;
}
