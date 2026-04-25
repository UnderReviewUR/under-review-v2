import { useState, useEffect, useCallback, useMemo } from "react";
import { isNbaTimeMismatch } from "../lib/nbaTime.js";

export function useNbaData() {
  const [nbaData, setNbaData] = useState(null);
  const [nbaLoading, setNbaLoading] = useState(false);
  const [nbaGames, setNbaGames] = useState([]);

  const playoffSeries = useMemo(
    () => (Array.isArray(nbaData?.playoffSeries) ? nbaData.playoffSeries : []),
    [nbaData],
  );

  const getSeriesLabel = useCallback((awayAbbr, homeAbbr) => {
    const away = String(awayAbbr || "").toUpperCase();
    const home = String(homeAbbr || "").toUpperCase();
    if (!away || !home) return null;
    const row = playoffSeries.find((s) => {
      const sa = String(s?.away || "").toUpperCase();
      const sh = String(s?.home || "").toUpperCase();
      return (sa === away && sh === home) || (sa === home && sh === away);
    });
    if (!row) return null;
    const sa = String(row?.away || "").toUpperCase();
    const sh = String(row?.home || "").toUpperCase();
    const rowAwayWins = Number(row?.awayWins || 0);
    const rowHomeWins = Number(row?.homeWins || 0);
    const awayWins = sa === away && sh === home ? rowAwayWins : rowHomeWins;
    const homeWins = sa === away && sh === home ? rowHomeWins : rowAwayWins;
    const played = awayWins + homeWins;
    if (!Number.isFinite(played) || played < 0) return null;
    return `Game ${played + 1}`;
  }, [playoffSeries]);

  const toEtDateString = useCallback((isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchBoard({ bust = false } = {}) {
      const qs = bust ? `&_ts=${Date.now()}` : "";
      const res = await fetch(`/api/nba?view=board${qs}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      return res.json();
    }
    async function loadNba() {
      setNbaLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`/api/nba?view=board&_ts=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (!active) return;
        let games = Array.isArray(data?.todaysGames) ? data.todaysGames : [];
        let nextData = data;
        /* Missing/unparseable pre-game start → bust CDN + refetch so bad times cannot persist */
        if (games.some(isNbaTimeMismatch)) {
          const refetched = await fetchBoard({ bust: true }).catch(() => null);
          if (refetched && active) {
            nextData = refetched;
            games = Array.isArray(refetched?.todaysGames) ? refetched.todaysGames : games;
          }
        }
        setNbaData(nextData);
        setNbaGames(games);
      } catch { if (active) setNbaData(null); }
      finally { if (active) setNbaLoading(false); }
    }
    loadNba();
    const poll = window.setInterval(() => {
      fetch(`/api/nba?view=board&_ts=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          let games = Array.isArray(d?.todaysGames) ? d.todaysGames : [];
          if (games.some(isNbaTimeMismatch)) {
            fetchBoard({ bust: true })
              .then((refetched) => {
                if (!active || !refetched) return;
                const nextGames = Array.isArray(refetched?.todaysGames) ? refetched.todaysGames : games;
                setNbaData(refetched);
                setNbaGames(nextGames);
              })
              .catch(() => {
                setNbaData(d);
                setNbaGames(games);
              });
            return;
          }
          setNbaData(d);
          setNbaGames(games);
        })
        .catch(() => {});
    }, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  return { nbaData, nbaLoading, nbaGames, getSeriesLabel };
}
