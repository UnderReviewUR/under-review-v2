/**
 * API-Football (API-Sports) HTTP client — WC backup stats (Phase 3).
 */

import { getWcApiFootballKey, WC_API_FOOTBALL_BASE_URL } from "../shared/wcApiFootballPolicy.js";

const TIMEOUT_MS = 12_000;

/**
 * @param {string} path — e.g. /fixtures
 * @param {Record<string, string | number | undefined>} [params]
 */
export async function fetchWcApiFootball(path, params = {}) {
  const key = getWcApiFootballKey();
  if (!key) {
    return { ok: false, status: 0, json: null, error: "missing_api_key", apiRemaining: null };
  }

  const url = new URL(`${WC_API_FOOTBALL_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "x-apisports-key": String(key).trim(),
        Accept: "application/json",
      },
    });
    clearTimeout(timer);

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const apiRemainingRaw = res.headers.get("x-ratelimit-requests-remaining");
    const apiRemaining = apiRemainingRaw != null ? Number(apiRemainingRaw) : null;

    const apiErrors = Array.isArray(json?.errors) ? json.errors : [];
    const errObj = json?.errors && typeof json.errors === "object" && !Array.isArray(json.errors)
      ? json.errors
      : null;
    const errMsg =
      apiErrors[0] ||
      (errObj ? Object.values(errObj).join("; ") : null) ||
      (!res.ok ? `http_${res.status}` : null);

    if (!res.ok || errMsg) {
      return {
        ok: false,
        status: res.status,
        json,
        error: String(errMsg || `http_${res.status}`),
        apiRemaining: Number.isFinite(apiRemaining) ? apiRemaining : null,
      };
    }

    return {
      ok: true,
      status: res.status,
      json,
      error: null,
      apiRemaining: Number.isFinite(apiRemaining) ? apiRemaining : null,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      json: null,
      error: err?.message || "fetch_failed",
      apiRemaining: null,
    };
  }
}
