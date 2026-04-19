import { useState, useEffect, useRef, useCallback } from "react";
import {
  getTournamentFetchParam,
  isBallDontLieAtpFixture,
  normalizeTennisMatch,
  normalizeText,
  preferredTournamentScore,
} from "../features/app/helpers.jsx";

export function useTennisData() {
  const [players, setPlayers] = useState(null);
  const playersRef = useRef(null);
  const contextRef = useRef(null);
  const [context, setContext] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  /** Starts true — Home ATP spotlight waits for same fetch path as Tennis tab (`liveMatches`). */
  const [tennisLoading, setTennisLoading] = useState(true);

  const fetchTennisBoard = useCallback(async (activeContext = null) => {
    let atpData = [];
    try {
      const tournamentParam = getTournamentFetchParam(activeContext);
      const atpRes = await fetch(
        `/api/tennis?tour=atp&activeTournament=${encodeURIComponent(tournamentParam)}`,
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

    const bdlOnly = atpData.filter(isBallDontLieAtpFixture);
    const merged = [
      ...bdlOnly.map((m) => normalizeTennisMatch(m, "ATP", activeContext)),
    ].filter(Boolean);
    const seen=new Set(); const deduped=[];
    for (const m of merged) {
      const key=[normalizeText(m.league),normalizeText(m.raw?.home),normalizeText(m.raw?.away),normalizeText(m.network),normalizeText(m.raw?.round),normalizeText(m.raw?.event_date)].join("|");
      if (!seen.has(key)) { seen.add(key); deduped.push(m); }
    }
    let sorted = deduped.sort((a,b) => {
      const aLive=String(a?.raw?.live||"0")==="1"?1:0;
      const bLive=String(b?.raw?.live||"0")==="1"?1:0;
      if (aLive!==bLive) return bLive-aLive;
      const aPref=preferredTournamentScore(a,activeContext);
      const bPref=preferredTournamentScore(b,activeContext);
      if (aPref!==bPref) return bPref-aPref;
      const aTime=Number.isFinite(a.commenceTs)?a.commenceTs:Number.MAX_SAFE_INTEGER;
      const bTime=Number.isFinite(b.commenceTs)?b.commenceTs:Number.MAX_SAFE_INTEGER;
      return aTime-bTime;
    });

    return sorted;
  }, []);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    let active=true; let pollId=null;
    async function loadAll() {
      setTennisLoading(true);
      try {
        const [pRes,cRes] = await Promise.all([
          fetch("/api/tennis-players", { cache: "no-store" }),
          fetch("/api/tennis-context", { cache: "no-store" }),
        ]);
        const [p,c] = await Promise.all([pRes.json(),cRes.json()]);
        if (!active) return;
        setPlayers(p); setContext(c);
        playersRef.current = p;
        const board = await fetchTennisBoard(c);
        if (!active) return;
        setLiveMatches(board);
      } catch {
        if (!active) return;
        setLiveMatches([]);
      }
      finally { if(active) setTennisLoading(false); }
    }
    loadAll();
    pollId = window.setInterval(() => {
      fetchTennisBoard(contextRef.current).then((b) => { if (active) setLiveMatches(b); }).catch(() => {});
    }, 60000);
    return () => { active=false; if(pollId) window.clearInterval(pollId); };
  }, [fetchTennisBoard]);

  useEffect(() => {
    if (!context) return;
    let cancelled=false;
    fetchTennisBoard(context).then((b) => { if (!cancelled) setLiveMatches(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, [context, fetchTennisBoard]);

  return {
    players,
    context,
    liveMatches,
    tennisLoading,
  };
}
