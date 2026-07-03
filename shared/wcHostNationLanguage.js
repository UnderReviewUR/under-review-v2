/**
 * 2026 WC co-host language — "home favorite" is host-nation framing only, not listed homeTeam.
 */

import { getWcTeamByAbbr } from "../src/data/wc2026Teams.js";

export const WC_2026_HOST_ABBRS = new Set(["USA", "MEX", "CAN"]);

export const WC_HOME_FAVORITE_LANGUAGE_RULE = `HOME SIDE vs HOST NATION (binding):
- Fixture "homeTeam" is the listed home SIDE on the ticket ("Away vs Home"), NOT "playing in their home country."
- Only USA, Mexico (MEX), and Canada (CAN) are 2026 co-hosts. Use "home favorite" or "host-nation edge" ONLY when that host is homeTeam and the angle is about playing in a host market.
- BAD: "Australia sits +265 as home favorite" — Australia is not a host; say "Australia +265 on the moneyline" or "listed home side."
- GOOD: "Mexico -240 as the host nation at altitude" when MEX is homeTeam.
- Non-host listed home side: "listed home side", "[Team] [price] to win", or "on the moneyline" — never "home favorite."`;

/**
 * @param {string} abbr
 */
export function isWc2026HostNation(abbr) {
  return WC_2026_HOST_ABBRS.has(String(abbr || "").trim().toUpperCase());
}

/**
 * @param {string | null | undefined} homeTeamAbbr
 */
export function canUseWcHomeFavoriteLanguage(homeTeamAbbr) {
  return isWc2026HostNation(homeTeamAbbr);
}

/**
 * @param {string} label e.g. "EGY vs AUS"
 * @returns {string | null}
 */
export function parseWcMatchupLabelHomeAbbr(label) {
  const m = String(label || "").match(/\bvs\.?\s+([A-Z]{3})\b/i);
  return m ? String(m[1]).trim().toUpperCase() : null;
}

/**
 * @param {string} text
 * @param {{ homeTeam?: string | null, fixtureHome?: string | null }} [opts]
 */
export function repairWcHomeFavoriteLanguage(text, opts = {}) {
  const s = String(text || "");
  if (!/\bhome[\s-]?favor/i.test(s)) return s;

  const home = String(opts.homeTeam || opts.fixtureHome || "").trim().toUpperCase();
  if (home && canUseWcHomeFavoriteLanguage(home)) return s;

  let out = s;
  out = out.replace(/\bas\s+(?:the\s+)?home[\s-]?favorite\b/gi, "on the moneyline");
  out = out.replace(/\bhome[\s-]?nation\s+favorite\b/gi, "moneyline lean");
  out = out.replace(/\bhome[\s-]?favorite\b/gi, "listed home side");

  if (home) {
    const team = getWcTeamByAbbr(home);
    const name = String(team?.name || "").trim();
    if (name.length > 3) {
      out = out.replace(
        new RegExp(
          `${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^.;]{0,80}?)\\bhome[\\s-]?favorite\\b`,
          "gi",
        ),
        `${name}$1listed home side`,
      );
    }
  }

  return out;
}

/**
 * @param {string} text
 * @param {{ homeTeam?: string | null, fixtureHome?: string | null }} [opts]
 */
export function detectWcHomeFavoriteMislabel(text, opts = {}) {
  if (!/\bhome[\s-]?favor/i.test(String(text || ""))) return false;
  const home = String(opts.homeTeam || opts.fixtureHome || "").trim().toUpperCase();
  if (!home) return true;
  return !canUseWcHomeFavoriteLanguage(home);
}

export const WC_HOME_FAVORITE_MISLABEL_QA_SUFFIX = `

WC HOME-FAVORITE LANGUAGE (mandatory — prior answer misused "home favorite"):
- Only USA, MEX, and CAN are 2026 co-hosts. "homeTeam" in the fixture is the listed home SIDE, not playing in their home country.
- Never call Australia, Egypt, or any non-host a "home favorite."
- Use "[Team] [price] on the moneyline", "listed home side", or "host-nation edge" only for USA/MEX/CAN when homeTeam.`;
