/**
 * World Cup player biographical grounding — DOB, age, club from FIFA full squads (1,248 players).
 * Model must not invent ages; QA rejects mismatches against this layer.
 */

import { WC_FULL_SQUADS, buildSeedName } from "../src/data/wc2026FullSquadsSeed.js";
import { playerRegistryKey, normalizeWcPlayerName } from "./wcPlayerRegistry.js";

/** Tournament reference date for age (kickoff week). */
export const WC_TOURNAMENT_BIO_AS_OF_MS = Date.parse("2026-06-11T12:00:00-04:00");

/**
 * Notable players — penalty-taker flags and overrides when FIFA shirt names differ.
 * @type {Record<string, { isPenaltyTaker?: boolean }>}
 */
export const WC_NOTABLE_PLAYER_BIOS = {
  [playerRegistryKey("Kylian Mbappé", "FRA")]: { isPenaltyTaker: true },
  [playerRegistryKey("Harry Kane", "ENG")]: { isPenaltyTaker: true },
  [playerRegistryKey("Erling Haaland", "NOR")]: { isPenaltyTaker: true },
  [playerRegistryKey("Lautaro Martínez", "ARG")]: { isPenaltyTaker: true },
  [playerRegistryKey("Cristiano Ronaldo", "POR")]: { isPenaltyTaker: true },
  [playerRegistryKey("Robert Lewandowski", "POL")]: { isPenaltyTaker: true },
};

/** @type {{ byKey: Map<string, WcSquadBioRow>, bySurname: Map<string, WcSquadBioRow[]> } | null} */
let fullSquadBioCache = null;

/** Test-only cache reset. */
export function resetWcFullSquadBioCacheForTests() {
  fullSquadBioCache = null;
}

/**
 * @typedef {{
 *   name: string,
 *   nationAbbr: string,
 *   birthDate: string,
 *   club?: string,
 *   position?: string,
 *   isPenaltyTaker?: boolean,
 * }} WcSquadBioRow
 */

/**
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} window
 * @param {WcSquadBioRow} bio
 */
function playerMentionedNearAgeClaim(window, bio) {
  const w = String(window || "").toLowerCase();
  const parts = bio.name
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 3);
  if (!parts.length) return false;
  const last = parts[parts.length - 1];
  if (!new RegExp(`\\b${escapeRegExp(last)}\\b`, "i").test(w)) return false;
  if (parts.length === 1) return true;
  const first = parts[0];
  if (first !== last) {
    return new RegExp(`\\b${escapeRegExp(first)}\\b`, "i").test(w);
  }
  return true;
}

/**
 * Build index from official FIFA 26-man squads (all 1,248 players).
 */
export function buildWcFullSquadBioIndex() {
  if (fullSquadBioCache) return fullSquadBioCache;

  /** @type {Map<string, WcSquadBioRow>} */
  const byKey = new Map();
  /** @type {Map<string, WcSquadBioRow[]>} */
  const bySurname = new Map();

  for (const [abbr, team] of Object.entries(WC_FULL_SQUADS.teams || {})) {
    for (const p of team.roster || []) {
      const name = buildSeedName(p);
      const nationAbbr = String(abbr || "").trim().toUpperCase();
      const birthDate = String(p.dob || "").trim();
      if (!name || !birthDate) continue;

      const key = playerRegistryKey(name, nationAbbr);
      const notable = WC_NOTABLE_PLAYER_BIOS[key];
      const row = {
        name,
        nationAbbr,
        birthDate,
        club: p.club ? String(p.club) : undefined,
        position: p.position ? String(p.position) : undefined,
        isPenaltyTaker: notable?.isPenaltyTaker,
      };
      byKey.set(key, row);

      const shirt = String(p.nameOnShirt || p.lastName || "").trim();
      const surname = shirt.split(/[\s-]+/).pop()?.toLowerCase() || "";
      if (surname.length >= 4) {
        const list = bySurname.get(surname) || [];
        list.push(row);
        bySurname.set(surname, list);
      }
    }
  }

  fullSquadBioCache = { byKey, bySurname };
  return fullSquadBioCache;
}

/**
 * @param {string} birthDate ISO YYYY-MM-DD
 * @param {number} [asOfMs]
 */
export function wcPlayerAgeYears(birthDate, asOfMs = WC_TOURNAMENT_BIO_AS_OF_MS) {
  const dob = Date.parse(`${birthDate}T12:00:00Z`);
  if (!Number.isFinite(dob)) return null;
  const ref = Number.isFinite(asOfMs) ? asOfMs : WC_TOURNAMENT_BIO_AS_OF_MS;
  let age = new Date(ref).getUTCFullYear() - new Date(dob).getUTCFullYear();
  const refMonth = new Date(ref).getUTCMonth();
  const dobMonth = new Date(dob).getUTCMonth();
  const refDay = new Date(ref).getUTCDate();
  const dobDay = new Date(dob).getUTCDate();
  if (refMonth < dobMonth || (refMonth === dobMonth && refDay < dobDay)) age -= 1;
  return age;
}

/**
 * @param {Record<string, unknown>} registry
 * @param {number} [asOfMs]
 */
export function enrichRegistryWithPlayerBio(registry, asOfMs = WC_TOURNAMENT_BIO_AS_OF_MS) {
  if (!registry?.teams) return registry;
  const { byKey } = buildWcFullSquadBioIndex();

  for (const team of Object.values(registry.teams)) {
    for (const player of team?.players || []) {
      const key = playerRegistryKey(player.name, player.nationAbbr);
      const bio = byKey.get(key);
      if (!bio) continue;
      player.birthDate = bio.birthDate;
      if (bio.club) player.club = bio.club;
      if (bio.isPenaltyTaker) player.isPenaltyTaker = true;
      const age = wcPlayerAgeYears(bio.birthDate, asOfMs);
      if (age != null) player.ageYears = age;
    }
  }
  return registry;
}

/**
 * @param {Record<string, unknown> | null | undefined} registry
 * @param {{ limit?: number, asOfMs?: number }} [opts]
 */
export function buildWcPlayerBioPromptBlock(registry, opts = {}) {
  const limit = opts.limit ?? 48;
  const asOfMs = opts.asOfMs ?? WC_TOURNAMENT_BIO_AS_OF_MS;
  const notableKeys = new Set(Object.keys(WC_NOTABLE_PLAYER_BIOS));
  /** @type {Array<{ name: string, nationAbbr: string, ageYears: number, position: string | null, club?: string, isPenaltyTaker?: boolean, notable: boolean }>} */
  const rows = [];

  for (const team of Object.values(registry?.teams || {})) {
    for (const p of team?.players || []) {
      if (!p.birthDate || p.ageYears == null) continue;
      const key = playerRegistryKey(p.name, p.nationAbbr);
      rows.push({
        name: p.name,
        nationAbbr: p.nationAbbr,
        ageYears: p.ageYears,
        position: p.position || null,
        club: p.club || undefined,
        isPenaltyTaker: p.isPenaltyTaker,
        notable: notableKeys.has(key),
      });
    }
  }

  rows.sort((a, b) => Number(b.notable) - Number(a.notable) || a.name.localeCompare(b.name));
  const slice = rows.slice(0, limit);
  if (!slice.length) return "";

  const lines = [
    `PLAYER BIO — FIFA SQUAD VERIFIED (${rows.length} players indexed; ages as of Jun 11, 2026 kickoff):`,
  ];
  for (const r of slice) {
    const pk = r.isPenaltyTaker ? " · PK taker" : "";
    const club = r.club ? ` · ${r.club}` : "";
    const pos = r.position ? ` · ${r.position}` : "";
    lines.push(`  ${r.name} (${r.nationAbbr}) — age ${r.ageYears}${pos}${club}${pk}`);
  }
  lines.push(
    "  RULE: Every named squad player has a verified DOB in the registry — never guess age. Yamal is 18 at kickoff.",
    "  RULE: Club names in this block are FIFA roster reference only — do NOT cite club or domestic league form in betting answers; use national team + World Cup fixture stats only.",
  );
  return lines.join("\n");
}

/** Players commonly hallucinated but not on 2026 World Cup squads. */
export const WC_NOT_IN_2026_SQUAD_PLAYERS = [
  { pattern: /\bbenzema\b/i, label: "Benzema" },
  { pattern: /\bgriezmann\b/i, label: "Griezmann" },
  { pattern: /\bgriezman\b/i, label: "Griezmann" },
];

/**
 * @param {string} text
 */
export function detectWcNotInSquadPlayerMention(text) {
  const blob = String(text || "");
  if (!blob.trim()) return null;
  for (const row of WC_NOT_IN_2026_SQUAD_PLAYERS) {
    if (row.pattern.test(blob)) {
      return { player: row.label, reason: "wc_player_not_in_squad" };
    }
  }
  return null;
}

const AGE_CLAIM_RE =
  /\b(\d{1,2})[- ]year[- ]old\b|\bage\s*(\d{1,2})\b|\b(\d{1,2})\s*years?\s*old\b/gi;

/**
 * @param {string} text
 * @param {number} [asOfMs]
 */
export function detectWcPlayerAgeMismatches(text, asOfMs = WC_TOURNAMENT_BIO_AS_OF_MS) {
  const blob = String(text || "");
  if (!blob.trim()) return null;

  const { byKey, bySurname } = buildWcFullSquadBioIndex();

  for (const match of blob.matchAll(new RegExp(AGE_CLAIM_RE.source, "gi"))) {
    const idx = match.index ?? 0;
    const window = blob.slice(Math.max(0, idx - 120), idx + 80);
    const claimed = Number(match[1] || match[2] || match[3]);
    if (!Number.isFinite(claimed)) continue;

    const candidates = [...byKey.values()].filter((bio) =>
      playerMentionedNearAgeClaim(window, bio),
    );
    candidates.sort(
      (a, b) => b.name.split(/\s+/).length - a.name.split(/\s+/).length,
    );

    for (const bio of candidates) {
      const expected = wcPlayerAgeYears(bio.birthDate, asOfMs);
      if (expected == null) continue;
      if (claimed !== expected) {
        return {
          player: bio.name,
          nationAbbr: bio.nationAbbr,
          claimed,
          expected,
        };
      }
      return null;
    }
  }

  return null;
}

/**
 * @returns {number}
 */
export function wcFullSquadBioPlayerCount() {
  return buildWcFullSquadBioIndex().byKey.size;
}
