/**
 * Today's Slate `/api/today-slate` board bundle — same displayability gates as Home
 * (`buildHomeEventPipeline` raw inputs: classify* + isDisplayableValidity).
 * Golf uses `normalizeGolfTournament` so slate policy matches Home golf visibility
 * (replaces the prior 72h tournament-only carve-out that could disagree with Home's golf window).
 */

import {
  classifyF1Race,
  classifyMlbGame,
  classifyNbaGame,
  classifyTennisMatch,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "./eventValidity.js";
import { normalizeGolfTournament } from "./homeEventPipeline/normalize.js";

export function sanitizeNbaBoard(nba) {
  if (!nba || typeof nba !== "object") return null;
  const todaysGames = (Array.isArray(nba.todaysGames) ? nba.todaysGames : []).filter((g) =>
    isDisplayableValidity(classifyNbaGame(g)),
  );
  return { ...nba, todaysGames };
}

export function sanitizeMlbBoard(mlb) {
  if (!mlb || typeof mlb !== "object") return null;
  const games = (Array.isArray(mlb.games) ? mlb.games : []).filter((g) =>
    isDisplayableValidity(classifyMlbGame(g)),
  );
  return { ...mlb, games };
}

export function sanitizeGolfBoard(golf) {
  if (!golf || typeof golf !== "object") return null;
  return normalizeGolfTournament(golf, Date.now()) ? golf : null;
}

export function sanitizeTennisBoard(tennis) {
  if (!Array.isArray(tennis)) return null;
  return tennis.filter((m) => isDisplayableValidity(classifyTennisMatch(m)));
}

/**
 * @param {Record<string, unknown> | null} wc
 */
export function sanitizeWorldCupBoard(wc) {
  if (!wc || typeof wc !== "object") return null;
  const hasGroups = Array.isArray(wc.groups) && wc.groups.length > 0;
  const hasFixtures = Array.isArray(wc.upcoming) && wc.upcoming.length > 0;
  const hasOutrights =
    wc.outrightsSample && typeof wc.outrightsSample === "object" && Object.keys(wc.outrightsSample).length > 0;
  const hasShell = wc.source === "static_shell" || wc.tournament;
  if (!hasGroups && !hasFixtures && !hasOutrights && !hasShell) return null;
  return wc;
}

export function sanitizeF1Board(f1) {
  if (!f1 || typeof f1 !== "object") return null;
  const races = Array.isArray(f1?.schedule?.races) ? f1.schedule.races : [];
  const validRaces = races.filter((r) => isDisplayableValidity(classifyF1Race(r)));
  const nextRace = getDisplayableF1NextRace({ ...f1, schedule: { ...(f1.schedule || {}), races: validRaces } });
  if (!nextRace) return null;
  return {
    ...f1,
    schedule: {
      ...(f1.schedule || {}),
      races: validRaces.map((r) => ({ ...r, is_next: r === nextRace })),
    },
  };
}
