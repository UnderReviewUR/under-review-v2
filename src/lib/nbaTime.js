/** Hour 0–23 in America/New_York for UI copy (empty slate, trust notes). */
export function getEtHour24() {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10,
  );
}

export function formatNbaTipoffLocal(startTimeUtc) {
  const raw = String(startTimeUtc || "").trim();
  if (!raw) return "TBD";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "TBD";
  return dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Tip time in America/New_York, e.g. "9:30 PM ET". */
export function formatNbaTipoffEt(startTimeUtc) {
  const raw = String(startTimeUtc || "").trim();
  if (!raw) return "TBD ET";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "TBD ET";
  return `${dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  })} ET`;
}

function etDateYmdFromMs(ms) {
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function getEtDateStringFromMs(ms = Date.now()) {
  return etDateYmdFromMs(ms) || "";
}

/**
 * @param {object} game
 * @param {number} [nowMs]
 * @returns {'Tonight'|'Tomorrow'|string}
 */
export function inferNbaSlateDayLabel(game, nowMs = Date.now()) {
  const preset = String(game?.slateDayLabel || "").trim();
  if (preset === "Tonight" || preset === "Tomorrow") return preset;
  const raw = String(game?.startTimeUtc || "").trim();
  const startMs = raw ? Date.parse(raw) : NaN;
  const todayEt = getEtDateStringFromMs(nowMs);
  const startEt = etDateYmdFromMs(startMs);
  if (startEt && todayEt && startEt > todayEt) return "Tomorrow";
  return "Tonight";
}

/**
 * Banner line: "SAS @ OKC · Game 3 · Tomorrow 9:30 PM ET"
 * @param {object} game
 * @param {string|null|undefined} seriesLabel e.g. "Game 3"
 */
export function formatNbaSlateBannerLine(game, seriesLabel) {
  const away = String(game?.awayTeam?.abbr || game?.awayTeam?.name || "Away").trim();
  const home = String(game?.homeTeam?.abbr || game?.homeTeam?.name || "Home").trim();
  const day = inferNbaSlateDayLabel(game);
  const tip = formatNbaTipoffEt(game?.startTimeUtc);
  const series = String(seriesLabel || "").trim();
  const parts = [`${away} @ ${home}`];
  if (series) parts.push(series);
  parts.push(`${day} ${tip}`);
  return parts.join(" · ");
}

/**
 * @param {object} game
 * @param {string|null|undefined} seriesLabel
 */
export function formatNbaGameTipoffWithDay(game, seriesLabel) {
  const day = inferNbaSlateDayLabel(game);
  const tip = formatNbaTipoffEt(game?.startTimeUtc);
  const series = String(seriesLabel || "").trim();
  if (series && day === "Tomorrow") return `${series} · ${day} ${tip}`;
  if (day === "Tomorrow") return `${day} ${tip}`;
  return formatNbaTipoffLocal(game?.startTimeUtc);
}

/**
 * Pre/scheduled games must never render with a missing or unparseable start instant.
 * When true, consumers should bust-cache refetch NBA board data (see useNbaData).
 */
export function isNbaTimeMismatch(game) {
  if (!game || typeof game !== "object") return false;
  const state = String(game.state || "").toLowerCase();
  if (state !== "pre" && state !== "scheduled") return false;
  const raw = String(game.startTimeUtc || "").trim();
  if (!raw) return true;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime());
}
