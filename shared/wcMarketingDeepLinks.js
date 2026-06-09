/**
 * World Cup marketing deep links — Reddit/X and /about land on app with prefilled or auto-ask.
 *
 * Short URLs (preferred for comments):
 *   /worldcup                              — open WC tab
 *   /worldcup?p=winner                     — auto-ask (short prompt key)
 *   /worldcup?p=goldenBoot&ask=0           — prefill ask bar only
 *
 * Legacy:
 *   /worldcup?q=<full prompt text>
 *   ?sport=worldcup&q=...&prefill=1
 */

export const WC_MARKETING_PATH = "/worldcup";

export const WC_MARKETING_FREE_TIER_LINE = "3 free questions · No card · No signup";

/** @type {Record<string, string>} */
export const WC_LANDING_PROMPTS = {
  tournament:
    "Give me your full tournament predictions — winner, dark horse, breakout player, and Golden Boot",
  groupValue:
    "What's the best group-stage value bet right now — one pick, direct answer?",
  winner: "Who wins the World Cup 2026 — one pick with why, not a list of contenders",
  goldenBoot: "Golden Boot pick for World Cup 2026 — who scores most and why?",
  darkHorse: "World Cup 2026 dark horse — one nation the market is sleeping on",
  usaParaguay:
    "USA vs Paraguay — best bet for Americans who only know the moneyline (group context, not just ML)",
  advancement:
    "Explain how World Cup group advancement betting works and one group qualify angle worth considering tonight",
  usaR16: "Will the USMNT reach the Round of 16?",
};

/**
 * @param {string} [pathname]
 * @returns {boolean}
 */
export function isWorldCupMarketingPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "").toLowerCase();
  return p === WC_MARKETING_PATH || p.endsWith(`${WC_MARKETING_PATH}`);
}

/**
 * Resolve short prompt key or raw question text.
 * @param {string} raw
 * @returns {{ key: string | null, prompt: string }}
 */
export function resolveWcMarketingPrompt(raw) {
  const s = String(raw || "").trim();
  if (!s) return { key: null, prompt: "" };
  if (WC_LANDING_PROMPTS[s]) return { key: s, prompt: WC_LANDING_PROMPTS[s] };
  const lower = s.toLowerCase();
  const key = Object.keys(WC_LANDING_PROMPTS).find((k) => k.toLowerCase() === lower);
  if (key) return { key, prompt: WC_LANDING_PROMPTS[key] };
  const byPrompt = Object.entries(WC_LANDING_PROMPTS).find(([, prompt]) => prompt === s);
  if (byPrompt) return { key: byPrompt[0], prompt: byPrompt[1] };
  return { key: null, prompt: s };
}

/**
 * @param {string} promptOrKey — WC_LANDING_PROMPTS key or full question text
 * @param {{ base?: string, auto?: boolean, path?: boolean }} [opts]
 * @returns {string}
 */
export function buildWcAppDeepLink(promptOrKey, opts = {}) {
  const auto = opts.auto !== false;
  const useShortPath = opts.path !== false;
  const origin = String(opts.base || "https://under-review.app").replace(/\/$/, "");
  const { key, prompt } = resolveWcMarketingPrompt(promptOrKey);

  if (useShortPath) {
    const u = new URL(`${origin}${WC_MARKETING_PATH}`);
    if (key) u.searchParams.set("p", key);
    else if (prompt) u.searchParams.set("q", prompt);
    if (!auto) u.searchParams.set("ask", "0");
    return u.toString();
  }

  const u = new URL(`${origin}/`);
  u.searchParams.set("sport", "worldcup");
  if (key) u.searchParams.set("p", key);
  else if (prompt) u.searchParams.set("q", prompt);
  if (!auto) u.searchParams.set("ask", "0");
  return u.toString();
}

/**
 * Parse marketing deep-link query params (client cold load).
 * @param {URLSearchParams} sp
 * @param {string} [pathname]
 * @returns {{ sport: string | null, q: string, prefillOnly: boolean, isWorldCup: boolean, cleanPath: string, promptKey: string | null }}
 */
export function parseUrMarketingDeepLink(sp, pathname = "") {
  const sport = String(sp.get("sport") || "").trim().toLowerCase() || null;
  const pKey = sp.get("p");
  const qRaw = pKey ?? sp.get("q") ?? sp.get("prompt") ?? "";
  let q = String(qRaw || "").trim();
  let promptKey = null;

  if (pKey) {
    const resolved = resolveWcMarketingPrompt(pKey);
    promptKey = resolved.key;
    q = resolved.prompt;
  } else if (q) {
    try {
      q = decodeURIComponent(q);
    } catch {
      /* keep raw */
    }
    const resolved = resolveWcMarketingPrompt(q);
    if (resolved.key) {
      promptKey = resolved.key;
      q = resolved.prompt;
    }
  }

  const prefillOnly =
    sp.get("prefill") === "1" || sp.get("auto") === "0" || sp.get("ask") === "0";
  const pathHit = isWorldCupMarketingPath(pathname);
  const isWorldCup =
    pathHit ||
    sp.get("wc") === "1" ||
    sp.get("wc") === "true" ||
    sport === "worldcup" ||
    sport === "wc";
  const cleanPath = pathHit ? WC_MARKETING_PATH : "/";
  return { sport, q, prefillOnly, isWorldCup, cleanPath, promptKey };
}

/**
 * Cold-load route for SPA — open World Cup tab from /worldcup or ?sport=worldcup.
 * @param {string} [pathname]
 * @param {string} [search]
 * @returns {{
 *   screen: string,
 *   tab: string,
 *   nflUrView?: string,
 *   wcDeepLinkAction?: { q: string, prefillOnly: boolean } | null,
 *   cleanPath?: string | null,
 * }}
 */
export function resolveUrColdLoadRoute(pathname = "", search = "") {
  const sp = new URLSearchParams(String(search || ""));
  const path = String(pathname || "");

  if (
    sp.has("predictor") ||
    sp.get("share") ||
    sp.get("picks") ||
    /\/predict-nfl/i.test(path) ||
    path.replace(/\/+$/, "").toLowerCase().endsWith("/nfl")
  ) {
    return { screen: "nfl", tab: "nfl", nflUrView: "predict", wcDeepLinkAction: null, cleanPath: null };
  }

  const { isWorldCup, q, prefillOnly, cleanPath } = parseUrMarketingDeepLink(sp, path);
  if (isWorldCup) {
    return {
      screen: "worldcup",
      tab: "worldcup",
      wcDeepLinkAction: q ? { q, prefillOnly } : null,
      cleanPath,
    };
  }

  return { screen: "home", tab: "home", wcDeepLinkAction: null, cleanPath: null };
}

/** Canonical share URL for X/Reddit comments — opens World Cup tab. */
export const WC_MARKETING_URL = "https://under-review.app/worldcup";
