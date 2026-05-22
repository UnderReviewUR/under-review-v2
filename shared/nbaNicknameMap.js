/**
 * NBA player nicknames → canonical full names for grounding redirect (pre-model).
 */

export const NBA_NICKNAMES = {
  wemby: "Victor Wembanyama",
  sga: "Shai Gilgeous-Alexander",
  kat: "Karl-Anthony Towns",
  bron: "LeBron James",
  ad: "Anthony Davis",
  joker: "Nikola Jokic",
  ant: "Anthony Edwards",
  steph: "Stephen Curry",
  kd: "Kevin Durant",
  book: "Devin Booker",
  dbook: "Devin Booker",
  luka: "Luka Dončić",
  giannis: "Giannis Antetokounmpo",
  tatum: "Jayson Tatum",
  embiid: "Joel Embiid",
  jimmy: "Jimmy Butler",
  dame: "Damian Lillard",
  ja: "Ja Morant",
  fox: "De'Aaron Fox",
  sabonis: "Domantas Sabonis",
  brunson: "Jalen Brunson",
  wembaniama: "Victor Wembanyama",
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} question
 * @returns {Array<{ nickname: string, fullName: string }>}
 */
export function resolveNbaNicknameMentionsFromQuestion(question) {
  const text = String(question || "").toLowerCase();
  if (!text.trim()) return [];

  const keys = Object.keys(NBA_NICKNAMES).sort((a, b) => b.length - a.length);
  const seen = new Set();
  /** @type {Array<{ nickname: string, fullName: string }>} */
  const hits = [];

  for (const nick of keys) {
    const re = new RegExp(`\\b${escapeRegExp(nick)}\\b`, "i");
    if (!re.test(text)) continue;
    const fullName = NBA_NICKNAMES[nick];
    const dedupe = fullName.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    hits.push({ nickname: nick, fullName });
  }
  return hits;
}
