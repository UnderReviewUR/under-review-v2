import { useState, useEffect, useCallback } from "react";

// NBA Playoff series tracker — update manually each round or wire to API
const NBA_PLAYOFF_SERIES = {
  // Format: "AWAY_ABBR vs HOME_ABBR" or "HOME_ABBR vs AWAY_ABBR" → series state
  // Update after each game. gameNum = total games played in series.
  // leader = abbr of team leading, or null if tied
};

export function useNbaData() {
  const [nbaData, setNbaData] = useState(null);
  const [nbaLoading, setNbaLoading] = useState(false);
  const [nbaGames, setNbaGames] = useState([]);

  const getSeriesLabel = useCallback((awayAbbr, homeAbbr) => {
    const key1 = `${awayAbbr} vs ${homeAbbr}`;
    const key2 = `${homeAbbr} vs ${awayAbbr}`;
    const series = NBA_PLAYOFF_SERIES[key1] || NBA_PLAYOFF_SERIES[key2];
    if (!series) return null;
    const { gameNum, leader, awayWins, homeWins } = series;
    const aw = Number(awayWins || 0);
    const hw = Number(homeWins || 0);
    const seriesLabel = aw + hw > 0 ? `Series: ${awayAbbr} ${aw} - ${homeAbbr} ${hw}` : null;
    if (!seriesLabel) return null;
    if (gameNum === 0 || !gameNum) return "Game 1";
    if (!leader) return `Game ${gameNum + 1} · ${seriesLabel}`;
    return `Game ${gameNum + 1} · ${leader} lead ${Math.max(aw, hw)}-${Math.min(aw, hw)}`;
  }, []);

  const toEtDateString = useCallback((isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function loadNba() {
      setNbaLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("/api/nba?view=board", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (!active) return;
        const games = Array.isArray(data?.todaysGames) ? data.todaysGames : [];
        setNbaData(data);
        setNbaGames(games);
      } catch { if (active) setNbaData(null); }
      finally { if (active) setNbaLoading(false); }
    }
    loadNba();
    const poll = window.setInterval(() => {
      fetch("/api/nba?view=board")
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          const games = Array.isArray(d?.todaysGames) ? d.todaysGames : [];
          setNbaData(d);
          setNbaGames(games);
        })
        .catch(() => {});
    }, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  return { nbaData, nbaLoading, nbaGames, getSeriesLabel };
}
