import { useState, useEffect } from "react";

export function useGolfData() {
  const [golfData, setGolfData] = useState(null);
  const [golfLoading, setGolfLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let consecutivePollFailures = 0;
    async function loadGolf() {
      setGolfLoading(true);
      try {
        const res = await fetch("/api/golf?view=board");
        if (!res.ok) throw new Error("Golf " + res.status);
        const data = await res.json();
        if (active) {
          setGolfData(data);
          consecutivePollFailures = 0;
        }
      } catch { if (active) setGolfData(null); }
      finally { if (active) setGolfLoading(false); }
    }
    loadGolf();
    const poll = window.setInterval(() => {
      fetch("/api/golf?view=board")
        .then((r) => {
          if (!r.ok) throw new Error("Golf " + r.status);
          return r.json();
        })
        .then((d) => {
          if (active) {
            setGolfData(d);
            consecutivePollFailures = 0;
          }
        })
        .catch(() => {
          consecutivePollFailures += 1;
          if (active && consecutivePollFailures >= 2) setGolfData(null);
        });
    }, 8 * 60 * 1000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  return { golfData, golfLoading };
}
