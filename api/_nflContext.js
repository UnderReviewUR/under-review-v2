import RBs from "./nfl-rb.js";
import WRsAndTEs from "./nfl-wr-te.js";
import { QBs } from "./nfl-players.js";
import { buildNflDraftBoardBlock, getActiveDraftBundle, getNflDraftMeta } from "./nfl-draft-season.js";

// WEATHER RULE: Always use home team's stadium coords.
// Never use away team. Never use neutral site.
// If domed === true, skip weather evaluation entirely regardless of conditions.
export const NFL_STADIUM_META = {
  ARI: { lat: 33.5277, lon: -112.2626, domed: true, stadium: "State Farm Stadium" },
  ATL: { lat: 33.7553, lon: -84.4006, domed: true, stadium: "Mercedes-Benz Stadium" },
  BAL: { lat: 39.278, lon: -76.6227, domed: false, stadium: "M&T Bank Stadium" },
  BUF: { lat: 42.7738, lon: -78.787, domed: false, stadium: "Highmark Stadium" },
  CAR: { lat: 35.2258, lon: -80.8528, domed: false, stadium: "Bank of America Stadium" },
  CHI: { lat: 41.8623, lon: -87.6167, domed: false, stadium: "Soldier Field" },
  CIN: { lat: 39.0955, lon: -84.516, domed: false, stadium: "Paycor Stadium" },
  CLE: { lat: 41.5061, lon: -81.6995, domed: false, stadium: "Cleveland Browns Stadium" },
  DAL: { lat: 32.748, lon: -97.093, domed: true, stadium: "AT&T Stadium" },
  DEN: { lat: 39.7439, lon: -105.0201, domed: false, stadium: "Empower Field" },
  DET: { lat: 42.34, lon: -83.0456, domed: true, stadium: "Ford Field" },
  GB: { lat: 44.5013, lon: -88.0622, domed: false, stadium: "Lambeau Field" },
  HOU: { lat: 29.6847, lon: -95.4107, domed: true, stadium: "NRG Stadium" },
  IND: { lat: 39.7601, lon: -86.1639, domed: true, stadium: "Lucas Oil Stadium" },
  JAX: { lat: 30.3239, lon: -81.6373, domed: false, stadium: "EverBank Stadium" },
  KC: { lat: 39.0489, lon: -94.4839, domed: false, stadium: "GEHA Field" },
  LAC: { lat: 33.9535, lon: -118.3392, domed: true, stadium: "SoFi Stadium" },
  LAR: { lat: 33.9535, lon: -118.3392, domed: true, stadium: "SoFi Stadium" },
  LV: { lat: 36.0909, lon: -115.1833, domed: true, stadium: "Allegiant Stadium" },
  MIA: { lat: 25.958, lon: -80.2389, domed: false, stadium: "Hard Rock Stadium" },
  MIN: { lat: 44.9737, lon: -93.2577, domed: true, stadium: "U.S. Bank Stadium" },
  NE: { lat: 42.0909, lon: -71.2643, domed: false, stadium: "Gillette Stadium" },
  NO: { lat: 29.9511, lon: -90.0812, domed: true, stadium: "Caesars Superdome" },
  NYG: { lat: 40.8135, lon: -74.0745, domed: false, stadium: "MetLife Stadium" },
  NYJ: { lat: 40.8135, lon: -74.0745, domed: false, stadium: "MetLife Stadium" },
  PHI: { lat: 39.9008, lon: -75.1675, domed: false, stadium: "Lincoln Financial Field" },
  PIT: { lat: 40.4468, lon: -80.0158, domed: false, stadium: "Acrisure Stadium" },
  SEA: { lat: 47.5952, lon: -122.3316, domed: false, stadium: "Lumen Field" },
  SF: { lat: 37.4033, lon: -121.9694, domed: false, stadium: "Levi's Stadium" },
  TB: { lat: 27.9759, lon: -82.5033, domed: false, stadium: "Raymond James Stadium" },
  TEN: { lat: 36.1665, lon: -86.7713, domed: false, stadium: "Nissan Stadium" },
  WAS: { lat: 38.9076, lon: -76.8645, domed: false, stadium: "Northwest Stadium" },
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapWrTeToUi(name, player) {
  const rec = player?.rec2025 || {};
  return [
    name,
    {
      pos: player?.pos || "WR",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: toNumber(rec.ydsPg),
      rec2025: {
        g: toNumber(rec.g),
        td: toNumber(rec.td),
        ypr: toNumber(rec.ypr),
        tgt: rec.tgt != null ? toNumber(rec.tgt) : null,
        recPg: rec.recPg != null ? toNumber(rec.recPg) : null,
      },
      props: player?.props || {},
      situation: player?.situation2026 || player?.situation || "Role context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "wr_te_db",
    },
  ];
}

function mapRbToUi(name, player) {
  const rush = player?.rush2025 || {};
  const rushYds = player?.props?.rushYds || null;
  return [
    name,
    {
      pos: "RB",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: toNumber(rush.ydsPg),
      rec2025: {
        g: toNumber(rush.g),
        td: toNumber(rush.td),
        ypr: toNumber(rush.ypa), // Kept for existing UI slot.
        tgt: null,
        recPg: null,
      },
      props: {
        recYds: rushYds
          ? {
              floor: rushYds.floor,
              ceil: rushYds.ceil,
              lean: rushYds.lean,
            }
          : null,
        td: player?.props?.td || null,
      },
      situation: player?.situation2026 || "Role context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "rb_db",
    },
  ];
}

function mapQbToUi(name, player) {
  const stats = player?.stats2024 || {};
  const games = Math.max(1, toNumber(stats.games, 17));
  const passYdsPg = Math.round((toNumber(stats.yds) / games) * 10) / 10;

  return [
    name,
    {
      pos: "QB",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: passYdsPg,
      rec2025: {
        g: toNumber(stats.games, 17),
        td: toNumber(stats.td),
        ypr: toNumber(stats.ypa),
        tgt: null,
        recPg: null,
      },
      props: {
        recYds: {
          floor: Math.max(140, Math.round(passYdsPg - 35)),
          ceil: Math.round(passYdsPg + 45),
          lean: "Use matchup + team script context for pass-yardage lean.",
        },
        td: {
          lean: `${toNumber(stats.td)} passing TD baseline sample.`,
        },
      },
      situation: player?.situation2025 || "QB context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "qb_db",
    },
  ];
}

function buildPromptContext(uiPlayers) {
  const lines = Object.entries(uiPlayers)
    .map(([name, p]) => {
      const stats = p.rec2025 || {};
      const tdLean = p?.props?.td?.lean || "—";
      const yLean = p?.props?.recYds?.lean || p?.props?.rushYds?.lean || "—";
      const core = `${name} | ${p.pos} | ${p.team} | ${p.tier}`;
      const statLine = `  Stats: ${p.ydsPg} yds/g, ${stats.td ?? 0} TD, ${stats.g ?? 0}g`;
      const leanLine = `  Lean: ${yLean} | TD: ${tdLean}`;
      return [core, statLine, leanLine].join("\n");
    })
    .join("\n\n");

  return lines;
}

export function buildCanonicalNflContext() {
  const wrteEntries = Object.entries(WRsAndTEs || {}).map(([name, player]) =>
    mapWrTeToUi(name, player)
  );
  const rbEntries = Object.entries(RBs || {}).map(([name, player]) =>
    mapRbToUi(name, player)
  );
  const qbEntries = Object.entries(QBs || {}).map(([name, player]) =>
    mapQbToUi(name, player)
  );

  const uiPlayers = Object.fromEntries([...wrteEntries, ...rbEntries, ...qbEntries]);
  const draftBundle = getActiveDraftBundle();
  const draftMeta = getNflDraftMeta(new Date(), draftBundle);
  const draftBlock = buildNflDraftBoardBlock(draftMeta, draftBundle);
  const promptContext = [buildPromptContext(uiPlayers), draftBlock].join("\n\n---\n\n");

  return {
    uiPlayers,
    promptContext,
    draft: {
      ...draftMeta,
      bundleYear: draftBundle.year,
      fullOrderCount: Array.isArray(draftBundle.fullOrder) ? draftBundle.fullOrder.length : 0,
      teamNeeds: draftBundle.teamNeeds || {},
      prospects: Array.isArray(draftBundle.prospects) ? draftBundle.prospects : [],
      boardLocation: draftBundle?.event?.location || null,
    },
    meta: {
      totalPlayers: Object.keys(uiPlayers).length,
      wrteCount: wrteEntries.length,
      rbCount: rbEntries.length,
      qbCount: qbEntries.length,
      generatedAt: new Date().toISOString(),
      nflDraftPhase: draftMeta.phase,
    },
    dataFreshness: {
      qbDataSeason: "2024",
      rbDataSeason: "2025",
      wrTeDataSeason: "2025",
      lastVerified: "2026-03-30",
      isCurrentSeason: false,
      warning:
        "QB baseline stats are 2024. Roster situations reflect March 2026 Ourlads. 2026 in-season data not yet integrated.",
      nflDraft: {
        phase: draftMeta.phase,
        draftClassYear: draftMeta.draftYear,
        roundOneBoardSource: draftMeta.roundOneBoardSource,
        officialRoundOnePicksLoaded: draftMeta.officialRoundOneCount > 0,
        bundleWarning: draftMeta.bundleWarning || null,
      },
    },
  };
}
