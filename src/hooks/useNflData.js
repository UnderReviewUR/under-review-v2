import { useState, useEffect } from "react";

export function useNflData() {
  const [nflContextData, setNflContextData] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadNflContext() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/nfl-context");
        if (!res.ok) throw new Error(`NFL context ${res.status}`);
        const data = await res.json();
        if (active) setNflContextData(data);
      } catch {
        if (active) setNflContextData(null);
      }
    }
    loadNflContext();
    const poll = window.setInterval(loadNflContext, 15 * 60 * 1000);
    return () => { active = false; window.clearInterval(poll); };
  }, []);

  return { nflContextData };
}
