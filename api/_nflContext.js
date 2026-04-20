import RBs from "./nfl-rb.js";
import WRsAndTEs from "./nfl-wr-te.js";
import { QBs } from "./nfl-players.js";
import { buildNflDraftBoardBlock, getActiveDraftBundle, getNflDraftMeta } from "./nfl-draft-season.js";

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
    draft: { ...draftMeta, bundleYear: draftBundle.year },
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
