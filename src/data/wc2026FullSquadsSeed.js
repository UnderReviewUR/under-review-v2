/**
 * Official FIFA World Cup 2026 — complete 26-man squad lists (1,248 players, 48 teams).
 * Parsed from the official FIFA SquadLists-English PDF.
 * Replaces the smaller notable-player seed for full pre-tournament coverage.
 */

// @ts-ignore — JSON import attribute required by Node; Vite strips it during build.
import fullSquadsRaw from "./wc2026FullSquads.json" with { type: "json" };

/** @type {{ lastUpdated: string, source: string, teams: Record<string, { teamName: string, roster: Array<{ playerKey: string, name: string, firstName: string, lastName: string, nameOnShirt: string, dob: string, position: string, club: string, number: number, height?: number }>, count: number, complete: boolean }> }} */
const fullSquads = /** @type {any} */ (fullSquadsRaw);

/**
 * Title-case a single uppercase word: "MBAPPE" → "Mbappe", "DE" → "De".
 * @param {string} w
 */
function titleWord(w) {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * Build the common known name from shirt name + first name.
 * Uses nameOnShirt (what fans/ESPN know) instead of full legal lastName
 * to match ESPN match detail names for proper registry merging.
 * @param {{ firstName: string, nameOnShirt: string, lastName: string }} p
 */
function buildSeedName(p) {
  const shirt = (p.nameOnShirt || p.lastName || "").trim();
  const shirtDisplay = shirt.split(/[\s-]+/).map(titleWord).join(shirt.includes("-") ? "-" : " ");
  const firstFull = (p.firstName || "").trim();
  const firstWord = firstFull.split(" ")[0];
  const shirtLower = shirtDisplay.toLowerCase();
  if (firstFull && shirtLower.includes(firstFull.toLowerCase())) {
    return shirtDisplay;
  }
  if (firstWord && shirtLower.startsWith(firstWord.toLowerCase())) {
    return shirtDisplay;
  }
  return `${firstWord} ${shirtDisplay}`.trim();
}

/** @type {Array<{ nationAbbr: string, name: string, position: string }>} */
export const WC_FULL_SQUAD_SEED = Object.entries(fullSquads.teams).flatMap(
  ([abbr, team]) =>
    team.roster.map((p) => ({
      nationAbbr: abbr,
      name: buildSeedName(p),
      position: p.position,
      dob: p.dob || null,
      club: p.club || null,
    })),
);

export { buildSeedName };

export const WC_FULL_SQUADS = fullSquads;
