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
