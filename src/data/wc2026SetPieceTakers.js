/**
 * World Cup 2026 — set piece specialists per nation (cold-start seed).
 * penaltyTaker: designated PK taker.
 * freeKick: primary dead-ball specialist.
 * corners: primary corner taker (if different from FK).
 *
 * Sources: 2024-25 club duties + recent international caps (May 2026 estimate).
 * Updated by cron when ESPN match detail shows PK/FK events; this file is fallback only.
 */

/** @type {Array<{ nationAbbr: string, penaltyTaker: string, freeKick?: string, corners?: string }>} */
export const WC_SET_PIECE_TAKERS = [
  { nationAbbr: "FRA", penaltyTaker: "Kylian Mbappé", freeKick: "Antoine Griezmann" },
  { nationAbbr: "ENG", penaltyTaker: "Harry Kane", freeKick: "Bukayo Saka", corners: "Bukayo Saka" },
  { nationAbbr: "BRA", penaltyTaker: "Vinícius Júnior", freeKick: "Raphinha" },
  { nationAbbr: "ARG", penaltyTaker: "Lionel Messi", freeKick: "Lionel Messi" },
  { nationAbbr: "ESP", penaltyTaker: "Álvaro Morata", freeKick: "Dani Olmo", corners: "Lamine Yamal" },
  { nationAbbr: "GER", penaltyTaker: "Kai Havertz", freeKick: "Joshua Kimmich" },
  { nationAbbr: "POR", penaltyTaker: "Cristiano Ronaldo", freeKick: "Bruno Fernandes" },
  { nationAbbr: "NED", penaltyTaker: "Memphis Depay", freeKick: "Cody Gakpo" },
  { nationAbbr: "BEL", penaltyTaker: "Kevin De Bruyne", freeKick: "Kevin De Bruyne" },
  { nationAbbr: "ITA", penaltyTaker: "Gianluca Scamacca", freeKick: "Federico Dimarco" },
  { nationAbbr: "URU", penaltyTaker: "Darwin Núñez", freeKick: "Federico Valverde" },
  { nationAbbr: "COL", penaltyTaker: "Luis Díaz", freeKick: "James Rodríguez" },
  { nationAbbr: "NOR", penaltyTaker: "Erling Haaland", freeKick: "Martin Ødegaard" },
  { nationAbbr: "USA", penaltyTaker: "Christian Pulisic", freeKick: "Christian Pulisic" },
  { nationAbbr: "MEX", penaltyTaker: "Hirving Lozano", freeKick: "Luis Romo" },
  { nationAbbr: "JPN", penaltyTaker: "Takumi Minamino", freeKick: "Ritsu Dōan" },
  { nationAbbr: "CRO", penaltyTaker: "Luka Modrić", freeKick: "Luka Modrić" },
  { nationAbbr: "POL", penaltyTaker: "Robert Lewandowski", freeKick: "Piotr Zieliński" },
  { nationAbbr: "SEN", penaltyTaker: "Sadio Mané", freeKick: "Sadio Mané" },
  { nationAbbr: "EGY", penaltyTaker: "Mohamed Salah", freeKick: "Mohamed Salah" },
  { nationAbbr: "DEN", penaltyTaker: "Christian Eriksen", freeKick: "Christian Eriksen" },
  { nationAbbr: "SUI", penaltyTaker: "Granit Xhaka", freeKick: "Granit Xhaka" },
  { nationAbbr: "TUR", penaltyTaker: "Hakan Çalhanoğlu", freeKick: "Hakan Çalhanoğlu" },
  { nationAbbr: "NGA", penaltyTaker: "Victor Osimhen", freeKick: "Alex Iwobi" },
  { nationAbbr: "MAR", penaltyTaker: "Achraf Hakimi", freeKick: "Hakim Ziyech" },
  { nationAbbr: "SRB", penaltyTaker: "Aleksandar Mitrović", freeKick: "Dušan Tadić" },
  { nationAbbr: "CAN", penaltyTaker: "Alphonso Davies", freeKick: "Jonathan David" },
  { nationAbbr: "AUS", penaltyTaker: "Mathew Leckie", freeKick: "Ajdin Hrustić" },
  { nationAbbr: "KOR", penaltyTaker: "Son Heung-min", freeKick: "Son Heung-min" },
  { nationAbbr: "ECU", penaltyTaker: "Enner Valencia", freeKick: "Moisés Caicedo" },
];

/**
 * @param {string} nationAbbr
 * @returns {{ penaltyTaker: string, freeKick?: string, corners?: string } | null}
 */
export function getSetPieceTakersForNation(nationAbbr) {
  const key = String(nationAbbr || "").trim().toUpperCase();
  return WC_SET_PIECE_TAKERS.find((r) => r.nationAbbr === key) || null;
}

/**
 * Look up set-piece role for a specific player name.
 * @param {string} playerName
 * @returns {string[]} e.g. ["penaltyTaker", "freeKick"]
 */
export function getSetPieceRolesForPlayer(playerName) {
  const name = String(playerName || "").trim().toLowerCase();
  if (!name) return [];
  const roles = [];
  for (const row of WC_SET_PIECE_TAKERS) {
    if (row.penaltyTaker.toLowerCase() === name) roles.push("penaltyTaker");
    if (row.freeKick && row.freeKick.toLowerCase() === name) roles.push("freeKick");
    if (row.corners && row.corners.toLowerCase() === name) roles.push("corners");
  }
  return [...new Set(roles)];
}
