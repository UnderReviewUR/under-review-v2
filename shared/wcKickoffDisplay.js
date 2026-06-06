/**
 * WC kickoff display — ET canonical + browser-local time for global audience.
 */

const ET_ZONE = "America/New_York";

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
 * Short timezone label for the user's locale (browser default).
 * @param {Date} d
 */
function localTimeZoneShortName(d) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
    }).formatToParts(d);
    return parts.find((p) => p.type === "timeZoneName")?.value || "local";
  } catch {
    return "local";
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
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

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
 * @param {{ commenceTs?: number | string | null, date?: string, time?: string } | null | undefined} match
 * @param {{ nowMs?: number }} [opts]
 * @returns {string}
 */
export function formatWcKickoffDisplay(match, opts = {}) {
  if (!match) return "";

  let kickoffMs = Number(match.commenceTs);
  if (!Number.isFinite(kickoffMs) || kickoffMs <= 0) {
    const parsed = parseWcKickoffEtMs(match.date, match.time);
    kickoffMs = parsed ?? NaN;
  }
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

  let localPart = "";
  try {
    const localDay = formatInZone(d, undefined, { weekday: "short" });
    const localTime = formatInZone(d, undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const tz = localTimeZoneShortName(d);
    if (localDay && localTime) {
      localPart = `${localDay} ${localTime} ${tz}`.replace(/\s+/g, " ").trim();
    }
  } catch {
    localPart = "";
  }

  if (!localPart || localPart === etPart) return etPart;
  return `${etPart} · ${localPart}`;
}
