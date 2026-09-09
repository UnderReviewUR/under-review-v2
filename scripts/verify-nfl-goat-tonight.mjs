/**
 * One-shot prod/GOAT verification for NFL Ask — no deploys.
 * Usage: node --env-file=.env scripts/verify-nfl-goat-tonight.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v === "[SENSITIVE]") continue;
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const {
  isNflBdlPrimaryEnabled,
  getNflBdlApiKey,
  fetchNflBdlWeekGames,
  fetchNflBdlWeekOdds,
  fetchNflBdlPlayerPropsForGame,
  buildNflGoatBriefcase,
} = await import("../api/_nflBdl.js");
const { pickNflGamesForScope } = await import("../shared/nflAskPropTrim.js");
const { inferNflSeasonYear } = await import("../shared/bdlSeasonDefaults.js");
const { isBdlGoatTrialPaceActive } = await import("../shared/bdlGoatTrialPolicy.js");

const season = inferNflSeasonYear();
const week = 1;

const report = {
  env: {
    NFL_BDL_PRIMARY: process.env.NFL_BDL_PRIMARY ?? null,
    flagOn: isNflBdlPrimaryEnabled(),
    keySet: Boolean(getNflBdlApiKey()),
    keyLen: getNflBdlApiKey().length,
    trialPace: isBdlGoatTrialPaceActive(),
    cronSecretSet: Boolean(String(process.env.CRON_SECRET || "").trim()),
  },
  season,
  week,
};

const gamesRes = await fetchNflBdlWeekGames({ season, week });
report.games = {
  ok: gamesRes.ok,
  status: gamesRes.status,
  count: gamesRes.games?.length ?? 0,
  error: gamesRes.error,
  sample: (gamesRes.games || []).slice(0, 5).map((g) => `${g.awayAbbr}@${g.homeAbbr}:${g.providerGameId}`),
};

const scoped = pickNflGamesForScope(gamesRes.games || [], new Set(["NE", "SEA"]));
report.neSea = scoped.map((g) => ({
  id: g.providerGameId,
  label: `${g.awayAbbr}@${g.homeAbbr}`,
  week: g.week,
  status: g.status,
}));

const oddsRes = await fetchNflBdlWeekOdds({ season, week });
report.odds = {
  ok: oddsRes.ok,
  status: oddsRes.status,
  count: oddsRes.rows?.length ?? 0,
  error: oddsRes.error,
};

if (scoped[0]?.providerGameId) {
  const props = await fetchNflBdlPlayerPropsForGame(scoped[0].providerGameId, {
    gameLabel: "NE @ SEA",
  });
  const byPlayer = {};
  for (const p of props) {
    byPlayer[p.player] = (byPlayer[p.player] || 0) + 1;
  }
  report.neSeaProps = {
    source: "balldontlie_nfl",
    propCount: props.length,
    playerCount: Object.keys(byPlayer).length,
    topPlayers: Object.entries(byPlayer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([n, c]) => `${n}:${c}`),
    sample: props.slice(0, 6).map((p) => `${p.player} ${p.prop} ${p.line} (${p.book})`),
    hasAjBrown: props.some((p) => /a\.?j\.?\s*brown/i.test(String(p.player))),
    hasMaye: props.some((p) => /maye/i.test(String(p.player))),
    hasJsn: props.some((p) => /njigba|smith-njigba/i.test(String(p.player))),
  };
} else {
  report.neSeaProps = { propCount: 0, error: "no_bdl_game_for_NE_SEA" };
}

const briefcase = await buildNflGoatBriefcase({
  week,
  season,
  scopeAbbrs: new Set(["NE", "SEA"]),
  maxPropGames: 2,
  hydrateDefense: true,
  hydrateInjuries: true,
  hydrateStats: false,
  hydrateRosters: true,
  hydrateAllRosters: false,
});

report.briefcase = {
  primarySource: briefcase.primarySource,
  games: briefcase.slate?.games?.length ?? 0,
  odds: briefcase.slate?.odds?.length ?? 0,
  props: briefcase.slate?.playerProps?.length ?? 0,
  rosterTeams: Object.keys(briefcase.league?.rostersByTeam || {}).length,
  injuries: briefcase.league?.injuries?.length ?? 0,
  defenseTeams: Object.keys(briefcase.league?.teamDefense || {}).length,
  defenseSource: briefcase.league?.defenseSource || null,
  endpoints: briefcase.coverage?.endpoints || null,
};

console.log(JSON.stringify(report, null, 2));
