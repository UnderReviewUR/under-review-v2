/**
 * World Cup player biographical grounding — DOB, age, club for notable players.
 * Model must not invent ages; QA rejects mismatches against this layer.
 */

import { playerRegistryKey, normalizeWcPlayerName } from "./wcPlayerRegistry.js";

/** Tournament reference date for age (kickoff week). */
export const WC_TOURNAMENT_BIO_AS_OF_MS = Date.parse("2026-06-11T12:00:00-04:00");

/**
 * Notable players — birthDate ISO, optional club / flags.
 * @type {Record<string, { birthDate: string, club?: string, isPenaltyTaker?: boolean }>}
 */
export const WC_NOTABLE_PLAYER_BIOS = {
  [playerRegistryKey("Lamine Yamal", "ESP")]: {
    birthDate: "2007-07-13",
    club: "Barcelona",
  },
  [playerRegistryKey("Pedri", "ESP")]: { birthDate: "2002-11-25", club: "Barcelona" },
  [playerRegistryKey("Gavi", "ESP")]: { birthDate: "2004-08-05", club: "Barcelona" },
  [playerRegistryKey("Kylian Mbappé", "FRA")]: {
    birthDate: "1998-12-20",
    club: "Real Madrid",
    isPenaltyTaker: true,
  },
  [playerRegistryKey("Antoine Griezmann", "FRA")]: { birthDate: "1991-03-21", club: "Atlético Madrid" },
  [playerRegistryKey("Harry Kane", "ENG")]: {
    birthDate: "1993-07-28",
    club: "Bayern Munich",
    isPenaltyTaker: true,
  },
  [playerRegistryKey("Bukayo Saka", "ENG")]: { birthDate: "2001-09-05", club: "Arsenal" },
  [playerRegistryKey("Erling Haaland", "NOR")]: {
    birthDate: "2000-07-21",
    club: "Manchester City",
    isPenaltyTaker: true,
  },
  [playerRegistryKey("Vinícius Júnior", "BRA")]: { birthDate: "2000-07-12", club: "Real Madrid" },
  [playerRegistryKey("Endrick", "BRA")]: { birthDate: "2006-07-21", club: "Real Madrid" },
  [playerRegistryKey("Lionel Messi", "ARG")]: { birthDate: "1987-06-24", club: "Inter Miami" },
  [playerRegistryKey("Lautaro Martínez", "ARG")]: {
    birthDate: "1997-08-22",
    club: "Inter Milan",
    isPenaltyTaker: true,
  },
  [playerRegistryKey("Jamal Musiala", "GER")]: { birthDate: "2003-02-26", club: "Bayern Munich" },
  [playerRegistryKey("Cristiano Ronaldo", "POR")]: {
    birthDate: "1985-02-05",
    club: "Al Nassr",
    isPenaltyTaker: true,
  },
  [playerRegistryKey("Kevin De Bruyne", "BEL")]: { birthDate: "1991-06-28", club: "Manchester City" },
  [playerRegistryKey("Mohamed Salah", "EGY")]: { birthDate: "1992-06-15", club: "Liverpool" },
  [playerRegistryKey("Luis Díaz", "COL")]: { birthDate: "1997-01-13", club: "Liverpool" },
  [playerRegistryKey("Robert Lewandowski", "POL")]: {
    birthDate: "1988-08-21",
    club: "Barcelona",
    isPenaltyTaker: true,
  },
  [playerRegistryKey("Warren Zaïre-Emery", "FRA")]: { birthDate: "2006-03-08", club: "Paris Saint-Germain" },
  [playerRegistryKey("Xavi Simons", "NED")]: { birthDate: "2003-04-20", club: "RB Leipzig" },
  [playerRegistryKey("Kobbie Mainoo", "ENG")]: { birthDate: "2005-04-19", club: "Manchester United" },
};

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
  for (const team of Object.values(registry.teams)) {
    for (const player of team?.players || []) {
      const key = playerRegistryKey(player.name, player.nationAbbr);
      const bio = WC_NOTABLE_PLAYER_BIOS[key];
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
  const limit = opts.limit ?? 36;
  const asOfMs = opts.asOfMs ?? WC_TOURNAMENT_BIO_AS_OF_MS;
  /** @type {Array<{ name: string, nationAbbr: string, ageYears: number, position: string | null, club?: string, isPenaltyTaker?: boolean }>} */
  const rows = [];

  for (const [key, bio] of Object.entries(WC_NOTABLE_PLAYER_BIOS)) {
    const age = wcPlayerAgeYears(bio.birthDate, asOfMs);
    if (age == null) continue;
    const [, namePart] = key.split("|");
    const nationAbbr = key.split("|")[0];
    const regPlayer = registry?.teams?.[nationAbbr]?.players?.find(
      (p) => playerRegistryKey(p.name, p.nationAbbr) === key,
    );
    rows.push({
      name: regPlayer?.name || namePart,
      nationAbbr,
      ageYears: age,
      position: regPlayer?.position || null,
      club: bio.club,
      isPenaltyTaker: bio.isPenaltyTaker,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  const slice = rows.slice(0, limit);
  if (!slice.length) return "";

  const lines = [
    "PLAYER BIO — VERIFIED (ages as of Jun 11, 2026 kickoff; cite ONLY these — never guess age or club):",
  ];
  for (const r of slice) {
    const pk = r.isPenaltyTaker ? " · PK taker" : "";
    const club = r.club ? ` · ${r.club}` : "";
    const pos = r.position ? ` · ${r.position}` : "";
    lines.push(`  ${r.name} (${r.nationAbbr}) — age ${r.ageYears}${pos}${club}${pk}`);
  }
  lines.push(
    "  RULE: Do not state a player's age unless they appear in PLAYER BIO above. Wrong ages destroy credibility.",
  );
  return lines.join("\n");
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

  for (const [key, bio] of Object.entries(WC_NOTABLE_PLAYER_BIOS)) {
    const expected = wcPlayerAgeYears(bio.birthDate, asOfMs);
    if (expected == null) continue;

    const nationAbbr = key.split("|")[0] || "";
    const nameKey = key.split("|")[1] || "";
    /** @type {string[]} */
    const searchTerms = [nameKey];
    if (nameKey === "lamine yamal") searchTerms.push("yamal", "Lamine Yamal");

    for (const term of searchTerms) {
      const termRe = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      for (const match of blob.matchAll(new RegExp(AGE_CLAIM_RE.source, "gi"))) {
        const idx = match.index ?? 0;
        const window = blob.slice(Math.max(0, idx - 100), idx + 100);
        if (!termRe.test(window)) continue;

        const claimed = Number(match[1] || match[2] || match[3]);
        if (!Number.isFinite(claimed) || claimed === expected) continue;

        return {
          player: normalizeWcPlayerName(term),
          nationAbbr,
          claimed,
          expected,
        };
      }
    }
  }

  return null;
}
