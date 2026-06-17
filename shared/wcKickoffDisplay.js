/**
 * WC kickoff display — ET only (product standard).
 */

import { getTomorrowEtDateString } from "./nbaPlayoffSlateFromActionNetwork.js";

const ET_ZONE = "America/New_York";
/** US Central — common local view for WC host cities west of ET. */
const CT_ZONE = "America/Chicago";
/** After-midnight ET through 5:59am counts on the prior evening broadcast slate. */
const BROADCAST_LATE_ET_HOUR = 6;

/** Today in ET as YYYY-MM-DD (matches en-CA toLocaleDateString). */
export function wcTodayEtYmd(nowMs = Date.now()) {
  return new Date(nowMs).toLocaleDateString("en-CA", { timeZone: ET_ZONE });
}

/**
 * Calendar date in ET for a kickoff timestamp.
 * @param {number | string | null | undefined} commenceTs
 * @returns {string}
 */
export function wcMatchEtDateYmd(commenceTs) {
  const ts = Number(commenceTs);
  if (!Number.isFinite(ts) || ts <= 0) return "";
  return new Date(ts).toLocaleDateString("en-CA", { timeZone: ET_ZONE });
}

/**
 * Slate filter date — FIFA matchday when available; reconcile late ET kickoffs on next UTC day.
 * @param {{ date?: string, commenceTs?: number | string, time?: string } | null | undefined} match
 */
export function resolveWcMatchSlateEtDate(match) {
  const fromDate = String(match?.date || "").trim().slice(0, 10);
  const ts = Number(match?.commenceTs);
  const fromTs = wcMatchEtDateYmd(match?.commenceTs);
  const utcDate =
    Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString().slice(0, 10) : "";

  let candidate = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) candidate = fromDate;
  else {
    const parsed = parseWcKickoffEtMs(match?.date, match?.time);
    if (parsed != null) candidate = wcMatchEtDateYmd(parsed);
    else if (fromTs) candidate = fromTs;
    else candidate = resolveWcMatchEtDate(match);
  }

  if (fromTs && utcDate && utcDate > fromTs && candidate === fromTs) {
    const etHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: ET_ZONE,
        hour: "numeric",
        hour12: false,
      }).format(new Date(ts)),
    );
    if (etHour >= 21) return utcDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate) && fromTs && fromDate !== fromTs) {
    return fromDate > fromTs ? fromDate : fromTs;
  }

  return candidate;
}

/**
 * Best ET slate date for filtering Today tab.
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 * @returns {string}
 */
export function resolveWcMatchEtDate(match) {
  if (!match) return "";
  const fromTs = wcMatchEtDateYmd(match.commenceTs);
  if (fromTs) return fromTs;
  const parsed = parseWcKickoffEtMs(match.date, match.time);
  if (parsed != null) return wcMatchEtDateYmd(parsed);
  return String(match.date || "").trim().slice(0, 10);
}

/**
 * @param {{ date?: string, time?: string, commenceTs?: number | string } | null | undefined} match
 */
export function hasExplicitWcSlateDate(match) {
  const fromDate = String(match?.date || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return true;
  return parseWcKickoffEtMs(match?.date, match?.time) != null;
}

/**
 * Include a fixture on an ET slate day when kickoff ET or FIFA matchday date matches.
 * @param {{ date?: string, time?: string, commenceTs?: number | string } | null | undefined} match
 * @param {string} ymd
 */
export function wcMatchDatesIncludeYmd(match, ymd) {
  const target = String(ymd || "").trim();
  if (!target || !match) return false;
  if (resolveWcMatchEtDate(match) === target) return true;
  if (hasExplicitWcSlateDate(match) && resolveWcMatchSlateEtDate(match) === target) return true;
  return false;
}

/**
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 * @returns {number}
 */
export function resolveWcMatchKickoffMs(match) {
  if (!match || typeof match !== "object") return NaN;
  let ms = Number(match.commenceTs);
  if (Number.isFinite(ms) && ms > 0) return ms;
  const parsed = parseWcKickoffEtMs(match.date, match.time);
  return parsed ?? NaN;
}

/**
 * @param {number} kickoffMs
 * @returns {number}
 */
export function wcMatchEtHour(kickoffMs) {
  const ts = Number(kickoffMs);
  if (!Number.isFinite(ts)) return NaN;
  return Number(
    formatInZone(dateFromMs(ts), ET_ZONE, {
      hour: "numeric",
      hour12: false,
    }),
  );
}

/**
 * True for 12:00am–5:59am ET — still "tonight" in Central/Mountain/Pacific.
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 */
export function wcMatchIsEarlyEtMorningKickoff(match) {
  const hour = wcMatchEtHour(resolveWcMatchKickoffMs(match));
  return Number.isFinite(hour) && hour < BROADCAST_LATE_ET_HOUR;
}

/**
 * Today's slate in ET plus after-midnight ET games still on the prior US evening.
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 * @param {string} ymd
 */
export function wcMatchOnEtBroadcastSlateDay(match, ymd) {
  const target = String(ymd || "").trim();
  if (!target || !match) return false;
  if (wcMatchDatesIncludeYmd(match, target)) return true;

  const kickoffMs = resolveWcMatchKickoffMs(match);
  if (!Number.isFinite(kickoffMs)) return false;
  if (wcMatchEtDateYmd(kickoffMs) !== getTomorrowEtDateString(target)) return false;
  return wcMatchIsEarlyEtMorningKickoff(match);
}

/**
 * @param {number} ts
 * @returns {Date}
 */
function dateFromMs(ts) {
  return new Date(ts);
}

/**
 * @param {Date} d
 * @param {string} timeZone
 * @param {Intl.DateTimeFormatOptions} options
 */
function formatInZone(d, timeZone, options) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(d);
  } catch {
    return "";
  }
}

/**
 * @param {string} dateYmd — YYYY-MM-DD
 * @param {string} timeEt — e.g. "15:00 ET"
 * @returns {number | null}
 */
export function parseWcKickoffEtMs(dateYmd, timeEt) {
  const date = String(dateYmd || "").trim();
  if (!date) return null;
  const timeRaw = String(timeEt || "").trim();
  const m = timeRaw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const ampm = timeRaw.match(/\b(AM|PM)\b/i)?.[1]?.toUpperCase();
  if (ampm === "AM" && hour === 12) hour = 0;
  else if (ampm === "PM" && hour !== 12) hour += 12;

  const etWall = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const probe = new Date(`${etWall}Z`);
  if (Number.isNaN(probe.getTime())) return null;

  const etFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  for (const offsetHours of [4, 5]) {
    const candidate = new Date(`${etWall}Z`);
    candidate.setUTCHours(candidate.getUTCHours() + offsetHours);
    const parts = etFormatter.formatToParts(candidate);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    if (
      get("year") === parseInt(date.slice(0, 4), 10) &&
      get("month") === parseInt(date.slice(5, 7), 10) &&
      get("day") === parseInt(date.slice(8, 10), 10) &&
      get("hour") === hour &&
      get("minute") === minute
    ) {
      return candidate.getTime();
    }
  }

  return null;
}

/**
 * @param {number} kickoffMs
 */
function shouldShowCentralKickoffHint(kickoffMs) {
  const hour = wcMatchEtHour(kickoffMs);
  return Number.isFinite(hour) && (hour >= 19 || hour < BROADCAST_LATE_ET_HOUR);
}

/**
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 * @param {{ nowMs?: number, viewerTimeZone?: string }} [opts]
 * @returns {string}
 */
export function formatWcKickoffDisplay(match, opts = {}) {
  if (!match) return "";

  let kickoffMs = resolveWcMatchKickoffMs(match);
  if (!Number.isFinite(kickoffMs) || kickoffMs <= 0) {
    const fallback = [match.date, match.time].filter(Boolean).join(" ");
    return fallback || "";
  }

  const d = dateFromMs(kickoffMs);

  const etDay = formatInZone(d, ET_ZONE, { weekday: "short" });
  const etTime = formatInZone(d, ET_ZONE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const etPart = `${etDay} ${etTime} ET`.replace(/\s+/g, " ").trim();

  const viewerTz = String(opts.viewerTimeZone || "").trim();
  const localTz =
    viewerTz && viewerTz !== ET_ZONE
      ? viewerTz
      : opts.alwaysShowCentral || shouldShowCentralKickoffHint(kickoffMs)
        ? CT_ZONE
        : "";
  if (!localTz) return etPart;

  const localDay = formatInZone(d, localTz, { weekday: "short" });
  const localTime = formatInZone(d, localTz, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const tzName = formatInZone(d, localTz, { timeZoneName: "short" });
  return `${etPart} · ${localDay} ${localTime} ${tzName}`.replace(/\s+/g, " ").trim();
}

/**
 * ET-only kickoff for compact slate breakdown (no Central duplicate).
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 */
export function formatWcKickoffEtOnly(match) {
  if (!match) return "";
  const kickoffMs = resolveWcMatchKickoffMs(match);
  if (!Number.isFinite(kickoffMs) || kickoffMs <= 0) {
    const timeRaw = String(match.time || "").trim();
    const m = timeRaw.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*ET/i);
    return m ? `${m[1].replace(/\s+/g, " ")} ET` : timeRaw;
  }
  const etTime = formatInZone(dateFromMs(kickoffMs), ET_ZONE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${etTime} ET`.replace(/\s+/g, " ").trim();
}

/**
 * Live ribbon for UR Take cards — must include "Live" for parseUrTakeResponse ribbon detection.
 * @param {Record<string, unknown> | null | undefined} match
 * @param {string} [home]
 * @param {string} [away]
 */
export function formatWcLiveGameStateLine(match, home, away) {
  if (!match || typeof match !== "object") return "";
  const h = String(home || match.homeTeam || "")
    .trim()
    .toUpperCase();
  const a = String(away || match.awayTeam || "")
    .trim()
    .toUpperCase();
  if (!h || !a) return "";

  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  const hasScore = Number.isFinite(hs) && Number.isFinite(as);
  const status = String(match.status || "").toLowerCase();
  const isLiveStatus = ["live", "in_progress", "1h", "2h", "ht"].includes(status);
  if (!isLiveStatus && !(hasScore && hs + as > 0)) return "";

  const scoreBit = hasScore ? `${hs}-${as}` : "";
  const minuteRaw = match.minute != null ? String(match.minute).trim().replace(/'/g, "") : "";
  let clockBit = "";
  if (minuteRaw) clockBit = `${minuteRaw}'`;
  else if (status === "2h" || status === "2nd") clockBit = "2H";
  else if (status === "ht") clockBit = "HT";
  else if (status === "1h") clockBit = "1H";

  const core = scoreBit ? `${h} ${scoreBit} ${a}` : `${h} vs ${a}`;
  return [core, clockBit, "Live"].filter(Boolean).join(" · ");
}
