import { useCallback, useEffect, useState } from "react";
import { getFunnelCounters } from "../lib/funnelAnalytics.js";

/**
 * Founder-only funnel counters (localStorage mirror of `trackFunnelEvent`).
 * Enable in prod: `localStorage.setItem('ur_funnel_debug_ui','1')` then reload.
 * In dev, a small control is always available.
 */
export default function FunnelDebugPanel() {
  const [open, setOpen] = useState(false);
  const [lsEnabled, setLsEnabled] = useState(false);
  const [counts, setCounts] = useState(() => getFunnelCounters());

  useEffect(() => {
    try {
      setLsEnabled(localStorage.getItem("ur_funnel_debug_ui") === "1");
    } catch {
      setLsEnabled(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setCounts(getFunnelCounters());
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  const dev = import.meta.env.DEV;
  if (!dev && !lsEnabled) return null;

  return (
    <div className="ur-funnel-debug-wrap">
      <button
        type="button"
        className="ur-funnel-debug-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Funnel counters (local)"
      >
        Funnel {open ? "▾" : "▸"}
      </button>
      {open ? (
        <div className="ur-funnel-debug-panel">
          <div className="ur-funnel-debug-head">
            <span>Local counters</span>
            <button type="button" onClick={refresh}>
              Refresh
            </button>
          </div>
          <ul className="ur-funnel-debug-list">
            {Object.entries(counts)
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => (
                <li key={k}>
                  <code>{k}</code>
                  <span>{n}</span>
                </li>
              ))}
          </ul>
          <p className="ur-funnel-debug-hint">Console: window.__UR_FUNNEL__.printSummary(true)</p>
        </div>
      ) : null}
    </div>
  );
}
