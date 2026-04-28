import { useState, useEffect } from "react";

export function useF1Data() {
  const [f1Data, setF1Data] = useState(null);
  const [f1Loading, setF1Loading] = useState(false);

  useEffect(() => {
    let active=true;
    async function loadF1() {
      setF1Loading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/f1", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (active) setF1Data(data);
      } catch { if (active) setF1Data(null); }
      finally { if (active) setF1Loading(false); }
    }
    loadF1();
    const poll = window.setInterval(() => {
      fetch("/api/f1").then(r=>r.json()).then(d=>{ if(active) setF1Data(d); }).catch(()=>{});
    }, 120000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  return { f1Data, f1Loading };
}
