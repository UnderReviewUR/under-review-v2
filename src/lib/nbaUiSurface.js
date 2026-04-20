/**
 * Same source as NBA tab "Ask About Any Player" chips — must stay in sync with product UI.
 * fullName + teamAbbr are injected into ur-take so the model authorizes the same names the UI offers.
 */
export const NBA_UI_PLAYER_CHIPS = [
  { chip: "Jokic", fullName: "Nikola Jokic", teamAbbr: "DEN" },
  { chip: "SGA", fullName: "Shai Gilgeous-Alexander", teamAbbr: "OKC" },
  { chip: "Luka", fullName: "Luka Dončić", teamAbbr: "LAL" },
  { chip: "Tatum", fullName: "Jayson Tatum", teamAbbr: "BOS" },
  { chip: "Giannis", fullName: "Giannis Antetokounmpo", teamAbbr: "MIL" },
  { chip: "Wembanyama", fullName: "Victor Wembanyama", teamAbbr: "SAS" },
  { chip: "Brunson", fullName: "Jalen Brunson", teamAbbr: "NYK" },
  { chip: "Edwards", fullName: "Anthony Edwards", teamAbbr: "MIN" },
  { chip: "KAT", fullName: "Karl-Anthony Towns", teamAbbr: "NYK" },
  { chip: "Curry", fullName: "Stephen Curry", teamAbbr: "GSW" },
  { chip: "Haliburton", fullName: "Tyrese Haliburton", teamAbbr: "IND" },
  { chip: "Mitchell", fullName: "Donovan Mitchell", teamAbbr: "CLE" },
  { chip: "KD", fullName: "Kevin Durant", teamAbbr: "HOU" },
  { chip: "Booker", fullName: "Devin Booker", teamAbbr: "PHX" },
  { chip: "Ja Morant", fullName: "Ja Morant", teamAbbr: "MEM" },
];

/**
 * Union API board games + browser scoreboard (ESPN/NBA CDN) so Ask tab matches Today's Games.
 */
export function mergeNbaTodaysGames(apiGames, scoreboardGames) {
  const a = Array.isArray(apiGames) ? apiGames : [];
  const b = Array.isArray(scoreboardGames) ? scoreboardGames : [];
  const map = new Map();

  const keyOf = (g) => {
    const away = String(g?.awayTeam?.abbr || "").toUpperCase();
    const home = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (away && home) return `${away}|${home}`;
    return String(g?.id ?? "");
  };

  const richness = (g) => {
    let s = 0;
    if (g?.awayTeam?.score != null || g?.homeTeam?.score != null) s += 2;
    if (g?.state === "in") s += 3;
    if (g?.state === "post") s += 1;
    if (String(g?.status || "").length > 3) s += 1;
    return s;
  };

  const pick = (g1, g2) => (richness(g2) > richness(g1) ? g2 : g1);

  for (const g of a) {
    const k = keyOf(g);
    if (k && k !== "|") map.set(k, g);
  }
  for (const g of b) {
    const k = keyOf(g);
    if (!k || k === "|") continue;
    if (!map.has(k)) map.set(k, g);
    else map.set(k, pick(map.get(k), g));
  }
  return [...map.values()];
}

const MAX_NAMES_PER_TEAM_UI = 48;

/**
 * Clone API rosterGrounding and add product UI players so ur-take sees the same names as the chips.
 */
export function augmentNbaRosterGroundingWithUi(rosterGrounding, mergedGames) {
  const base =
    rosterGrounding && typeof rosterGrounding === "object"
      ? JSON.parse(JSON.stringify(rosterGrounding))
      : {
          playersByTeamAbbrev: {},
          trustNote:
            "playersByTeamAbbrev augmented with clientUiSurface — product chips + scoreboard merge.",
          rule: "Authoritative list includes PRODUCT UI featured players for names shown in-app.",
        };

  const pbt = { ...(base.playersByTeamAbbrev || {}) };
  const add = (abbr, name) => {
    const a = String(abbr || "").toUpperCase();
    const n = String(name || "").trim();
    if (!a || !n) return;
    const list = pbt[a] ? [...pbt[a]] : [];
    if (!list.includes(n) && list.length < MAX_NAMES_PER_TEAM_UI) list.push(n);
    pbt[a] = list;
  };

  for (const row of NBA_UI_PLAYER_CHIPS) {
    add(row.teamAbbr, row.fullName);
  }

  const tonight = new Set();
  for (const g of mergedGames || []) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa) tonight.add(aa);
    if (ha) tonight.add(ha);
  }

  let q = base.rosterGroundingQuality;
  if (tonight.size > 0) {
    let anyZero = false;
    let anyUnderFour = false;
    for (const abbr of tonight) {
      const n = (pbt[abbr] || []).length;
      if (n === 0) anyZero = true;
      if (n < 4) anyUnderFour = true;
    }
    if (!anyZero && !anyUnderFour) q = "full";
    else if (!anyZero) q = "partial";
    else q = q === "full" ? "partial" : q || "partial";
  }

  return {
    ...base,
    playersByTeamAbbrev: pbt,
    ...(q ? { rosterGroundingQuality: q } : {}),
    clientUiAugmented: true,
  };
}
