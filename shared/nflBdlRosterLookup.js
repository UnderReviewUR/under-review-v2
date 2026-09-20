/**
 * Lightweight BDL roster lookups for Ask boards (position + surname guards).
 * Source of truth: api/data/nflBdlRosterSnapshot.js — refresh via npm run sync:nfl-bdl-rosters.
 */
import { NFL_BDL_ROSTER_SNAPSHOT } from "../api/data/nflBdlRosterSnapshot.js";

function normalizePlayerKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @type {Map<string, string>|null} */
let positionByKey = null;
/** @type {Set<string>|null} */
let surnames = null;

function buildIndexes() {
  if (positionByKey && surnames) return;
  /** @type {Map<string, string>} */
  const pos = new Map();
  /** @type {Set<string>} */
  const last = new Set();
  for (const rows of Object.values(NFL_BDL_ROSTER_SNAPSHOT.rostersByTeam || {})) {
    for (const p of rows || []) {
      const key = normalizePlayerKey(p?.name);
      if (!key) continue;
      const position = String(p?.position || "").toUpperCase().trim();
      if (position) pos.set(key, position);
      const parts = key.split(" ").filter(Boolean);
      const surname = parts[parts.length - 1];
      if (surname && surname.length >= 5) last.add(surname);
    }
  }
  // Also surnames from the flat team index (covers names without roster rows).
  for (const name of Object.keys(NFL_BDL_ROSTER_SNAPSHOT.playerTeamByName || {})) {
    const key = normalizePlayerKey(name);
    const parts = key.split(" ").filter(Boolean);
    const surname = parts[parts.length - 1];
    if (surname && surname.length >= 5) last.add(surname);
  }
  positionByKey = pos;
  surnames = last;
}

/**
 * @param {string} name
 * @returns {string|null} e.g. QB, RB, WR, TE
 */
export function nflBdlRosterPosition(name) {
  buildIndexes();
  return positionByKey.get(normalizePlayerKey(name)) || null;
}

/**
 * @param {string} name
 */
export function nflBdlRosterIsQb(name) {
  return nflBdlRosterPosition(name) === "QB";
}

/**
 * @param {string} token lowercased alphanumeric surname/token
 */
export function nflBdlRosterHasSurnameToken(token) {
  buildIndexes();
  const w = String(token || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return Boolean(w && surnames.has(w));
}

/**
 * Preferred featured market for a named skill player.
 * @param {string} name
 * @returns {"pass_yds"|"rush_yds"|"rec_yds"|null}
 */
export function nflBdlPreferredSkillMarket(name) {
  const pos = nflBdlRosterPosition(name);
  if (pos === "QB") return "pass_yds";
  if (pos === "RB" || pos === "FB") return "rush_yds";
  // KR/PR often still have receiving props on the board — treat as skill receivers.
  if (pos === "WR" || pos === "TE" || pos === "KR" || pos === "PR") return "rec_yds";
  return null;
}
