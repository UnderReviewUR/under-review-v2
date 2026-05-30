import { useCallback, useEffect, useRef, useState } from "react";

export function useNflData() {
  const [nflContextData, setNflContextData] = useState(null);
  const mountedRef = useRef(false);

  const refreshNfl = useCallback(async () => {
    try {
      const res = await fetch(`/api/nfl-context?_ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`NFL context ${res.status}`);
      const data = await res.json();
      if (mountedRef.current) setNflContextData(data);
    } catch {
      if (mountedRef.current) setNflContextData(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { void refreshNfl(); });
    const poll = window.setInterval(refreshNfl, 15 * 60 * 1000);
    return () => { mountedRef.current = false; window.clearInterval(poll); };
  }, [refreshNfl]);

  return { nflContextData, refreshNfl };
}
