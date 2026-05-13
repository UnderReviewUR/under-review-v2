/**
 * Normalize the structured UR Take headline so it never opens with margin-style
 * fragments like "5 points — …" and prefers player + market when recoverable.
 */

const DASH_SPLIT = /\s[—–-]\s/;
/** Last word of a match must not be a common team nickname (avoids "Cleveland Cavaliers should"). */
const TEAM_MONIKER_LAST = new Set(
  [
    "cavaliers",
    "pistons",
    "lakers",
    "celtics",
    "heat",
    "warriors",
    "bucks",
    "nuggets",
    "knicks",
    "suns",
    "magic",
    "rockets",
    "nets",
    "hornets",
    "hawks",
    "bulls",
    "clippers",
    "grizzlies",
    "timberwolves",
    "pacers",
    "pelicans",
    "thunder",
    "spurs",
    "raptors",
    "76ers",
    "sixers",
    "mets",
    "yankees",
    "dodgers",
    "giants",
    "cowboys",
    "eagles",
    "chiefs",
    "packers",
    "bills",
    "ravens",
    "bengals",
    "steelers",
    "broncos",
    "raiders",
    "chargers",
    "49ers",
    "niners",
    "seahawks",
    "rams",
    "cardinals",
  ],
);

const BAD_FIRST = new Set([
  "THE",
  "THIS",
  "THAT",
  "WHEN",
  "IF",
  "WITH",
  "FROM",
  "BOTH",
  "GAME",
  "LATE",
  "EARLY",
  "HOME",
  "AWAY",
  "YOUR",
  "THEIR",
  "TEAM",
  "TOTAL",
  "KEY",
  "EDGE",
  "ONE",
  "TWO",
  "ALL",
  "FOR",
  "AND",
  "BUT",
  "NOT",
  "ARE",
  "HIS",
  "HER",
  "ITS",
]);

function stripNoise(s) {
  return String(s || "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+|\s+$/g, "");
}

export function splitCallHeadTail(call) {
  const s = stripNoise(call);
  const m = s.match(DASH_SPLIT);
  if (!m || m.index === undefined) return { head: s, tail: "" };
  const idx = m.index;
  return {
    head: s.slice(0, idx).trim(),
    tail: s.slice(idx + m[0].length).trim(),
  };
}

/** Head before em dash reads like a stat fragment, not a full pick (no Over/Under). */
export function isBadFragmentHead(head) {
  const h = stripNoise(head);
  if (!h) return false;
  if (/\b(over|under)\b/i.test(h)) return false;
  if (h.length >= 52) return false;
  return /^(?:[+-]?\d+(?:\.\d+)?)\s*(?:points|pts|rebounds?|boards?|assists?|threes?|yards|goals|runs|hits)\b/i.test(
    h,
  );
}

export function extractOverUnderMarket(text) {
  const t = stripNoise(text);
  const re =
    /\b(over|under)\s+([+-]?\d+(?:\.\d+)?)\s*(points|pts|rebounds?|boards?|assists?|threes?|3[-\s]?pt(?:s)?|blocks?|steals?|yards|touchdowns?|goals?|games|aces|saves)?\b/i;
  const m = t.match(re);
  if (!m) return null;
  let stat = (m[3] || "").toLowerCase();
  if (stat === "pts") stat = "points";
  if (stat === "boards") stat = "rebounds";
  if (stat === "3-pt" || stat === "3 pt" || stat === "3pts") stat = "threes";
  return { side: m[1].toLowerCase(), line: m[2].replace(/^\+/, ""), stat: stat || null };
}

export function extractPlayerBeforeOverUnder(text) {
  const t = stripNoise(text);
  const idx = t.search(/\b(over|under)\s+[+-]?\d/i);
  if (idx === -1) return null;
  const window = t.slice(Math.max(0, idx - 120), idx).trim();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z']+){1,2})\s*$/g;
  let last = null;
  let m;
  while ((m = re.exec(window))) last = m[1];
  if (!last) return null;
  const parts = last.split(/\s+/);
  if (parts[0] && BAD_FIRST.has(parts[0].toUpperCase())) return null;
  return last.trim();
}

/** When no Over/Under line, still find "First Last should/will …" player subject in prose. */
function extractPlayerNearModal(text) {
  const t = stripNoise(text);
  const re =
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z']+){1,2})\s+(?:should|will|has|gets|can|could|is|remains|keeps)\b/i;
  const m = t.match(re);
  if (!m) return null;
  const name = m[1].trim();
  const parts = name.split(/\s+/);
  const lastW = parts[parts.length - 1] || "";
  if (TEAM_MONIKER_LAST.has(lastW.toLowerCase())) return null;
  if (parts[0] && BAD_FIRST.has(parts[0].toUpperCase())) return null;
  return name;
}

function playerLastName(full) {
  const parts = stripNoise(full).split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function defaultStatWord(sport) {
  const s = String(sport || "").toLowerCase();
  if (s.includes("tennis") || s === "atp" || s === "wta") return "games";
  if (s.includes("mlb")) return "hits";
  if (s.includes("nfl") || s.includes("cfb")) return "yards";
  if (s.includes("nhl")) return "shots";
  return "points";
}

function clipHeadline(s, max = 220) {
  const t = stripNoise(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * @param {string} rawCall
 * @param {string} rawEdge
 * @param {string} [callType]
 * @param {string} [sport]
 */
export function buildDisplayTakeawayCall(rawCall, rawEdge, callType, sport) {
  const call = stripNoise(rawCall);
  const edge = stripNoise(rawEdge);
  if (!call) return call;
  if (String(callType || "").toLowerCase() === "parlay") return call;

  const { head, tail } = splitCallHeadTail(call);
  if (!tail || !isBadFragmentHead(head)) return call;

  const market =
    extractOverUnderMarket(call) || extractOverUnderMarket(edge) || extractOverUnderMarket(tail);
  const player =
    extractPlayerBeforeOverUnder(call) ||
    extractPlayerBeforeOverUnder(edge) ||
    extractPlayerBeforeOverUnder(tail) ||
    extractPlayerNearModal(edge) ||
    extractPlayerNearModal(tail);

  const angleTail = tail;
  const last = player ? playerLastName(player) : "";

  if (player && market) {
    const statWord = market.stat || defaultStatWord(sport);
    return clipHeadline(`${last} ${market.side} ${market.line} ${statWord} is the angle — ${angleTail}`);
  }
  if (player) {
    return clipHeadline(`${last} points over is the call — ${angleTail}`);
  }
  if (angleTail.length >= 28 && /^[A-Z]/.test(angleTail)) return clipHeadline(angleTail);
  return clipHeadline(call);
}
