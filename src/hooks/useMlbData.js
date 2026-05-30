import { useCallback, useEffect, useRef, useState } from "react";

export function useMlbData() {
  const [mlbData, setMlbData] = useState(null);
  const [mlbLoading, setMlbLoading] = useState(false);
  const [mlbGames, setMlbGames] = useState([]);
  const mountedRef = useRef(false);

  const refreshMlb = useCallback(async () => {
    setMlbLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`/api/mlb?view=board&_ts=${Date.now()}`, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeout);
      const data = await res.json();
      if (mountedRef.current) setMlbData(data);
    } catch { if (mountedRef.current) setMlbData(null); }
    finally { if (mountedRef.current) setMlbLoading(false); }
  }, []);

  const refreshMlbGames = useCallback(async () => {
    try {
      const todayYmd = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${encodeURIComponent(todayYmd)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("ESPN MLB " + res.status);
      const data = await res.json();
      const events = data?.events || [];
      const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;
      const games = events
        .filter(e => {
          const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
          const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
          return gStr === todayStr;
        })
        .map(e => {
          const comp = e.competitions?.[0];
          const home = comp?.competitors?.find(c => c.homeAway === "home");
          const away = comp?.competitors?.find(c => c.homeAway === "away");
          const status = e.status?.type;
          const isLive = status?.state === "in";
          const isFinal = status?.state === "post";
          const gameTime = e.date ? new Date(e.date).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET" : "TBD";
          return {
            id: e.id,
            status: isFinal ? "Final" : isLive ? (status?.detail || "Live") : gameTime,
            state: isFinal ? "post" : isLive ? "in" : "pre",
            date: e.date || null,
            startTimeUtc: e.date || null,
            homeTeam: { name: home?.team?.displayName, abbr: home?.team?.abbreviation, score: isFinal||isLive ? parseInt(home?.score||"0") : null },
            awayTeam: { name: away?.team?.displayName, abbr: away?.team?.abbreviation, score: isFinal||isLive ? parseInt(away?.score||"0") : null },
          };
        });
      if (mountedRef.current && games.length > 0) setMlbGames(games);
    } catch(err) { console.log("MLB ESPN fetch failed:", err.message); }
  }, []);

  const refreshAllMlb = useCallback(async () => {
    await Promise.all([refreshMlb(), refreshMlbGames()]);
  }, [refreshMlb, refreshMlbGames]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { void refreshMlb(); });
    const poll = window.setInterval(() => {
      fetch("/api/mlb?view=board").then(r=>r.json()).then(d=>{ if(mountedRef.current) setMlbData(d); }).catch(()=>{});
    }, 180000);
    return () => { mountedRef.current=false; window.clearInterval(poll); };
  }, [refreshMlb]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { void refreshMlbGames(); });
    const poll = window.setInterval(refreshMlbGames, 60000);
    return () => { window.clearInterval(poll); };
  }, [refreshMlbGames]);

  return { mlbData, mlbLoading, mlbGames, refreshMlb: refreshAllMlb };
}
