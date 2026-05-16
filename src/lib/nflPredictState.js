import { NFL_2026_SCHEDULE } from "../data/nfl2026Schedule.js";

const LS_KEY = "ur_nfl_2026_picks";

const CONF_BUCKETS = [60, 70, 80, 90, 100];

function confToBucket(c) {
  const n = Number(c);
  const i = CONF_BUCKETS.indexOf(n);
  return i >= 0 ? i : 2;
}

function bucketToConf(b) {
  return CONF_BUCKETS[Math.max(0, Math.min(4, b))] ?? 80;
}

function bytesToBase64Url(buf) {
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(str) {
  if (!str || typeof str !== "string") return null;
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodePicks(picks) {
  const schedule = NFL_2026_SCHEDULE;
  const indices = [];
  for (let i = 0; i < schedule.length; i++) {
    const gid = schedule[i].id;
    if (picks[gid]?.winner) indices.push(i);
  }
  const buf = new Uint8Array(1 + indices.length * 3);
  buf[0] = 0x01;
  let o = 1;
  for (const idx of indices) {
    const g = schedule[idx];
    const p = picks[g.id];
    const winHome = p.winner === g.homeTeam ? 1 : 0;
    const bucket = confToBucket(p.confidence);
    buf[o] = idx & 0xff;
    buf[o + 1] = (idx >> 8) & 0xff;
    buf[o + 2] = (winHome & 1) | ((bucket & 7) << 1);
    o += 3;
  }
  return bytesToBase64Url(buf);
}

export function decodePicks(str, schedule) {
  try {
    const buf = base64UrlToBytes(str);
    if (!buf || buf.length < 1 || buf[0] !== 0x01 || (buf.length - 1) % 3 !== 0) return {};
    const out = {};
    for (let o = 1; o < buf.length; o += 3) {
      const idx = buf[o] | (buf[o + 1] << 8);
      const flags = buf[o + 2];
      const winHome = flags & 1;
      const bucket = (flags >> 1) & 7;
      const g = schedule[idx];
      if (!g) return {};
      const winner = winHome ? g.homeTeam : g.awayTeam;
      out[g.id] = { winner, confidence: bucketToConf(bucket) };
    }
    return out;
  } catch {
    return {};
  }
}

export function syncPicksToUrl(picks) {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const path = window.location.pathname || "/";
  const keys = Object.keys(picks || {}).filter((k) => picks[k]?.winner);
  if (keys.length === 0) {
    const u = new URL(window.location.href);
    u.searchParams.delete("picks");
    u.searchParams.delete("share");
    const q = u.searchParams.toString();
    window.history.replaceState(null, "", q ? `${path}?${q}` : path);
    return;
  }
  const enc = encodePicks(picks);
  const u = new URL(window.location.href);
  u.searchParams.set("picks", enc);
  u.searchParams.delete("share");
  u.searchParams.set("predictor", "1");
  window.history.replaceState(null, "", `${path}?${u.searchParams.toString()}`);
}

export function loadPicksFromUrl(schedule) {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search).get("picks");
  if (!p) return null;
  const decoded = decodePicks(p, schedule);
  return decoded && Object.keys(decoded).length ? decoded : {};
}

export function loadPicks() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function savePick(gameId, winner, confidence) {
  if (typeof window === "undefined") return;
  const cur = loadPicks();
  const next = { ...cur, [gameId]: { winner, confidence: Number(confidence) } };
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  syncPicksToUrl(next);
  window.dispatchEvent(
    new CustomEvent("nfl-pick-updated", { detail: { gameId, winner, confidence: Number(confidence) } }),
  );
}

export function clearPick(gameId) {
  if (typeof window === "undefined") return;
  const cur = loadPicks();
  const next = { ...cur };
  delete next[gameId];
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  syncPicksToUrl(next);
  window.dispatchEvent(new CustomEvent("nfl-pick-updated", { detail: { gameId, winner: null, confidence: null } }));
}

export function clearAllPicks() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  const path = window.location.pathname || "/";
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new CustomEvent("nfl-pick-updated", { detail: { cleared: true } }));
}

/**
 * Remove picks for all games involving `abbr`.
 * @param {string} abbr
 * @param {Record<string, { winner?: string, confidence?: number }>} picks
 * @param {readonly { id: string, homeTeam: string, awayTeam: string }[]} schedule
 * @returns {Record<string, { winner?: string, confidence?: number }>}
 */
export function clearTeamPicks(abbr, picks, schedule) {
  const newPicks = { ...(picks || {}) };
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    delete newPicks[g.id];
  }
  if (typeof window === "undefined") return newPicks;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(newPicks));
  } catch {
    /* ignore quota */
  }
  syncPicksToUrl(newPicks);
  window.dispatchEvent(
    new CustomEvent("nfl-pick-updated", { detail: { clearedTeam: abbr } }),
  );
  return newPicks;
}
