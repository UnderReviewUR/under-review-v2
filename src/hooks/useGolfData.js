import { useCallback, useEffect, useRef, useState } from "react";

export function useGolfData() {
  const [golfData, setGolfData] = useState(null);
  const [golfLoading, setGolfLoading] = useState(false);
  const mountedRef = useRef(false);

  const refreshGolf = useCallback(async () => {
    setGolfLoading(true);
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`/api/golf?view=board&_ts=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Golf " + res.status);
      const data = await res.json();
      if (mountedRef.current) setGolfData(data);
    } catch {
      if (mountedRef.current) setGolfData((prev) => prev);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (mountedRef.current) setGolfLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { void refreshGolf(); });
    const poll = window.setInterval(() => {
      fetch(`/api/golf?view=board&_ts=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
        .then((r) => {
          if (!r.ok) throw new Error("Golf " + r.status);
          return r.json();
        })
        .then((d) => {
          if (mountedRef.current) setGolfData(d);
        })
        .catch(() => {});
    }, 8 * 60 * 1000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(poll);
    };
  }, [refreshGolf]);

  return { golfData, golfLoading, refreshGolf };
}
