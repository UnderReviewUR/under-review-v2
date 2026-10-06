/**
 * Owner alert preferences — teams + interests (KV-backed).
 * Migrates v1 { barca, alabama } into the tailored shape.
 */

/** @typedef {{
 *   teams: Record<string, boolean>,
 *   customTeams: string[],
 *   interests: {
 *     transfers: boolean,
 *     injuries: boolean,
 *     roster: boolean,
 *     rumors: boolean,
 *     coaching: boolean,
 *     gameDay: boolean,
 *   },
 * }} OwnerAlertPrefs */

/** Curated chips — keep the list short and opinionated. */
export const CURATED_TEAMS = [
  { id: "barcelona", label: "Barcelona", league: "soccer", keywords: ["barcelona", "barça", "barca", "fcb"] },
  { id: "alabama", label: "Alabama", league: "cfb", keywords: ["alabama", "crimson tide", "roll tide"] },
  { id: "real_madrid", label: "Real Madrid", league: "soccer", keywords: ["real madrid", "los blancos"] },
  { id: "man_city", label: "Man City", league: "soccer", keywords: ["man city", "manchester city"] },
  { id: "arsenal", label: "Arsenal", league: "soccer", keywords: ["arsenal", "gunners"] },
  { id: "liverpool", label: "Liverpool", league: "soccer", keywords: ["liverpool", "reds"] },
  { id: "ne_patriots", label: "Patriots", league: "nfl", keywords: ["patriots", "new england"] },
  { id: "dal_cowboys", label: "Cowboys", league: "nfl", keywords: ["cowboys", "dallas"] },
  { id: "kc_chiefs", label: "Chiefs", league: "nfl", keywords: ["chiefs", "kansas city"] },
];

export const INTEREST_DEFS = [
  { id: "transfers", label: "Transfers", hint: "Deals, bids, medicals" },
  { id: "injuries", label: "Injuries", hint: "Out / doubtful / surgery" },
  { id: "roster", label: "Roster / lineup", hint: "Depth, starters, portal" },
  { id: "rumors", label: "Rumors", hint: "Soft links — easy to spam" },
  { id: "coaching", label: "Coaching", hint: "Hires, fires, coordinators" },
  { id: "gameDay", label: "Game-day", hint: "Availability, kickoff notes" },
];

/** @type {OwnerAlertPrefs["interests"]} */
export const DEFAULT_INTERESTS = {
  transfers: true,
  injuries: true,
  roster: true,
  rumors: false,
  coaching: true,
  gameDay: true,
};

/**
 * @returns {Record<string, boolean>}
 */
export function defaultTeamMap() {
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const t of CURATED_TEAMS) {
    // Sensible defaults: Barça + Alabama on; rest off until owner picks.
    out[t.id] = t.id === "barcelona" || t.id === "alabama";
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {OwnerAlertPrefs}
 */
export function normalizeOwnerAlertPrefs(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  // v1 migrate: { barca, alabama }
  const isV1 =
    (src.barca !== undefined || src.alabama !== undefined) &&
    src.teams === undefined &&
    src.interests === undefined;

  /** @type {Record<string, boolean>} */
  const teams = defaultTeamMap();
  if (isV1) {
    teams.barcelona = src.barca !== false && src.barca !== 0 && src.barca !== "0";
    teams.alabama = src.alabama !== false && src.alabama !== 0 && src.alabama !== "0";
  } else if (src.teams && typeof src.teams === "object") {
    for (const t of CURATED_TEAMS) {
      const v = src.teams[t.id];
      if (v === false || v === 0 || v === "0") teams[t.id] = false;
      else if (v === true || v === 1 || v === "1") teams[t.id] = true;
    }
  }

  const customRaw = Array.isArray(src.customTeams) ? src.customTeams : [];
  const customTeams = [
    ...new Set(
      customRaw
        .map((x) => String(x || "").replace(/\s+/g, " ").trim())
        .filter((x) => x.length >= 2 && x.length <= 40),
    ),
  ].slice(0, 8);

  /** @type {OwnerAlertPrefs["interests"]} */
  const interests = { ...DEFAULT_INTERESTS };
  const interestSrc =
    src.interests && typeof src.interests === "object" ? src.interests : {};
  for (const def of INTEREST_DEFS) {
    const v = interestSrc[def.id];
    if (v === false || v === 0 || v === "0") interests[def.id] = false;
    else if (v === true || v === 1 || v === "1") interests[def.id] = true;
  }

  return { teams, customTeams, interests };
}

/**
 * @param {OwnerAlertPrefs} prefs
 * @param {string} teamId
 */
export function isTeamEnabled(prefs, teamId) {
  return Boolean(prefs?.teams?.[teamId]);
}

/**
 * @param {string} hay
 * @param {OwnerAlertPrefs} prefs
 * @returns {string[]} matched team ids + custom labels
 */
export function matchTeamsInText(hay, prefs) {
  const text = String(hay || "").toLowerCase();
  /** @type {string[]} */
  const hits = [];
  for (const t of CURATED_TEAMS) {
    if (!prefs.teams?.[t.id]) continue;
    if (t.keywords.some((k) => text.includes(k))) hits.push(t.id);
  }
  for (const custom of prefs.customTeams || []) {
    const c = custom.toLowerCase();
    if (c && text.includes(c)) hits.push(`custom:${custom}`);
  }
  return hits;
}

/**
 * Soft / rumor language — only bounce if interests.rumors is on.
 * @param {string} title
 */
export function looksLikeSoftRumor(title) {
  return /\blinked with\b|\blinked to\b|\binterested in\b|\beyeing\b|\bmonitoring\b|\bcould sign\b|\bcould join\b|\bkeeping tabs\b/i.test(
    String(title || ""),
  );
}

/**
 * Gate a scored transfer alert against owner prefs.
 * @param {{ barca?: boolean, title?: string, reasons?: string[] }} alert
 * @param {OwnerAlertPrefs} prefs
 * @returns {{ ok: boolean, reason?: string }}
 */
export function transferAlertPassesPrefs(alert, prefs) {
  if (!prefs) return { ok: true };
  const title = String(alert.title || "");
  const hay = `${title} ${(alert.reasons || []).join(" ")}`;

  // Team gate: must hit an enabled curated/custom team.
  const teamHits = matchTeamsInText(hay, prefs);
  // Barça-flagged alerts also count as barcelona when that chip is on.
  if (alert.barca && prefs.teams?.barcelona) {
    if (!teamHits.includes("barcelona")) teamHits.push("barcelona");
  }
  if (!teamHits.length) return { ok: false, reason: "team_not_selected" };

  // Interest gate
  if (looksLikeSoftRumor(title)) {
    if (!prefs.interests?.rumors) return { ok: false, reason: "rumors_off" };
    return { ok: true };
  }
  if (!prefs.interests?.transfers) return { ok: false, reason: "transfers_off" };
  return { ok: true };
}

/**
 * Gate an Alabama scored item against owner prefs.
 * @param {{ title?: string, reasons?: string[] }} alert
 * @param {OwnerAlertPrefs} prefs
 * @returns {{ ok: boolean, reason?: string }}
 */
export function alabamaAlertPassesPrefs(alert, prefs) {
  if (!prefs?.teams?.alabama) return { ok: false, reason: "alabama_off" };
  const title = String(alert.title || "");
  const reasons = (alert.reasons || []).join(" ").toLowerCase();
  const blob = `${title} ${reasons}`.toLowerCase();

  /** @type {string[]} */
  const matched = [];
  if (/\binjur|out for|ruled out|surgery|acl|concussion|sidelined|questionable|doubtful\b/.test(blob)) {
    matched.push("injuries");
  }
  if (/\broster|depth chart|starter|starting|suspended|portal|inactive\b/.test(blob)) {
    matched.push("roster");
  }
  if (/\bcoach|coaching|coordinator|hired|fired|dismissed\b/.test(blob)) {
    matched.push("coaching");
  }
  if (/\bgame day|gameday|kickoff|practice|limited|cleared|available|returns\b/.test(blob)) {
    matched.push("gameDay");
  }
  if (looksLikeSoftRumor(title)) matched.push("rumors");

  if (!matched.length) {
    // Generic Alabama signal with no classified interest — allow if roster or injuries on.
    if (prefs.interests?.roster || prefs.interests?.injuries) return { ok: true };
    return { ok: false, reason: "no_interest_match" };
  }

  const anyOn = matched.some((id) => prefs.interests?.[id]);
  return anyOn ? { ok: true } : { ok: false, reason: "interest_off" };
}
