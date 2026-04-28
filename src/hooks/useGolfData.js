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
      } catch {
        // Transient failures: keep last successful board so the rail does not blank out.
        if (active) setGolfData((prev) => prev);
      } finally {
        if (active) setGolfLoading(false);
      }
    }
    loadGolf();
    const poll = window.setInterval(() => {
      if (document.hidden) return;
      fetch("/api/golf?view=board")
        .then((r) => {
          if (!r.ok) throw new Error("Golf " + r.status);
          return r.json();
        })
        .then((d) => {
          if (active) setGolfData(d);
        })
        .catch(() => {
          /* keep last-known snapshot */
        });
    }, 8 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, []);

  return { golfData, golfLoading };
}
