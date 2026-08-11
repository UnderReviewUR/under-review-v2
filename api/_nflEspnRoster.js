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

const ROSTER_CACHE_FRESH_MS = 6 * 60 * 60 * 1000;
const ROSTER_TTL_SECONDS = 14 * 24 * 60 * 60;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizePlayerKey(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function pickString(obj, keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested =
        value.displayName ||
        value.name ||
        value.description ||
        value.abbreviation ||
        value.shortName;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return "";
}

function normalizeInjury(injury = {}) {
  const status = pickString(injury, ["status", "statusType", "designation"]);
  const type = pickString(injury, ["type", "injuryType", "category"]);
  const detail = pickString(injury, [
    "detail",
    "details",
    "description",
    "shortComment",
    "longComment",
    "comment",
    "notes",
  ]);
  const bodyPart = pickString(injury, ["bodyPart", "location", "part"]);
  const date = pickString(injury, ["date", "updateDate", "lastUpdated"]);
  const returnDate = pickString(injury, ["returnDate", "expectedReturnDate", "estimatedReturn"]);
  const summary = [status, type, bodyPart, detail].filter(Boolean).join(" — ");
  return {
    status,
    type,
    bodyPart,
    detail,
    date,
    returnDate,
    summary,
  };
}

function summarizeInjury(injuries = []) {
  const primary = Array.isArray(injuries) ? injuries.find((inj) => inj?.summary) : null;
  if (!primary) return "";
  const parts = [primary.summary];
  if (primary.returnDate) parts.push(`expected return: ${primary.returnDate}`);
  return parts.join(" | ");
}

function resolveAvailability(baseStatus, injuries = []) {
  const hay = [baseStatus, ...injuries.map((inj) => inj.summary)].join(" ").toLowerCase();
  if (/\b(ir|injured reserve|pup|nfi)\b/.test(hay)) return "reserve/injured";
  if (/\bout\b|inactive|suspended|doubtful/.test(hay)) return "out";
  if (/questionable|limited|probable|day-to-day/.test(hay)) return "uncertain";
  if (/active|available/.test(hay) || !hay.trim()) return "active";
  return "unknown";
}

function parseRosterPlayers(json, teamAbbr) {
  const players = [];
  const groups = json.athletes || [];
  for (const g of groups) {
    const posGroup = g.position || "";
    for (const item of g.items || []) {
      const injuries = (item.injuries || []).map(normalizeInjury).filter((inj) => inj.summary);
      const injurySummary = summarizeInjury(injuries);
      const statusAbbrev = item.status?.abbreviation || item.status?.name || "";
      const availability = resolveAvailability(statusAbbrev, injuries);
      const name =
        item.displayName ||
        [item.firstName, item.lastName].filter(Boolean).join(" ").trim();
      const base = {
        id: item.id != null ? String(item.id) : "",
        uid: item.uid != null ? String(item.uid) : "",
        guid: item.guid != null ? String(item.guid) : "",
        slug: item.slug || "",
        name,
        position: item.position?.abbreviation || posGroup,
        jersey: item.jersey != null ? String(item.jersey) : "",
        status: statusAbbrev,
        injuryStatus: injurySummary || statusAbbrev || "",
        injuries,
        availability,
        team: teamAbbr,
        rosterStatus: statusAbbrev,
        rosterKey: item.id != null ? `espn:${item.id}` : `${normalizePlayerKey(name)}:${teamAbbr}`,
      };
      const tagged =
        injurySummary || availability !== "active" || (statusAbbrev && statusAbbrev !== "Active")
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

function playerDiffKey(player = {}) {
  if (player.id) return `espn:${player.id}`;
  return `${normalizePlayerKey(player.name)}:${String(player.position || "").toUpperCase()}`;
}

function rosterByDiffKey(players = []) {
  const out = new Map();
  for (const player of Array.isArray(players) ? players : []) {
    const key = playerDiffKey(player);
    if (key && !out.has(key)) out.set(key, player);
  }
  return out;
}

function injuryFingerprint(player = {}) {
  return [
    player.availability || "",
    player.injuryStatus || "",
    ...(Array.isArray(player.injuries) ? player.injuries.map((inj) => inj.summary || "") : []),
  ]
    .filter(Boolean)
    .join(" | ");
}

export function diffNflRosterSnapshots(previous, next) {
  const before = rosterByDiffKey(previous?.players);
  const after = rosterByDiffKey(next?.players);
  const changes = [];

  for (const [key, player] of after) {
    const prev = before.get(key);
    if (!prev) {
      changes.push({
        type: "added",
        player: player.name,
        pos: player.position,
        team: player.team,
        status: player.rosterStatus || player.availability || "",
      });
      continue;
    }
    if (prev.team !== player.team) {
      changes.push({
        type: "team_changed",
        player: player.name,
        pos: player.position,
        fromTeam: prev.team,
        toTeam: player.team,
      });
    }
    if ((prev.rosterStatus || "") !== (player.rosterStatus || "")) {
      changes.push({
        type: "status_changed",
        player: player.name,
        pos: player.position,
        team: player.team,
        fromStatus: prev.rosterStatus || "",
        toStatus: player.rosterStatus || "",
      });
    }
    if (injuryFingerprint(prev) !== injuryFingerprint(player)) {
      changes.push({
        type: "injury_changed",
        player: player.name,
        pos: player.position,
        team: player.team,
        from: injuryFingerprint(prev),
        to: injuryFingerprint(player),
      });
    }
  }

  for (const [key, player] of before) {
    if (after.has(key)) continue;
    changes.push({
      type: "removed",
      player: player.name,
      pos: player.position,
      fromTeam: player.team,
      status: player.rosterStatus || player.availability || "",
    });
  }

  return changes;
}

function summarizeChanges(changes = []) {
  return changes.reduce(
    (acc, change) => {
      acc.total += 1;
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    },
    { total: 0 },
  );
}

export async function fetchNflRosterSnapshot(options = {}) {
  const { force = false } = options;
  const cached = await getDurableJson("nfl_espn_roster");
  if (!force && cached && Date.now() - cached.fetchedAt < ROSTER_CACHE_FRESH_MS) {
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

  const snapshot = { players, coaches, fetchedAt: Date.now(), source: "espn_site_api" };
  const changesSinceLastRefresh = diffNflRosterSnapshots(cached, snapshot);
  const payload = {
    ...snapshot,
    previousFetchedAt: cached?.fetchedAt || null,
    changesSinceLastRefresh,
    changeSummary: summarizeChanges(changesSinceLastRefresh),
  };
  await setDurableJson("nfl_espn_roster", payload, { ttlSeconds: ROSTER_TTL_SECONDS });
  return payload;
}
