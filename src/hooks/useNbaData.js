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
        if (active) setNbaData(data);
      } catch { if (active) setNbaData(null); }
      finally { if (active) setNbaLoading(false); }
    }
    loadNba();
    const poll = window.setInterval(() => {
      fetch("/api/nba?view=board").then(r=>r.json()).then(d=>{ if(active) setNbaData(d); }).catch(()=>{});
    }, 300000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // Fetch NBA games — browser-side ESPN fetch, no auth needed
  useEffect(() => {
    let active = true;
    async function loadGames() {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("ESPN " + res.status);
        const data = await res.json();
        const events = data?.events || [];

        // Get today's date in ET
        const todayStr = new Date().toLocaleDateString("en-CA", {
          timeZone: "America/New_York",
        });

        const games = events
          .filter((e) => toEtDateString(e.date) === todayStr)
          .map(e => {
            const comp = e.competitions?.[0];
            const home = comp?.competitors?.find(c => c.homeAway === "home");
            const away = comp?.competitors?.find(c => c.homeAway === "away");
            const status = e.status?.type;
            return {
              id: e.id,
              status: status?.shortDetail || status?.description || "Scheduled",
              state: status?.state || "pre",
              period: e.status?.period || 0,
              homeTeam: { name: home?.team?.shortDisplayName, abbr: home?.team?.abbreviation, score: parseInt(home?.score || "0") },
              awayTeam: { name: away?.team?.shortDisplayName, abbr: away?.team?.abbreviation, score: parseInt(away?.score || "0") },
            };
          });

        if (active && games.length > 0) {
          setNbaGames(games);
          return;
        }

        // If ESPN returned nothing for today, try NBA CDN
        const cdn = await fetch("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json", { cache: "no-store" });
        if (!cdn.ok) throw new Error("CDN " + cdn.status);
        const cdnData = await cdn.json();
        const cdnGames = (cdnData?.scoreboard?.games || []).map(g => ({
          id: g.gameId,
          status: g.gameStatusText,
          state: g.gameStatus === 2 ? "in" : g.gameStatus === 3 ? "post" : "pre",
          period: g.period,
          homeTeam: { name: g.homeTeam?.teamName, abbr: g.homeTeam?.teamTricode, score: g.homeTeam?.score },
          awayTeam: { name: g.awayTeam?.teamName, abbr: g.awayTeam?.teamTricode, score: g.awayTeam?.score },
        }));
        if (active && cdnGames.length > 0) setNbaGames(cdnGames);

      } catch(err) {
        console.log("Games fetch failed:", err.message);
      }
    }
    loadGames();
    const poll = window.setInterval(loadGames, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, [toEtDateString]);

  return { nbaData, nbaLoading, nbaGames, getSeriesLabel };
}
