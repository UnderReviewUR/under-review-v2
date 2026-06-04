/**
 * Browser-safe NBA team extraction from user questions (no api/ imports).
 */

export const NBA_QUERY_TEAM_ALIASES = {
  timberwolves: "MIN",
  wolves: "MIN",
  nuggets: "DEN",
  nugget: "DEN",
  lakers: "LAL",
  warriors: "GSW",
  "trail blazers": "POR",
  blazers: "POR",
  mavericks: "DAL",
  mavs: "DAL",
  grizzlies: "MEM",
  hornets: "CHA",
  thunder: "OKC",
  jazz: "UTA",
  pelicans: "NOP",
  bucks: "MIL",
  pistons: "DET",
  magic: "ORL",
  kings: "SAC",
  suns: "PHX",
  rockets: "HOU",
  spurs: "SAS",
  knicks: "NYK",
  celtics: "BOS",
  heat: "MIA",
  clippers: "LAC",
};

/** Pull team abbreviations from user text so prop fetch + board sorting hit the asked matchup first. */
export function extractNbaTeamAbbrevsFromQuestion(question) {
  const q = String(question || "");
  const out = new Set();
  const re =
    /\b(ATL|BOS|BKN|CHA|CHI|CLE|DAL|DEN|DET|GSW|HOU|IND|LAC|LAL|MEM|MIA|MIL|MIN|NOP|NYK|OKC|ORL|PHI|PHX|POR|SAC|SAS|TOR|UTA|WAS)\b/gi;
  let m;
  while ((m = re.exec(q)) !== null) out.add(m[1].toUpperCase());

  const ql = q.toLowerCase();
  for (const [nick, abbr] of Object.entries(NBA_QUERY_TEAM_ALIASES)) {
    if (ql.includes(nick)) out.add(abbr);
  }
  return [...out];
}
