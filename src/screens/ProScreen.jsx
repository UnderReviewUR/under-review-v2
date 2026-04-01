export default function ProScreen() {
  return (
    <main className="screen">
      <div style={{ textAlign: "center", padding: "20px 4px 16px" }}>
        <div
          style={{
            fontFamily: "var(--display-font)",
            fontSize: 30,
            letterSpacing: 1,
            lineHeight: 1.1,
            marginBottom: 10,
          }}
        >
          Stop Guessing.
          <br />
          <span
            style={{
              background: "linear-gradient(90deg,var(--cyan-bright),var(--mag))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Start Beating the Line.
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.55, maxWidth: 340, margin: "0 auto" }}>
          You're leaving edges on the table every single slate. UR TAKE Pro closes the gap.
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid rgba(0,245,233,.2)", borderRadius: 20, padding: "20px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--display-font)", fontSize: 42, lineHeight: 1, color: "var(--text)" }}>$9.99</span>
          <span style={{ fontFamily: "var(--mono-font)", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>/month</span>
        </div>
        <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--cyan-bright)", marginBottom: 16, letterSpacing: 1 }}>
          LESS THAN ONE BAD BET
        </div>
        <button
          style={{
            width: "100%",
            border: "none",
            borderRadius: 14,
            padding: "15px 0",
            cursor: "pointer",
            fontFamily: "var(--display-font)",
            fontSize: 20,
            letterSpacing: 3,
            color: "#080A0C",
            background: "linear-gradient(90deg,var(--cyan-bright),var(--mag))",
          }}
        >
          UNLOCK MY EDGE
        </button>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12 }}>
          <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)" }}>CANCEL ANYTIME</span>
          <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)" }}>NO COMMITMENT</span>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, letterSpacing: 3, color: "var(--cyan-bright)", marginBottom: 14, textTransform: "uppercase" }}>
          WHAT YOU GET
        </div>
        {[
          ["Unlimited UR TAKE queries", "No throttling mid-slate, no daily cap."],
          ["Real prop edges", "True floors and ceilings — not public guesswork."],
          ["Full player intelligence", "QB + RB/WR/TE database + tennis profiles + defense tiers."],
          ["Live matchup breakdowns", "Defense-adjusted prop leans with betting angles."],
          ["Saved threads", "Track your takes and review what hit."],
          ["Priority responses", "Faster answers during live games."],
        ].map(([title, desc], i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 5 ? 12 : 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan-bright)", flexShrink: 0, marginTop: 6 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, letterSpacing: 3, color: "var(--mag)", marginBottom: 14, textTransform: "uppercase" }}>
          WHY IT WINS
        </div>
        {[
          "Built on real player data — not generic AI models",
          "Designed for props and edges, not narrative predictions",
          "Defense-adjusted context (other apps skip this entirely)",
          "Tennis + NFL in one place — two markets, one intelligence layer",
          "Updates with real usage, trend signals, and matchup context",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 4 ? 10 : 0 }}>
            <div style={{ fontFamily: "var(--mono-font)", fontSize: 12, color: "var(--mag)", flexShrink: 0, marginTop: 1 }}>→</div>
            <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.45 }}>{item}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,45,107,.06)", border: "1px solid rgba(255,45,107,.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--magenta)", letterSpacing: 2, marginBottom: 8 }}>
          FREE VERSION LIMITS
        </div>
        <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.6 }}>
          Free users hit query limits during peak hours — right before and during live games when you need it most. Pro removes every cap.
        </div>
      </div>

      <button
        style={{
          width: "100%",
          border: "none",
          borderRadius: 14,
          padding: "15px 0",
          cursor: "pointer",
          fontFamily: "var(--display-font)",
          fontSize: 20,
          letterSpacing: 3,
          color: "#080A0C",
          background: "linear-gradient(90deg,var(--cyan-bright),var(--mag))",
          marginBottom: 8,
        }}
      >
        GET FULL ACCESS NOW
      </button>

      <div className="page-spacer" />
    </main>
  );
}
