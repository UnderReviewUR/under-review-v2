import { findStadiumByCity } from "../data/wc2026Stadiums.js";
import {
  formatWcMatchGroupLetter,
  formatWcMatchFieldText,
  formatWcMatchVenueLine,
} from "../../shared/wcMatchFieldDisplay.js";
import { getWcTeamByAbbr } from "../data/wc2026Teams.js";
import { parseWcKickoffEtMs } from "../../shared/wcKickoffDisplay.js";

const ET_ZONE = "America/New_York";

/**
 * @param {{ commenceTs?: number, date?: string, time?: string } | null | undefined} match
 * @returns {number | null}
 */
function kickoffMs(match) {
  if (!match) return null;
  let ms = Number(match.commenceTs);
  if (Number.isFinite(ms) && ms > 0) return ms;
  return parseWcKickoffEtMs(match.date, match.time);
}

/**
 * @param {{ commenceTs?: number, date?: string, time?: string } | null | undefined} match
 * @returns {string}
 */
export function formatWcFeaturedDateLine(match) {
  const ms = kickoffMs(match);
  if (!ms) {
    const d = String(match?.date || "").trim();
    if (!d) return "";
    try {
      const parts = d.split("-");
      if (parts.length === 3) {
        const dt = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12));
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: ET_ZONE,
        })
          .format(dt)
          .toUpperCase();
      }
    } catch {
      /* ignore */
    }
    return d.toUpperCase();
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: ET_ZONE,
    })
      .format(new Date(ms))
      .toUpperCase();
  } catch {
    return "";
  }
}

/**
 * @param {{ commenceTs?: number, date?: string, time?: string } | null | undefined} match
 * @returns {string}
 */
export function formatWcFeaturedTimeLine(match) {
  const ms = kickoffMs(match);
  if (!ms) {
    const t = String(match?.time || "").trim();
    return t ? t.toUpperCase() : "";
  }
  try {
    return `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: ET_ZONE,
    }).format(new Date(ms))} ET`.toUpperCase();
  } catch {
    return "";
  }
}

/**
 * @param {{ stadium?: string, city?: string } | null | undefined} match
 * @returns {string}
 */
export function formatWcFeaturedVenueLine(match) {
  const cityText = formatWcMatchFieldText(match?.city);
  const stadiumText = formatWcMatchFieldText(match?.stadium);
  const stadium =
    findStadiumByCity(cityText) ||
    findStadiumByCity(stadiumText) ||
    (stadiumText ? { name: stadiumText, city: cityText } : null);
  if (!stadium) {
    const fallback = formatWcMatchVenueLine(match?.stadium, match?.city);
    return fallback ? fallback.toUpperCase() : "";
  }
  const city = String(stadium.city || cityText || "").trim();
  const name = String(stadium.name || "").trim();
  if (name && city) return `${name}, ${city}`.toUpperCase();
  return (name || city).toUpperCase();
}

/**
 * @param {string} abbr
 * @param {Array<{ abbreviation?: string, name?: string, flagUrl?: string }>} [teams]
 */
export function resolveWcFeaturedTeam(abbr, teams) {
  const code = String(abbr || "").trim().toUpperCase();
  if (!code) return null;
  return getWcTeamByAbbr(code) || teams?.find((t) => String(t?.abbreviation || "").toUpperCase() === code) || null;
}

/**
 * @param {{ group?: string } | null | undefined} match
 * @param {string} [kicker]
 */
export function formatWcFeaturedGroupLabel(match, kicker = "") {
  const g = formatWcMatchGroupLetter(match?.group);
  const base = g ? `GROUP ${g}` : "";
  const k = String(kicker || "").trim();
  if (base && /live/i.test(k)) return `${base} · LIVE`;
  if (base && /next/i.test(k)) return base;
  return base || k.toUpperCase() || "FEATURED MATCH";
}
