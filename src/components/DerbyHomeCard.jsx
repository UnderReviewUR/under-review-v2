import { useEffect, useState } from "react";
import { isDerbyActive } from "../data/derby2026.js";

const DERBY_DISMISS_KEY = "ur_derby_2026_dismissed";

function readSessionDismissed() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(DERBY_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export default function DerbyHomeCard({ firePrompt }) {
  const [dismissed, setDismissed] = useState(() => readSessionDismissed());

  useEffect(() => {
    if (!isDerbyActive()) {
      try {
        sessionStorage.removeItem(DERBY_DISMISS_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  if (!isDerbyActive() || dismissed) return null;

  return (
    <div
      style={{
        position: "relative",
        marginTop: 6,
        marginBottom: 14,
        borderRadius: 14,
        border: "1px solid rgba(0, 245, 233, 0.22)",
        background:
          "linear-gradient(160deg, rgba(10, 18, 28, 0.98), rgba(6, 12, 20, 0.96))",
        padding: "14px 14px 12px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
      }}
    >
      <button
        type="button"
        aria-label="Dismiss Kentucky Derby card"
        onClick={(e) => {
          e.stopPropagation();
          try {
            sessionStorage.setItem(DERBY_DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.45)",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>

      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 9,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          color: "#00F5E9",
          marginBottom: 8,
        }}
      >
        🏇 KENTUCKY DERBY · TODAY · 6:57 PM ET
      </div>

      <div
        style={{
          fontFamily: "var(--display-font, inherit)",
          fontSize: 18,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 6,
          paddingRight: 24,
        }}
      >
        152nd Run for the Roses
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        Churchill Downs · Fast track · 19 to run
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 180, 120, 0.95)",
          marginBottom: 12,
          lineHeight: 1.35,
        }}
      >
        Scratch: The Puma (9) — swollen pastern. Castellano-Delgado reunion off.
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {[
          { label: "WIN", name: "Further Ado", odds: "6-1", tag: "Best win" },
          { label: "CONTENDER", name: "Commandment", odds: "6-1", tag: "Saez confirmed" },
          { label: "SLEEPER", name: "Chief Wallabee", odds: "8-1", tag: "Sleeper" },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              flex: "1 1 90px",
              minWidth: 0,
              borderRadius: 10,
              border: "1px solid rgba(0, 245, 233, 0.15)",
              background: "rgba(0, 245, 233, 0.06)",
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 9,
                letterSpacing: 0.8,
                color: "#00F5E9",
                marginBottom: 4,
              }}
            >
              {row.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {row.name}{" "}
              <span style={{ fontFamily: "var(--mono-font)", color: "#94f6ee" }}>
                {row.odds}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 2 }}>{row.tag}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          firePrompt(
            "What are the strongest plays in the 2026 Kentucky Derby?",
            "derby",
          )
        }
        style={{
          width: "100%",
          borderRadius: 10,
          border: "1px solid rgba(0, 245, 233, 0.35)",
          background: "rgba(0, 245, 233, 0.12)",
          color: "#00F5E9",
          fontFamily: "var(--mono-font)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.4,
          padding: "10px 12px",
          cursor: "pointer",
        }}
      >
        Ask UR Take about the Derby →
      </button>
    </div>
  );
}
