import { useCallback, useEffect, useRef, useState } from "react";

export function useF1Data() {
  const [f1Data, setF1Data] = useState(null);
  const [f1Loading, setF1Loading] = useState(false);
  const mountedRef = useRef(false);

  const refreshF1 = useCallback(async () => {
    setF1Loading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`/api/f1?_ts=${Date.now()}`, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timeout);
      const data = await res.json();
      if (mountedRef.current) setF1Data(data);
    } catch { if (mountedRef.current) setF1Data(null); }
    finally { if (mountedRef.current) setF1Loading(false); }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { void refreshF1(); });
    const poll = window.setInterval(refreshF1, 120000);
    return () => { mountedRef.current=false; window.clearInterval(poll); };
  }, [refreshF1]);

  return { f1Data, f1Loading, refreshF1 };
}
