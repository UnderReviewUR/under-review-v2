/**
 * World Cup — Golden Boot / top goalscorer role sanity checks for UR Take QA.
 */

import { normalizeWcPlayerName, playerRegistryKey } from "./wcPlayerRegistry.js";

/** Position codes that are not Golden Boot roles (registry + ESPN). */
const WC_DEFENSIVE_OR_CREATOR_POSITION_RE =
  /^(m$|mf$|cm$|dm$|cdm$|cam$|rm$|lm$|am$|d$|df$|cb$|lb$|rb$|wb$|gk$|g$|def|mid|midfielder|defender|goalkeeper)\b/i;

/** Bellingham-style goalscoring mids — allow despite M label. */
const WC_SCORER_MID_ALLOWLIST =
  /\b(jude\s+bellingham|bellingham|kevin\s+de\s+bruyne|de\s+bruyne|mohamed\s+salah|salah|phil\s+foden|foden)\b/i;

/** Players whose primary role makes them implausible top-goalscorer picks (creators / DM). */
export const WC_IMPLAUSIBLE_TOP_SCORER_PROFILES = [
  { pattern: /\bpedri\b/i, label: "Pedri" },
  { pattern: /\brodri\b/i, label: "Rodri" },
  { pattern: /\bluka\s+modric\b/i, label: "Modrić" },
  { pattern: /\bmodric\b/i, label: "Modric" },
  { pattern: /\bde\s+jong\b/i, label: "De Jong" },
  { pattern: /\bdeclan\s+rice\b/i, label: "Rice" },
  { pattern: /\bjorginho\b/i, label: "Jorginho" },
  { pattern: /\bbusquets\b/i, label: "Busquets" },
  { pattern: /\bkobbie\s+mainoo\b/i, label: "Mainoo" },
];

const WC_SCORER_MONONYMS =
  /(?:^|[^a-z])(mbapp[eé]|haaland|kane|yamal|vin[ií]cius|vinicius|lautaro|messi|ronaldo|salah|osimhen|griezmann|griezman|lewandowski|de\s+bruyne|bellingham|endrick|neymar|foden|saka|palmer|dembele|demb[eé]l[eé]|raphinha|giroud|antony|martinelli|wirtz)(?:[^a-z]|$)/i;

const WC_SCORER_FULL_NAME =
  /\b[A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+){1,2}\b/;

const VAGUE_TOP_SCORER_RE =
  /\b(board hasn't|board has not|not posted|no individual odds|no odds yet|midfielder-forward hybrid|structure favors a|hybrid from a team|consensus names|without naming|cannot name|can't name|unspecified|tbd player|unknown player)\b/i;

const PASS_WITH_NAMED_LEAN_RE =
  /\bpass\b/i;

/**
 * @param {string} text
 */
export function hasWcPlayerNameInText(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (WC_SCORER_MONONYMS.test(t)) return true;
  const names = t.match(new RegExp(WC_SCORER_FULL_NAME.source, "g")) || [];
  const nations = new Set([
    "South Africa",
    "Saudi Arabia",
    "Cape Verde",
    "Ivory Coast",
    "Costa Rica",
    "New Zealand",
    "United States",
    "South Korea",
    "North Korea",
    "Bosnia Herzegovina",
  ]);
  return names.some((n) => {
    const s = n.trim();
    if (s.length < 4) return false;
    if (nations.has(s)) return false;
    if (/^(Group Stage|Round Of|Dark Horse|Breakout Player|Top Goalscorer|Winners)$/i.test(s)) {
      return false;
    }
    return true;
  });
}

/**
 * Top goalscorer roundup slot must name a player — or an explicit Pass with a named lean.
 * @param {string} value — parsed slot value after "Top goalscorer:"
 */
export function isWcRoundupTopScorerSlotValid(value) {
  const v = String(value || "").trim();
  if (!v || v.length < 3) return false;
  if (VAGUE_TOP_SCORER_RE.test(v)) return false;
  if (hasWcPlayerNameInText(v)) return true;
  if (PASS_WITH_NAMED_LEAN_RE.test(v) && /\b(structurally|lean|favor|tier|mbapp|haaland|yamal|kane|vin[ií]cius)\b/i.test(v)) {
    return true;
  }
  return false;
}

/**
 * @param {string} value
 */
export function isWcRoundupNationSlotValid(value) {
  const v = String(value || "").trim();
  if (!v || v.length < 2) return false;
  return /\b[A-Z]{2,4}\b/.test(v) || /\b(spain|france|brazil|england|argentina|germany|norway|colombia|portugal|mexico|usa|uruguay|morocco|japan|netherlands|italy|belgium|switzerland|ecuador|senegal|australia|canada|türkiye|turkey|paraguay|chile|peru|croatia|denmark|sweden|poland|ukraine|austria|serbia|wales|scotland|ireland|qatar|saudi|korea|egypt|iran|ghana|cameroon|nigeria|tunisia|algeria|costa|panama|jamaica|haiti|honduras|curacao|curaçao)\b/i.test(
    v,
  );
}

/**
 * @param {string} value
 */
export function isWcRoundupBreakoutSlotValid(value) {
  const v = String(value || "").trim();
  if (!v || v.length < 3) return false;
  if (VAGUE_TOP_SCORER_RE.test(v)) return false;
  return hasWcPlayerNameInText(v);
}

/**
 * @param {Array<{ key: string, value?: string }>} slots
 */
export function wcRoundupInvalidSlotKeys(slots) {
  /** @type {string[]} */
  const invalid = [];
  for (const slot of slots || []) {
    const key = String(slot?.key || "");
    const value = String(slot?.value || "").trim();
    if (key === "topScorer" && !isWcRoundupTopScorerSlotValid(value)) {
      invalid.push("topScorer");
    } else if (key === "breakout" && !isWcRoundupBreakoutSlotValid(value)) {
      invalid.push("breakout");
    } else if ((key === "winners" || key === "darkHorse") && !isWcRoundupNationSlotValid(value)) {
      invalid.push(key);
    }
  }
  return invalid;
}

/**
 * @param {string | null | undefined} position
 */
export function isWcImplausibleGoldenBootPosition(position) {
  const p = String(position || "").trim();
  if (!p) return false;
  if (WC_SCORER_MID_ALLOWLIST.test(p)) return false;
  if (/^f/i.test(p) || /\b(fw|st|cf|lw|rw|ss|forward|striker|winger)\b/i.test(p)) {
    return false;
  }
  return WC_DEFENSIVE_OR_CREATOR_POSITION_RE.test(p);
}

/**
 * @param {string} playerName
 * @param {Record<string, { players?: Array<{ name: string, position?: string | null }> }>} [registryTeams]
 */
export function lookupRegistryPositionForPlayer(playerName, registryTeams) {
  const teams = registryTeams && typeof registryTeams === "object" ? registryTeams : {};
  const target = normalizeWcPlayerName(playerName).toLowerCase();
  if (!target) return null;

  for (const team of Object.values(teams)) {
    const players = Array.isArray(team?.players) ? team.players : [];
    for (const p of players) {
      if (normalizeWcPlayerName(p?.name).toLowerCase() === target) {
        return p?.position ? String(p.position) : null;
      }
    }
  }

  for (const [abbr, team] of Object.entries(teams)) {
    const players = Array.isArray(team?.players) ? team.players : [];
    for (const p of players) {
      const key = playerRegistryKey(p?.name, abbr);
      if (key.endsWith(`|${target}`)) {
        return p?.position ? String(p.position) : null;
      }
    }
  }

  return null;
}

/**
 * @param {string} text
 */
export function extractLikelyScorerPlayerNames(text) {
  const t = String(text || "");
  /** @type {string[]} */
  const names = [];

  if (WC_SCORER_MONONYMS.test(t)) {
    const m = t.match(WC_SCORER_MONONYMS);
    if (m?.[1]) names.push(m[1]);
  }

  const full = t.match(new RegExp(WC_SCORER_FULL_NAME.source, "g")) || [];
  for (const n of full) {
    const s = n.trim();
    if (s.length >= 4 && !/^(Top Goalscorer|Dark Horse|Breakout Player|Winners)$/i.test(s)) {
      names.push(s);
    }
  }

  return [...new Set(names)];
}

/**
 * Detect creator/DM named as top goalscorer (not assist prop context).
 * @param {string} text
 * @param {{ topScorerSlotValue?: string, playerRegistryTeams?: Record<string, unknown> }} [opts]
 */
export function detectWcScorerRoleMismatch(text, opts = {}) {
  const blob = [String(opts.topScorerSlotValue || ""), String(text || "")].filter(Boolean).join("\n");
  if (!blob.trim()) return null;

  const scorerContext =
    /\b(top goalscorer|golden boot|boot winner|most goals|leading scorer|goalscorer pick|score the most goals)\b/i.test(
      blob,
    ) || Boolean(opts.topScorerSlotValue);

  if (!scorerContext) return null;

  if (/\bassist(s)?\s+(prop|volume|market|leader|o\/u|over|under)\b/i.test(blob) && !/\btop goalscorer\b/i.test(blob)) {
    return null;
  }

  for (const profile of WC_IMPLAUSIBLE_TOP_SCORER_PROFILES) {
    if (!profile.pattern.test(blob)) continue;
    const assistOnly =
      /\bassist\b/i.test(blob) &&
      !/\b(top goalscorer|golden boot|most goals|boot winner)\b/i.test(String(opts.topScorerSlotValue || ""));
    if (assistOnly) continue;
    return { player: profile.label, reason: "creator_midfielder_as_top_scorer" };
  }

  const registryTeams = opts.playerRegistryTeams;
  if (registryTeams && typeof registryTeams === "object") {
    const focus = opts.topScorerSlotValue
      ? extractLikelyScorerPlayerNames(String(opts.topScorerSlotValue))
      : extractLikelyScorerPlayerNames(blob).slice(0, 3);

    for (const name of focus) {
      if (WC_SCORER_MID_ALLOWLIST.test(name)) continue;
      const position = lookupRegistryPositionForPlayer(name, registryTeams);
      if (position && isWcImplausibleGoldenBootPosition(position)) {
        return {
          player: name,
          reason: "registry_position_not_striker",
          position,
        };
      }
    }
  }

  return null;
}
