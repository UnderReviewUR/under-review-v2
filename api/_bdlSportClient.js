/**
 * Shared BallDontLie sport client helpers (bracket array params, pagination).
 */
import { bdlFetch } from "./_balldontlie.js";
import { getEnv } from "./_env.js";

/**
 * BDL expects bracket array params (`team_ids[]=1`), not bare repeats.
 * @param {Record<string, unknown>} params
 */
export function bdlBracketQueryParams(params = {}) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) out[`${key}[]`] = value;
    else out[key] = value;
  }
  return out;
}

/** La Liga / soccer OpenAPI uses explode array params (`dates=2026-09-01&dates=2026-09-02`). */
export function bdlExplodeQueryParams(params = {}) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

/**
 * @param {Record<string, unknown>} params
 * @param {{ explodeArrayKeys?: string[] }} [opts]
 */
export function bdlSportQueryParams(params = {}, opts = {}) {
  const explode = new Set(opts.explodeArrayKeys || []);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (explode.has(key)) out[key] = value;
      else out[`${key}[]`] = value;
    } else out[key] = value;
  }
  return out;
}

/**
 * @param {string} apiPrefix e.g. /ncaaf/v1
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 * @param {{ apiKey?: string, timeoutMs?: number }} [opts]
 */
export async function bdlSportFetch(apiPrefix, path, params = {}, opts = {}) {
  const apiKey = opts.apiKey || String(getEnv("BALLDONTLIE_API_KEY") || "").trim();
  if (!apiKey) return { ok: false, status: 0, data: null, error: "missing_bdl_key" };
  const p = path.startsWith("/") ? path : `/${path}`;
  const full = p.startsWith(apiPrefix) ? p : `${apiPrefix}${p.startsWith("/") ? p : `/${p}`}`;
  const queryParams = opts.explodeArrayKeys?.length
    ? bdlSportQueryParams(params, { explodeArrayKeys: opts.explodeArrayKeys })
    : bdlBracketQueryParams(params);
  return bdlFetch(full, queryParams, {
    apiKey,
    timeoutMs: opts.timeoutMs ?? 15000,
  });
}

/**
 * @param {string} apiPrefix
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 * @param {{ apiKey?: string, timeoutMs?: number, maxPages?: number, perPage?: number }} [opts]
 */
export async function bdlSportFetchAllPages(apiPrefix, path, params = {}, opts = {}) {
  const maxPages = Math.max(1, Math.min(Number(opts.maxPages) || 8, 20));
  const perPage = Math.max(1, Math.min(Number(opts.perPage) || 100, 100));
  /** @type {unknown[]} */
  const rows = [];
  let cursor = null;
  for (let page = 0; page < maxPages; page++) {
    const res = await bdlSportFetch(
      apiPrefix,
      path,
      { ...params, per_page: perPage, ...(cursor != null ? { cursor } : {}) },
      opts,
    );
    if (!res.ok) {
      return { ok: false, status: res.status, data: rows, error: res.error || "fetch_failed" };
    }
    const batch = Array.isArray(res.data?.data) ? res.data.data : [];
    rows.push(...batch);
    cursor = res.data?.meta?.next_cursor ?? null;
    if (cursor == null || !batch.length) break;
  }
  return { ok: true, status: 200, data: rows, error: null };
}
