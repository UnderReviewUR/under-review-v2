import { useCallback, useMemo, useState } from "react";

export default function LiveEdgeAlert({ alerts = [] }) {
  const [dismissed, setDismissed] = useState(() => new Set());

  const dismiss = useCallback((id) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
  }, []);

  const visible = useMemo(
    () =>
      (alerts || [])
        .map((a, idx) => ({ ...a, __id: `${a?.sport || "sport"}-${idx}` }))
        .filter((a) => !dismissed.has(String(a.__id))),
    [alerts, dismissed],
  );
  if (!visible.length) return null;

  return (
    <div className="live-edge-alert-stack" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visible.map((a) => (
        <div
          key={a.__id}
          role="status"
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            padding: "12px 14px",
            position: "relative",
          }}
        >
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => dismiss(a.__id)}
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
              fontSize: 9,
              letterSpacing: 2,
              color: "var(--cyan-bright)",
              marginBottom: 8,
            }}
          >
            ⚡ LIVE EDGE
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", paddingRight: 28, lineHeight: 1.35 }}>
            {a.dataPoint}
          </div>
          <div style={{ fontSize: 12, color: "var(--soft)", marginTop: 8, lineHeight: 1.45 }}>
            {a.angle}
          </div>
          <div
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.22)",
              padding: "2px 8px",
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: 0.8,
              color: "var(--text)",
            }}
          >
            {a.confidence === "high" ? "HIGH" : "MED"}
          </div>
        </div>
      ))}
    </div>
  );
}
