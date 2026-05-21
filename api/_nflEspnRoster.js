import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { tagStructuralImpactAtIngestion } from "../shared/structuralAngleValidation.js";

const TEAMS = [
  "buf",
  "mia",
  "ne",
  "nyj",
  "bal",
  "cin",
  "cle",
  "pit",
  "hou",
  "ind",
  "jax",
  "ten",
  "den",
  "kc",
  "lv",
  "lac",
  "dal",
  "nyg",
  "phi",
  "wsh",
  "chi",
  "det",
  "gb",
  "min",
  "atl",
  "car",
  "no",
  "tb",
  "ari",
  "lar",
  "sf",
  "sea",
];

const SLUG_TO_ABBR = {
  buf: "BUF",
  mia: "MIA",
  ne: "NE",
  nyj: "NYJ",
  bal: "BAL",
  cin: "CIN",
  cle: "CLE",
  pit: "PIT",
  hou: "HOU",
  ind: "IND",
  jax: "JAX",
  ten: "TEN",
  den: "DEN",
  kc: "KC",
  lv: "LV",
  lac: "LAC",
  dal: "DAL",
  nyg: "NYG",
  phi: "PHI",
  wsh: "WAS",
  chi: "CHI",
  det: "DET",
  gb: "GB",
  min: "MIN",
  atl: "ATL",
  car: "CAR",
  no: "NO",
  tb: "TB",
  ari: "ARI",
  lar: "LAR",
  sf: "SF",
  sea: "SEA",
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRosterPlayers(json, teamAbbr) {
  const players = [];
  const groups = json.athletes || [];
  for (const g of groups) {
    const posGroup = g.position || "";
    for (const item of g.items || []) {
      const injuries = item.injuries || [];
      const inj0 = injuries[0];
      const statusAbbrev = item.status?.abbreviation || item.status?.name || "";
      const injuryFromList = inj0?.status || "";
      const base = {
        name:
          item.displayName ||
          [item.firstName, item.lastName].filter(Boolean).join(" ").trim(),
        position: item.position?.abbreviation || posGroup,
        jersey: item.jersey != null ? String(item.jersey) : "",
        status: statusAbbrev,
        injuryStatus: injuryFromList || statusAbbrev || "",
        team: teamAbbr,
        rosterStatus: statusAbbrev,
      };
      const tagged =
        injuryFromList || (statusAbbrev && statusAbbrev !== "Active")
          ? tagStructuralImpactAtIngestion(base, "nfl", "vacancy")
          : { ...base, structuralImpact: true, structuralImpactReason: "active_roster" };
      players.push(tagged);
    }
  }
  return players;
}

/**
 * @param {unknown} coachArr
 * @returns {{ hc: string | null, oc: string | null, dc: string | null }}
 */
function parseCoaches(coachArr) {
  const out = { hc: null, oc: null, dc: null };
  if (!Array.isArray(coachArr)) return out;
  for (const c of coachArr) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    const title = String(c.position?.displayName || c.position || "").toLowerCase();
    if (title.includes("offensive coordinator")) out.oc = name;
    else if (title.includes("defensive coordinator")) out.dc = name;
    else if (title.includes("head coach")) out.hc = name;
  }
  if (!out.hc && coachArr.length === 1) {
    const c = coachArr[0];
    out.hc = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  }
  return out;
}

export async function fetchNflRosterSnapshot() {
  const cached = await getDurableJson("nfl_espn_roster");
  if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) {
    return cached;
  }

  const players = [];
  /** @type {Record<string, { hc: string | null, oc: string | null, dc: string | null }>} */
  const coaches = {};

  for (let i = 0; i < TEAMS.length; i++) {
    const slug = TEAMS[i];
    const abbr = SLUG_TO_ABBR[slug];
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${slug}/roster`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; UnderReview/1.0)" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        console.warn(`[nflEspnRoster] ${slug} HTTP ${res.status}`);
      } else {
        const json = await res.json();
        players.push(...parseRosterPlayers(json, abbr));
        coaches[abbr] = parseCoaches(json.coach);
      }
    } catch (err) {
      console.warn(`[nflEspnRoster] ${slug} ${err?.message || err}`);
    }
    if (i < TEAMS.length - 1) await delay(150);
  }

  const payload = { players, coaches, fetchedAt: Date.now() };
  await setDurableJson("nfl_espn_roster", payload, { ttlSeconds: 60 * 60 * 6 });
  return payload;
}
