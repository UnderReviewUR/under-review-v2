import { getDurableJson, setDurableJson } from "./_durableStore.js";

const MEMORY_KEY_PREFIX = "ur_memory_";
const TRACKER_KEY_PREFIX = "ur_tracker_";
const MEMORY_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_TAKES = 5;
const MEMORY_SCHEMA_V2 = 2;
const MEMORY_SCHEMA_V1 = 1;

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "over",
  "under",
  "fade",
  "back",
  "lean",
  "play",
  "take",
  "game",
  "line",
]);

function normalizeMemoryEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

function memoryKey(email) {
  return `${MEMORY_KEY_PREFIX}${normalizeMemoryEmail(email)}`;
}

function trackerKey(email) {
  return `${TRACKER_KEY_PREFIX}${normalizeMemoryEmail(email)}`;
}

function emptyPreferences() {
  return {
    frequentPlayers: [],
    frequentSports: [],
    styleSignal: null,
    updatedAt: Date.now(),
  };
}

/**
 * @param {unknown} raw
 * @returns {{ v: number, takes: object[], preferences: object, updatedAt: number } | null}
 */
function normalizeSessionMemoryBlob(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return {
      v: MEMORY_SCHEMA_V2,
      takes: raw,
      preferences: emptyPreferences(),
      updatedAt: Date.now(),
    };
  }
  if (typeof raw !== "object") return null;
  const o = /** @type {{ v?: unknown; takes?: unknown; preferences?: unknown; updatedAt?: unknown }} */ (raw);

  if (o.v === MEMORY_SCHEMA_V2 && Array.isArray(o.takes)) {
    const pref =
      o.preferences && typeof o.preferences === "object"
        ? { ...emptyPreferences(), ...o.preferences }
        : emptyPreferences();
    return {
      v: MEMORY_SCHEMA_V2,
      takes: o.takes,
      preferences: pref,
      updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
    };
  }

  if (o.v === MEMORY_SCHEMA_V1 && Array.isArray(o.takes)) {
    return {
      v: MEMORY_SCHEMA_V2,
      takes: o.takes,
      preferences: emptyPreferences(),
      updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
    };
  }

  if (Array.isArray(o.takes)) {
    return {
      v: MEMORY_SCHEMA_V2,
      takes: o.takes,
      preferences: emptyPreferences(),
      updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
    };
  }
  return null;
}

function dedupeKeyForTake(t) {
  const p = t?.player != null ? String(t.player).trim().toLowerCase() : "";
  const m = t?.market != null ? String(t.market).trim().toLowerCase() : "";
  if (!p || !m) return null;
  return `${p}\u0000${m}`;
}

function dedupeKeyPlayerMarketDate(t) {
  const p = t?.player != null ? String(t.player).trim().toLowerCase() : "";
  const m = t?.market != null ? String(t.market).trim().toLowerCase() : "_";
  const d = calendarMdKey(t?.date);
  if (!p || !d) return null;
  return `${p}\u0000${m}\u0000${d}`;
}

/** @param {string} [calendarStr] */
export function calendarMdKey(calendarStr) {
  const str = String(calendarStr || "").trim();
  const m = str.match(/^([A-Za-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  return `${m[1].toLowerCase()}-${m[2]}`;
}

/** @param {string} playText */
export function extractStructuredFromPlayText(playText) {
  const src = String(playText || "");
  const playerMatch = src.match(
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(over|under|fade)/i,
  );
  const player = playerMatch ? String(playerMatch[1]).trim() : null;

  const directionMatch = src.match(/\b(over|under|fade|back)\b/i);
  const direction = directionMatch ? String(directionMatch[1]).toLowerCase() : null;

  const lineMatch = src.match(/\b(\d+\.?\d*)\b/);
  const line = lineMatch ? String(lineMatch[1]) : null;

  const marketMatch = src.match(
    /\b(points|rebounds|assists|steals|blocks|PRA|total|spread|moneyline)\b/i,
  );
  const market = marketMatch ? String(marketMatch[1]).toLowerCase() : null;

  const anchorMatch = src.match(/\d+\.?\d*\s+\w+[^\n]{0,60}/);
  const anchor = anchorMatch
    ? String(anchorMatch[0])
        .replace(/[·—\-]/g, "")
        .trim()
        .slice(0, 60)
    : null;

  return { player, market, direction, line, anchor };
}

/**
 * @param {object[]} takes
 * @returns {{ frequentPlayers: string[], frequentSports: string[], styleSignal: string | null, updatedAt: number }}
 */
function computePreferencesFromTakes(takes) {
  const playerCounts = new Map();
  const sportCounts = new Map();
  let overs = 0;
  let unders = 0;
  let parlayTakes = 0;

  for (const t of takes) {
    const sport = String(t?.sport || "")
      .trim()
      .toLowerCase();
    if (sport) sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);

    const pl = t?.player != null ? String(t.player).trim() : "";
    if (pl) playerCounts.set(pl, (playerCounts.get(pl) || 0) + 1);

    const d = String(t?.direction || "")
      .trim()
      .toLowerCase();
    if (d === "over" || d === "back") overs += 1;
    else if (d === "under") unders += 1;

    const playBlob = `${t?.play || ""} ${t?.anchor || ""}`.toLowerCase();
    if (/\bparlay?s?\b/i.test(playBlob)) parlayTakes += 1;
  }

  while (playerCounts.size > 10) {
    let minK = "";
    let minV = Infinity;
    for (const [k, v] of playerCounts) {
      if (v < minV) {
        minV = v;
        minK = k;
      }
    }
    if (minK) playerCounts.delete(minK);
  }

  const frequentPlayers = [...playerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const frequentSports = [...sportCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k.toUpperCase());

  let styleSignal = "mixed";
  if (overs >= unders + 2) styleSignal = "overs";
  else if (unders >= overs + 2) styleSignal = "unders";
  else if (parlayTakes >= 2) styleSignal = "parlays";

  return {
    frequentPlayers,
    frequentSports,
    styleSignal,
    updatedAt: Date.now(),
  };
}

function tendencyLabel(styleSignal) {
  if (styleSignal === "overs") return "leans overs";
  if (styleSignal === "unders") return "leans unders";
  if (styleSignal === "parlays") return "leans parlays";
  return "mixed reads";
}

function preferencesBlockMeaningful(pref) {
  if (!pref || typeof pref !== "object") return false;
  const fp = Array.isArray(pref.frequentPlayers) ? pref.frequentPlayers : [];
  const fs = Array.isArray(pref.frequentSports) ? pref.frequentSports : [];
  return fp.length > 0 || fs.length > 0 || Boolean(pref.styleSignal && pref.styleSignal !== "mixed");
}

function formatPreferencesAppendix(preferences) {
  if (!preferencesBlockMeaningful(preferences)) return "";
  const fp = Array.isArray(preferences.frequentPlayers) ? preferences.frequentPlayers : [];
  const fs = Array.isArray(preferences.frequentSports) ? preferences.frequentSports : [];
  const lines = ["", "[USER PATTERNS — from session history]"];
  if (fp.length) lines.push(`Frequently asks about: ${fp.join(", ")}`);
  if (fs.length) lines.push(`Sport focus: ${fs.join(", ")}`);
  const sig = preferences.styleSignal || "mixed";
  lines.push(`Tendency: ${tendencyLabel(sig)}`);
  return lines.join("\n");
}

/**
 * @param {object} t
 * @returns {string}
 */
function formatSingleTakeLineBody(t) {
  const date = String(t?.date || "").trim() || "—";
  const sport = String(t?.sport || "unknown").trim();
  const conf = String(t?.confidence || "Medium").trim();

  if (t && t.v === 1 && (t.player || t.market || t.direction || t.line)) {
    const parts = [];
    if (t.player) parts.push(String(t.player).trim());
    if (t.direction) parts.push(String(t.direction).trim());
    if (t.line != null && String(t.line).trim()) parts.push(String(t.line).trim());
    if (t.market) parts.push(String(t.market).trim());
    const core = parts.join(" ");
    const anchorRaw = t.anchor ? String(t.anchor).trim().replace(/\s+/g, " ") : "";
    const anchorSeg = anchorRaw ? ` (${anchorRaw})` : "";
    return `- ${date}: ${sport} — ${core}${anchorSeg} — ${conf} confidence`;
  }

  const play = String(t?.play || "").trim().replace(/\s+/g, " ");
  return `- ${date}: ${sport} — ${play} (${conf} confidence)`;
}

function wordTokens(s) {
  const raw = String(s || "")
    .toLowerCase()
    .match(/\b(?:[a-z]{2,}|\d+\.?\d*)\b/g);
  if (!raw) return [];
  return raw.filter((w) => !STOPWORDS.has(w));
}

function overlapWordCount(a, b) {
  const A = wordTokens(a);
  const B = new Set(wordTokens(b));
  let n = 0;
  for (const w of A) if (B.has(w)) n += 1;
  return n;
}

function trackerPlayPlayer(play) {
  const m = String(play || "").match(
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(over|under|fade)/i,
  );
  return m ? String(m[1]).trim() : null;
}

function findTrackerMatchForTake(take, plays) {
  const dTake = calendarMdKey(take?.date);
  if (!dTake) return null;
  const memPlayer = take?.player != null ? String(take.player).trim().toLowerCase() : "";
  const memBlob = [take?.play, take?.player, take?.market, take?.direction, take?.line]
    .filter(Boolean)
    .join(" ");

  for (const p of plays) {
    if (!p) continue;
    const res = p.result != null ? String(p.result).trim() : "";
    if (!res) continue;
    const dPlay = calendarMdKey(p?.date);
    if (!dPlay || dPlay !== dTake) continue;
    const trPlayer = trackerPlayPlayer(p.play);
    const trPl = trPlayer ? trPlayer.trim().toLowerCase() : "";
    if (memPlayer && trPl && memPlayer === trPl) return p;
    if (overlapWordCount(memBlob, p.play) >= 4) return p;
  }
  return null;
}

function trackedSuffix(result) {
  const r = String(result || "").trim().toUpperCase();
  if (!r) return "";
  if (r === "WIN") return " — TRACKED: WIN ✓";
  if (r === "LOSS") return " — TRACKED: LOSS ✗";
  return ` — TRACKED: ${r}`;
}

/**
 * @param {string} email
 * @param {(key: string) => Promise<unknown>} getDurableJsonFn
 * @returns {Promise<string>}
 */
export async function buildEnrichedMemoryPrompt(email, getDurableJsonFn) {
  try {
    if (!normalizeMemoryEmail(email)) return "";
    const rawMem = await getDurableJsonFn(memoryKey(email));
    const mem = normalizeSessionMemoryBlob(rawMem);
    if (!mem || !Array.isArray(mem.takes) || mem.takes.length === 0) return "";

    const rawTr = await getDurableJsonFn(trackerKey(email));
    const plays = normalizeTrackerPlaysFromStore(rawTr);

    const lines = mem.takes.slice(0, MAX_TAKES).map((t) => {
      const base = formatSingleTakeLineBody(t);
      const m = findTrackerMatchForTake(t, plays);
      if (m && m.result != null && String(m.result).trim()) {
        return `${base}${trackedSuffix(m.result)}`;
      }
      return base;
    });

    let out = `[PRIOR SESSION MEMORY]\n${lines.join("\n")}`;
    out += formatPreferencesAppendix(mem.preferences);
    return out;
  } catch {
    return "";
  }
}

/** @param {unknown} data */
function normalizeTrackerPlaysFromStore(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = /** @type {{ plays?: unknown }} */ (data);
  if (Array.isArray(o.plays)) return o.plays;
  return [];
}

/**
 * @param {string} email
 * @returns {Promise<{ v: number, takes: object[], preferences: object, updatedAt: number } | null>}
 */
export async function getSessionMemory(email) {
  try {
    if (!normalizeMemoryEmail(email)) return null;
    const key = memoryKey(email);
    const raw = await getDurableJson(key);
    return normalizeSessionMemoryBlob(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} email
 * @param {object[]} takes
 */
export async function saveSessionMemory(email, takes) {
  try {
    if (!normalizeMemoryEmail(email)) return;
    const key = memoryKey(email);
    const incoming = Array.isArray(takes) ? takes : [];
    const normalized = await getSessionMemory(email);
    let prev = Array.isArray(normalized?.takes) ? [...normalized.takes] : [];

    for (const inc of incoming) {
      const dk = dedupeKeyForTake(inc);
      if (dk) prev = prev.filter((t) => dedupeKeyForTake(t) !== dk);
    }

    const merged = [...incoming, ...prev].slice(0, MAX_TAKES);
    const preferences = computePreferencesFromTakes(merged);
    await setDurableJson(
      key,
      {
        v: MEMORY_SCHEMA_V2,
        takes: merged,
        preferences,
        updatedAt: Date.now(),
      },
      { ttlSeconds: MEMORY_TTL_SECONDS },
    );
  } catch {
    /* never throw */
  }
}

/**
 * @param {{ v?: number; takes?: object[]; preferences?: object } | null} memory
 * @returns {string}
 */
export function formatMemoryForPrompt(memory) {
  try {
    if (!memory || !Array.isArray(memory.takes) || memory.takes.length === 0) {
      return "";
    }
    const lines = memory.takes.slice(0, MAX_TAKES).map((t) => formatSingleTakeLineBody(t));
    let out = `[PRIOR SESSION MEMORY]\n${lines.join("\n")}`;
    out += formatPreferencesAppendix(memory.preferences);
    return out;
  } catch {
    return "";
  }
}

/**
 * @param {string} email
 * @param {object} take
 * @returns {Promise<boolean>} true if saved, false if skipped (duplicate)
 */
export async function saveMemoryTakeIfNotDuplicate(email, take) {
  if (!normalizeMemoryEmail(email)) return false;
  const incomingKey = dedupeKeyPlayerMarketDate(take);
  if (!incomingKey) return false;
  const existing = await getSessionMemory(email);
  const prev = Array.isArray(existing?.takes) ? existing.takes : [];
  for (const t of prev) {
    if (dedupeKeyPlayerMarketDate(t) === incomingKey) return false;
  }
  await saveSessionMemory(email, [take]);
  return true;
}
