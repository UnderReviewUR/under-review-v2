/**
 * Product funnel instrumentation — wraps Vercel `track` and mirrors counters locally
 * for founder/debug dashboards. Never throws; no PII or raw slip images.
 */

import { track } from "@vercel/analytics";

const COUNTERS_KEY = "ur_funnel_counters_v1";
const STR_MAX = 96;

/** @param {Record<string, unknown>} props */
function sanitizeFunnelProps(props) {
  if (!props || typeof props !== "object") return {};
  /** @type {Record<string, string | number | boolean>} */
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean" || typeof v === "number") {
      if (typeof v === "number" && !Number.isFinite(v)) continue;
      out[k] = v;
    } else if (typeof v === "string") {
      const s = v.trim();
      if (!s) continue;
      out[k] = s.length > STR_MAX ? `${s.slice(0, STR_MAX)}…` : s;
    } else {
      out[k] = String(v).slice(0, STR_MAX);
    }
  }
  return out;
}

function bumpLocalCounter(eventName) {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY) || "{}";
    let cur = {};
    try {
      cur = JSON.parse(raw);
    } catch {
      cur = {};
    }
    if (!cur || typeof cur !== "object") cur = {};
    cur[eventName] = (Number(cur[eventName]) || 0) + 1;
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

function exposeDebugApi() {
  if (typeof window === "undefined") return;
  if (window.__UR_FUNNEL__) return;
  window.__UR_FUNNEL__ = {
    getCounters: getFunnelCounters,
    /** @param {boolean} [alsoLog] */
    printSummary(alsoLog) {
      const c = getFunnelCounters();
      const table = Object.entries(c)
        .filter(([, n]) => Number(n) > 0)
        .sort((a, b) => b[1] - a[1]);
      if (alsoLog) {
        try {
          console.table(Object.fromEntries(table));
        } catch {
          console.log("[funnel]", c);
        }
      }
      return c;
    },
    resetCounters() {
      try {
        localStorage.removeItem(COUNTERS_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [payload]
 */
export function trackFunnelEvent(name, payload = {}) {
  const safe = sanitizeFunnelProps(payload);
  try {
    track(name, safe);
  } catch {
    /* analytics optional */
  }
  bumpLocalCounter(name);
  exposeDebugApi();
  if (import.meta.env.DEV) {
    try {
      console.debug(`[funnel] ${name}`, safe);
    } catch {
      /* ignore */
    }
  }
}

/** @returns {Record<string, number>} */
export function getFunnelCounters() {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY) || "{}";
    const cur = JSON.parse(raw);
    if (!cur || typeof cur !== "object") return {};
    /** @type {Record<string, number>} */
    const out = {};
    for (const [k, v] of Object.entries(cur)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}
