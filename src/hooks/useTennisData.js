import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  getTournamentFetchParam,
  isConfirmedAtpBoardFixture,
  normalizeTennisMatch,
  normalizeText,
  preferredTournamentScore,
} from "../features/app/helpers.jsx";

function normalizePlayersPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const atp =
    payload.atp && typeof payload.atp === "object" && !Array.isArray(payload.atp)
      ? payload.atp
      : null;
  const wta =
    payload.wta && typeof payload.wta === "object" && !Array.isArray(payload.wta)
      ? payload.wta
      : null;
  if (!atp && !wta) return null;
  return {
    ...payload,
    atp: atp || {},
    wta: wta || {},
  };
}

export function useTennisData() {
  const [players, setPlayers] = useState(null);
  const playersRef = useRef(null);
  const contextRef = useRef(null);
  const [context, setContext] = useState(null);
  /** Full board + ~54h finals — Tennis tab, UR Take context */
  const [liveMatchesBoard, setLiveMatchesBoard] = useState([]);
  /** intent=home — upcoming/live only for Home pipeline / spotlight trust contract */
  const [liveMatchesHome, setLiveMatchesHome] = useState([]);
  const [tennisLoading, setTennisLoading] = useState(true);
  const [staticIntelFetchFailed, setStaticIntelFetchFailed] = useState(false);

  const fetchTennisBoard = useCallback(async (activeContext = null, intent = "board") => {
    let atpData = [];
    try {
      const tournamentParam = getTournamentFetchParam(activeContext);
      const atpRes = await fetch(
        `/api/tennis?tour=atp&activeTournament=${encodeURIComponent(tournamentParam)}&intent=${encodeURIComponent(intent)}`,
        { cache: "no-store" },
      );
      const parseBoard = async (res) => {
        try {
          const data = await res.json();
          return res.ok && Array.isArray(data) ? data : [];
        } catch {
          return [];
        }
      };
      atpData = await parseBoard(atpRes);
    } catch {
      atpData = [];
    }

    const confirmedAtp = atpData.filter(isConfirmedAtpBoardFixture);
    const merged = [
      ...confirmedAtp.map((m) => normalizeTennisMatch(m, "ATP", activeContext)),
    ].filter(Boolean);
    const seen = new Set();
    const deduped = [];
    for (const m of merged) {
      const key = [
        normalizeText(m.league),
        normalizeText(m.raw?.home),
        normalizeText(m.raw?.away),
        normalizeText(m.network),
        normalizeText(m.raw?.round),
        normalizeText(m.raw?.event_date),
      ].join("|");
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(m);
      }
    }
    const sorted = deduped.sort((a, b) => {
      const aLive = String(a?.raw?.live || "0") === "1" ? 1 : 0;
      const bLive = String(b?.raw?.live || "0") === "1" ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      const aPref = preferredTournamentScore(a, activeContext);
      const bPref = preferredTournamentScore(b, activeContext);
      if (aPref !== bPref) return bPref - aPref;
      const aTime = Number.isFinite(a.commenceTs) ? a.commenceTs : Number.MAX_SAFE_INTEGER;
      const bTime = Number.isFinite(b.commenceTs) ? b.commenceTs : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

    return sorted;
  }, []);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const refreshTennis = useCallback(async () => {
    setTennisLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/tennis-players?_ts=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/tennis-context?_ts=${Date.now()}`, { cache: "no-store" }),
      ]);
      const c = await cRes.json();
      let parsedPlayers = null;
      if (pRes.ok) {
        try {
          parsedPlayers = normalizePlayersPayload(await pRes.json());
        } catch {
          parsedPlayers = null;
        }
      }
      const nextPlayers = parsedPlayers || playersRef.current || null;
      setPlayers(nextPlayers);
      setStaticIntelFetchFailed(!parsedPlayers);
      setContext(c);
      playersRef.current = nextPlayers;
      const [board, home] = await Promise.all([
        fetchTennisBoard(c, "board"),
        fetchTennisBoard(c, "home"),
      ]);
      setLiveMatchesBoard(board);
      setLiveMatchesHome(home);
    } catch {
      setStaticIntelFetchFailed(true);
      setLiveMatchesBoard([]);
      setLiveMatchesHome([]);
    } finally {
      setTennisLoading(false);
    }
  }, [fetchTennisBoard, refreshTennis]);

  useEffect(() => {
    let isCurrent = true;
    let pollId = null;
    queueMicrotask(() => { void refreshTennis(); });
    pollId = window.setInterval(() => {
      Promise.all([
        fetchTennisBoard(contextRef.current, "board"),
        fetchTennisBoard(contextRef.current, "home"),
      ])
        .then(([b, h]) => {
          if (!isCurrent) return;
          setLiveMatchesBoard(b);
          if (!isCurrent) return;
          setLiveMatchesHome(h);
        })
        .catch(() => {});
    }, 60000);
    return () => {
      isCurrent = false;
      if (pollId) window.clearInterval(pollId);
    };
  }, [fetchTennisBoard]);

  useEffect(() => {
    if (!context) return;
    let isCurrent = true;
    Promise.all([fetchTennisBoard(context, "board"), fetchTennisBoard(context, "home")])
      .then(([b, h]) => {
        if (!isCurrent) return;
        setLiveMatchesBoard(b);
        if (!isCurrent) return;
        setLiveMatchesHome(h);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [context, fetchTennisBoard]);

  const hasStaticTennisIntel = useMemo(() => {
    if (!players || typeof players !== "object") return false;
    const atpKeys = players.atp && typeof players.atp === "object" ? Object.keys(players.atp).length : 0;
    const wtaKeys = players.wta && typeof players.wta === "object" ? Object.keys(players.wta).length : 0;
    return atpKeys > 0 || wtaKeys > 0;
  }, [players]);

  return {
    players,
    context,
    /** @deprecated use liveMatchesBoard — alias for Tennis tab */
    liveMatches: liveMatchesBoard,
    liveMatchesBoard,
    liveMatchesHome,
    tennisLoading,
    hasStaticTennisIntel,
    staticIntelFetchFailed,
    refreshTennis,
  };
}
