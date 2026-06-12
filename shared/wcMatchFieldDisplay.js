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
 * @param {unknown} group
 * @returns {string} Single group letter (A–L) or ""
 */
export function formatWcMatchGroupLetter(group) {
  if (group == null || group === "") return "";

  if (typeof group === "string") {
    const s = group.trim();
    if (!s || isObjectObjectString(s)) return "";
    return s.replace(/^Group\s*/i, "").trim().toUpperCase().slice(0, 1);
  }

  if (typeof group === "object") {
    const letter = group.letter ?? group.code ?? group.group_letter ?? group.groupLetter;
    if (letter != null && String(letter).trim()) {
      return String(letter).trim().toUpperCase().slice(0, 1);
    }
    const name = group.name != null ? String(group.name).trim() : "";
    if (name) {
      return name.replace(/^Group\s*/i, "").trim().toUpperCase().slice(0, 1);
    }
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
