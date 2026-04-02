// ── Tennis board fetcher + 60s poller ────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { normalizeTennisMatch, normalizeText, preferredTournamentScore, getTournamentFetchParam } from "../lib/tennis";

export default function useTennisBoard() {
  const [players, setPlayers]           = useState(null);
  const [context, setContext]           = useState(null);
  const [liveMatches, setLiveMatches]   = useState([]);
  const [tennisLoading, setTennisLoading] = useState(false);

  const fetchBoard = useCallback(async (activeContext = null) => {
    const tournamentParam = getTournamentFetchParam(activeContext);
    const [atpRes, wtaRes] = await Promise.all([
      fetch(`/api/tennis?tour=atp&activeTournament=${encodeURIComponent(tournamentParam)}`),
      fetch(`/api/tennis?tour=wta&activeTournament=${encodeURIComponent(tournamentParam)}`),
    ]);
    const [atpData, wtaData] = await Promise.all([atpRes.json(), wtaRes.json()]);

    const merged = [
      ...(Array.isArray(atpData) ? atpData.map(m => normalizeTennisMatch(m, "ATP", activeContext)) : []),
      ...(Array.isArray(wtaData) ? wtaData.map(m => normalizeTennisMatch(m, "WTA", activeContext)) : []),
    ].filter(Boolean);

    const seen = new Set();
    const deduped = [];
    for (const m of merged) {
      const key = [
        normalizeText(m.league), normalizeText(m.raw?.home),
        normalizeText(m.raw?.away), normalizeText(m.network),
        normalizeText(m.raw?.round), normalizeText(m.raw?.event_date),
      ].join("|");
      if (!seen.has(key)) { seen.add(key); deduped.push(m); }
    }

    return deduped.sort((a, b) => {
      const aLive = String(a?.raw?.live || "0") === "1" ? 1 : 0;
      const bLive = String(b?.raw?.live || "0") === "1" ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      const aPref = preferredTournamentScore(a, activeContext);
      const bPref = preferredTournamentScore(b, activeContext);
      if (aPref !== bPref) return bPref - aPref;
      return (a.commenceTs || Infinity) - (b.commenceTs || Infinity);
    });
  }, []);

  // Initial load
  useEffect(() => {
    let active = true;
    let pollId = null;

    async function loadAll() {
      setTennisLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          fetch("/api/tennis-players"),
          fetch("/api/tennis-context"),
        ]);
        const [p, c] = await Promise.all([pRes.json(), cRes.json()]);
        if (!active) return;
        setPlayers(p);
        setContext(c);
        const board = await fetchBoard(c);
        if (!active) return;
        setLiveMatches(board);
      } catch {
        if (active) setLiveMatches([]);
      } finally {
        if (active) setTennisLoading(false);
      }
    }

    loadAll();

    pollId = window.setInterval(() => {
      // Use functional setState to get latest context in poll
      setContext(prev => {
        fetchBoard(prev).then(b => { if (active) setLiveMatches(b); }).catch(() => {});
        return prev;
      });
    }, 60000);

    return () => { active = false; if (pollId) window.clearInterval(pollId); };
  }, [fetchBoard]);

  // Refresh when context changes (after initial load)
  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    fetchBoard(context).then(b => { if (!cancelled) setLiveMatches(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, [context, fetchBoard]);

  return { players, context, liveMatches, tennisLoading };
}
