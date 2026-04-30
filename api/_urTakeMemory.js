import { getDurableJson, setDurableJson } from "./_durableStore.js";

const MEMORY_KEY_PREFIX = "ur_memory_";
const MEMORY_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_TAKES = 5;
const MEMORY_SCHEMA_V = 1;

function normalizeMemoryEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

function memoryKey(email) {
  return `${MEMORY_KEY_PREFIX}${normalizeMemoryEmail(email)}`;
}

/**
 * Normalize durable blob to { v: 1, takes, updatedAt } or null.
 * @param {unknown} raw
 * @returns {{ v: number, takes: object[], updatedAt: number } | null}
 */
function normalizeSessionMemoryBlob(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return { v: MEMORY_SCHEMA_V, takes: raw, updatedAt: Date.now() };
  }
  if (typeof raw !== "object") return null;
  const o = /** @type {{ v?: unknown; takes?: unknown; updatedAt?: unknown }} */ (raw);
  if (o.v === MEMORY_SCHEMA_V && Array.isArray(o.takes)) {
    return {
      v: MEMORY_SCHEMA_V,
      takes: o.takes,
      updatedAt: Number.isFinite(o.updatedAt) ? Number(o.updatedAt) : Date.now(),
    };
  }
  if (Array.isArray(o.takes)) {
    return {
      v: MEMORY_SCHEMA_V,
      takes: o.takes,
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

/**
 * @param {string} email
 * @returns {Promise<{ v: number, takes: object[], updatedAt: number } | null>}
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
    await setDurableJson(
      key,
      { v: MEMORY_SCHEMA_V, takes: merged, updatedAt: Date.now() },
      { ttlSeconds: MEMORY_TTL_SECONDS },
    );
  } catch {
    /* never throw */
  }
}

/**
 * @param {{ v?: number; takes?: object[] } | null} memory
 * @returns {string}
 */
export function formatMemoryForPrompt(memory) {
  try {
    if (!memory || !Array.isArray(memory.takes) || memory.takes.length === 0) {
      return "";
    }
    const lines = memory.takes.slice(0, MAX_TAKES).map((t) => {
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
    });
    const n = lines.length;
    return `[PRIOR SESSION MEMORY — last ${n} take${n === 1 ? "" : "s"}]\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}
