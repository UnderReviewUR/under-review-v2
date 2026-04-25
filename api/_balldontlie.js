// api/_balldontlie.js

import { getEnv } from "./_env.js";

const BDL_BASE = "https://api.balldontlie.io";

function buildQueryString(params = {}) {
  const parts = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }

  return parts.length ? `?${parts.join("&")}` : "";
}

export async function bdlFetch(endpoint, params = {}, options = {}) {
  const apiKey = options.apiKey || getEnv("BALLDONTLIE_API_KEY") || "";
  const timeoutMs = options.timeoutMs || 8000;

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Missing BALLDONTLIE_API_KEY",
      url: null,
    };
  }

  const query = buildQueryString(params);
  const url = `${BDL_BASE}${endpoint}${query}`;

  let controller = null;
  let timer = null;

  try {
    controller = new AbortController();
    timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    let json = null;
    let text = null;

    try {
      json = await res.json();
    } catch {
      try {
        text = await res.text();
      } catch {
        text = null;
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: json,
        error:
          (json && (json.error || json.message)) ||
          text ||
          `BALLDONTLIE request failed with status ${res.status}`,
        url,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json,
      error: null,
      url,
    };
  } catch (err) {
    if (timer) clearTimeout(timer);

    return {
      ok: false,
      status: 0,
      data: null,
      error: "Something went wrong. Please try again.",
      url,
    };
  }
}
