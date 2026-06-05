/**
 * Shared fetch-with-timeout helper — replaces the AbortController + setTimeout
 * boilerplate duplicated across ESPN, OpenF1, book-scrape, and weather callers.
 *
 * Returns { ok, status, data|text, error } to match the convention already used
 * by _golfProviders.safeFetchJson, _takeLedger.safeFetchJson, f1.safeFetch, etc.
 */

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, headers?: Record<string, string>, parseAs?: 'json' | 'text' }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: unknown, error: string | null }>}
 */
export async function fetchWithTimeout(url, opts = {}) {
  const { timeoutMs = 10000, headers = {}, parseAs = "json" } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}` };
    }
    const data = parseAs === "text" ? await res.text() : await res.json();
    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, data: null, error: err?.message || "fetch failed" };
  }
}
