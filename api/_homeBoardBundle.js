import {
  sanitizeF1Board,
  sanitizeGolfBoard,
  sanitizeMlbBoard,
  sanitizeNbaBoard,
  sanitizeTennisBoard,
} from "../shared/todaySlateInputBundle.js";

export function originFromReq(req) {
  const xfProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = xfProto || "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:5173")
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

export async function fetchBoardJson(base, path) {
  try {
    const res = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e?.message };
  }
}

export default async function buildHomeBoardBundle(req) {
  const base = originFromReq(req);

  const [nba, mlb, golf, tennis, f1, nfl] = await Promise.all([
    fetchBoardJson(base, "/api/nba?view=board"),
    fetchBoardJson(base, "/api/mlb?view=board"),
    fetchBoardJson(base, "/api/golf?view=board"),
    fetchBoardJson(base, "/api/tennis?tour=atp"),
    fetchBoardJson(base, "/api/f1?view=board"),
    fetchBoardJson(base, "/api/nfl-context"),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    nba: nba.ok ? sanitizeNbaBoard(nba.data) : null,
    mlb: mlb.ok ? sanitizeMlbBoard(mlb.data) : null,
    golf: golf.ok ? sanitizeGolfBoard(golf.data) : null,
    tennis: tennis.ok ? sanitizeTennisBoard(tennis.data) : null,
    f1: f1.ok ? sanitizeF1Board(f1.data) : null,
    nfl:
      nfl.ok && nfl.data
        ? {
            draftPhase: nfl.data?.draft?.phase ?? nfl.data?.meta?.nflDraftPhase ?? null,
            meta: nfl.data?.meta ? { nflDraftPhase: nfl.data.meta.nflDraftPhase } : null,
          }
        : null,
  };
}
