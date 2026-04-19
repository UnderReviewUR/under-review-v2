import { useState, useEffect } from "react";

export function useGolfData() {
  const [golfData, setGolfData] = useState(null);
  const [golfLoading, setGolfLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadGolf() {
      setGolfLoading(true);
      try {
        const res = await fetch("/api/golf?view=board");
        if (!res.ok) throw new Error("Golf " + res.status);
        const data = await res.json();
        if (active) setGolfData(data);
      } catch { if (active) setGolfData(null); }
      finally { if (active) setGolfLoading(false); }
    }
    loadGolf();
    const poll = window.setInterval(() => {
      fetch("/api/golf?view=board").then(r=>r.json()).then(d=>{ if(active) setGolfData(d); }).catch(()=>{});
    }, 8 * 60 * 1000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  return { golfData, golfLoading };
}
