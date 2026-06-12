/**
 * Coerce WC match fields (group, stadium, city) to display-safe strings.
 * BDL rows may embed objects without .name — never render raw objects in JSX.
 */

/**
 * @param {unknown} value
 */
function isObjectObjectString(value) {
  return String(value || "").trim() === "[object Object]";
}

/**
 * @param {string} raw
 * @returns {string} A–L or ""
 */
function extractWcGroupLetterChar(raw) {
  const s = String(raw || "").trim();
  if (!s || isObjectObjectString(s)) return "";

  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return extractWcGroupLetterChar(parsed[0]);
      }
    } catch {
      /* fall through */
    }
    const inner = s.slice(1, -1).replace(/["'\s]/g, "");
    if (/^[A-L]$/i.test(inner)) return inner.toUpperCase();
  }

  const cleaned = s.replace(/^Group\s*/i, "").trim();
  const wrapped = cleaned.match(/^[\[\("']*([A-L])[\]\)"']*$/i);
  if (wrapped) return wrapped[1].toUpperCase();

  if (/^[A-L]$/i.test(cleaned)) return cleaned.toUpperCase();

  const first = cleaned.toUpperCase().charAt(0);
  return /^[A-L]$/.test(first) ? first : "";
}

/**
 * @param {unknown} group
 * @returns {string} Single group letter (A–L) or ""
 */
export function formatWcMatchGroupLetter(group) {
  if (group == null || group === "") return "";

  if (typeof group === "string") {
    return extractWcGroupLetterChar(group);
  }

  if (Array.isArray(group) && group.length > 0) {
    return extractWcGroupLetterChar(group[0]);
  }

  if (typeof group === "object") {
    const letter = group.letter ?? group.code ?? group.group_letter ?? group.groupLetter;
    if (letter != null && String(letter).trim()) {
      return extractWcGroupLetterChar(letter);
    }
    const name = group.name != null ? String(group.name).trim() : "";
    if (name) {
      return extractWcGroupLetterChar(name);
    }
  }

  return "";
}

/**
 * Group letter from match row — field first, then team roster fallback.
 * @param {{ group?: unknown, homeTeam?: string, awayTeam?: string } | null | undefined} match
 * @param {{ group?: string, abbreviation?: string }[]} [teams]
 */
export function resolveWcMatchGroupLetter(match, teams = []) {
  const fromField = formatWcMatchGroupLetter(match?.group);
  if (fromField) return fromField;

  const codes = [match?.homeTeam, match?.awayTeam]
    .map((c) => String(c || "").trim().toUpperCase())
    .filter(Boolean);
  for (const code of codes) {
    const roster = teams.find((t) => String(t?.abbreviation || "").toUpperCase() === code);
    const g = formatWcMatchGroupLetter(roster?.group);
    if (g) return g;
  }
  return "";
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatWcMatchFieldText(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const s = value.trim();
    return isObjectObjectString(s) ? "" : s;
  }
  if (typeof value === "object") {
    const name = value.name != null ? String(value.name).trim() : "";
    const city = value.city != null ? String(value.city).trim() : "";
    if (name && city && name !== city) return `${name}, ${city}`;
    return name || city || "";
  }
  const s = String(value).trim();
  return isObjectObjectString(s) ? "" : s;
}

/**
 * @param {unknown} stadium
 * @param {unknown} [city]
 * @returns {string}
 */
export function formatWcMatchVenueLine(stadium, city) {
  const stadiumText = formatWcMatchFieldText(stadium);
  const cityText = formatWcMatchFieldText(city);
  if (stadiumText && cityText && stadiumText !== cityText) {
    return `${stadiumText}, ${cityText}`;
  }
  return stadiumText || cityText;
}
