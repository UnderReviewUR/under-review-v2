import { useState } from "react";

function confidenceStyle(tier) {
  const t = String(tier || "");
  if (t === "High") return { color: "#34d399", border: "rgba(52,211,153,0.35)" };
  if (t === "Medium") return { color: "#fbbf24", border: "rgba(251,191,36,0.35)" };
  if (t === "Speculative") return { color: "rgba(255,255,255,0.55)", border: "rgba(255,255,255,0.12)" };
  return { color: "var(--muted)", border: "var(--border-2)" };
}

/**
 * Structured UR Take card — rendered when API returns `structured` + client flag.
 */
export default function URTakeResponse({
  sport,
  question,
  call,
  confidence,
  whyNow,
  edge,
  callType,
  analysis,
  caveats,
  parlayLegs,
  parlayTotalOdds,
  timestamp,
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const cs = confidenceStyle(confidence);

  return (
    <div className="ur-take-structured" style={{ marginTop: 4 }}>
      <div
        style={{
          border: `1px solid ${cs.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          background: "rgba(0,245,233,0.04)",
          boxShadow: "0 0 24px rgba(0,245,233,0.06)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 9,
            letterSpacing: 2,
            color: "var(--muted)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          The call · {sport || "—"}
        </div>
        <div
          style={{
            fontFamily: "var(--body-font)",
            fontSize: 17,
            fontWeight: 600,
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1.35,
            marginBottom: 10,
          }}
        >
          {call}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <span
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: 1,
              color: cs.color,
              border: `1px solid ${cs.border}`,
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            {confidence}
          </span>
          <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)" }}>
            {callType}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", margin: "0 0 10px", lineHeight: 1.45 }}>
          <strong style={{ color: "rgba(0,245,233,0.85)" }}>Why now:</strong> {whyNow}
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: "rgba(255,255,255,0.5)" }}>Edge:</strong> {edge}
        </p>
      </div>

      {question ? (
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            color: "var(--muted)",
            lineHeight: 1.4,
          }}
        >
          Q: {question}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="quick-btn"
          onClick={() => setAnalysisOpen((o) => !o)}
          style={{ fontSize: 11 }}
        >
          {analysisOpen ? "Hide analysis" : "Matchup & analysis"}
        </button>
        {analysisOpen && analysis && typeof analysis === "object" ? (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--border-2)",
              background: "rgba(0,0,0,0.2)",
              fontSize: 12,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            {[
              ["Matchup", analysis.matchupAnalysis],
              ["Injuries & availability", analysis.injuryContext],
              ["Market", analysis.marketContext],
              ["Line movement", analysis.lineMovement],
              ["Statistical edge", analysis.statisticalEdge],
            ].map(([label, val]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 9,
                    letterSpacing: 1.2,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div>{val}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {Array.isArray(caveats) && caveats.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              letterSpacing: 2,
              color: "rgba(251,146,60,0.9)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Caveats
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.78)", fontSize: 12, lineHeight: 1.45 }}>
            {caveats.map((c, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {callType === "parlay" && Array.isArray(parlayLegs) && parlayLegs.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              letterSpacing: 2,
              color: "var(--muted)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Parlay legs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {parlayLegs.map((leg, idx) => (
              <div
                key={`${leg.play}-${idx}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-2)",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{leg.play}</div>
                <div style={{ color: "rgba(255,255,255,0.75)" }}>{leg.rationale}</div>
                <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
                  Odds: {leg.odds}
                </div>
              </div>
            ))}
          </div>
          {parlayTotalOdds ? (
            <div style={{ fontFamily: "var(--mono-font)", fontSize: 11, marginTop: 10, color: "rgba(255,255,255,0.7)" }}>
              Ticket odds: {parlayTotalOdds}
            </div>
          ) : null}
        </div>
      ) : null}

      {timestamp ? (
        <div style={{ marginTop: 12, fontFamily: "var(--mono-font)", fontSize: 9, color: "var(--muted)" }}>
          {timestamp}
        </div>
      ) : null}
    </div>
  );
}
