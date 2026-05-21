import { nbaEventKey } from "../../shared/homeEventDedup.js";
import { NBA_UI_PLAYER_CHIPS } from "../../shared/nbaUiPlayerChips.js";

export { NBA_UI_PLAYER_CHIPS };

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

function nbaPairKey(game) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (away && home) return `${away}|${home}`;
  return "";
}

/**
 * Restrict merged API+scoreboard rows to the **verified Home pipeline slate** (order preserved).
 * Enriches each verified row with the richest merge match when keys align.
 * @param {object[]} mergedGames output of mergeNbaTodaysGames
 * @param {object[]} verifiedRawGames `homePipeline.nbaGamesForHome` (already validity-filtered upstream)
 */
export function alignMergedGamesToVerifiedSlate(mergedGames, verifiedRawGames) {
  const merged = Array.isArray(mergedGames) ? mergedGames : [];
  const verified = Array.isArray(verifiedRawGames) ? verifiedRawGames : [];
  if (verified.length === 0) return [];

  const byCanon = new Map();
  const byPair = new Map();
  for (const g of merged) {
    const ck = nbaEventKey(g);
    if (ck) byCanon.set(ck, g);
    const pk = nbaPairKey(g);
    if (pk && !byPair.has(pk)) byPair.set(pk, g);
  }

  const out = [];
  for (const v of verified) {
    const ck = nbaEventKey(v);
    let chosen = ck && byCanon.get(ck);
    if (!chosen) {
      const pk = nbaPairKey(v);
      if (pk) chosen = byPair.get(pk);
    }
    out.push(chosen || v);
  }
  return out;
}

/**
 * Keep only prop rows whose away/home abbrs match a game on the verified slate.
 */
export function filterPropLinesToVerifiedSlate(propLines, verifiedGames) {
  if (!Array.isArray(verifiedGames) || verifiedGames.length === 0) return [];
  const allowed = new Set();
  for (const g of verifiedGames) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa && ha) {
      allowed.add(`${aa}|${ha}`);
      allowed.add(`${ha}|${aa}`);
    }
  }
  return (propLines || []).filter((pl) => {
    const aa = String(pl?.awayAbbr || "").toUpperCase();
    const ha = String(pl?.homeAbbr || "").toUpperCase();
    if (!aa || !ha) return false;
    return allowed.has(`${aa}|${ha}`) || allowed.has(`${ha}|${aa}`);
  });
}

export function filterPlayerStatsToVerifiedTeams(playerStats, verifiedGames) {
  if (!Array.isArray(verifiedGames) || verifiedGames.length === 0) return [];
  const teams = new Set();
  for (const g of verifiedGames) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa) teams.add(aa);
    if (ha) teams.add(ha);
  }
  return (playerStats || []).filter((p) => teams.has(String(p?.team || "").toUpperCase()));
}

export function filterNbaUiChipsForSlateAndInjuries(verifiedGames, injuries) {
  const teams = new Set();
  for (const g of verifiedGames || []) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa) teams.add(aa);
    if (ha) teams.add(ha);
  }
  const inj = Array.isArray(injuries) ? injuries : [];
  const isOut = (fullName) => {
    const want = String(fullName || "")
      .trim()
      .toLowerCase();
    if (!want) return false;
    for (const row of inj) {
      const pn = String(row.player || "")
        .trim()
        .toLowerCase();
      if (!pn || pn !== want) continue;
      const blob = `${String(row.status || "")} ${String(row.return || "")} ${String(row.detail || "")}`.toLowerCase();
      if (
        /\b(out|inactive|dnp|did not play|ruled out|available:\s*out|suspended|not with team)\b/.test(blob)
      ) {
        return true;
      }
    }
    return false;
  };
  return NBA_UI_PLAYER_CHIPS.filter((row) => {
    if (teams.size === 0) return false;
    if (!teams.has(String(row.teamAbbr || "").toUpperCase())) return false;
    if (isOut(row.fullName)) return false;
    return true;
  });
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

  const tonight = new Set();
  for (const g of mergedGames || []) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa) tonight.add(aa);
    if (ha) tonight.add(ha);
  }

  for (const row of NBA_UI_PLAYER_CHIPS) {
    const ab = String(row.teamAbbr || "").toUpperCase();
    if (tonight.size > 0 && !tonight.has(ab)) continue;
    add(row.teamAbbr, row.fullName);
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
