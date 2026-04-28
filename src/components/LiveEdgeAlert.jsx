import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ur_live_edge_dismissed_ids";

function loadDismissedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export default function LiveEdgeAlert({ alerts = [] }) {
  const [dismissed, setDismissed] = useState(() => loadDismissedSet());

  useEffect(() => {
    setDismissed(loadDismissedSet());
  }, [alerts]);

  const dismiss = useCallback((id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      persistDismissedSet(next);
      return next;
    });
  }, []);

  const visible = (alerts || []).filter((a) => a?.id && !dismissed.has(String(a.id)));
  if (!visible.length) return null;

  return (
    <div className="live-edge-alert-stack" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visible.map((a) => (
        <div
          key={a.id}
          role="status"
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255, 215, 0, 0.35)",
            background: "linear-gradient(180deg, rgba(255,215,0,0.08), rgba(255,140,0,0.05))",
            padding: "12px 14px",
            position: "relative",
          }}
        >
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => dismiss(a.id)}
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: 1.4,
              color: "#FFD700",
              marginBottom: 8,
            }}
          >
            ⚡ LIVE EDGE
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", paddingRight: 28, lineHeight: 1.35 }}>
            {a.playerName} — {a.fouls} fouls, {a.quarterLabel}
          </div>
          {a.beneficiaryLine ? (
            <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>
              {a.beneficiaryLine}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
