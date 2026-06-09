/**
 * World Cup marketing deep links — Reddit/X and /about land on app with prefilled or auto-ask.
 *
 * App accepts (see App.jsx cold-load handler):
 *   /worldcup?q=<prompt>                   — short marketing path (X / Reddit)
 *   ?sport=worldcup&q=<prompt>           — open WC tab, auto-submit question
 *   ?wc=1&q=<prompt>                     — legacy alias
 *   ?sport=worldcup&q=<prompt>&prefill=1 — open WC tab, prefill input only
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
};

/**
 * @param {string} prompt
 * @param {{ base?: string, auto?: boolean }} [opts]
 * @returns {string}
 */
/**
 * @param {string} [pathname]
 * @returns {boolean}
 */
export function isWorldCupMarketingPath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "").toLowerCase();
  return p === WC_MARKETING_PATH || p.endsWith(`${WC_MARKETING_PATH}`);
}

export function buildWcAppDeepLink(prompt, opts = {}) {
  const auto = opts.auto !== false;
  const useShortPath = opts.path !== false;
  const origin = String(opts.base || "https://under-review.app").replace(/\/$/, "");
  const q = String(prompt || "").trim();

  if (useShortPath) {
    const u = new URL(`${origin}${WC_MARKETING_PATH}`);
    if (q) u.searchParams.set("q", q);
    if (!auto) u.searchParams.set("prefill", "1");
    return u.toString();
  }

  const u = new URL(`${origin}/`);
  u.searchParams.set("sport", "worldcup");
  if (q) u.searchParams.set("q", q);
  if (!auto) u.searchParams.set("prefill", "1");
  return u.toString();
}

/**
 * Parse marketing deep-link query params (client cold load).
 * @param {URLSearchParams} sp
 * @param {string} [pathname]
 * @returns {{ sport: string | null, q: string, prefillOnly: boolean, isWorldCup: boolean, cleanPath: string }}
 */
export function parseUrMarketingDeepLink(sp, pathname = "") {
  const sport = String(sp.get("sport") || "").trim().toLowerCase() || null;
  const qRaw = sp.get("q") ?? sp.get("prompt") ?? "";
  let q = String(qRaw || "").trim();
  if (q) {
    try {
      q = decodeURIComponent(q);
    } catch {
      /* keep raw */
    }
  }
  const prefillOnly = sp.get("prefill") === "1" || sp.get("auto") === "0";
  const pathHit = isWorldCupMarketingPath(pathname);
  const isWorldCup =
    pathHit ||
    sp.get("wc") === "1" ||
    sp.get("wc") === "true" ||
    sport === "worldcup" ||
    sport === "wc";
  const cleanPath = pathHit ? WC_MARKETING_PATH : "/";
  return { sport, q, prefillOnly, isWorldCup, cleanPath };
}
