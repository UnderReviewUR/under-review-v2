/**
 * Cross-sport player identity helpers — normalize labels before stat enrichment.
 */

/** Stable key for maps / KV cache (lowercase, collapsed whitespace). */
export function normalizePlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function lastNameOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * @param {string} a
 * @param {string} b
 */
export function playerNamesLikelyMatch(a, b) {
  const ka = normalizePlayerKey(a);
  const kb = normalizePlayerKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const la = lastNameOf(a);
  const lb = lastNameOf(b);
  return la.length >= 3 && la === lb;
}

/**
 * @param {string} label
 * @param {Map<string, number|string>} lookup — normalizePlayerKey(name) -> id
 */
export function resolveIdFromNameLookup(label, lookup) {
  const raw = String(label || "").trim();
  if (!raw || !lookup || typeof lookup.get !== "function") return null;
  const direct = lookup.get(normalizePlayerKey(raw));
  if (direct != null) return direct;
  for (const [key, id] of lookup.entries()) {
    if (playerNamesLikelyMatch(raw, key)) return id;
  }
  return null;
}

/**
 * @param {Array<{ name?: string, player?: string, playerId?: number|null, bdlPlayerId?: number|null }>} rows
 * @param {Map<string, number|string>} nameToId
 */
export function attachPlayerIdsToRows(rows, nameToId) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (row?.playerId != null || row?.bdlPlayerId != null) {
      return {
        ...row,
        playerId: row.playerId ?? row.bdlPlayerId ?? null,
      };
    }
    const label = row?.name || row?.player || "";
    const id = resolveIdFromNameLookup(label, nameToId);
    return id != null ? { ...row, playerId: id } : row;
  });
}
